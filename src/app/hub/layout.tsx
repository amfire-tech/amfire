import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Container, Logo } from "@/components/ui";
import { contact, site } from "@/config/site";
import { requireActor } from "@/lib/session";

export const metadata: Metadata = { title: { default: "Client Hub", template: "%s · AMFIRE Client Hub" }, robots: { index: false } };

export default async function HubLayout({ children }: LayoutProps<"/hub">) {
  const actor = await requireActor("/hub");
  return (
    <div className="flex min-h-full flex-1 flex-col bg-subtle">
      <header className="border-b border-line bg-surface">
        <Container className="flex h-16 items-center justify-between gap-4">
          <Link href="/hub" className="flex items-center gap-2" aria-label="Client Hub home">
            <Logo className="h-6" /> <span className="hidden text-sm font-medium text-muted sm:inline">Client Hub</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            {actor.internalRole && (
              <Link href="/hq" className="hidden text-muted hover:text-fg sm:inline">
                Go to HQ
              </Link>
            )}
            <a href={contact.email} className="hidden text-muted hover:text-fg sm:inline">
              Talk to a person
            </a>
            <a href={contact.whatsapp()} target="_blank" rel="noopener noreferrer" className="hidden text-muted hover:text-fg sm:inline">
              WhatsApp {site.contactPhone}
            </a>
            <ThemeToggle />
            <form action={signOut}>
              <button className="text-muted underline-offset-4 hover:text-fg hover:underline">Sign out</button>
            </form>
          </div>
        </Container>
      </header>
      <main id="main" className="flex-1">
        <Container className="py-8 sm:py-10">{children}</Container>
      </main>
    </div>
  );
}
