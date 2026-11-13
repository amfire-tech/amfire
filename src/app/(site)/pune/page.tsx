import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PhoneIcon } from "@/components/contact";
import { FreeDemoSection } from "@/components/free-demo";
import { JsonLd } from "@/components/json-ld";
import { Arrow, Container, ConversationButton, Eyebrow } from "@/components/ui";
import { FOUNDERS } from "@/config/founders";
import { contact, site } from "@/config/site";
import { breadcrumbJsonLd, puneJsonLd } from "@/config/structured-data";

// amfire in Pune, built from the approved spec 11 (14 Nov 2026, docs/seo/manufacturing-pune-spec.html,
// https://claude.ai/artifact/8utidk5hspPCCT2Q7LqJnC). The only city page while Pune is the only place
// we are: pages for cities we don't work in are doorway pages. Name, place, phone and hours match the
// Google Business Profile and the directories word for word. No orange: nothing here is a stuck point.

export const metadata: Metadata = {
  title: "AI automation and operations engineering in Pune",
  description: "A founder-led firm based in Pune. We sit with your teams in person, find where work waits between them, and build the systems that keep it moving.",
  alternates: { canonical: "/pune" },
};

const H2 = "text-[2rem] leading-[1.1] font-medium tracking-[-0.025em] text-balance sm:text-[2.75rem]";
const LEDE = "text-lg leading-[1.55] text-muted sm:text-xl";

/** The belts on the sales plan, as listed in the Business Profile's service areas. */
const BELTS = ["Bhosari and Pimpri-Chinchwad", "Chakan", "Talegaon", "Ranjangaon", "Hinjawadi", "Pune city"];
const SERVICE_AREAS = ["Pune", "Pimpri-Chinchwad", "Bhosari", "Chakan", "Talegaon Dabhade", "Ranjangaon", "Hinjawadi"];

/** A real sequence, so it is numbered. Same stages and promises as How we work, with the local difference. */
const STEPS = [
  { title: "A 30-minute conversation", body: "By phone, or at your office if you are in Pune." },
  {
    title: "The Operations Review, on site",
    body: "About two weeks: a few hours with each team lead, then your map, your starting point, what the delays cost and where to start.",
  },
  { title: "Build and run", body: "The founder you first met stays responsible for the result." },
];

/** One line per founder for this page; the full bios live on About. */
const FOUNDER_LINES: Record<string, string> = {
  "Navanish Pandey": "Designs and builds the systems amfire delivers.",
  "Prashant Dixit": "Leads amfire’s work with accounting and professional firms.",
};

/** Where the belts sit around the city, roughly to scale. Our own drawing, not map tiles: fast and in the site's look. */
function BeltMap() {
  const dots: { name: string; x: number; y: number; anchor?: "end" }[] = [
    { name: "Pimpri-Chinchwad", x: 240, y: 128, anchor: "end" },
    { name: "Bhosari", x: 266, y: 134 },
    { name: "Chakan", x: 282, y: 56 },
    { name: "Talegaon", x: 176, y: 104, anchor: "end" },
    { name: "Hinjawadi", x: 205, y: 160, anchor: "end" },
    { name: "Ranjangaon", x: 360, y: 110 },
  ];
  return (
    <svg viewBox="0 0 520 300" role="img" aria-label="Drawing of Pune with the industrial belts around it" className="mx-auto mt-12 w-full max-w-xl">
      <circle cx="260" cy="170" r="60" className="fill-none stroke-line" />
      <circle cx="260" cy="170" r="120" className="fill-none stroke-line" />
      <circle cx="260" cy="170" r="7" className="fill-page stroke-fg" strokeWidth="1.5" />
      <text x="272" y="174" className="fill-fg text-[13px] font-medium">
        Pune
      </text>
      {dots.map((d) => (
        <g key={d.name}>
          <circle cx={d.x} cy={d.y} r="4.5" className="fill-fg" />
          <text x={d.anchor === "end" ? d.x - 9 : d.x + 10} y={d.y + 4} textAnchor={d.anchor === "end" ? "end" : "start"} className="fill-fg text-[13px]">
            {d.name}
          </text>
        </g>
      ))}
      <text x="514" y="294" textAnchor="end" className="fill-muted text-[13px]">
        Rings at roughly 25 and 50 km
      </text>
    </svg>
  );
}

