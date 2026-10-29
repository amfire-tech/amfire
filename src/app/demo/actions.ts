"use server";

// Public demo page actions. Visitors aren't signed in, so both are rate
// limited; a signed-in staff member opening the demo isn't counted as a view.

import { getDb } from "@/db";
import { toActionError } from "@/lib/action-result";
import { rateLimit } from "@/lib/rate-limit";
import { getActor } from "@/lib/session";
import { isStaff } from "@/server/access";
import { askDemo, recordDemoView } from "@/server/demos";

export type DemoChatState = { turns: { q: string; a: string }[]; error?: string };

export async function askDemoAction(slug: string, prev: DemoChatState, formData: FormData): Promise<DemoChatState> {
  const turns = prev?.turns ?? [];
  const question = String(formData.get("question") ?? "");
  if (!(await rateLimit(`demo-chat:${slug}`, 30, 60 * 60 * 1000))) {
    return { turns, error: "That's a lot of messages for one demo. Try again in a while, or talk to amfire directly." };
  }
  try {
    const { answer } = await askDemo(await getDb(), slug, question, turns.slice(-4));
    return { turns: [...turns, { q: question, a: answer }].slice(-10) };
  } catch (err) {
    return { turns, error: toActionError(err)?.error };
  }
}

export async function recordDemoViewAction(slug: string) {
  if (!(await rateLimit(`demo-view:${slug}`, 20, 60 * 60 * 1000))) return;
  await recordDemoView(await getDb(), slug, { viewerIsStaff: isStaff(await getActor()) });
}
