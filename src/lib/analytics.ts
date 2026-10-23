// Google Analytics 4 events for the public website. Everything here is a no-op
// unless NEXT_PUBLIC_GA_MEASUREMENT_ID is set, so local development and the
// workspaces (/hq, /hub) never send anything.
//
// Conversions to mark as key events in GA4 (Admin → Events):
//   generate_lead   — a free demo booked (thank-you page)
//   whatsapp_click  — a WhatsApp link opened
//   call_click      — a phone number tapped

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

type Params = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (command: "event", name: string, params?: Params) => void;
  }
}

export function track(name: string, params?: Params) {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") return;
  window.gtag?.("event", name, params);
}
