import Link from "next/link";
import { EmptyState, cx, formatDateTime } from "@/components/ui";
import type { ActivityItem } from "@/server/portal";

const DOT: Record<ActivityItem["kind"], string> = {
  update: "bg-[#1d3fa3]",
  milestone: "bg-brand",
  invoice: "bg-[#9a3412]",
  payment: "bg-success",
  proposal: "bg-fg",
  change: "bg-[#7c3aed]",
  item: "bg-muted",
};

export function ActivityList({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return <EmptyState title="Nothing yet.">Updates, approvals and invoices will show up here.</EmptyState>;
  return (
    <ol className="rounded-card bg-surface p-2 ring-1 ring-line">
      {items.map((e, i) => {
        const body = (
          <div className="flex gap-3 rounded-xl px-3 py-3">
            <span aria-hidden className={cx("mt-1.5 size-2.5 shrink-0 rounded-full", DOT[e.kind])} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="font-medium">{e.title}</p>
                <span className="text-xs text-muted">{formatDateTime(e.at)}</span>
              </div>
              {e.detail && <p className="mt-0.5 line-clamp-2 text-sm whitespace-pre-wrap text-fg/75">{e.detail}</p>}
            </div>
          </div>
        );
        return (
          <li key={i} className="border-b border-line last:border-0">
            {e.href ? (
              <Link href={e.href} className="block rounded-xl hover:bg-subtle">
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ol>
  );
}
