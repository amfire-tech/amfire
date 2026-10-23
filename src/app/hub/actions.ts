"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { toActionError, type ActionState } from "@/lib/action-result";
import { getActor } from "@/lib/session";
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
