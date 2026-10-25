// Shared UI primitives used by the website, AMFIRE HQ and the Client Hub.
// Colours use semantic tokens (page, surface, subtle, fg, muted, line) so
// the whole platform shares one light palette.

import Image from "next/image";
import Link from "next/link";
import { Children, type ComponentProps, type ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// --- Brand -----------------------------------------------------------------

/**
 * The AMFIRE logo (from the supplied artwork). `inverse` uses the white-ink
 * version for always-dark sections.
 */
export function Logo({ className = "h-7", inverse, priority }: { className?: string; inverse?: boolean; priority?: boolean }) {
  const common = { width: 1200, height: 325, priority, sizes: "200px" } as const;
  if (inverse) return <Image src="/brand/amfire-logo-inverse.png" alt="AMFIRE" {...common} className={cx("w-auto", className)} />;
  return <Image src="/brand/amfire-logo.png" alt="AMFIRE" {...common} className={cx("w-auto", className)} />;
}

// --- Buttons ---------------------------------------------------------------

type Variant = "primary" | "secondary" | "ghost" | "danger" | "inverse";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  // Ink text on the gradient keeps contrast above WCAG AA across the whole gradient, in both themes.
  primary: "bg-brand text-ink shadow-[0_8px_24px_-12px_rgba(255,69,58,0.7)] hover:brightness-105 active:brightness-95",
  secondary: "bg-surface text-fg ring-1 ring-inset ring-fg/20 hover:ring-fg/40 hover:bg-subtle",
  ghost: "text-fg hover:bg-subtle",
  danger: "bg-surface text-danger ring-1 ring-inset ring-danger/40 hover:bg-danger/10",
  inverse: "bg-white text-ink hover:bg-white/90",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({ variant, size, className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Arrow({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={cx("size-4", className)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}

// --- Layout ----------------------------------------------------------------

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("mx-auto w-full max-w-6xl px-4 sm:px-6", className)} {...props} />;
}

/**
 * Cards in a row you swipe through on phones (the next card peeks in), and a
 * plain grid from tablet width up. Keeps long card lists from filling the screen.
 */
export function SwipeRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {Children.map(children, (child) => (
        <div className="w-[85%] max-w-sm shrink-0 snap-start sm:w-auto sm:max-w-none">{child}</div>
      ))}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cx("inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-muted uppercase", className)}>
      <span aria-hidden className="bg-brand h-[3px] w-6 rounded-full" />
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("max-w-3xl", className)}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-lg text-muted">{description}</p>}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-sm text-muted">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && <div className="mt-2 max-w-2xl text-muted">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cx("rounded-card bg-surface p-5 ring-1 ring-line sm:p-6", className)} {...props} />;
}

export function CardTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <h2 className="text-base font-semibold">{children}</h2>
      {aside}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line p-8 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Notice({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning" | "success" | "error";
  title?: ReactNode;
  children?: ReactNode;
}) {
  const tones = {
    info: "bg-subtle text-fg",
    warning: "bg-[#fff6ed] text-[#7a2e0e] ring-1 ring-inset ring-[#fdba74]/60",
    success: "bg-[#ecfdf3] text-[#05603a] ring-1 ring-inset ring-[#6ce9a6]/60",
    error: "bg-[#fef3f2] text-[#912018] ring-1 ring-inset ring-[#fda29b]/60",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("rounded-xl px-4 py-3 text-sm", tones[tone])}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-1" : undefined}>{children}</div>}
    </div>
  );
}

// --- Status labels -----------------------------------------------------------

