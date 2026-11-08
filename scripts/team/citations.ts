// The citation check: before a research result goes to HQ, every email and
// phone number is looked up on the page it claims to come from. A detail
// that isn't there is removed, so the team never invents a way to reach
// someone. An email on the company's own domain is kept even when the page
// can't be read (it is the company's own address by construction).

import type { ResearchBatchResult } from "../../src/knowledge/team";

type Fetcher = (url: string) => Promise<string | null>;

/** The page's visible text, lower-cased, or null when it can't be read. */
export const fetchPageText: Fetcher = async (url) => {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "amfire-team-runner (citation check)" }, signal: AbortSignal.timeout(15_000), redirect: "follow" });
    if (!res.ok) return null;
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&#160;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#64;|&commat;/g, "@")
      .toLowerCase();
  } catch {
    return null;
  }
};

const host = (u: string | undefined) => {
  try {
    return u ? new URL(u).hostname.replace(/^www\./, "").toLowerCase() : null;
  } catch {
    return null;
  }
};
const digits = (s: string) => s.replace(/\D/g, "");
const lastTen = (s: string) => digits(s).slice(-10);

/** Whether a page's text contains this email or phone number. */
export function pageHas(text: string, kind: "email" | "phone", value: string) {
  if (kind === "email") return text.includes(value.toLowerCase());
  const want = lastTen(value);
  // Pages write numbers with spaces, dashes or a +91; compare digits only.
  return want.length >= 8 && digits(text).includes(want);
}

export type CitationReport = { checked: number; kept: number; removed: { who: string; field: string; value: string; why: string }[] };

/** Removes every email or phone its source doesn't show. Returns the cleaned result and what it removed. */
export async function checkCitations(result: ResearchBatchResult, fetcher: Fetcher = fetchPageText): Promise<{ result: ResearchBatchResult; report: CitationReport }> {
  const cache = new Map<string, Promise<string | null>>();
  const page = (url: string) => {
    if (!cache.has(url)) cache.set(url, fetcher(url));
    return cache.get(url)!;
  };
  const report: CitationReport = { checked: 0, kept: 0, removed: [] };

  const verify = async (who: string, field: "email" | "phone", value: string | undefined, sources: (string | undefined)[], siteHost: string | null) => {
    if (!value) return undefined;
    report.checked++;
    if (field === "email" && siteHost && value.toLowerCase().endsWith(`@${siteHost}`)) {
      report.kept++;
      return value;
    }
    let reachable = false;
    for (const src of sources.filter((s): s is string => !!s)) {
      const text = await page(src);
      if (text === null) continue;
      reachable = true;
      if (pageHas(text, field, value)) {
        report.kept++;
        return value;
      }
    }
    report.removed.push({ who, field, value, why: reachable ? "not on its source page" : "source page couldn't be read" });
    return undefined;
  };

  const targets = [];
  for (const t of result.targets) {
    const siteHost = host(t.prospect.website);
    const sources = [t.prospect.website, t.prospect.sourceUrl];
    const prospect = {
      ...t.prospect,
      email: await verify(t.prospect.name, "email", t.prospect.email, sources, siteHost),
      phone: await verify(t.prospect.name, "phone", t.prospect.phone, sources, siteHost),
    };
    const contacts = [];
    for (const c of t.contacts) {
      const own = [c.sourceUrl, t.prospect.website];
      contacts.push({ ...c, email: await verify(c.name, "email", c.email, own, siteHost), phone: await verify(c.name, "phone", c.phone, own, siteHost) });
    }
    targets.push({ ...t, prospect, contacts });
  }
  const note = report.removed.length
    ? ` Citation check: ${report.kept} of ${report.checked} contact details confirmed on their source; removed ${report.removed.length}.`
    : report.checked
      ? ` Citation check: all ${report.checked} contact details confirmed on their source.`
      : "";
  return { result: { ...result, targets, summary: `${result.summary}${note}`.slice(0, 1500) }, report };
}
