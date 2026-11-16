import type { ReactNode } from "react";

// What we build and who for (Services, added 16 Nov 2026). Icon + name only, so a visitor who
// arrives through the demo sees in one glance that amfire builds far more than one system, for
// any industry. Icons are hand-drawn 24px line glyphs (1.5 stroke) so they match the site's type.

type Item = { name: string; icon: ReactNode };

const CAPABILITIES: Item[] = [
  { name: "AI agents", icon: <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9zM18.5 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" /> },
  { name: "Workflow automation", icon: <><rect x="3" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="14.5" y="13.5" width="6.5" height="6.5" rx="1.5" /><path d="M9.5 7.25h5a3 3 0 0 1 3 3v3.25" /></> },
  { name: "Chat & voice agents", icon: <path d="M5 4.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4.5 3.5v-3.5H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zM8 10.5h.01M12 10.5h.01M16 10.5h.01" /> },
  { name: "Document AI", icon: <><path d="M6.5 3h7.5l4.5 4.5V21h-12z" /><path d="M14 3v4.5h4.5M9.5 12.5h6M9.5 16h4" /></> },
  { name: "SaaS products", icon: <path d="M12 3.5l8.5 4.5L12 12.5 3.5 8zM3.5 12.5L12 17l8.5-4.5M3.5 16.5L12 21l8.5-4.5" /> },
  { name: "Websites & web apps", icon: <><rect x="3" y="4.5" width="18" height="15" rx="2" /><path d="M3 9h18M6 6.75h.01M8.5 6.75h.01" /></> },
  { name: "Mobile apps", icon: <><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M10.75 18.5h2.5" /></> },
  { name: "Custom ERP & CRM", icon: <><ellipse cx="12" cy="5.5" rx="7.5" ry="2.5" /><path d="M4.5 5.5v13c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5v-13M4.5 12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5" /></> },
  { name: "Data & dashboards", icon: <path d="M3.5 20.5h17M7 17v-6M12 17V6.5M17 17v-9" /> },
  { name: "Integrations & APIs", icon: <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4.5l-3 15" /> },
  { name: "Cloud & DevOps", icon: <path d="M7 19h10.5a4 4 0 0 0 .6-7.95A6.5 6.5 0 0 0 5.6 10.1 4.5 4.5 0 0 0 7 19z" /> },
  { name: "Product & UX design", icon: <><path d="M4 20l1.2-4.6L15.6 5a2.1 2.1 0 0 1 3 3L8.2 18.4z" /><path d="M13.5 7l3.5 3.5" /></> },
];

const SECTORS: Item[] = [
  { name: "Manufacturing", icon: <path d="M3 20.5V11l5.5 3.5V11l5.5 3.5V4h3.5v16.5zM3 20.5h18" /> },
  { name: "Healthcare", icon: <path d="M3 12h4l2-4 3.5 8 2.5-5.5 1.5 1.5h4.5" /> },
  { name: "Financial services", icon: <path d="M3.5 9L12 4l8.5 5zM5.5 10.5v7M10 10.5v7M14 10.5v7M18.5 10.5v7M3.5 20h17" /> },
  { name: "Real estate & construction", icon: <path d="M4 20.5V9l6-4.5V20.5M10 9.5h10v11M3 20.5h18M13.5 13h3M13.5 16.5h3M6.5 12h1M6.5 15.5h1" /> },
  { name: "Retail & e-commerce", icon: <path d="M5 8h14l-1 12.5H6zM9 10.5V7a3 3 0 0 1 6 0v3.5" /> },
  { name: "Education", icon: <path d="M2.5 9.5L12 5l9.5 4.5L12 14zM6.5 11.5v4.5c3 2.5 8 2.5 11 0v-4.5M21.5 9.5v5" /> },
  { name: "Logistics", icon: <><path d="M2.5 6h11v10.5h-11zM13.5 10h4.5l3.5 3.5v3h-8" /><circle cx="6.5" cy="17.5" r="1.75" /><circle cx="17.5" cy="17.5" r="1.75" /></> },
  { name: "Professional services", icon: <><rect x="3" y="7.5" width="18" height="12.5" rx="2" /><path d="M9 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5.5v2M3 13h18" /></> },
  { name: "Hospitality", icon: <path d="M4 18.5h16M5.5 18.5a6.5 6.5 0 0 1 13 0M12 9.5V7.5M10.5 7.5h3" /> },
  { name: "Technology", icon: <><rect x="6.5" y="6.5" width="11" height="11" rx="1.5" /><path d="M9.5 3v3.5M14.5 3v3.5M9.5 17.5V21M14.5 17.5V21M3 9.5h3.5M3 14.5h3.5M17.5 9.5H21M17.5 14.5H21" /></> },
];

function Glyph({ children, className }: { children: ReactNode; className: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

export function Capabilities() {
  return (
    <>
      <ul className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {CAPABILITIES.map((c) => (
          <li
            key={c.name}
            className="group flex flex-col gap-3 bg-surface px-4 py-[1.15rem] transition-colors duration-300 hover:bg-page max-sm:flex-row max-sm:items-center max-sm:gap-3 max-sm:py-3.5"
          >
            <Glyph className="size-[22px] shrink-0 text-fg transition-transform duration-300 group-hover:-translate-y-0.5">
              {c.icon}
            </Glyph>
            <span className="text-[14.5px] leading-snug font-medium tracking-[-0.01em] max-sm:text-[13.5px]">{c.name}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-start md:gap-8">
        <p className="shrink-0 pt-[7px] font-mono text-[13px] tracking-[0.04em] text-muted md:w-[9.5rem]">For every industry</p>
        <ul className="flex flex-wrap gap-2">
          {SECTORS.map((s) => (
            <li
              key={s.name}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pr-3.5 pl-3 text-[13.5px] leading-none"
            >
              <Glyph className="size-4 shrink-0 text-muted">{s.icon}</Glyph>
              {s.name}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
