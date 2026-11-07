import Link from "next/link";
import { Analytics } from "@/components/analytics";
import { OneClickBooking } from "@/components/cal-booking";
import { PhoneIcon, WhatsAppIcon } from "@/components/contact";
import { JsonLd } from "@/components/json-ld";
import { SiteHeader } from "@/components/site-header";
import { Container, Logo } from "@/components/ui";
import { contact, site } from "@/config/site";
import { organizationJsonLd } from "@/config/structured-data";

const COMPANY = [
  { href: "/how-we-work", label: "How we work" },
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
];

// Side doors: partner audiences reach these from outreach and from here, not from the main navigation.
const PARTNERS = [
  { href: "/agencies", label: "For agencies" },
  { href: "/partners", label: "For CA firms" },
];

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <Analytics />
      <OneClickBooking />
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-fg px-4 py-2 text-page focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <SiteHeader />

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="bg-ink text-white/65">
        {/* A container-width hairline separates the footer from a dark closing band above it. */}
        <Container>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 border-t border-white/10 py-14 sm:py-20 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
            <div className="col-span-2 lg:col-span-1">
              <Logo inverse className="h-7" />
              <p className="mt-4 text-[13px] font-medium tracking-[0.12em] text-white/45 uppercase">
                {site.tagline}
              </p>
              <p className="mt-4 max-w-sm text-sm leading-relaxed">
                {site.description}
              </p>
            </div>
            <nav aria-label="Company" className="flex flex-col text-sm">
              <p className="mb-2 text-[13px] font-medium tracking-[0.12em] text-white/45 uppercase">
                amfire
              </p>
              {COMPANY.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="py-1.5 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <nav aria-label="Partners" className="flex flex-col text-sm">
              <p className="mb-2 text-[13px] font-medium tracking-[0.12em] text-white/45 uppercase">
                Partners
              </p>
              {PARTNERS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="py-1.5 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="col-span-2 text-sm sm:col-span-1">
              <p className="mb-2 text-[13px] font-medium tracking-[0.12em] text-white/45 uppercase">
                Talk to us
              </p>
              <a
                href={contact.email}
                className="mt-1 inline-block py-1.5 underline-offset-4 hover:text-white hover:underline"
              >
                {site.contactEmail}
              </a>
              <a
                href={contact.call}
                className="flex items-center gap-2 py-1.5 underline-offset-4 hover:text-white hover:underline"
              >
                <PhoneIcon /> Call {site.contactPhone}
              </a>
              <a
                href={contact.whatsapp()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 py-1.5 underline-offset-4 hover:text-white hover:underline"
              >
                <WhatsAppIcon /> WhatsApp us
              </a>
              {site.profiles
                .filter((u) => u.includes("linkedin.com/company"))
                .map((u) => (
                  <a
                    key={u}
                    href={u}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block py-1.5 underline-offset-4 hover:text-white hover:underline"
                  >
                    Follow amfire on LinkedIn
                  </a>
                ))}
              <p className="mt-2 text-[13px] text-white/50">
                {site.availability.hours}
              </p>
              <p className="mt-4">
                <Link
                  href="/login"
                  className="inline-block py-1.5 hover:text-white"
                >
                  Client sign-in →
                </Link>
              </p>
            </div>
          </div>
        </Container>
        <Container>
          <div className="flex flex-col gap-2 border-t border-white/10 py-6 text-[13px] text-white/45 sm:flex-row sm:justify-between">
            <span className="flex flex-wrap gap-x-4 gap-y-1">
              <span>
                © {new Date().getFullYear()} amfire · {site.location}
              </span>
              <Link href="/privacy" className="hover:text-white">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-white">
                Terms
              </Link>
            </span>
            <span>Every case study is a real client project.</span>
          </div>
        </Container>
      </footer>
    </>
  );
}
