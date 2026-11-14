// Everything a manufacturing site shows comes from one of these settings objects.
// The demo company lives in demo.ts; personal previews start from it and swap in
// the prospect's own details (see src/sites/previews.ts).

export type SiteMode =
  /** amfire's own showcase with a fictional company. */
  | "demo"
  /** A concept site made for one prospect, shown before they buy. */
  | "preview"
  /** A paying client's site on their own domain. */
  | "live";

export type Photo = { src: string; alt: string; credit?: string };

export type MfgSite = {
  slug: string;
  mode: SiteMode;
  company: {
    name: string;
    /** Wordmark text in the navigation, e.g. "TRIVIKRAM". */
    short: string;
    /** Second line of the wordmark, e.g. "Precision Components". */
    descriptor: string;
    city: string;
    area: string;
    since: number;
  };
  /** The client's brand colour, used for callouts and the main button. */
  accent: string;
  hero: { headline: string; line: string };
  /** Short proof items under the hero buttons. */
  trust: string[];
  contact: {
    phone: string;
    whatsapp: string;
    email: string;
    address: string[];
    mapUrl: string;
    hours: string;
    salesName: string;
    salesRole: string;
  };
  customers: { heading: string; names: string[] };
  story: { stage: string; title: string; line: string; figure: string; label: string }[];
  capabilities: { name: string; line: string; specs: { k: string; v: string }[]; photo: Photo }[];
  numbers: { value: number; decimals?: number; suffix?: string; prefix?: string; label: string }[];
  industries: { name: string; parts: string[] }[];
  quality: {
    headline: string;
    line: string;
    points: { name: string; detail: string }[];
    certificates: { name: string; scope: string }[];
    photo: Photo;
  };
  machines: { process: string; machine: string; make: string; count: number; size: string }[];
  process: { title: string; time: string; line: string }[];
  plant: { headline: string; line: string; photos: Photo[] };
  testimonial?: { quote: string; who: string };
};
