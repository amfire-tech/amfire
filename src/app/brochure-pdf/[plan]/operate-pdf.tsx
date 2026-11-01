import Image from "next/image";
import { Flame } from "@/components/brochure/art";
import { Icon } from "@/components/brochure/icons";
import { ForCurrency, Money } from "@/components/currency";
import { Logo, cx } from "@/components/ui";
import { site } from "@/config/site";
import { LAUNCH_SLOTS_PER_MONTH, OPERATE, OPERATE_BUILD_MIN_MONTHS, sumCosts, type OperateCell } from "@/knowledge/brochures";
import { CASE_STUDIES } from "@/knowledge/case-studies";
import { DEMO_OFFER, STARTING_PRICE, type Priced } from "@/knowledge/pricing";
import type { MonthlyOffer } from "@/server/brochures";
import { LIGHT, PAGE } from "./pages";

// The Operate brochure as four A4 pages: the cover, the six services in full,
// the maths (team cost and the same-money comparison), then the 3-month bonus,
// how a month runs, promises, real work and how to start.

const LABEL = "text-[10px] font-semibold tracking-[0.2em] text-[#5a5a5a] uppercase";

function Cell({ value, ours }: { value: OperateCell; ours: boolean }) {
  if (value === true) return <Icon name="check" className={cx("mx-auto size-4", ours ? "text-signal" : "text-[#5a5a5a]")} />;
  if (value === false) return <span className="text-[#b0b0b0]">✕</span>;
  return <span className={ours ? "font-semibold" : "text-[#5a5a5a]"}>{value}</span>;
}

