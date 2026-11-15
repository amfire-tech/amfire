// Ops One for OpticVyu: the seed data behind the founder's demo. Every client, site,
// person and figure is invented and the page says so. The records hang together: the same
// offices, people, sites, cameras, tickets and invoices appear in every module, so an action
// in one place shows up everywhere else, the way one connected system would.

export type Tone = "good" | "warn" | "bad" | "info" | "muted" | "brand";

export type ViewId =
  | "overview"
  | "tracker"
  | "map"
  | "approvals"
  | "sites"
  | "care"
  | "workorders"
  | "fleet"
  | "inventory"
  | "billing"
  | "payments"
  | "growth"
  | "attendance"
  | "people"
  | "app"
  | "agents"
  | "learning"
  | "connected";

export const COMPANY = { name: "OpticVyu", initials: "OV", facts: "512 sites live · 9 locations · 54 people" };

export const NAV: { group: string; items: { id: ViewId; label: string }[] }[] = [
  { group: "Company", items: [{ id: "overview", label: "Command centre" }, { id: "tracker", label: "Project tracker" }, { id: "map", label: "Live map" }, { id: "approvals", label: "Approvals" }, { id: "sites", label: "Sites and projects" }] },
  { group: "Operations", items: [{ id: "care", label: "Customer care" }, { id: "workorders", label: "Work orders" }, { id: "fleet", label: "Fleet and uptime" }, { id: "inventory", label: "Inventory" }] },
  { group: "Money", items: [{ id: "billing", label: "Billing" }, { id: "payments", label: "Payments and collections" }, { id: "growth", label: "Revenue and forecast" }] },
  { group: "People", items: [{ id: "attendance", label: "GPS attendance" }, { id: "people", label: "People and payroll" }, { id: "app", label: "Employee app" }] },
  { group: "System", items: [{ id: "agents", label: "Agents and audit" }, { id: "learning", label: "Learning" }, { id: "connected", label: "Connected systems" }] },
];

/** Illustrative rates. */
export const PRICE = { cameraSystem: 120000, advanceShare: 0.5, buybackShare: 0.4, monthly: 9500 };

// ---------------------------------------------------------------- Offices and their GPS boundaries

export type OfficeId = "hyd" | "mum" | "del" | "blr" | "pun" | "che" | "kol" | "ngp" | "dxb";
export type Office = { id: OfficeId; name: string; short: string; kind: string; lat: number; lon: number; radius: number; address: string; tz: string };
export const OFFICES: Office[] = [
  { id: "hyd", name: "Hyderabad HQ", short: "Hyderabad", kind: "Head office", lat: 17.3495, lon: 78.5518, radius: 150, address: "LB Nagar, Hyderabad", tz: "IST" },
  { id: "mum", name: "Mumbai", short: "Mumbai", kind: "Regional office", lat: 19.1136, lon: 72.8697, radius: 120, address: "Andheri East, Mumbai", tz: "IST" },
  { id: "del", name: "Delhi NCR", short: "Delhi NCR", kind: "Regional office", lat: 28.5355, lon: 77.391, radius: 120, address: "Sector 62, Noida", tz: "IST" },
  { id: "blr", name: "Bengaluru", short: "Bengaluru", kind: "Regional office", lat: 12.9698, lon: 77.7499, radius: 120, address: "Whitefield, Bengaluru", tz: "IST" },
  { id: "pun", name: "Pune base", short: "Pune", kind: "Field base", lat: 18.5912, lon: 73.7389, radius: 100, address: "Hinjewadi, Pune", tz: "IST" },
  { id: "che", name: "Chennai", short: "Chennai", kind: "Field base", lat: 13.0067, lon: 80.2206, radius: 100, address: "Guindy, Chennai", tz: "IST" },
  { id: "kol", name: "Kolkata", short: "Kolkata", kind: "Field base", lat: 22.5726, lon: 88.4337, radius: 100, address: "Salt Lake, Kolkata", tz: "IST" },
  { id: "ngp", name: "Nagpur", short: "Nagpur", kind: "Field base", lat: 21.1458, lon: 79.0882, radius: 100, address: "Wardha Road, Nagpur", tz: "IST" },
  { id: "dxb", name: "Dubai", short: "Dubai", kind: "Overseas office", lat: 25.0127, lon: 55.1185, radius: 150, address: "JAFZA, Dubai", tz: "GST" },
];
export const officeById = (id: OfficeId) => OFFICES.find((o) => o.id === id)!;

// ---------------------------------------------------------------- People

export type Dept = "Field engineering" | "Support and NOC" | "Video and data" | "Sales" | "Tech" | "Accounts" | "HR and admin" | "Leadership";
export type Today = "In office" | "At site" | "Late" | "On leave" | "Not marked" | "Travelling";
export type Person = {
  id: string;
  name: string;
  initials: string;
  title: string;
  dept: Dept;
  office: OfficeId;
  today: Today;
  checkIn?: string;
  ctc: number; // yearly, illustrative
  joined: string;
  phone: "Android" | "iPhone";
};

const NAMES = [
  "Ravi Kumar", "Imran Shaikh", "Vikas Singh", "Suresh Patil", "Deepa Nair", "Karthik Subramanian", "Ananya Bose", "Faisal Ahmed", "Rahul Mehra", "Arjun Rao",
  "Sneha Reddy", "Meera Iyer", "Kiran Varma", "Pooja Sharma", "Naveen Goud", "Sai Teja", "Mohammed Irfan", "Lakshmi Prasad", "Abhishek Jain", "Nikhil Desai",
  "Priya Menon", "Rohit Yadav", "Sandeep Chauhan", "Harish Babu", "Manoj Tiwari", "Divya Pillai", "Ganesh Kale", "Yusuf Khan", "Aditya Kulkarni", "Shruti Joshi",
  "Venkat Raman", "Bhavana Rao", "Tarun Gupta", "Anil Kumble", "Srinivas Murthy", "Rekha Das", "Zoya Siddiqui", "Pranav Hegde", "Kavya Shetty", "Ajay Thakur",
  "Ramesh Naidu", "Neha Agarwal", "Siddharth Bhat", "Farhan Qureshi", "Gopal Krishna", "Asha Kurian", "Dinesh Rawat", "Ishaan Malhotra", "Swati Mishra", "Vinod Pandey",
  "Omar Haddad", "Rajesh Pillai", "Tanvi Kapoor", "Mahesh Reddy",
];

const PLAN: { dept: Dept; title: string; offices: OfficeId[] }[] = [
  { dept: "Field engineering", title: "Field engineer", offices: ["pun", "mum", "del", "hyd", "blr", "che", "kol", "dxb", "mum", "del", "hyd", "hyd", "blr", "mum", "del", "hyd", "che", "ngp", "hyd", "blr", "mum", "hyd", "ngp", "dxb"] },
  { dept: "Support and NOC", title: "Support engineer", offices: ["hyd", "hyd", "hyd", "hyd", "mum", "del"] },
  { dept: "Video and data", title: "Video editor", offices: ["hyd", "hyd", "hyd", "hyd", "hyd", "hyd", "hyd"] },
  { dept: "Sales", title: "Sales manager", offices: ["mum", "del", "blr", "hyd", "dxb"] },
  { dept: "Tech", title: "Software engineer", offices: ["hyd", "hyd", "hyd", "hyd", "hyd"] },
  { dept: "Accounts", title: "Accounts executive", offices: ["hyd", "hyd", "hyd", "kol"] },
  { dept: "HR and admin", title: "HR and admin", offices: ["hyd", "hyd", "pun"] },
];

