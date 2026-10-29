"use client";

import { useState, useTransition } from "react";
import type { ProposalMilestone } from "@/db/schema";
import { Button, Card, CardTitle, Field, Notice, inputClass } from "@/components/ui";
import { formatMoney } from "@/knowledge/pricing";
import type { ActionState } from "@/lib/action-result";
import { saveDraftAction } from "../../actions";

type Draft = {
  title: string;
  summary: string;
  scope: string[];
  outOfScope: string[];
  assumptions: string[];
  milestones: ProposalMilestone[];
  discount: number;
  discountNote: string | null;
  monthlyAmount: number | null;
  monthlyStartsOn: Date | null;
  terms: string;
};

const toLines = (s: string) =>
  s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** Rupees/dollars typed in a field → minor units. */
const toMinor = (v: string) => Math.max(0, Math.round((Number(v) || 0) * 100));

export function ProposalEditor({
  proposalId,
  initial,
  currency,
  path,
}: {
  proposalId: string;
  initial: Draft;
  currency: string;
  path: string;
}) {
  const [title, setTitle] = useState(initial.title);
  const [summary, setSummary] = useState(initial.summary);
  const [scope, setScope] = useState(initial.scope.join("\n"));
  const [outOfScope, setOutOfScope] = useState(initial.outOfScope.join("\n"));
  const [assumptions, setAssumptions] = useState(initial.assumptions.join("\n"));
  const [terms, setTerms] = useState(initial.terms);
  const [milestones, setMilestones] = useState(initial.milestones);
  const [discount, setDiscount] = useState(initial.discount);
  const [discountNote, setDiscountNote] = useState(initial.discountNote ?? "");
  const [monthlyAmount, setMonthlyAmount] = useState(initial.monthlyAmount);
  const [monthlyStartsOn, setMonthlyStartsOn] = useState(initial.monthlyStartsOn ? initial.monthlyStartsOn.toISOString().slice(0, 10) : "");
  const [result, setResult] = useState<ActionState>();
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);

  const touch = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setDirty(true);
    setResult(undefined);
  };

  const total = milestones.reduce((s, m) => s + m.amount, 0);
  const weeks = milestones.reduce((s, m) => s + m.weeks, 0);

  function updateMilestone(i: number, patch: Partial<ProposalMilestone>) {
    touch(setMilestones)(milestones.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  }

  function save() {
    startTransition(async () => {
      const res = await saveDraftAction(proposalId, {
        title,
        summary,
        scope: toLines(scope),
        outOfScope: toLines(outOfScope),
        assumptions: toLines(assumptions),
        milestones,
        discount,
        discountNote,
        monthlyAmount: path === "operate" ? monthlyAmount : null,
        monthlyStartsOn: path === "operate" && monthlyStartsOn ? monthlyStartsOn : null,
        terms,
      });
      setResult(res);
      if (res?.ok) setDirty(false);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Proposal</CardTitle>
        <div className="grid gap-5">
          <Field label="Title" htmlFor="title">
            <input id="title" value={title} onChange={(e) => touch(setTitle)(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Summary" htmlFor="summary" hint="Plain language: the problem and the outcome.">
            <textarea id="summary" rows={4} value={summary} onChange={(e) => touch(setSummary)(e.target.value)} className={inputClass} />
          </Field>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="In scope" htmlFor="scope" hint="One item per line.">
              <textarea id="scope" rows={6} value={scope} onChange={(e) => touch(setScope)(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Not included" htmlFor="outOfScope" hint="One item per line.">
              <textarea id="outOfScope" rows={6} value={outOfScope} onChange={(e) => touch(setOutOfScope)(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <Field label="Assumptions" htmlFor="assumptions" hint="One per line. Remove anything confirmed with the client.">
            <textarea id="assumptions" rows={4} value={assumptions} onChange={(e) => touch(setAssumptions)(e.target.value)} className={inputClass} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle
          aside={
            <span className="text-right text-sm text-muted">
              {weeks} weeks · {formatMoney(total, currency)}
              {discount > 0 && (
                <span className="block">
                  {discountNote || "Discount"} −{formatMoney(discount, currency)} · client pays{" "}
                  <strong className="text-fg">{formatMoney(Math.max(0, total - discount), currency)}</strong>
                </span>
              )}
            </span>
          }
        >
          Milestones and price
        </CardTitle>
        <ol className="space-y-4">
          {milestones.map((m, i) => (
            <li key={i} className="rounded-xl p-4 ring-1 ring-line">
              <div className="grid gap-3 md:grid-cols-[1fr_110px_150px]">
                <Field label={`Milestone ${i + 1}`} htmlFor={`m-title-${i}`}>
                  <input id={`m-title-${i}`} value={m.title} onChange={(e) => updateMilestone(i, { title: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Weeks" htmlFor={`m-weeks-${i}`}>
                  <input
                    id={`m-weeks-${i}`}
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={m.weeks}
                    onChange={(e) => updateMilestone(i, { weeks: Math.max(1, Number(e.target.value) || 1) })}
                    className={inputClass}
                  />
                </Field>
                <Field label={`Price (${currency})`} htmlFor={`m-amount-${i}`}>
                  <input
                    id={`m-amount-${i}`}
                    type="number"
                    min={0}
                    step={100}
                    inputMode="numeric"
                    value={m.amount / 100}
                    onChange={(e) => updateMilestone(i, { amount: toMinor(e.target.value) })}
                    className={inputClass}
                  />
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Description" htmlFor={`m-desc-${i}`}>
                  <input id={`m-desc-${i}`} value={m.description} onChange={(e) => updateMilestone(i, { description: e.target.value })} className={inputClass} />
                </Field>
              </div>
              {milestones.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => touch(setMilestones)(milestones.filter((_, j) => j !== i))}
                >
                  Remove milestone
                </Button>
              )}
            </li>
          ))}
        </ol>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => touch(setMilestones)([...milestones, { title: "", description: "", weeks: 1, amount: 0 }])}
        >
          Add milestone
        </Button>

        <div className="mt-6 grid gap-4 border-t border-line pt-5 md:grid-cols-[150px_1fr]">
          <Field label={`Discount (${currency})`} htmlFor="discount" hint="0 for none.">
            <input
              id="discount"
              type="number"
              min={0}
              step={100}
              inputMode="numeric"
              value={discount / 100}
              onChange={(e) => touch(setDiscount)(toMinor(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Discount shown as" htmlFor="discountNote" optional>
            <input
              id="discountNote"
              value={discountNote}
              maxLength={200}
              placeholder="Discount"
              onChange={(e) => touch(setDiscountNote)(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        {path === "operate" && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field
              label={`Monthly plan after this (${currency})`}
              htmlFor="monthlyAmount"
              hint="What the client pays each month once they accept. Empty uses the rate card. Mention it in the terms too."
            >
              <input
                id="monthlyAmount"
                type="number"
                min={0}
                step={100}
                inputMode="numeric"
                placeholder="Rate card"
                value={monthlyAmount == null ? "" : monthlyAmount / 100}
                onChange={(e) => touch(setMonthlyAmount)(e.target.value === "" ? null : toMinor(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field
              label="First monthly bill on"
              htmlFor="monthlyStartsOn"
              optional
              hint="Then the same day every month, e.g. the 5th. Empty: billed after onboarding."
            >
              <input
                id="monthlyStartsOn"
                type="date"
                value={monthlyStartsOn}
                onChange={(e) => touch(setMonthlyStartsOn)(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Terms</CardTitle>
        <Field label="Commercial terms" htmlFor="terms" hint="Shown to the client exactly as written.">
          <textarea id="terms" rows={5} value={terms} onChange={(e) => touch(setTerms)(e.target.value)} className={inputClass} />
        </Field>
      </Card>

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-card bg-surface/95 p-4 shadow-lg ring-1 ring-line backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm" aria-live="polite">
          {result?.error ? (
            <span className="text-danger">{result.error}</span>
          ) : result?.ok ? (
            <span className="text-success">{result.ok}</span>
          ) : dirty ? (
            <span className="text-muted">Unsaved changes</span>
          ) : (
            <span className="text-muted">All changes saved</span>
          )}
        </div>
        <Button type="button" onClick={save} disabled={pending || !dirty}>
          {pending ? "Saving…" : "Save draft"}
        </Button>
      </div>
      {dirty && (
        <Notice tone="warning">Save the draft before approving — approval uses the saved version.</Notice>
      )}
    </div>
  );
}
