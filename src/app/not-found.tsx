import { ButtonLink, Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <main id="main" className="grid flex-1 place-items-center bg-subtle px-4 py-24 text-center">
      <div>
        <div className="flex justify-center"><Logo className="h-10" /></div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-muted">It may have moved, or you may not have access to it.</p>
        <ButtonLink href="/" className="mt-8">
          Go to the homepage
        </ButtonLink>
      </div>
    </main>
  );
}
