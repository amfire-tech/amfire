import Image from "next/image";
import type { CSSProperties } from "react";
import { contact as amfireContact } from "@/config/site";
import { fontVars } from "./fonts";
import { ArrowIcon, ArrowUpRight, ClockIcon, DownloadIcon, MailIcon, PhoneIcon, PinIcon, SealIcon, WhatsAppIcon } from "./icons";
import { Count, HeroPart, MachineTable, Nav, PageMotion, QuoteForm, Reveal, Story } from "./interactive";
import type { MfgSite } from "./types";
import "./site.css";

const NAV = [
  { href: "#capabilities", label: "Capabilities" },
  { href: "#industries", label: "Industries" },
  { href: "#quality", label: "Quality" },
  { href: "#machines", label: "Machines" },
  { href: "#plant", label: "Plant" },
];

/** Dark or light text on the client's accent, whichever reads better. */
function inkOn(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.32 ? "#14110a" : "#ffffff";
}

const digits = (s: string) => s.replace(/\D/g, "");

/**
 * Where each contact button leads. On a live site, to the client. On the demo and on
 * previews, to amfire, with a message that says which site the visitor was looking at.
 */
function links(site: MfgSite) {
  if (site.mode === "live") {
    const wa = (t: string) => `https://wa.me/${digits(site.contact.whatsapp)}?text=${encodeURIComponent(t)}`;
    return {
      whatsapp: wa(`Hello ${site.company.name}, I'd like a quote.`),
      drawing: wa(`Hello ${site.company.name}, I'd like to send a drawing for a quote.`),
      visit: wa(`Hello ${site.company.name}, I'd like to visit your plant.`),
      phone: `tel:+${digits(site.contact.phone)}`,
      email: `mailto:${site.contact.email}`,
      claim: "",
    };
  }
  const about = site.mode === "demo" ? "the manufacturing demo website" : `the website preview you made for ${site.company.name}`;
  return {
    whatsapp: amfireContact.whatsapp(`Hi amfire, I'm looking at ${about}. I'd like a site like this.`),
    drawing: amfireContact.whatsapp(`Hi amfire, I tried the drawing upload on ${about}. I'd like a site like this.`),
    visit: amfireContact.whatsapp(`Hi amfire, I'm looking at ${about}. Can we talk?`),
    phone: amfireContact.call,
    email: amfireContact.email,
    claim: amfireContact.whatsapp(
      site.mode === "demo"
        ? "Hi amfire, I saw the manufacturing demo website. I'd like one like this for my company."
        : `Hi amfire, I saw the website you made for ${site.company.name}. I'd like to make it ours.`,
    ),
  };
}

