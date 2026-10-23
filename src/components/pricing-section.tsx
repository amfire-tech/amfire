import Link from "next/link";
import { FREE_DEMO, SERVICES, SERVICE_DETAILS, type ServicePathId } from "@/knowledge/catalog";
import { CURRENCIES, DEMO_OFFER, STARTING_PRICE, type Priced } from "@/knowledge/pricing";
import { CurrencyToggle, ForCurrency, Money } from "./currency";
import { GiftIcon } from "./demo-offer";
import { ButtonLink, CheckList, Container, cx } from "./ui";

// The only place public prices appear: one dedicated section, placed near
// the end of a page so visitors meet the value before the price.

const PATHS: ServicePathId[] = ["build", "operate", "automate"];

/** Starting price with the free-demo offer taken off. */
const withOffer = (p: ServicePathId) =>
  Object.fromEntries(CURRENCIES.map((c) => [c, STARTING_PRICE[p][c] - DEMO_OFFER.amount[c]])) as Priced;

const INCLUDED: Record<ServicePathId, string[]> = {
  build: ["Free problem-finding session", "Designs you approve before we build", "Your own Client Hub to follow progress", "Code, data and documentation are yours"],
  operate: ["Website, hosting and business email", "Social media, SEO, marketing and lead follow-up", "Software upkeep, backups and security", "Sales tracking, monthly report and tech updates"],
  automate: ["Free process walkthrough", "Automation built for your process", "Runs alongside your old way first", "Your people approve what matters"],
};

export function PricingSection({ only }: { only?: ServicePathId }) {
  const paths = only ? [only] : PATHS;
  return (
    <section id="pricing" className="scroll-mt-20 border-t border-line bg-subtle">
      <Container className="py-14 sm:py-24">
        <div className={cx("max-w-2xl", !only && "mx-auto text-center")}>
          <p className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">Pricing</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {only ? `${SERVICES[only].name} pricing` : "Simple, fixed prices."}{" "}
            <span className="text-brand">
              The demo is free — and saves you <Money amounts={DEMO_OFFER.amount} />.
            </span>
          </h2>
          <p className="mt-4 text-muted">
            Fixed prices agreed up front, paid only after you approve the work. Book a free demo and get flat <Money amounts={DEMO_OFFER.amount} /> off
            any plan. <ForCurrency currency="INR">GST extra as applicable.</ForCurrency>
            <ForCurrency currency="USD">Taxes extra where applicable.</ForCurrency>
          </p>
          <div className={cx("mt-6 flex flex-wrap items-center gap-3 text-sm text-muted", !only && "justify-center")}>
            <span>Show prices in</span>
            <CurrencyToggle />
          </div>
        </div>

        <div className={cx("mt-8 grid gap-4 sm:mt-12 sm:gap-5", only ? "max-w-xl" : "lg:grid-cols-3")}>
          {paths.map((p) => {
            const featured = !only && p === "operate";
            return (
              <article
                key={p}
                className={cx(
                  "relative flex flex-col overflow-hidden rounded-[1.5rem] p-6 sm:p-7",
                  featured ? "bg-ink text-white ring-1 ring-ink" : "bg-surface ring-1 ring-line",
                )}
              >
                {featured && <div aria-hidden className="bg-brand absolute -top-20 -right-20 size-56 rounded-full opacity-30 blur-3xl" />}
                <div className="relative">
                  <p className="text-xs font-semibold tracking-widest uppercase opacity-60">{SERVICES[p].tagline}</p>
                  <h3 className="mt-3 text-2xl font-semibold">{SERVICES[p].name}</h3>
                  <p className="mt-5 text-sm opacity-70 sm:mt-6">Starts from</p>
                  <p className="text-4xl font-semibold tracking-tight">
                    <Money amounts={STARTING_PRICE[p]} />
                    {p === "operate" && <span className="text-base font-medium opacity-70"> /month</span>}
                  </p>
                  <p
                    className={cx(
                      "bg-brand shine mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-ink shadow-[0_8px_24px_-10px_rgba(255,69,58,0.75)]",
                    )}
                  >
                    <GiftIcon />
                    <span>
                      <Money amounts={withOffer(p)} />
                      {p === "operate" ? " for your first month" : ""} with the free-demo offer
                    </span>
                  </p>
                  <p className="mt-4 text-sm opacity-80">{SERVICE_DETAILS[p].model}</p>
                  <div className="mt-6 text-sm">
                    <CheckList items={INCLUDED[p]} />
                  </div>
                </div>
                <div className="relative mt-auto pt-8">
                  <ButtonLink href={`/start?goal=${SERVICE_DETAILS[p].goal}`} variant={featured || only ? "primary" : "secondary"} className="w-full whitespace-normal text-center">
                    <span>
                      {FREE_DEMO.cta} · save <Money amounts={DEMO_OFFER.amount} />
                    </span>
                  </ButtonLink>
                  {!only && (
                    <Link href={`/services/${p}`} className="mt-1 block py-2.5 text-center text-sm opacity-70 hover:opacity-100">
                      About {SERVICES[p].name} →
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
