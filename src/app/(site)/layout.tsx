import Link from "next/link";
import { PhoneIcon, WhatsAppIcon } from "@/components/contact";
import { OfferBar } from "@/components/demo-offer";
import { MobileActionBar } from "@/components/mobile-action-bar";
import { SiteHeader } from "@/components/site-header";
import { Container, Logo } from "@/components/ui";
import { contact, site } from "@/config/site";
import { SERVICES, type ServicePathId } from "@/knowledge/catalog";

const COMPANY = [
  { href: "/how-we-work", label: "How we work" },
  { href: "/work", label: "Examples" },
  { href: "/industries", label: "Industries" },
  { href: "/about", label: "About" },
];

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-fg px-4 py-2 text-page focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <OfferBar />
      <SiteHeader />

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="relative overflow-hidden bg-ink text-white/70">
        <div aria-hidden className="bg-brand absolute -bottom-40 left-1/2 h-64 w-[48rem] -translate-x-1/2 rounded-full opacity-15 blur-3xl" />
        <Container className="relative grid grid-cols-2 gap-x-6 gap-y-10 py-12 sm:py-16 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
          <div className="col-span-2 lg:col-span-1">
            <Logo inverse className="h-8" />
            <p className="mt-3 text-xs tracking-[0.25em] text-white/50 uppercase">{site.tagline}</p>
            <p className="mt-4 max-w-sm text-sm">{site.description}</p>
          </div>
          <nav aria-label="Services" className="flex flex-col text-sm">
            <p className="mb-1.5 font-medium text-white">Services</p>
            {(Object.keys(SERVICES) as ServicePathId[]).map((p) => (
              <Link key={p} href={`/services/${p}`} className="py-1.5 hover:text-white">
                {SERVICES[p].name}
              </Link>
            ))}
          </nav>
          <nav aria-label="Company" className="flex flex-col text-sm">
            <p className="mb-1.5 font-medium text-white">Company</p>
            {COMPANY.map((item) => (
              <Link key={item.href} href={item.href} className="py-1.5 hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="col-span-2 text-sm sm:col-span-1">
            <p className="font-medium text-white">Talk to a person</p>
            <a href={contact.email} className="mt-1 inline-block py-1.5 underline-offset-4 hover:text-white hover:underline">
              {site.contactEmail}
            </a>
            <a href={contact.call} className="flex items-center gap-2 py-1.5 underline-offset-4 hover:text-white hover:underline">
              <PhoneIcon /> Call {site.contactPhone}
            </a>
            <a href={contact.whatsapp()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 py-1.5 underline-offset-4 hover:text-white hover:underline">
              <WhatsAppIcon /> WhatsApp us
            </a>
            <p className="mt-2 text-xs text-white/50">{site.availability.hours}</p>
            <p className="mt-4">
              <Link href="/login" className="inline-block py-1.5 hover:text-white">
                Client sign in →
              </Link>
            </p>
          </div>
        </Container>
        <Container className="relative flex flex-col gap-2 border-t border-white/10 py-6 text-xs text-white/40 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} AMFIRE</span>
          <span>Examples on this site are illustrative scenarios, not client case studies.</span>
        </Container>
      </footer>
      <MobileActionBar />
    </>
  );
}
