import type { Metadata } from "next";
import Image from "next/image";
import { FreeDemoSection } from "@/components/free-demo";
import { Arrow, Container, Eyebrow } from "@/components/ui";
import { FOUNDERS, type Founder } from "@/config/founders";
import { contact, site } from "@/config/site";

// About page, built from the approved spec (https://claude.ai/artifact/PbcT4d9dNW8QxZwjLHFzu7).
// The homepage sells the idea; this page earns trust in the people. It answers four
// questions in order: why we exist, who you will deal with, how we behave, and whether
// we are a real company. One step quieter than the homepage, and no orange, because
// nothing here is a stuck point.

export const metadata: Metadata = {
  title: "About the founders",
  description:
    "amfire is a small team in Pune, led by its founders. We learn how work moves through a company, find where it gets stuck, and build the systems that keep it moving.",
  alternates: { canonical: "/about" },
};

/** Promises a client can check. Not a sequence, so no numbers. */
const COMMITMENTS = [
  { title: "We measure before we promise.", body: "We record your starting point from your own records first, and report every result against it." },
  { title: "We speak plainly.", body: "Orders, payments and customers, not frameworks and acronyms." },
  { title: "You always see the real status.", body: "Progress, approvals and problems are in your Client Hub, any time. Never progress we made up." },
  { title: "People make the decisions.", body: "We use modern tools, AI included, to work faster. Prices, approvals and anything that matters stay with people." },
];

const H2 = "text-[2rem] leading-[1.1] font-medium tracking-[-0.025em] text-balance sm:text-[2.75rem]";
const LEDE = "text-lg leading-[1.55] text-muted sm:text-xl";

/**
 * A founder, portrait first: the face is the point of this section. Portraits are
 * shown in black and white so photos taken on different days and cameras read as one set.
 */
function FounderCard({ founder }: { founder: Founder }) {
  const src = founder.portrait ?? founder.photo;
  return (
    <article>
      {src && (
        <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-subtle">
          <Image src={src} alt={founder.name} fill sizes="(min-width: 640px) 560px, 100vw" className="object-cover grayscale" />
        </div>
      )}
      <h3 className="mt-6 text-2xl font-medium tracking-tight">{founder.name}</h3>
      <p className="mt-1 text-[13px] font-medium tracking-[0.12em] text-muted uppercase">{founder.role}</p>
      <p className="mt-4 max-w-md text-[17px] leading-relaxed text-muted">{founder.bio}</p>
      {founder.linkedin && (
        <a href={founder.linkedin} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-medium underline-offset-[6px] hover:underline">
          LinkedIn <Arrow />
        </a>
      )}
    </article>
  );
}

export default function AboutPage() {
  const several = FOUNDERS.length > 1;
  const facts = [
    { term: "Based in", value: "Pune, India" },
    { term: "Write to", value: site.contactEmail, href: contact.email },
    { term: "Call", value: site.contactPhone, href: contact.call },
    { term: "Hours", value: "Mon–Sat, 10 AM–7 PM IST" },
  ];

  return (
    <>
      {/* 1 · Why we exist */}
      <section>
        <Container className="pt-20 pb-20 sm:pt-28 sm:pb-28">
          <Eyebrow>About amfire</Eyebrow>
          <h1 className="mt-6 max-w-[13em] text-[2.75rem] leading-[1.03] font-medium tracking-[-0.04em] text-balance sm:text-6xl sm:leading-[1.02]">
            You should lead your company, not chase it.
          </h1>
          <p className={`mt-8 max-w-[33rem] text-pretty sm:mt-10 ${LEDE}`}>
            amfire is a small team based in Pune. We learn how work moves through a company, find where it gets stuck, and build the systems that keep it moving. Then we stay
            and run them.
          </p>
        </Container>
      </section>

      {/* 2 · Who you will deal with */}
      {FOUNDERS.length > 0 && (
        <section aria-labelledby="founders" className="border-t border-line">
          <Container className="py-24 sm:py-32">
            <div className="max-w-2xl">
              <Eyebrow>The people behind amfire</Eyebrow>
              <h2 id="founders" className={`mt-5 ${H2}`}>
                You work with {several ? "the founders" : "a founder"}, directly.
              </h2>
              <p className={`mt-6 ${LEDE}`}>
                No sales team in between. The people who listen to your problem are the people who solve it.
              </p>
            </div>
            <div className="mt-16 grid gap-16 sm:grid-cols-2 sm:gap-10 lg:gap-16">
              {FOUNDERS.map((f) => (
                <FounderCard key={f.name} founder={f} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* 3 · How we behave */}
      <section className="border-t border-line bg-subtle">
        <Container className="py-24 sm:py-32">
          <Eyebrow>What you can hold us to</Eyebrow>
          <dl className="mt-10 grid border-t border-fg/15 sm:grid-cols-2 lg:grid-cols-4">
            {COMMITMENTS.map((c) => (
              <div key={c.title} className="border-b border-fg/15 py-8 sm:pr-8 lg:border-b-0 lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:pl-8">
                <dt className="text-xl leading-snug font-medium tracking-tight">{c.title}</dt>
                <dd className="mt-3 text-[15px] leading-relaxed text-muted">{c.body}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* 4 · Is this a real company: plain facts, from the site settings so they match the footer. */}
      <section className="border-t border-line" aria-label="Where to find us">
        <Container>
          <dl className="flex flex-col gap-x-12 gap-y-3 py-8 text-[15px] sm:flex-row sm:flex-wrap">
            {facts.map((f) => (
              <div key={f.term} className="grid grid-cols-[5.5rem_1fr] sm:flex sm:gap-3">
                <dt className="text-muted">{f.term}</dt>
                <dd>
                  {f.href ? (
                    <a href={f.href} className="underline-offset-4 hover:underline">
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

      {/* 5 · Close: the same invitation as the homepage. */}
      <FreeDemoSection
        body={`A 30-minute conversation with the ${several ? "founders" : "founder"} about how your company runs today. If we are not the right fit, we will tell you.`}
      />
    </>
  );
}
