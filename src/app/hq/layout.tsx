import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { Logo } from "@/components/ui";
import { requireStaffActor } from "@/lib/session";
import { HqNav } from "./nav";

export const metadata: Metadata = { title: { default: "HQ", template: "%s · amfire HQ" }, robots: { index: false } };

export default async function HqLayout({ children }: LayoutProps<"/hq">) {
  const actor = await requireStaffActor();
  return (
    <div className="flex min-h-full flex-1 flex-col bg-subtle lg:flex-row">
      <aside className="border-b border-line bg-surface print:hidden lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex h-full flex-col gap-4 p-4 lg:p-5">
          <div className="flex items-center justify-between lg:block">
            <Link href="/hq" className="flex items-center gap-2" aria-label="amfire HQ home">
              <Logo className="h-6" /> <span className="text-sm font-medium text-muted">HQ</span>
            </Link>
            <div className="flex items-center gap-3 lg:hidden">
              <form action={signOut}>
              <button className="px-1 py-2 text-sm text-muted underline-offset-4 hover:text-fg hover:underline">Sign out</button>
              </form>
            </div>
          </div>
          <HqNav />
          <div className="mt-auto hidden border-t border-line pt-4 text-sm lg:block">
            <p className="truncate font-medium">{actor.name}</p>
            <p className="truncate text-muted">{actor.internalRole === "owner" ? "Owner" : "Staff"}</p>
            <div className="mt-3 flex items-center justify-between">
              <Link href="/account" className="text-muted underline-offset-4 hover:text-fg hover:underline">
                Password
              </Link>
              <form action={signOut}>
                <button className="text-muted underline-offset-4 hover:text-fg hover:underline">Sign out</button>
              </form>
            </div>
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
