"use server";

// Outreach desk actions. Like every HQ action, each re-checks authorisation on
// the server: bound arguments and form fields come from the browser.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { toActionError, type ActionState } from "@/lib/action-result";
import { getActor } from "@/lib/session";
import {
  addProspects,
  convertToLead,
  logTouch,
  parseIstLocal,
  parsePastedProspects,
  updateProspect,
  type ProspectInput,
} from "@/server/outreach";

async function ctx() {
  return { db: await getDb(), actor: await getActor() };
}

const text = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return typeof v === "string" ? v : undefined;
};

function touchFromForm(prospectId: string, formData: FormData) {
  return {
    prospectId,
    channel: text(formData, "channel") as never,
    outcome: text(formData, "outcome") as never,
    objection: text(formData, "objection") as never,
    note: text(formData, "note"),
    followUpAt: parseIstLocal(text(formData, "followUpAt")),
  };
}

/** From the dialer: log what happened and go straight to the next prospect. */
export async function logTouchAndNextAction(prospectId: string, queue: { skip: string[]; kind?: string }, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { db, actor } = await ctx();
  try {
    await logTouch(db, actor, touchFromForm(prospectId, formData));
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/hq/outreach", "layout");
  const params = new URLSearchParams();
  if (queue.kind) params.set("kind", queue.kind);
  const skip = [...queue.skip, prospectId].slice(-150);
  params.set("skip", skip.join(","));
  redirect(`/hq/outreach/call?${params}`);
}

export async function logTouchAction(prospectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { db, actor } = await ctx();
  try {
    await logTouch(db, actor, touchFromForm(prospectId, formData));
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/hq/outreach", "layout");
  return { ok: "Logged." };
}

export async function addProspectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { db, actor } = await ctx();
  try {
    const input = Object.fromEntries(
      ["name", "contactName", "phone", "email", "website", "area", "industry", "kind", "signal", "notes"].map((k) => [k, text(formData, k)]),
    ) as ProspectInput;
    const { created, skipped } = await addProspects(db, actor, [input]);
    if (created.length === 0) return { error: `Already on the desk: ${skipped[0]?.reason}.` };
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/hq/outreach", "layout");
  return { ok: "Added." };
}

export async function importProspectsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { db, actor } = await ctx();
  try {
    const rows = parsePastedProspects(text(formData, "rows") ?? "", { kind: text(formData, "kind"), industry: text(formData, "industry") || undefined });
    if (rows.length === 0) return { error: "Paste at least one row: a name, then a phone number, area and industry." };
    const { created, skipped } = await addProspects(db, actor, rows, { source: "import" });
    revalidatePath("/hq/outreach", "layout");
    return { ok: `Added ${created.length}.${skipped.length ? ` Skipped ${skipped.length} already on the desk.` : ""}` };
  } catch (err) {
    return toActionError(err);
  }
}

export async function updateProspectAction(prospectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { db, actor } = await ctx();
  try {
    // An emptied field clears it.
    const patch = Object.fromEntries(
      ["name", "contactName", "contactRole", "phone", "email", "website", "mapsUrl", "linkedinUrl", "area", "industry", "kind", "tier", "signal", "brief", "opener", "notes"].map((k) => {
        const v = text(formData, k);
        return [k, v === undefined ? undefined : v.trim() === "" && k !== "name" && k !== "kind" && k !== "tier" ? null : v];
      }),
    );
    await updateProspect(db, actor, prospectId, patch);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/hq/outreach/${prospectId}`);
  return { ok: "Saved." };
}

export async function setProspectStatusAction(prospectId: string, change: "partner" | "do_not_contact" | "reopen") {
  const { db, actor } = await ctx();
  if (change === "partner") await updateProspect(db, actor, prospectId, { status: "partner", nextFollowUpAt: null });
  if (change === "do_not_contact") await updateProspect(db, actor, prospectId, { status: "dropped", statusReason: "Asked not to be contacted", doNotContact: true, nextFollowUpAt: null });
  if (change === "reopen") await updateProspect(db, actor, prospectId, { status: "to_contact", statusReason: null, doNotContact: false, nextFollowUpAt: null });
  revalidatePath("/hq/outreach", "layout");
}

export async function convertToLeadAction(prospectId: string) {
  const { db, actor } = await ctx();
  const lead = await convertToLead(db, actor, prospectId);
  revalidatePath("/hq", "layout");
  redirect(`/hq/leads/${lead.id}`);
}
