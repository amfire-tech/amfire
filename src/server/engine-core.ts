// The signal engine's maths, kept pure (no database) so every rule can be read
// and tested in one place: how a lead is scored, how signals fade, how a play
// moves forward, which message variant to send, and how outcomes turn into the
// weights the engine uses tomorrow.

import {
  AREA_CENTRES,
  BLACKOUTS,
  FIT_RULES,
  TIMING,
  areaCentre,
  playFor,
  segmentFor,
  signalType,
  type FactValue,
  type Play,
  type SegmentId,
} from "@/knowledge/engine";
import { outcomeFor } from "@/knowledge/outreach";

const DAY = 24 * 60 * 60 * 1000;
const IST_OFFSET = 5.5 * 60 * 60 * 1000;

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

// --- Signals ----------------------------------------------------------------------

export type SignalLike = { id: string; type: string; title: string; observedAt: Date; expiresAt: Date | null; confidence: number };

/** How much a signal still counts after `ageDays`: halves every half-life. */
export function decay(observedAt: Date, now: Date, halfLifeDays: number | null) {
  if (halfLifeDays === null) return 1;
  const ageDays = Math.max(0, (now.getTime() - observedAt.getTime()) / DAY);
  return Math.pow(0.5, ageDays / halfLifeDays);
}

/** A signal's pull today: its learned weight × how sure we are × how fresh it is. 0 once expired or not yet true. */
export function signalPull(s: SignalLike, weight: number, now: Date) {
  if (s.expiresAt && s.expiresAt.getTime() < now.getTime()) return 0;
  const type = signalType(s.type);
  // A null half-life means the signal doesn't fade (a deadline), so `??` would be wrong here.
  return clamp(weight) * clamp(s.confidence) * decay(s.observedAt, now, type ? type.halfLifeDays : 30);
}

/** One sentence: what happened, then why it matters to them. */
export function reasonFor(s: Pick<SignalLike, "type" | "title">) {
  const title = s.title.trim().replace(/[.\s]+$/, "");
  const angle = signalType(s.type)?.angle;
  return angle && s.type !== "legacy_note" ? `${title}. ${angle}` : `${title}.`;
}

// --- Fit, timing, reach ------------------------------------------------------------

export function fitScore(segment: SegmentId, facts: Record<string, FactValue>) {
  const rules = FIT_RULES[segment];
  let total = 0;
  let weight = 0;
  const unknown: string[] = [];
  for (const rule of rules) {
    const v = facts[rule.fact];
    const known = v !== undefined && v !== null && v !== "";
    total += rule.weight * (known ? clamp(rule.score(v)) : rule.unknown);
    weight += rule.weight;
    if (!known) unknown.push(rule.label);
  }
  return { fit: weight ? total / weight : 0.5, unknown };
}

const monthDay = (d: Date) => new Date(d.getTime() + IST_OFFSET).toISOString().slice(5, 10);
const istDate = (d: Date) => new Date(d.getTime() + IST_OFFSET).toISOString().slice(0, 10);

function inWindow(md: string, from: string, to: string) {
  return from <= to ? md >= from && md <= to : md >= from || md <= to; // a window can run over New Year
}

/** How good a time of year it is to reach this segment, with the reason when it isn't. */
export function timingScore(segment: SegmentId, now: Date) {
  const windows = TIMING[segment];
  let factor = windows.length ? 0.85 : 1;
  let label: string | undefined;
  const md = monthDay(now);
  for (const w of windows) {
    if (inWindow(md, w.from, w.to)) {
      factor = w.factor;
      label = w.label;
    }
  }
  const day = istDate(now);
  for (const b of BLACKOUTS) {
    if (day >= b.from && day <= b.to && b.factor < factor) {
      factor = b.factor;
      label = b.label;
    }
  }
  return { timing: factor, label };
}

export type ContactLike = { id: string; name: string; role: string; phone: string | null; email: string | null; linkedinUrl: string | null; doNotContact: boolean };
type ReachProspect = { phone: string | null; email: string | null; contactName: string | null; website: string | null; mapsUrl: string | null };

