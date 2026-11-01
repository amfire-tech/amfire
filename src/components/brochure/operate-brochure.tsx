"use client";

import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState, useTransition } from "react";
import { submitBrochureWish } from "@/app/actions/brochure";
import { contact } from "@/config/site";
import { OPERATE, OPERATE_MONTH, sumCosts, type BrochureIcon, type MonthEvent, type OperateCell } from "@/knowledge/brochures";
import { SERVICE_DETAILS } from "@/knowledge/catalog";
import { DEMO_OFFER, STARTING_PRICE, type Priced } from "@/knowledge/pricing";
import { track } from "@/lib/analytics";
import type { MonthlyOffer } from "@/server/brochures";
import { ForCurrency, Money, useCurrency } from "../currency";
import { GiftIcon } from "../demo-offer";
import { Container, buttonClass, cx } from "../ui";
import { Flame } from "./art";
import { Icon } from "./icons";
import { ServiceArt } from "./operate-art";
import { CountUp, Eyebrow, LaunchSlots, RealWork, Reveal, Tracked } from "./parts";

// The Operate brochure. A monthly plan is easiest to judge by what turns up
// each month, so instead of a cart it shows the six services with what each
// includes, plays one example month day by day, prices the team you would
// otherwise hire, and unlocks free builds on a 3-month plan.

const plan = "operate";

const KINDS: Record<MonthEvent["kind"], { icon: BrochureIcon; label: string; tone: string; dot: string }> = {
  post: {
    icon: "image",
    label: "Post",
    tone: "bg-signal text-white",
    dot: "bg-signal",
  },
  design: {
    icon: "design",
    label: "Poster or banner",
    tone: "bg-flame text-ink",
    dot: "bg-flame",
  },
  feature: {
    icon: "code",
    label: "Feature shipped",
    tone: "bg-ink text-white",
    dot: "bg-ink",
  },
  tool: {
    icon: "spark",
    label: "Tool added",
    tone: "bg-[#2563eb] text-white",
    dot: "bg-[#2563eb]",
  },
  care: {
    icon: "shield",
    label: "Health check",
    tone: "bg-success text-white",
    dot: "bg-success",
  },
  call: {
    icon: "phone",
    label: "Planning call",
    tone: "bg-[#5a5a5a] text-white",
    dot: "bg-[#5a5a5a]",
  },
  report: {
    icon: "doc",
    label: "Monthly report",
    tone: "bg-[#5a5a5a] text-white",
    dot: "bg-[#5a5a5a]",
  },
};

const TALLIES: { kind: MonthEvent["kind"]; label: string }[] = [
  { kind: "post", label: "Posts live" },
  { kind: "design", label: "Posters & banners" },
  { kind: "feature", label: "Features shipped" },
  { kind: "tool", label: "Tools added" },
  { kind: "care", label: "Health checks" },
];

const DAYS = OPERATE_MONTH.length;

function PerMonth({ className }: { className?: string }) {
  return <span className={cx("font-normal opacity-60", className)}>/month</span>;
}

function Cross({ className }: { className?: string }) {
  return (
    <svg aria-label="Not included" role="img" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M7 7l10 10M17 7 7 17" />
    </svg>
  );
}

function Cell({ value, ours }: { value: OperateCell; ours: boolean }) {
  if (value === true) return <Icon name="check" className={cx("mx-auto size-5", ours ? "text-signal" : "text-muted")} />;
  if (value === false) return <Cross className="mx-auto size-4 text-muted/60" />;
  return <span className={cx("text-xs sm:text-sm", ours ? "font-semibold" : "text-muted")}>{value}</span>;
}

