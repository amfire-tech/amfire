"use client";

import Lenis from "lenis";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowIcon, CheckIcon, MenuIcon, UploadIcon } from "./icons";
import type { MfgSite } from "./types";

// The 3D part only ever renders in the browser, after the text has painted.
const PartScene = dynamic(() => import("./part-scene"), {
  ssr: false,
  loading: () => (
    <div className="mfg-part-fallback" aria-hidden>
      <span />
    </div>
  ),
});

/** Smooth scrolling and the gentle reveal of sections as they come into view. */
export function PageMotion() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Reveal: only elements below the fold are hidden, and only once this script runs,
    // so the page is complete without JavaScript and the first screen never flickers.
    const els = Array.from(document.querySelectorAll<HTMLElement>(".mfg [data-reveal]"));
    let io: IntersectionObserver | undefined;
    if (!reduced) {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              e.target.classList.remove("is-pending");
              io?.unobserve(e.target);
            }
          }
        },
        { rootMargin: "0px 0px -8% 0px" },
      );
      for (const el of els) {
        if (el.getBoundingClientRect().top > window.innerHeight * 0.92) {
          el.classList.add("is-pending");
          io.observe(el);
        }
      }
    }

    let lenis: Lenis | undefined;
    let raf = 0;
    if (!reduced) {
      lenis = new Lenis({ lerp: 0.11, anchors: { offset: -68 } });
      const loop = (t: number) => {
        lenis?.raf(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => {
      io?.disconnect();
      cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, []);
  return null;
}

export function Nav({ site, links, quoteHref }: { site: MfgSite; links: { href: string; label: string }[]; quoteHref: string }) {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className="mfg-nav" data-solid={solid || open}>
      <div className="mfg-wrap">
        <a href="#top" className="mfg-logo" aria-label={`${site.company.name}, home`}>
          <b>{site.company.short}</b>
          <span>{site.company.descriptor}</span>
        </a>
        <nav className="mfg-nav__links" aria-label="Main">
          {links.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <a href={quoteHref} className="mfg-btn mfg-btn--accent mfg-btn--sm mfg-nav__cta">
          Request a quote
        </a>
        <button className="mfg-nav__menu" aria-expanded={open} aria-controls="mfg-sheet" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)}>
          <MenuIcon open={open} />
        </button>
      </div>
      <div id="mfg-sheet" className="mfg-nav__sheet" data-open={open}>
        {links.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
            {l.label}
          </a>
        ))}
        <a href={quoteHref} className="mfg-btn mfg-btn--accent" onClick={() => setOpen(false)}>
          Request a quote
        </a>
      </div>
    </header>
  );
}

export function HeroPart({ accent }: { accent: string }) {
  return <PartScene variant="hero" accent={accent} />;
}

/** "From bar to part": the part stays pinned while the page scrolls through the five stages. */
export function Story({ site }: { site: MfgSite }) {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [stage, setStage] = useState(0);
  const n = site.story.length;

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = section.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const travel = r.height - window.innerHeight;
        const t = travel > 0 ? Math.min(1, Math.max(0, -r.top / travel)) : 0;
        const p = t * n * 0.999;
        progress.current = p;
        const s = Math.min(n - 1, Math.floor(p));
        setStage((prev) => (prev === s ? prev : s));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [n]);

  const s = site.story[stage];
  return (
    <section ref={section} id="process" className="mfg-story" aria-label="How a part is made">
      <div className="mfg-story__pin">
        <div className="mfg-wrap mfg-story__grid">
          <div className="mfg-story__copy">
            <p className="mfg-eyebrow">From bar to finished part</p>
            <ol className="mfg-steps" aria-label="Stages">
              {site.story.map((st, i) => (
                <li key={st.stage} data-state={i < stage ? "done" : i === stage ? "now" : "next"} aria-current={i === stage ? "step" : undefined}>
                  {st.stage}
                </li>
              ))}
            </ol>
            <div key={stage} className="mfg-story__stage mfg-story__swap" aria-live="polite">
              <h3 className="mfg-display">{s.title}</h3>
              <p>{s.line}</p>
              <div className="mfg-story__figure">
                <b>{s.figure}</b>
                <span>{s.label}</span>
              </div>
            </div>
          </div>
          <div className="mfg-story__part">
            <PartScene variant="story" accent={site.accent} progress={progress} />
          </div>
        </div>
      </div>
    </section>
  );
}

