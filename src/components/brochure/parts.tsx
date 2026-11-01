"use client";

import Image from "next/image";
import Link from "next/link";
import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ComponentProps, type ReactNode, type RefObject } from "react";
import { trackBrochureStep } from "@/app/actions/brochure";
import { CASE_STUDIES } from "@/knowledge/case-studies";
import { LAUNCH_SLOTS_PER_MONTH } from "@/knowledge/brochures";
import { formatMoney, type Priced } from "@/knowledge/pricing";
import { track } from "@/lib/analytics";
import type { BROCHURE_STEPS, MonthlyOffer } from "@/server/brochures";
import { useCurrency } from "../currency";
import { Container, cx } from "../ui";

// Pieces shared by the plan brochures (the shopping-cart ones and Operate).

export type Step = (typeof BROCHURE_STEPS)[number];

/** A section that reports itself once, the first time it is mostly on screen, so HQ sees how far the reader got. */
export function Tracked({
  step,
  plan,
  as = "section",
  ...props
}: Omit<ComponentProps<"section">, "ref"> & {
  step: Step;
  plan: string;
  as?: "section" | "div";
}) {
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
export function CountUp({ amounts, className }: { amounts: Priced; className?: string }) {
  const currency = useCurrency();
  const target = amounts[currency];
  const [shown, setShown] = useState(target);
  const reduce = useReducedMotion();
  const from = useRef(target);
  useEffect(() => {
    if (reduce) return;
    const controls = animate(from.current, target, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (v) => setShown(Math.round(v)),
    });
    from.current = target;
    return () => controls.stop();
  }, [target, reduce]);
  return <span className={cx("tabular-nums", className)}>{formatMoney(reduce ? target : shown, currency)}</span>;
}

export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
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

export function Eyebrow({ children, light }: { children: ReactNode; light?: boolean }) {
  return <p className={cx("text-xs font-semibold tracking-[0.2em] uppercase", light ? "text-white/60" : "text-muted")}>{children}</p>;
}

/** Our live client projects, as cards that open the case studies. */
export function RealWork({ plan }: { plan: string }) {
  return (
    <Tracked step="work" plan={plan}>
      <Container className="py-14 sm:py-20">
        <Reveal className="text-center">
          <Eyebrow>Real clients · live today</Eyebrow>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Don&apos;t take our word for it. Open them.</h2>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {CASE_STUDIES.map((c, i) => (
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
  );
}

/** "3 of 10 launch-price places left this month", with a meter. */
export function LaunchSlots({ offer }: { offer: MonthlyOffer }) {
  return (
    <>
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
    </>
  );
}
