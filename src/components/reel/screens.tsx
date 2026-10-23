"use client";

// Replicas of the real client screens for the demo reel, built from the same
// components, classes and copy as the pages they mirror:
//   /start                → src/app/(site)/start/page.tsx + discovery-form.tsx
//   /start/thanks         → src/app/(site)/start/thanks/page.tsx
//   /hub                  → src/app/hub/layout.tsx + page.tsx
//   /hub/proposals/[id]   → src/app/hub/proposals/[id]/page.tsx + decision-panel.tsx
//   /hub/projects/[id]    → src/app/hub/projects/[id]/page.tsx + client-forms.tsx
// Interactive bits (inputs, radios, checkboxes) are drawn rather than real, so
// the reel controls exactly what each frame shows. Keep these in step with the
// real pages when those change.

import type { CSSProperties, ReactNode } from "react";
import type { Proposal } from "@/db/schema";
import { GiftIcon, OfferBar, PromoCode } from "@/components/demo-offer";
import { ProposalDocument } from "@/components/proposal-document";
import { SiteHeader } from "@/components/site-header";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  BulletList,
  Card,
  CardTitle,
  CheckList,
  Container,
  EmptyState,
  Eyebrow,
  Logo,
  Notice,
  PageHeader,
  PathBadge,
  ProgressBar,
  StatusBadge,
  buttonClass,
  cx,
  inputClass,
} from "@/components/ui";
import { BUSINESS_TYPES, FREE_DEMO, GOALS, TEAM_SIZES, URGENCY } from "@/knowledge/catalog";
import { DEMO_OFFER, formatMoney } from "@/knowledge/pricing";

// The reel is a recorded walkthrough for an Indian client, so it stays in rupees.
const OFFER = formatMoney(DEMO_OFFER.amount.INR, "INR");

/* ---------- sample client ---------- */

export const CLIENT = {
  first: "Rohit",
  name: "Rohit Sharma",
  email: "rohit@sharma-auto.example",
  phone: "98765 43210",
  company: "Sharma Auto Components",
  problem: "Dealers call all day asking for stock and order status. We check Excel and call them back.",
  // Their free-demo promo code, as shown on the thank-you page and the proposal.
  code: "DEMO5K-7F3A9C",
};

export const PROPOSAL = {
  status: "sent",
  path: "build",
  title: "Dealer ordering app",
  summary: "A simple app where your dealers check live stock and track their own orders, so your team stops answering the same calls all day.",
  scope: ["Dealer app for phone and desktop", "Live stock from your existing stock sheet", "Order status updates on WhatsApp", "Admin screen for your sales team"],
  outOfScope: ["Changes to your accounting software", "Hardware or devices"],
  assumptions: ["You share a daily stock export until your accounts system is connected", "About 120 dealers at launch"],
  milestones: [
    { title: "Stock lookup for dealers", description: "Dealers search parts and see live stock on their phone.", weeks: 3, amount: 1500000 },
    { title: "Order tracking", description: "Every order's status, from placed to delivered, with WhatsApp updates.", weeks: 3, amount: 1000000 },
    { title: "Launch and training", description: "Go live with your dealers and train your team.", weeks: 1, amount: 500000 },
  ],
  currency: "INR",
  // The free-demo offer, as every proposal drafted from a booking carries it.
  discount: DEMO_OFFER.amount.INR,
  discountNote: "Free-demo offer · DEMO5K-7F3A9C",
  terms: ["Each milestone is invoiced only after you approve it.", "Any change to scope is agreed in writing first.", DEMO_OFFER.terms("INR")].join("\n"),
  sentAt: new Date("2026-10-24T11:00:00+05:30"),
} as unknown as Proposal;

const TOTAL = PROPOSAL.milestones.reduce((s, m) => s + m.amount, 0) - PROPOSAL.discount;

/* ---------- drawn form controls ---------- */

