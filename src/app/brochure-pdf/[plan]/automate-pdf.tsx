import { Icon } from "@/components/brochure/icons";
import { ForCurrency, Money } from "@/components/currency";
import { Logo, cx } from "@/components/ui";
import { site } from "@/config/site";
import { AUTOMATE, LAUNCH_SLOTS_PER_MONTH, sumValues } from "@/knowledge/brochures";
import { CASE_STUDIES } from "@/knowledge/case-studies";
import { DEMO_OFFER, STARTING_PRICE, type Priced } from "@/knowledge/pricing";
import type { MonthlyOffer } from "@/server/brochures";
import { LIGHT, PAGE } from "./pages";

// The Automate brochure as four A4 pages: the cover with its flow, a day by
// hand against a day with amfire and six automations, everything included
// with the price and sizes, then safety, the FLOW method, promises and how to start.

const LABEL = "text-[10px] font-semibold tracking-[0.2em] text-[#5a5a5a] uppercase";
const DOTS = "bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:18px_18px]";

const minutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}m` : ""}`.trim() : m === 0 ? "Automatic" : `${m} min`);

export function AutomatePdf({ name, offer }: { name: string; offer: MonthlyOffer }) {
  const price = STARTING_PRICE.automate;
  const offerPrice: Priced = { INR: price.INR - DEMO_OFFER.amount.INR, USD: price.USD - DEMO_OFFER.amount.USD };
  const all = [...AUTOMATE.included, ...AUTOMATE.bonus];
  const host = site.url.replace(/^https?:\/\//, "");
  const byHand = AUTOMATE.day.reduce((t, d) => t + d.byHand, 0);
  const withUs = AUTOMATE.day.reduce((t, d) => t + d.withUs, 0);

  return (
    <>
      {/* Page 1 · cover */}
      <section className={cx(PAGE, "bg-ink text-white")}>
        <div aria-hidden className={cx("absolute inset-0", DOTS)} />
        <div aria-hidden className="bg-brand absolute top-[30%] left-1/2 size-[150mm] -translate-x-1/2 rounded-full opacity-20 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <Logo inverse className="h-8" />
          <p className="text-[10px] tracking-[0.25em] text-white/60 uppercase">Automate brochure</p>
        </div>
        <div className="relative my-auto text-center">
          <h1 className="text-[46px] leading-[1.05] font-semibold tracking-tight">
            {AUTOMATE.hook}
            <br />
            <span className="text-signal">
              From <Money amounts={price} />.
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-[140mm] text-[14px] text-white/75">{AUTOMATE.promise}</p>
          <ol className="mx-auto mt-10 flex max-w-[170mm] items-start rounded-2xl bg-white/5 p-5 ring-1 ring-white/15">
            {AUTOMATE.heroFlow.map((s, i) => (
              <li key={s.label} className="flex flex-1 flex-col">
                <div className="flex items-center">
                  <span className="bg-brand grid size-11 shrink-0 place-items-center rounded-xl text-ink">
                    <Icon name={s.icon} className="size-5" />
                  </span>
                  {i < AUTOMATE.heroFlow.length - 1 && <span className="bg-brand mx-1.5 h-0.5 flex-1 rounded-full" />}
                </div>
                <p className="mt-2 pr-2 text-left text-[10px] text-white/80">{s.label}</p>
              </li>
            ))}
          </ol>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[#22c55e]">
            <Icon name="check" className="size-4" />
            Done — no one typed anything.
          </p>
        </div>
        <p className="relative text-center text-[11px] text-white/50">
          Prepared for {name} · {host}
        </p>
      </section>

      {/* Page 2 · the day, and six automations */}
      <section className={LIGHT}>
        <p className={LABEL}>Same work · two ways</p>
        <h2 className="mt-1 text-[26px] font-semibold">Watch the busywork disappear.</h2>
        <div className="mt-3 rounded-2xl bg-[#f4f4f4] p-4">
          <div className="grid grid-cols-[1fr_32mm_32mm] gap-x-3 text-[10px] font-semibold text-[#5a5a5a]">
            <span />
            <span>By hand</span>
            <span>With amfire</span>
          </div>
          <ul className="mt-1.5 space-y-2">
            {AUTOMATE.day.map((d) => (
              <li key={d.task} className="grid grid-cols-[1fr_32mm_32mm] items-center gap-x-3 text-[11px]">
                <span className="flex items-center gap-1.5 font-medium">
                  <Icon name={d.icon} className="size-3.5 text-signal" />
                  {d.task}
                </span>
                <span>
                  <span className="bg-brand block h-1.5 rounded-full" style={{ width: `${(d.byHand / 120) * 100}%` }} />
                  <span className="text-[9px]">{minutes(d.byHand)}</span>
                </span>
                <span>
                  <span className="block h-1.5 rounded-full bg-[#22c55e]" style={{ width: `${Math.max((d.withUs / 120) * 100, d.withUs ? 3 : 0)}%` }} />
                  <span className="text-[9px] font-semibold text-[#16a34a]">{minutes(d.withUs)}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-[#e6e6e6] pt-2 text-[12px]">
            Every day: <span className="font-semibold text-signal">{minutes(byHand)}</span> by hand →{" "}
            <span className="font-semibold text-[#16a34a]">{minutes(withUs)}</span> with amfire. That&apos;s about{" "}
            <span className="font-semibold">{Math.round(((byHand - withUs) * 26) / 60)} hours back every month.</span>
          </p>
          <p className="text-[9px] text-[#5a5a5a]">An example day for a small trading business. Your walkthrough measures yours.</p>
        </div>

        <p className={cx(LABEL, "mt-5")}>What amfire can run for you</p>
        <div className="mt-2 grid flex-1 grid-cols-2 gap-2.5">
          {AUTOMATE.automations.map((a) => {
            const nodes = [a.trigger, ...a.steps, { icon: "check" as const, label: a.result }];
            return (
              <div key={a.id} className="rounded-2xl bg-ink p-3.5 text-white">
                <p className="text-[13px] font-semibold">{a.title}</p>
                <ol className="mt-2">
                  {nodes.map((n, i) => {
                    const last = i === nodes.length - 1;
                    return (
                      <li key={n.label} className="flex gap-2">
                        <div className="flex flex-col items-center">
                          <span className={cx("grid size-6 shrink-0 place-items-center rounded-lg text-ink", last ? "bg-[#22c55e]" : "bg-brand")}>
                            <Icon name={n.icon} className="size-3.5" />
                          </span>
                          {!last && <span className="bg-brand h-2.5 w-0.5 opacity-60" />}
                        </div>
                        <p className={cx("pt-1 text-[10px]", last && "font-semibold text-[#22c55e]")}>
                          {i === 0 && <span className="font-semibold text-flame">When </span>}
                          {n.label}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-center text-[10px] text-[#5a5a5a]">Works with Tally, WhatsApp, Excel, Google Sheets, Zoho, email and UPI.</p>
      </section>

      {/* Page 3 · everything included, the price, sizes */}
      <section className={LIGHT}>
        <p className={LABEL}>In every automation</p>
        <h2 className="mt-1 text-[26px] font-semibold">Not just a script. All of this.</h2>
        <ul className="mt-3 grid grid-cols-2 gap-1.5">
          {all.map((item, i) => {
            const bonus = i >= AUTOMATE.included.length;
            return (
              <li key={item.id} className={cx("flex items-center gap-2.5 rounded-xl px-3 py-1.5", bonus ? "bg-ink text-white" : "bg-[#f4f4f4]")}>
                <span className="bg-brand grid size-7 shrink-0 place-items-center rounded-lg text-ink">
                  <Icon name={item.icon} className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] leading-tight font-semibold">{item.title}</p>
                  <p className={cx("text-[9px] leading-tight", bonus ? "text-white/70" : "text-[#5a5a5a]")}>{item.body}</p>
                </div>
                <p className="shrink-0 text-[10px] font-semibold tabular-nums">
                  {bonus && <span className="text-flame">Free · </span>}
                  <Money amounts={item.value} />
                </p>
              </li>
            );
          })}
        </ul>
        <div className="relative mt-4 overflow-hidden rounded-2xl bg-ink p-5 text-center text-white">
          <div aria-hidden className="bg-brand absolute -right-10 -bottom-10 size-40 rounded-full opacity-30 blur-2xl" />
          <p className="relative text-[11px] text-white/60">Bought separately, all of this would cost</p>
          <p className="relative text-[28px] font-semibold text-white/40 line-through decoration-signal decoration-[3px]">
            <Money amounts={sumValues(all)} />
          </p>
          <p className="relative text-[11px] text-white/60">With amfire, one automation starts at</p>
          <p className="text-signal relative text-[48px] leading-none font-semibold">
            <Money amounts={price} />
          </p>
          <p className="bg-brand relative mx-auto mt-3 inline-block rounded-full px-4 py-1.5 text-[12px] font-semibold text-ink">
            Only <Money amounts={offerPrice} /> with the free-demo offer
          </p>
        </div>
        <p className={cx(LABEL, "mt-5")}>One step, or the whole process</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {AUTOMATE.tiers.map((t, i) => (
            <div key={t.title} className={cx("rounded-2xl p-3.5", i === 0 ? "bg-ink text-white" : "bg-[#f4f4f4]")}>
              <p className={cx("text-[10px] font-semibold tracking-wider uppercase", i === 0 ? "text-flame" : "text-[#5a5a5a]")}>{t.title}</p>
              <p className="text-[20px] font-semibold">
                from <Money amounts={t.price} />
              </p>
              <ul className="mt-1.5 space-y-1">
                {t.items.map((it) => (
                  <li key={it.title} className="flex items-center gap-1.5 text-[10px]">
                    <Icon name={it.icon} className="size-3.5 text-signal" />
                    {it.title}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-auto pt-2 text-[9px] text-[#5a5a5a]">
          {AUTOMATE.tiersNote} Market values are typical prices charged separately by agencies and freelancers in 2026. <ForCurrency currency="INR">GST extra as applicable.</ForCurrency>
          <ForCurrency currency="USD">Taxes extra where applicable.</ForCurrency>
        </p>
      </section>

      {/* Page 4 · safety, method, promises, start */}
      <section className={LIGHT}>
        <p className={LABEL}>Automatic, never out of control</p>
        <h2 className="mt-1 text-[24px] font-semibold">It does the work. Your people make the calls.</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <ul className="grid grid-cols-2 gap-1.5">
            {AUTOMATE.safety.map((x) => (
              <li key={x.title} className="rounded-xl bg-[#f4f4f4] p-2.5">
                <span className="bg-brand grid size-7 place-items-center rounded-lg text-ink">
                  <Icon name={x.icon} className="size-4" />
                </span>
                <p className="mt-1.5 text-[10px] leading-tight font-semibold">{x.title}</p>
                <p className="mt-0.5 text-[9px] leading-tight text-[#5a5a5a]">{x.body}</p>
              </li>
            ))}
          </ul>
          <ol className="space-y-1 rounded-xl bg-[#0f0f0f] p-3 font-mono text-[8.5px] text-white">
            {AUTOMATE.log.map((l, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-white/35">{l.time}</span>
                <span className={l.kind === "approve" ? "text-flame" : l.kind === "info" ? "text-white/70" : ""}>
                  {l.kind === "ok" ? <span className="text-[#22c55e]">✓ </span> : l.kind === "approve" ? "⚠ " : "→ "}
                  {l.text}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <p className={cx(LABEL, "mt-5")}>
          The <span className="normal-case">amfire</span> FLOW Method · pay only after you approve
        </p>
        <ol className="mt-2 grid grid-cols-4 gap-1.5">
          {AUTOMATE.method.map((m) => (
            <li key={m.letter} className="rounded-xl bg-[#f4f4f4] p-2.5">
              <span className="text-signal text-[28px] leading-none font-bold">{m.letter}</span>
              <p className="mt-1 text-[10px] leading-tight font-semibold">{m.title}</p>
              <p className="mt-1 text-[9px] leading-tight text-signal">{m.pay}</p>
            </li>
          ))}
        </ol>

        <p className={cx(LABEL, "mt-5")}>Our {AUTOMATE.promises.length} promises</p>
        <ul className="mt-2 grid grid-cols-3 gap-1.5">
          {AUTOMATE.promises.map((p) => (
            <li key={p.title} className="flex items-center gap-2 rounded-xl bg-ink p-2 text-white">
              <span className="bg-brand grid size-6 shrink-0 place-items-center rounded-full text-ink">
                <Icon name={p.icon} className="size-3.5" />
              </span>
              <span className="text-[10px] leading-tight">{p.title}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#fff1ea] p-3">
          <span className="bg-brand grid size-8 shrink-0 place-items-center rounded-lg text-ink">
            <Icon name="rocket" className="size-4" />
          </span>
          <div>
            <p className="text-[12px] font-semibold">{AUTOMATE.callout.title}</p>
            <p className="text-[10px] text-[#5a5a5a]">{AUTOMATE.callout.body}</p>
          </div>
        </div>

        <p className={cx(LABEL, "mt-5")}>Real clients · live today</p>
        <ul className="mt-2 grid grid-cols-2 gap-2">
          {CASE_STUDIES.map((c) => (
            <li key={c.slug} className="rounded-xl bg-[#f4f4f4] px-3 py-2">
              <p className="text-[12px] font-semibold">{c.client}</p>
              <p className="text-[10px] text-signal">{c.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</p>
            </li>
          ))}
        </ul>

        <div className="relative mt-auto overflow-hidden rounded-2xl bg-ink p-5 text-white">
          <div aria-hidden className="bg-brand absolute -right-10 -bottom-10 size-40 rounded-full opacity-30 blur-2xl" />
          <p className="relative text-[18px] font-semibold">What should amfire take off your plate first?</p>
          <p className="relative mt-1 text-[11px] text-white/70">
            Book a free walkthrough. Launch prices for the first {LAUNCH_SLOTS_PER_MONTH} clients each month
            {offer.slotsLeft > 0 ? ` — ${offer.slotsLeft} places left this month` : ""}, and save <Money amounts={DEMO_OFFER.amount} /> with the free-demo offer.
          </p>
          <p className="relative mt-3 text-[12px] font-semibold">
            {host}/start · {site.contactPhone} (call or WhatsApp) · {site.contactEmail}
          </p>
        </div>
      </section>
    </>
  );
}
