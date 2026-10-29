"use client";

import { useState } from "react";
import { useCurrency } from "@/components/currency";
import { cx } from "@/components/ui";
import { HIRING } from "@/knowledge/catalog";
import { formatMoney, type Priced } from "@/knowledge/pricing";

/** Compares the salary cost of an in-house tech team with amfire's starting Operate plan, in the visitor's currency. */
export function HireVsAmfire({ startingPrice }: { startingPrice: Priced }) {
  const [roles, setRoles] = useState<string[]>(["developer", "marketer", "social"]);
  const [level, setLevel] = useState<"fresher" | "experienced">("fresher");
  const currency = useCurrency();
  const salary = HIRING.salary[currency];
  const money = (n: number) => formatMoney(n * 100, currency);
  const startingMonthly = startingPrice[currency] / 100;

  const perPerson = salary[level];
  const inHouse = roles.length * perPerson;
  const max = Math.max(inHouse, startingMonthly, 1);

  function toggle(id: string) {
    setRoles((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));
  }

  return (
    <div className="grid gap-6 rounded-[1.5rem] bg-surface p-5 ring-1 ring-line sm:p-8 lg:grid-cols-[1fr_1fr]">
      <div>
        <fieldset>
          <legend className="text-sm font-semibold">Who would you need to hire?</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {HIRING.roles.map((r) => (
              <label
                key={r.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-sm ring-1 ring-line transition hover:ring-fg/30 has-[:checked]:bg-subtle has-[:checked]:ring-2 has-[:checked]:ring-fg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal"
              >
                <input type="checkbox" checked={roles.includes(r.id)} onChange={() => toggle(r.id)} className="size-4 accent-signal" />
                {r.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-6">
          <legend className="text-sm font-semibold">Experience level</legend>
          <div className="mt-3 inline-grid grid-cols-2 gap-1 rounded-full bg-subtle p-1 ring-1 ring-line">
            {(["fresher", "experienced"] as const).map((l) => (
              <label
                key={l}
                className="cursor-pointer rounded-full px-4 py-2 text-center text-sm font-medium has-[:checked]:bg-fg has-[:checked]:text-page has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal"
              >
                <input type="radio" name="level" value={l} checked={level === l} onChange={() => setLevel(l)} className="sr-only" />
                {l === "fresher" ? salary.fresherLabel : salary.experiencedLabel}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="mt-6 text-xs text-muted">
          Typical monthly salaries in {salary.region}. Hiring also means recruitment time, leave cover, training, laptops, software
          licences and finding a replacement when someone leaves.
        </p>
      </div>

      <div className="flex flex-col justify-center gap-6" aria-live="polite">
        <Bar label={`In-house team (${roles.length} ${roles.length === 1 ? "person" : "people"})`} value={money(inHouse)} share={inHouse / max} tone="muted" />
        <Bar label="amfire Operate" value={money(startingMonthly)} share={startingMonthly / max} tone="brand" prefix="from " />
        <div className="rounded-2xl bg-ink p-5 text-white">
          {inHouse > startingMonthly ? (
            <>
              <p className="text-sm text-white/70">Compared with our starting plan, that&apos;s up to</p>
              <p className="text-brand text-3xl font-semibold tracking-tight">{money((inHouse - startingMonthly) * 12)} a year</p>
              <p className="mt-1 text-sm text-white/70">you keep — with a whole team&apos;s skills instead of one person&apos;s.</p>
            </>
          ) : (
            <p className="text-sm text-white/80">Pick the roles you&apos;d otherwise hire to compare.</p>
          )}
          <p className="mt-3 text-xs text-white/50">Your plan is priced for exactly what we manage for you.</p>
        </div>
      </div>
    </div>
  );
}

function Bar({ label, value, share, tone, prefix = "" }: { label: string; value: string; share: number; tone: "muted" | "brand"; prefix?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted">{label}</span>
        <span className="text-lg font-semibold tabular-nums">
          {prefix}
          {value}
          <span className="text-xs font-normal text-muted"> /month</span>
        </span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-subtle ring-1 ring-line/60">
        <div
          className={cx("h-full rounded-full transition-[width] duration-500", tone === "brand" ? "bg-brand" : "bg-fg/70")}
          style={{ width: `${Math.max(4, share * 100)}%` }}
        />
      </div>
    </div>
  );
}