/** One example month, played day by day, with running totals. */
function MonthPlayer() {
  const reduce = useReducedMotion();
  const [day, setDay] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const running = playing && day < DAYS;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setDay((d) => Math.min(d + 1, DAYS)), 220);
    return () => clearInterval(t);
  }, [running]);

  const start = () => {
    setPicked(null);
    if (reduce) {
      setDay(DAYS);
      return;
    }
    setDay(0);
    setPlaying(true);
    track("brochure_month_play", { plan });
  };

  const played = OPERATE_MONTH.slice(0, day).flat();
  const count = (kind: MonthEvent["kind"]) => played.filter((e) => e.kind === kind).length;
  const shownDay = picked ?? Math.max(day, 1);
  const shownEvents = day >= shownDay ? OPERATE_MONTH[shownDay - 1] : [];

  return (
    <motion.div onViewportEnter={() => day === 0 && !playing && start()} viewport={{ once: true, amount: 0.4 }} className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
      <div className="rounded-[1.75rem] bg-surface p-3 ring-1 ring-line sm:p-5">
        <div className="flex items-center justify-between gap-3 px-1 pb-3">
          <p className="font-semibold">
            Day <span className="tabular-nums">{Math.max(day, 1)}</span> of {DAYS}
          </p>
          <button type="button" onClick={() => (running ? setPlaying(false) : day >= DAYS || day === 0 ? start() : setPlaying(true))} className={buttonClass("secondary", "sm")}>
            {running ? "Pause" : day >= DAYS ? "↻ Play again" : "▶ Play"}
          </button>
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-subtle">
          <div className="bg-brand h-full rounded-full transition-[width] duration-200" style={{ width: `${(day / DAYS) * 100}%` }} />
        </div>
        <ol className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {OPERATE_MONTH.map((events, i) => {
            const n = i + 1;
            const done = n <= day;
            return (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    setDay((d) => Math.max(d, n));
                    setPicked(n);
                  }}
                  aria-label={`Day ${n}: ${events.map((e) => e.label).join(", ")}`}
                  className={cx(
                    "flex aspect-square w-full flex-col rounded-xl p-1.5 text-left transition duration-300 sm:p-2",
                    done ? "bg-subtle" : "bg-subtle/40 opacity-40",
                    shownDay === n && done && "ring-2 ring-signal",
                  )}
                >
                  <span className="text-[11px] font-semibold tabular-nums sm:text-xs">{n}</span>
                  <span className="mt-auto flex flex-wrap gap-0.5 sm:gap-1">
                    {done &&
                      events.map((e, k) => (
                        <motion.span key={k} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
                          <span className={cx("block size-2 rounded-full sm:hidden", KINDS[e.kind].dot)} />
                          <span className={cx("hidden size-5 place-items-center rounded-full sm:grid", KINDS[e.kind].tone)}>
                            <Icon name={KINDS[e.kind].icon} className="size-3" />
                          </span>
                        </motion.span>
                      ))}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 px-1 text-xs text-muted">
          {(Object.keys(KINDS) as MonthEvent["kind"][]).map((k) => (
            <li key={k} className="flex items-center gap-1.5">
              <span className={cx("size-2.5 rounded-full", KINDS[k].dot)} />
              {KINDS[k].label}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-[1.75rem] bg-ink p-5 text-white sm:p-6">
          <Eyebrow light>Done so far this month</Eyebrow>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-2">
            {TALLIES.map((t) => (
              <div key={t.kind}>
                <dt className="text-xs text-white/60">{t.label}</dt>
                <dd className={cx("text-4xl font-semibold tabular-nums", t.kind === "post" || t.kind === "design" ? "text-flame" : "text-white")}>{count(t.kind)}</dd>
              </div>
            ))}
            <div>
              <dt className="text-xs text-white/60">Enquiries answered</dt>
              <dd className="mt-1 flex items-center gap-1.5 text-lg font-semibold">
                <Icon name="check" className="size-5 text-[#22c55e]" />
                Every one
              </dd>
            </div>
          </dl>
        </div>
        <div className="min-h-36 flex-1 rounded-[1.75rem] bg-surface p-5 ring-1 ring-line" aria-live="polite">
          <p className="text-sm font-semibold text-muted">Day {shownDay}</p>
          <ul className="mt-3 space-y-2">
            {shownEvents.map((e, k) => (
              <motion.li key={`${shownDay}-${k}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
                <span className={cx("grid size-8 shrink-0 place-items-center rounded-full", KINDS[e.kind].tone)}>
                  <Icon name={KINDS[e.kind].icon} className="size-4" />
                </span>
                <span className="text-sm font-medium">{e.label}</span>
              </motion.li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">Tap any day to see what happened. An example month — your features and tools follow what you ask for.</p>
        </div>
      </div>
    </motion.div>
  );
}

export function OperateBrochure({ name, offer }: { name: string; offer: MonthlyOffer }) {
  const router = useRouter();
  const currency = useCurrency();
  const price = STARTING_PRICE.operate;
  const offerPrice: Priced = {
    INR: price.INR - DEMO_OFFER.amount.INR,
    USD: price.USD - DEMO_OFFER.amount.USD,
  };

  // The team they'd otherwise hire; readers can untick roles they wouldn't.
  const [hired, setHired] = useState<Set<string>>(() => new Set(OPERATE.roles.map((r) => r.id)));
  const fullTeam = sumCosts(OPERATE.roles);
  const team = sumCosts(OPERATE.roles.filter((r) => hired.has(r.id)));
  const saving: Priced = {
    INR: Math.max(0, team.INR - price.INR),
    USD: Math.max(0, team.USD - price.USD),
  };
  const yearly: Priced = { INR: saving.INR * 12, USD: saving.USD * 12 };
  const cheaper = team[currency] > price[currency];

  const [threeMonths, setThreeMonths] = useState(false);

  const [wishes, setWishes] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const book = () =>
    startTransition(async () => {
      track("brochure_book", { plan, wishes: wishes.length });
      await submitBrochureWish(plan, {
        wishes,
        note: note.trim() || undefined,
      });
      router.push(`/start?goal=${SERVICE_DETAILS.operate.goal}`);
    });

  return (
    <div className="overflow-x-clip">
      {/* 1 · Cover */}
      <Tracked step="cover" plan={plan} className="relative overflow-hidden bg-ink text-white">
        <div aria-hidden className="bg-brand absolute top-1/4 left-1/2 size-[34rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl" />
        <Container className="relative flex min-h-[calc(100svh-6.5rem)] flex-col items-center justify-center py-14 text-center">
          <Reveal>
            <Flame className="mx-auto h-24 w-auto sm:h-32" />
          </Reveal>
          <Reveal delay={0.1}>
            <Eyebrow light>
              Hi {name} · <span className="normal-case">amfire</span> Operate
            </Eyebrow>
          </Reveal>
          <Reveal delay={0.2}>
            <h1 className="mt-4 max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
              {OPERATE.hook}
              <br />
              <span className="text-brand">
                <Money amounts={price} /> a month.
              </span>
            </h1>
          </Reveal>
          <Reveal delay={0.3}>
            <p className="mx-auto mt-5 max-w-xl text-white/70 sm:text-lg">{OPERATE.promise}</p>
          </Reveal>
          <ul className="mt-10 grid w-full max-w-4xl grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {OPERATE.services.map((s, i) => (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                className="rounded-2xl bg-white/5 px-3 py-3 ring-1 ring-white/10"
              >
                <p className="text-2xl font-semibold text-flame">{s.stat}</p>
                <p className="text-xs text-white/70">{s.statLabel}</p>
              </motion.li>
            ))}
          </ul>
          <motion.div aria-hidden className="mt-10 text-white/50" animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>
            <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M6 13l6 6 6-6" />
            </svg>
          </motion.div>
        </Container>
      </Tracked>

      {/* 2 · The six services */}
      <Tracked step="services" plan={plan}>
        <Container className="py-14 sm:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow>Every month, for one fee</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">Six jobs, done for you. Every month.</h2>
            <p className="mt-3 text-muted">Exactly what you get — no vague &ldquo;digital marketing&rdquo;.</p>
          </Reveal>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {OPERATE.services.map((s, i) => (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: (i % 3) * 0.08 }}
                className="flex flex-col overflow-hidden rounded-[1.5rem] bg-surface ring-1 ring-line"
              >
                <ServiceArt id={s.id} />
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <p className="flex items-baseline gap-2">
                    <span className="text-brand text-4xl font-bold">{s.stat}</span>
                    <span className="text-sm font-medium text-muted">{s.statLabel}</span>
                  </p>
                  <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted">{s.line}</p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {s.includes.map((x) => (
                      <li key={x} className="flex gap-2">
                        <Icon name="check" className="mt-0.5 size-4 shrink-0 text-signal" />
                        {x}
                      </li>
                    ))}
                  </ul>
                  {"note" in s && s.note && <p className="mt-auto pt-4 text-xs font-medium text-signal">{s.note}</p>}
                </div>
              </motion.li>
            ))}
          </ul>
          <Reveal className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <span className="mr-1 text-sm font-semibold text-muted">Also in the plan:</span>
            {OPERATE.alsoIncluded.map((a) => (
              <span key={a.title} className="inline-flex items-center gap-1.5 rounded-full bg-subtle px-3 py-1.5 text-sm">
                <Icon name={a.icon} className="size-4 text-signal" />
                {a.title}
              </span>
            ))}
          </Reveal>
        </Container>
      </Tracked>

      {/* 3 · One month, played */}
      <Tracked step="month" plan={plan} className="bg-subtle">
        <Container className="py-14 sm:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow>See it happen</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">Watch one month with amfire.</h2>
            <p className="mt-3 text-muted">Thirty days, played in seconds. Watch the work add up.</p>
          </Reveal>
          <MonthPlayer />
        </Container>
      </Tracked>

      {/* 4 · The team you'd otherwise hire */}
      <Tracked step="team" plan={plan} className="relative overflow-hidden bg-ink text-white">
        <div aria-hidden className="bg-brand absolute -top-32 -left-24 size-96 rounded-full opacity-15 blur-3xl" />
        <Container className="relative grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <Reveal>
              <Eyebrow light>Do the maths</Eyebrow>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">To get all this, you&apos;d hire five people.</h2>
              <p className="mt-3 text-white/70">Untick anyone you wouldn&apos;t hire — and see what&apos;s left.</p>
            </Reveal>
            <ul className="mt-8 space-y-2">
              {OPERATE.roles.map((r) => {
                const on = hired.has(r.id);
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setHired((h) => {
                          const next = new Set(h);
                          if (on) next.delete(r.id);
                          else next.add(r.id);
                          return next;
                        })
                      }
                      className={cx("flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 transition sm:p-4", on ? "bg-white/10 ring-white/20" : "bg-transparent ring-white/10")}
                    >
                      <span className={cx("grid size-6 shrink-0 place-items-center rounded-md ring-1 transition", on ? "bg-brand text-ink ring-transparent" : "ring-white/30")}>
                        {on && <Icon name="check" className="size-4" />}
                      </span>
                      <span className={cx("grid size-10 shrink-0 place-items-center rounded-xl bg-white/10", !on && "opacity-40")}>
                        <Icon name={r.icon} className="size-5 text-flame" />
                      </span>
                      <span className={cx("min-w-0 flex-1", !on && "opacity-40")}>
                        <span className="block font-semibold">{r.title}</span>
                        <span className="block text-xs text-white/60">{r.does}</span>
                      </span>
                      <span className={cx("shrink-0 text-right text-sm font-semibold tabular-nums", !on && "line-through opacity-40")}>
                        <Money amounts={r.cost} />
                        <PerMonth className="text-xs" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <Reveal className="rounded-[1.75rem] bg-white/5 p-6 ring-1 ring-white/10 sm:p-8">
            <p className="text-sm text-white/60">Hiring them would cost</p>
            <p className="mt-1 text-4xl font-semibold sm:text-5xl">
              <CountUp amounts={team} />
              <PerMonth className="text-lg" />
            </p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white/50 transition-[width] duration-700"
                style={{
                  width: `${(team[currency] / fullTeam[currency]) * 100}%`,
                }}
              />
            </div>
            <p className="mt-6 text-sm text-white/60">
              <span className="normal-case">amfire</span> does all of it for
            </p>
            <p className="mt-1 text-4xl font-semibold sm:text-5xl">
              <span className="text-brand">
                <Money amounts={price} />
              </span>
              <PerMonth className="text-lg" />
            </p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="bg-brand h-full rounded-full"
                style={{
                  width: `${(price[currency] / fullTeam[currency]) * 100}%`,
                }}
              />
            </div>
            <div className="mt-8 rounded-2xl bg-white/5 p-4">
              {cheaper ? (
                <>
                  <p className="text-sm text-white/70">You save</p>
                  <p className="text-3xl font-semibold text-flame">
                    <CountUp amounts={saving} />
                    <PerMonth className="text-base text-white" />
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    That&apos;s <CountUp amounts={yearly} className="font-semibold text-white" /> a year — and no hiring, leave or laptops to manage.
                  </p>
                </>
              ) : (
                <p className="text-sm text-white/80">Even with just that one hire, amfire covers all six jobs for about the same money.</p>
              )}
            </div>
            <p className="mt-4 text-xs text-white/40">
              <ForCurrency currency="INR">Typical Pune salaries in 2026, before PF, software and office costs.</ForCurrency>
              <ForCurrency currency="USD">Typical freelance rates in 2026.</ForCurrency>
            </p>
          </Reveal>
        </Container>
      </Tracked>

      {/* 5 · Same money, three choices */}
      <Tracked step="compare" plan={plan}>
        <Container className="py-14 sm:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow>Same money · three choices</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
              What <Money amounts={price} /> a month gets you.
            </h2>
          </Reveal>
          <Reveal className="mx-auto mt-10 max-w-4xl">
            <table className="w-full table-fixed border-separate border-spacing-0">
              <colgroup>
                <col className="w-[34%] sm:w-[40%]" />
                <col />
                <col />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" className="sr-only">
                    What you get
                  </th>
                  {OPERATE.compareColumns.map((c, i) => (
                    <th key={c} scope="col" className={cx("px-1 py-3 text-center text-xs font-semibold sm:text-sm", i === 0 ? "rounded-t-2xl bg-ink text-white" : "align-bottom text-muted")}>
                      {i === 0 ? <span className="text-flame">{c}</span> : c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {OPERATE.compare.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="border-t border-line py-3 pr-2 text-left text-xs font-medium sm:text-sm">
                      {row.label}
                    </th>
                    {row.cells.map((v, i) => (
                      <td key={i} className={cx("border-t px-1 py-3 text-center", i === 0 ? "border-signal/15 bg-signal/5" : "border-line")}>
                        <Cell value={v} ours={i === 0} />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th scope="row" className="border-t border-line py-4 pr-2 text-left text-xs font-semibold sm:text-sm">
                    Price
                  </th>
                  <td className="rounded-b-2xl border-t border-signal/15 bg-signal/5 px-1 py-4 text-center text-sm font-semibold sm:text-base">
                    <Money amounts={price} />
                    <PerMonth className="block text-xs sm:inline" />
                  </td>
                  <td className="border-t border-line px-1 py-4 text-center text-xs text-muted sm:text-sm">
                    <Money amounts={price} />
                    <PerMonth className="block text-xs sm:inline" />
                  </td>
                  <td className="border-t border-line px-1 py-4 text-center text-xs text-muted sm:text-sm">Per job</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-4 text-center text-xs text-muted">Based on typical 2026 agency and freelancer quotes in India at this budget.</p>
          </Reveal>
        </Container>
      </Tracked>

      {/* 6 · Free builds on a 3-month plan */}
      <Tracked step="builds" plan={plan} className="bg-subtle">
        <Container className="py-14 sm:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow>The 3-month bonus</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">Stay 3 months. New builds are on us.</h2>
            <p className="mt-3 text-muted">
              New software, apps and automations normally start at <Money amounts={STARTING_PRICE.build} /> each. On a 3-month plan, they come with your monthly fee.
            </p>
          </Reveal>
          <Reveal className="relative mx-auto mt-10 max-w-3xl overflow-hidden rounded-[1.75rem] bg-ink p-5 text-white sm:p-8">
            <div aria-hidden className="bg-brand absolute -right-20 -bottom-24 size-72 rounded-full opacity-20 blur-3xl" />
            <div className="relative">
              <div role="radiogroup" aria-label="Plan length" className="mx-auto flex w-fit rounded-full bg-white/10 p-1">
                {[
                  { on: false, label: "Month to month" },
                  { on: true, label: "3-month plan" },
                ].map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    role="radio"
                    aria-checked={threeMonths === o.on}
                    onClick={() => {
                      setThreeMonths(o.on);
                      if (o.on) track("brochure_three_months", { plan });
                    }}
                    className="relative rounded-full px-4 py-2 text-sm font-semibold sm:px-6"
                  >
                    {threeMonths === o.on && <motion.span layoutId="plan-length" className="bg-brand absolute inset-0 rounded-full" />}
                    <span className={cx("relative", threeMonths === o.on ? "text-ink" : "text-white/80")}>{o.label}</span>
                  </button>
                ))}
              </div>
              {!threeMonths && <p className="mt-2 text-center text-xs text-flame">Tap &ldquo;3-month plan&rdquo; and watch what unlocks</p>}

              <p className="mt-6 text-center text-4xl font-semibold">
                <Money amounts={price} />
                <PerMonth className="text-lg" />
              </p>
              <p className="text-center text-sm text-white/60">The same price either way</p>

              <ul className="mx-auto mt-6 max-w-md space-y-2 text-sm">
                <li className="flex gap-2">
                  <Icon name="check" className="size-5 shrink-0 text-flame" />
                  All six services, every month
                </li>
                <li className="flex gap-2">
                  <Icon name="check" className="size-5 shrink-0 text-flame" />
                  {threeMonths ? "3 months to start, then month to month" : "Cancel any time with 30 days' notice"}
                </li>
                <li className={cx("flex gap-2 transition", !threeMonths && "opacity-50")}>
                  <Icon name={threeMonths ? "check" : "lock"} className={cx("size-5 shrink-0", threeMonths ? "text-flame" : "text-white/60")} />
                  <span className={cx(threeMonths && "font-semibold")}>New builds and automations included</span>
                </li>
              </ul>

              <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {OPERATE.builds.map((b, i) => (
                  <motion.li
                    key={b.title}
                    animate={threeMonths ? { opacity: 1, scale: [0.92, 1.04, 1] } : { opacity: 0.45, scale: 1 }}
                    transition={{
                      delay: threeMonths ? i * 0.07 : 0,
                      duration: 0.4,
                    }}
                    className={cx(
                      "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ring-1 transition-colors duration-500",
                      threeMonths ? "bg-brand text-ink ring-transparent" : "bg-white/5 ring-white/10",
                    )}
                  >
                    <Icon name={threeMonths ? b.icon : "lock"} className="size-4 shrink-0" />
                    {b.title}
                  </motion.li>
                ))}
              </ul>
              <p className="mt-5 text-center text-xs text-white/50">{OPERATE.buildsNote}</p>
            </div>
          </Reveal>
        </Container>
      </Tracked>

      {/* 7 · The price */}
      <Tracked step="price" plan={plan} className="relative overflow-hidden bg-ink text-white">
        <div aria-hidden className="bg-brand absolute -top-24 right-0 size-96 rounded-full opacity-20 blur-3xl" />
        <Container className="relative py-16 text-center sm:py-24">
          <Reveal>
            <Eyebrow light>Your whole digital team</Eyebrow>
            <p className="mt-4 text-sm text-white/60">Hiring the team would cost</p>
            <p className="mt-1 text-5xl font-semibold tracking-tight text-white/40 sm:text-7xl">
              <span className="line-through decoration-signal decoration-4">
                <Money amounts={fullTeam} />
              </span>
              <PerMonth className="text-2xl" />
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 text-sm text-white/60">With amfire, you pay</p>
            <p className="mt-1 text-6xl font-semibold tracking-tight sm:text-8xl">
              <span className="text-brand">
                <Money amounts={price} />
              </span>
              <PerMonth className="text-2xl text-white sm:text-3xl" />
            </p>
          </Reveal>
          <Reveal delay={0.35}>
            <p className="bg-brand shine mx-auto mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 font-semibold text-ink">
              <GiftIcon />
              <span>
                Only <Money amounts={offerPrice} /> for your first month with the free-demo offer
              </span>
            </p>
            <p className="mt-6 text-sm text-white/70">
              Want reels and videos too?{" "}
              <a
                href={contact.whatsapp("Hi amfire, I'm reading the Operate brochure and want to talk about reels and videos.")}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-flame underline-offset-4 hover:underline"
              >
                Let&apos;s talk on WhatsApp →
              </a>
            </p>
            <p className="mt-3 text-xs text-white/40">
              <ForCurrency currency="INR">GST extra as applicable.</ForCurrency>
              <ForCurrency currency="USD">Taxes extra where applicable.</ForCurrency>
            </p>
          </Reveal>
        </Container>
      </Tracked>

      {/* 8 · How a month runs + promises */}
      <Tracked step="method" plan={plan} className="bg-subtle">
        <Container className="py-14 sm:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">Every month runs the same way.</h2>
            <p className="mt-3 text-muted">It starts with a free review of what you have today. Then:</p>
          </Reveal>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {OPERATE.month.map((m, i) => (
              <motion.li
                key={m.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="relative flex flex-col items-center rounded-card bg-surface p-5 text-center ring-1 ring-line"
              >
                <span className="bg-brand grid size-12 place-items-center rounded-full text-lg font-bold text-ink">{i + 1}</span>
                <p className="mt-3 text-xs font-semibold tracking-widest text-signal uppercase">{m.when}</p>
                <p className="mt-1 text-lg font-semibold">{m.title}</p>
                <p className="mt-1 text-sm text-muted">{m.body}</p>
              </motion.li>
            ))}
          </ol>

          <Reveal className="mt-16 text-center">
            <Eyebrow>In writing, every time</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Our {OPERATE.promises.length} promises</h2>
          </Reveal>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {OPERATE.promises.map((p, i) => (
              <motion.li
                key={p.title}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="flex flex-col items-center gap-3 rounded-card bg-ink p-4 text-center text-white"
              >
                <span className="bg-brand grid size-11 place-items-center rounded-full text-ink">
                  <Icon name={p.icon} className="size-5" />
                </span>
                <p className="text-sm font-medium">{p.title}</p>
              </motion.li>
            ))}
          </ul>
        </Container>
      </Tracked>

      {/* 9 · Real work */}
      <RealWork plan={plan} />

      {/* 10 · What first? */}
      <Tracked step="mall" plan={plan} className="relative overflow-hidden bg-ink text-white">
        <div aria-hidden className="bg-brand absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl" />
        <Container className="relative py-16 sm:py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Flame className="mx-auto h-16 w-auto" />
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">What should we build for you first?</h2>
            <p className="mt-4 text-white/70">Pick anything — on a 3-month plan it&apos;s included. Then book a free review of what you have today.</p>
          </Reveal>
          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2">
            {OPERATE.builds.map((m) => {
              const on = wishes.includes(m.title);
              return (
                <button
                  key={m.title}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setWishes((w) => (on ? w.filter((x) => x !== m.title) : [...w, m.title]))}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium ring-1 transition",
                    on ? "bg-brand text-ink ring-transparent" : "bg-white/5 text-white ring-white/15 hover:bg-white/10",
                  )}
                >
                  <Icon name={m.icon} className="size-4" />
                  {m.title}
                  {on && <span aria-hidden>✓</span>}
                </button>
              );
            })}
          </div>
          <div className="mx-auto mt-4 max-w-md">
            <label htmlFor="o-wish" className="sr-only">
              Something else
            </label>
            <input
              id="o-wish"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="Something else? Type it here"
              className="block w-full rounded-full bg-white/5 px-5 py-3 text-white ring-1 ring-white/15 placeholder:text-white/40 focus:ring-2 focus:ring-signal focus:outline-none"
            />
          </div>

          <div className="mx-auto mt-10 max-w-xl rounded-[1.5rem] bg-white/5 p-5 ring-1 ring-white/10 sm:p-6">
            <LaunchSlots offer={offer} />
            <button type="button" onClick={book} disabled={pending} className={buttonClass("primary", "lg", "mt-5 w-full")}>
              {pending ? "One moment…" : wishes.length || note.trim() ? "Book my free review with this list →" : "Book my free review →"}
            </button>
            <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-white/70">
              <a href={contact.whatsapp("Hi amfire, I just read the Operate brochure and want to talk.")} target="_blank" rel="noopener noreferrer" className="py-1 hover:text-white">
                WhatsApp us
              </a>
              <a href={`/brochure-pdf/${plan}`} target="_blank" rel="noopener" className="py-1 hover:text-white">
                Download as PDF
              </a>
            </div>
          </div>
        </Container>
      </Tracked>
    </div>
  );
}