export function ManufacturingSite({ site }: { site: MfgSite }) {
  const go = links(site);
  const year = new Date().getFullYear();
  const style = {
    "--m-accent": site.accent,
    "--m-accent-ink": inkOn(site.accent),
    "--m-preview-h": site.mode === "live" ? "0px" : "40px",
  } as CSSProperties;
  const initials = site.contact.salesName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

  return (
    <div id="top" className={`mfg ${fontVars}`} style={style}>
      <PageMotion />

      {site.mode !== "live" && (
        <div className="mfg-preview" role="note">
          <div className="mfg-wrap">
            <span className="mfg-preview__dot" aria-hidden />
            {site.mode === "demo" ? (
              <span>
                A demo website by <b>amfire</b>.<span className="mfg-preview__more"> Your company could look like this.</span>
              </span>
            ) : (
              <span>
                A concept website <b>amfire</b> made for <b>{site.company.name}</b>.
              </span>
            )}
            <a href={go.claim} target="_blank" rel="noopener noreferrer">
              {site.mode === "demo" ? "Get one like it" : "Make it yours"} <ArrowIcon />
            </a>
          </div>
        </div>
      )}

      <Nav site={site} links={NAV} quoteHref="#quote" />

      <main>
        {/* Hero: one screen, the part in the middle */}
        <section className="mfg-hero mfg-dark" aria-labelledby="mfg-h1">
          <div className="mfg-wrap mfg-hero__top">
            <p className="mfg-eyebrow">
              {site.company.name} · {site.company.area}, {site.company.city} · Since {site.company.since}
            </p>
            <h1 id="mfg-h1" className="mfg-display">
              {site.hero.headline}
            </h1>
          </div>
          <div className="mfg-hero__part">
            <HeroPart accent={site.accent} />
          </div>
          <div className="mfg-wrap mfg-hero__bottom">
            <p>{site.hero.line}</p>
            <div className="mfg-hero__ctas">
              <a href="#quote" className="mfg-btn mfg-btn--accent">
                Send your drawing <ArrowIcon />
              </a>
              <a href={go.whatsapp} target="_blank" rel="noopener noreferrer" className="mfg-btn mfg-btn--ghost">
                <WhatsAppIcon /> WhatsApp us
              </a>
            </div>
            <ul className="mfg-trust" aria-label="Credentials">
              {site.trust.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Customers */}
        <section className="mfg-customers" aria-label="Customers">
          <p>{site.customers.heading}</p>
          <div className="mfg-marquee" aria-hidden>
            <div className="mfg-marquee__track">
              {[...site.customers.names, ...site.customers.names].map((n, i) => (
                <span key={i} className="mfg-marquee__item">
                  {n}
                </span>
              ))}
            </div>
          </div>
          <ul className="sr-only">
            {site.customers.names.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>

        {/* Signature moment: the part made as you scroll */}
        <Story site={site} />

        {/* Capabilities */}
        <section id="capabilities" className="mfg-section" aria-labelledby="cap-h">
          <div className="mfg-wrap">
            <Reveal className="mfg-section-head mfg-section-head--split">
              <div style={{ display: "grid", gap: 18 }}>
                <p className="mfg-eyebrow">Capabilities</p>
                <h2 id="cap-h" className="mfg-h2">
                  Everything your part needs, under one roof.
                </h2>
              </div>
              <p className="mfg-lede">Turning, milling, grinding and assembly in one plant, so your part never waits at another supplier and one team answers for it.</p>
            </Reveal>
            <div className="mfg-bento">
              {site.capabilities.map((c, i) => (
                <Reveal key={c.name} className="mfg-cap" delay={(i % 2) * 0.08}>
                  <div className="mfg-cap__img">
                    <Image unoptimized src={c.photo.src} alt={c.photo.alt} fill sizes="(max-width: 1080px) 100vw, 60vw" />
                  </div>
                  <div className="mfg-cap__body">
                    <h3>{c.name}</h3>
                    <p>{c.line}</p>
                    <dl className="mfg-specs">
                      {c.specs.map((s) => (
                        <div key={s.k}>
                          <dt>{s.k}</dt>
                          <dd>{s.v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Numbers */}
        <section className="mfg-numbers" aria-label="The plant in numbers">
          <div className="mfg-wrap">
            <div className="mfg-numbers__grid">
              {site.numbers.map((n) => (
                <div key={n.label} className="mfg-num">
                  <Count value={n.value} decimals={n.decimals} prefix={n.prefix} suffix={n.suffix} />
                  <span>{n.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Industries */}
        <section id="industries" className="mfg-section" aria-labelledby="ind-h">
          <div className="mfg-wrap">
            <Reveal className="mfg-section-head mfg-section-head--split">
              <div style={{ display: "grid", gap: 18 }}>
                <p className="mfg-eyebrow">Industries we supply</p>
                <h2 id="ind-h" className="mfg-h2">
                  Parts running inside machines you know.
                </h2>
              </div>
              <p className="mfg-lede">From passenger cars to railway bogies. If your industry isn&apos;t listed, send the drawing anyway. Most parts start with the same steel and the same care.</p>
            </Reveal>
            <div className="mfg-ind">
              {site.industries.map((ind, i) => (
                <Reveal key={ind.name} className="mfg-ind__card" delay={(i % 3) * 0.06}>
                  <h3>
                    {ind.name} <ArrowUpRight />
                  </h3>
                  <div>
                    <small>Parts we make</small>
                    <ul>
                      {ind.parts.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Quality */}
        <section id="quality" className="mfg-section mfg-dark" aria-labelledby="q-h">
          <div className="mfg-wrap mfg-quality__grid">
            <Reveal>
              <div style={{ display: "grid", gap: 18 }}>
                <p className="mfg-eyebrow">Quality</p>
                <h2 id="q-h" className="mfg-h2">
                  {site.quality.headline}
                </h2>
                <p className="mfg-lede">{site.quality.line}</p>
              </div>
              <div className="mfg-points">
                {site.quality.points.map((p) => (
                  <div key={p.name}>
                    <b>{p.name}</b>
                    <p>{p.detail}</p>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal className="mfg-quality__media" delay={0.1}>
              <figure className="mfg-quality__img">
                <Image unoptimized src={site.quality.photo.src} alt={site.quality.photo.alt} fill sizes="(max-width: 860px) 100vw, 50vw" />
                <figcaption>Finished lot · ready for inspection</figcaption>
              </figure>
              <ul className="mfg-certs" aria-label="Certificates">
                {site.quality.certificates.map((c) => (
                  <li key={c.name}>
                    <span className="mfg-certs__seal">
                      <SealIcon />
                    </span>
                    <div>
                      <b>{c.name}</b>
                      <span>{c.scope}</span>
                    </div>
                    <a href={go.whatsapp} target="_blank" rel="noopener noreferrer" aria-label={`Ask for the ${c.name} certificate`}>
                      <DownloadIcon /> PDF
                    </a>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* Machines */}
        <section id="machines" className="mfg-section" aria-labelledby="m-h">
          <div className="mfg-wrap">
            <Reveal className="mfg-section-head mfg-section-head--split">
              <div style={{ display: "grid", gap: 18 }}>
                <p className="mfg-eyebrow">Machine list</p>
                <h2 id="m-h" className="mfg-h2">
                  The machines your parts would run on.
                </h2>
              </div>
              <p className="mfg-lede">Engineers ask for this first, so here it is. Working sizes are the largest part each machine takes.</p>
            </Reveal>
            <Reveal>
              <MachineTable machines={site.machines} />
            </Reveal>
          </div>
        </section>

        {/* Process */}
        <section className="mfg-section" style={{ paddingTop: 0 }} aria-labelledby="p-h">
          <div className="mfg-wrap">
            <Reveal className="mfg-section-head">
              <p className="mfg-eyebrow">Working with us</p>
              <h2 id="p-h" className="mfg-h2">
                From your drawing to regular supply.
              </h2>
            </Reveal>
            <ol className="mfg-process">
              {site.process.map((s, i) => (
                <Reveal as="li" key={s.title} delay={i * 0.07}>
                  <span className="mfg-process__mark" aria-hidden />
                  <time>{s.time}</time>
                  <h3>{s.title}</h3>
                  <p>{s.line}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Plant */}
        <section id="plant" className="mfg-section" style={{ paddingTop: 0 }} aria-labelledby="pl-h">
          <div className="mfg-wrap">
            <Reveal className="mfg-section-head mfg-section-head--split">
              <div style={{ display: "grid", gap: 18 }}>
                <p className="mfg-eyebrow">The plant</p>
                <h2 id="pl-h" className="mfg-h2">
                  {site.plant.headline}
                </h2>
              </div>
              <p className="mfg-lede">{site.plant.line}</p>
            </Reveal>
            <div className="mfg-plant__grid">
              {site.plant.photos.slice(0, 3).map((p, i) => (
                <Reveal as="figure" key={p.src} delay={i * 0.08}>
                  <Image unoptimized src={p.src} alt={p.alt} fill sizes={i === 0 ? "(max-width: 860px) 100vw, 60vw" : "(max-width: 860px) 50vw, 40vw"} />
                </Reveal>
              ))}
            </div>
            <div className="mfg-plant__foot">
              <div className="mfg-plant__addr">
                <PinIcon />
                <span>
                  <b>{site.company.name}</b>
                  <br />
                  {site.contact.address.slice(0, 2).join(", ")}
                </span>
              </div>
              <div className="mfg-plant__ctas">
                <a href={site.contact.mapUrl} target="_blank" rel="noopener noreferrer" className="mfg-btn mfg-btn--line">
                  Open in Maps <ArrowUpRight />
                </a>
                <a href={go.visit} target="_blank" rel="noopener noreferrer" className="mfg-btn mfg-btn--ink">
                  Book a plant visit <ArrowIcon />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonial */}
        {site.testimonial && (
          <section className="mfg-section" style={{ paddingTop: 0 }} aria-label="What a customer says">
            <div className="mfg-wrap">
              <Reveal>
                <figure className="mfg-quote">
                  <blockquote>{site.testimonial.quote}</blockquote>
                  <figcaption>{site.testimonial.who}</figcaption>
                </figure>
              </Reveal>
            </div>
          </section>
        )}

        {/* Request a quote */}
        <section id="quote" className="mfg-section mfg-dark mfg-rfq" aria-labelledby="rfq-h">
          <div className="mfg-wrap mfg-rfq__grid">
            <Reveal>
              <p className="mfg-eyebrow">Request a quote</p>
              <h2 id="rfq-h" className="mfg-display" style={{ marginTop: 18 }}>
                Send us your drawing.
              </h2>
              <p className="mfg-lede" style={{ marginTop: 20 }}>
                A priced quote with lead time within 48 hours. If something in the design would cost you more than it should, we&apos;ll tell you.
              </p>
              <div className="mfg-person">
                <span className="mfg-person__avatar" aria-hidden>
                  {initials}
                </span>
                <div>
                  <b>{site.contact.salesName}</b>
                  <span>
                    {site.contact.salesRole}. Replies within one working day.
                  </span>
                </div>
              </div>
              <div className="mfg-direct">
                <a href={go.phone}>
                  <PhoneIcon /> {site.contact.phone}
                </a>
                <a href={go.email}>
                  <MailIcon /> {site.contact.email}
                </a>
                <div>
                  <ClockIcon /> {site.contact.hours}
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <QuoteForm site={site} whatsappHref={go.drawing} />
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="mfg-footer mfg-dark">
        <div className="mfg-wrap">
          <div className="mfg-footer__grid">
            <div>
              <a href="#top" className="mfg-logo" style={{ color: "var(--m-stage-ink)" }}>
                <b>{site.company.short}</b>
                <span>{site.company.descriptor}</span>
              </a>
              <address>
                {site.contact.address.map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </address>
            </div>
            <div>
              <h4>Company</h4>
              <ul>
                {NAV.map((l) => (
                  <li key={l.href}>
                    <a href={l.href}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Contact</h4>
              <ul>
                <li>
                  <a href={go.phone}>{site.contact.phone}</a>
                </li>
                <li>
                  <a href={go.email}>{site.contact.email}</a>
                </li>
                <li>
                  <a href={go.whatsapp} target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4>Certified</h4>
              <ul>
                {site.quality.certificates.map((c) => (
                  <li key={c.name}>{c.name}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mfg-footer__base">
            <span>
              © {year} {site.company.name}
            </span>
            <span className="mfg-credit">
              Website by{" "}
              <a href={`https://amfire.in/?ref=${site.slug}`} target="_blank" rel="noopener">
                amfire
              </a>
            </span>
          </div>
        </div>
      </footer>

      <a href={go.whatsapp} target="_blank" rel="noopener noreferrer" className="mfg-wa" aria-label="Chat on WhatsApp">
        <WhatsAppIcon />
      </a>
    </div>
  );
}
