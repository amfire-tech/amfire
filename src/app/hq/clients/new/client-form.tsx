"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import type { ProposalMilestone } from "@/db/schema";
import { Button, Card, CardTitle, Field, Notice, buttonClass, formatDateRange, inputClass, toDateInput } from "@/components/ui";
import { BUSINESS_TYPES } from "@/knowledge/catalog";
import { formatMoney } from "@/knowledge/pricing";
import { MANUAL_SOURCES, sourceLabel } from "@/lib/attribution";
import { addSignedClientAction, type LoginState } from "../../actions";
import { LoginSharePanel } from "../login-share";

const SERVICES = [
  { id: "build", label: "Build: a system, app or website" },
  { id: "automate", label: "Automate: connect tools, remove manual work" },
  { id: "operate", label: "Operate: run and support it every month" },
] as const;

const toLines = (s: string) =>
  s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** Rupees/dollars typed in a field → minor units. */
const toMinor = (v: string) => Math.max(0, Math.round((Number(v) || 0) * 100));

type Stage = ProposalMilestone & { startsOn: string; endsOn: string };

/** "2026-11-25" plus some days. */
const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/** A new stage starts the day after the previous one ends and runs two weeks, until you change it. */
const stageAfter = (prev: Stage | undefined, title = ""): Stage => {
  const startsOn = prev?.endsOn ? addDays(prev.endsOn, 1) : toDateInput(new Date());
  return { title, description: "", weeks: 2, amount: 0, startsOn, endsOn: addDays(startsOn, 13) };
};

