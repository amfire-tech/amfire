// Transparent, rule-based lead scoring. The score is a suggestion for a human
// reviewer — a person decides whether a lead is qualified.

import type { GoalId, TeamSizeId, UrgencyId } from "@/knowledge/catalog";

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
]);

export type QualificationInput = {
  goal: GoalId;
  urgency: UrgencyId;
  teamSize?: TeamSizeId | null;
  problem: string;
  email: string;
};

export type Qualification = { score: number; band: "strong" | "possible" | "low"; reasons: string[] };

export function scoreLead(input: QualificationInput): Qualification {
  const reasons: string[] = [];
  let score = 0;

  const urgency = { urgent: 30, month: 25, quarter: 15, exploring: 5 }[input.urgency];
  score += urgency;
  reasons.push(`Timing: ${input.urgency} (+${urgency})`);

  const len = input.problem.trim().length;
  const detail = len > 200 ? 20 : len > 80 ? 12 : 5;
  score += detail;
  reasons.push(`Problem detail: ${len} characters (+${detail})`);

  const team = input.teamSize ? { "1-10": 10, "11-50": 20, "51-200": 25, "200+": 25 }[input.teamSize] : 5;
  score += team;
  reasons.push(`Team size: ${input.teamSize ?? "not given"} (+${team})`);

  const goal = input.goal === "not-sure" ? 5 : 15;
  score += goal;
  reasons.push(`Goal ${input.goal === "not-sure" ? "unclear" : "clear"} (+${goal})`);

  const domain = input.email.split("@")[1]?.toLowerCase() ?? "";
  if (domain && !FREE_EMAIL_DOMAINS.has(domain)) {
    score += 10;
    reasons.push("Business email domain (+10)");
  }

  score = Math.min(100, score);
  const band = score >= 60 ? "strong" : score >= 35 ? "possible" : "low";
  return { score, band, reasons };
}
