export const site = {
  name: "AMFIRE",
  tagline: "Build · Operate · Automate",
  description:
    "AMFIRE builds software for your business problems, runs everything online as your technology partner, and automates the manual work — for Indian businesses.",
  // Shown wherever a visitor or client wants to reach a real person.
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "info@amfire.in",
  // Mobile for calls and WhatsApp, as shown to visitors (Indian format).
  contactPhone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "+91 93730 10143",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  // Published availability — keep these true; they are promises to clients.
  availability: {
    hours: "Monday to Saturday, 10 AM – 7 PM IST",
    firstResponse: "within one working day",
    demoLength: "30 minutes",
  },
};

const phoneDigits = site.contactPhone.replace(/\D/g, "");

/** Links for calling or messaging AMFIRE. */
export const contact = {
  email: `mailto:${site.contactEmail}`,
  call: `tel:+${phoneDigits}`,
  whatsapp: (text = "Hi AMFIRE, I'd like to talk about my business.") => `https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`,
};