export default function PunePage() {
  const facts = [
    { term: "amfire", value: site.location },
    { term: "Call or WhatsApp", value: site.contactPhone, href: contact.call },
    { term: "Email", value: site.contactEmail, href: contact.email },
    { term: "Hours", value: site.availability.hours },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Pune", path: "/pune" }])} />
      <JsonLd data={puneJsonLd(SERVICE_AREAS)} />

      {/* 1 · Opening: being local matters because we come to the plant. */}
      <section>
        <Container className="flex flex-col items-center pt-[clamp(3.5rem,10vh,7rem)] pb-20 text-center sm:pb-24">
          <Eyebrow>amfire in Pune</Eyebrow>
          <h1 className="mt-[clamp(1rem,2.5vh,1.5rem)] max-w-[13em] text-[length:clamp(2.75rem,min(4.6vw,8.5vh),3.75rem)] leading-[1.03] font-medium tracking-[-0.04em] text-balance sm:leading-[1.02]">
            Operations engineering, a short drive from your plant.
          </h1>
          <p className={`mt-[clamp(1.25rem,3.5vh,2.5rem)] max-w-[36rem] text-balance ${LEDE}`}>
            amfire is a founder-led firm based in Pune. We sit with your teams in person, map where work waits between them, then build and run the systems that keep
            it moving.
          </p>
          <div className="mt-[clamp(1.5rem,4vh,2.5rem)] flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:gap-8">
            <ConversationButton size="lg" className="w-full sm:w-auto" />
            <a href={contact.call} className="inline-flex items-center gap-2 py-2 text-[15px] font-medium underline-offset-[6px] hover:underline">
              <PhoneIcon /> Call {site.contactPhone}
            </a>
          </div>
        </Container>
      </section>

      {/* 2 · Where we work: the belts, drawn and named. */}
      <section className="border-t border-line">
        <Container className="py-24 sm:py-32">
          <h2 className={`text-center ${H2}`}>Across Pune’s industrial belts.</h2>
          <BeltMap />
          <ul className="mt-12 grid border-t border-line sm:grid-cols-2 lg:grid-cols-3 sm:gap-x-10">
            {BELTS.map((b) => (
              <li key={b} className="border-b border-line py-4 text-lg font-medium tracking-tight">
                {b}
              </li>
            ))}
          </ul>
          <p className={`mx-auto mt-10 max-w-[36rem] text-center text-balance ${LEDE}`}>Elsewhere in India and abroad, we work remotely and travel when the work needs it.</p>
        </Container>
      </section>

      {/* 3 · Why we come in person, in the buyer's terms. */}
      <section className="border-t border-line bg-subtle">
        <Container className="flex flex-col items-center py-24 text-center sm:py-32">
          <h2 className={`max-w-[17em] ${H2}`}>The work that gets stuck doesn’t show up on a video call.</h2>
          <p className={`mt-6 max-w-[36rem] text-balance ${LEDE}`}>
            It shows up at the dispatch desk at six in the evening, in the store when material runs short, and in accounts at month end. So we come and see it: a few
            hours with each team lead, at your desks, before we build anything.
          </p>
        </Container>
      </section>

      {/* 4 · How it starts */}
      <section className="border-t border-line">
        <Container className="py-24 sm:py-32">
          <h2 className={`text-center ${H2}`}>How it starts.</h2>
          <ol className="mt-12 border-t border-line">
            {STEPS.map((s, i) => (
              <li key={s.title} className="grid gap-3 border-b border-line py-8 md:grid-cols-[4rem_19rem_minmax(0,1fr)] md:gap-10">
                <p className="font-mono text-[13px] text-fg md:pt-1.5">0{i + 1}</p>
                <h3 className="text-2xl font-medium tracking-tight">{s.title}</h3>
                <p className="max-w-xl text-[17px] leading-relaxed text-muted md:pt-1">{s.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* 5 · The founders: greyscale portraits, as on About. */}
      {FOUNDERS.length > 0 && (
        <section className="border-t border-line bg-subtle">
          <Container className="py-24 sm:py-32">
            <h2 className={`text-center ${H2}`}>{FOUNDERS.length > 1 ? "Two founders, both in Pune." : "A founder in Pune."}</h2>
            <div className="mx-auto mt-14 grid max-w-4xl gap-14 sm:grid-cols-2 sm:gap-10">
              {FOUNDERS.map((f) => {
                const src = f.portrait ?? f.photo;
                return (
                  <article key={f.name}>
                    {src && (
                      <div className="relative aspect-[5/4] overflow-hidden rounded-md bg-page">
                        <Image src={src} alt={f.name} fill sizes="(min-width: 640px) 440px, 100vw" className="object-cover grayscale" />
                      </div>
                    )}
                    <h3 className="mt-6 text-2xl font-medium tracking-tight">{f.name}</h3>
                    <p className="mt-1 text-[13px] font-medium tracking-[0.12em] text-muted uppercase">{f.role}</p>
                    <p className="mt-3 text-[17px] leading-relaxed text-muted">{FOUNDER_LINES[f.name] ?? f.bio}</p>
                  </article>
                );
              })}
            </div>
            <p className="mt-12 text-center">
              <Link href="/about" className="inline-flex items-center gap-1.5 text-[15px] font-medium underline-offset-[6px] hover:underline">
                About the founders <Arrow />
              </Link>
            </p>
          </Container>
        </section>
      )}

      {/* 6 · Find us: identical to the Business Profile, the footer and the directories. */}
      <section className="border-t border-line" aria-label="Find us">
        <Container className="py-16 sm:py-20">
          <dl className="mx-auto grid max-w-3xl border-t border-line">
            {facts.map((f) => (
              <div key={f.term} className="grid gap-1 border-b border-line py-4 sm:grid-cols-[14rem_1fr] sm:gap-8">
                <dt className="font-medium">{f.term}</dt>
                <dd className="text-muted">
                  {f.href ? (
                    <a href={f.href} className="underline-offset-4 hover:text-fg hover:underline">
                      {f.value}
                    </a>
                  ) : (
                    f.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* 7 · Close */}
      <FreeDemoSection />
    </>
  );
}
