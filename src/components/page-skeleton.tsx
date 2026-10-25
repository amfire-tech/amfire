/** Shown the moment a link is clicked, while the page's data loads. */
export function PageSkeleton({ cards = 4 }: { cards?: number }) {
  const bar = "rounded-full bg-fg/[0.07] motion-safe:animate-pulse";
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-3">
        <div className={`${bar} h-8 w-56`} />
        <div className={`${bar} h-4 w-full max-w-xl`} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="rounded-card bg-surface p-5 ring-1 ring-line">
            <div className={`${bar} h-3 w-24`} />
            <div className={`${bar} mt-3 h-7 w-32`} />
          </div>
        ))}
      </div>
      <div className="rounded-card bg-surface p-5 ring-1 ring-line sm:p-6">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-0">
            <div className={`${bar} h-4 w-1/3`} />
            <div className={`${bar} h-4 w-20`} />
          </div>
        ))}
      </div>
    </div>
  );
}