/** A number that counts up once when it first scrolls into view. Renders its final value first. */
export function Count({ value, decimals = 0, prefix = "", suffix = "" }: { value: number; decimals?: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLElement>(null);
  const fmt = (v: number) => prefix + v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    el.textContent = fmt(0);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const dur = 1600;
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 4);
        el.textContent = fmt(value * eased);
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <b ref={ref}>{fmt(value)}</b>;
}

export function MachineTable({ machines }: { machines: MfgSite["machines"] }) {
  const processes = Array.from(new Set(machines.map((m) => m.process)));
  const [filter, setFilter] = useState<string | null>(null);
  const rows = filter ? machines.filter((m) => m.process === filter) : machines;
  const total = (list: MfgSite["machines"]) => list.reduce((a, m) => a + m.count, 0);
  return (
    <>
      <div className="mfg-filter" role="group" aria-label="Filter by process">
        <button className="mfg-chip" aria-pressed={filter === null} onClick={() => setFilter(null)}>
          All <small>{total(machines)}</small>
        </button>
        {processes.map((p) => (
          <button key={p} className="mfg-chip" aria-pressed={filter === p} onClick={() => setFilter(p)}>
            {p} <small>{total(machines.filter((m) => m.process === p))}</small>
          </button>
        ))}
      </div>
      <div className="mfg-table-wrap">
        <table className="mfg-table">
          <thead>
            <tr>
              <th>Process</th>
              <th>Machine</th>
              <th>Make</th>
              <th>Working size</th>
              <th className="n">Count</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={`${m.process}-${m.machine}-${m.make}`}>
                <td>
                  <span className="mfg-tag">{m.process}</span>
                </td>
                <td>{m.machine}</td>
                <td>{m.make}</td>
                <td className="mono">{m.size}</td>
                <td className="n">{m.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function QuoteForm({ site, whatsappHref }: { site: MfgSite; whatsappHref: string }) {
  const [sent, setSent] = useState(false);
  const [file, setFile] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const isLive = site.mode === "live";

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Previews show what the buyer would see. On a live site this posts to the client's inbox and WhatsApp.
    setSent(true);
  }

  if (sent)
    return (
      <div className="mfg-form" role="status">
        <div className="mfg-done">
          <span className="mfg-done__icon">
            <CheckIcon />
          </span>
          <h3>Drawing received.</h3>
          <p>
            {site.contact.salesName} will reply within one working day with a price and lead time.
            {!isLive && " On the live site, this enquiry reaches your WhatsApp and inbox within seconds, with the drawing attached."}
          </p>
          <button className="mfg-btn mfg-btn--ghost mfg-btn--sm" onClick={() => { setSent(false); setFile(null); }}>
            Send another
          </button>
        </div>
      </div>
    );

  return (
    <form className="mfg-form" onSubmit={submit} aria-label="Request a quote">
      <div className="mfg-form__row">
        <Field id="rfq-name" label="Your name" autoComplete="name" required />
        <Field id="rfq-company" label="Company" autoComplete="organization" required />
      </div>
      <Field id="rfq-contact" label="Phone or email" autoComplete="email" required placeholder="So we can send the quote" />
      <div className="mfg-field">
        <label htmlFor="rfq-part">Part and yearly quantity</label>
        <textarea id="rfq-part" name="part" required placeholder="e.g. Flanged hub, EN19, 24,000 a year" />
      </div>
      <label className="mfg-drop" data-over={over} onDragOver={() => setOver(true)} onDragLeave={() => setOver(false)} onDrop={() => setOver(false)}>
        <UploadIcon />
        <span>
          {file ?? "Attach your drawing"}
          <small>PDF, DWG, STEP or a photo · up to 20 MB</small>
        </span>
        <input id="rfq-file" type="file" name="drawing" accept=".pdf,.dwg,.dxf,.step,.stp,.igs,.iges,image/*" onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)} />
      </label>
      <div className="mfg-form__foot">
        <p>
          Prefer WhatsApp?{" "}
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
            Send the drawing there
          </a>
        </p>
        <button type="submit" className="mfg-btn mfg-btn--accent">
          Get my quote <ArrowIcon />
        </button>
      </div>
    </form>
  );
}

function Field({ id, label, ...rest }: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="mfg-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={id} {...rest} />
    </div>
  );
}

export function Reveal({ children, delay = 0, className, as: Tag = "div" }: { children: ReactNode; delay?: number; className?: string; as?: "div" | "li" | "figure" }) {
  return (
    <Tag data-reveal className={className} style={delay ? ({ "--d": `${delay}s` } as React.CSSProperties) : undefined}>
      {children}
    </Tag>
  );
}
