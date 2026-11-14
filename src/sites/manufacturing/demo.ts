import { site as amfire } from "@/config/site";
import type { MfgSite } from "./types";

// Free-licence shop-floor photos (Unsplash licence: free for commercial use, no
// attribution required). Personal previews swap in the prospect's own photos.
// Served straight from Unsplash's CDN, which resizes and compresses (w=1600, WebP/AVIF).
const photo = (id: string, alt: string) => ({ src: `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=75`, alt });

/**
 * The demo company. Trivikram Precision Components is fictional (checked 14 Nov 2026:
 * no company by that name). Its contact details are amfire's, because whoever calls
 * from the demo wants a site like it.
 */
export const demoSite: MfgSite = {
  slug: "trivikram-precision",
  mode: "demo",
  company: {
    name: "Trivikram Precision Components",
    short: "TRIVIKRAM",
    descriptor: "Precision Components",
    city: "Pune",
    area: "Chakan",
    since: 1998,
  },
  accent: "#F2B705",
  hero: {
    headline: "Parts that fit the first time.",
    line: "Precision machined components for automotive, tractor and pump makers. Made to your drawing, measured to the micron, shipped on the promised day.",
  },
  trust: ["IATF 16949", "ISO 9001:2015", "40+ OEM customers", "Since 1998"],
  contact: {
    phone: amfire.contactPhone,
    whatsapp: amfire.contactPhone,
    email: amfire.contactEmail,
    address: ["Chakan MIDC, Phase II", "Pune, Maharashtra 410501", "India"],
    mapUrl: "https://maps.google.com/?q=Chakan+MIDC+Phase+II+Pune",
    hours: "Monday to Saturday, 9 AM – 6 PM",
    salesName: "Rahul Deshmukh",
    salesRole: "Head of Sales",
  },
  customers: {
    heading: "Supplying OEMs and Tier 1s in India, Europe and North America",
    names: ["KESTREL AXLE", "Vantor Pumps", "ORVIA TRACTORS", "Railcore", "DELVIK VALVES", "Tessar Motors", "NORTHGATE GEAR", "Amaro Hydraulics"],
  },
  story: [
    { stage: "Raw material", title: "It starts as a bar of certified steel.", line: "Every bar is tagged with its heat number, so any part can be traced back to the mill that made the steel.", figure: "100%", label: "of material traced to mill certificates" },
    { stage: "CNC turning", title: "Turned to size on 28 CNC lathes.", line: "Diameters, faces and the bore are cut in one clamping, so they stay true to each other.", figure: "±0.01 mm", label: "turning tolerance, held in production" },
    { stage: "VMC milling", title: "Holes and features milled in one setup.", line: "Four-axis machining centres drill the bolt circle and cut every feature without moving the part.", figure: "4-axis", label: "machining centres, 22 in the plant" },
    { stage: "Heat treatment", title: "Hardened where it carries load.", line: "Case hardening gives a wear-proof skin over a tough core. Every batch is checked for hardness and depth.", figure: "58–62 HRC", label: "surface hardness after case hardening" },
    { stage: "Inspection", title: "Measured before it leaves.", line: "Every lot is checked on a Zeiss CMM, and the report travels with the parts to your goods-in desk.", figure: "< 50 PPM", label: "rejections at customers last year" },
  ],
  capabilities: [
    {
      name: "CNC turning",
      line: "Shafts, hubs, flanges and bushes, from single samples to 50,000 a month.",
      specs: [ { k: "Diameter", v: "Ø 5 – 350 mm" }, { k: "Length", v: "up to 600 mm" }, { k: "Tolerance", v: "±0.01 mm" } ],
      photo: photo("photo-1666634157070-6fd830fb5672", "A steel bar held in a lathe chuck as the cutting tool turns it"),
    },
    {
      name: "VMC & HMC milling",
      line: "Housings, brackets and manifolds, with drilling, tapping and boring in one setup.",
      specs: [ { k: "Table", v: "up to 1,000 × 500 mm" }, { k: "Axes", v: "3 and 4" }, { k: "Positional", v: "±0.015 mm" } ],
      photo: photo("photo-1740209475472-aa7d280f7452", "A milling machine cutting a metal block"),
    },
    {
      name: "Grinding",
      line: "Cylindrical and surface grinding for bearing seats and sealing faces.",
      specs: [ { k: "Diameter", v: "Ø 8 – 250 mm" }, { k: "Finish", v: "Ra 0.4 µm" }, { k: "Roundness", v: "3 µm" } ],
      photo: photo("photo-1715433675788-9e0fb059d928", "Precision-finished steel discs with splined bores"),
    },
    {
      name: "Sub-assembly",
      line: "Pressing, fitting and leak testing, so parts arrive ready for your line.",
      specs: [ { k: "Press force", v: "up to 20 t" }, { k: "Leak test", v: "to 10 bar" }, { k: "Packing", v: "line-side ready" } ],
      photo: photo("photo-1769147339214-076740872485", "Two machined steel parts resting on an engineering drawing"),
    },
  ],
  numbers: [
    { value: 45000, label: "Square feet of plant in Chakan" },
    { value: 62, label: "CNC machines" },
    { value: 1.2, decimals: 1, suffix: " M", label: "Parts made every month" },
    { value: 98.6, decimals: 1, suffix: "%", label: "Deliveries on the promised day" },
    { value: 50, prefix: "< ", suffix: " PPM", label: "Rejections at customers" },
    { value: 14, label: "Countries we export to" },
  ],
  industries: [
    { name: "Automotive", parts: ["Wheel hubs", "Transmission shafts", "Brake components"] },
    { name: "Tractors & farm", parts: ["PTO shafts", "Axle flanges", "Hydraulic lift parts"] },
    { name: "Pumps & valves", parts: ["Impeller shafts", "Valve bodies", "Seal housings"] },
    { name: "Railways", parts: ["Bogie bushes", "Brake rigging pins", "Coupler parts"] },
    { name: "Defence", parts: ["Precision housings", "Turned inserts", "Mounting brackets"] },
    { name: "Electrical", parts: ["Motor shafts", "End shields", "Terminal studs"] },
  ],
  quality: {
    headline: "Quality you can audit, not just trust.",
    line: "Our lab is open to your quality team on any working day. Bring your drawing and pick any part off the line.",
    points: [
      { name: "Zeiss CMM", detail: "Every first part and every lot measured in 3D, with a report you keep." },
      { name: "PPAP Level 3", detail: "Full approval files for new parts, the way automotive buyers expect." },
      { name: "SPC on key sizes", detail: "Critical dimensions charted live on the machines, so drift is caught early." },
      { name: "Traceable lots", detail: "Heat number, machine, operator and inspector recorded for every batch." },
    ],
    certificates: [
      { name: "IATF 16949:2016", scope: "Automotive quality management" },
      { name: "ISO 9001:2015", scope: "Quality management" },
      { name: "ISO 14001:2015", scope: "Environmental management" },
    ],
    photo: photo("photo-1548683726-203119be6a39", "Finished machined steel flanges lined up on a table"),
  },
  machines: [
    { process: "Turning", machine: "CNC turning centre", make: "Ace Micromatic", count: 16, size: "Ø 350 × 600 mm" },
    { process: "Turning", machine: "CNC turning centre", make: "Mazak", count: 8, size: "Ø 300 × 500 mm" },
    { process: "Turning", machine: "Twin-spindle lathe", make: "LMW", count: 4, size: "Ø 200 × 300 mm" },
    { process: "Milling", machine: "4-axis VMC", make: "Haas", count: 10, size: "1,000 × 500 mm" },
    { process: "Milling", machine: "VMC", make: "Jyoti CNC", count: 12, size: "800 × 450 mm" },
    { process: "Milling", machine: "HMC", make: "DMG Mori", count: 4, size: "500 × 500 mm pallet" },
    { process: "Grinding", machine: "Cylindrical grinder", make: "Micromatic Grinding", count: 5, size: "Ø 250 × 500 mm" },
    { process: "Grinding", machine: "Surface grinder", make: "Okamoto", count: 3, size: "600 × 300 mm" },
    { process: "Inspection", machine: "CMM", make: "Zeiss", count: 2, size: "1,000 × 700 × 600 mm" },
    { process: "Inspection", machine: "Contour & roughness tester", make: "Mitutoyo", count: 2, size: "—" },
  ],
  process: [
    { title: "Send your drawing", time: "Day 0", line: "PDF, DWG or STEP, with your yearly quantity. A WhatsApp photo is fine to start." },
    { title: "Get a priced quote", time: "Within 48 hours", line: "Price, lead time and any design suggestions that would save you money." },
    { title: "Approve samples", time: "About 3 weeks", line: "First parts with a full inspection report, ready for your quality team." },
    { title: "PPAP sign-off", time: "As you need", line: "Approval files to your standard, from Level 1 to Level 3." },
    { title: "Regular supply", time: "Ongoing", line: "Scheduled deliveries, with stock held for you if you need a buffer." },
  ],
  plant: {
    headline: "Come and see the plant.",
    line: "Most of our customers visited before their first order. We'll show you the machines your parts would run on.",
    photos: [
      photo("photo-1717386255773-1e3037c81788", "A large CNC machine on a clean factory floor"),
      photo("photo-1787039467622-ddec5c24320c", "Rows of CNC machines in a bright workshop"),
      photo("photo-1764185800646-f75f7e16e465", "A factory floor with machinery and yellow safety lines"),
    ],
  },
  testimonial: {
    quote: "We moved three critical parts to Trivikram in 2021. In four years we have not stopped a line for a quality problem from them.",
    who: "Head of Purchase, tractor maker, Pune",
  },
};
