"use server";

// Every action re-checks authorisation on the server: bound arguments and
// form fields come from the browser and are never trusted.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { toActionError, type ActionState } from "@/lib/action-result";
import { getActor } from "@/lib/session";
import { isCurrency } from "@/knowledge/pricing";
import {
  addManualLead,
  decideQualification,
  rerunRecommendation,
  setRecommendationStatus,
  updateLeadContact,
} from "@/server/leads";
import {
  addMilestone,
  addOutsideProject,
  addTask,
  postProjectUpdate,
  resolveSupportRequest,
  setTaskStatus,
  updateMilestone,
} from "@/server/projects";
import { assertOwner, assertStaff } from "@/server/access";
import { latestBrief, runTeam } from "@/server/agents/team";
import { briefEmail, deliverBrief } from "@/server/notify";
import { approve, draftInvestorUpdate, reject, shareInvoice, updateAgentSetting } from "@/server/brain";
import { addFact, logInteraction, retireFact, setLeadOutcome, updateBilling, updateDeal } from "@/server/crm";
import { sendClientDigests } from "@/server/client-digest";
import { replyToRequest } from "@/server/portal";
import { addChecklistItem, deleteChecklistItem, estimateChange, reopenChecklistItem } from "@/server/hub";
import { askHq, type AskAnswer, type AskTurn } from "@/server/ask";
import { createPost } from "@/server/growth";
import {
  createManualInvoice,
  createSubscription,
  draftDueRetainerInvoices,
  logTime,
  recordPayment,
  sendInvoice,
  setSubscriptionStatus,
  voidInvoice,
} from "@/server/money";
import {
  approveAndSendProposal,
  attachProposalFile,
  createProposalDraft,
  deleteProposalDraft,
  ProposalEdit,
  removeProposalFile,
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

const formText = (formData: FormData, keys: string[]) =>
  Object.fromEntries(keys.map((k) => [k, typeof formData.get(k) === "string" ? String(formData.get(k)) : undefined]));

export async function addLeadAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { db, actor } = await ctx();
  let leadId: string;
  try {
    const input = formText(formData, ["source", "sourceNote", "name", "company", "email", "phone", "problem", "goal", "businessType", "urgency"]);
    const { lead } = await addManualLead(db, actor, input as Parameters<typeof addManualLead>[2]);
    leadId = lead.id;
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/hq", "layout");
  redirect(`/hq/leads/${leadId}`);
}

export async function updateLeadContactAction(leadId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { db, actor } = await ctx();
  try {
    await updateLeadContact(db, actor, leadId, formText(formData, ["email", "phone"]));
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/hq/leads/${leadId}`);
  return { ok: "Saved." };
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

export async function deleteProposalAction(proposalId: string, leadId: string) {
  const { db, actor } = await ctx();
  await deleteProposalDraft(db, actor, proposalId);
  revalidatePath("/hq", "layout");
  redirect(`/hq/leads/${leadId}`);
}

export async function attachProposalFileAction(proposalId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { db, actor } = await ctx();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a PDF file." };
  try {
    await attachProposalFile(db, actor, proposalId, { name: file.name, bytes: Buffer.from(await file.arrayBuffer()) });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/hq/proposals/${proposalId}`);
  return { ok: "PDF attached. The client sees it with the proposal." };
}

export async function removeProposalFileAction(proposalId: string) {
  const { db, actor } = await ctx();
  await removeProposalFile(db, actor, proposalId);
  revalidatePath(`/hq/proposals/${proposalId}`);
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

/** A reply to a client's support request; the client is emailed. "resolve" also closes it. */
export async function staffReplyAction(requestId: string, _prev: ActionState, formData: FormData) {
  return run(
    ({ db, actor }) => replyToRequest(db, actor, requestId, { body: String(formData.get("body") ?? "") }, { resolve: formData.get("resolve") === "on" }),
    "Reply sent. The client has been emailed.",
  );
}

export async function resolveRequestAction(path: string, requestId: string) {
  const { db, actor } = await ctx();
  await resolveSupportRequest(db, actor, requestId);
  revalidatePath(path.startsWith("/hq") ? path : "/hq");
}

/** Runs a mutation, refreshes HQ, and turns domain errors into a message. */
async function run(fn: (c: Awaited<ReturnType<typeof ctx>>) => Promise<unknown>, ok: string): Promise<ActionState> {
  try {
    await fn(await ctx());
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/hq", "layout");
  return { ok };
}

// --- Relationships -------------------------------------------------------------

export async function logInteractionAction(target: { leadId?: string; orgId?: string }, _prev: ActionState, formData: FormData) {
  const input = formText(formData, ["kind", "direction", "summary"]);
  return run(
    ({ db, actor }) => logInteraction(db, actor, target, { ...input, direction: input.direction || undefined } as Parameters<typeof logInteraction>[3]),
    "Logged.",
  );
}

export async function updateDealAction(leadId: string, _prev: ActionState, formData: FormData) {
  return run(({ db, actor }) => updateDeal(db, actor, leadId, formText(formData, ["dealValue", "nextFollowUpAt"]) as never), "Saved.");
}

export async function markLostAction(leadId: string) {
  return run(({ db, actor }) => setLeadOutcome(db, actor, leadId, "lost"), "Marked as lost.");
}

export async function addFactAction(subject: { type: "lead" | "organization"; id: string }, _prev: ActionState, formData: FormData) {
  return run(({ db, actor }) => addFact(db, actor, subject, { fact: String(formData.get("fact") ?? "") }), "Added to the dossier.");
}

export async function retireFactAction(memoryId: string) {
  const { db, actor } = await ctx();
  await retireFact(db, actor, memoryId);
  revalidatePath("/hq", "layout");
}

// --- Money ---------------------------------------------------------------------

export async function createInvoiceAction(target: { orgId: string; projectId?: string; currency: string }, _prev: ActionState, formData: FormData) {
  return run(
    ({ db, actor }) =>
      createManualInvoice(db, actor, {
        orgId: target.orgId,
        projectId: target.projectId,
        currency: target.currency as "INR" | "USD",
        title: String(formData.get("title") ?? ""),
        amount: String(formData.get("amount") ?? "") as never,
      }),
    "Draft invoice created.",
  );
}

export async function sendInvoiceAction(invoiceId: string): Promise<ActionState> {
  const { db, actor } = await ctx();
  try {
    await sendInvoice(db, actor, invoiceId);
    const shared = await shareInvoice(db, actor, invoiceId);
    revalidatePath("/hq", "layout");
    return { ok: shared.note, link: shared.link };
  } catch (err) {
    return toActionError(err);
  }
}

export async function shareInvoiceAction(invoiceId: string): Promise<ActionState> {
  const { db, actor } = await ctx();
  try {
    const shared = await shareInvoice(db, actor, invoiceId);
    revalidatePath("/hq", "layout");
    return { ok: shared.note, link: shared.link };
  } catch (err) {
    return toActionError(err);
  }
}

export async function newInvoiceAction(_prev: ActionState, formData: FormData) {
  return run(
    ({ db, actor }) => createManualInvoice(db, actor, formText(formData, ["orgId", "title", "amount", "currency"]) as never),
    "Draft invoice created. Open it to send.",
  );
}

export async function updateBillingAction(orgId: string, _prev: ActionState, formData: FormData) {
  return run(({ db, actor }) => updateBilling(db, actor, orgId, formText(formData, ["billingName", "billingAddress", "gstin", "state"])), "Billing details saved.");
}

export async function addMilestoneAction(projectId: string, _prev: ActionState, formData: FormData) {
  return run(({ db, actor }) => addMilestone(db, actor, projectId, formText(formData, ["title", "description", "dueDate", "amount"]) as never), "Milestone added.");
}

export async function addProjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { db, actor } = await ctx();
  let projectId: string;
  try {
    const input = formText(formData, [
      "orgId",
      "clientName",
      "contactName",
      "contactEmail",
      "contactPhone",
      "source",
      "businessType",
      "name",
      "description",
      "path",
      "status",
      "startedAt",
      "endedAt",
      "amount",
      "currency",
    ]);
    const project = await addOutsideProject(db, actor, { ...input, paidInFull: formData.get("paidInFull") === "on" } as never);
    projectId = project.id;
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/hq", "layout");
  redirect(`/hq/projects/${projectId}`);
}

export async function voidInvoiceAction(invoiceId: string) {
  return run(({ db, actor }) => voidInvoice(db, actor, invoiceId), "Invoice voided.");
}

export async function recordPaymentAction(invoiceId: string, _prev: ActionState, formData: FormData) {
  return run(
    ({ db, actor }) => recordPayment(db, actor, invoiceId, formText(formData, ["amount", "method", "reference"]) as never),
    "Payment recorded.",
  );
}

export async function createSubscriptionAction(target: { orgId: string; projectId?: string }, _prev: ActionState, formData: FormData) {
  return run(
    ({ db, actor }) =>
      createSubscription(db, actor, {
        ...target,
        ...(formText(formData, ["title", "amount", "currency"]) as { title: string; amount: string; currency: "INR" | "USD" }),
        startsAt: String(formData.get("startsAt") || "") || undefined,
      }),
    "Monthly plan added.",
  );
}

export async function setSubscriptionStatusAction(subscriptionId: string, status: "active" | "paused" | "cancelled") {
  return run(({ db, actor }) => setSubscriptionStatus(db, actor, subscriptionId, status), "Plan updated.");
}

export async function draftRetainerInvoicesAction(): Promise<ActionState> {
  const { db, actor } = await ctx();
  try {
    assertStaff(actor);
    const drafted = await draftDueRetainerInvoices(db);
    revalidatePath("/hq", "layout");
    return { ok: drafted.length ? `${drafted.length} plan invoice${drafted.length === 1 ? "" : "s"} drafted.` : "No plans are due." };
  } catch (err) {
    return toActionError(err);
  }
}

// --- AI team and decision inbox -------------------------------------------------

export async function runTeamAction(): Promise<ActionState> {
  const { db, actor } = await ctx();
  try {
    assertStaff(actor);
    const r = await runTeam(db, { triggeredBy: actor.userId });
    revalidatePath("/hq", "layout");
    return { ok: `Done: ${r.pending} decision${r.pending === 1 ? "" : "s"} waiting, ${r.signals} item${r.signals === 1 ? "" : "s"} flagged.` };
  } catch (err) {
    return toActionError(err);
  }
}

/** Emails the latest brief now (writing one first if there's none), to check delivery without waiting for 8:00. */
export async function emailBriefAction(): Promise<ActionState> {
  const { db, actor } = await ctx();
  try {
    assertOwner(actor);
    const brief = (await latestBrief(db))?.brief ?? (await runTeam(db, { triggeredBy: actor.userId })).brief;
    const [email] = (await deliverBrief(db, brief.headline, brief.body)).filter((r) => r.channel === "email");
    revalidatePath("/hq/agents");
    if (email?.status === "sent") return { ok: `Brief emailed to ${briefEmail()}.` };
    return { error: email?.status === "failed" ? "The email couldn't be sent. See “Brief deliveries” below for the reason." : "Email isn't set up yet (NOTIFY_FROM_EMAIL and RESEND_API_KEY)." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function approveAction(approvalId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { db, actor } = await ctx();
  try {
    const text = formData.get("text");
    const result = await approve(db, actor, approvalId, typeof text === "string" ? text : undefined);
    revalidatePath("/hq", "layout");
    return { ok: result.note, link: result.link };
  } catch (err) {
    return toActionError(err);
  }
}

export async function rejectAction(approvalId: string) {
  return run(({ db, actor }) => reject(db, actor, approvalId), "Dismissed.");
}

export async function updateAgentSettingAction(role: string, _prev: ActionState, formData: FormData) {
  return run(
    ({ db, actor }) =>
      updateAgentSetting(db, actor, role, { enabled: formData.get("enabled") === "on", dailyBudgetUsd: String(formData.get("budget") ?? "0") as never }),
    "Saved.",
  );
}

export async function draftInvestorUpdateAction(): Promise<ActionState> {
  const { db, actor } = await ctx();
  try {
    const row = await draftInvestorUpdate(db, actor);
    revalidatePath("/hq", "layout");
    return { ok: row ? "Drafted — it's in your decision inbox on Today." : "This month's update is already in your inbox." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function addChecklistItemAction(projectId: string, _prev: ActionState, formData: FormData) {
  return run(
    ({ db, actor }) => addChecklistItem(db, actor, projectId, formText(formData, ["title", "detail", "dueDate"]) as never),
    "Added. The client has been emailed.",
  );
}

export async function reopenChecklistItemAction(itemId: string) {
  return run(({ db, actor }) => reopenChecklistItem(db, actor, itemId), "Reopened.");
}

export async function deleteChecklistItemAction(itemId: string) {
  return run(({ db, actor }) => deleteChecklistItem(db, actor, itemId), "Removed.");
}

/** Sends this week's client emails now (they normally go out on Friday mornings). */
export async function sendClientDigestsAction(): Promise<ActionState> {
  const { db, actor } = await ctx();
  try {
    assertOwner(actor);
    const r = await sendClientDigests(db);
    revalidatePath("/hq/agents");
    return { ok: r.sent ? `Sent ${r.sent} weekly email${r.sent === 1 ? "" : "s"} to clients.` : "No new weekly emails to send (already sent this week, or nothing to report)." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function estimateChangeAction(changeId: string, _prev: ActionState, formData: FormData) {
  return run(({ db, actor }) => estimateChange(db, actor, changeId, formText(formData, ["amount", "weeks", "note"]) as never), "Estimate sent to the client.");
}

export type AskState = { turns: (AskTurn & { answer: AskAnswer })[]; error?: string };

/** One question in an Ask HQ conversation; the last few turns go along so follow-ups make sense. */
export async function askHqAction(prev: AskState, formData: FormData): Promise<AskState> {
  if (formData.get("reset")) return { turns: [] };
  const question = String(formData.get("question") ?? "");
  const turns = prev?.turns ?? [];
  const { db, actor } = await ctx();
  try {
    const answer = await askHq(
      db,
      actor,
      question,
      turns.slice(-4).map((t) => ({ q: t.q, a: t.a.slice(0, 3000) })),
    );
    return { turns: [...turns, { q: question, a: answer.answer, answer }].slice(-8) };
  } catch (err) {
    return { turns, error: toActionError(err)?.error };
  }
}

export async function createPostAction(_prev: ActionState, formData: FormData) {
  return run(({ db, actor }) => createPost(db, actor, formText(formData, ["title", "postUrl", "targetPath"]) as never), "Tracked link created.");
}

export async function logTimeAction(projectId: string, _prev: ActionState, formData: FormData) {
  return run(({ db, actor }) => logTime(db, actor, projectId, formText(formData, ["hours", "note"]) as never), "Time logged.");
}
