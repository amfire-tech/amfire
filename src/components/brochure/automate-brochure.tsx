"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useState, useTransition } from "react";
import { submitBrochureWish } from "@/app/actions/brochure";
import { contact } from "@/config/site";
import { AUTOMATE, AUTOMATED_SHARE, sumValues } from "@/knowledge/brochures";
import { SERVICE_DETAILS } from "@/knowledge/catalog";
import { DEMO_OFFER, STARTING_PRICE, formatMoney, type Currency, type Priced } from "@/knowledge/pricing";
import { track } from "@/lib/analytics";
import type { MonthlyOffer } from "@/server/brochures";
import { ForCurrency, Money, useCurrency } from "../currency";
import { GiftIcon } from "../demo-offer";
import { Container, buttonClass, cx } from "../ui";
import { FlowCard, HeroFlow, LiveLog, MethodTrack } from "./automate-art";
import { Icon } from "./icons";
import { CountUp, Eyebrow, LaunchSlots, RealWork, Reveal, Tracked } from "./parts";

// The Automate brochure. The plan sells work that happens on its own, so the
// page shows it happening: an order flowing through an automation on the
// cover, a day by hand against a day with amfire, six automations running, a
// calculator for the reader's own numbers, a live log of the safety checks,
// then everything included and the price.

const plan = "automate";
const WORK_DAYS = 26;
const HOURS_A_DAY = 8;

const minutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}m` : ""}`.trim() : `${m} min`);