const SENIOR = new Set(["decision_maker", "budget_owner"]);

/** Can we reach the person who decides? 1 = their own number or email. */
export function reachScore(p: ReachProspect, contacts: ContactLike[]) {
  let reach = p.phone || p.email ? (p.contactName ? 0.6 : 0.5) : p.website || p.mapsUrl ? 0.25 : 0.1;
  let hasDecisionMaker = !!p.contactName;
  for (const c of contacts) {
    if (c.doNotContact) continue;
    const direct = !!(c.phone || c.email);
    const senior = SENIOR.has(c.role);
    if (senior) hasDecisionMaker = true;
    const r = senior
      ? direct
        ? 1
        : c.linkedinUrl
          ? 0.8
          : p.phone || p.email
            ? 0.65
            : 0.45
      : c.role === "champion" || c.role === "influencer"
        ? direct
          ? 0.7
          : 0.4
        : direct
          ? 0.5
          : 0.3;
    reach = Math.max(reach, r);
  }
  return { reach, hasDecisionMaker };
}

// --- The score -----------------------------------------------------------------------

/**
 * A lead is warm only when all four are true, so they multiply: a perfect fit
 * with no reason to talk now is still cold. Weighted geometric mean, 0–100.
 */
export function combine(parts: { fit: number; trigger: number; timing: number; reach: number }) {
  const f = Math.max(parts.fit, 0.01);
  const t = Math.max(parts.trigger, 0.01);
  const ti = Math.max(parts.timing, 0.01);
  const r = Math.max(parts.reach, 0.01);
  return Math.round(100 * Math.pow(f, 0.3) * Math.pow(t, 0.4) * Math.pow(ti, 0.1) * Math.pow(r, 0.2));
}

export const tierFor = (score: number) => (score >= 70 ? "A" : score >= 50 ? "B" : "C");

/** Trigger strength when there is no signal at all. */
const NO_SIGNAL = 0.05;

export type ScoreInput = {
  segment: SegmentId;
  facts: Record<string, FactValue>;
  prospect: ReachProspect;
  contacts: ContactLike[];
  signals: SignalLike[];
  /** Learned weight per signal type for this segment; missing types use the catalogue prior. */
  weights: Map<string, number>;
  now: Date;
};

export function scoreProspect(input: ScoreInput) {
  const { fit, unknown } = fitScore(input.segment, input.facts);
  const { timing, label } = timingScore(input.segment, input.now);
  const { reach, hasDecisionMaker } = reachScore(input.prospect, input.contacts);

  // Signals combine like independent chances: 1 − Π(1 − pull).
  const pulls = input.signals
    .map((s) => ({ s, pull: signalPull(s, input.weights.get(s.type) ?? signalType(s.type)?.prior ?? 0.2, input.now) }))
    .filter((x) => x.pull > 0)
    .sort((a, b) => b.pull - a.pull);
  const trigger = pulls.length ? 1 - pulls.reduce((acc, x) => acc * (1 - x.pull), 1) : NO_SIGNAL;

  const parts = { fit: round(fit), trigger: round(trigger), timing: round(timing), reach: round(reach) };
  const missing = [
    ...(pulls.length ? [] : ["a dated reason to contact them now"]),
    ...(hasDecisionMaker ? [] : ["the decision maker's name"]),
    ...(reach < 1 && hasDecisionMaker ? ["the decision maker's own phone or email"] : []),
    ...unknown.slice(0, 3).map((u) => `fit fact: ${u.toLowerCase()}`),
  ];
  const score = combine(parts);
  const top = pulls[0]?.s;
  return {
    score,
    tier: tierFor(score),
    parts: { ...parts, timingLabel: label, top: pulls.slice(0, 3).map((x) => ({ signalId: x.s.id, type: x.s.type, contribution: round(x.pull) })), missing },
    reason: top ? reasonFor(top) : null,
  };
}

