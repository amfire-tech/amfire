// Real client projects AMFIRE has delivered. Unlike EXAMPLES (illustrative
// scenarios), everything here is live and was built by AMFIRE — keep every
// claim checkable against the delivered system. Never publish a client's
// pricing, contract terms or private data here.

import type { ServicePathId } from "./catalog";

export type CaseStudy = {
  slug: string;
  path: ServicePathId;
  client: string;
  url: string;
  title: string;
  sector: string;
  /** One sentence for cards and search results. */
  summary: string;
  cover: string;
  coverAlt: string;
  /** What the client does and what they needed from us. */
  brief: string;
  built: { title: string; items: string[] }[];
  facts: { value: string; label: string }[];
  stack: string[];
  timeline: string;
  engagement: string;
  ongoing?: string;
};

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "skillship",
    path: "build",
    client: "Skillship",
    url: "https://skillship.in/",
    title: "An AI-powered learning platform for Indian schools",
    sector: "Education · AI school programme",
    summary:
      "We designed and built Skillship's complete school platform — five role-based dashboards, a quiz engine, and AI that writes questions, grades answers and guides careers.",
    cover: "/work/skillship.jpg",
    coverAlt: "Skillship — AI-powered learning for Indian schools",
    brief:
      "Skillship brings AI labs, teacher training and software to schools across India. They needed the software pillar: one platform where each school's admins, principals, teachers and students work in their own space, with AI built into the core rather than added as a tab — and one their own team could run day to day.",
    built: [
      {
        title: "One platform, many schools",
        items: [
          "Each school sees only its own data — enforced in the database, not just the screens",
          "Five logins — Admin, Sub-admin, Principal, Teacher, Student — each with its own dashboard",
          "One-click class onboarding: generate logins, enrol students, download credentials",
          "Billing and dues for every school, plus live notifications and web push alerts",
        ],
      },
      {
        title: "Quizzes and reports",
        items: [
          "Timed quizzes with shuffled questions, automatic scoring and class rankings",
          "Draft → review → publish approval before any quiz reaches students",
          "Question bank with bulk upload, and tests teachers assign to their classes",
          "Skill-wise analytics, school and class comparisons, PDF and Excel exports, monthly and yearly reports generated automatically",
        ],
      },
      {
        title: "AI at the core",
        items: [
          "AI question maker — from a topic or an uploaded PDF",
          "AI grading of short answers, with feedback for the student",
          "Adaptive quizzes that adjust to each student's level",
          "AI Career Copilot, career roadmaps and a college finder built on NIRF rankings",
          "AI tutor for doubts, at-risk student alerts and weekly summaries for principals",
        ],
      },
      {
        title: "Made for Indian classrooms",
        items: [
          "Student area in English, Hindi, Marathi, Tamil and Gujarati",
          "Daily teaching logs with attendance photos for visiting teachers",
          "Public website, course marketplace, demo booking and photo gallery",
        ],
      },
    ],
    facts: [
      { value: "93", label: "screens across five dashboards" },
      { value: "5", label: "roles, each with its own view" },
      { value: "380+", label: "automated tests" },
      { value: "5", label: "Indian languages" },
    ],
    stack: ["Next.js", "TypeScript", "Django", "FastAPI", "Google Gemini", "PostgreSQL + pgvector", "Redis", "Docker", "GitHub Actions"],
    timeline: "Started April 2026 · live in June 2026",
    engagement: "Build · product design, development, AI, deployment and ongoing upgrades",
    ongoing: "We continue to ship new features for Skillship as their programme grows.",
  },
  {
    slug: "mygreenhome",
    path: "build",
    client: "MyGreenHome",
    url: "https://mygreenhome.in/",
    title: "A cinematic website that sells smart home gardens",
    sector: "Home & lifestyle · smart gardens",
    summary:
      "A premium, immersive website for a smart-garden startup — a video home tour, a live air-quality check for any city and WhatsApp-first enquiries.",
    cover: "/work/mygreenhome.jpg",
    coverAlt: "MyGreenHome — a sunroom filled with plants",
    brief:
      "MyGreenHome designs smart indoor, balcony, terrace and rooftop gardens for homes and offices, with a smart controller that waters and monitors the plants. A garden from them is a considered purchase, so the website had to feel as premium as the product — and turn visitors into WhatsApp conversations.",
    built: [
      {
        title: "A home tour, not a brochure",
        items: [
          "A cinematic walkthrough from the front door to the rooftop garden, across six scenes",
          "Plant cards and a smart-garden panel that change with each scene",
          "Smooth, phone-tuned scrolling that respects reduced-motion settings",
        ],
      },
      {
        title: "Tools that make the case",
        items: [
          "Live air-quality check — search any city and compare the air outside with a green home",
          "Plant explorer with 22 plants across indoor, outdoor, climbing and kitchen gardens",
          "A smart-garden dashboard showing soil, humidity, plant health and air quality",
        ],
      },
      {
        title: "Built to bring enquiries",
        items: [
          "Clear pricing for three garden series",
          "WhatsApp and call buttons throughout, with FAQs and testimonials",
          "Ready for search: structured data, sitemap, clean URLs and a performance pass for fast loading",
          "Automatic deploys to Cloudflare Pages on every release",
        ],
      },
    ],
    facts: [
      { value: "6", label: "scenes in the home tour" },
      { value: "22", label: "plants in the explorer" },
      { value: "Live", label: "air quality for any city" },
      { value: "2 weeks", label: "from first build to launch" },
    ],
    stack: ["React", "Vite", "Tailwind CSS", "Open-Meteo air-quality data", "Cloudflare Pages", "GitHub Actions"],
    timeline: "June 2026 · about two weeks to launch",
    engagement: "Build · design, development, SEO and launch",
    ongoing: "Now building a plant-health monitoring system with MyGreenHome.",
  },
];

export function caseStudyBySlug(slug: string) {
  return CASE_STUDIES.find((c) => c.slug === slug);
}
