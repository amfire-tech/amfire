"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { toActionError, type ActionState } from "@/lib/action-result";
import { getActor } from "@/lib/session";
import {
  askConcierge,
  completeChecklistItem,
  createChangeRequest,
  decideChange,
  leaveFeedback,
  requestMilestoneChanges,
  type ConciergeAnswer,
} from "@/server/hub";
import { inviteTeammate, removeTeammate, replyToRequest } from "@/server/portal";
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

export type ConciergeState = { turns: { q: string; answer: ConciergeAnswer }[]; error?: string };

/** One question in a conversation with the project assistant; the last few turns go along for follow-ups. */
export async function askConciergeAction(orgId: string, prev: ConciergeState, formData: FormData): Promise<ConciergeState> {
  if (formData.get("reset")) return { turns: [] };
  const question = String(formData.get("question") ?? "");
  const turns = prev?.turns ?? [];
  try {
    const answer = await askConcierge(
      await getDb(),
      await getActor(),
      orgId,
      question,
      turns.slice(-4).map((t) => ({ q: t.q, a: t.answer.answer.slice(0, 1500) })),
    );
    return { turns: [...turns, { q: question, answer }].slice(-8) };
  } catch (err) {
    return { turns, error: toActionError(err)?.error };
  }
}

export async function completeChecklistAction(projectId: string, itemId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await completeChecklistItem(await getDb(), await getActor(), itemId, { note: String(formData.get("note") ?? "") });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/hub/projects/${projectId}`);
  revalidatePath("/hub");
  return { ok: "Thanks — marked as done. We'll take it from here." };
}

export async function requestMilestoneChangesAction(projectId: string, milestoneId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requestMilestoneChanges(await getDb(), await getActor(), milestoneId, { feedback: String(formData.get("feedback") ?? "") });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/hub/projects/${projectId}`);
  return { ok: "Sent. We'll make the changes and send it back for your review." };
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

export async function replyToRequestAction(requestId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await replyToRequest(await getDb(), await getActor(), requestId, { body: String(formData.get("body") ?? "") });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/hub/support");
  return { ok: "Sent." };
}

export async function inviteTeammateAction(orgId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await inviteTeammate(await getDb(), await getActor(), orgId, {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      role: formData.get("role") === "client_admin" ? "client_admin" : "client_member",
    });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/hub/team");
  return { ok: "Added. They can now sign in with their email." };
}

export async function removeTeammateAction(orgId: string, userId: string): Promise<ActionState> {
  try {
    await removeTeammate(await getDb(), await getActor(), orgId, userId);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/hub/team");
  return { ok: "Removed." };
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
  revalidatePath("/hub/support");
  return { ok: "Sent. A person at amfire will reply." };
}
