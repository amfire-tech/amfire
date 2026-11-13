export const site = {
  name: "amfire",
  tagline: "Operations engineering",
  description:
    "amfire builds systems around how your company works, so your team keeps moving and you are free to lead its growth.",
  // Shown wherever a visitor or client wants to reach a real person (enquiries
  // and support), and the reply-to address on emails sent to clients.
  // Sign-in for the owner is a separate account (OWNER_EMAIL).
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@amfire.in",
  // The founder's own mailbox (Hostinger): cold outreach emails come from it and
  // replies land in it. OUTREACH_FROM_EMAIL overrides it on the server.
  outreachEmail: "navanishpandey@amfire.in",
  // Whose mailbox that is: the signature (and From name) on outreach drafts when the HQ account is named after the brand.
  outreachSender: "Navanish Pandey",
  // Mobile for calls and WhatsApp, as shown to visitors (Indian format).
  contactPhone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "+91 93730 10143",
  // Canonical address for links, the sitemap and structured data. On Vercel, the production domain is used if this isn't set.
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  // Public profiles (LinkedIn company page and so on), listed in structured data so search engines connect them to the site.
  profiles: (process.env.NEXT_PUBLIC_SOCIAL_PROFILES ?? "https://www.linkedin.com/company/amfire-ai/")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean),
  // Who the client contracts with, as named on /terms and /privacy. Update once the business is registered.
  legalName: process.env.NEXT_PUBLIC_LEGAL_NAME ?? "amfire",
  location: "Pune, Maharashtra, India",
  // Cal.com booking links ("username/event-slug"). Each calendar stays hidden until its link is set,
  // and visitors fall back to the booking form and a call back.
  booking: {
    /** 15-minute partner call for agencies and coaches, 9 AM–1 PM New York time on weekdays. */
    partner: process.env.NEXT_PUBLIC_CAL_PARTNER_LINK ?? "amfire/partner-call",
    /** 30-minute free demo / AI plan call, 11 AM–6 PM IST, Monday to Saturday. */
    demo: process.env.NEXT_PUBLIC_CAL_DEMO_LINK ?? "amfire/ai-plan-call",
  },
  // Published availability — keep these true; they are promises to clients.
  availability: {
    hours: "Monday to Saturday, 10 AM – 7 PM IST",
    firstResponse: "within one working day",
    demoLength: "30 minutes",
  },
};

const phoneDigits = site.contactPhone.replace(/\D/g, "");

/** Links for calling or messaging amfire. */
export const contact = {
  email: `mailto:${site.contactEmail}`,
  call: `tel:+${phoneDigits}`,
  whatsapp: (text = "Hi amfire, I'd like to talk about my business.") => `https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`,
};
