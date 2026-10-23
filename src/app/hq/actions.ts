"use server";

// Every action re-checks authorisation on the server: bound arguments and
// form fields come from the browser and are never trusted.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { toActionError, type ActionState } from "@/lib/action-result";
import { getActor } from "@/lib/session";
import { isCurrency } from "@/knowledge/pricing";
import { decideQualification, rerunRecommendation, setRecommendationStatus } from "@/server/leads";
import {
  addTask,
  postProjectUpdate,
  resolveSupportRequest,
  setTaskStatus,
  updateMilestone,
} from "@/server/projects";
import {
  approveAndSendProposal,
  createProposalDraft,
  ProposalEdit,
  reviseProposal,
  updateProposalDraft,
} from "@/server/proposals";

async function ctx() {
  return { db: await getDb(), actor: await getActor() };
}

// --- Leads -------------------------------------------------------------------

export async function qualifyLeadAction(leadId: string, decision: "qualified" | "disqualified") {
  const { db, actor } = await ctx();
  await decideQualification(db, actor, leadId, decision);
  revalidatePath("/hq", "layout");
}

export async function rerunRecommendationAction(leadId: string) {
  const { db, actor } = await ctx();
  await rerunRecommendation(db, actor, leadId);
  revalidatePath(`/hq/leads/${leadId}`);
}

export async function rejectRecommendationAction(leadId: string, recommendationId: string) {
  const { db, actor } = await ctx();
  await setRecommendationStatus(db, actor, recommendationId, "rejected");
  revalidatePath(`/hq/leads/${leadId}`);
}

export async function createDraftAction(recommendationId: string, formData: FormData) {
  const { db, actor } = await ctx();
  const currency = formData.get("currency");
  const draft = await createProposalDraft(db, actor, recommendationId, { currency: isCurrency(currency) ? currency : undefined });
  redirect(`/hq/proposals/${draft.id}`);
}

// --- Proposals ---------------------------------------------------------------

export async function saveDraftAction(proposalId: string, edit: ProposalEdit): Promise<ActionState> {
  const { db, actor } = await ctx();
  try {
    await updateProposalDraft(db, actor, proposalId, ProposalEdit.parse(edit));
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/hq/proposals/${proposalId}`);
  return { ok: "Draft saved." };
}

export async function approveAndSendAction(proposalId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { db, actor } = await ctx();
  try {
    await approveAndSendProposal(db, actor, proposalId, {
      pricingOverrideNote: String(formData.get("pricingOverrideNote") ?? ""),
    });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/hq", "layout");
  return { ok: "Approved and sent. The client can now review it in their Client Hub." };
}

export async function reviseProposalAction(proposalId: string) {
  const { db, actor } = await ctx();
  const draft = await reviseProposal(db, actor, proposalId);
  redirect(`/hq/proposals/${draft.id}`);
}

// --- Delivery ----------------------------------------------------------------

export async function updateMilestoneAction(
  projectId: string,
  milestoneId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { db, actor } = await ctx();
  try {
    await updateMilestone(db, actor, milestoneId, {
      status: String(formData.get("status")) as "not_started" | "in_progress" | "awaiting_approval" | "blocked",
      blockerNote: String(formData.get("blockerNote") ?? "") || undefined,
    });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/hq/projects/${projectId}`);
  return { ok: "Saved." };
}

export async function addTaskAction(projectId: string, milestoneId: string, formData: FormData) {
  const { db, actor } = await ctx();
  await addTask(db, actor, milestoneId, String(formData.get("title") ?? ""), formData.get("internal") !== "on");
  revalidatePath(`/hq/projects/${projectId}`);
}

export async function setTaskStatusAction(projectId: string, taskId: string, formData: FormData) {
  const { db, actor } = await ctx();
  await setTaskStatus(db, actor, taskId, String(formData.get("status")) as "todo" | "doing" | "blocked" | "done");
  revalidatePath(`/hq/projects/${projectId}`);
}

export async function postUpdateAction(projectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { db, actor } = await ctx();
  try {
    await postProjectUpdate(db, actor, projectId, String(formData.get("body") ?? ""));
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/hq/projects/${projectId}`);
  return { ok: "Update posted to the client." };
}

export async function resolveRequestAction(path: string, requestId: string) {
  const { db, actor } = await ctx();
  await resolveSupportRequest(db, actor, requestId);
  revalidatePath(path.startsWith("/hq") ? path : "/hq");
}