const STATUS: Record<string, { label: string; tone: "neutral" | "info" | "warn" | "good" | "bad" | "brand" }> = {
  // leads
  new: { label: "New", tone: "brand" },
  qualified: { label: "Qualified", tone: "info" },
  disqualified: { label: "Not a fit", tone: "neutral" },
  proposal_sent: { label: "Proposal sent", tone: "info" },
  won: { label: "Won", tone: "good" },
  lost: { label: "Lost", tone: "neutral" },
  // recommendations
  proposed: { label: "Proposed by agent", tone: "warn" },
  accepted: { label: "Accepted", tone: "good" },
  rejected: { label: "Rejected", tone: "neutral" },
  // proposals
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Awaiting decision", tone: "warn" },
  declined: { label: "Changes requested", tone: "bad" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
  // projects & milestones
  active: { label: "Active", tone: "info" },
  on_hold: { label: "On hold", tone: "warn" },
  completed: { label: "Completed", tone: "good" },
  not_started: { label: "Not started", tone: "neutral" },
  in_progress: { label: "In progress", tone: "info" },
  awaiting_approval: { label: "Awaiting approval", tone: "warn" },
  blocked: { label: "Blocked", tone: "bad" },
  done: { label: "Done", tone: "good" },
  // tasks
  todo: { label: "To do", tone: "neutral" },
  doing: { label: "Doing", tone: "info" },
  // agent runs & requests
  running: { label: "Running", tone: "info" },
  succeeded: { label: "Succeeded", tone: "good" },
  failed: { label: "Failed", tone: "bad" },
  open: { label: "Open", tone: "warn" },
  resolved: { label: "Resolved", tone: "good" },
  // change requests
  submitted: { label: "Needs an estimate", tone: "warn" },
  estimated: { label: "Estimate sent", tone: "info" },
  // monthly plans
  paused: { label: "Paused", tone: "warn" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  // approvals
  pending: { label: "Waiting for you", tone: "warn" },
  approved: { label: "Approved", tone: "good" },
  merged: { label: "Merged", tone: "neutral" },
};

const INVOICE_STATUS: Record<string, { label: string; tone: keyof typeof TONES }> = {
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Unpaid", tone: "warn" },
  overdue: { label: "Overdue", tone: "bad" },
  paid: { label: "Paid", tone: "good" },
  void: { label: "Void", tone: "neutral" },
};

export function InvoiceBadge({ status, overdue }: { status: string; overdue?: boolean }) {
  const s = INVOICE_STATUS[overdue ? "overdue" : status] ?? { label: status, tone: "neutral" as const };
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", TONES[s.tone])}>{s.label}</span>;
}

const TONES = {
  neutral: "bg-subtle text-muted",
  info: "bg-[#eff4ff] text-[#1d3fa3]",
  warn: "bg-[#fff6ed] text-[#9a3412]",
  good: "bg-[#ecfdf3] text-[#05603a]",
  bad: "bg-[#fef3f2] text-[#b42318]",
  brand: "bg-fg text-page",
};

export function statusLabel(status: string) {
  return STATUS[status]?.label ?? status;
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = STATUS[status] ?? { label: status, tone: "neutral" as const };
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", TONES[s.tone], className)}>
      {s.label}
    </span>
  );
}

export function PathBadge({ path }: { path: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-fg px-2.5 py-0.5 text-xs font-medium tracking-wide text-page uppercase">
      <span aria-hidden className="bg-brand size-1.5 rounded-full" />
      {path}
    </span>
  );
}

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center rounded-full bg-subtle px-2.5 py-1 text-xs font-medium text-fg/80 ring-1 ring-line", className)}>
      {children}
    </span>
  );
}

// --- Data display ------------------------------------------------------------

export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2.5 w-full overflow-hidden rounded-full bg-subtle ring-1 ring-line/60"
    >
      <div className="bg-brand h-full rounded-full transition-[width] duration-500" style={{ width: `${value}%` }} />
    </div>
  );
}

export function DescriptionList({ items }: { items: { term: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.term} className="min-w-0">
          <dt className="text-xs font-medium tracking-wide text-muted uppercase">{item.term}</dt>
          <dd className="mt-0.5 break-words">{item.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function BulletList({ items, empty = "None" }: { items: string[]; empty?: string }) {
  if (!items.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span aria-hidden className="bg-brand mt-2 size-1.5 shrink-0 rounded-full" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <svg aria-hidden viewBox="0 0 20 20" className="mt-0.5 size-5 shrink-0 text-signal" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 10.5l3.5 3.5 7.5-8" />
          </svg>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-card ring-1 ring-line">
      <table className="w-full min-w-[640px] border-collapse bg-surface text-left text-sm [&_td]:border-t [&_td]:border-line [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_th]:text-xs [&_th]:font-medium [&_th]:tracking-wide [&_th]:text-muted [&_th]:uppercase">
        {children}
      </table>
    </div>
  );
}

// --- Forms -------------------------------------------------------------------

export const inputClass =
  "block w-full rounded-xl bg-surface px-3.5 py-3 text-fg ring-1 max-sm:text-base sm:py-2.5 ring-inset ring-fg/15 placeholder:text-fg/40 focus:ring-2 focus:ring-signal focus:outline-none aria-[invalid=true]:ring-danger";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
}: {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
        {optional && <span className="font-normal text-muted"> (optional)</span>}
      </label>
      {hint && (
        <p id={`${htmlFor}-hint`} className="mt-0.5 text-sm text-muted">
          {hint}
        </p>
      )}
      <div className="mt-1.5">{children}</div>
      {error && (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

// --- Formatting --------------------------------------------------------------

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
}

export function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
}

export function timeAgo(d: Date | string) {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.round(h / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
