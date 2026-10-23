"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitDiscoveryAction, type DiscoveryState } from "@/app/actions/discovery";
import { SubmitButton } from "@/components/forms";
import { Button, Field, Notice, cx, inputClass } from "@/components/ui";
import { BUSINESS_TYPES, CALL_TIMES, GOALS, TEAM_SIZES, URGENCY } from "@/knowledge/catalog";
import { Money } from "@/components/currency";
import { DEMO_OFFER } from "@/knowledge/pricing";

const STEPS = ["Your goal", "Your business", "The problem", "Book your demo"] as const;

// Fields that belong to each step, used to jump back to the first step with an error.
const STEP_FIELDS: string[][] = [["goal"], ["businessType", "teamSize", "urgency"], ["problem", "currentTools"], ["name", "email", "phone", "callTime", "company", "consent"]];

type Values = Record<string, string>;

export function DiscoveryForm({ initialGoal }: { initialGoal?: string }) {
  const [state, action] = useActionState<DiscoveryState, FormData>(submitDiscoveryAction, undefined);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>(() =>
    initialGoal && GOALS.some((g) => g.id === initialGoal) ? { goal: initialGoal } : ({} as Values),
  );
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const errors = { ...(state?.errors ?? {}), ...localErrors };
  const set = (name: string, value: string) => {
    setValues((v) => ({ ...v, [name]: value }));
    setLocalErrors((e) => {
      const next = { ...e };
      delete next[name];
      return next;
    });
  };

  // Move focus to the step heading so keyboard and screen reader users follow along.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  // If the server rejects something, return to the first step that needs attention.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    const idx = STEP_FIELDS.findIndex((fields) => fields.some((f) => state?.errors?.[f]));
    if (idx >= 0) setStep(idx);
  }

  function validate(i: number): boolean {
    const e: Record<string, string> = {};
    if (i === 0 && !values.goal) e.goal = "Choose the option closest to what you need.";
    if (i === 1) {
      if (!values.businessType) e.businessType = "Please choose an option.";
      if (!values.urgency) e.urgency = "Please choose an option.";
    }
    if (i === 2 && (values.problem ?? "").trim().length < 20) e.problem = "Tell us a little more — a sentence or two is enough.";
    setLocalErrors(e);
    return Object.keys(e).length === 0;
  }

  const next = () => validate(step) && setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <form action={action} noValidate className="rounded-card bg-surface p-4 ring-1 ring-line sm:p-8">
      {/* Progress */}
      <div className="mb-6 sm:mb-8">
        <p className="text-sm text-muted">
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </p>
        <div className="mt-2 grid grid-cols-4 gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <div key={s} className={cx("h-1.5 rounded-full", i <= step ? "bg-brand" : "bg-subtle")} />
          ))}
        </div>
      </div>

      {state?.formError && (
        <div className="mb-6">
          <Notice tone="error">{state.formError}</Notice>
        </div>
      )}

      {/* Honeypot */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {/* Step 1 — goal */}
      <fieldset hidden={step !== 0} aria-describedby={errors.goal ? "goal-error" : undefined}>
        <legend>
          <h2 ref={step === 0 ? headingRef : undefined} tabIndex={-1} className="scroll-mt-24 text-xl font-semibold focus:outline-none sm:text-2xl">
            What would you most like to improve?
          </h2>
        </legend>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {GOALS.map((g) => (
            <label
              key={g.id}
              className={cx(
                "flex cursor-pointer gap-3 rounded-xl p-4 ring-1 ring-line transition hover:ring-fg/30 has-[:checked]:bg-subtle has-[:checked]:ring-2 has-[:checked]:ring-fg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal",
              )}
            >
              <input
                type="radio"
                name="goal"
                value={g.id}
                checked={values.goal === g.id}
                onChange={() => set("goal", g.id)}
                className="mt-1 accent-signal"
              />
              <span>
                <span className="block font-medium">{g.label}</span>
                <span className="block text-sm text-muted">{g.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {errors.goal && (
          <p id="goal-error" className="mt-3 text-sm text-danger">
            {errors.goal}
          </p>
        )}
      </fieldset>

      {/* Step 2 — business */}
      <div hidden={step !== 1}>
        <h2 ref={step === 1 ? headingRef : undefined} tabIndex={-1} className="scroll-mt-24 text-xl font-semibold focus:outline-none sm:text-2xl">
          A little about your business
        </h2>
        <div className="mt-6 grid gap-6">
          <Field label="What kind of organisation are you?" htmlFor="businessType" error={errors.businessType}>
            <select
              id="businessType"
              name="businessType"
              value={values.businessType ?? ""}
              onChange={(e) => set("businessType", e.target.value)}
              aria-invalid={!!errors.businessType}
              aria-describedby={errors.businessType ? "businessType-error" : undefined}
              className={inputClass}
            >
              <option value="" disabled>
                Choose one
              </option>
              {BUSINESS_TYPES.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </Field>
          <ChoiceGroup name="teamSize" legend="How many people work there?" optional options={TEAM_SIZES} values={values} set={set} error={errors.teamSize} />
          <ChoiceGroup name="urgency" legend="How soon do you need this?" options={URGENCY} values={values} set={set} error={errors.urgency} />
        </div>
      </div>

      {/* Step 3 — problem */}
      <div hidden={step !== 2}>
        <h2 ref={step === 2 ? headingRef : undefined} tabIndex={-1} className="scroll-mt-24 text-xl font-semibold focus:outline-none sm:text-2xl">
          Describe the problem in your own words
        </h2>
        <div className="mt-6 grid gap-6">
          <Field
            label="What is getting in the way?"
            htmlFor="problem"
            hint="Plain words are perfect — e.g. “We re-type every order from email into our spreadsheet and the accounts system.”"
            error={errors.problem}
          >
            <textarea
              id="problem"
              name="problem"
              rows={6}
              value={values.problem ?? ""}
              onChange={(e) => set("problem", e.target.value)}
              aria-invalid={!!errors.problem}
              aria-describedby={cx("problem-hint", errors.problem && "problem-error")}
              className={inputClass}
            />
          </Field>
          <Field label="Which tools or systems do you use today?" htmlFor="currentTools" optional hint="For example: Excel, Xero, Shopify, an in-house system.">
            <input
              id="currentTools"
              name="currentTools"
              value={values.currentTools ?? ""}
              onChange={(e) => set("currentTools", e.target.value)}
              aria-describedby="currentTools-hint"
              className={inputClass}
            />
          </Field>
        </div>
      </div>

      {/* Step 4 — contact */}
      <div hidden={step !== 3}>
        <h2 ref={step === 3 ? headingRef : undefined} tabIndex={-1} className="scroll-mt-24 text-xl font-semibold focus:outline-none sm:text-2xl">
          Where should we call you for your free demo?
        </h2>
        <p className="mt-2 text-sm text-muted">
          A 30-minute call to understand your business. Free, with no obligation — and your <Money amounts={DEMO_OFFER.amount} /> promo code appears as soon as you book.
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Your name" htmlFor="name" error={errors.name}>
            <input id="name" name="name" autoComplete="name" value={values.name ?? ""} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} className={inputClass} />
          </Field>
          <Field label="Work email" htmlFor="email" error={errors.email}>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={values.email ?? ""}
              onChange={(e) => set("email", e.target.value)}
              aria-invalid={!!errors.email}
              className={inputClass}
            />
          </Field>
          <Field label="Mobile / WhatsApp" htmlFor="phone" optional hint="So we can call or WhatsApp to fix a time." error={errors.phone}>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="98765 43210"
              value={values.phone ?? ""}
              onChange={(e) => set("phone", e.target.value)}
              aria-invalid={!!errors.phone}
              aria-describedby="phone-hint"
              className={inputClass}
            />
          </Field>
          <Field label="Best time to call" htmlFor="callTime" optional>
            <select id="callTime" name="callTime" value={values.callTime ?? ""} onChange={(e) => set("callTime", e.target.value)} className={inputClass}>
              <option value="">No preference</option>
              {CALL_TIMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Business name" htmlFor="company" error={errors.company}>
              <input
                id="company"
                name="company"
                autoComplete="organization"
                value={values.company ?? ""}
                onChange={(e) => set("company", e.target.value)}
                aria-invalid={!!errors.company}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <label className="flex gap-3 text-sm">
              <input
                type="checkbox"
                name="consent"
                checked={values.consent === "on"}
                onChange={(e) => set("consent", e.target.checked ? "on" : "")}
                aria-invalid={!!errors.consent}
                aria-describedby={errors.consent ? "consent-error" : undefined}
                className="mt-0.5 size-4 shrink-0 accent-signal"
              />
              <span>
                Store my answers and contact details so AMFIRE can review them and contact me about the demo. Answers may be analysed with AI-assisted tools to prepare a
                recommendation; a person reviews it before anything is proposed.
              </span>
            </label>
            {errors.consent && (
              <p id="consent-error" className="mt-1.5 text-sm text-danger">
                {errors.consent}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation — one primary action per step */}
      <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5 sm:mt-10 sm:pt-6">
        {step > 0 ? (
          <Button type="button" variant="ghost" size="lg" onClick={back} className="px-3 sm:px-7">
            ← Back
          </Button>
        ) : (
          <span />
        )}
        {step < STEPS.length - 1 ? (
          <Button type="button" size="lg" onClick={next} className="flex-1 sm:flex-none">
            Continue
          </Button>
        ) : (
          <SubmitButton pendingLabel="Booking…" size="lg" className="flex-1 whitespace-normal text-center leading-tight sm:flex-none">
            <span>
              Book my free demo · get <Money amounts={DEMO_OFFER.amount} /> off
            </span>
          </SubmitButton>
        )}
      </div>
    </form>
  );
}

function ChoiceGroup({
  name,
  legend,
  options,
  values,
  set,
  error,
  optional,
}: {
  name: string;
  legend: string;
  options: readonly { id: string; label: string }[];
  values: Values;
  set: (name: string, value: string) => void;
  error?: string;
  optional?: boolean;
}) {
  return (
    <fieldset aria-describedby={error ? `${name}-error` : undefined}>
      <legend className="text-sm font-medium">
        {legend}
        {optional && <span className="font-normal text-muted"> (optional)</span>}
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.id}
            className="cursor-pointer rounded-full px-4 py-2.5 text-sm ring-1 ring-line transition hover:ring-fg/30 has-[:checked]:bg-ink has-[:checked]:text-white has-[:checked]:ring-fg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal"
          >
            <input type="radio" name={name} value={o.id} checked={values[name] === o.id} onChange={() => set(name, o.id)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={`${name}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
