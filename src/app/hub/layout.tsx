import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { WhatsAppIcon } from "@/components/contact";
import { Logo } from "@/components/ui";
import { contact, site } from "@/config/site";
import { getDb } from "@/db";
import { requireActor } from "@/lib/session";
import { getClientTodo } from "@/server/portal";
import { HubNav } from "./nav";

export const metadata: Metadata = { title: { default: "Client Hub", template: "%s · AMFIRE Client Hub" }, robots: { index: false } };

export default async function HubLayout({ children }: LayoutProps<"/hub">) {
  const actor = await requireActor("/hub");
  const todo = actor.clientOrgIds.length ? (await getClientTodo(await getDb(), actor)).count : 0;
  return (
    <div className="flex min-h-full flex-1 flex-col bg-subtle lg:flex-row">
      <aside className="border-b border-line bg-surface print:hidden lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex h-full flex-col gap-4 p-4 lg:p-5">
          <div className="flex items-center justify-between lg:block">
            <Link href="/hub" className="flex items-center gap-2" aria-label="Client Hub home">
              <Logo className="h-6" /> <span className="text-sm font-medium text-muted">Client Hub</span>
            </Link>
            <a
              href={contact.whatsapp()}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`WhatsApp AMFIRE on ${site.contactPhone}`}
              className="grid size-10 place-items-center rounded-full text-[#128c4b] ring-1 ring-line lg:hidden"
            >
              <WhatsAppIcon className="size-5" />
            </a>
          </div>
          {actor.clientOrgIds.length > 0 && <HubNav todo={todo} />}
          <div className="mt-auto hidden space-y-3 border-t border-line pt-4 text-sm lg:block">
            <div className="rounded-xl bg-subtle p-3">
              <p className="font-medium">Talk to a person</p>
              <p className="mt-0.5 text-xs text-muted">{site.availability.hours}</p>
              <div className="mt-2 flex flex-col gap-1">
                <a href={contact.whatsapp()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[#128c4b] hover:underline">
                  <WhatsAppIcon className="size-4" /> WhatsApp
                </a>
                <a href={contact.email} className="text-muted hover:text-fg hover:underline">
                  {site.contactEmail}
                </a>
              </div>
            </div>
            <div>
              <p className="truncate font-medium">{actor.name}</p>
              <p className="truncate text-muted">{actor.email}</p>
            </div>
            <div className="flex items-center justify-between">
              <Link href="/account" className="text-muted underline-offset-4 hover:text-fg hover:underline">
                Password
              </Link>
              {actor.internalRole && (
                <Link href="/hq" className="text-muted underline-offset-4 hover:text-fg hover:underline">
                  HQ
                </Link>
              )}
              <form action={signOut}>
                <button className="text-muted underline-offset-4 hover:text-fg hover:underline">Sign out</button>
              </form>
            </div>
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-5xl">{children}</div>
        <div className="mt-10 flex items-center justify-between gap-3 border-t border-line pt-4 text-sm text-muted lg:hidden">
          <Link href="/account" className="underline-offset-4 hover:underline">
            Password
          </Link>
          <form action={signOut}>
            <button className="underline-offset-4 hover:underline">Sign out</button>
          </form>
        </div>
      </main>
    </div>
  );
}
