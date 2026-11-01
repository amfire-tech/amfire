"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { animate, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState, useTransition, type ComponentProps, type ReactNode, type RefObject } from "react";
import { submitBrochureWish, trackBrochureStep } from "@/app/actions/brochure";
import { contact } from "@/config/site";
import { CASE_STUDIES } from "@/knowledge/case-studies";
import { EARLY_CLIENTS, LAUNCH_SLOTS_PER_MONTH, REVISIONS, sumValues, type Brochure, type CartItem } from "@/knowledge/brochures";
import { SERVICE_DETAILS, SERVICES } from "@/knowledge/catalog";
import { DEMO_OFFER, STARTING_PRICE, formatMoney, type Priced } from "@/knowledge/pricing";
import { track } from "@/lib/analytics";
import type { MonthlyOffer } from "@/server/brochures";
import { ForCurrency, Money, useCurrency } from "../currency";
import { GiftIcon } from "../demo-offer";
import { Container, buttonClass, cx } from "../ui";
import { CART_CAPACITY, Flame, Mall, Shopper } from "./art";
import { Icon } from "./icons";

// The Build brochure: one shopper with an amfire cart, one with another
// company's, the same budget. Items drop into the amfire cart as the reader
// scrolls, the "value in your cart" counter climbs while the price stays put,
// and it ends in the super-mall with the month's real offer numbers.

type Step = "cover" | "compare" | "cart" | "full" | "price" | "shelves" | "work" | "method" | "mall";

/** A section that reports itself once, the first time it is mostly on screen, so HQ sees how far the reader got. */
function Tracked({ step, plan, as = "section", ...props }: Omit<ComponentProps<"section">, "ref"> & { step: Step; plan: string; as?: "section" | "div" }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        track("brochure_step", { plan, step });
        void trackBrochureStep(plan, step);
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [plan, step]);
  return as === "div" ? <div ref={ref as RefObject<HTMLDivElement>} {...props} /> : <section ref={ref} {...props} />;
}

/** A money figure that counts up to its new value. */
function CountUp({ amounts, className }: { amounts: Priced; className?: string }) {
  const currency = useCurrency();
  const target = amounts[currency];
  const [shown, setShown] = useState(target);
  const reduce = useReducedMotion();
  const from = useRef(target);
  useEffect(() => {
    if (reduce) return;
    const controls = animate(from.current, target, { duration: 0.8, ease: "easeOut", onUpdate: (v) => setShown(Math.round(v)) });
    from.current = target;
    return () => controls.stop();
  }, [target, reduce]);
  return <span className={cx("tabular-nums", className)}>{formatMoney(reduce ? target : shown, currency)}</span>;
}

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Eyebrow({ children, light }: { children: ReactNode; light?: boolean }) {
  return <p className={cx("text-xs font-semibold tracking-[0.2em] uppercase", light ? "text-white/60" : "text-muted")}>{children}</p>;
}

/** A cart item card. Joins the cart the first time it scrolls into view. */
function ItemCard({ item, added, onSeen, title, note, bonus }: { item: CartItem; added: boolean; onSeen: () => void; title?: string; note?: string; bonus?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || added) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && onSeen(), { threshold: 0.7 });
    io.observe(el);
    return () => io.disconnect();
  }, [added, onSeen]);
  return (
    <div
      ref={ref}
      className={cx(
        "relative flex gap-4 rounded-card p-4 transition duration-500 sm:p-5",
        bonus ? "bg-ink text-white ring-1 ring-white/10" : "bg-surface ring-1 ring-line",
        added ? "opacity-100" : "opacity-40",
      )}
    >
      <span className={cx("grid size-12 shrink-0 place-items-center rounded-2xl transition duration-500", added ? "bg-brand text-ink" : bonus ? "bg-white/10" : "bg-subtle")}>
        <Icon name={item.icon} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title ?? item.title}</p>
        <p className={cx("mt-0.5 text-sm", bonus ? "text-white/70" : "text-muted")}>{item.body}</p>
        {note && <p className="mt-1 text-xs font-medium text-signal">{note}</p>}
      </div>
      <div className="shrink-0 text-right">
        <p className={cx("text-[11px] tracking-wide uppercase", bonus ? "text-white/50" : "text-muted")}>Worth</p>
        <p className="text-sm font-semibold tabular-nums">
          <Money amounts={item.value} />
        </p>
        <p className={cx("mt-1 text-xs font-semibold transition duration-500", added ? "text-success opacity-100" : "opacity-0", bonus && "text-flame")}>
          {bonus ? "Free" : "In cart ✓"}
        </p>
      </div>
    </div>
  );
}