function seeded(n: number) {
  let s = n;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export const PEOPLE: Person[] = (() => {
  const r = seeded(7);
  const out: Person[] = [];
  let i = 0;
  for (const p of PLAN) {
    for (const office of p.offices) {
      const name = NAMES[i];
      const field = p.dept === "Field engineering";
      const roll = r();
      const today: Today = field ? (roll < 0.62 ? "At site" : roll < 0.76 ? "Travelling" : roll < 0.86 ? "In office" : roll < 0.92 ? "Late" : roll < 0.96 ? "On leave" : "Not marked") : roll < 0.8 ? "In office" : roll < 0.88 ? "Late" : roll < 0.94 ? "On leave" : "Not marked";
      const h = today === "Late" ? 10 : 9;
      const m = Math.floor(r() * (today === "Late" ? 50 : 40));
      out.push({
        id: `e${i + 1}`,
        name,
        initials: name.split(" ").map((x) => x[0]).join("").slice(0, 2),
        title: i === 9 ? "Operations manager" : i === 10 ? "Accounts lead" : i === 11 ? "HR manager" : p.title,
        dept: p.dept,
        office,
        today,
        checkIn: ["On leave", "Not marked"].includes(today) ? undefined : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        ctc: Math.round((field ? 300000 + r() * 260000 : p.dept === "Tech" ? 900000 + r() * 900000 : 360000 + r() * 500000) / 1000) * 1000,
        joined: `${["Jan", "Mar", "Apr", "Jun", "Aug", "Sep", "Nov"][Math.floor(r() * 7)]} ${2019 + Math.floor(r() * 7)}`,
        phone: r() < 0.78 ? "Android" : "iPhone",
      });
      i++;
    }
  }
  // The demo's own names keep their places in the story.
  out[0] = { ...out[0], today: "At site", checkIn: "09:12" };
  return out;
})();
export const personByName = (n: string) => PEOPLE.find((p) => p.name === n);

// ---------------------------------------------------------------- Engineers on the map (Pune, Mumbai, Hyderabad, Delhi)

export type GpsStatus = "On site" | "En route" | "At office" | "GPS off";
export type Engineer = { id: string; name: string; office: OfficeId; status: GpsStatus; job: string; battery: number; ping: string; path: [number, number][]; kmToday: number };
export const ENGINEERS: Engineer[] = [
  { id: "e1", name: "Ravi Kumar", office: "pun", status: "On site", job: "WO-2291 · Skyline Towers B", battery: 71, ping: "12s ago", kmToday: 14.2, path: [[18.5945, 73.7305], [18.5945, 73.7305]] },
  { id: "x2", name: "Ganesh Kale", office: "pun", status: "En route", job: "WO-2302 · Baner Heights, repair", battery: 54, ping: "8s ago", kmToday: 22.6, path: [[18.5912, 73.7389], [18.5801, 73.7562], [18.5679, 73.7743], [18.5603, 73.7861]] },
  { id: "x3", name: "Aditya Kulkarni", office: "pun", status: "At office", job: "Kit prep for Sunrise Estates", battery: 88, ping: "20s ago", kmToday: 3.1, path: [[18.5915, 73.7392], [18.5915, 73.7392]] },
  { id: "e2", name: "Imran Shaikh", office: "mum", status: "En route", job: "WO-2289 · Arcadia Heights, dismantle", battery: 37, ping: "5s ago", kmToday: 31.8, path: [[19.1136, 72.8697], [19.1402, 72.9124], [19.1763, 72.9562], [19.2052, 72.9752]] },
  { id: "x5", name: "Yusuf Khan", office: "mum", status: "On site", job: "WO-2297 · Meridian Business Park, 360°", battery: 63, ping: "9s ago", kmToday: 26.4, path: [[19.0330, 73.0297], [19.0330, 73.0297]] },
  { id: "x6", name: "Rohit Yadav", office: "mum", status: "GPS off", job: "Last seen near Harbour Line Depot", battery: 0, ping: "48 min ago", kmToday: 18.0, path: [[18.9537, 72.8415], [18.9537, 72.8415]] },
  { id: "x7", name: "Naveen Goud", office: "hyd", status: "On site", job: "WO-2284 · Northgate Depot, repair", battery: 66, ping: "6s ago", kmToday: 19.3, path: [[17.4239, 78.4738], [17.4239, 78.4738]] },
  { id: "x8", name: "Sai Teja", office: "hyd", status: "En route", job: "WO-2300 · Lakeshore Residences, survey", battery: 81, ping: "4s ago", kmToday: 11.7, path: [[17.3495, 78.5518], [17.3721, 78.5232], [17.4012, 78.4901], [17.4325, 78.4483]] },
  { id: "e4", name: "Suresh Patil", office: "hyd", status: "At office", job: "Refurbishing 6 returned kits", battery: 92, ping: "15s ago", kmToday: 0.4, path: [[17.3497, 78.5521], [17.3497, 78.5521]] },
  { id: "e3", name: "Vikas Singh", office: "del", status: "On site", job: "WO-2294 · Metro Package 4, 360° walk", battery: 58, ping: "7s ago", kmToday: 24.9, path: [[28.6139, 77.2295], [28.6139, 77.2295]] },
  { id: "x11", name: "Sandeep Chauhan", office: "del", status: "En route", job: "WO-2287 · Metro Package 4, relocate", battery: 44, ping: "11s ago", kmToday: 16.2, path: [[28.5355, 77.391], [28.5562, 77.3341], [28.5843, 77.2832], [28.6081, 77.2398]] },
];

// ---------------------------------------------------------------- Attendance

export type Rejected = { who: string; office: OfficeId; when: string; where: string; distance?: number; reason: "Outside boundary" | "Fake GPS app detected" | "Selfie did not match" | "Location off" };
export const REJECTED: Rejected[] = [
  { who: "Rohit Yadav", office: "mum", when: "09:41", where: "Andheri East", distance: 1840, reason: "Outside boundary" },
  { who: "Tarun Gupta", office: "del", when: "09:22", where: "Sector 18, Noida", distance: 2300, reason: "Fake GPS app detected" },
  { who: "Dinesh Rawat", office: "hyd", when: "09:05", where: "Uppal", distance: 6100, reason: "Outside boundary" },
  { who: "Ajay Thakur", office: "blr", when: "08:58", where: "Whitefield", reason: "Selfie did not match" },
];

export const REGULARISE = [
  { who: "Ganesh Kale", ask: "Marked in at Baner site, not Pune base, on 12 Nov", why: "Went straight to an urgent repair", state: "Waiting" },
  { who: "Kavya Shetty", ask: "Missed check-out on 13 Nov", why: "Phone battery died at 18:40", state: "Waiting" },
  { who: "Zoya Siddiqui", ask: "Work from home on 14 Nov", why: "Editing queue, approved by manager", state: "Approved" },
];

/** 30 days of attendance for the heatmap: p present, l late, s at site, v leave, a absent, w weekly off. */
export function monthFor(i: number): string[] {
  const r = seeded(100 + i);
  return Array.from({ length: 30 }, (_, d) => {
    if (d % 7 === 6) return "w";
    const x = r();
    return x < 0.05 ? "v" : x < 0.08 ? "a" : x < 0.17 ? "l" : i < 24 && x < 0.7 ? "s" : "p";
  });
}

// ---------------------------------------------------------------- Clients and sites

export type Client = { id: string; name: string; segment: string; hq: string; totalSites: number; paysIn: number; terms: number; since: number; arr: number };
export const CLIENTS: Client[] = [
  { id: "c1", name: "Meridian Infra", segment: "Infrastructure", hq: "Mumbai", totalSites: 14, paysIn: 41, terms: 30, since: 2021, arr: 21400000 },
  { id: "c2", name: "Skyline Developers", segment: "Real estate", hq: "Pune", totalSites: 9, paysIn: 24, terms: 30, since: 2022, arr: 11800000 },
  { id: "c3", name: "Arcadia Homes", segment: "Real estate", hq: "Thane", totalSites: 6, paysIn: 33, terms: 30, since: 2020, arr: 7300000 },
  { id: "c4", name: "Northgate Metro EPC", segment: "Metro and rail", hq: "Hyderabad", totalSites: 11, paysIn: 58, terms: 45, since: 2023, arr: 15900000 },
  { id: "c5", name: "Vantage Realty", segment: "Real estate", hq: "Bengaluru", totalSites: 4, paysIn: 19, terms: 30, since: 2024, arr: 4200000 },
  { id: "c6", name: "Coastline Infra", segment: "Ports", hq: "Kolkata", totalSites: 5, paysIn: 47, terms: 30, since: 2023, arr: 5600000 },
  { id: "c7", name: "Gulf Crest Contracting", segment: "Middle East", hq: "Dubai", totalSites: 3, paysIn: 36, terms: 30, since: 2025, arr: 4900000 },
  { id: "c8", name: "Sunrise Estates", segment: "Real estate", hq: "Nagpur", totalSites: 2, paysIn: 28, terms: 30, since: 2025, arr: 2300000 },
  { id: "c9", name: "Lakeshore Developers", segment: "Real estate", hq: "Hyderabad", totalSites: 0, paysIn: 0, terms: 30, since: 2026, arr: 0 },
];
export const clientById = (id: string) => CLIENTS.find((c) => c.id === id)!;

export type SiteStatus = "Quote sent" | "PO received" | "Install scheduled" | "Live" | "Ending soon" | "Returning" | "Closed";
export type Site = {
  id: string;
  name: string;
  client: string;
  office: OfficeId;
  city: string;
  cameras: number;
  services: string[];
  status: SiteStatus;
  po: string;
  poEnds: string;
  poUsed: number; // % of PO value billed so far
  liveSince?: string;
  lead: string;
  health: number; // 0-100
  monthly: number; // revenue a month
  costToServe: number; // a month: visits, parts, SIM, cloud
  timeline: { when: string; text: string; who: string }[];
};

export const SITES: Site[] = [
  { id: "s1", name: "Skyline Towers B", client: "c2", office: "pun", city: "Pune", cameras: 2, services: ["Time-lapse", "360° monthly"], status: "Install scheduled", po: "PO-SKY-114", poEnds: "Nov 2028", poUsed: 4, lead: "Ravi Kumar", health: 92, monthly: 47000, costToServe: 7600,
    timeline: [
      { when: "12 Oct", text: "Enquiry from the website camera calculator", who: "Sales agent" },
      { when: "15 Oct", text: "Remote survey: 2 positions, solar not needed, 4G strong", who: "Pre-sales" },
      { when: "18 Oct", text: "Quote Q-3318 sent: 2 cameras, 24 months, 360° monthly", who: "Sales agent" },
      { when: "02 Nov", text: "PO-SKY-114 received and checked against the quote", who: "Accounts" },
      { when: "04 Nov", text: "50% advance (₹1,20,000) paid in the client app", who: "Payments agent" },
      { when: "10 Nov", text: "OV-8M-4821 and 4822 tested, burn-in passed, dispatched", who: "Stores, Hyderabad" },
      { when: "Today", text: "WO-2291 installation, Ravi Kumar on site since 09:12", who: "Work-order agent" },
    ] },
  { id: "s2", name: "Skyline Towers A", client: "c2", office: "pun", city: "Pune", cameras: 2, services: ["Time-lapse"], status: "Live", po: "PO-SKY-098", poEnds: "11 Dec 2026", poUsed: 94, liveSince: "Mar 2025", lead: "Ravi Kumar", health: 88, monthly: 19000, costToServe: 4100,
    timeline: [{ when: "Mar 2025", text: "Installed and live", who: "Field" }, { when: "Today", text: "PO ends in 26 days. Extension request drafted", who: "Billing agent" }] },
  { id: "s3", name: "Meridian Business Park", client: "c1", office: "mum", city: "Navi Mumbai", cameras: 3, services: ["Time-lapse", "Drone quarterly"], status: "Live", po: "PO-MER-188", poEnds: "Aug 2027", poUsed: 41, liveSince: "Jan 2026", lead: "Yusuf Khan", health: 95, monthly: 43500, costToServe: 6900,
    timeline: [{ when: "Jan 2026", text: "Installed and live", who: "Field" }, { when: "14 Nov", text: "Part of a ₹38.4 lakh transfer, matched to 3 invoices", who: "Payments agent" }] },
  { id: "s4", name: "Harbour Line Depot", client: "c1", office: "mum", city: "Mumbai", cameras: 2, services: ["Time-lapse"], status: "Ending soon", po: "PO-MER-207", poEnds: "04 Dec 2026", poUsed: 97, liveSince: "Dec 2024", lead: "Imran Shaikh", health: 71, monthly: 19000, costToServe: 6400,
    timeline: [{ when: "Dec 2024", text: "Installed and live", who: "Field" }, { when: "Today", text: "PO ends in 19 days; project 3 months late, extension likely", who: "Radar agent" }] },
  { id: "s5", name: "Metro Package 4", client: "c1", office: "del", city: "Delhi", cameras: 4, services: ["Time-lapse", "360° monthly"], status: "Live", po: "PO-MER-161", poEnds: "Mar 2028", poUsed: 38, liveSince: "Jun 2025", lead: "Vikas Singh", health: 84, monthly: 66000, costToServe: 14200,
    timeline: [{ when: "Jun 2025", text: "Installed and live", who: "Field" }, { when: "Yesterday", text: "Camera relocation asked by the client (crane moved)", who: "Customer care" }] },
  { id: "s6", name: "Arcadia Heights", client: "c3", office: "mum", city: "Thane", cameras: 2, services: ["Time-lapse"], status: "Returning", po: "PO-ARC-041", poEnds: "31 Oct 2026", poUsed: 100, liveSince: "Sep 2024", lead: "Imran Shaikh", health: 60, monthly: 0, costToServe: 0,
    timeline: [{ when: "31 Oct", text: "Project complete. Final time-lapse film delivered", who: "Delivery agent" }, { when: "12 Nov", text: "WO-2289 dismantle and return scheduled", who: "Work-order agent" }] },
  { id: "s7", name: "Arcadia Greens", client: "c3", office: "blr", city: "Bengaluru", cameras: 2, services: ["Time-lapse"], status: "Live", po: "PO-ARC-055", poEnds: "Jan 2028", poUsed: 33, liveSince: "Feb 2026", lead: "Deepa Nair", health: 90, monthly: 19000, costToServe: 3800,
    timeline: [{ when: "Feb 2026", text: "Installed and live", who: "Field" }] },
  { id: "s8", name: "Northgate Depot", client: "c4", office: "hyd", city: "Hyderabad", cameras: 3, services: ["Time-lapse", "AI safety alerts"], status: "Live", po: "PO-NGM-302", poEnds: "Jul 2027", poUsed: 58, liveSince: "Apr 2025", lead: "Naveen Goud", health: 62, monthly: 34500, costToServe: 9800,
    timeline: [{ when: "Apr 2025", text: "Installed and live", who: "Field" }, { when: "02:14 today", text: "OV-8M-4417 stopped uploading; SIM data used up", who: "Uptime agent" }] },
  { id: "s9", name: "Northgate Viaduct P2", client: "c4", office: "che", city: "Chennai", cameras: 2, services: ["Time-lapse"], status: "Live", po: "PO-NGM-318", poEnds: "Oct 2027", poUsed: 47, liveSince: "Aug 2025", lead: "Karthik Subramanian", health: 86, monthly: 19000, costToServe: 4500,
    timeline: [{ when: "Aug 2025", text: "Installed and live", who: "Field" }] },
  { id: "s10", name: "Vantage One", client: "c5", office: "blr", city: "Bengaluru", cameras: 1, services: ["Time-lapse", "Drone monthly"], status: "Live", po: "PO-VAN-012", poEnds: "Jun 2027", poUsed: 29, liveSince: "May 2026", lead: "Deepa Nair", health: 97, monthly: 54500, costToServe: 11200,
    timeline: [{ when: "May 2026", text: "Installed and live", who: "Field" }] },
  { id: "s11", name: "Coastline Terminal", client: "c6", office: "kol", city: "Kolkata", cameras: 2, services: ["Time-lapse"], status: "Live", po: "PO-CST-077", poEnds: "Sep 2027", poUsed: 52, liveSince: "Nov 2025", lead: "Ananya Bose", health: 78, monthly: 19000, costToServe: 5200,
    timeline: [{ when: "Nov 2025", text: "Installed and live", who: "Field" }] },
  { id: "s12", name: "Gulf Crest Tower", client: "c7", office: "dxb", city: "Dubai", cameras: 2, services: ["Time-lapse", "360° monthly"], status: "Live", po: "PO-GCC-009", poEnds: "Feb 2028", poUsed: 17, liveSince: "Jul 2026", lead: "Faisal Ahmed", health: 93, monthly: 47000, costToServe: 8300,
    timeline: [{ when: "Jul 2026", text: "Installed and live. Billed in AED", who: "Field" }] },
  { id: "s13", name: "Sunrise Estates Phase 3", client: "c8", office: "ngp", city: "Nagpur", cameras: 2, services: ["Time-lapse"], status: "PO received", po: "PO-SUN-004", poEnds: "Dec 2028", poUsed: 0, lead: "Rahul Mehra", health: 80, monthly: 19000, costToServe: 0,
    timeline: [{ when: "06 Nov", text: "PO received", who: "Accounts" }, { when: "09 Nov", text: "Advance invoice sent with a payment link. Not paid yet", who: "Billing agent" }] },
  { id: "s14", name: "Lakeshore Residences", client: "c9", office: "hyd", city: "Hyderabad", cameras: 3, services: ["Time-lapse", "360° monthly"], status: "Quote sent", po: "—", poEnds: "—", poUsed: 0, lead: "Sales", health: 0, monthly: 0, costToServe: 0,
    timeline: [{ when: "07 Nov", text: "Survey: 3 positions, one needs solar", who: "Pre-sales" }, { when: "08 Nov", text: "Quote Q-3324 sent. Follow-up 2 sent today", who: "Sales agent" }] },
];
export const siteById = (id: string) => SITES.find((s) => s.id === id)!;

// ---------------------------------------------------------------- Cameras and uptime

export type CamStatus = "Live" | "Offline" | "In stock" | "Dispatched" | "Returning" | "Refurbishing" | "Faulty";
export type Camera = { serial: string; model: string; site: string | null; office: OfficeId; status: CamStatus; sim: string; simEnds: string; dataUsed: number; uptime: number; idleDays?: number; bought: string; battery?: number };
export const CAMERAS: Camera[] = [
  { serial: "OV-8M-4821", model: "8MP time-lapse", site: "s1", office: "pun", status: "Dispatched", sim: "Jio 4G", simEnds: "03 Dec", dataUsed: 0, uptime: 0, bought: "Mar 2024" },
  { serial: "OV-8M-4822", model: "8MP time-lapse", site: "s1", office: "pun", status: "Dispatched", sim: "Jio 4G", simEnds: "03 Dec", dataUsed: 0, uptime: 0, bought: "Mar 2024" },
  { serial: "OV-8M-3310", model: "8MP time-lapse", site: "s2", office: "pun", status: "Live", sim: "Airtel 4G", simEnds: "21 Dec", dataUsed: 61, uptime: 99.6, bought: "Jan 2025" },
  { serial: "OV-8M-3311", model: "8MP time-lapse", site: "s2", office: "pun", status: "Live", sim: "Airtel 4G", simEnds: "21 Dec", dataUsed: 58, uptime: 99.1, bought: "Jan 2025" },
  { serial: "OV-24M-1207", model: "24MP DSLR", site: "s3", office: "mum", status: "Live", sim: "Jio 4G", simEnds: "09 Jan", dataUsed: 74, uptime: 99.8, bought: "Nov 2025" },
  { serial: "OV-8M-3902", model: "8MP time-lapse", site: "s3", office: "mum", status: "Live", sim: "Jio 4G", simEnds: "09 Jan", dataUsed: 49, uptime: 98.9, bought: "Nov 2025" },
  { serial: "OV-PTZ-0441", model: "PTZ live", site: "s3", office: "mum", status: "Live", sim: "Jio 4G", simEnds: "09 Jan", dataUsed: 88, uptime: 99.4, bought: "Nov 2025" },
  { serial: "OV-4M-2280", model: "4MP solar", site: "s4", office: "mum", status: "Live", sim: "Vi 4G", simEnds: "28 Nov", dataUsed: 92, uptime: 97.2, bought: "Oct 2024", battery: 68 },
  { serial: "OV-4M-2281", model: "4MP solar", site: "s4", office: "mum", status: "Live", sim: "Vi 4G", simEnds: "28 Nov", dataUsed: 90, uptime: 98.0, bought: "Oct 2024", battery: 71 },
  { serial: "OV-8M-2501", model: "8MP time-lapse", site: "s5", office: "del", status: "Live", sim: "Airtel 4G", simEnds: "19 Dec", dataUsed: 55, uptime: 99.5, bought: "May 2025" },
  { serial: "OV-360-0112", model: "360° long-term", site: "s5", office: "del", status: "Live", sim: "Airtel 4G", simEnds: "19 Dec", dataUsed: 67, uptime: 98.7, bought: "May 2025" },
  { serial: "OV-8M-2015", model: "8MP time-lapse", site: "s6", office: "mum", status: "Returning", sim: "Jio 4G", simEnds: "paused", dataUsed: 0, uptime: 0, bought: "Aug 2024" },
  { serial: "OV-8M-2016", model: "8MP time-lapse", site: "s6", office: "mum", status: "Returning", sim: "Jio 4G", simEnds: "paused", dataUsed: 0, uptime: 0, bought: "Aug 2024" },
  { serial: "OV-8M-4417", model: "8MP solar", site: "s8", office: "hyd", status: "Offline", sim: "Airtel 4G", simEnds: "data used up", dataUsed: 100, uptime: 94.1, bought: "Mar 2025", battery: 52 },
  { serial: "OV-8M-4418", model: "8MP solar", site: "s8", office: "hyd", status: "Live", sim: "Airtel 4G", simEnds: "14 Dec", dataUsed: 81, uptime: 99.3, bought: "Mar 2025", battery: 77 },
  { serial: "OV-360-0091", model: "360° long-term", site: "s8", office: "hyd", status: "Live", sim: "Airtel 4G", simEnds: "14 Dec", dataUsed: 70, uptime: 99.0, bought: "Mar 2025" },
  { serial: "OV-45M-0033", model: "45MP Nikon Z7 II", site: "s10", office: "blr", status: "Live", sim: "Jio 4G", simEnds: "02 Feb", dataUsed: 63, uptime: 99.7, bought: "Apr 2026" },
  { serial: "OV-8M-5104", model: "8MP time-lapse", site: null, office: "hyd", status: "In stock", sim: "not active", simEnds: "—", dataUsed: 0, uptime: 0, idleDays: 23, bought: "Jun 2026" },
  { serial: "OV-8M-5105", model: "8MP time-lapse", site: null, office: "hyd", status: "In stock", sim: "not active", simEnds: "—", dataUsed: 0, uptime: 0, idleDays: 23, bought: "Jun 2026" },
  { serial: "OV-4M-1980", model: "4MP solar", site: null, office: "hyd", status: "Refurbishing", sim: "paused", simEnds: "—", dataUsed: 0, uptime: 0, idleDays: 9, bought: "Jul 2024" },
  { serial: "OV-8M-1702", model: "8MP time-lapse", site: null, office: "mum", status: "Faulty", sim: "paused", simEnds: "—", dataUsed: 0, uptime: 0, idleDays: 14, bought: "Feb 2024" },
];

export const FLEET = { live: 1184, offline: 4, inStock: 61, refurbishing: 17, inTransit: 9, faulty: 4, owned: 1279 };

/** 14 days of daily uptime % per site for the heatmap. */
export const UPTIME_DAYS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"];
export function uptimeRow(siteIdx: number): number[] {
  const r = seeded(300 + siteIdx);
  return UPTIME_DAYS.map((_, d) => {
    if (siteIdx === 7 && d === 13) return 61;
    if (siteIdx === 3 && (d === 4 || d === 5)) return 88;
    const x = r();
    return x < 0.06 ? 93 + Math.round(r() * 4) : 98 + Math.round(r() * 20) / 10;
  });
}

// ---------------------------------------------------------------- Customer care

export type TicketCat = "Camera offline" | "Image quality" | "Time-lapse request" | "Camera relocation" | "Login and access" | "Billing query" | "Report request" | "Complaint";
export type Ticket = {
  id: string;
  client: string;
  site: string;
  subject: string;
  cat: TicketCat;
  channel: "WhatsApp" | "Email" | "Phone" | "Client app" | "Vendor portal";
  pri: "P1" | "P2" | "P3";
  opened: string;
  slaLeft: number; // minutes left; negative = breached
  status: "New" | "Assigned" | "In progress" | "Waiting on client" | "Resolved";
  owner: string;
  link?: string;
  csat?: number;
  thread: { who: string; text: string; time: string; side: "client" | "us" | "agent" }[];
  draft?: string;
};
export const TICKETS: Ticket[] = [
  {
    id: "T-5812", client: "c4", site: "s8", subject: "Camera 2 at the depot shows no images since last night", cat: "Camera offline", channel: "WhatsApp", pri: "P1", opened: "07:48", slaLeft: 52, status: "In progress", owner: "Naveen Goud", link: "WO-2284",
    thread: [
      { who: "Site engineer, Northgate", text: "Camera 2 at the depot is not showing anything since last night. Board review at 4 pm, need the morning images.", time: "07:48", side: "client" },
      { who: "Care agent", text: "Checked: OV-8M-4417's SIM data ran out at 02:14. Top-up requested and Naveen is on site at 14:00. Images from 02:14 are stored on the camera and will upload once it's back.", time: "07:49", side: "agent" },
      { who: "Naveen Goud", text: "Top-up done, rebooting now.", time: "11:02", side: "us" },
    ],
    draft: "Good news: camera 2 is back online and last night's images are uploading now. They'll be on your dashboard before 2 pm, well ahead of your 4 pm review.",
  },
  {
    id: "T-5809", client: "c1", site: "s5", subject: "Tower crane moved, camera 3 needs to be relocated", cat: "Camera relocation", channel: "Email", pri: "P2", opened: "Yesterday", slaLeft: -180, status: "Assigned", owner: "Sandeep Chauhan", link: "WO-2287",
    thread: [
      { who: "Project manager, Meridian", text: "The tower crane has moved to the north side. Camera 3 now looks at a wall. Please relocate this week.", time: "Yesterday 10:12", side: "client" },
      { who: "Care agent", text: "Opened WO-2287. Relocation is within your PO's free moves (1 of 2 used).", time: "Yesterday 10:13", side: "agent" },
    ],
    draft: "Sandeep will relocate camera 3 today by 4 pm. We'll send the new view for your OK before we lock it.",
  },
  {
    id: "T-5805", client: "c2", site: "s2", subject: "Need a 90-second time-lapse for the Diwali launch event", cat: "Time-lapse request", channel: "Client app", pri: "P2", opened: "Yesterday", slaLeft: 1320, status: "In progress", owner: "Zoya Siddiqui",
    thread: [
      { who: "Marketing, Skyline", text: "Can we get a 90-second time-lapse of Tower A from foundation to today for our launch on Friday?", time: "Yesterday 16:20", side: "client" },
      { who: "Delivery agent", text: "Draft assembled from 214 days of images with your template. Zoya is checking it.", time: "Yesterday 16:31", side: "agent" },
    ],
  },
  {
    id: "T-5801", client: "c6", site: "s11", subject: "Invoice INV-10988 already paid by cheque", cat: "Billing query", channel: "Email", pri: "P3", opened: "13 Nov", slaLeft: 640, status: "Waiting on client", owner: "Sneha Reddy",
    thread: [
      { who: "Accounts, Coastline", text: "We sent cheque 004418 on 2 Nov for INV-10988. Please stop the reminders.", time: "13 Nov 11:05", side: "client" },
      { who: "Payments agent", text: "Cheque 004418 for ₹19,000 was deposited yesterday. Match suggested, waiting for accounts to confirm.", time: "Yesterday 18:03", side: "agent" },
    ],
    draft: "Thank you. Your cheque 004418 has been received and applied to INV-10988. Reminders have stopped.",
  },
  {
    id: "T-5798", client: "c5", site: "s10", subject: "Drone survey volumes look wrong for zone C", cat: "Complaint", channel: "Phone", pri: "P2", opened: "12 Nov", slaLeft: -60, status: "In progress", owner: "Pranav Hegde",
    thread: [
      { who: "Planning head, Vantage", text: "Cut/fill volume for zone C is 18% higher than our survey. We use these for billing our contractor.", time: "12 Nov 15:30", side: "client" },
      { who: "Pranav Hegde", text: "Re-processing with the new ground control points. Will share by tomorrow noon.", time: "13 Nov 10:00", side: "us" },
    ],
  },
  {
    id: "T-5794", client: "c7", site: "s12", subject: "Add 4 new users for the client's PMC team", cat: "Login and access", channel: "Vendor portal", pri: "P3", opened: "12 Nov", slaLeft: 0, status: "Resolved", owner: "Care agent", csat: 5,
    thread: [{ who: "Care agent", text: "4 users added with view-only access. Login links sent.", time: "12 Nov 09:14", side: "agent" }],
  },
  {
    id: "T-5790", client: "c3", site: "s7", subject: "Weekly report did not arrive on Monday", cat: "Report request", channel: "WhatsApp", pri: "P3", opened: "11 Nov", slaLeft: 0, status: "Resolved", owner: "Care agent", csat: 4,
    thread: [{ who: "Care agent", text: "Resent. The client's new email address is now on the report list.", time: "11 Nov 10:02", side: "agent" }],
  },
  {
    id: "T-5786", client: "c1", site: "s3", subject: "Images are hazy in the mornings", cat: "Image quality", channel: "WhatsApp", pri: "P3", opened: "10 Nov", slaLeft: 0, status: "Resolved", owner: "Yusuf Khan", csat: 5,
    thread: [{ who: "Yusuf Khan", text: "Lens cleaned and anti-fog cover fitted during today's 360° visit.", time: "11 Nov 12:30", side: "us" }],
  },
];

export const CARE_TREND = [
  { wk: "W40", opened: 41, solved: 38 },
  { wk: "W41", opened: 46, solved: 44 },
  { wk: "W42", opened: 39, solved: 41 },
  { wk: "W43", opened: 52, solved: 47 },
  { wk: "W44", opened: 44, solved: 46 },
  { wk: "W45", opened: 48, solved: 49 },
  { wk: "W46", opened: 37, solved: 36 },
];

// ---------------------------------------------------------------- Work orders (board)

export type WOType = "Install" | "Relocate" | "Repair" | "360° walk" | "Dismantle and return" | "Survey" | "Drone flight";
export type WOCol = "Scheduled" | "En route" | "On site" | "Blocked" | "Done";
export type WorkOrder = {
  id: string;
  type: WOType;
  site: string;
  who: string;
  due: string;
  col: WOCol;
  late?: string;
  sla: string;
  parts?: string[];
  firstFix?: boolean;
  reminders: { at: string; to: string; via: "App" | "WhatsApp" | "Dashboard" }[];
};
export const WORK_ORDERS: WorkOrder[] = [
  { id: "WO-2291", type: "Install", site: "s1", who: "Ravi Kumar", due: "Today 11:00", col: "On site", sla: "due 11:00", parts: ["2 × pole mount", "30 m Cat6", "2 × junction box"], reminders: [{ at: "08:00", to: "Ravi Kumar", via: "App" }] },
  { id: "WO-2284", type: "Repair", site: "s8", who: "Naveen Goud", due: "Today 14:00", col: "On site", sla: "P1 · 52 min left", parts: ["SIM top-up"], reminders: [{ at: "08:00", to: "Naveen Goud", via: "App" }] },
  { id: "WO-2287", type: "Relocate", site: "s5", who: "Sandeep Chauhan", due: "Yesterday", col: "En route", late: "1 day", sla: "breached 3 h", reminders: [
    { at: "Yesterday 09:00", to: "Vikas Singh", via: "App" }, { at: "Yesterday 13:00", to: "Vikas Singh", via: "WhatsApp" }, { at: "Today 09:00", to: "Arjun Rao (operations)", via: "WhatsApp" }, { at: "Today 09:20", to: "Reassigned to Sandeep Chauhan", via: "Dashboard" },
  ] },
  { id: "WO-2289", type: "Dismantle and return", site: "s6", who: "Imran Shaikh", due: "Mon 13:00", col: "En route", late: "2 days", sla: "2 days late", reminders: [
    { at: "Fri 09:00", to: "Imran Shaikh", via: "App" }, { at: "Fri 13:00", to: "Imran Shaikh", via: "WhatsApp" }, { at: "Sat 09:00", to: "Arjun Rao (operations)", via: "WhatsApp" }, { at: "Today 09:00", to: "Founder", via: "Dashboard" },
  ] },
  { id: "WO-2294", type: "360° walk", site: "s5", who: "Vikas Singh", due: "Today 15:30", col: "On site", sla: "on time", parts: ["Insta360 X4"], reminders: [] },
  { id: "WO-2297", type: "360° walk", site: "s3", who: "Yusuf Khan", due: "Today 12:00", col: "On site", sla: "on time", reminders: [] },
  { id: "WO-2300", type: "Survey", site: "s14", who: "Sai Teja", due: "Today 12:30", col: "En route", sla: "on time", reminders: [] },
  { id: "WO-2302", type: "Repair", site: "s2", who: "Ganesh Kale", due: "Today 13:00", col: "En route", sla: "on time", parts: ["Solar charge controller"], reminders: [] },
  { id: "WO-2296", type: "Drone flight", site: "s10", who: "Deepa Nair", due: "Tomorrow 07:00", col: "Scheduled", sla: "on time", parts: ["DJI Mavic 3E", "2 × batteries"], reminders: [] },
  { id: "WO-2298", type: "Install", site: "s13", who: "Rahul Mehra", due: "24 Nov", col: "Blocked", sla: "waiting for advance", reminders: [{ at: "Today 09:00", to: "Sneha Reddy (advance pending)", via: "App" }] },
  { id: "WO-2303", type: "360° walk", site: "s12", who: "Faisal Ahmed", due: "Tomorrow", col: "Scheduled", sla: "on time", reminders: [] },
  { id: "WO-2280", type: "Repair", site: "s4", who: "Imran Shaikh", due: "12 Nov", col: "Done", sla: "met", parts: ["Lens cover"], firstFix: true, reminders: [] },
  { id: "WO-2278", type: "Repair", site: "s9", who: "Karthik Subramanian", due: "11 Nov", col: "Done", sla: "met", parts: ["PoE injector"], firstFix: false, reminders: [] },
];

// ---------------------------------------------------------------- Inventory: three kinds of stock

export type ItemKind = "Deployed asset" | "Engineer tool" | "Consumable";
export type Item = { id: string; name: string; kind: ItemKind; unit: string; cost: number; min: number; max: number; stock: Record<OfficeId, number> };
const z: Record<OfficeId, number> = { hyd: 0, mum: 0, del: 0, blr: 0, pun: 0, che: 0, kol: 0, ngp: 0, dxb: 0 };
const st = (v: Partial<Record<OfficeId, number>>) => ({ ...z, ...v });
export const ITEMS: Item[] = [
  { id: "i1", name: "8MP time-lapse camera", kind: "Deployed asset", unit: "unit", cost: 68000, min: 20, max: 60, stock: st({ hyd: 31, mum: 8, del: 6, blr: 5, pun: 3, che: 2, kol: 1, ngp: 2, dxb: 3 }) },
  { id: "i2", name: "4MP solar camera", kind: "Deployed asset", unit: "unit", cost: 54000, min: 8, max: 25, stock: st({ hyd: 6, mum: 1, del: 1, blr: 0, che: 1 }) },
  { id: "i3", name: "24MP DSLR system", kind: "Deployed asset", unit: "unit", cost: 145000, min: 3, max: 10, stock: st({ hyd: 2, mum: 1 }) },
  { id: "i4", name: "4G router", kind: "Deployed asset", unit: "unit", cost: 6500, min: 30, max: 80, stock: st({ hyd: 44, mum: 9, del: 7, blr: 6, pun: 4, che: 3, kol: 2, ngp: 2, dxb: 4 }) },
  { id: "i5", name: "Solar kit, 150 W + battery", kind: "Deployed asset", unit: "kit", cost: 21000, min: 10, max: 30, stock: st({ hyd: 7, mum: 2, del: 1, blr: 1, che: 1 }) },
  { id: "i6", name: "Data SIM", kind: "Deployed asset", unit: "SIM", cost: 300, min: 50, max: 150, stock: st({ hyd: 88, mum: 14, del: 11, blr: 9, pun: 6, che: 5, kol: 4, ngp: 3, dxb: 6 }) },
  { id: "i7", name: "Insta360 X4 (360° capture)", kind: "Engineer tool", unit: "unit", cost: 52000, min: 8, max: 14, stock: st({ hyd: 3, mum: 2, del: 2, blr: 1, pun: 1, che: 1 }) },
  { id: "i8", name: "DJI Mavic 3 Enterprise", kind: "Engineer tool", unit: "unit", cost: 410000, min: 3, max: 5, stock: st({ hyd: 1, blr: 1, dxb: 1 }) },
  { id: "i9", name: "Cordless drill kit", kind: "Engineer tool", unit: "kit", cost: 9800, min: 12, max: 24, stock: st({ hyd: 6, mum: 3, del: 3, blr: 2, pun: 2, che: 1, kol: 1, ngp: 1, dxb: 1 }) },
  { id: "i10", name: "Safety harness", kind: "Engineer tool", unit: "unit", cost: 4200, min: 24, max: 36, stock: st({ hyd: 9, mum: 4, del: 3, blr: 3, pun: 2, che: 2, kol: 1, ngp: 1, dxb: 2 }) },
  { id: "i11", name: "4G signal tester", kind: "Engineer tool", unit: "unit", cost: 7600, min: 10, max: 18, stock: st({ hyd: 4, mum: 2, del: 2, blr: 1, pun: 1, che: 1 }) },
  { id: "i12", name: "Cat6 outdoor cable", kind: "Consumable", unit: "m", cost: 38, min: 1500, max: 4000, stock: st({ hyd: 1900, mum: 340, del: 410, blr: 260, pun: 120, che: 180, kol: 90, ngp: 70, dxb: 220 }) },
  { id: "i13", name: "PoE injector", kind: "Consumable", unit: "unit", cost: 1450, min: 40, max: 100, stock: st({ hyd: 22, mum: 4, del: 6, blr: 3, pun: 1, che: 2, kol: 1, ngp: 1, dxb: 3 }) },
  { id: "i14", name: "Pole mount clamp set", kind: "Consumable", unit: "set", cost: 2100, min: 30, max: 80, stock: st({ hyd: 26, mum: 6, del: 5, blr: 4, pun: 0, che: 2, kol: 1, ngp: 1, dxb: 2 }) },
  { id: "i15", name: "Weatherproof junction box", kind: "Consumable", unit: "unit", cost: 650, min: 60, max: 150, stock: st({ hyd: 71, mum: 12, del: 9, blr: 8, pun: 3, che: 4, kol: 2, ngp: 2, dxb: 6 }) },
  { id: "i16", name: "256 GB high-endurance SD card", kind: "Consumable", unit: "unit", cost: 2300, min: 40, max: 120, stock: st({ hyd: 34, mum: 7, del: 5, blr: 5, pun: 2, che: 2, kol: 1, ngp: 1, dxb: 3 }) },
  { id: "i17", name: "Anti-fog lens cover", kind: "Consumable", unit: "unit", cost: 480, min: 40, max: 100, stock: st({ hyd: 18, mum: 2, del: 3, blr: 2, pun: 1, che: 1, kol: 0, ngp: 0, dxb: 2 }) },
];

/** Minimum per office is the company minimum split by how much each office uses. */
export const OFFICE_SHARE: Record<OfficeId, number> = { hyd: 0.42, mum: 0.15, del: 0.12, blr: 0.09, pun: 0.06, che: 0.05, kol: 0.03, ngp: 0.03, dxb: 0.05 };
/** The minimum an office should hold of an item. Expensive items held only at HQ come out as 0. */
export const needAt = (min: number, o: OfficeId) => Math.round(min * OFFICE_SHARE[o] * 0.8);

export type KitStatus = "In use" | "Spare" | "Faulty" | "Replace due";
export type KitLine = { item: string; serial?: string; qty: number; status: KitStatus; last: string };
export const KITS: { who: string; office: OfficeId; value: number; lines: KitLine[] }[] = [
  { who: "Ravi Kumar", office: "pun", value: 71400, lines: [
    { item: "Insta360 X4", serial: "IX4-2207", qty: 1, status: "In use", last: "WO-2291 today" },
    { item: "Cordless drill kit", qty: 1, status: "In use", last: "WO-2291 today" },
    { item: "Safety harness", qty: 1, status: "Replace due", last: "Inspected 14 Jun (5-month check overdue)" },
    { item: "4G signal tester", serial: "ST-0418", qty: 1, status: "In use", last: "WO-2291 today" },
    { item: "Cat6 outdoor cable", qty: 40, status: "Spare", last: "30 m used on WO-2291" },
    { item: "Pole mount clamp set", qty: 0, status: "Spare", last: "2 used today, none left" },
  ] },
  { who: "Imran Shaikh", office: "mum", value: 66900, lines: [
    { item: "Insta360 X4", serial: "IX4-1981", qty: 1, status: "Faulty", last: "Lens scratched on 10 Nov" },
    { item: "Cordless drill kit", qty: 1, status: "In use", last: "WO-2289" },
    { item: "Safety harness", qty: 1, status: "In use", last: "Inspected 2 Oct" },
    { item: "PoE injector", qty: 2, status: "Spare", last: "—" },
  ] },
  { who: "Vikas Singh", office: "del", value: 74800, lines: [
    { item: "Insta360 X4", serial: "IX4-2033", qty: 1, status: "In use", last: "WO-2294 today" },
    { item: "4G signal tester", serial: "ST-0390", qty: 1, status: "Spare", last: "Not used in 41 days" },
    { item: "SD card 256 GB", qty: 4, status: "Spare", last: "—" },
  ] },
  { who: "Deepa Nair", office: "blr", value: 438600, lines: [
    { item: "DJI Mavic 3 Enterprise", serial: "M3E-7781", qty: 1, status: "In use", last: "WO-2296 tomorrow" },
    { item: "Drone batteries", qty: 4, status: "In use", last: "1 battery at 81% health" },
    { item: "Insta360 X4", serial: "IX4-2101", qty: 1, status: "Spare", last: "Not used in 63 days" },
  ] },
];

export const FAULTY = [
  { item: "Insta360 X4", serial: "IX4-1981", office: "mum" as OfficeId, by: "Imran Shaikh", issue: "Lens scratched", decision: "Repair at service centre", cost: 6800, state: "Sent 12 Nov" },
  { item: "8MP time-lapse camera", serial: "OV-8M-1702", office: "mum" as OfficeId, by: "Stores", issue: "Sensor failure after monsoon", decision: "Return to maker (in warranty)", cost: 0, state: "Return no. RMA-2291 raised" },
  { item: "4G router", serial: "RT-6620", office: "hyd" as OfficeId, by: "Naveen Goud", issue: "Port burnt, power surge", decision: "Replace, out of warranty", cost: 6500, state: "Needs approval" },
  { item: "Solar battery 12 V", serial: "SB-1109", office: "mum" as OfficeId, by: "Uptime agent", issue: "Holds 52% charge", decision: "Replace before June", cost: 7900, state: "Planned" },
];

export const USAGE = [
  { site: "s5", visits: 6, parts: 18400, travel: 9600 },
  { site: "s8", visits: 5, parts: 11200, travel: 3100 },
  { site: "s4", visits: 4, parts: 9800, travel: 7400 },
  { site: "s3", visits: 3, parts: 4100, travel: 5200 },
  { site: "s2", visits: 2, parts: 2600, travel: 1800 },
  { site: "s10", visits: 3, parts: 7600, travel: 4100 },
];

// ---------------------------------------------------------------- Money

export type InvKind = "Advance 50%" | "Balance on install" | "Monthly service" | "360° walkthrough" | "Drone survey" | "Buy-back refund";
export type InvStatus = "Draft" | "Sent" | "Awaiting sign-off" | "Overdue" | "Paid" | "Refund due" | "Refunded";
export type Invoice = { id: string; site: string; kind: InvKind; amount: number; raised: string; due: string; status: InvStatus; note?: string };
export const INVOICES: Invoice[] = [
  { id: "INV-11204", site: "s2", kind: "Monthly service", amount: 19000, raised: "01 Nov", due: "01 Dec", status: "Sent" },
  { id: "INV-11198", site: "s3", kind: "Monthly service", amount: 28500, raised: "01 Nov", due: "01 Dec", status: "Paid" },
  { id: "INV-11199", site: "s4", kind: "Monthly service", amount: 19000, raised: "01 Nov", due: "01 Dec", status: "Paid" },
  { id: "INV-11200", site: "s5", kind: "Monthly service", amount: 38000, raised: "01 Nov", due: "01 Dec", status: "Paid" },
  { id: "INV-11201", site: "s5", kind: "360° walkthrough", amount: 28000, raised: "01 Nov", due: "01 Dec", status: "Awaiting sign-off", note: "With the client's site engineer for 9 days" },
  { id: "INV-11050", site: "s8", kind: "Monthly service", amount: 28500, raised: "01 Oct", due: "15 Nov", status: "Overdue", note: "Uploaded to the client's vendor portal on 3 Oct" },
  { id: "INV-11051", site: "s9", kind: "Monthly service", amount: 19000, raised: "01 Oct", due: "15 Nov", status: "Overdue" },
  { id: "INV-11212", site: "s8", kind: "Monthly service", amount: 28500, raised: "01 Nov", due: "16 Dec", status: "Sent" },
  { id: "INV-11213", site: "s9", kind: "Monthly service", amount: 19000, raised: "01 Nov", due: "16 Dec", status: "Sent" },
  { id: "INV-11207", site: "s7", kind: "Monthly service", amount: 19000, raised: "01 Nov", due: "01 Dec", status: "Sent" },
  { id: "INV-11209", site: "s10", kind: "Monthly service", amount: 9500, raised: "01 Nov", due: "01 Dec", status: "Sent" },
  { id: "INV-11210", site: "s10", kind: "Drone survey", amount: 45000, raised: "01 Nov", due: "01 Dec", status: "Sent" },
  { id: "INV-11211", site: "s11", kind: "Monthly service", amount: 19000, raised: "01 Nov", due: "01 Dec", status: "Sent" },
  { id: "INV-10988", site: "s11", kind: "Monthly service", amount: 19000, raised: "01 Sep", due: "01 Oct", status: "Overdue", note: "Client says a cheque was sent on 2 Nov" },
  { id: "INV-11214", site: "s12", kind: "Monthly service", amount: 19000, raised: "01 Nov", due: "01 Dec", status: "Sent", note: "Billed as AED 845" },
  { id: "INV-11160", site: "s13", kind: "Advance 50%", amount: 120000, raised: "09 Nov", due: "16 Nov", status: "Sent", note: "Payment link and UPI QR sent" },
  { id: "INV-11102", site: "s1", kind: "Advance 50%", amount: 120000, raised: "02 Nov", due: "09 Nov", status: "Paid" },
  { id: "INV-11150", site: "s6", kind: "Monthly service", amount: 19000, raised: "01 Oct", due: "31 Oct", status: "Paid" },
];

export type Channel = "Client app" | "Bank transfer" | "UPI" | "Cheque" | "Payment link" | "Virtual account";
export type Payment = { id: string; when: string; client: string; raw: string; amount: number; channel: Channel; state: "Matched" | "Suggested" | "Needs a look"; confidence?: number; alloc: { invoice: string; amount: number }[]; why?: string };
export const PAYMENTS: Payment[] = [
  { id: "PAY-7781", when: "Today 10:48", client: "c1", amount: 3840000, channel: "Bank transfer", state: "Matched", confidence: 99, raw: "NEFT CR MERIDIAN INFRA PROJECTS PVT LTD UTR N318264519",
    alloc: [{ invoice: "INV-11198", amount: 28500 }, { invoice: "INV-11199", amount: 19000 }, { invoice: "INV-11200", amount: 38000 }], why: "Remittance advice in accounts@ listed 12 sites; matched line by line (3 shown here)." },
  { id: "PAY-7782", when: "Today 09:15", client: "c2", amount: 120000, channel: "Client app", state: "Matched", confidence: 100, raw: "OpticVyu app · Skyline Developers · INV-11102", alloc: [{ invoice: "INV-11102", amount: 120000 }], why: "Paid in the client app against the invoice number." },
  { id: "PAY-7784", when: "Yesterday 18:02", client: "c6", amount: 19000, channel: "Cheque", state: "Suggested", confidence: 92, raw: "CHQ DEP 004418 COASTLINE INFRA LTD", alloc: [{ invoice: "INV-10988", amount: 19000 }], why: "Amount equals Coastline's oldest open invoice; client emailed about cheque 004418." },
  { id: "PAY-7785", when: "Yesterday 16:40", client: "c5", amount: 9500, channel: "UPI", state: "Suggested", confidence: 88, raw: "UPI/CR/631994/vantagerealty@okhdfcbank/no remarks", alloc: [{ invoice: "INV-11209", amount: 9500 }], why: "This UPI handle paid Vantage invoices twice before. Amount matches." },
  { id: "PAY-7786", when: "13 Nov", client: "c4", amount: 47500, channel: "Bank transfer", state: "Needs a look", raw: "RTGS CR NGMEPC JV ACCOUNT 2 UTR R1311", alloc: [], why: "New joint-venture account. ₹47,500 equals INV-11050 + INV-11051." },
  { id: "PAY-7779", when: "12 Nov", client: "c3", amount: 19000, channel: "Virtual account", state: "Matched", confidence: 100, raw: "VA 2223 0003 · Arcadia Homes", alloc: [{ invoice: "INV-11150", amount: 19000 }], why: "Arrived in Arcadia's own virtual account." },
];

/** Overdue by age, ₹ lakh, per client (illustrative, company-wide). */
export const AGING = [
  { client: "Northgate Metro EPC", b0: 9.4, b30: 6.1, b60: 3.2, b90: 1.4 },
  { client: "Meridian Infra", b0: 14.2, b30: 3.8, b60: 0.9, b90: 0 },
  { client: "Coastline Infra", b0: 2.6, b30: 1.9, b60: 1.1, b90: 0.8 },
  { client: "Gulf Crest Contracting", b0: 3.1, b30: 1.2, b60: 0, b90: 0 },
  { client: "Arcadia Homes", b0: 2.9, b30: 0.7, b60: 0.3, b90: 0 },
  { client: "Skyline Developers", b0: 4.4, b30: 0.4, b60: 0, b90: 0 },
  { client: "Vantage Realty", b0: 1.9, b30: 0, b60: 0, b90: 0 },
];
export const DSO = [52, 51, 49, 50, 48, 47, 46, 45, 43, 44, 42, 41];
export const CHANNEL_MIX = [
  { label: "Bank transfer", value: 58 },
  { label: "Client app", value: 17 },
  { label: "Virtual account", value: 11 },
  { label: "UPI", value: 8 },
  { label: "Cheque", value: 6 },
];

// Revenue movements, ₹ lakh a month (illustrative)
export const MONTHS = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
export const MOVES = [
  { m: "Dec", fresh: 4.1, ext: 1.2, addon: 0.9, ended: -2.6 },
  { m: "Jan", fresh: 4.6, ext: 0.8, addon: 1.1, ended: -3.4 },
  { m: "Feb", fresh: 4.0, ext: 1.4, addon: 0.7, ended: -3.1 },
  { m: "Mar", fresh: 5.3, ext: 1.1, addon: 1.2, ended: -3.6 },
  { m: "Apr", fresh: 4.2, ext: 0.9, addon: 1.0, ended: -3.1 },
  { m: "May", fresh: 5.1, ext: 1.3, addon: 1.4, ended: -3.8 },
  { m: "Jun", fresh: 4.8, ext: 1.0, addon: 1.3, ended: -3.1 },
  { m: "Jul", fresh: 5.6, ext: 1.2, addon: 1.1, ended: -3.9 },
  { m: "Aug", fresh: 5.2, ext: 1.5, addon: 1.2, ended: -3.9 },
  { m: "Sep", fresh: 5.4, ext: 1.1, addon: 1.6, ended: -4.1 },
  { m: "Oct", fresh: 6.1, ext: 1.4, addon: 1.4, ended: -3.9 },
  { m: "Nov", fresh: 5.8, ext: 1.6, addon: 1.5, ended: -4.9 },
];
export const REVENUE = [78, 81, 84, 88, 91, 95, 99, 103, 107, 111, 116, 120];
export const FORECAST = { months: ["Dec", "Jan", "Feb", "Mar", "Apr", "May"], mid: [125, 130, 135, 141, 147, 153], low: [122, 125, 128, 132, 136, 140], high: [128, 135, 142, 150, 158, 166] };

/** 13-week cash, ₹ lakh. */
export const CASH = [
  { w: "W47", inflow: 69, outflow: 61 }, { w: "W48", inflow: 42, outflow: 54 }, { w: "W49", inflow: 53, outflow: 96 }, { w: "W50", inflow: 84, outflow: 58 }, { w: "W51", inflow: 77, outflow: 63 }, { w: "W52", inflow: 65, outflow: 71 }, { w: "W1", inflow: 97, outflow: 66 }, { w: "W2", inflow: 88, outflow: 112 }, { w: "W3", inflow: 76, outflow: 59 }, { w: "W4", inflow: 73, outflow: 61 }, { w: "W5", inflow: 89, outflow: 98 }, { w: "W6", inflow: 82, outflow: 64 }, { w: "W7", inflow: 73, outflow: 62 },
];
export const CASH_START = 214;

export const COHORTS = [
  { year: "2021", clients: 38, kept: [100, 118, 131, 142, 151] },
  { year: "2022", clients: 54, kept: [100, 121, 129, 137] },
  { year: "2023", clients: 71, kept: [100, 114, 126] },
  { year: "2024", clients: 83, kept: [100, 112] },
  { year: "2025", clients: 104, kept: [100] },
];

export const PIPELINE = [
  { stage: "Enquiry", n: 41, cams: 96 },
  { stage: "Survey", n: 18, cams: 51 },
  { stage: "Quote sent", n: 17, cams: 44 },
  { stage: "Procurement", n: 9, cams: 27 },
  { stage: "PO received", n: 6, cams: 14 },
];
export const PRODUCT_SPLIT = [
  { label: "Time-lapse", value: 61 },
  { label: "360° walks", value: 17 },
  { label: "Drone", value: 9 },
  { label: "BuildTrack", value: 8 },
  { label: "LiDAR / BIM", value: 5 },
];

/** Office scoreboard (illustrative). Revenue ₹ lakh a month. */
export const SCORE: Record<OfficeId, { revenue: number; trend: number[]; cams: number; util: number; jobs: number; ftf: number; dso: number; tickets: number }> = {
  hyd: { revenue: 31.2, trend: [24, 25, 26, 27, 28, 29, 30, 31], cams: 302, util: 93, jobs: 14, ftf: 84, dso: 49, tickets: 9 },
  mum: { revenue: 26.4, trend: [19, 20, 21, 22, 23, 24, 25, 26], cams: 251, util: 91, jobs: 11, ftf: 79, dso: 44, tickets: 7 },
  del: { revenue: 18.9, trend: [14, 15, 15, 16, 17, 17, 18, 19], cams: 184, util: 90, jobs: 9, ftf: 76, dso: 47, tickets: 6 },
  blr: { revenue: 13.7, trend: [9, 10, 10, 11, 12, 12, 13, 14], cams: 129, util: 94, jobs: 8, ftf: 88, dso: 31, tickets: 3 },
  pun: { revenue: 8.4, trend: [6, 6, 7, 7, 7, 8, 8, 8], cams: 82, util: 95, jobs: 6, ftf: 86, dso: 26, tickets: 2 },
  che: { revenue: 6.2, trend: [4, 5, 5, 5, 5, 6, 6, 6], cams: 61, util: 89, jobs: 5, ftf: 81, dso: 52, tickets: 2 },
  kol: { revenue: 3.6, trend: [2, 3, 3, 3, 3, 3, 4, 4], cams: 34, util: 86, jobs: 3, ftf: 74, dso: 58, tickets: 1 },
  ngp: { revenue: 2.4, trend: [1, 1, 2, 2, 2, 2, 2, 2], cams: 22, util: 88, jobs: 2, ftf: 80, dso: 33, tickets: 1 },
  dxb: { revenue: 9.2, trend: [3, 4, 5, 6, 7, 8, 8, 9], cams: 64, util: 92, jobs: 3, ftf: 90, dso: 36, tickets: 2 },
};

// ---------------------------------------------------------------- Payroll and hiring

export const PAYROLL_STEPS = ["Attendance locked", "Leave and late marks applied", "Claims added", "PF, ESI, PT, TDS", "Founder approval", "Bank file", "Payslips sent"];
export const STATUTORY = [
  { what: "TDS on salaries", due: "7 Dec", state: "Ready" },
  { what: "PF (EPFO)", due: "15 Dec", state: "Ready" },
  { what: "ESI", due: "15 Dec", state: "Ready" },
  { what: "Professional tax, Telangana", due: "10 Dec", state: "Ready" },
  { what: "Professional tax, Maharashtra", due: "30 Nov", state: "Filed" },
  { what: "Form 24Q, Q3", due: "31 Jan", state: "Scheduled" },
];
export const HIRING = [
  { role: "Field engineer, Mumbai", stage: "Offer sent", n: 1 },
  { role: "Field engineer, Delhi NCR", stage: "Interviews", n: 4 },
  { role: "Video editor, Hyderabad", stage: "Screening", n: 23 },
  { role: "Accounts executive", stage: "Paused", n: 0 },
];
export const SKILLS = ["Camera install", "Solar", "360° capture", "Drone pilot (DGCA)", "LiDAR scan", "Working at height"];
export const SKILL_GRID: { who: string; s: (0 | 1 | 2)[] }[] = [
  { who: "Ravi Kumar", s: [2, 2, 2, 0, 1, 2] },
  { who: "Imran Shaikh", s: [2, 2, 1, 0, 0, 2] },
  { who: "Vikas Singh", s: [2, 1, 2, 0, 1, 2] },
  { who: "Deepa Nair", s: [2, 1, 2, 2, 1, 2] },
  { who: "Yusuf Khan", s: [1, 1, 2, 0, 0, 1] },
  { who: "Naveen Goud", s: [2, 2, 1, 1, 0, 2] },
  { who: "Sai Teja", s: [1, 0, 1, 0, 0, 1] },
  { who: "Faisal Ahmed", s: [2, 2, 2, 1, 2, 2] },
];

// ---------------------------------------------------------------- Approvals, agents, learning, sources

export type Approval = { id: string; title: string; detail: string; facts: string[]; rule: string; result: string; amount?: number; area: string };
export const APPROVALS: Approval[] = [
  { id: "ap1", area: "Billing", title: "Buy-back refund · Arcadia Heights, 2 cameras", amount: 96000, detail: "Project complete. 40% of ₹1,20,000 per camera goes back to Arcadia Homes once both cameras are checked in.",
    facts: ["PO-ARC-041 ended 31 Oct", "Both cameras pass the return checklist", "No open invoices on this site", "Goes out as a credit note in Zoho Books"], rule: "Any refund needs the founder", result: "Credit note CN-0418 for ₹96,000 drafted in Zoho Books. Arcadia Homes told on email and WhatsApp." },
  { id: "ap2", area: "Payroll", title: "Payroll · November 2026, 54 people", amount: 2436000, detail: "Prepared from GPS attendance, leave and approved claims. 3 changes from October, all explained.",
    facts: ["49 full month, 2 joiners, 3 with unpaid leave", "PF, ESI, professional tax and TDS calculated", "₹38,400 of claims included", "Bank file ready for 30 Nov"], rule: "Payroll always needs the founder", result: "Payroll locked. Bank file queued for 30 Nov and payslips go to every phone that day." },
  { id: "ap3", area: "Sales", title: "PO extension request · Harbour Line Depot", detail: "PO-MER-207 ends 4 Dec while the project runs about 3 months late. Ask Meridian Infra for 6 more months.",
    facts: ["2 cameras live, 99% uptime", "Client's schedule shows completion in Mar 2027", "Last extension approved in 11 days"], rule: "Anything sent to a client's procurement team", result: "Extension request sent to Meridian Infra's procurement, with uptime and progress attached." },
  { id: "ap4", area: "Inventory", title: "Buy 12 new 8MP kits for Pune and Mumbai", amount: 1320000, detail: "Pipeline needs 14 cameras in the west by January. Stock in the west: 11, of which 4 are reserved.",
    facts: ["Weighted pipeline: 14 cameras west, Dec–Jan", "Refurbishing: 17, ready in 9–20 days", "Supplier lead time: 3 weeks"], rule: "Purchases above ₹1 lakh", result: "Purchase order sent to the supplier. Fleet plan updated with arrival dates." },
  { id: "ap5", area: "Inventory", title: "Replace burnt 4G router RT-6620", amount: 6500, detail: "Out of warranty after a power surge at Northgate Depot.",
    facts: ["Repair quote ₹4,900, 9-day turnaround", "New unit ₹6,500, in stock at Hyderabad"], rule: "Replacements above ₹5,000", result: "New router issued from Hyderabad stock. Old one sent for scrap." },
];

export type TraceStep = { k: "Noticed" | "Checked" | "Did" | "Asked" | "Result"; text: string };
export type Activity = { id: string; time: string; agent: string; text: string; kind: "done" | "flag" | "ask"; view: ViewId; trace?: TraceStep[] };
export const ACTIVITY: Activity[] = [
  { id: "a1", time: "10:49", agent: "Payments agent", kind: "done", view: "payments", text: "₹38.4 lakh from Meridian Infra matched across 12 sites",
    trace: [
      { k: "Noticed", text: "NEFT credit of ₹38,40,000 from MERIDIAN INFRA PROJECTS PVT LTD." },
      { k: "Checked", text: "Found the remittance advice in accounts@ listing 12 invoice numbers. Every amount matches an open invoice." },
      { k: "Did", text: "Recorded the payment in Zoho Books against each invoice; 12 sites marked paid for November." },
      { k: "Result", text: "Meridian's open balance for November is ₹0. Nobody read the bank statement." },
    ] },
  { id: "a2", time: "09:41", agent: "Attendance agent", kind: "flag", view: "attendance", text: "Rohit Yadav tried to mark in 1.8 km from the Mumbai office. Rejected",
    trace: [
      { k: "Noticed", text: "Check-in from Andheri East, 1,840 m outside the Mumbai office boundary (120 m)." },
      { k: "Checked", text: "No site assigned to Rohit today. Phone GPS accuracy ±12 m, so not a signal problem." },
      { k: "Did", text: "Rejected the check-in and offered a correction request with a reason." },
    ] },
  { id: "a3", time: "09:16", agent: "Payments agent", kind: "done", view: "billing", text: "Advance for Skyline Towers B received in the client app" },
  { id: "a4", time: "09:00", agent: "Work-order agent", kind: "flag", view: "workorders", text: "WO-2289 dismantle at Arcadia Heights is 2 days late. Raised to you",
    trace: [
      { k: "Noticed", text: "WO-2289 was due Monday 13:00 and is still open." },
      { k: "Checked", text: "Reminded Imran in the app and on WhatsApp, then Arjun Rao. No update for 48 hours." },
      { k: "Asked", text: "Put on the founder's command centre with a reassign button. Nearest free engineer: Ravi Kumar, free from 15:00." },
    ] },
  { id: "a5", time: "07:49", agent: "Care agent", kind: "done", view: "care", text: "Northgate's camera complaint answered in 61 seconds with the cause and a fix time" },
  { id: "a6", time: "02:16", agent: "Uptime agent", kind: "flag", view: "fleet", text: "OV-8M-4417 offline at Northgate Depot. SIM data used up",
    trace: [
      { k: "Noticed", text: "No upload from OV-8M-4417 since 02:14." },
      { k: "Checked", text: "Remote reboot: no change. Airtel portal shows the data pack used up 3 days early." },
      { k: "Did", text: "Asked for a ₹499 top-up and joined a check to Naveen's 14:00 visit (WO-2284)." },
    ] },
  { id: "a7", time: "08:30", agent: "Inventory agent", kind: "flag", view: "inventory", text: "Pune has 0 pole mount clamp sets. 2 installs need them this week" },
  { id: "a8", time: "08:00", agent: "Chief of staff", kind: "done", view: "overview", text: "Monday page sent to the founder" },
];

export type Learned = { id: string; text: string; evidence: string; kind: "keep" | "allow" };
export const LEARNED: Learned[] = [
  { id: "l1", kind: "keep", text: "Meridian Infra pays 41 days after sign-off, not the 30 in the contract.", evidence: "Last 22 invoices: median 41 days, range 34–49." },
  { id: "l2", kind: "keep", text: "Northgate Metro EPC answers reminders on WhatsApp on Tuesdays at 10 am.", evidence: "Replies within 4 hours on 7 of 8 Tuesday reminders; 2 of 9 by email." },
  { id: "l3", kind: "allow", text: "You approved 38 of 38 payment reminders under ₹50,000. Let the agent send these alone?", evidence: "No edits in 9 weeks." },
  { id: "l4", kind: "keep", text: "Solar cameras in Mumbai lose charge for 6–9 days each July. Book battery checks in June.", evidence: "Battery logs, July 2025 and 2026, 31 cameras." },
  { id: "l5", kind: "keep", text: "Pune installs take 3 h 10 m on average, not 4 h. Schedules tightened.", evidence: "Last 26 installs in Pune." },
  { id: "l6", kind: "keep", text: "Pole mount clamps run out in Pune every 5 weeks. Minimum raised from 4 to 8.", evidence: "Stock-outs on 3 Oct and 9 Nov." },
];

export const SOURCES = [
  { name: "Camera platform", what: "Uploads, heartbeats, projects", kind: "Your product · read-only", records: "1,279 cameras", synced: "5 min" },
  { name: "Inventory dashboard", what: "Stock, serials, dispatch", kind: "Your dashboard", records: "6,412 items", synced: "15 min" },
  { name: "Invoice dashboard", what: "Raised invoices, POs", kind: "Your dashboard", records: "18,400 invoices", synced: "15 min" },
  { name: "Zoho Books", what: "Ledger, receipts, credit notes", kind: "Accounting", records: "2 years", synced: "5 min" },
  { name: "Client app payments", what: "Payments in your app", kind: "Gateway", records: "live", synced: "instant" },
  { name: "Bank accounts", what: "NEFT, RTGS, UPI, cheques", kind: "Bank feed", records: "3 accounts", synced: "30 min" },
  { name: "Employee app", what: "GPS check-ins, leave, claims", kind: "Ops One app", records: "54 people", synced: "instant" },
  { name: "Gmail · 6 inboxes", what: "Enquiries, remittances, complaints", kind: "Email", records: "6 inboxes", synced: "instant" },
  { name: "WhatsApp Business", what: "Client chats, reminders", kind: "Messaging", records: "2 numbers", synced: "instant" },
];

export const FLOW_EVENTS = [
  { from: 4, text: "₹1,20,000 advance paid in the client app by Skyline Developers", to: "Billing" },
  { from: 6, text: "Ravi Kumar marked in at Skyline Towers B, inside the boundary", to: "Attendance" },
  { from: 0, text: "OV-8M-4417 stopped uploading at Northgate Depot", to: "Fleet" },
  { from: 8, text: "Northgate's site engineer complained about camera 2 on WhatsApp", to: "Customer care" },
  { from: 5, text: "₹38.4 lakh NEFT from Meridian Infra matched to 12 sites", to: "Payments" },
  { from: 1, text: "2 pole mount clamps used at Skyline B. Pune stock now 0", to: "Inventory" },
  { from: 7, text: "Remittance advice from Meridian read from accounts@", to: "Payments" },
  { from: 2, text: "INV-11204 raised for Skyline Towers A", to: "Billing" },
  { from: 3, text: "Credit note draft CN-0418 created in Zoho Books", to: "Approvals" },
];

export const FDE_LOG = [
  { when: "Fri", text: "Attendance: fake-GPS apps now detected on iPhone as well as Android" },
  { when: "Thu", text: "Payments: cheque deposits read from the bank's image file" },
  { when: "Wed", text: "Billing: AED invoices for the Dubai office with live exchange rates" },
  { when: "Tue", text: "Inventory: Pune minimum stock for clamps raised from what Learning found" },
];

// ---------------------------------------------------------------- Project tracker
// Every project moves through the same ten stages. Each stage belongs to one team, has a time
// target and a checklist, and every team writes its own updates on the project as it works.

export type Team = "Sales" | "Pre-sales" | "Accounts" | "Stores" | "Field" | "Support" | "Founder";
export const STAGES: { key: string; label: string; team: Team; sla: number; checks: string[] }[] = [
  { key: "enq", label: "Enquiry", team: "Sales", sla: 1, checks: ["First reply sent", "Need understood (sites, duration, services)", "Decision maker named", "Survey booked"] },
  { key: "srv", label: "Site survey", team: "Pre-sales", sla: 5, checks: ["Positions marked on drawings", "Power and solar need checked", "4G signal tested", "Survey report shared"] },
  { key: "quo", label: "Quote", team: "Sales", sla: 3, checks: ["Quote built from rate card", "Data-security answers attached", "Quote sent", "Follow-up 1", "Follow-up 2"] },
  { key: "po", label: "Procurement and PO", team: "Sales", sla: 21, checks: ["Vendor registration done", "Negotiation closed", "PO received", "PO checked against quote"] },
  { key: "adv", label: "Advance", team: "Accounts", sla: 7, checks: ["Advance invoice sent with payment link", "Payment received", "Matched in Zoho Books"] },
  { key: "kit", label: "Kit prep and dispatch", team: "Stores", sla: 4, checks: ["Cameras allocated by serial", "SIMs activated", "Burn-in test passed", "Dispatched with challan"] },
  { key: "ins", label: "Installation", team: "Field", sla: 2, checks: ["Kit received on site", "Serials scanned", "Mounted and aligned", "Power and 4G checked", "First image received", "Client team trained"] },
  { key: "live", label: "Live and monitored", team: "Support", sla: 0, checks: ["Monthly billing running", "Uptime above promise", "Monthly report delivered", "PO balance checked"] },
  { key: "cls", label: "Close and return", team: "Field", sla: 7, checks: ["Final film delivered", "Cameras dismantled", "Cameras checked in", "Buy-back settled", "Review asked for"] },
  { key: "rdp", label: "Refurbish and redeploy", team: "Stores", sla: 10, checks: ["Cleaned and tested", "Firmware updated", "Back in stock", "Allocated to next site"] },
];

export const TEAM_LEAD: Record<Team, string> = { Sales: "Rahul Mehra", "Pre-sales": "Pranav Hegde", Accounts: "Sneha Reddy", Stores: "Suresh Patil", Field: "Arjun Rao", Support: "Kiran Varma", Founder: "Founder" };

export type Log = { stage: number; team: Team; who: string; when: string; text: string; kind: "update" | "note" | "blocker" | "approval" | "auto" };
export type Health = "On track" | "At risk" | "Blocked";
export type Project = {
  id: string;
  name: string;
  site?: string;
  client: string;
  office: OfficeId;
  cams: number;
  value: number;
  stage: number;
  inStage: number;
  done: number;
  health: Health;
  next: string;
  gate?: { title: string; detail: string; amount?: number; ap?: string };
  logs: Log[];
};

const L = (stage: number, team: Team, who: string, when: string, text: string, kind: Log["kind"] = "update"): Log => ({ stage, team, who, when, text, kind });

export const PROJECTS: Project[] = [
  {
    id: "P-301", name: "Horizon Mall", client: "Horizon Retail Spaces", office: "pun", cams: 3, value: 1180000, stage: 0, inStage: 0, done: 1, health: "On track", next: "Book the survey for Tuesday",
    logs: [L(0, "Sales", "Sales agent", "Today 08:41", "Enquiry from the website calculator: 3 cameras, 30 months, drone monthly.", "auto"), L(0, "Sales", "Sales agent", "Today 08:43", "First reply sent in 2 minutes with sample time-lapses.", "auto")],
  },
  {
    id: "P-298", name: "Indus Logistics Park", client: "Indus Warehousing", office: "che", cams: 4, value: 1620000, stage: 1, inStage: 3, done: 2, health: "On track", next: "Signal test on the north side tomorrow",
    logs: [L(0, "Sales", "Rahul Mehra", "10 Nov", "Their PMC asked for 4 cameras covering 3 warehouses."), L(1, "Pre-sales", "Karthik Subramanian", "13 Nov", "3 positions fixed on drawings. North warehouse may need solar."), L(1, "Pre-sales", "Karthik Subramanian", "Yesterday", "Power confirmed at 2 of 3 points.")],
  },
  {
    id: "P-296", name: "Coral Bay Towers", client: "Gulf Crest Contracting", office: "dxb", cams: 4, value: 2240000, stage: 2, inStage: 2, done: 3, health: "At risk", next: "Discount decision before Thursday",
    gate: { title: "8% below rate card", detail: "Gulf Crest asks 8% off to match a competitor's quote. Repeat client, 3 live sites, pays in 36 days.", amount: 179200 },
    logs: [L(1, "Pre-sales", "Faisal Ahmed", "8 Nov", "Survey done from drawings and drone photos. 4 positions, all on solar."), L(2, "Sales", "Faisal Ahmed", "12 Nov", "Quote Q-3330 sent: AED 89,600 for 24 months."), L(2, "Sales", "Faisal Ahmed", "Yesterday", "Client says a competitor quoted 8% lower. Asked for the founder's call.", "blocker")],
  },
  {
    id: "P-294", name: "Lakeshore Residences", site: "s14", client: "Lakeshore Developers", office: "hyd", cams: 3, value: 1390000, stage: 2, inStage: 8, done: 4, health: "At risk", next: "Call the MD; quote unanswered 8 days",
    logs: [L(1, "Pre-sales", "Pranav Hegde", "7 Nov", "Survey: 3 positions, one needs solar."), L(2, "Sales", "Sales agent", "8 Nov", "Quote Q-3324 sent.", "auto"), L(2, "Sales", "Sales agent", "Today 08:05", "Follow-up 2 sent. No reply yet.", "auto"), L(2, "Sales", "Rahul Mehra", "Today 10:20", "Their MD is travelling till Monday. Calling him then.", "note")],
  },
  {
    id: "P-290", name: "Metro Line 6 viaduct", client: "Meridian Infra", office: "mum", cams: 8, value: 4560000, stage: 3, inStage: 16, done: 1, health: "Blocked", next: "Founder to sign the vendor-registration declaration",
    gate: { title: "Sign the vendor-registration declaration", detail: "Meridian's procurement needs the ISO 27001 certificate, insurance cover and a declaration signed by a director before the PO." },
    logs: [L(2, "Sales", "Rahul Mehra", "21 Oct", "Quote accepted verbally by the project director."), L(3, "Sales", "Rahul Mehra", "30 Oct", "Vendor registration started on Meridian's portal."), L(3, "Accounts", "Sneha Reddy", "11 Nov", "Insurance certificate and ISO 27001 uploaded."), L(3, "Sales", "Rahul Mehra", "Yesterday", "Portal needs a director's signature on the declaration. Waiting for the founder.", "blocker")],
  },
  {
    id: "P-288", name: "Sunrise Estates Phase 3", site: "s13", client: "Sunrise Estates", office: "ngp", cams: 2, value: 468000, stage: 4, inStage: 9, done: 1, health: "Blocked", next: "Advance unpaid 9 days; install on hold",
    gate: { title: "Install before the advance?", detail: "Client asks to install now and pay the advance with the first monthly invoice. They paid Phase 2 in 28 days.", amount: 120000 },
    logs: [L(3, "Sales", "Rahul Mehra", "6 Nov", "PO-SUN-004 received and checked against the quote."), L(4, "Accounts", "Billing agent", "9 Nov", "Advance invoice INV-11160 sent with a payment link and UPI QR.", "auto"), L(4, "Accounts", "Sneha Reddy", "13 Nov", "Their accounts team says the cheque needs a second signatory.", "note"), L(4, "Accounts", "Collections agent", "Today 09:00", "Reminder 3 sent on WhatsApp.", "auto")],
  },
  {
    id: "P-286", name: "Vantage Two", client: "Vantage Realty", office: "blr", cams: 2, value: 512000, stage: 5, inStage: 2, done: 2, health: "On track", next: "Burn-in test finishes at 18:00",
    logs: [L(4, "Accounts", "Payments agent", "11 Nov", "Advance ₹1,20,000 received by UPI and matched.", "auto"), L(5, "Stores", "Suresh Patil", "13 Nov", "OV-8M-5104 and 5105 allocated from Hyderabad stock."), L(5, "Stores", "Suresh Patil", "Today 09:30", "SIMs activated, burn-in started.")],
  },
  {
    id: "P-284", name: "Skyline Towers B", site: "s1", client: "Skyline Developers", office: "pun", cams: 2, value: 495000, stage: 6, inStage: 0, done: 4, health: "On track", next: "First image, then client training",
    logs: [L(3, "Accounts", "Sneha Reddy", "2 Nov", "PO-SKY-114 received and checked."), L(4, "Accounts", "Payments agent", "4 Nov", "Advance paid in the client app.", "auto"), L(5, "Stores", "Suresh Patil", "10 Nov", "Kit dispatched with challan DC-8821."), L(6, "Field", "Ravi Kumar", "Today 09:12", "On site. Kit received, serials scanned."), L(6, "Field", "Ravi Kumar", "Today 11:05", "Both cameras mounted. Checking 4G.")],
  },
  {
    id: "P-271", name: "Metro Package 4", site: "s5", client: "Meridian Infra", office: "del", cams: 4, value: 1980000, stage: 7, inStage: 168, done: 3, health: "At risk", next: "Camera 3 relocation (crane moved)",
    logs: [L(7, "Support", "Care agent", "Yesterday 10:13", "Client asked to relocate camera 3. WO-2287 opened.", "auto"), L(7, "Field", "Sandeep Chauhan", "Today 09:20", "Reassigned to me. On the way.")],
  },
  {
    id: "P-266", name: "Harbour Line Depot", site: "s4", client: "Meridian Infra", office: "mum", cams: 2, value: 912000, stage: 7, inStage: 690, done: 3, health: "At risk", next: "PO ends 4 Dec: extension request",
    gate: { title: "Send the PO extension request", detail: "PO-MER-207 ends 4 Dec; the project runs 3 months late. Ask Meridian for 6 more months.", ap: "ap3" },
    logs: [L(7, "Accounts", "Billing agent", "Today 08:30", "PO 97% used. Extension request drafted.", "auto"), L(7, "Support", "Uptime agent", "12 Nov", "Battery fading on both solar cameras. Swap booked.", "auto")],
  },
  {
    id: "P-262", name: "Northgate Depot", site: "s8", client: "Northgate Metro EPC", office: "hyd", cams: 3, value: 1240000, stage: 7, inStage: 580, done: 2, health: "At risk", next: "Camera 2 back online; 2 invoices in their vendor portal for 43 days",
    logs: [L(7, "Support", "Uptime agent", "Today 02:16", "OV-8M-4417 offline: SIM data used up.", "auto"), L(7, "Field", "Naveen Goud", "Today 11:02", "Top-up done, rebooting."), L(7, "Accounts", "Sneha Reddy", "Yesterday", "INV-11050 still pending in their vendor portal. Escalated to their AP head.", "blocker")],
  },
  {
    id: "P-259", name: "Meridian Business Park", site: "s3", client: "Meridian Infra", office: "mum", cams: 3, value: 1560000, stage: 7, inStage: 310, done: 4, health: "On track", next: "Quarterly drone flight in December",
    logs: [L(7, "Accounts", "Payments agent", "Today 10:49", "November paid as part of the ₹38.4 lakh transfer.", "auto"), L(7, "Field", "Yusuf Khan", "Today 12:10", "360° walk done, floors 1–6.")],
  },
  {
    id: "P-257", name: "Gulf Crest Tower", site: "s12", client: "Gulf Crest Contracting", office: "dxb", cams: 2, value: 1128000, stage: 7, inStage: 128, done: 4, health: "On track", next: "Monthly 360° walk tomorrow",
    logs: [L(7, "Support", "Delivery agent", "1 Nov", "October progress video delivered.", "auto")],
  },
  {
    id: "P-218", name: "Arcadia Heights", site: "s6", client: "Arcadia Homes", office: "mum", cams: 2, value: 696000, stage: 8, inStage: 15, done: 1, health: "At risk", next: "Dismantle 2 days late; buy-back waits",
    gate: { title: "Approve the buy-back refund", detail: "40% of the camera cost for 2 cameras goes back to Arcadia Homes on check-in.", amount: 96000, ap: "ap1" },
    logs: [L(8, "Support", "Delivery agent", "31 Oct", "Final construction film delivered.", "auto"), L(8, "Field", "Work-order agent", "12 Nov", "WO-2289 dismantle scheduled.", "auto"), L(8, "Field", "Imran Shaikh", "Today 09:40", "Heading to Thane now; was held at the Harbour Line repair.", "note")],
  },
  {
    id: "P-205", name: "Coastal Plaza (closed)", client: "Coastline Infra", office: "kol", cams: 2, value: 552000, stage: 9, inStage: 6, done: 2, health: "On track", next: "Allocate to Indus Logistics Park",
    logs: [L(8, "Field", "Ananya Bose", "4 Nov", "Both cameras checked in at Kolkata."), L(9, "Stores", "Suresh Patil", "9 Nov", "Cleaned, lenses replaced, firmware updated.")],
  },
];
