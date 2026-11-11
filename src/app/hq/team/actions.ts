"use server";

// Revenue team actions. Each re-checks who's asking on the server: form
// fields and bound arguments come from the browser.

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { BELTS } from "@/knowledge/engine";
import { toActionError, type ActionState } from "@/lib/action-result";
import { getActor } from "@/lib/session";
import { cancelTask, createTask } from "@/server/team-tasks";

const text = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
};

/** "Find N manufacturers in <belt>": a research task the laptop runner picks up. */
export async function queueResearchAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const [db, actor] = await Promise.all([getDb(), getActor()]);
    const belt = BELTS.find((b) => b.id === text(formData, "belt"));
    if (!belt) return { error: "Choose an industrial belt." };
    const count = Math.min(Math.max(Number(text(formData, "count") ?? 10) || 10, 1), 10);
    const area = text(formData, "area");
    await createTask(db, actor, {
      type: "research_batch",
      payload: {
        segment: "manufacturer",
        place: { city: "Pune", ...(area ? { area } : {}), near: { area: belt.start, km: 15 } },
        count,
        ...(text(formData, "brief") ? { brief: text(formData, "brief") } : {}),
      },
    });
    revalidatePath("/hq/team");
    return { ok: `Queued: find ${count} manufacturers in ${area ?? belt.label}. Your laptop runner picks it up when it's on.` };
  } catch (err) {
    return toActionError(err);
  }
}

/** "Pack these accounts": brief, opener, email draft and outline for up to 10. */
export async function queuePackAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const [db, actor] = await Promise.all([getDb(), getActor()]);
    const ids = [...new Set(formData.getAll("prospectId").filter((v): v is string => typeof v === "string"))];
    if (ids.length === 0) return { error: "Tick at least one account." };
    if (ids.length > 10) return { error: `${ids.length} ticked. A pack takes at most 10; queue two packs.` };
    await createTask(db, actor, { type: "message_pack", payload: { prospectIds: ids, ...(text(formData, "brief") ? { brief: text(formData, "brief") } : {}) } });
    revalidatePath("/hq/team");
    return { ok: `Queued a pack for ${ids.length} account${ids.length === 1 ? "" : "s"}.` };
  } catch (err) {
    return toActionError(err);
  }
}

export async function cancelTaskAction(taskId: string) {
  const [db, actor] = await Promise.all([getDb(), getActor()]);
  await cancelTask(db, actor, taskId);
  revalidatePath("/hq/team");
}
