export const site = {
  name: "amfire",
  tagline: "Build · Operate · Automate",
  description:
    "amfire builds software for your business problems, runs everything online as your technology partner, and automates the manual work — for Indian businesses.",
  // Shown wherever a visitor or client wants to reach a real person (enquiries
  // and support), and the reply-to address on emails sent to clients.
  // Sign-in for the owner is a separate account (OWNER_EMAIL).
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@amfire.in",
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