export function BuildBrochure({ brochure, name, offer }: { brochure: Brochure; name: string; offer: MonthlyOffer }) {
  const plan = brochure.path;
  const router = useRouter();
  const price = STARTING_PRICE[plan];
  const offerPrice: Priced = { INR: price.INR - DEMO_OFFER.amount.INR, USD: price.USD - DEMO_OFFER.amount.USD };

  const [added, setAdded] = useState<Set<string>>(() => new Set());
  const [bonusOpen, setBonusOpen] = useState(false);
  const add = useCallback((id: string) => setAdded((s) => (s.has(id) ? s : new Set(s).add(id))), []);
  // Reaching an item adds everything above it too, so a fast scroll never leaves gaps in the cart.
  const addUpTo = useCallback(
    (index: number) =>
      setAdded((s) => {
        const missing = brochure.cart.slice(0, index + 1).filter((i) => !s.has(i.id));
        return missing.length ? new Set([...s, ...missing.map((i) => i.id)]) : s;
      }),
    [brochure.cart],
  );

  // Bonus items drop in one after another once the reader says "more should cost more".
  useEffect(() => {
    if (!bonusOpen) return;
    const timers = brochure.bonus.map((b, i) => setTimeout(() => add(b.id), 450 + i * 650));
    return () => timers.forEach(clearTimeout);
  }, [bonusOpen, brochure.bonus, add]);

  const inCart = [...brochure.cart, ...brochure.bonus].filter((i) => added.has(i.id));
  const cartValue = sumValues(inCart);
  const fullValue = sumValues([...brochure.cart, ...brochure.bonus]);
  const cartDone = brochure.cart.every((i) => added.has(i.id));
  const boxes = Math.round((inCart.length / (brochure.cart.length + brochure.bonus.length)) * CART_CAPACITY);

  const [wishes, setWishes] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const book = () =>
    startTransition(async () => {
      track("brochure_book", { plan, wishes: wishes.length });
      await submitBrochureWish(plan, { wishes, note: note.trim() || undefined });
      router.push(`/start?goal=${SERVICE_DETAILS[plan].goal}`);
    });

  const work = CASE_STUDIES.filter((c) => c.path === plan);

  return (
    <div className="overflow-x-clip">
      {/* 1 · Cover */}
      <Tracked step="cover" plan={plan} className="relative overflow-hidden bg-ink text-white">
        <div aria-hidden className="bg-brand absolute top-1/3 left-1/2 size-[34rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl" />
        <Container className="relative flex min-h-[calc(100svh-6.5rem)] flex-col items-center justify-center py-16 text-center">
          <Reveal>
            <Flame className="mx-auto h-32 w-auto sm:h-40" />
          </Reveal>
          <Reveal delay={0.1}>
            <Eyebrow light>
              Hi {name} · <span className="normal-case">amfire</span> {SERVICES[plan].name}
            </Eyebrow>
          </Reveal>
          <Reveal delay={0.2}>
            <h1 className="mt-4 max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
              <span className="text-brand">
                <Money amounts={price} />.
              </span>
              <br />
              {brochure.hook}
            </h1>
          </Reveal>
          <Reveal delay={0.3}>
            <p className="mt-5 max-w-md text-white/70">Same budget, two shopping carts. Scroll and watch what lands in each.</p>
          </Reveal>
          <motion.div aria-hidden className="mt-12 text-white/50" animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>
            <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M6 13l6 6 6-6" />
            </svg>
          </motion.div>
        </Container>
      </Tracked>

      {/* 2 · Same money, two carts */}
      <Tracked step="compare" plan={plan} className="bg-subtle">
        <Container className="py-14 sm:py-20">
          <Reveal className="text-center">
            <Eyebrow>Same money · two carts</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              What does <Money amounts={price} /> get you?
            </h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-6">
            <Reveal className="flex flex-col rounded-card bg-surface p-3 ring-2 ring-signal sm:p-6">
              <p className="text-center text-xs font-semibold tracking-widest text-signal sm:text-sm">amfire</p>
              <Shopper boxes={Math.max(boxes, 3)} tone="amfire" className="mt-2" />
              <ul className="mt-3 space-y-1.5 text-xs sm:text-sm">
                {brochure.cart.slice(0, 5).map((item) => (
                  <li key={item.id} className="flex items-center gap-2">
                    <Icon name="check" className="size-4 shrink-0 text-signal" />
                    {item.title}
                  </li>
                ))}
              </ul>
              <p className="mt-auto pt-3 text-sm font-semibold sm:text-base">
                + {brochure.cart.length + brochure.bonus.length - 5} more. Keep scrolling.
              </p>
            </Reveal>
            <Reveal delay={0.15} className="flex flex-col rounded-card bg-surface p-3 ring-1 ring-line sm:p-6">
              <p className="text-center text-xs font-semibold tracking-widest text-muted uppercase sm:text-sm">A typical agency</p>
              <Shopper boxes={2} tone="rival" className="mt-2" />
              <ul className="mt-3 space-y-1.5 text-xs sm:text-sm">
                {brochure.rival.got.map((g) => (
                  <li key={g} className="flex items-center gap-2">
                    <Icon name="check" className="size-4 shrink-0 text-muted" />
                    {g}
                  </li>
                ))}
                {brochure.rival.missing.map((m) => (
                  <li key={m} className="flex items-center gap-2 text-muted line-through decoration-signal/60">
                    <svg aria-hidden viewBox="0 0 24 24" className="size-4 shrink-0 text-signal" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                    {m}
                  </li>
                ))}
              </ul>
              <p className="mt-auto pt-3 text-[11px] text-muted sm:text-xs">Based on typical 2026 agency quotes in India at this budget. Everything else is extra.</p>
            </Reveal>
          </div>
        </Container>
      </Tracked>

      {/* 3 · The cart fills up */}
      <Tracked step="cart" plan={plan} className="relative">
        {/* Phones: a slim bar keeps the running total in view. */}
        <div className="sticky top-16 z-30 border-b border-line bg-page/90 backdrop-blur-lg lg:hidden">
          <Container className="flex items-center justify-between gap-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-full bg-brand text-ink">
                <Icon name="store" className="size-5" />
              </span>
              <div className="leading-tight">
                <p className="text-[11px] text-muted uppercase">Value in your cart</p>
                <CountUp amounts={cartValue} className="text-lg font-semibold" />
              </div>
            </div>
            <div className="text-right leading-tight">
              <p className="text-[11px] text-muted uppercase">Your price</p>
              <p className="text-lg font-semibold">
                <Money amounts={price} />
              </p>
            </div>
          </Container>
        </div>
        <Container className="grid gap-10 py-14 sm:py-20 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="hidden lg:block">
            <div className="sticky top-24 rounded-[1.75rem] bg-ink p-8 text-white">
              <div aria-hidden className="bg-brand absolute -top-10 -right-10 size-40 rounded-full opacity-25 blur-3xl" />
              <Eyebrow light>
                Your <span className="normal-case">amfire</span> cart
              </Eyebrow>
              <Shopper boxes={boxes} tone="amfire" overflow={cartDone} className="mt-4" />
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-white/60 uppercase">Value in your cart</p>
                  <CountUp amounts={cartValue} className="text-3xl font-semibold" />
                </div>
                <div>
                  <p className="text-xs text-white/60 uppercase">Your price</p>
                  <p className="text-3xl font-semibold text-flame">
                    <Money amounts={price} />
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-white/60">
                {inCart.length} of {brochure.cart.length + brochure.bonus.length} items · the price never moves
              </p>
            </div>
          </div>
          <div>
            <Reveal>
              <Eyebrow>Into the cart</Eyebrow>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Let&apos;s start filling it.</h2>
              <p className="mt-2 text-muted">Each item drops in as you scroll. Watch the value climb.</p>
            </Reveal>
            <ul className="mt-8 space-y-3">
              {brochure.cart.map((item, i) => (
                <li key={item.id}>
                <ItemCard
                  item={item}
                  added={added.has(item.id)}
                  onSeen={() => addUpTo(i)}
                  title={item.id === "revisions" ? `${offer.revisions} design revision rounds` : undefined}
                  note={
                    item.id === "revisions"
                      ? offer.earlyLeft > 0
                        ? `${REVISIONS.early} rounds for the first ${EARLY_CLIENTS} clients this month — ${offer.earlyLeft} left`
                        : `${REVISIONS.later} rounds this month (the first ${EARLY_CLIENTS} clients each month get ${REVISIONS.early})`
                      : undefined
                  }
                />
                </li>
              ))}
            </ul>

            {/* 4 · The cart is full */}
            <Tracked as="div" step="full" plan={plan} className="mt-10 scroll-mt-32">
              <motion.div
                onViewportEnter={() => addUpTo(brochure.cart.length - 1)}
                viewport={{ once: true, amount: 0.2 }}
                className="relative overflow-hidden rounded-[1.75rem] bg-ink p-6 text-center text-white sm:p-10"
              >
                <div aria-hidden className="bg-brand absolute -bottom-20 left-1/2 size-72 -translate-x-1/2 rounded-full opacity-25 blur-3xl" />
                <div className="relative">
                  <div className="mx-auto max-w-[16rem] lg:hidden">
                    <Shopper boxes={boxes} tone="amfire" overflow={cartDone} />
                  </div>
                  <p className="text-sm font-semibold tracking-widest text-flame uppercase">The cart is full</p>
                  <h3 className="mt-3 text-2xl font-semibold text-balance sm:text-3xl">Adding more should cost more, right?</h3>
                  {!bonusOpen ? (
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                      {["Yes, obviously", "Of course it should"].map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => {
                            setBonusOpen(true);
                            track("brochure_bonus", { plan });
                          }}
                          className={buttonClass(label === "Yes, obviously" ? "primary" : "inverse", "lg")}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <motion.p initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 text-4xl font-semibold text-brand sm:text-5xl">
                      Not at amfire.
                    </motion.p>
                  )}
                </div>
              </motion.div>
              {bonusOpen && (
                <ul className="mt-4 space-y-3">
                  {brochure.bonus.map((item, i) => (
                    <motion.li key={item.id} initial={{ opacity: 0, y: -30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.3 + i * 0.65, type: "spring", bounce: 0.4 }}>
                      <ItemCard item={item} added={added.has(item.id)} onSeen={() => {}} bonus />
                    </motion.li>
                  ))}
                </ul>
              )}
            </Tracked>
          </div>
        </Container>
      </Tracked>

      {/* 5 · The price */}
      <Tracked step="price" plan={plan} className="relative overflow-hidden bg-ink text-white">
        <div aria-hidden className="bg-brand absolute -top-24 right-0 size-96 rounded-full opacity-20 blur-3xl" />
        <Container className="relative py-16 text-center sm:py-24">
          <Reveal>
            <Eyebrow light>Everything in your cart</Eyebrow>
            <p className="mt-4 text-sm text-white/60">Bought separately, it would cost</p>
            <p className="mt-1 text-5xl font-semibold tracking-tight text-white/40 line-through decoration-signal decoration-4 sm:text-7xl">
              <Money amounts={fullValue} />
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 text-sm text-white/60">With amfire, you pay</p>
            <p className="mt-1 text-6xl font-semibold tracking-tight text-brand sm:text-8xl">
              <Money amounts={price} />
            </p>
          </Reveal>
          <Reveal delay={0.35}>
            <p className="bg-brand shine mx-auto mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 font-semibold text-ink">
              <GiftIcon />
              <span>
                Only <Money amounts={offerPrice} /> with the free-demo offer
              </span>
            </p>
            <p className="mx-auto mt-6 max-w-md text-sm text-white/60">{brochure.scopeNote}</p>
            <p className="mt-2 text-xs text-white/40">
              Market values are typical prices charged separately by agencies and freelancers in 2026.{" "}
              <ForCurrency currency="INR">GST extra as applicable.</ForCurrency>
              <ForCurrency currency="USD">Taxes extra where applicable.</ForCurrency>
            </p>
          </Reveal>
        </Container>
      </Tracked>

      {/* 6 · Bigger shelves */}
      <Tracked step="shelves" plan={plan} className="bg-subtle">
        <Container className="py-14 sm:py-20">
          <Reveal className="text-center">
            <Eyebrow>Need a bigger cart?</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Pick from the next shelves.</h2>
            <p className="mt-2 text-muted">Everything above stays in the cart. These are typical starting points — your Build Brief fixes the exact price.</p>
          </Reveal>
          <div className="mt-10 space-y-8">
            {brochure.shelves.map((shelf, s) => (
              <Reveal key={s} delay={s * 0.1}>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold tracking-widest text-muted uppercase">{shelf.title}</p>
                    <p className="text-3xl font-semibold">
                      from <Money amounts={shelf.price} />
                    </p>
                  </div>
                  <span className="bg-brand rounded-full px-3 py-1 text-xs font-semibold text-ink">+ everything above</span>
                </div>
                <div className="relative mt-4">
                  <div className="grid grid-cols-2 gap-3 pb-3 sm:grid-cols-4">
                    {shelf.items.map((it, i) => (
                      <motion.div
                        key={it.title}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 + i * 0.08 }}
                        className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-4 text-center shadow-[0_10px_24px_-18px_rgba(0,0,0,0.5)] ring-1 ring-line"
                      >
                        <span className="grid size-12 place-items-center rounded-xl bg-ink text-flame">
                          <Icon name={it.icon} />
                        </span>
                        <p className="text-sm font-medium">{it.title}</p>
                      </motion.div>
                    ))}
                  </div>
                  {/* the shelf board */}
                  <div aria-hidden className="h-3 rounded-full bg-gradient-to-b from-[#3a2a20] to-[#1f1611] shadow-[0_8px_16px_-8px_rgba(0,0,0,0.6)]" />
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Tracked>

      {/* 7 · Real work */}
      <Tracked step="work" plan={plan}>
        <Container className="py-14 sm:py-20">
          <Reveal className="text-center">
            <Eyebrow>Real clients · live today</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Don&apos;t take our word for it. Open them.</h2>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {work.map((c, i) => (
              <Reveal key={c.slug} delay={i * 0.1}>
                <Link href={`/work/${c.slug}`} className="group block overflow-hidden rounded-[1.5rem] bg-ink text-white ring-1 ring-line">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image src={c.cover} alt={c.coverAlt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
                    <p className="absolute bottom-4 left-5 text-2xl font-semibold">{c.client}</p>
                  </div>
                  <div className="p-5">
                    <p className="text-white/80">{c.title}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {c.facts.slice(0, 4).map((f) => (
                        <div key={f.label} className="rounded-xl bg-white/5 p-3">
                          <p className="text-xl font-semibold text-flame">{f.value}</p>
                          <p className="text-xs text-white/60">{f.label}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-sm font-medium text-flame">See the case study →</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </Tracked>

      {/* 8 · The BUILD Method + promises */}
      <Tracked step="method" plan={plan} className="bg-subtle">
        <Container className="py-14 sm:py-20">
          <Reveal className="text-center">
            <Eyebrow>How it happens</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              The amfire <span className="text-brand">BUILD</span> Method
            </h2>
          </Reveal>
          <ol className="-mx-4 mt-10 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
            {brochure.method.map((m, i) => (
              <motion.li
                key={m.letter}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex w-[70%] shrink-0 snap-start flex-col rounded-card bg-surface p-5 ring-1 ring-line sm:w-auto"
              >
                <span className="text-brand text-6xl leading-none font-bold">{m.letter}</span>
                <p className="mt-3 font-semibold">{m.title}</p>
                <p className="mt-1 text-sm text-muted">{m.body}</p>
                {m.pay && <p className="mt-auto pt-4 text-xs font-semibold text-signal">{m.pay}</p>}
              </motion.li>
            ))}
          </ol>

          <Reveal className="mt-16 text-center">
            <Eyebrow>In writing, every time</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Our 7 promises</h2>
          </Reveal>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {brochure.promises.map((p, i) => (
              <motion.li
                key={p.title}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className={cx("flex flex-col items-center gap-3 rounded-card bg-ink p-4 text-center text-white", i === brochure.promises.length - 1 && "col-span-2 sm:col-span-4 lg:col-span-1")}
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

      {/* 9 · The super-mall */}
      <Tracked step="mall" plan={plan} className="relative overflow-hidden bg-ink text-white">
        <Mall className="absolute inset-x-0 top-0 h-72 opacity-70 sm:h-96" />
        <div aria-hidden className="absolute inset-x-0 top-40 h-56 bg-gradient-to-b from-transparent to-ink sm:top-64" />
        <Container className="relative pt-48 pb-16 sm:pt-72 sm:pb-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">Need something that isn&apos;t in your cart?</h2>
            <p className="mt-4 text-white/70">Go shopping. Pick what you need — then come to us, and we&apos;ll add it at launch prices.</p>
          </Reveal>
          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2">
            {brochure.mall.map((m) => {
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
            <label htmlFor="b-wish" className="sr-only">
              Something else
            </label>
            <input
              id="b-wish"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="Something else? Type it here"
              className="block w-full rounded-full bg-white/5 px-5 py-3 text-white ring-1 ring-white/15 placeholder:text-white/40 focus:ring-2 focus:ring-signal focus:outline-none"
            />
          </div>

          <div className="mx-auto mt-10 max-w-xl rounded-[1.5rem] bg-white/5 p-5 ring-1 ring-white/10 sm:p-6">
            <p className="text-center font-semibold">
              {offer.slotsLeft > 0 ? (
                <>
                  <span className="text-flame">
                    {offer.slotsLeft} of {LAUNCH_SLOTS_PER_MONTH}
                  </span>{" "}
                  launch-price places left this month
                </>
              ) : (
                <>This month&apos;s launch-price places are taken — book now for next month&apos;s list</>
              )}
            </p>
            <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
              {Array.from({ length: LAUNCH_SLOTS_PER_MONTH }, (_, i) => (
                <span key={i} className={cx("h-2 w-6 rounded-full", i < LAUNCH_SLOTS_PER_MONTH - offer.slotsLeft ? "bg-white/15" : "bg-brand")} />
              ))}
            </div>
            {offer.earlyLeft > 0 && (
              <p className="mt-3 text-center text-sm text-white/70">
                Sign among the first {EARLY_CLIENTS} this month and get {REVISIONS.early} design revision rounds instead of {REVISIONS.later}.
              </p>
            )}
            <button type="button" onClick={book} disabled={pending} className={buttonClass("primary", "lg", "mt-5 w-full")}>
              {pending ? "One moment…" : wishes.length || note.trim() ? "Book my free session with this list →" : "Book my free session →"}
            </button>
            <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-white/70">
              <a href={contact.whatsapp("Hi amfire, I just read the Build brochure and want to talk.")} target="_blank" rel="noopener noreferrer" className="py-1 hover:text-white">
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