export function ClientForm() {
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [milestones, setMilestones] = useState<Stage[]>(() => [stageAfter(undefined, "Kick-off and first delivery")]);
  const [monthly, setMonthly] = useState(false);
  const [result, setResult] = useState<LoginState>();
  const [pending, start] = useTransition();

  const total = milestones.reduce((s, m) => s + m.amount, 0);
  const first = milestones[0]?.startsOn;
  const last = milestones.at(-1)?.endsOn;
  const setMilestone = (i: number, patch: Partial<Stage>) => setMilestones(milestones.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const text = (k: string) => String(f.get(k) ?? "");
    const data = {
      company: text("company"),
      name: text("name"),
      email: text("email"),
      phone: text("phone"),
      source: text("source"),
      sourceNote: text("sourceNote"),
      businessType: text("businessType"),
      state: text("state"),
      path: text("path"),
      title: text("title"),
      summary: text("summary"),
      scope: toLines(text("scope")),
      milestones: milestones.map((m) => ({
        ...m,
        title: m.title.trim(),
        description: m.description.trim(),
        // Kept for the proposal record; the dates are what the project uses.
        weeks: m.startsOn && m.endsOn ? Math.min(104, Math.max(1, Math.ceil((daysBetween(m.startsOn, m.endsOn) + 1) / 7))) : 1,
      })),
      currency,
      monthlyAmount: monthly ? toMinor(text("monthlyAmount")) || null : null,
      monthlyStartsOn: monthly && text("monthlyStartsOn") ? text("monthlyStartsOn") : null,
      terms: text("terms"),
      emailLogin: f.get("emailLogin") === "on",
    };
    const body = new FormData();
    body.set("data", JSON.stringify(data));
    const file = f.get("file");
    if (file instanceof File && file.size > 0) body.set("file", file);
    start(async () => {
      const res = await addSignedClientAction(body);
      setResult(res);
      if (res?.login) window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (result?.login && result.orgId) {
    return (
      <div className="max-w-3xl space-y-5">
        <LoginSharePanel login={result.login} title="Client added. Share their login" />
        <div className="flex flex-wrap gap-2">
          <Link href={`/hq/clients/${result.orgId}`} className={buttonClass("primary")}>
            Open the client account
          </Link>
          <Link href="/hq/clients" className={buttonClass("secondary")}>
            Back to clients
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-4xl space-y-6">
      <Card>
        <CardTitle>The client</CardTitle>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Organisation" htmlFor="company">
            <input id="company" name="company" required maxLength={160} autoComplete="off" className={inputClass} />
          </Field>
          <Field label="Contact person" htmlFor="name">
            <input id="name" name="name" required maxLength={120} autoComplete="off" className={inputClass} />
          </Field>
          <Field label="Email" htmlFor="email" hint="They sign in to their Client Hub with this.">
            <input id="email" name="email" type="email" required maxLength={200} autoComplete="off" className={inputClass} />
          </Field>
          <Field label="Phone / WhatsApp" htmlFor="phone" optional hint="To send the login on WhatsApp.">
            <input id="phone" name="phone" inputMode="tel" maxLength={20} autoComplete="off" className={inputClass} />
          </Field>
          <Field label="Where did they come from?" htmlFor="source">
            <select id="source" name="source" required defaultValue="event" className={inputClass}>
              {MANUAL_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {sourceLabel(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Source detail" htmlFor="sourceNote" optional>
            <input id="sourceNote" name="sourceNote" maxLength={300} placeholder="Met at their plant in Chakan" className={inputClass} />
          </Field>
          <Field label="Organisation type" htmlFor="businessType">
            <select id="businessType" name="businessType" defaultValue="Something else" className={inputClass}>
              {BUSINESS_TYPES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </Field>
          <Field label="State" htmlFor="state" optional hint="For GST on their invoices.">
            <input id="state" name="state" maxLength={80} placeholder="Maharashtra" className={inputClass} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle>What you agreed</CardTitle>
        <div className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-[1fr_160px]">
            <Field label="Service" htmlFor="path">
              <select id="path" name="path" defaultValue="build" className={inputClass}>
                {SERVICES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Currency" htmlFor="currency">
              <select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value as "INR" | "USD")} className={inputClass}>
                <option value="INR">₹ INR</option>
                <option value="USD">$ USD</option>
              </select>
            </Field>
          </div>
          <Field label="Title" htmlFor="title" hint="The client sees this as the project name.">
            <input id="title" name="title" required minLength={3} maxLength={200} placeholder="Order and dispatch system" className={inputClass} />
          </Field>
          <Field label="Summary" htmlFor="summary" hint="Plain language: the problem and the outcome you agreed.">
            <textarea id="summary" name="summary" required minLength={10} rows={4} maxLength={4000} className={inputClass} />
          </Field>
          <Field label="In scope" htmlFor="scope" optional hint="One item per line.">
            <textarea id="scope" name="scope" rows={4} className={inputClass} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle
          aside={
            <span className="text-sm text-muted">
              {first && last ? `${formatDateRange(`${first}T00:00:00+05:30`, `${last}T00:00:00+05:30`)} · ` : ""}
              {formatMoney(total, currency)}
            </span>
          }
        >
          Milestones and price
        </CardTitle>
        <p className="-mt-2 mb-4 text-sm text-muted">
          Pick the dates you agreed for each stage. The client sees them in their Hub and approves each milestone there; its invoice is drafted then. You can change the dates later on the project page.
        </p>
        <ol className="space-y-4">
          {milestones.map((m, i) => (
            <li key={i} className="rounded-xl p-4 ring-1 ring-line">
              <div className="grid gap-3 md:grid-cols-[1fr_150px]">
                <Field label={`Milestone ${i + 1}`} htmlFor={`m-title-${i}`}>
                  <input id={`m-title-${i}`} required value={m.title} onChange={(e) => setMilestone(i, { title: e.target.value })} className={inputClass} />
                </Field>
                <Field label={`Price (${currency})`} htmlFor={`m-amount-${i}`}>
                  <input
                    id={`m-amount-${i}`}
                    type="number"
                    min={0}
                    step="any"
                    inputMode="numeric"
                    value={m.amount ? m.amount / 100 : ""}
                    placeholder="0"
                    onChange={(e) => setMilestone(i, { amount: toMinor(e.target.value) })}
                    className={inputClass}
                  />
                </Field>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[180px_180px_1fr] sm:items-end">
                <Field label="Starts" htmlFor={`m-start-${i}`}>
                  <input
                    id={`m-start-${i}`}
                    type="date"
                    required
                    value={m.startsOn}
                    onChange={(e) => {
                      const startsOn = e.target.value;
                      // Moving the start keeps the stage's length.
                      const length = m.startsOn && m.endsOn ? daysBetween(m.startsOn, m.endsOn) : 13;
                      setMilestone(i, { startsOn, endsOn: startsOn ? addDays(startsOn, Math.max(0, length)) : m.endsOn });
                    }}
                    className={inputClass}
                  />
                </Field>
                <Field label="Ends" htmlFor={`m-end-${i}`}>
                  <input
                    id={`m-end-${i}`}
                    type="date"
                    required
                    min={m.startsOn || undefined}
                    value={m.endsOn}
                    onChange={(e) => setMilestone(i, { endsOn: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <p className="pb-3 text-sm text-muted">
                  {m.startsOn && m.endsOn && m.endsOn >= m.startsOn ? `${daysBetween(m.startsOn, m.endsOn) + 1} days` : ""}
                </p>
              </div>
              <div className="mt-3">
                <Field label="Description" htmlFor={`m-desc-${i}`} optional>
                  <input id={`m-desc-${i}`} value={m.description} onChange={(e) => setMilestone(i, { description: e.target.value })} className={inputClass} />
                </Field>
              </div>
              {milestones.length > 1 && (
                <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setMilestones(milestones.filter((_, j) => j !== i))}>
                  Remove milestone
                </Button>
              )}
            </li>
          ))}
        </ol>
        <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={() => setMilestones([...milestones, stageAfter(milestones.at(-1))])}>
          Add milestone
        </Button>

        <div className="mt-6 border-t border-line pt-5">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={monthly} onChange={(e) => setMonthly(e.target.checked)} className="size-4" />
            They also pay a monthly plan
          </label>
          {monthly && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label={`Monthly amount (${currency}, before GST)`} htmlFor="monthlyAmount">
                <input id="monthlyAmount" name="monthlyAmount" type="number" min={1} step="any" required className={inputClass} />
              </Field>
              <Field label="First monthly bill on" htmlFor="monthlyStartsOn" optional hint="Then the same day every month. Empty: when the last milestone ends.">
                <input id="monthlyStartsOn" name="monthlyStartsOn" type="date" className={inputClass} />
              </Field>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardTitle>Terms and the signed copy</CardTitle>
        <div className="grid gap-5">
          <Field label="Commercial terms" htmlFor="terms" optional hint="Shown to the client as written. Empty: “Agreed and signed in person on (today).”">
            <textarea id="terms" name="terms" rows={4} maxLength={4000} className={inputClass} />
          </Field>
          <Field label="Signed proposal (PDF)" htmlFor="file" optional hint="Up to 4 MB. The client can open it from their Hub.">
            <input id="file" name="file" type="file" accept="application/pdf" className="block text-sm" />
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle>Their login</CardTitle>
        <p className="-mt-2 text-sm text-muted">
          They get a Client Hub login as the account&apos;s admin. You&apos;ll see a one-time password to share with them on WhatsApp or in person; they choose their own the first time they sign in.
        </p>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" name="emailLogin" className="size-4" />
          Also email them the sign-in details
        </label>
      </Card>

      {result?.error && <Notice tone="error">{result.error}</Notice>}
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add client and create login"}
      </Button>
    </form>
  );
}
