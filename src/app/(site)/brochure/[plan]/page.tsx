import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Flame, Shopper } from "@/components/brochure/art";
import { PlanBrochure } from "@/components/brochure/plan-brochure";
import { BrochureGate } from "@/components/brochure/gate";
import { Money } from "@/components/currency";
import { CheckList, Container } from "@/components/ui";
import { getDb } from "@/db";
import { brochureFor } from "@/knowledge/brochures";
import { SERVICES } from "@/knowledge/catalog";
import { STARTING_PRICE } from "@/knowledge/pricing";
import { BROCHURE_COOKIE, monthlyOffer, readAccessCookie } from "@/server/brochures";

export async function generateMetadata({ params }: PageProps<"/brochure/[plan]">): Promise<Metadata> {
  const { plan } = await params;
  const brochure = brochureFor(plan);
  if (!brochure) return {};
  return {
    title: `${SERVICES[brochure.path].name} brochure — everything you get`,
    description: `See everything amfire ${SERVICES[brochure.path].name} puts in your cart, from the free problem-finding session to the 90-day warranty.`,
    robots: { index: false },
  };
}

export default async function BrochurePage({ params }: PageProps<"/brochure/[plan]">) {
  const { plan } = await params;
  const brochure = brochureFor(plan);
  if (!brochure) notFound();

  const access = readAccessCookie((await cookies()).get(BROCHURE_COOKIE)?.value);
  // A confirmed email unlocks every plan's brochure on this device.
  if (access) {
    return <PlanBrochure brochure={brochure} name={access.name.split(" ")[0]} offer={await monthlyOffer(await getDb())} />;
  }

  const name = SERVICES[brochure.path].name;
  return (
    <div className="relative overflow-hidden bg-ink text-white">
      <div aria-hidden className="bg-brand absolute -top-40 -left-20 size-[28rem] rounded-full opacity-20 blur-3xl" />
      <Container className="relative grid items-center gap-10 py-12 sm:py-20 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <Flame className="h-10 w-auto" />
            <p className="text-xs font-semibold tracking-[0.2em] text-white/60 uppercase"><span className="normal-case">amfire</span> {name} · brochure</p>
          </div>
          <h1 className="mt-5 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
            <span className="text-brand">
              <Money amounts={STARTING_PRICE[brochure.path]} />
              {brochure.perMonth ? " a month" : ""}.
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
        </div>
        <BrochureGate plan={brochure.path} />
      </Container>
    </div>
  );
}