const FOCUS: CSSProperties = { boxShadow: "inset 0 0 0 2px var(--color-signal)" };

function Caret() {
  return <span className="ml-px inline-block h-[1.1em] w-[1.5px] translate-y-[3px] bg-fg" />;
}

function FakeField({
  label,
  hint,
  optional,
  value,
  focus,
  caret,
  placeholder,
  rows,
  select,
  anchor,
}: {
  label: ReactNode;
  hint?: ReactNode;
  optional?: boolean;
  value?: string;
  focus?: boolean;
  caret?: boolean;
  placeholder?: string;
  rows?: number;
  select?: boolean;
  anchor?: string;
}) {
  return (
    <div>
      <p className="block text-sm font-medium">
        {label}
        {optional && <span className="font-normal text-muted"> (optional)</span>}
      </p>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      <div className="mt-1.5">
        <div
          data-anchor={anchor}
          className={cx(inputClass, "relative min-h-11 whitespace-pre-wrap", select && "pr-10")}
          style={{ ...(focus ? FOCUS : {}), ...(rows ? { height: rows * 24 + 20 } : {}) }}
        >
          {value ? value : placeholder ? <span className="text-fg/40">{placeholder}</span> : null}
          {caret && <Caret />}
          {select && (
            <svg aria-hidden viewBox="0 0 20 20" className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-fg/60" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 8l5 5 5-5" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

function Radio({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cx("mt-1 grid size-[15px] shrink-0 place-items-center rounded-full", on ? "bg-signal" : "bg-surface ring-1 ring-fg/45 ring-inset")}
    >
      {on && <span className="size-[6px] rounded-full bg-white" />}
    </span>
  );
}

function Checkbox({ on, anchor }: { on: boolean; anchor?: string }) {
  return (
    <span data-anchor={anchor} aria-hidden className={cx("mt-0.5 grid size-4 shrink-0 place-items-center rounded-[4px]", on ? "bg-signal" : "bg-surface ring-1 ring-fg/45 ring-inset")}>
      {on && (
        <svg viewBox="0 0 16 16" className="size-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
      )}
    </span>
  );
}

const pressStyle = (press = 0): CSSProperties => ({ transform: `scale(${1 - press * 0.05})` });

/* ---------- /start ---------- */

export type BookState = {
  step: number;
  goal: boolean;
  businessType: boolean;
  teamSize: boolean;
  urgency: boolean;
  problem: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  consent: boolean;
  focus: string;
  caret: boolean;
  submitting: boolean;
  press: number;
};

const STEPS = ["Your goal", "Your business", "The problem", "Book your demo"];

export function StartScreen({ s }: { s: BookState }) {
  const field = (name: keyof BookState) => ({ focus: s.focus === name, caret: s.focus === name && s.caret });
  return (
    <>
      <OfferBar path="/start" />
      <SiteHeader />
      <div className="bg-subtle">
        <Container className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[0.8fr_1.4fr]">
          <div className="lg:pt-4">
            <Eyebrow>Free · no obligation</Eyebrow>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{FREE_DEMO.title}</h1>
            <p className="mt-3 text-fg/75">{FREE_DEMO.summary}</p>
            <div className="relative mt-6 overflow-hidden rounded-card bg-ink p-5 text-white">
              <div aria-hidden className="bg-brand absolute -top-16 -right-16 size-40 rounded-full opacity-30 blur-2xl" />
              <div className="relative flex gap-4">
                <span className="bg-brand grid size-10 shrink-0 place-items-center rounded-full text-ink">
                  <GiftIcon className="size-5" />
                </span>
                <div>
                  <p className="text-lg font-semibold">
                    Get flat <span className="text-flame">{OFFER} off</span> any plan
                  </p>
                  <p className="mt-1 text-sm text-white/75">
                    Book this free demo and your personal promo code appears instantly. We take {OFFER} off your proposal, so you see the saving
                    before you agree to anything.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 text-sm">
              <CheckList items={FREE_DEMO.points} />
            </div>
          </div>

          <div data-anchor="start:form" className="rounded-card bg-surface p-5 ring-1 ring-line sm:p-8">
            <div className="mb-8">
              <p className="text-sm text-muted">
                Step {s.step + 1} of {STEPS.length} · {STEPS[s.step]}
              </p>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {STEPS.map((x, i) => (
                  <div key={x} className={cx("h-1.5 rounded-full", i <= s.step ? "bg-brand" : "bg-subtle")} />
                ))}
              </div>
            </div>

            <div data-anchor="start:step1" hidden={s.step !== 0}>
              <h2 className="text-xl font-semibold sm:text-2xl">What would you most like to improve?</h2>
              <div data-anchor="start:goals" className="mt-6 grid gap-3 sm:grid-cols-2">
                {GOALS.map((g) => {
                  const on = s.goal && g.id === "customer-portal";
                  return (
                    <div
                      key={g.id}
                      data-anchor={g.id === "customer-portal" ? "start:goal" : undefined}
                      className={cx("flex gap-3 rounded-xl p-4 ring-1 ring-line", on && "bg-subtle ring-2 ring-fg")}
                    >
                      <Radio on={on} />
                      <span>
                        <span className="block font-medium">{g.label}</span>
                        <span className="block text-sm text-muted">{g.hint}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div data-anchor="start:step2" hidden={s.step !== 1}>
              <h2 className="text-xl font-semibold sm:text-2xl">A little about your business</h2>
              <div className="mt-6 grid gap-6">
                <FakeField label="What kind of organisation are you?" anchor="start:orgtype" select value={s.businessType ? BUSINESS_TYPES[0] : "Choose one"} />
                <Choices legend="How many people work there?" optional options={TEAM_SIZES} on={s.teamSize ? "11-50" : ""} anchor="start:team" />
                <Choices legend="How soon do you need this?" options={URGENCY} on={s.urgency ? "month" : ""} anchor="start:urgency" />
              </div>
            </div>

            <div data-anchor="start:step3" hidden={s.step !== 2}>
              <h2 className="text-xl font-semibold sm:text-2xl">Describe the problem in your own words</h2>
              <div className="mt-6 grid gap-6">
                <FakeField
                  label="What is getting in the way?"
                  hint="Plain words are perfect — e.g. “We re-type every order from email into our spreadsheet and the accounts system.”"
                  anchor="start:problem"
                  rows={6}
                  value={s.problem}
                  {...field("problem")}
                />
                <FakeField label="Which tools or systems do you use today?" optional hint="For example: Excel, Xero, Shopify, an in-house system." anchor="start:tools" />
              </div>
            </div>

            <div data-anchor="start:step4" hidden={s.step !== 3}>
              <h2 className="text-xl font-semibold sm:text-2xl">Where should we call you for your free demo?</h2>
              <p className="mt-2 text-sm text-muted">
                A 30-minute call to understand your business. Free, with no obligation — and your {OFFER} promo code appears as soon as you book.
              </p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <FakeField label="Your name" anchor="start:name" value={s.name} {...field("name")} />
                <FakeField label="Work email" anchor="start:email" value={s.email} {...field("email")} />
                <FakeField label="Mobile / WhatsApp" optional hint="So we can call or WhatsApp to fix a time." anchor="start:phone" value={s.phone} placeholder="98765 43210" {...field("phone")} />
                <FakeField label="Best time to call" optional select value="No preference" />
                <div className="sm:col-span-2">
                  <FakeField label="Business name" anchor="start:company" value={s.company} {...field("company")} />
                </div>
                <div className="sm:col-span-2">
                  <div className="flex gap-3 text-sm">
                    <Checkbox on={s.consent} anchor="start:consent" />
                    <span>
                      Store my answers and contact details so AMFIRE can review them and contact me about the demo. Answers may be analysed with AI-assisted tools to prepare a
                      recommendation; a person reviews it before anything is proposed.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex items-center justify-between gap-3 border-t border-line pt-6">
              {s.step > 0 ? <span className={buttonClass("ghost")}>← Back</span> : <span />}
              <span data-anchor="start:continue" className={buttonClass("primary")} style={pressStyle(s.press)}>
                {s.step < 3 ? "Continue" : s.submitting ? "Booking…" : `Book my free demo · get ${OFFER} off`}
              </span>
            </div>
          </div>
        </Container>
      </div>
    </>
  );
}

function Choices({ legend, options, on, optional, anchor }: { legend: string; options: readonly { id: string; label: string }[]; on: string; optional?: boolean; anchor: string }) {
  return (
    <div>
      <p className="text-sm font-medium">
        {legend}
        {optional && <span className="font-normal text-muted"> (optional)</span>}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <span
            key={o.id}
            data-anchor={o.id === "11-50" || o.id === "month" ? anchor : undefined}
            className={cx("rounded-full px-4 py-2 text-sm ring-1 ring-line", on === o.id && "bg-ink text-white ring-fg")}
          >
            {o.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- /start/thanks ---------- */

export function ThanksScreen() {
  return (
    <>
      <OfferBar path="/start/thanks" />
      <SiteHeader />
      <div className="bg-subtle">
        <Container className="max-w-3xl py-12 sm:py-16">
          <p className="text-sm font-medium text-muted">Received</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Thank you, {CLIENT.first}.</h1>
          <p className="mt-3 text-fg/75">
            Your free demo request is in. A person at AMFIRE will call or email you to fix a time. Nothing is agreed until you approve a written proposal.
          </p>
          <section data-anchor="thanks:offer" className="relative mt-8 overflow-hidden rounded-card bg-ink p-6 text-white sm:p-8">
            <div aria-hidden className="bg-brand absolute -top-24 -right-24 size-64 rounded-full opacity-30 blur-3xl" />
            <div className="relative">
              <p className="flex items-center gap-2 text-sm font-semibold tracking-widest text-flame uppercase">
                <GiftIcon /> Unlocked
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                You&apos;ve got <span className="text-brand">{OFFER} off</span> any plan
              </h2>
              <p className="mt-2 text-white/75">Here&apos;s your personal promo code. It&apos;s linked to this booking.</p>
              <div className="mt-5 max-w-md">
                <PromoCode code={CLIENT.code} />
              </div>
              <p className="mt-4 text-sm text-white/60">
                There&apos;s nothing to enter later: we take {OFFER} off your proposal, and you&apos;ll see it there before you accept. Keep the
                code for your records.
              </p>
            </div>
          </section>
          <Card data-anchor="thanks:card" className="mt-8">
            <div className="flex flex-wrap items-center gap-2">
              <PathBadge path="build" />
              <span className="text-sm text-muted">Our initial read — to be confirmed with you</span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">A dealer app for stock and order status</h2>
            <p className="mt-2 text-fg/80">Your dealers could check stock and follow their orders themselves, instead of calling your team.</p>
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">How we&apos;d approach it</h3>
                <div className="mt-3 text-sm">
                  <BulletList items={["Start with stock lookup, the question dealers ask most", "Add order tracking with WhatsApp updates", "Launch with a small group of dealers first"]} />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">What we&apos;re assuming</h3>
                <div className="mt-3 text-sm">
                  <BulletList items={["Stock is kept in Excel today", "Dealers mostly use their phones"]} />
                </div>
              </div>
            </div>
          </Card>
        </Container>
      </div>
    </>
  );
}

/* ---------- Client Hub ---------- */

function HubFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-subtle">
      <header className="border-b border-line bg-surface">
        <Container className="flex h-16 items-center justify-between gap-4">
          <span className="flex items-center gap-2">
            <Logo className="h-6" priority /> <span className="hidden text-sm font-medium text-muted sm:inline">Client Hub</span>
          </span>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-muted sm:inline">Talk to a person</span>
            <ThemeToggle />
            <span className="text-muted">Sign out</span>
          </div>
        </Container>
      </header>
      <Container className="py-8 sm:py-10">{children}</Container>
    </div>
  );
}

export function HubHomeScreen({ delivered, press = 0 }: { delivered?: boolean; press?: number }) {
  return (
    <HubFrame>
      <div className="space-y-8">
        <PageHeader title={`Hello, ${CLIENT.first}`} description={delivered ? "You're all caught up." : "1 decision is waiting for you."} />
        {!delivered && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Waiting for your decision</h2>
            <Card data-anchor="home:decision" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted">Proposal · {formatMoney(TOTAL, "INR")}</p>
                <p className="font-semibold">{PROPOSAL.title}</p>
              </div>
              <span data-anchor="home:review" className={buttonClass("primary")} style={pressStyle(press)}>
                Review proposal
              </span>
            </Card>
          </section>
        )}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Projects</h2>
          {delivered ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div data-anchor="done:project" className="rounded-card bg-surface p-6 ring-1 ring-line">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">{PROPOSAL.title}</p>
                  <StatusBadge status="completed" />
                </div>
                <div className="mt-4">
                  <ProgressBar value={100} label="Progress" />
                </div>
                <p className="mt-2 text-sm text-muted">3 of 3 milestones complete</p>
              </div>
            </div>
          ) : (
            <EmptyState title="No projects yet.">A project starts as soon as you accept a proposal.</EmptyState>
          )}
        </section>
        {delivered && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Past proposals</h2>
            <ul className="divide-y divide-line rounded-card bg-surface ring-1 ring-line">
              <li className="flex items-center justify-between gap-3 px-5 py-4">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{PROPOSAL.title}</span>
                  <span className="text-sm text-muted">Decided 26 Oct 2026</span>
                </span>
                <StatusBadge status="accepted" />
              </li>
            </ul>
          </section>
        )}
      </div>
    </HubFrame>
  );
}

export type ProposalState = { agree: boolean; accepting: boolean; accepted: boolean; sticky: number; pressAgree: number; pressAccept: number };

export function ProposalScreen({ s }: { s: ProposalState }) {
  return (
    <HubFrame>
      <div className="space-y-6">
        <PageHeader eyebrow="← Client Hub" title="Proposal" description={<StatusBadge status={s.accepted ? "accepted" : "sent"} />} />
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
          <div data-anchor="proposal:doc">
            <ProposalDocument proposal={PROPOSAL} company={CLIENT.company} />
          </div>
          <div data-anchor="proposal:aside">
          <div data-anchor="proposal:panel" className="relative space-y-4" style={{ top: s.sticky }}>
            {s.accepted ? (
              <Notice tone="success">You accepted this proposal on 26 Oct 2026.</Notice>
            ) : (
              <Card>
                <CardTitle>Your decision</CardTitle>
                <div className="space-y-4">
                  <div className="flex gap-3 text-sm" style={pressStyle(s.pressAgree)}>
                    <Checkbox on={s.agree} anchor="proposal:agree" />
                    <span>I have read the scope, milestones and terms, and I agree to them on behalf of {CLIENT.company}.</span>
                  </div>
                  <span data-anchor="proposal:accept" className={buttonClass("primary", "md", "w-full")} style={pressStyle(s.pressAccept)}>
                    {s.accepting ? "Accepting…" : "Accept proposal"}
                  </span>
                  <span className={buttonClass("ghost", "md", "w-full")}>Request changes instead</span>
                </div>
              </Card>
            )}
            <p className="text-sm text-muted">Questions about this proposal? Reply to our email and a person will answer.</p>
          </div>
          </div>
        </div>
      </div>
    </HubFrame>
  );
}

export type ProjectState = {
  milestones: { title: string; status: string; when: string; tasks: { title: string; status: string }[] }[];
  done: number;
  percent: number;
  current: string | null;
  approval: number;
  approving: boolean;
  pressApprove: number;
  updates: { when: string; body: string; p: number }[];
};

/** Expands from nothing to full height as `p` goes 0 → 1, pushing what follows down smoothly. */
function Grow({ p, gap, children }: { p: number; gap: number; children: ReactNode }) {
  return (
    <div className="grid" style={{ gridTemplateRows: `${p}fr`, opacity: p, marginBlockEnd: p * gap }}>
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

export function ProjectScreen({ s }: { s: ProjectState }) {
  const awaiting = s.milestones[0];
  return (
    <HubFrame>
      <div className="flex flex-col">
        <div className="mb-6">
          <PageHeader eyebrow="← Client Hub" title={PROPOSAL.title} description="Started 26 Oct 2026" />
        </div>

        <Card data-anchor="project:progress" className="mb-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">Progress</h2>
            <span className="text-sm text-muted">
              {s.done} of {s.milestones.length} milestones approved
            </span>
          </div>
          <div className="mt-3">
            <ProgressBar value={s.percent} label="Project progress" />
          </div>
          <p className="mt-3 text-sm">
            {s.current ? (
              <>
                Current milestone: <strong>{s.current}</strong>
              </>
            ) : (
              "All milestones are complete."
            )}
          </p>
        </Card>

        <Grow p={s.approval} gap={24}>
          <Card data-anchor="project:approval" className="ring-2 ring-flame">
            <p className="text-sm font-medium text-muted">Waiting for your approval</p>
            <h2 className="mt-1 text-lg font-semibold">{awaiting.title}</h2>
            <p className="mt-1 text-fg/80">{PROPOSAL.milestones[0].description}</p>
            <p className="mt-2 text-sm text-muted">Approving confirms this milestone is complete. It will then be invoiced as agreed in your proposal.</p>
            <div className="mt-4">
              <span data-anchor="project:approve" className={buttonClass("primary")} style={pressStyle(s.pressApprove)}>
                {s.approving ? "Approving…" : "Approve milestone"}
              </span>
            </div>
          </Card>
        </Grow>

        <Card data-anchor="project:milestones" className="mb-6">
          <CardTitle>Milestones</CardTitle>
          <ol className="space-y-5">
            {s.milestones.map((m) => (
              <li key={m.title} className="flex gap-4">
                <span aria-hidden className={cx("mt-1.5 size-3 shrink-0 rounded-full", m.status === "done" ? "bg-brand" : "bg-line")} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{m.title}</p>
                    <StatusBadge status={m.status} />
                  </div>
                  <p className="text-sm text-muted">{m.when}</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {m.tasks.map((x) => (
                      <li key={x.title} className="flex items-center gap-2">
                        <span aria-hidden>{x.status === "done" ? "✓" : "·"}</span>
                        <span className={x.status === "done" ? "text-muted line-through" : undefined}>{x.title}</span>
                        {x.status === "doing" && <StatusBadge status="doing" />}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card data-anchor="project:updates">
            <CardTitle>Updates from AMFIRE</CardTitle>
            <ul>
              {s.updates.map((u) => (
                <li key={u.body}>
                  <Grow p={u.p} gap={16}>
                    <div className="border-l-2 border-flame pl-4">
                      <p className="text-xs text-muted">{u.when}</p>
                      <p className="mt-1">{u.body}</p>
                    </div>
                  </Grow>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardTitle>Talk to a person</CardTitle>
            <div className="space-y-4">
              <FakeField label="Subject" />
              <FakeField label="How can we help?" hint="Questions, changes, problems — or something we got wrong." rows={4} />
              <span className={buttonClass("secondary")}>Send to a person</span>
            </div>
          </Card>
        </div>
      </div>
    </HubFrame>
  );
}
