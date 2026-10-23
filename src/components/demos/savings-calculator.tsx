"use client";

import { useId, useState } from "react";

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const WORKING_DAYS = 26;
const HOURS_PER_DAY = 9;

/** Estimates the time and salary cost of manual work today — not a promise of savings. */
export function SavingsCalculator() {
  const [people, setPeople] = useState(3);
  const [hours, setHours] = useState(3);
  const [salary, setSalary] = useState(25000);
  const id = useId();

  const monthlyHours = Math.round(people * hours * WORKING_DAYS);
  const yearlyCost = Math.round(people * salary * 12 * (hours / HOURS_PER_DAY));

  return (
    <div className="grid gap-6 rounded-[1.5rem] bg-surface p-5 ring-1 ring-line sm:p-8 lg:grid-cols-[1fr_0.9fr]">
      <div className="space-y-6">
        <Slider id={`${id}-p`} label="People doing this work" value={people} min={1} max={25} step={1} display={`${people}`} onChange={setPeople} />
        <Slider id={`${id}-h`} label="Hours each spends on it per day" value={hours} min={0.5} max={8} step={0.5} display={`${hours} h`} onChange={setHours} />
        <Slider
          id={`${id}-s`}
          label="Monthly salary per person"
          value={salary}
          min={10000}
          max={100000}
          step={1000}
          display={inr(salary)}
          onChange={setSalary}
        />
      </div>
      <div className="relative overflow-hidden rounded-2xl bg-ink p-6 text-white" aria-live="polite">
        <div aria-hidden className="bg-brand absolute -top-20 -right-16 size-56 rounded-full opacity-30 blur-3xl" />
        <p className="relative text-sm text-white/70">Time spent on this work today</p>
        <p className="relative mt-1 text-4xl font-semibold tracking-tight">{monthlyHours.toLocaleString("en-IN")} hours</p>
        <p className="relative text-sm text-white/70">every month</p>
        <div className="relative mt-6 border-t border-white/15 pt-5">
          <p className="text-sm text-white/70">Salary cost of that time</p>
          <p className="text-brand mt-1 text-3xl font-semibold tracking-tight">{inr(yearlyCost)}</p>
          <p className="text-sm text-white/70">a year</p>
        </div>
        <p className="relative mt-6 text-xs text-white/55">
          An estimate of today&apos;s cost based on {WORKING_DAYS} working days and {HOURS_PER_DAY}-hour days — not a promise of savings.
          We measure the real figure with you before recommending anything.
        </p>
      </div>
    </div>
  );
}

function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <span className="text-lg font-semibold tabular-nums">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-signal"
      />
    </div>
  );
}
