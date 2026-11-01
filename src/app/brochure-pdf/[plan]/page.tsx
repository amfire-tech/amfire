import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Flame, Shopper } from "@/components/brochure/art";
import { Icon } from "@/components/brochure/icons";
import { ForCurrency, Money } from "@/components/currency";
import { Logo, cx } from "@/components/ui";
import { site } from "@/config/site";
import { getDb } from "@/db";
import { EARLY_CLIENTS, LAUNCH_SLOTS_PER_MONTH, REVISIONS, brochureFor, sumValues, type CartItem } from "@/knowledge/brochures";
import { CASE_STUDIES } from "@/knowledge/case-studies";
import { SERVICES } from "@/knowledge/catalog";
import { DEMO_OFFER, STARTING_PRICE, type Priced } from "@/knowledge/pricing";
import { BROCHURE_COOKIE, monthlyOffer, readAccessCookie } from "@/server/brochures";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Brochure (PDF)", robots: { index: false } };

// The brochure as four A4 pages, for "Download as PDF". Same content and the
// same visitor currency as the interactive page; unlocked by the same cookie.

// Gradient-clipped text prints as an outlined box, so pages use solid brand colours.
const PAGE = "relative mx-auto flex h-[297mm] w-[210mm] flex-col overflow-hidden p-[14mm] shadow-xl break-after-page print:shadow-none";
const LIGHT = cx(PAGE, "bg-white text-ink");

function Row({ item, title, bonus }: { item: CartItem; title?: string; bonus?: boolean }) {
  return (
    <li className={cx("flex items-center gap-3 rounded-xl px-3 py-2", bonus ? "bg-ink text-white" : "bg-[#f4f4f4]")}>
      <span className="bg-brand grid size-8 shrink-0 place-items-center rounded-lg text-ink">
        <Icon name={item.icon} className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] leading-tight font-semibold">{title ?? item.title}</p>
        <p className={cx("text-[10px] leading-tight", bonus ? "text-white/70" : "text-[#5a5a5a]")}>{item.body}</p>
      </div>
      <p className="shrink-0 text-[11px] font-semibold tabular-nums">
        {bonus ? <span className="text-flame">Free · </span> : null}
        <Money amounts={item.value} />
      </p>
    </li>
  );
}

