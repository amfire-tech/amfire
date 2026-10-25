"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { toActionError, type ActionState } from "@/lib/action-result";
import { getActor } from "@/lib/session";
import { askConcierge, createChangeRequest, decideChange, leaveFeedback, type ConciergeAnswer } from "@/server/hub";
import { clientApproveMilestone, createSupportRequest } from "@/server/projects";
import { clientDecideProposal } from "@/server/proposals";

export async function acceptProposalAction(proposalId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  if (formData.get("agree") !== "on") return { error: "Please confirm you agree to the scope and terms." };
  let projectId: string | undefined;
  try {
    const { project } = await clientDecideProposal(await getDb(), await getActor(), proposalId, { accept: true });
    projectId = project?.id;
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/hub", "layout");
  redirect(projectId ? `/hub/projects/${projectId}` : "/hub");
}

export async function requestChangesAction(proposalId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const note = String(formData.get("note") ?? "").trim();
  if (note.length < 5) return { error: "Tell us what you'd like changed." };
  try {
    await clientDecideProposal(await getDb(), await getActor(), proposalId, { accept: false, note });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/hub", "layout");
  return { ok: "Thanks — we'll revise the proposal and let you know." };
}

export async function approveMilestoneAction(projectId: string, milestoneId: string): Promise<ActionState> {
  try {
    await clientApproveMilestone(await getDb(), await getActor(), milestoneId);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/hub/projects/${projectId}`);
  return { ok: "Approved." };
}

export type ConciergeState = { question?: string; answer?: ConciergeAnswer; error?: string } | undefined;

export async function askConciergeAction(orgId: string, _prev: ConciergeState, formData: FormData): Promise<ConciergeState> {
  const question = String(formData.get("question") ?? "");
  try {
    return { question, answer: await askConcierge(await getDb(), await getActor(), orgId, question) };
  } catch (err) {
    return { question, error: toActionError(err)?.error };
  }
}

export async function changeRequestAction(projectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await createChangeRequest(await getDb(), await getActor(), projectId, { description: String(formData.get("description") ?? "") });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/hub/projects/${projectId}`);
  return { ok: "Sent. We'll reply with a price and timeline." };
}

export async function decideChangeAction(projectId: string, changeId: string, accept: boolean): Promise<ActionState> {
  try {
    await decideChange(await getDb(), await getActor(), changeId, accept);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/hub/projects/${projectId}`);
  return { ok: accept ? "Accepted — it's now a milestone in your project." : "Declined. Thanks for letting us know." };
}

export async function feedbackAction(projectId: string, milestoneId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await leaveFeedback(await getDb(), await getActor(), milestoneId, {
      rating: String(formData.get("rating") ?? "") as never,
      comment: String(formData.get("comment") ?? ""),
    });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/hub/projects/${projectId}`);
  return { ok: "Thank you for the feedback!" };
}

export async function supportRequestAction(
  orgId: string,
  projectId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await createSupportRequest(await getDb(), await getActor(), orgId, projectId, {
      subject: String(formData.get("subject") ?? ""),
      body: String(formData.get("body") ?? ""),
    });
  } catch (err) {
    return toActionError(err);
  }
  if (projectId) revalidatePath(`/hub/projects/${projectId}`);
  return { ok: "Sent. A person at AMFIRE will reply." };
}
