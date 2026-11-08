// What each revenue-team task must return. One definition, used twice: the
// laptop runner turns it into the JSON schema Claude Code must answer in
// (--json-schema), and HQ checks the submitted result against it before
// applying anything. Pure: no database, so the runner script can import it.

import * as z from "zod";
import { CONTACT_ROLE_IDS, SIGNAL_TYPE_IDS } from "./engine";

const url = z.string().trim().url().max(500);
const short = (max: number) => z.string().trim().min(1).max(max);

// --- research_batch: new target accounts, every field with its source ---------------------

export const ResearchTarget = z.object({
  prospect: z.object({
    name: short(200).describe("Registered company name"),
    cin: z.string().trim().max(21).optional().describe("MCA CIN, e.g. U28939PN2007PTC130375"),
    area: short(120).describe("Industrial area and village, e.g. 'Chakan (Nighoje)'"),
    website: url.optional(),
    phone: z.string().trim().max(30).optional().describe("Only if the company's own site, IndiaMART or the MCA filing prints it"),
    email: z.string().trim().email().max(200).optional().describe("Company inbox, only if printed on its own site or filing"),
    mapsUrl: url.optional().describe("Google Maps place link of the plant, with @lat,lng"),
    brief: z.string().trim().max(1200).optional().describe("What they make, for whom, size; two or three lines"),
    sourceUrl: url.describe("The page the company record came from (Tofler/Zaubacorp/MCA)"),
  }),
  facts: z
    .object({
      revenueLowCr: z.number().min(0).optional(),
      revenueBand: z.string().max(40).optional(),
      revenueYear: z.string().max(12).optional(),
      employees: z.number().int().min(0).optional(),
      ownership: z.enum(["indian_family", "indian_professional", "listed", "foreign_subsidiary"]).optional(),
      plants: z.number().int().min(0).optional(),
    })
    .default({}),
  contacts: z
    .array(
      z.object({
        name: short(120),
        title: z.string().trim().max(80).optional(),
        role: z.enum(CONTACT_ROLE_IDS),
        email: z.string().trim().email().max(200).optional(),
        phone: z.string().trim().max(30).optional(),
        sourceUrl: url,
        notes: z.string().trim().max(400).optional(),
      }),
    )
    .max(6)
    .default([]),
  signals: z
    .array(
      z.object({
        type: z.enum(SIGNAL_TYPE_IDS),
        title: short(300).describe("What happened, with specifics and the date in words"),
        observedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "A date: YYYY-MM-DD"),
        sourceUrl: url,
        confidence: z.number().min(0).max(1).default(0.8),
      }),
    )
    .max(8)
    .default([]),
});
export type ResearchTarget = z.infer<typeof ResearchTarget>;

export const ResearchBatchResult = z.object({
  targets: z.array(ResearchTarget).max(10),
  rejected: z.array(z.object({ name: short(200), cin: z.string().max(21).optional(), reason: short(300) })).max(30).default([]),
  summary: short(1500).describe("Three to five lines: what was found, what was rejected and why, gaps left"),
});
export type ResearchBatchResult = z.infer<typeof ResearchBatchResult>;

// --- message_pack: the founder's words for each account ---------------------------------------

export const AccountPack = z.object({
  prospectId: z.string().uuid(),
  brief: short(1200).describe("At most 5 lines: what they make, size, who decides, the dated reason, the gate line"),
  opener: short(400).describe("The first line the founder says to the MD, built on the dated reason"),
  email: z
    .object({
      toEmail: z.string().trim().email().max(200).nullable().describe("The MD's own published address, else the company inbox; null if none is published"),
      subject: short(200),
      headline: short(200).describe("Two short lines; *one word* is the saffron accent"),
      greeting: short(120),
      opening: short(1500).describe("The plant study note with one personal sentence on the dated reason; under 120 words with the closing"),
      closing: short(400).describe("One ask, e.g. 'Would 20 minutes next week work, to see if it's worth doing?'"),
    })
    .nullable(),
  outline: short(3000).describe("The printed one-page plant study outline, Markdown"),
});

export const MessagePackResult = z.object({
  packs: z.array(AccountPack).max(10),
  summary: short(1500),
});
export type MessagePackResult = z.infer<typeof MessagePackResult>;

export const TASK_RESULTS = {
  research_batch: ResearchBatchResult,
  message_pack: MessagePackResult,
} as const;

// --- Copy rules, checked in code on every outward line ------------------------------------------

/** Words a first touch never uses: no "AI", no automation talk, no prices or rupees. */
const BANNED = [
  /\bA\.?I\.?\b/,
  /artificial intelligence/i,
  /\bautomat(e|ed|ion|ing)\b/i,
  /\bsoftware\b/i,
  /\bpric(e|es|ing)\b/i,
  /₹|\brs\.?\s?\d|\brupees?\b|\blakhs?\b|\bcrores?\b/i,
];

/** What's wrong with a line meant for the prospect, or [] when it passes. */
export function copyProblems(text: string) {
  const problems: string[] = [];
  for (const rule of BANNED) {
    const hit = text.match(rule);
    if (hit) problems.push(`uses "${hit[0]}"`);
  }
  if (/\bAMFIRE\b|\bAmfire\b/.test(text)) problems.push('writes the brand as "AMFIRE"/"Amfire", not "amfire"');
  return problems;
}
