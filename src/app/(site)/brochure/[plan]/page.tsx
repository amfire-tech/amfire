import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Flame, Shopper } from "@/components/brochure/art";
import { BrochureGate } from "@/components/brochure/gate";
import { AutomateBrochure } from "@/components/brochure/automate-brochure";
import { Icon } from "@/components/brochure/icons";
import { OperateBrochure } from "@/components/brochure/operate-brochure";
import { PlanBrochure } from "@/components/brochure/plan-brochure";
import { Money } from "@/components/currency";
import { CheckList, Container } from "@/components/ui";
import { getDb } from "@/db";
import { AUTOMATE, OPERATE, brochureFor, isBrochurePlan } from "@/knowledge/brochures";
import { SERVICES } from "@/knowledge/catalog";
import { STARTING_PRICE } from "@/knowledge/pricing";
import { BROCHURE_COOKIE, monthlyOffer, readAccessCookie } from "@/server/brochures";

export async function generateMetadata({ params }: PageProps<"/brochure/[plan]">): Promise<Metadata> {
  const { plan } = await params;
  if (!isBrochurePlan(plan)) return {};
  return {
    title: `${SERVICES[plan].name} brochure — everything you get`,
    description:
      plan === "operate"
        ? "See exactly what amfire Operate delivers every month: 30 posts, 10 posters and banners, new features, AI tools, upkeep and every enquiry answered."
        : plan === "automate"
          ? "Watch amfire automations run live, see your day by hand against a day with amfire, and work out what one automated task is worth to you."
          : `See everything amfire ${SERVICES[plan].name} puts in your cart, from the free problem-finding session to the 90-day warranty.`,
    robots: { index: false },
  };
}

export default async function BrochurePage({ params }: PageProps<"/brochure/[plan]">) {
  const { plan } = await params;
  if (!isBrochurePlan(plan)) notFound();
  const brochure = brochureFor(plan);

  const access = readAccessCookie((await cookies()).get(BROCHURE_COOKIE)?.value);
  // A confirmed email unlocks every plan's brochure on this device.
  if (access) {
    const first = access.name.split(" ")[0];
    const offer = await monthlyOffer(await getDb());
    if (brochure) return <PlanBrochure brochure={brochure} name={first} offer={offer} />;
    return plan === "automate" ? <AutomateBrochure name={first} offer={offer} /> : <OperateBrochure name={first} offer={offer} />;
  }

  const name = SERVICES[plan].name;
  return (
    <div className="relative overflow-hidden bg-ink text-white">
      <Container className="relative grid items-center gap-10 py-12 sm:py-20 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <Flame className="h-10 w-auto" />
            <p className="text-xs font-semibold tracking-[0.2em] text-white/60 uppercase"><span className="normal-case">amfire</span> {name} · brochure</p>
          </div>
          {brochure ? (
            <>
              <h1 className="mt-5 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
                <span className="text-brand">
                  <Money amounts={STARTING_PRICE[plan]} />.
                </span>{" "}
                {brochure.hook}
              </h1>
              <p className="mt-4 max-w-lg text-white/70">
                Two shoppers, same budget. Watch what lands in each cart — then decide who you&apos;d rather build with.
              </p>
              <div className="mt-6 max-w-sm rounded-card bg-white/5 p-4 ring-1 ring-white/10">
                <Shopper boxes={10} tone="amfire" />
              </div>
              <div className="mt-6 text-sm text-white/80">
                <CheckList items={["What's in the cart, item by item", "What it would cost elsewhere", "Real projects we've shipped", `Our ${brochure.promises.length} promises`]} />
              </div>
            </>
          ) : plan === "automate" ? (
            <>
              <h1 className="mt-5 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
                {AUTOMATE.hook}{" "}
                <span className="text-brand">
                  From <Money amounts={STARTING_PRICE.automate} />.
                </span>
              </h1>
              <p className="mt-4 max-w-lg text-white/70">{AUTOMATE.promise}</p>
              <ol className="mt-6 flex max-w-lg items-center gap-1.5">
                {AUTOMATE.heroFlow.map((s, i) => (
                  <li key={s.label} className="flex flex-1 items-center gap-1.5 last:flex-none">
                    <span className="bg-brand grid size-10 shrink-0 place-items-center rounded-xl text-ink">
                      <Icon name={s.icon} className="size-5" />
                    </span>
                    {i < AUTOMATE.heroFlow.length - 1 && <span className="bg-brand h-0.5 flex-1 rounded-full opacity-60" />}
                  </li>
                ))}
              </ol>
              <div className="mt-6 text-sm text-white/80">
                <CheckList items={["Six automations, running live", "Your day by hand vs with amfire", "A calculator for your own numbers", "How your people stay in control"]} />
              </div>
            </>
          ) : (
            <>
              <h1 className="mt-5 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
                {OPERATE.hook}{" "}
                <span className="text-brand">
                  <Money amounts={STARTING_PRICE.operate} /> a month.
                </span>
              </h1>
              <p className="mt-4 max-w-lg text-white/70">{OPERATE.promise}</p>
              <ul className="mt-6 grid max-w-lg grid-cols-3 gap-2">
                {OPERATE.services.map((s) => (
                  <li key={s.id} className="rounded-2xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10">
                    <p className="text-xl font-semibold text-flame">{s.stat}</p>
                    <p className="text-[11px] leading-tight text-white/70">{s.statLabel}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-6 text-sm text-white/80">
                <CheckList items={["All six services, item by item", "One month, played day by day", "What hiring this team would cost", "Free builds on a 3-month plan"]} />
              </div>
            </>
          )}
        </div>
        <BrochureGate plan={plan} />
      </Container>
    </div>
  );
}
