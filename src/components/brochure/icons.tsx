import type { BrochureIcon } from "@/knowledge/brochures";
import { cx } from "../ui";

// One line-icon set for the brochures, drawn on a 24px grid with round caps.

const PATHS: Record<BrochureIcon, string> = {
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM15.5 15.5 20 20",
  doc: "M7 3h7l5 5v13H7zM14 3v5h5M10 12h6M10 16h6",
  design: "M4 5h16v11H4zM9 20h6M12 16v4M8 9h4M8 12h7",
  redo: "M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5",
  code: "m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14",
  phone: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM11 18h2",
  language: "M4 6h9M8.5 4v2M6 6s.5 4 4.5 6M11 6s-1 5-6 7M13 20l3.5-8 3.5 8M14 17.5h5",
  hub: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  play: "M4 5h16v12H4zM10 8.5v5l4-2.5zM9 21h6",
  key: "M8 15a4 4 0 1 1 3.5-6l8.5.1V12h-2v2h-2.5v-2H11.5A4 4 0 0 1 8 15ZM7.5 11.2h.01",
  shield: "M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6zM9 12l2 2 4-4",
  check: "M5 12.5 10 17 19 7",
  rocket: "M13.5 4.5c3-1.5 6-1.5 6-1.5s0 3-1.5 6l-6 6-4.5-4.5zM9 10.5 5.5 10 3 12.5l4 1.5M13.5 15l.5 3.5-2.5 2.5-1.5-4M15 8.5h.01",
  table: "M4 5h16v14H4zM4 10h16M4 14.5h16M10 5v14",
  teach: "M3 9l9-5 9 5-9 5zM7 11.5V16c0 1.5 2.5 3 5 3s5-1.5 5-3v-4.5M21 9v5",
  pin: "M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  whatsapp: "M4 20l1.3-4A8 8 0 1 1 8 18.7zM9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 1c-1-.5-2.5-2-3-3l1-1-1-2z",
  chat: "M4 5h16v11H9l-5 4zM8 9h8M8 12.5h5",
  bug: "M9 7.5a3 3 0 0 1 6 0M7 10h10v4a5 5 0 0 1-10 0zM12 10v9M3.5 13H7M17 13h3.5M4.5 8.5 7 10M19.5 8.5 17 10M4.5 18.5 7.5 16M19.5 18.5 16.5 16",
  card: "M3 6h18v12H3zM3 10h18M7 15h4",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20a6.5 6.5 0 0 1 13 0M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14a6.5 6.5 0 0 1 3.5 6",
  chart: "M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6M20 16V6",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z",
  android: "M6 10h12v8a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zM6 9a6 6 0 0 1 12 0zM9.5 6.5h.01M14.5 6.5h.01M8 4l1.5 2M16 4l-1.5 2",
  store: "M4 9l1.5-5h13L20 9M4 9h16M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9M5.5 12v8h13v-8M10 20v-5h4v5",
  calendar: "M4 6h16v14H4zM4 10h16M8 3.5V7M16 3.5V7M8 14h2M14 14h2M8 17h2",
  box: "M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9",
  receipt: "M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21zM9 8h6M9 12h6M9 16h3",
  truck: "M3 6h11v10H3zM14 9h4l3 3.5V16h-7M7 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM17 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  school: "M3 10l9-6 9 6M5 9v11h14V9M10 20v-5h4v5M12 10.5h.01",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9.5h.01",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2",
  wrench: "M14.5 6.5a4 4 0 0 0 5 5L20 12l-8.5 8.5a2.1 2.1 0 0 1-3-3L17 9l-.5-.5a4 4 0 0 0-2-2zM14.5 6.5 17 4",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3Z",
  video: "M3 6h13v12H3zM16 10l5-3v10l-5-3",
  flow: "M4 5h6v4H4zM14 15h6v4h-6zM7 9v3a2 2 0 0 0 2 2h8v1M17 15v-1",
};

export function Icon({ name, className }: { name: BrochureIcon; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={cx("size-6", className)} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
    </svg>
  );
}