const round = (v: number) => Math.round(v * 1000) / 1000;

// --- Location ----------------------------------------------------------------------

/** Coordinates in a Google Maps link: "@18.55,73.79", "!3d18.55!4d73.79" or "?q=18.55,73.79". */
export function parseMapsCoords(url: string | null | undefined): [number, number] | null {
  if (!url) return null;
  const m = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/) ?? url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ?? url.match(/[?&](?:q|ll|query)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
}

/** Exact coordinates when we have them, else the centre of their locality (Pune only). */
export function coordsOf(p: { lat: number | null; lng: number | null; area: string | null }): { at: [number, number]; approximate: boolean } | null {
  if (p.lat !== null && p.lng !== null) return { at: [p.lat, p.lng], approximate: false };
  const centre = areaCentre(p.area);
  return centre ? { at: centre, approximate: true } : null;
}

export function haversineKm(a: [number, number], b: [number, number]) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export const KNOWN_AREAS = Object.keys(AREA_CENTRES);

// --- Plays -------------------------------------------------------------------------

type PlayState = { play: string | null; playStep: number; playStartedAt: Date | null; lastTouchAt: Date | null };

/** When the play's current step is due: its day after the start, and never sooner than the gap since the last touch. */
export function stepDue(p: PlayState) {
  const play = playFor(p.play);
  if (!play || !p.playStartedAt || p.playStep >= play.steps.length) return null;
  const step = play.steps[p.playStep];
  const fromStart = p.playStartedAt.getTime() + step.day * DAY;
  if (p.playStep === 0 || !p.lastTouchAt) return new Date(fromStart);
  const gap = (step.day - play.steps[p.playStep - 1].day) * DAY;
  return new Date(Math.max(fromStart, p.lastTouchAt.getTime() + gap));
}

const STOPS: Record<string, string> = {
  interested: "They're interested: take it from here",
  call_back: "They asked for a call back",
  demo_sent: "They asked for details",
  meeting_booked: "Meeting booked",
  replied: "They replied",
  met: "Met in person",
  not_interested: "Not interested",
  do_not_contact: "Asked not to be contacted",
  wrong_number: "Wrong number",
};

/**
 * What a touch does to the play. A reply or a no stops it (a person takes
 * over); doing the current step's channel moves to the next step; finishing
 * every step without a reply parks the prospect for later.
 */
export function advancePlay(p: PlayState, touch: { channel: string; outcome: string; playStep?: number | null }, now: Date) {
  const play = playFor(p.play);
  if (!play || !p.playStartedAt || touch.channel === "note") return null;
  const stop = STOPS[touch.outcome];
  if (stop) return { playEndedReason: stop, ended: true as const };
  const current = play.steps[p.playStep];
  if (!current) return null;
  const doesStep = touch.playStep === p.playStep || (touch.playStep == null && touch.channel === current.channel);
  if (!doesStep) return null;
  const nextStep = p.playStep + 1;
  if (nextStep >= play.steps.length) {
    return { playStep: nextStep, playEndedReason: "Play finished without a reply", ended: true as const, finished: true as const };
  }
  const due = stepDue({ ...p, playStep: nextStep, lastTouchAt: now });
  return { playStep: nextStep, nextFollowUpAt: due ?? now, ended: false as const };
}

