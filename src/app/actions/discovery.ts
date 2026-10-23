"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import * as z from "zod";
import { getDb } from "@/db";
import { CURRENCY_COOKIE, isCurrency } from "@/knowledge/pricing";
import { rateLimit } from "@/lib/rate-limit";
import { DiscoverySchema, submitDiscovery } from "@/server/leads";

export type DiscoveryState = { errors?: Record<string, string>; formError?: string } | undefined;

export async function submitDiscoveryAction(_prev: DiscoveryState, formData: FormData): Promise<DiscoveryState> {
  // Honeypot: real visitors never fill this hidden field.
  if (formData.get("website")) redirect("/start/thanks");

  if (!(await rateLimit("discovery", 5, 60 * 60 * 1000))) {
    return { formError: "We've received several enquiries from this connection. Please email us instead, or try again later." };
  }

  const raw = Object.fromEntries(
    ["goal", "businessType", "urgency", "teamSize", "problem", "currentTools", "name", "email", "phone", "callTime", "company"].map((k) => {
      const v = formData.get(k);
      return [k, typeof v === "string" && v.trim() !== "" ? v : undefined];
    }),
  );
  // Prices were shown in the currency picked with the site's currency switch.
  const currency = (await cookies()).get(CURRENCY_COOKIE)?.value;
  const parsed = DiscoverySchema.safeParse({
    ...raw,
    consent: formData.get("consent") === "on",
    currency: isCurrency(currency) ? currency : undefined,
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= issue.code === "invalid_value" && key !== "consent" ? "Please choose an option." : issue.message;
    }
    return { errors };
  }

  let ref: string;
  try {
    const { lead } = await submitDiscovery(await getDb(), parsed.data);
    ref = lead.publicRef;
  } catch (err) {
    console.error("discovery submit failed", err instanceof z.ZodError ? err.issues : err);
    return { formError: "Something went wrong saving your answers. Please try again, or email us directly." };
  }
  redirect(`/start/thanks?ref=${encodeURIComponent(ref)}`);
}
