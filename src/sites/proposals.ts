// Web proposals sent to one company, with the page names HQ shows when it reports
// which pages they read. The proposal itself is static HTML in public/for/<slug>/,
// opened through /for/<slug>?p=<prospect link token> so each visit is tied to the
// prospect it was sent to; the same token on /for/<slug>/demo ties the demo visit.

import { site } from "@/config/site";

export type WebProposal = {
  slug: string;
  title: string;
  /** Matches the prospect's name in HQ, so their page shows the personal links. */
  match: RegExp;
  /** Page names in order: pg01, pg02, … */
  pages: string[];
};

export const WEB_PROPOSALS: WebProposal[] = [
  {
    slug: "opticvyu",
    title: "Ops One proposal for OpticVyu",
    match: /optic\s*vyu/i,
    pages: [
      "Cover",
      "What you've built",
      "What growth costs",
      "Where it leaks",
      "The agentic era",
      "Meet Ops One",
      "Your Monday, before and after",
      "One tap to cash",
      "Every project, every team",
      "Every rupee, matched",
      "Your people, anywhere",
      "It gets smarter",
      "Safe and yours",
      "Live in weeks, risk on us",
      "Let's build it together",
    ],
  },
];

export const proposalFor = (name: string | null | undefined) => (name ? WEB_PROPOSALS.find((p) => p.match.test(name)) ?? null : null);

export const proposalLink = (slug: string, token: string) => `${site.url}/for/${slug}?p=${token}`;
export const proposalDemoLink = (slug: string, token: string) => `${site.url}/for/${slug}/demo?p=${token}`;

/** "pg03" → "Page 3 · What growth costs" for any known proposal. */
export function proposalPageLabel(view: string) {
  const m = /^pg(\d{2})$/.exec(view);
  if (!m) return null;
  const n = Number(m[1]);
  const name = WEB_PROPOSALS[0]?.pages[n - 1];
  return `Page ${n}${name ? ` · ${name}` : ""}`;
}
