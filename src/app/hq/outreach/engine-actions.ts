"use server";

// Signal engine actions. Like every HQ action, each re-checks authorisation on
// the server: bound arguments and form fields come from the browser.

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { prospects } from "@/db/schema";
import { FIT_RULES, segmentOf } from "@/knowledge/engine";
import { toActionError, type ActionState } from "@/lib/action-result";
import { getActor } from "@/lib/session";
import { addContact, addSignal, recordFeedback, removeContact, removeSignal, runLearning, setFacts, startPlay, stopPlay } from "@/server/engine";
import { logTouch, parseIstLocal } from "@/server/outreach";

async function ctx() {
  return { db: await getDb(), actor: await getActor() };
}

const text = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return typeof v === "string" ? v : undefined;
};

function refresh(prospectId?: string) {
  revalidatePath("/hq/outreach", "layout");
  if (prospectId) revalidatePath(`/hq/outreach/${prospectId}`);
}

export async function runLearningAction(): Promise<ActionState> {
  const { db, actor } = await ctx();
  try {
    const run = await runLearning(db, actor, { trigger: "owner" });
    refresh();
    return { ok: `Re-learned from ${run.touchesRead} touches: ${run.changes.length} weights moved, ${run.prospectsScored} prospects rescored.` };
  } catch (err) {
    return toActionError(err);
  }
}

export async function startPlayAction(prospectId: string, playId?: string) {
  const { db, actor } = await ctx();
  await startPlay(db, actor, prospectId, playId);
  refresh(prospectId);
}

export async function stopPlayAction(prospectId: string) {
  const { db, actor } = await ctx();
  await stopPlay(db, actor, prospectId);
  refresh(prospectId);
}

/** Logs a play step: the touch carries the step, the message variant, the person and the reason, so the engine can learn from it. */
export async function logStepAction(
  prospectId: string,
  step: { playStep: number; variant: string; contactId: string | null; signalId: string | null },
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { db, actor } = await ctx();
  try {
    await logTouch(db, actor, {
      prospectId,
      channel: text(formData, "channel") as never,
      outcome: text(formData, "outcome") as never,
      objection: text(formData, "objection") as never,
      note: text(formData, "note"),
      followUpAt: parseIstLocal(text(formData, "followUpAt")),
      playStep: step.playStep,
      variant: step.variant,
      contactId: step.contactId,
      signalId: step.signalId,
    });
  } catch (err) {
    return toActionError(err);
  }
  refresh(prospectId);
  return { ok: "Logged. The play moves to its next step." };
}

export async function addSignalAction(prospectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { db, actor } = await ctx();
  try {
    const { created } = await addSignal(db, actor, prospectId, {
      type: text(formData, "type") ?? "",
      title: text(formData, "title") ?? "",
      sourceUrl: text(formData, "sourceUrl"),
      observedAt: text(formData, "observedAt") ?? "",
      detail: text(formData, "detail"),
    });
    refresh(prospectId);
    return created ? { ok: "Signal added and the score updated." } : { error: "That signal is already on this prospect." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function addContactAction(prospectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { db, actor } = await ctx();
  try {
    const { created } = await addContact(db, actor, prospectId, {
      name: text(formData, "name") ?? "",
      title: text(formData, "title"),
      role: (text(formData, "role") || "decision_maker") as never,
      phone: text(formData, "phone"),
      email: text(formData, "email") ?? "",
      linkedinUrl: text(formData, "linkedinUrl"),
    });
    refresh(prospectId);
    return created ? { ok: "Added." } : { error: "That person is already here." };
  } catch (err) {
    return toActionError(err);
  }
}

/** Reads a typed form value: numbers as numbers, true/false as booleans, empty clears the fact. */
function factValue(v: string | undefined) {
  if (v === undefined) return undefined;
  const t = v.trim();
  if (t === "") return null;
  if (t === "true" || t === "false") return t === "true";
  const n = Number(t.replace(/[,₹\s]/g, ""));
  return /^[\d,₹\s.]+$/.test(t) && Number.isFinite(n) ? n : t;
}

export async function setFactsAction(prospectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { db, actor } = await ctx();
  try {
    const [p] = await db.select({ kind: prospects.kind }).from(prospects).where(eq(prospects.id, prospectId));
    if (!p) return { error: "Prospect not found." };
    const facts: Record<string, string | number | boolean | null> = {};
    for (const rule of FIT_RULES[segmentOf(p.kind)]) {
      const v = factValue(text(formData, `fact_${rule.fact}`));
      if (v !== undefined) facts[rule.fact] = v;
    }
    await setFacts(db, actor, prospectId, {
      facts,
      pincode: text(formData, "pincode")?.trim() || null,
      assetUrl: text(formData, "assetUrl")?.trim() || null,
    });
  } catch (err) {
    return toActionError(err);
  }
  refresh(prospectId);
  return { ok: "Saved and rescored." };
}

export async function feedbackAction(prospectId: string, signalId: string | null, kind: string) {
  const { db, actor } = await ctx();
  await recordFeedback(db, actor, { prospectId, signalId, kind: kind as never });
  refresh(prospectId);
}

export async function removeSignalAction(prospectId: string, signalId: string) {
  const { db, actor } = await ctx();
  await removeSignal(db, actor, signalId);
  refresh(prospectId);
}

export async function removeContactAction(prospectId: string, contactId: string) {
  const { db, actor } = await ctx();
  await removeContact(db, actor, contactId);
  refresh(prospectId);
}