// --- Message variants: Thompson sampling, repeatable per prospect and step ---------------

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A Beta(a, b) draw from two Gamma draws (Marsaglia–Tsang). */
function betaSample(a: number, b: number, rand: () => number) {
  const gamma = (k: number): number => {
    if (k < 1) return gamma(k + 1) * Math.pow(rand(), 1 / k);
    const d = k - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x: number;
      let v: number;
      do {
        const u1 = rand() || 1e-12;
        const u2 = rand();
        x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = rand();
      if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  };
  const x = gamma(a);
  return x / (x + gamma(b));
}

/**
 * Picks the message variant for a step: each variant's reply record is a Beta
 * belief, one draw each, highest wins. Variants that work get sent more, but a
 * new one still gets tried. Seeded, so a page reload shows the same draft.
 */
export function pickVariant(play: Play, stepIndex: number, stats: Map<string, { trials: number; successes: number }>, seed: string) {
  const step = play.steps[stepIndex];
  if (!step || step.variants.length === 1) return step?.variants[0];
  const rand = rng(hash(`${seed}:${play.id}:${stepIndex}`));
  let best = step.variants[0];
  let bestDraw = -1;
  for (const v of step.variants) {
    const s = stats.get(`${play.id}:${stepIndex}:${v.id}`) ?? { trials: 0, successes: 0 };
    const draw = betaSample(1 + s.successes, 1 + Math.max(0, s.trials - s.successes), rand);
    if (draw > bestDraw) {
      bestDraw = draw;
      best = v;
    }
  }
  return best;
}

/** Fills a step's text with what we know; a gap stays visible so it's never sent half-written. */
export function draftText(text: string, values: { contact?: string | null; org: string; owner: string; segment: SegmentId; reason?: string | null; asset?: string | null; area?: string | null }) {
  const brand = segmentFor(values.segment).brand;
  const contact = values.contact?.trim() || (values.segment === "school" ? "Principal" : "Sir/Madam");
  const map: Record<string, string> = {
    contact,
    org: values.org,
    owner: values.owner,
    brand,
    reason: values.reason?.trim() || "[add the reason]",
    asset: values.asset?.trim() || "[link to their report]",
    area: values.area?.trim() || "your area",
  };
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => map[key] ?? whole);
}

// --- Learning -------------------------------------------------------------------------
//
// Every learning run rebuilds the statistics from the raw history, so a fix
// to old data (a corrected outcome, a deleted signal) is reflected next night.

/** Outcomes that mean the reason worked: they engaged. */
export const POSITIVE_OUTCOMES = new Set(["interested", "call_back", "demo_sent", "meeting_booked", "replied", "met"]);

export type LearnInput = {
  prospects: { id: string; kind: string; area: string | null; status: string; fit: number | null; won: boolean }[];
  signals: { id: string; prospectId: string; type: string; observedAt: Date; expiresAt: Date | null }[];
  touches: { prospectId: string; channel: string; outcome: string; occurredAt: Date; signalId: string | null; play: string | null; playStep: number | null; variant: string | null }[];
  feedback: { prospectId: string; signalId: string | null; kind: string }[];
};

export type StatRow = { segment: SegmentId; dimension: string; key: string; trials: number; successes: number; meetings: number; wins: number; weight: number };

/** The posterior mean of a rate: the prior counts as `strength` imaginary tries. */
export function posteriorRate(prior: number, successes: number, trials: number, strength = 4) {
  return (prior * strength + successes) / (strength + trials);
}