export default async function BrochurePdfPage({ params }: PageProps<"/brochure-pdf/[plan]">) {
  const { plan } = await params;
  const brochure = brochureFor(plan);
  if (!brochure) notFound();
  const access = readAccessCookie((await cookies()).get(BROCHURE_COOKIE)?.value);
  if (!access) redirect(`/brochure/${brochure.path}`);

  const offer = await monthlyOffer(await getDb());
  const price = STARTING_PRICE[brochure.path];
  const offerPrice: Priced = { INR: price.INR - DEMO_OFFER.amount.INR, USD: price.USD - DEMO_OFFER.amount.USD };
  const total = sumValues([...brochure.cart, ...brochure.bonus]);
  const name = SERVICES[brochure.path].name;
  const work = CASE_STUDIES;
  const month = brochure.perMonth ? " a month" : "";

  return (
    <div className="min-h-screen bg-[#e9e9e9] py-8 print:bg-white print:py-0">
      <style>{`@page { size: A4; margin: 0 } html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`}</style>
      <div className="sticky top-0 z-10 mx-auto mb-6 flex w-[210mm] max-w-full items-center justify-between gap-3 rounded-full bg-white px-4 py-2 shadow print:hidden">
        <Link href={`/brochure/${brochure.path}`} className="text-sm text-[#5a5a5a] hover:text-ink">
          ← Back to the interactive brochure
        </Link>
        <PrintButton plan={brochure.path} />
      </div>

      <div className="space-y-8 print:space-y-0">
        {/* Page 1 · cover */}
        <section className={cx(PAGE, "bg-ink text-white")}>
          <div aria-hidden className="bg-brand absolute top-[35%] left-1/2 size-[150mm] -translate-x-1/2 rounded-full opacity-25 blur-3xl" />
          <div className="relative flex items-center justify-between">
            <Logo inverse className="h-8" />
            <p className="text-[10px] tracking-[0.25em] text-white/60 uppercase">{name} brochure</p>
          </div>
          <div className="relative my-auto text-center">
            <Flame className="mx-auto h-40 w-auto" />
            <h1 className="mt-6 text-[44px] leading-[1.05] font-semibold tracking-tight">
              <span className="text-signal">
                <Money amounts={price} />
                {month}.
              </span>
              <br />
              {brochure.hook}
            </h1>
            <p className="mx-auto mt-4 max-w-[120mm] text-white/70">Same budget, two shopping carts. Here&apos;s everything that lands in yours.</p>
          </div>
          <p className="relative text-center text-[11px] text-white/50">Prepared for {access.name} · {site.url.replace(/^https?:\/\//, "")}</p>
        </section>

        {/* Page 2 · the comparison and the cart */}
        <section className={LIGHT}>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-[#5a5a5a] uppercase">Same money · two carts</p>
          <h2 className="mt-1 text-[24px] font-semibold">
            What does <Money amounts={price} />
            {month} get you?
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-2xl p-3 ring-2 ring-signal">
              <p className="text-center text-[11px] font-semibold tracking-widest text-signal">amfire</p>
              <Shopper boxes={12} tone="amfire" className="mx-auto h-[38mm]" />
              <p className="text-center text-[12px] font-semibold">{brochure.cart.length + brochure.bonus.length} things in the cart</p>
            </div>
            <div className="rounded-2xl p-3 ring-1 ring-[#e6e6e6]">
              <p className="text-center text-[11px] font-semibold tracking-widest text-[#5a5a5a] uppercase">{brochure.rivalLabel}</p>
              <Shopper boxes={2} tone="rival" className="mx-auto h-[38mm]" />
              <p className="text-center text-[11px]">
                {brochure.rival.got.join(" · ")} — <span className="text-signal">everything else is extra</span>
              </p>
            </div>
          </div>
          <p className="mt-5 text-[10px] font-semibold tracking-[0.2em] text-[#5a5a5a] uppercase">Your <span className="normal-case">amfire</span> cart</p>
          <ul className="mt-2 grid grid-cols-2 gap-1.5">
            {brochure.cart.map((item) => (
              <Row key={item.id} item={item} title={item.id === "revisions" ? `${offer.revisions} design revision rounds` : undefined} />
            ))}
          </ul>
          <p className="mt-auto pt-3 text-[9px] text-[#5a5a5a]">
            Values are typical prices charged separately by agencies and freelancers in 2026.
            {brochure.cart.some((i) => i.id === "revisions") &&
              ` ${REVISIONS.early} revision rounds for the first ${EARLY_CLIENTS} clients each month, ${REVISIONS.later} after that.`}
          </p>
        </section>

        {/* Page 3 · cart full, the price, bigger shelves */}
        <section className={LIGHT}>
          <div className="rounded-2xl bg-ink p-5 text-center text-white">
            <p className="text-[11px] font-semibold tracking-widest text-flame uppercase">The cart is full</p>
            <p className="mt-1 text-[20px] font-semibold">Adding more should cost more, right?</p>
            <p className="text-signal mt-1 text-[28px] font-semibold">Not at amfire.</p>
          </div>
          <ul className="mt-3 space-y-1.5">
            {brochure.bonus.map((item) => (
              <Row key={item.id} item={item} bonus />
            ))}
          </ul>
          <div className="mt-6 text-center">
            <p className="text-[11px] text-[#5a5a5a]">Bought separately, it would cost{brochure.perMonth ? " every month" : ""}</p>
            <p className="text-[34px] font-semibold text-[#9a9a9a] line-through decoration-signal decoration-[3px]">
              <Money amounts={total} />
            </p>
            <p className="mt-2 text-[11px] text-[#5a5a5a]">With amfire, you pay</p>
            <p className="text-[56px] leading-none font-semibold">
              <span className="text-signal">
                <Money amounts={price} />
              </span>
              {brochure.perMonth && <span className="text-[20px] font-normal text-[#5a5a5a]">/month</span>}
            </p>
            <p className="bg-brand mx-auto mt-3 inline-block rounded-full px-4 py-1.5 text-[12px] font-semibold text-ink">
              Only <Money amounts={offerPrice} />
              {brochure.perMonth ? " for your first month" : ""} with the free-demo offer
            </p>
            <p className="mx-auto mt-2 max-w-[140mm] text-[10px] text-[#5a5a5a]">
              {brochure.scopeNote} <ForCurrency currency="INR">GST extra as applicable.</ForCurrency>
              <ForCurrency currency="USD">Taxes extra where applicable.</ForCurrency>
            </p>
          </div>
          <p className="mt-6 text-[10px] font-semibold tracking-[0.2em] text-[#5a5a5a] uppercase">Need a bigger cart?</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {brochure.shelves.map((shelf) => (
              <div key={shelf.title} className="rounded-2xl bg-[#f4f4f4] p-4">
                <p className="text-[11px] font-semibold text-[#5a5a5a] uppercase">{shelf.title}</p>
                <p className="text-[22px] font-semibold">
                  from <Money amounts={shelf.price} />
                  {brochure.perMonth && <span className="text-[13px] font-normal text-[#5a5a5a]">/month</span>}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {shelf.items.map((it) => (
                    <li key={it.title} className="flex items-center gap-2 text-[11px]">
                      <Icon name={it.icon} className="size-4 text-signal" />
                      {it.title}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 h-1.5 rounded-full bg-[#3a2a20]" />
              </div>
            ))}
          </div>
        </section>

        {/* Page 4 · real work, method, promises, next step */}
        <section className={LIGHT}>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-[#5a5a5a] uppercase">Real clients · live today</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {work.map((c) => (
              <div key={c.slug} className="overflow-hidden rounded-2xl bg-ink text-white">
                <div className="relative h-[30mm]">
                  <Image src={c.cover} alt={c.coverAlt} fill sizes="100mm" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" />
                  <p className="absolute bottom-2 left-3 text-[15px] font-semibold">{c.client}</p>
                </div>
                <div className="p-3">
                  <p className="text-[10px] text-white/80">{c.title}</p>
                  <p className="mt-1 text-[10px] text-flame">{c.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-[10px] font-semibold tracking-[0.2em] text-[#5a5a5a] uppercase">The <span className="normal-case">amfire</span> {brochure.methodName} Method</p>
          <ol className={cx("mt-2 grid gap-1.5", brochure.method.length === 3 ? "grid-cols-3" : brochure.method.length === 4 ? "grid-cols-4" : "grid-cols-5")}>
            {brochure.method.map((m) => (
              <li key={m.letter} className="rounded-xl bg-[#f4f4f4] p-2.5">
                <span className="text-signal text-[28px] leading-none font-bold">{m.letter}</span>
                <p className="mt-1 text-[10px] leading-tight font-semibold">{m.title}</p>
                {m.pay && <p className="mt-1 text-[9px] leading-tight text-signal">{m.pay}</p>}
              </li>
            ))}
          </ol>
          <p className="mt-5 text-[10px] font-semibold tracking-[0.2em] text-[#5a5a5a] uppercase">Our {brochure.promises.length} promises</p>
          <ul className="mt-2 grid grid-cols-4 gap-1.5">
            {brochure.promises.map((p) => (
              <li key={p.title} className="flex items-center gap-2 rounded-xl bg-ink p-2 text-white">
                <span className="bg-brand grid size-6 shrink-0 place-items-center rounded-full text-ink">
                  <Icon name={p.icon} className="size-3.5" />
                </span>
                <span className="text-[9px] leading-tight">{p.title}</span>
              </li>
            ))}
          </ul>
          {brochure.callout && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#fff1ea] p-3">
              <span className="bg-brand grid size-8 shrink-0 place-items-center rounded-lg text-ink">
                <Icon name="rocket" className="size-4" />
              </span>
              <div>
                <p className="text-[12px] font-semibold">{brochure.callout.title}</p>
                <p className="text-[10px] text-[#5a5a5a]">{brochure.callout.body}</p>
              </div>
            </div>
          )}
          <p className="mt-5 text-[10px] font-semibold tracking-[0.2em] text-[#5a5a5a] uppercase">What else can we put in your cart?</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {brochure.mall.map((m) => (
              <li key={m.title} className="flex items-center gap-1.5 rounded-full bg-[#f4f4f4] px-3 py-1.5 text-[10px] font-medium">
                <Icon name={m.icon} className="size-3.5 text-signal" />
                {m.title}
              </li>
            ))}
            <li className="rounded-full bg-[#f4f4f4] px-3 py-1.5 text-[10px] font-medium">…and anything else you need</li>
          </ul>
          <div className="relative mt-auto overflow-hidden rounded-2xl bg-ink p-5 text-white">
            <div aria-hidden className="bg-brand absolute -right-10 -bottom-10 size-40 rounded-full opacity-30 blur-2xl" />
            <p className="relative text-[18px] font-semibold">Need something that isn&apos;t in your cart? Go shopping — then come to us.</p>
            <p className="relative mt-1 text-[11px] text-white/70">
              Launch prices for the first {LAUNCH_SLOTS_PER_MONTH} clients each month
              {offer.slotsLeft > 0 ? ` — ${offer.slotsLeft} places left this month` : ""}. Book a free session and save <Money amounts={DEMO_OFFER.amount} />.
            </p>
            <p className="relative mt-3 text-[12px] font-semibold">
              {site.url.replace(/^https?:\/\//, "")}/start · {site.contactPhone} (call or WhatsApp) · {site.contactEmail}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
