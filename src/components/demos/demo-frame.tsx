import type { ReactNode } from "react";

/** Browser-window style frame that marks content as an interactive demo with sample data. */
export function DemoFrame({ label, note, children }: { label: string; note: string; children: ReactNode }) {
  return (
    <figure className="overflow-hidden rounded-[1.5rem] bg-surface shadow-[0_30px_80px_-40px_rgba(0,0,0,0.45)] ring-1 ring-line">
      <div className="flex items-center gap-3 border-b border-line bg-subtle px-4 py-2.5">
        <span aria-hidden className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className="truncate text-xs font-medium text-muted">{label}</span>
        <span className="ml-auto shrink-0 rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted uppercase ring-1 ring-line">
          Interactive
        </span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
      <figcaption className="border-t border-line px-4 py-2 text-[11px] text-muted">{note}</figcaption>
    </figure>
  );
}