const AREA_KEYS = Object.keys(AREA_CENTRES).sort((a, b) => b.length - a.length);
function areaKey(area: string | null) {
  if (!area) return "not set";
  const a = area.toLowerCase();
  return AREA_KEYS.find((k) => a.includes(k)) ?? a.split(/[(,]/)[0].trim().slice(0, 40);
}

const fitBand = (fit: number | null) => (fit === null ? "unknown" : fit >= 0.75 ? "high" : fit >= 0.5 ? "mid" : "low");

function istHour(d: Date) {
  return new Date(d.getTime() + IST_OFFSET).getUTCHours();
}

export function learn(input: LearnInput): StatRow[] {
  const rows = new Map<string, StatRow>();
  const bump = (segment: SegmentId, dimension: string, key: string, trial: number, success: number, extra: { meeting?: boolean; won?: boolean } = {}) => {
    const id = `${segment}|${dimension}|${key}`;
    const r = rows.get(id) ?? { segment, dimension, key, trials: 0, successes: 0, meetings: 0, wins: 0, weight: 0 };
    r.trials += trial;
    r.successes += success;
    if (extra.meeting) r.meetings++;
    if (extra.won) r.wins++;
    rows.set(id, r);
  };

  const byProspect = new Map<string, LearnInput["touches"]>();
  for (const t of input.touches) {
    if (t.channel === "note") continue;
    const list = byProspect.get(t.prospectId) ?? [];
    list.push(t);
    byProspect.set(t.prospectId, list);
  }
  const signalsBy = new Map<string, LearnInput["signals"]>();
  for (const s of input.signals) signalsBy.set(s.prospectId, [...(signalsBy.get(s.prospectId) ?? []), s]);
  const signalById = new Map(input.signals.map((s) => [s.id, s]));
  const segmentOfProspect = new Map<string, SegmentId>();

  for (const p of input.prospects) {
    const segment = (p.kind === "school" || p.kind === "ca_firm" ? p.kind : "business") as SegmentId;
    segmentOfProspect.set(p.id, segment);
    const touches = (byProspect.get(p.id) ?? []).sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
    if (touches.length === 0) continue;
    const engaged = touches.some((t) => POSITIVE_OUTCOMES.has(t.outcome)) || ["meeting", "lead", "partner"].includes(p.status);
    const meeting = touches.some((t) => t.outcome === "meeting_booked" || t.outcome === "met") || ["meeting", "lead", "partner"].includes(p.status);
    const won = p.won;
    const success = engaged ? 1 : 0;
    const extra = { meeting, won };

    bump(segment, "segment", "all", 1, success, extra);
    bump(segment, "area", areaKey(p.area), 1, success, extra);
    bump(segment, "fit_band", fitBand(p.fit), 1, success, extra);

    // Signals true when we first reached out; the one we led with gets full credit.
    const first = touches[0].occurredAt;
    const active = (signalsBy.get(p.id) ?? []).filter((s) => s.observedAt.getTime() <= first.getTime() + DAY && (!s.expiresAt || s.expiresAt.getTime() >= first.getTime()));
    const led = touches.find((t) => t.signalId && signalById.has(t.signalId))?.signalId ?? null;
    if (active.length === 0) bump(segment, "signal", "none", 1, success, extra);
    const seen = new Set<string>();
    for (const s of active) {
      const share = led ? (s.id === led ? 1 : 0.5) : 1;
      const key = s.type;
      if (seen.has(key)) continue; // two signals of one type count once
      seen.add(key);
      bump(segment, "signal", key, share, success * share, extra);
    }

    for (const t of touches) {
      const reached = outcomeFor(t.outcome)?.reached ? 1 : 0;
      bump(segment, "channel", t.channel, 1, reached);
      if (t.play && t.playStep !== null) {
        bump(segment, "step", `${t.play}:${t.playStep}`, 1, reached);
        if (t.variant) bump(segment, "variant", `${t.play}:${t.playStep}:${t.variant}`, 1, reached);
      }
      if (t.channel === "call") bump(segment, "hour", String(istHour(t.occurredAt)).padStart(2, "0"), 1, reached);
    }
  }

  // Feedback is evidence too, worth half a try.
  for (const f of input.feedback) {
    const segment = segmentOfProspect.get(f.prospectId);
    if (!segment) continue;
    const signal = f.signalId ? signalById.get(f.signalId) : null;
    const type = signal?.type ?? (signalsBy.get(f.prospectId) ?? [])[0]?.type;
    if (!type) continue;
    if (f.kind === "reason_relevant" || f.kind === "great_lead") bump(segment, "signal", type, 0.5, 0.5);
    if (f.kind === "reason_wrong" || f.kind === "signal_stale") bump(segment, "signal", type, 0.5, 0);
  }

  // Weights: a signal starts from its catalogue prior; everything else from the segment's own rate.
  const baseline = new Map<SegmentId, number>();
  for (const r of rows.values()) if (r.dimension === "segment") baseline.set(r.segment, posteriorRate(0.25, r.successes, r.trials));
  for (const r of rows.values()) {
    const prior = r.dimension === "signal" ? (signalType(r.key)?.prior ?? 0.2) : r.dimension === "segment" ? 0.25 : r.dimension === "channel" || r.dimension === "step" || r.dimension === "variant" || r.dimension === "hour" ? 0.3 : (baseline.get(r.segment) ?? 0.25);
    r.weight = round(posteriorRate(prior, r.successes, r.trials));
  }
  return [...rows.values()];
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Plain-language lessons from the statistics, only where there's enough evidence to say so. */
export function insightsFrom(rows: StatRow[], gaps: { segment: SegmentId; warmWithoutDecisionMaker: number; withoutFacts: number; onPlay: number }[]) {
  const out: string[] = [];
  const touched = rows.filter((r) => r.dimension === "segment");
  if (touched.length === 0) out.push("No outcomes logged yet, so the engine is still running on its starting beliefs. Log every touch, even a no-answer, and it starts learning tonight.");
  for (const seg of touched) {
    const label = segmentFor(seg.segment).label;
    const base = seg.trials ? seg.successes / seg.trials : 0;
    out.push(`${label}: ${Math.round(seg.successes)} of ${Math.round(seg.trials)} contacted engaged (${pct(base)}), ${seg.meetings} meetings, ${seg.wins} won.`);
    const sigs = rows.filter((r) => r.segment === seg.segment && r.dimension === "signal" && r.trials >= 3 && r.key !== "none");
    for (const s of sigs) {
      const rate = s.successes / s.trials;
      const label2 = signalType(s.key)?.label ?? s.key;
      if (base > 0 && rate >= base * 1.5) out.push(`${label}: "${label2}" engages ${pct(rate)} (${(rate / base).toFixed(1)}× average, ${Math.round(s.trials)} tries). Hunt more of these.`);
      else if (s.trials >= 5 && rate <= base * 0.5) out.push(`${label}: "${label2}" engages only ${pct(rate)} over ${Math.round(s.trials)} tries. Stop leading with it.`);
    }
    const channels = rows.filter((r) => r.segment === seg.segment && r.dimension === "channel" && r.trials >= 5).sort((a, b) => b.successes / b.trials - a.successes / a.trials);
    if (channels.length >= 2) out.push(`${label}: ${channels[0].key} reaches people ${pct(channels[0].successes / channels[0].trials)} of the time, ${channels.at(-1)!.key} ${pct(channels.at(-1)!.successes / channels.at(-1)!.trials)}.`);
    const hours = rows.filter((r) => r.segment === seg.segment && r.dimension === "hour" && r.trials >= 5).sort((a, b) => b.successes / b.trials - a.successes / a.trials);
    if (hours.length >= 2) out.push(`${label}: calls at ${hours[0].key}:00 connect best (${pct(hours[0].successes / hours[0].trials)}).`);
    const variants = rows.filter((r) => r.segment === seg.segment && r.dimension === "variant" && r.trials >= 5);
    const bySteps = new Map<string, StatRow[]>();
    for (const v of variants) {
      const step = v.key.split(":").slice(0, 2).join(":");
      bySteps.set(step, [...(bySteps.get(step) ?? []), v]);
    }
    for (const [step, vs] of bySteps) {
      if (vs.length < 2) continue;
      vs.sort((a, b) => b.successes / b.trials - a.successes / a.trials);
      out.push(`${label}: for ${step}, variant "${vs[0].key.split(":")[2]}" gets ${pct(vs[0].successes / vs[0].trials)} replies vs ${pct(vs[1].successes / vs[1].trials)}. The engine now sends it more often.`);
    }
  }
  for (const g of gaps) {
    const label = segmentFor(g.segment).label;
    if (g.warmWithoutDecisionMaker > 0) out.push(`${label}: ${g.warmWithoutDecisionMaker} warm leads have no decision maker named yet. Finding them is the fastest way to raise their scores.`);
    if (g.withoutFacts > 0) out.push(`${label}: ${g.withoutFacts} prospects have no fit facts, so their fit is a guess.`);
  }
  return out;
}