/** The same day, by hand and with amfire. Flips to "with amfire" on its own the first time it is seen. */
function DayCompare() {
  const [auto, setAuto] = useState(false);
  const [touched, setTouched] = useState(false);
  const byHand = AUTOMATE.day.reduce((t, d) => t + d.byHand, 0);
  const withUs = AUTOMATE.day.reduce((t, d) => t + d.withUs, 0);
  const total = auto ? withUs : byHand;
  const monthly = Math.round(((byHand - withUs) * WORK_DAYS) / 60);
  const pick = (on: boolean) => {
    setTouched(true);
    setAuto(on);
  };
  return (
    <motion.div
      onViewportEnter={() => !touched && setTimeout(() => setAuto(true), 1600)}
      viewport={{ once: true, amount: 0.5 }}
      className="mx-auto mt-10 max-w-3xl rounded-[1.75rem] bg-surface p-5 ring-1 ring-line sm:p-8"
    >
      <div role="radiogroup" aria-label="How the work is done" className="mx-auto flex w-fit rounded-full bg-subtle p-1">
        {[
          { on: false, label: "By hand" },
          { on: true, label: "With amfire" },
        ].map((o) => (
          <button key={o.label} type="button" role="radio" aria-checked={auto === o.on} onClick={() => pick(o.on)} className="relative rounded-full px-5 py-2 text-sm font-semibold sm:px-7">
            {auto === o.on && <motion.span layoutId="day-mode" className={cx("absolute inset-0 rounded-full", o.on ? "bg-brand" : "bg-ink")} />}
            <span className={cx("relative", auto === o.on ? (o.on ? "text-ink" : "text-white") : "text-muted")}>{o.label}</span>
          </button>
        ))}
      </div>
      <ul className="mt-8 space-y-4">
        {AUTOMATE.day.map((d) => {
          const m = auto ? d.withUs : d.byHand;
          return (
            <li key={d.task}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <Icon name={d.icon} className="size-4 shrink-0 text-signal" />
                  {d.task}
                </span>
                <span className={cx("shrink-0 font-semibold tabular-nums", auto && "text-[#16a34a]")}>{m === 0 ? "Automatic" : minutes(m)}</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-subtle">
                <motion.div
                  className={cx("h-full rounded-full", auto ? "bg-[#22c55e]" : "bg-brand")}
                  animate={{ width: `${Math.max((m / 120) * 100, m === 0 ? 0 : 3)}%` }}
                  transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl bg-ink p-5 text-white sm:flex-row">
        <div>
          <p className="text-xs text-white/60">Time on this work, every day</p>
          <motion.p key={total} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cx("text-4xl font-semibold", auto ? "text-[#22c55e]" : "text-flame")}>
            {minutes(total)}
          </motion.p>
        </div>
        <p className={cx("text-center text-sm transition sm:text-right", auto ? "text-white" : "text-white/40")}>
          That&apos;s <span className="text-2xl font-semibold text-white">{monthly} hours</span>
          <br />
          back every month.
        </p>
      </div>
      <p className="mt-3 text-center text-xs text-muted">An example day for a small trading business. Your walkthrough measures yours.</p>
    </motion.div>
  );
}

const SALARY: Record<Currency, { min: number; max: number; step: number; start: number }> = {
  INR: { min: 10_000, max: 60_000, step: 1_000, start: 20_000 },
  USD: { min: 1_000, max: 6_000, step: 100, start: 2_500 },
};

function Slider({ id, label, value, min, max, step, shown, onChange }: { id: string; label: string; value: number; min: number; max: number; step: number; shown: string; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-white/80">
          {label}
        </label>
        <span className="text-xl font-semibold tabular-nums">{shown}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full cursor-pointer accent-[#ff453a]"
      />
    </div>
  );
}

/** The reader's own numbers: hours and money back, and how fast it pays for itself. */
function Calculator() {
  const currency = useCurrency();
  const price = STARTING_PRICE.automate;
  const [tasks, setTasks] = useState(40);
  const [mins, setMins] = useState(5);
  const [salary, setSalary] = useState<Record<Currency, number>>({ INR: SALARY.INR.start, USD: SALARY.USD.start });
  const s = SALARY[currency];

  const hours = (tasks * mins * WORK_DAYS * AUTOMATED_SHARE) / 60;
  const perHour = (cur: Currency) => salary[cur] / (WORK_DAYS * HOURS_A_DAY);
  const saved: Priced = { INR: Math.round(hours * perHour("INR")) * 100, USD: Math.round(hours * perHour("USD")) * 100 };
  const yearly: Priced = { INR: saved.INR * 12, USD: saved.USD * 12 };
  const weeks = saved[currency] > 0 ? price[currency] / (saved[currency] / 4.33) : Infinity;
  const payback = weeks <= 1 ? "under a week" : weeks > 52 ? "over a year" : `${Math.ceil(weeks)} weeks`;

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-2">
      <Reveal className="space-y-7 rounded-[1.75rem] bg-white/5 p-6 ring-1 ring-white/10 sm:p-8">
        <Slider id="c-tasks" label="Times the task is done a day" value={tasks} min={5} max={200} step={5} shown={String(tasks)} onChange={setTasks} />
        <Slider id="c-mins" label="Minutes it takes each time" value={mins} min={1} max={30} step={1} shown={`${mins} min`} onChange={setMins} />
        <Slider
          id="c-salary"
          label="Monthly salary of the person doing it"
          value={salary[currency]}
          min={s.min}
          max={s.max}
          step={s.step}
          shown={formatMoney(salary[currency] * 100, currency)}
          onChange={(v) => setSalary((x) => ({ ...x, [currency]: v }))}
        />
        <p className="text-xs text-white/40">
          Assumes {WORK_DAYS} working days, {HOURS_A_DAY}-hour days, and {Math.round(AUTOMATED_SHARE * 100)}% of the work automated — odd cases still go to a person.
        </p>
      </Reveal>
      <Reveal delay={0.1} className="flex flex-col justify-between gap-6 rounded-[1.75rem] bg-white p-6 text-ink sm:p-8">
        <div className="grid grid-cols-2 gap-5">
          <div>
            <p className="text-xs text-[#5a5a5a]">Hours back every month</p>
            <p className="text-4xl font-semibold tabular-nums">{Math.round(hours)}</p>
          </div>
          <div>
            <p className="text-xs text-[#5a5a5a]">Saved every month</p>
            <CountUp amounts={saved} className="text-4xl font-semibold" />
          </div>
          <div className="col-span-2">
            <p className="text-xs text-[#5a5a5a]">Saved every year</p>
            <CountUp amounts={yearly} className="text-brand text-5xl font-bold" />
          </div>
        </div>
        <div className="rounded-2xl bg-ink p-5 text-white">
          <p className="text-sm text-white/70">
            One automation from <Money amounts={price} /> pays for itself in
          </p>
          <p className="text-3xl font-semibold text-flame">{payback}</p>
          <p className="mt-1 text-xs text-white/50">Then it keeps working, every day, for free.</p>
        </div>
      </Reveal>
    </div>
  );
}

export function AutomateBrochure({ name, offer }: { name: string; offer: MonthlyOffer }) {
  const router = useRouter();
  const price = STARTING_PRICE.automate;
  const offerPrice: Priced = { INR: price.INR - DEMO_OFFER.amount.INR, USD: price.USD - DEMO_OFFER.amount.USD };
  const allIncluded = [...AUTOMATE.included, ...AUTOMATE.bonus];
  const fullValue = sumValues(allIncluded);

  const [wishes, setWishes] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const book = () =>
    startTransition(async () => {
      track("brochure_book", { plan, wishes: wishes.length });
      await submitBrochureWish(plan, { wishes, note: note.trim() || undefined });
      router.push(`/start?goal=${SERVICE_DETAILS.automate.goal}`);
    });

  return (
    <div className="overflow-x-clip">
      {/* 1 · Cover: an automation running */}
      <Tracked step="cover" plan={plan} className="relative overflow-hidden bg-ink text-white">
        <div aria-hidden className="bg-brand absolute top-1/4 left-1/2 size-[34rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl" />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:22px_22px]" />
        <Container className="relative flex min-h-[calc(100svh-6.5rem)] flex-col items-center justify-center py-14 text-center">
          <Reveal>
            <Eyebrow light>
              Hi {name} · <span className="normal-case">amfire</span> Automate
            </Eyebrow>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="mt-4 max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
              {AUTOMATE.hook}
              <br />
              <span className="text-brand">
                From <Money amounts={price} />.
              </span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-5 max-w-xl text-white/70 sm:text-lg">{AUTOMATE.promise}</p>
          </Reveal>
          <Reveal delay={0.3} className="mt-10 flex w-full justify-center">
            <HeroFlow steps={AUTOMATE.heroFlow} />
          </Reveal>
          <motion.div aria-hidden className="mt-10 text-white/50" animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>
            <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M6 13l6 6 6-6" />
            </svg>
          </motion.div>
        </Container>
      </Tracked>

      {/* 2 · A day by hand, a day with amfire */}
      <Tracked step="day" plan={plan}>
        <Container className="py-14 sm:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow>Same work · two ways</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">Watch the busywork disappear.</h2>
            <p className="mt-3 text-muted">The same day&apos;s work, done by hand — and done by amfire.</p>
          </Reveal>
          <DayCompare />
        </Container>
      </Tracked>

      {/* 3 · Automations at work */}
      <Tracked step="flows" plan={plan} className="relative overflow-hidden bg-ink text-white">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:22px_22px]" />
        <Container className="relative py-14 sm:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow light>What amfire can run for you</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">Six automations, running right now.</h2>
            <p className="mt-3 text-white/70">Each one starts on its own, does the work, and tells you when it&apos;s done.</p>
          </Reveal>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AUTOMATE.automations.map((a, i) => (
              <motion.li key={a.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: (i % 3) * 0.08 }}>
                <FlowCard automation={a} delay={i} />
              </motion.li>
            ))}
          </ul>
          <p className="mt-6 text-center text-sm text-white/60">Works with Tally, WhatsApp, Excel, Google Sheets, Zoho, email and UPI — nothing new for your team to learn.</p>
        </Container>
      </Tracked>

      {/* 4 · Your numbers */}
      <Tracked step="calculator" plan={plan} className="relative overflow-hidden bg-ink text-white">
        <div aria-hidden className="bg-brand absolute -right-24 -bottom-32 size-96 rounded-full opacity-15 blur-3xl" />
        <Container className="relative border-t border-white/10 py-14 sm:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow light>Do the maths</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">What is one task worth to you?</h2>
            <p className="mt-3 text-white/70">Pick one job your team repeats. Move the sliders.</p>
          </Reveal>
          <Calculator />
        </Container>
      </Tracked>

      {/* 5 · Safe by design */}
      <Tracked step="safety" plan={plan} className="bg-subtle">
        <Container className="grid gap-10 py-14 sm:py-20 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <Reveal>
              <Eyebrow>Automatic, never out of control</Eyebrow>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">It does the work. Your people make the calls.</h2>
              <p className="mt-3 text-muted">Watch the log: when something looks unusual, the automation stops and asks a person.</p>
            </Reveal>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {AUTOMATE.safety.map((x, i) => (
                <motion.li
                  key={x.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-card bg-surface p-4 ring-1 ring-line"
                >
                  <span className="bg-brand grid size-10 place-items-center rounded-xl text-ink">
                    <Icon name={x.icon} className="size-5" />
                  </span>
                  <p className="mt-3 font-semibold">{x.title}</p>
                  <p className="mt-1 text-sm text-muted">{x.body}</p>
                </motion.li>
              ))}
            </ul>
          </div>
          <Reveal delay={0.1}>
            <LiveLog lines={AUTOMATE.log} />
          </Reveal>
        </Container>
      </Tracked>

      {/* 6 · Everything included, and the price */}
      <Tracked step="price" plan={plan}>
        <Container className="py-14 sm:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow>In every automation</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">Not just a script. All of this.</h2>
          </Reveal>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {allIncluded.map((item, i) => {
              const bonus = i >= AUTOMATE.included.length;
              return (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ delay: (i % 4) * 0.06 }}
                  className={cx("flex gap-3 rounded-card p-4 ring-1", bonus ? "bg-ink text-white ring-white/10" : "bg-surface ring-line")}
                >
                  <motion.span
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ delay: 0.25 + (i % 4) * 0.06, type: "spring", bounce: 0.5 }}
                    className={cx("grid size-10 shrink-0 place-items-center rounded-xl", bonus ? "bg-brand text-ink" : "bg-subtle text-signal")}
                  >
                    <Icon name={item.icon} className="size-5" />
                  </motion.span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className={cx("mt-0.5 text-xs", bonus ? "text-white/60" : "text-muted")}>{item.body}</p>
                    <p className={cx("mt-1 text-xs font-semibold", bonus ? "text-flame" : "text-muted")}>
                      {bonus ? "Free · " : "Worth "}
                      <Money amounts={item.value} />
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </ul>

          <Reveal className="relative mx-auto mt-12 max-w-3xl overflow-hidden rounded-[1.75rem] bg-ink p-6 text-center text-white sm:p-10">
            <div aria-hidden className="bg-brand absolute -top-24 right-0 size-80 rounded-full opacity-20 blur-3xl" />
            <div className="relative">
              <p className="text-sm text-white/60">Bought separately, all of this would cost</p>
              <p className="mt-1 text-4xl font-semibold tracking-tight text-white/40 line-through decoration-signal decoration-4 sm:text-6xl">
                <Money amounts={fullValue} />
              </p>
              <p className="mt-6 text-sm text-white/60">With amfire, one automation starts at</p>
              <p className="mt-1 text-6xl font-semibold tracking-tight sm:text-7xl">
                <span className="text-brand">
                  <Money amounts={price} />
                </span>
              </p>
              <p className="bg-brand shine mx-auto mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 font-semibold text-ink">
                <GiftIcon />
                <span>
                  Only <Money amounts={offerPrice} /> with the free-demo offer
                </span>
              </p>
              <p className="mt-4 text-xs text-white/40">
                Market values are typical prices charged separately by agencies and freelancers in 2026. <ForCurrency currency="INR">GST extra as applicable.</ForCurrency>
                <ForCurrency currency="USD">Taxes extra where applicable.</ForCurrency>
              </p>
            </div>
          </Reveal>
        </Container>
      </Tracked>

      {/* 7 · Sizes */}
      <Tracked step="shelves" plan={plan} className="bg-subtle">
        <Container className="py-14 sm:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow>Start small, grow from there</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">One step, or the whole process.</h2>
            <p className="mt-3 text-muted">{AUTOMATE.tiersNote}</p>
          </Reveal>
          <ul className="mt-10 grid gap-4 lg:grid-cols-3">
            {AUTOMATE.tiers.map((t, i) => (
              <motion.li
                key={t.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={cx("flex flex-col rounded-[1.5rem] p-6 ring-1", i === 0 ? "bg-ink text-white ring-white/10" : "bg-surface ring-line")}
              >
                <p className={cx("text-xs font-semibold tracking-widest uppercase", i === 0 ? "text-flame" : "text-muted")}>{t.title}</p>
                <p className="mt-2 text-3xl font-semibold">
                  from <Money amounts={t.price} />
                </p>
                <p className={cx("mt-1 text-sm", i === 0 ? "text-white/70" : "text-muted")}>{t.body}</p>
                <ul className="mt-5 space-y-2.5 text-sm">
                  {t.items.map((it) => (
                    <li key={it.title} className="flex items-center gap-2.5">
                      <span className={cx("grid size-8 shrink-0 place-items-center rounded-lg", i === 0 ? "bg-white/10 text-flame" : "bg-subtle text-signal")}>
                        <Icon name={it.icon} className="size-4" />
                      </span>
                      {it.title}
                    </li>
                  ))}
                </ul>
                {i === 0 && (
                  <p className="mt-auto pt-5 text-sm font-semibold text-flame">
                    <Money amounts={offerPrice} /> with the free-demo offer
                  </p>
                )}
              </motion.li>
            ))}
          </ul>
          <Reveal className="mt-8">
            <Link href={AUTOMATE.callout.href} className="group relative flex flex-col gap-4 overflow-hidden rounded-[1.5rem] bg-ink p-6 text-white sm:flex-row sm:items-center sm:p-8">
              <div aria-hidden className="bg-brand absolute -right-16 -bottom-16 size-56 rounded-full opacity-25 blur-3xl" />
              <span className="bg-brand relative grid size-12 shrink-0 place-items-center rounded-2xl text-ink">
                <Icon name="rocket" />
              </span>
              <div className="relative flex-1">
                <p className="text-xl font-semibold">{AUTOMATE.callout.title}</p>
                <p className="mt-1 text-sm text-white/70">{AUTOMATE.callout.body}</p>
              </div>
              <span className="relative shrink-0 text-sm font-semibold text-flame group-hover:underline">{AUTOMATE.callout.cta}</span>
            </Link>
          </Reveal>
        </Container>
      </Tracked>

      {/* 8 · The FLOW method + promises */}
      <Tracked step="method" plan={plan}>
        <Container className="py-14 sm:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow>How it happens</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
              The amfire <span className="text-brand">FLOW</span> Method
            </h2>
            <p className="mt-3 text-muted">You pay only after you approve each stage.</p>
          </Reveal>
          <div className="mt-10">
            <MethodTrack method={AUTOMATE.method} />
          </div>

          <Reveal className="mt-16 text-center">
            <Eyebrow>In writing, every time</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Our {AUTOMATE.promises.length} promises</h2>
          </Reveal>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {AUTOMATE.promises.map((p, i) => (
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
      <div className="bg-subtle">
        <RealWork plan={plan} />
      </div>

      {/* 10 · What first? */}
      <Tracked step="mall" plan={plan} className="relative overflow-hidden bg-ink text-white">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:22px_22px]" />
        <div aria-hidden className="bg-brand absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl" />
        <Container className="relative py-16 sm:py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="bg-brand mx-auto grid size-14 place-items-center rounded-2xl text-ink shadow-[0_0_32px_rgba(255,69,58,0.6)]">
              <Icon name="flow" className="size-7" />
            </span>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">What should amfire take off your plate first?</h2>
            <p className="mt-4 text-white/70">Pick anything below, then book a free walkthrough. We&apos;ll show you where the hours go.</p>
          </Reveal>
          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2">
            {AUTOMATE.wishes.map((m) => {
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
            <label htmlFor="a-wish" className="sr-only">
              Something else
            </label>
            <input
              id="a-wish"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="Something else? Type the task here"
              className="block w-full rounded-full bg-white/5 px-5 py-3 text-white ring-1 ring-white/15 placeholder:text-white/40 focus:ring-2 focus:ring-signal focus:outline-none"
            />
          </div>

          <div className="mx-auto mt-10 max-w-xl rounded-[1.5rem] bg-white/5 p-5 ring-1 ring-white/10 sm:p-6">
            <LaunchSlots offer={offer} />
            <button type="button" onClick={book} disabled={pending} className={buttonClass("primary", "lg", "mt-5 w-full")}>
              {pending ? "One moment…" : wishes.length || note.trim() ? "Book my free walkthrough with this list →" : "Book my free walkthrough →"}
            </button>
            <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-white/70">
              <a href={contact.whatsapp("Hi amfire, I just read the Automate brochure and want to talk.")} target="_blank" rel="noopener noreferrer" className="py-1 hover:text-white">
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