export function OperatePdf({ name, offer }: { name: string; offer: MonthlyOffer }) {
  const price = STARTING_PRICE.operate;
  const offerPrice: Priced = {
    INR: price.INR - DEMO_OFFER.amount.INR,
    USD: price.USD - DEMO_OFFER.amount.USD,
  };
  const team = sumCosts(OPERATE.roles);
  const saving: Priced = {
    INR: team.INR - price.INR,
    USD: team.USD - price.USD,
  };
  const host = site.url.replace(/^https?:\/\//, "");

  return (
    <>
      {/* Page 1 · cover */}
      <section className={cx(PAGE, "bg-ink text-white")}>
        <div aria-hidden className="bg-brand absolute top-[30%] left-1/2 size-[150mm] -translate-x-1/2 rounded-full opacity-25 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <Logo inverse className="h-8" />
          <p className="text-[10px] tracking-[0.25em] text-white/60 uppercase">Operate brochure</p>
        </div>
        <div className="relative my-auto text-center">
          <Flame className="mx-auto h-32 w-auto" />
          <h1 className="mt-6 text-[46px] leading-[1.05] font-semibold tracking-tight">
            {OPERATE.hook}
            <br />
            <span className="text-signal">
              <Money amounts={price} /> a month.
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-[140mm] text-[14px] text-white/75">{OPERATE.promise}</p>
          <ul className="mx-auto mt-8 grid max-w-[150mm] grid-cols-3 gap-2">
            {OPERATE.services.map((s) => (
              <li key={s.id} className="rounded-xl bg-white/8 px-3 py-2.5 ring-1 ring-white/15">
                <p className="text-[24px] leading-none font-semibold text-flame">{s.stat}</p>
                <p className="mt-1 text-[10px] text-white/70">{s.statLabel}</p>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-center text-[11px] text-white/50">
          Prepared for {name} · {host}
        </p>
      </section>

      {/* Page 2 · the six services */}
      <section className={LIGHT}>
        <p className={LABEL}>Every month, for one fee</p>
        <h2 className="mt-1 text-[26px] font-semibold">Six jobs, done for you. Every month.</h2>
        <div className="mt-4 grid flex-1 grid-cols-2 gap-3">
          {OPERATE.services.map((s) => (
            <div key={s.id} className="flex flex-col rounded-2xl bg-[#f4f4f4] p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink text-flame">
                  <Icon name={s.icon} className="size-5" />
                </span>
                <p className="leading-none">
                  <span className="text-signal text-[28px] font-bold">{s.stat}</span> <span className="text-[11px] font-medium text-[#5a5a5a]">{s.statLabel}</span>
                </p>
              </div>
              <p className="mt-2 text-[14px] font-semibold">{s.title}</p>
              <p className="text-[11px] text-[#5a5a5a]">{s.line}</p>
              <ul className="mt-2 space-y-1 text-[11px]">
                {s.includes.map((x) => (
                  <li key={x} className="flex gap-1.5">
                    <Icon name="check" className="mt-px size-3.5 shrink-0 text-signal" />
                    {x}
                  </li>
                ))}
              </ul>
              {"note" in s && s.note && <p className="mt-auto pt-2 text-[10px] font-medium text-signal">{s.note}</p>}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold text-[#5a5a5a]">Also in the plan:</span>
          {OPERATE.alsoIncluded.map((a) => (
            <span key={a.title} className="flex items-center gap-1 rounded-full bg-[#f4f4f4] px-2.5 py-1 text-[10px]">
              <Icon name={a.icon} className="size-3.5 text-signal" />
              {a.title}
            </span>
          ))}
        </div>
      </section>

      {/* Page 3 · the maths */}
      <section className={LIGHT}>
        <p className={LABEL}>Do the maths</p>
        <h2 className="mt-1 text-[26px] font-semibold">To get all this, you&apos;d hire five people.</h2>
        <ul className="mt-3 space-y-1.5">
          {OPERATE.roles.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-xl bg-[#f4f4f4] px-3 py-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink text-flame">
                <Icon name={r.icon} className="size-4" />
              </span>
              <p className="flex-1 text-[12px] font-semibold">
                {r.title} <span className="font-normal text-[#5a5a5a]">· {r.does}</span>
              </p>
              <p className="text-[12px] font-semibold tabular-nums">
                <Money amounts={r.cost} />
                <span className="font-normal text-[#5a5a5a]">/month</span>
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl p-3 ring-1 ring-[#e6e6e6]">
            <p className="text-[10px] text-[#5a5a5a]">Hiring them</p>
            <p className="text-[20px] font-semibold text-[#9a9a9a] line-through decoration-signal decoration-2">
              <Money amounts={team} />
            </p>
          </div>
          <div className="rounded-xl bg-ink p-3 text-white">
            <p className="text-[10px] text-white/60">
              <span className="normal-case">amfire</span>
            </p>
            <p className="text-signal text-[20px] font-semibold">
              <Money amounts={price} />
            </p>
          </div>
          <div className="rounded-xl bg-[#fff1ea] p-3">
            <p className="text-[10px] text-[#5a5a5a]">You save every month</p>
            <p className="text-[20px] font-semibold">
              <Money amounts={saving} />
            </p>
          </div>
        </div>
        <p className="mt-1 text-[9px] text-[#5a5a5a]">
          <ForCurrency currency="INR">Typical Pune salaries in 2026, before PF, software and office costs.</ForCurrency>
          <ForCurrency currency="USD">Typical freelance rates in 2026.</ForCurrency>
        </p>

        <p className={cx(LABEL, "mt-6")}>Same money · three choices</p>
        <table className="mt-2 w-full table-fixed border-separate border-spacing-0 text-[11px]">
          <colgroup>
            <col className="w-[40%]" />
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
                <th key={c} scope="col" className={cx("px-1 py-2 text-center font-semibold", i === 0 ? "rounded-t-xl bg-ink text-flame" : "text-[#5a5a5a]")}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {OPERATE.compare.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="border-t border-[#e6e6e6] py-1.5 pr-2 text-left font-medium">
                  {row.label}
                </th>
                {row.cells.map((v, i) => (
                  <td key={i} className={cx("border-t px-1 py-1.5 text-center", i === 0 ? "border-[#ffd9cf] bg-[#fff1ea]" : "border-[#e6e6e6]")}>
                    <Cell value={v} ours={i === 0} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="relative mt-auto overflow-hidden rounded-2xl bg-ink p-5 text-center text-white">
          <div aria-hidden className="bg-brand absolute -right-10 -bottom-10 size-40 rounded-full opacity-30 blur-2xl" />
          <p className="relative text-[11px] text-white/60">Your whole digital team, with amfire</p>
          <p className="relative text-[48px] leading-none font-semibold">
            <span className="text-signal">
              <Money amounts={price} />
            </span>
            <span className="text-[18px] font-normal text-white/60">/month</span>
          </p>
          <p className="bg-brand relative mx-auto mt-3 inline-block rounded-full px-4 py-1.5 text-[12px] font-semibold text-ink">
            Only <Money amounts={offerPrice} /> for your first month with the free-demo offer
          </p>
          <p className="relative mt-2 text-[10px] text-white/60">
            Reels and videos? Let&apos;s talk — we quote them separately. <ForCurrency currency="INR">GST extra as applicable.</ForCurrency>
            <ForCurrency currency="USD">Taxes extra where applicable.</ForCurrency>
          </p>
        </div>
      </section>

      {/* Page 4 · bonus, how it runs, promises, work, start */}
      <section className={LIGHT}>
        <div className="relative overflow-hidden rounded-2xl bg-ink p-5 text-white">
          <div aria-hidden className="bg-brand absolute -right-12 -bottom-12 size-44 rounded-full opacity-25 blur-2xl" />
          <p className="relative text-[11px] font-semibold tracking-widest text-flame uppercase">The {OPERATE_BUILD_MIN_MONTHS}-month bonus</p>
          <p className="relative mt-1 text-[22px] font-semibold">Stay {OPERATE_BUILD_MIN_MONTHS} months. New builds are on us.</p>
          <p className="relative text-[11px] text-white/70">
            New software, apps and automations normally start at <Money amounts={STARTING_PRICE.build} /> each. On a {OPERATE_BUILD_MIN_MONTHS}-month plan, they come with your monthly fee.
          </p>
          <ul className="relative mt-3 grid grid-cols-3 gap-1.5">
            {OPERATE.builds.map((b) => (
              <li key={b.title} className="bg-brand flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-ink">
                <Icon name={b.icon} className="size-3.5" />
                {b.title}
              </li>
            ))}
          </ul>
          <p className="relative mt-2 text-[9px] text-white/50">{OPERATE.buildsNote}</p>
        </div>

        <p className={cx(LABEL, "mt-5")}>How every month runs · after a free review</p>
        <ol className="mt-2 grid grid-cols-4 gap-1.5">
          {OPERATE.month.map((m, i) => (
            <li key={m.title} className="rounded-xl bg-[#f4f4f4] p-2.5">
              <span className="bg-brand grid size-6 place-items-center rounded-full text-[11px] font-bold text-ink">{i + 1}</span>
              <p className="mt-1.5 text-[9px] font-semibold tracking-wider text-signal uppercase">{m.when}</p>
              <p className="text-[11px] leading-tight font-semibold">{m.title}</p>
              <p className="mt-0.5 text-[9px] leading-tight text-[#5a5a5a]">{m.body}</p>
            </li>
          ))}
        </ol>

        <p className={cx(LABEL, "mt-5")}>Our {OPERATE.promises.length} promises</p>
        <ul className="mt-2 grid grid-cols-3 gap-1.5">
          {OPERATE.promises.map((p) => (
            <li key={p.title} className="flex items-center gap-2 rounded-xl bg-ink p-2 text-white">
              <span className="bg-brand grid size-6 shrink-0 place-items-center rounded-full text-ink">
                <Icon name={p.icon} className="size-3.5" />
              </span>
              <span className="text-[10px] leading-tight">{p.title}</span>
            </li>
          ))}
        </ul>

        <p className={cx(LABEL, "mt-5")}>Real clients · live today</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {CASE_STUDIES.map((c) => (
            <div key={c.slug} className="overflow-hidden rounded-2xl bg-ink text-white">
              <div className="relative h-[44mm]">
                <Image src={c.cover} alt={c.coverAlt} fill sizes="100mm" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" />
                <p className="absolute bottom-2 left-3 text-[14px] font-semibold">{c.client}</p>
              </div>
              <p className="px-3 py-2 text-[10px] text-flame">{c.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</p>
            </div>
          ))}
        </div>

        <div className="relative mt-auto overflow-hidden rounded-2xl bg-ink p-5 text-white">
          <div aria-hidden className="bg-brand absolute -right-10 -bottom-10 size-40 rounded-full opacity-30 blur-2xl" />
          <p className="relative text-[18px] font-semibold">Start with a free review of what you have today.</p>
          <p className="relative mt-1 text-[11px] text-white/70">
            Launch prices for the first {LAUNCH_SLOTS_PER_MONTH} clients each month
            {offer.slotsLeft > 0 ? ` — ${offer.slotsLeft} places left this month` : ""}
            . Book a free session and save <Money amounts={DEMO_OFFER.amount} />.
          </p>
          <p className="relative mt-3 text-[12px] font-semibold">
            {host}/start · {site.contactPhone} (call or WhatsApp) · {site.contactEmail}
          </p>
        </div>
      </section>
    </>
  );
}
