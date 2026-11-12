// Halden Precision: a fictional manufacturer used as the live demo on /services.
// Everything here is invented and the page says so. The records are written to hang
// together: the same orders, customers, suppliers and machines appear across departments,
// so a founder clicking around sees one company, not a set of unrelated widgets.

export type ViewId =
  | "home"
  | "approvals"
  | "trace"
  | "sales"
  | "service"
  | "orders"
  | "production"
  | "quality"
  | "purchase"
  | "dispatch"
  | "finance"
  | "people"
  | "documents"
  | "agents";

export type Tone = "good" | "warn" | "bad" | "info" | "muted";

export const COMPANY = {
  name: "Halden Precision",
  line: "Machined and pressed components",
  people: "240 people",
  customers: "61 customers",
  defaultCity: "Pune",
};

/** The signed-in owner whose dashboard this is. */
export const OWNER = { name: "Arjun Mehta", first: "Arjun", role: "Managing Director", initials: "AM" };

/** Each team works in its own system; all of them flow into the owner's view. */
export type SyncSource = { id: ViewId; team: string; system: string };
export const SYNC_SOURCES: SyncSource[] = [
  { id: "sales", team: "Sales", system: "Sales CRM" },
  { id: "service", team: "Service", system: "Service desk" },
  { id: "orders", team: "Planning", system: "Planning board" },
  { id: "production", team: "Shop floor", system: "Machine tablets" },
  { id: "quality", team: "Quality", system: "Inspection app" },
  { id: "purchase", team: "Stores", system: "Stores and purchase" },
  { id: "dispatch", team: "Dispatch", system: "Gate and loading" },
  { id: "finance", team: "Accounts", system: "Accounting system" },
  { id: "people", team: "HR", system: "Attendance and hiring" },
];

/** What arrives from each team's system, in the order the sync shows it. */
export const SYNC_EVENTS: { from: number; text: string }[] = [
  { from: 3, text: "Press 3 logged 240 pieces. Output and SO-1182 progress updated." },
  { from: 7, text: "Payment from Apex Motors recorded. Cash and money owed updated." },
  { from: 0, text: "Quote Q-2304 drafted. Pipeline and approvals updated." },
  { from: 4, text: "Lot L-2210-46 passed inspection. Order tracker updated." },
  { from: 1, text: "Ticket T-1093 closed in 40 seconds. Open tickets updated." },
  { from: 5, text: "12 t coil received from Ridge Alloys. Days of stock updated." },
  { from: 6, text: "SH-4422 loaded at gate 2. Shipments and order tracker updated." },
  { from: 2, text: "SO-1190 moved to 20 Nov. Plan and risk updated." },
  { from: 8, text: "Shift B attendance in: 226 present. Staffing updated." },
];

export const NAV: { group: string; items: { id: ViewId; label: string }[] }[] = [
  {
    group: "Company",
    items: [
      { id: "home", label: "Command centre" },
      { id: "trace", label: "Order tracker" },
      { id: "approvals", label: "Approvals" },
    ],
  },
  {
    group: "Departments",
    items: [
      { id: "sales", label: "Sales" },
      { id: "service", label: "Customer service" },
      { id: "orders", label: "Orders and planning" },
      { id: "production", label: "Production" },
      { id: "quality", label: "Quality" },
      { id: "purchase", label: "Purchase and stock" },
      { id: "dispatch", label: "Dispatch" },
      { id: "finance", label: "Finance" },
      { id: "people", label: "People" },
    ],
  },
  {
    group: "System",
    items: [
      { id: "documents", label: "Documents" },
      { id: "agents", label: "Agents and audit" },
    ],
  },
];

export const HEALTH: Partial<Record<ViewId, Tone>> = {
  sales: "good",
  service: "warn",
  orders: "warn",
  production: "bad",
  quality: "warn",
  purchase: "warn",
  dispatch: "good",
  finance: "good",
  people: "good",
};

export type Stat = { label: string; value: string; sub?: string; tone?: Tone; go?: ViewId };
export type Impact = { label: string; before: string; now: string };

// ---------------------------------------------------------------- Command centre

export const HOME_KPIS: Stat[] = [
  { label: "Revenue, month to date", value: "$1.38M", sub: "of $3.20M · on pace for $3.42M", tone: "good", go: "finance" },
  { label: "Order book", value: "$9.8M", sub: "3.1 months of work", go: "orders" },
  { label: "Cash in bank", value: "$1.36M", sub: "Lowest in 13 weeks: $0.94M, week 3", go: "finance" },
  { label: "Owed to you", value: "$4.12M", sub: "$0.38M overdue (9%)", tone: "warn", go: "finance" },
  { label: "On time in full", value: "96.4%", sub: "Target 95% · last 30 days", tone: "good", go: "dispatch" },
  { label: "OEE, both plants", value: "78%", sub: "Press 2 down 3 h today", tone: "warn", go: "production" },
  { label: "Weighted pipeline", value: "$2.9M", sub: "$6.7M open across 42 deals", go: "sales" },
  { label: "Open tickets", value: "23", sub: "2 close to their deadline", tone: "warn", go: "service" },
];

/** Cumulative revenue, $K, days 1–12 actual, and the straight-line target for 30 days. */
export const REVENUE_DAYS = [96, 214, 318, 402, 515, 611, 702, 841, 958, 1083, 1229, 1380];
export const REVENUE_TARGET = 3200;

export type Alert = { level: "high" | "medium" | "low"; text: string; dept: ViewId; owner: string; state: string; time: string };
export const ALERTS: Alert[] = [
  { level: "high", text: "Press 2 hydraulic fault. 3 h lost. Orders SO-1182 and SO-1190 now at risk for Friday.", dept: "production", owner: "Maintenance head", state: "Repair under way", time: "08:52" },
  { level: "high", text: "Apex Motors: burrs on BRK-2210. 120 pieces held at their line.", dept: "quality", owner: "Quality head", state: "8D at D3, containment done", time: "07:40" },
  { level: "medium", text: "Coastal Steel delivery 2 days late. Steel cover falls to 4 days by Tuesday.", dept: "purchase", owner: "Purchase head", state: "Second supplier quoted", time: "09:05" },
  { level: "medium", text: "Kiran Motors paid $18,400 short. Traced to a disputed rejection of 400 flanges.", dept: "finance", owner: "Finance head", state: "Claim drafted, needs approval", time: "09:36" },
  { level: "low", text: "Quote Q-2291 for Talon Trucks ($240K a year) expires Friday with no reply.", dept: "sales", owner: "Sales head", state: "Second follow-up sent", time: "09:12" },
];

export const DEPT_TILES: { id: ViewId; label: string; line: string; figure: string }[] = [
  { id: "sales", label: "Sales", figure: "$412K won", line: "11 orders this month · reply time 4 min" },
  { id: "service", label: "Customer service", figure: "23 open", line: "81% answered by the agent · 2 near deadline" },
  { id: "orders", label: "Orders and planning", figure: "64 open", line: "14 due this week · 3 at risk" },
  { id: "production", label: "Production", figure: "OEE 78%", line: "9 of 12 machines running · Press 2 down" },
  { id: "quality", label: "Quality", figure: "412 PPM", line: "2 customer 8Ds open · 6 NCRs" },
  { id: "purchase", label: "Purchase and stock", figure: "3 low", line: "Steel coil 4 days · 2 deliveries late" },
  { id: "dispatch", label: "Dispatch", figure: "9 today", line: "6 ready · all documents complete" },
  { id: "finance", label: "Finance", figure: "34 days", line: "to get paid · $0.38M overdue" },
  { id: "people", label: "People", figure: "94% in", line: "226 of 240 present · 4 roles open" },
];

/** 8-week cash view, $K: money in, money out. */
export const CASH_WEEKS = [
  { wk: "W1", in: 690, out: 610 },
  { wk: "W2", in: 540, out: 720 },
  { wk: "W3", in: 480, out: 760 },
  { wk: "W4", in: 820, out: 640 },
  { wk: "W5", in: 760, out: 700 },
  { wk: "W6", in: 640, out: 610 },
  { wk: "W7", in: 880, out: 690 },
  { wk: "W8", in: 720, out: 650 },
];

// ---------------------------------------------------------------- Approvals

export type Approval = { id: string; dept: ViewId; title: string; ask: string; facts: string[]; rule: string; result: string; who: string };
export const APPROVALS: Approval[] = [
  {
    id: "price",
    dept: "sales",
    title: "Price for Apex Motors: 5,000 BRK-2210 brackets",
    ask: "Steel is up 4% since their last order. $7.42 a piece keeps your margin at 18%.",
    facts: ["Last 3 orders delivered on time", "They pay in 31 days on average", "A competing quote is due Friday"],
    rule: "Prices under 20% margin need the MD",
    result: "Quote Q-2304 sent to Apex Motors at 09:31. Follow-up booked for Thursday.",
    who: "Sales agent",
  },
  {
    id: "po",
    dept: "purchase",
    title: "Purchase order PO-7741: 12 t steel coil, $21,600",
    ask: "Stock runs out on Tuesday for 3 confirmed orders. Coastal Steel is 2 days late, so this goes to Ridge Alloys.",
    facts: ["Ridge Alloys on time 96% this year", "Price 2% under last month", "Arrives 16 Nov, before the shortage"],
    rule: "Purchase orders over $20,000 need the MD",
    result: "PO-7741 sent to Ridge Alloys. Delivery tracked for 16 Nov.",
    who: "Purchase agent",
  },
  {
    id: "claim",
    dept: "finance",
    title: "Claim $18,400 back from Kiran Motors",
    ask: "They deducted 400 FLG-77 flanges as rejected. On recheck, Quality accepted all 400.",
    facts: ["Recheck report QR-0912 attached", "Same customer, same issue in June", "Their own GRN shows full receipt"],
    rule: "Disputes over $10,000 need the finance head",
    result: "Claim sent to Kiran Motors with QR-0912. Reply tracked.",
    who: "Finance agent",
  },
  {
    id: "ot",
    dept: "production",
    title: "Saturday shift on Press 3 to recover SO-1182",
    ask: "Press 2 lost 3 hours. A 6-hour Saturday shift on Press 3 keeps Friday's delivery to Apex Motors.",
    facts: ["4 certified operators available", "Overtime cost $1,380", "Late delivery penalty would be $6,200"],
    rule: "Overtime over 20 hours a week needs the plant head",
    result: "Saturday shift booked. Operators told. Plan updated.",
    who: "Planning agent",
  },
];

// ---------------------------------------------------------------- Live agent work

export type TraceStep = { label: "Noticed" | "Checked" | "Did" | "Flagged" | "Asked" | "Result"; text: string };
export type Activity = { id: string; dept: ViewId; agent: string; text: string; kind: "done" | "flag" | "ask"; trace: TraceStep[] };

export const ACTIVITY: Activity[] = [
  { id: "a1", dept: "finance", agent: "Finance agent", kind: "done", text: "Payment of $86,200 from Apex Motors matched to 3 invoices", trace: [
    { label: "Noticed", text: "Bank credit of $86,200 from Apex Motors at 09:40." },
    { label: "Checked", text: "Open invoices INV-5521, 5530, 5544, their remittance note and credit notes." },
    { label: "Did", text: "Matched the payment to all three invoices and closed them in the ledger." },
    { label: "Result", text: "Apex Motors has nothing overdue. Reminder schedule stopped." },
  ] },
  { id: "a2", dept: "sales", agent: "Sales agent", kind: "done", text: "RFQ from Orion Hydraulics answered in 3 minutes", trace: [
    { label: "Noticed", text: "Email RFQ: 2,000 HSG-118 pump housings a year, drawing rev B attached." },
    { label: "Checked", text: "The drawing, 2 similar parts made before, capacity on VMC-02 for the next 6 weeks." },
    { label: "Did", text: "Replied with 3 technical questions and promised a quote by 15:00 today." },
    { label: "Result", text: "Deal D-318 opened at Technical review. Estimator asked for cycle time." },
  ] },
  { id: "a3", dept: "production", agent: "Planning agent", kind: "flag", text: "SO-1182 at risk after Press 2 fault. Recovery plan ready", trace: [
    { label: "Noticed", text: "Press 2 stopped at 06:10 with a hydraulic fault. 3 h lost so far." },
    { label: "Checked", text: "Jobs on Press 2 this week, free hours on Press 3, certified operators." },
    { label: "Flagged", text: "SO-1182 (Apex Motors, due Fri) and SO-1190 (Norda Electric, due Mon) at risk." },
    { label: "Asked", text: "A Saturday shift on Press 3 recovers both. Sent to the plant head to approve." },
  ] },
  { id: "a4", dept: "service", agent: "Service agent", kind: "done", text: "“Where is my order?” answered for Vega Systems", trace: [
    { label: "Noticed", text: "WhatsApp from Vega Systems buyer: “Has SO-1176 left yet?”" },
    { label: "Checked", text: "Dispatch record SH-4410 and the transporter's tracking." },
    { label: "Did", text: "Replied: left yesterday 16:30, arrives Friday 10:00, with the tracking link." },
    { label: "Result", text: "Ticket T-1093 closed in 40 seconds. No call to your team." },
  ] },
  { id: "a5", dept: "purchase", agent: "Purchase agent", kind: "ask", text: "PO-7741 for 12 t steel coil drafted for approval", trace: [
    { label: "Noticed", text: "Steel coil cover falls to 4 days on Tuesday. Coastal Steel delivery is 2 days late." },
    { label: "Checked", text: "Prices and on-time records of Ridge Alloys, Coastal Steel and Prime Metals." },
    { label: "Did", text: "Drafted PO-7741 with Ridge Alloys: 12 t at $1,800 a tonne, arriving 16 Nov." },
    { label: "Asked", text: "Over $20,000, so it waits for the MD." },
  ] },
  { id: "a6", dept: "finance", agent: "Finance agent", kind: "flag", text: "Short payment from Kiran Motors traced to a disputed rejection", trace: [
    { label: "Noticed", text: "Kiran Motors paid $18,400 less than invoiced on INV-5498." },
    { label: "Checked", text: "Their debit note DN-221, your recheck report QR-0912, their GRN." },
    { label: "Flagged", text: "400 flanges deducted as rejected. All 400 accepted on recheck." },
    { label: "Asked", text: "Claim drafted. Over $10,000, so it waits for the finance head." },
  ] },
  { id: "a7", dept: "quality", agent: "Quality agent", kind: "flag", text: "8D for Apex Motors burrs: containment done, root cause next", trace: [
    { label: "Noticed", text: "Complaint T-1088: burrs on BRK-2210, 120 pieces held at Apex Motors." },
    { label: "Checked", text: "Lot L-2210-44 records, deburring step sign-offs, tool life on CNC-03." },
    { label: "Did", text: "Opened 8D-031, held 2,400 pieces in stock, arranged sorting at the customer." },
    { label: "Result", text: "Containment confirmed by Apex Motors at 07:40. Root cause analysis due Sat." },
  ] },
  { id: "a8", dept: "orders", agent: "Order agent", kind: "done", text: "PO from Norda Electric read and entered as SO-1203", trace: [
    { label: "Noticed", text: "Purchase order NE-77812 arrived by email as a PDF." },
    { label: "Checked", text: "Part, price, quantity and date against accepted quote Q-2287." },
    { label: "Did", text: "Entered SO-1203 once, reserved material, confirmed to the customer." },
    { label: "Result", text: "Planned on CNC-05 from 16 Nov. Due 4 Dec." },
  ] },
  { id: "a9", dept: "dispatch", agent: "Dispatch agent", kind: "done", text: "Documents for 6 shipments ready before trucks arrived", trace: [
    { label: "Noticed", text: "6 shipments planned for 14:00 loading." },
    { label: "Checked", text: "Final inspection results, packing counts, customer document rules." },
    { label: "Did", text: "Prepared invoices, packing lists and test certificates for all 6." },
    { label: "Result", text: "Customers emailed their documents and arrival times." },
  ] },
  { id: "a10", dept: "people", agent: "People agent", kind: "done", text: "9 of 120 CNC setter applicants shortlisted", trace: [
    { label: "Noticed", text: "120 applications for CNC setter, plant 2." },
    { label: "Checked", text: "Each one against your must-haves: Fanuc controls, 3 years, shifts, distance." },
    { label: "Did", text: "Sent a 10-minute test to the 9 who fit. Offered interview slots." },
    { label: "Result", text: "4 interviews booked with the production head next week." },
  ] },
  { id: "a11", dept: "sales", agent: "Sales agent", kind: "done", text: "Follow-ups sent on 14 open quotes", trace: [
    { label: "Noticed", text: "14 quotes older than 5 days with no reply." },
    { label: "Checked", text: "Each buyer's history and the last conversation." },
    { label: "Did", text: "Sent a short, personal follow-up to each, signed by the account owner." },
    { label: "Result", text: "3 replied this morning. Q-2279 from Meridian Agri confirmed." },
  ] },
  { id: "a12", dept: "documents", agent: "Document agent", kind: "done", text: "Supplier invoice matched to PO and goods receipt", trace: [
    { label: "Noticed", text: "Invoice UF-90321 from Unison Fasteners, $4,860." },
    { label: "Checked", text: "PO-7712 and goods receipt GRN-3310: quantities and prices." },
    { label: "Did", text: "Three-way match passed. Booked for payment on 20 Nov." },
    { label: "Result", text: "No one in accounts touched it." },
  ] },
];

// ---------------------------------------------------------------- Sales

export const SALES_STATS: Stat[] = [
  { label: "Open pipeline", value: "$6.7M", sub: "42 deals, annual value" },
  { label: "Weighted", value: "$2.9M", sub: "by stage probability" },
  { label: "Won this month", value: "$412K", sub: "11 orders", tone: "good" },
  { label: "Win rate, 90 days", value: "34%", sub: "was 24%", tone: "good" },
  { label: "Quote turnaround", value: "6.5 h", sub: "RFQ to quote sent" },
  { label: "Enquiry reply", value: "4 min", sub: "average, any hour", tone: "good" },
];

export type Deal = { id: string; customer: string; title: string; value: string; prob: number; next: string; owner: string; age: string; agent?: string };
export const PIPELINE: { stage: string; total: string; deals: Deal[] }[] = [
  {
    stage: "RFQ received",
    total: "8 · $1.2M",
    deals: [
      { id: "D-318", customer: "Orion Hydraulics", title: "HSG-118 pump housing, 2,000/yr", value: "$184K", prob: 10, next: "Quote by 15:00 today", owner: "R. Shah", age: "1 h", agent: "Answered in 3 min" },
      { id: "D-316", customer: "Kestrel Rail", title: "Bogie brackets, 6 parts", value: "$420K", prob: 10, next: "Drawings requested", owner: "A. Iyer", age: "2 d" },
    ],
  },
  {
    stage: "Technical review",
    total: "6 · $0.9M",
    deals: [
      { id: "D-311", customer: "Brightline HVAC", title: "CVR-310 motor cover, deep draw", value: "$156K", prob: 30, next: "Tool feasibility Fri", owner: "R. Shah", age: "4 d" },
      { id: "D-309", customer: "Meridian Agri", title: "SFT-450 drive shaft, induction hardened", value: "$310K", prob: 30, next: "Heat treat quote due", owner: "A. Iyer", age: "6 d", agent: "Supplier quote chased" },
    ],
  },
  {
    stage: "Quote sent",
    total: "12 · $2.1M",
    deals: [
      { id: "D-302", customer: "Talon Trucks", title: "Q-2291 · 4 brackets, annual", value: "$240K", prob: 50, next: "Expires Fri", owner: "R. Shah", age: "9 d", agent: "2nd follow-up sent" },
      { id: "D-304", customer: "Apex Motors", title: "Q-2304 · BRK-2210 repeat, 5,000", value: "$37K", prob: 70, next: "Needs your price approval", owner: "A. Iyer", age: "Today", agent: "Drafted from rates" },
      { id: "D-299", customer: "Norda Electric", title: "Q-2283 · terminal plates", value: "$128K", prob: 50, next: "Call Mon", owner: "M. Costa", age: "12 d" },
    ],
  },
  {
    stage: "Negotiation",
    total: "9 · $1.8M",
    deals: [
      { id: "D-288", customer: "Vega Systems", title: "Annual contract, 11 parts", value: "$680K", prob: 75, next: "Payment terms: 45 vs 60 days", owner: "M. Costa", age: "3 wk" },
      { id: "D-293", customer: "Kiran Motors", title: "FLG-77 price review", value: "$210K", prob: 60, next: "Revised quote rev 3", owner: "A. Iyer", age: "2 wk" },
    ],
  },
  {
    stage: "Won this month",
    total: "11 · $412K",
    deals: [
      { id: "D-281", customer: "Meridian Agri", title: "Q-2279 · PIN-09 pivot pins", value: "$64K", prob: 100, next: "SO-1205 created", owner: "A. Iyer", age: "Today", agent: "Order entered" },
      { id: "D-277", customer: "Norda Electric", title: "Q-2287 · housings", value: "$92K", prob: 100, next: "SO-1203 created", owner: "M. Costa", age: "Today", agent: "Order entered" },
    ],
  },
];

export const ENQUIRIES = [
  { time: "09:38", from: "Orion Hydraulics · P. Novak", channel: "Email", ask: "2,000 HSG-118 housings a year, drawing rev B", value: "$184K", reply: "3 min", status: "Qualified" },
  { time: "08:15", from: "Brightline HVAC · S. Lee", channel: "Website", ask: "Deep-drawn cover, 30,000 a year", value: "$156K", reply: "2 min", status: "Technical review" },
  { time: "Yesterday 22:41", from: "Delmar Pumps · J. Ortiz", channel: "Email", ask: "Price for 300 shafts, one-off", value: "$9K", reply: "4 min", status: "Quote sent" },
  { time: "Yesterday 16:02", from: "Kestrel Rail · H. Berg", channel: "Phone", ask: "Bogie brackets, needs PPAP level 3", value: "$420K", reply: "Call logged", status: "Drawings requested" },
  { time: "Yesterday 11:20", from: "Atlas Garden Tools", channel: "Website", ask: "Plastic handles", value: "—", reply: "5 min", status: "Not a fit, referred" },
  { time: "10 Nov", from: "Sparrow Bikes · distributor", channel: "Distributor", ask: "Crank pins, 50,000", value: "$71K", reply: "6 min", status: "Quote sent" },
];

export const QUOTES = [
  { no: "Q-2304", customer: "Apex Motors", part: "BRK-2210 × 5,000", value: "$37,100", margin: "18.0%", valid: "26 Nov", follow: "—", status: "Awaiting your approval" },
  { no: "Q-2291", customer: "Talon Trucks", part: "4 brackets, annual", value: "$240,000", margin: "23.5%", valid: "13 Nov", follow: "2 sent", status: "Viewed twice" },
  { no: "Q-2287", customer: "Norda Electric", part: "Housings × 12,000", value: "$92,400", margin: "26.1%", valid: "—", follow: "1 sent", status: "Won" },
  { no: "Q-2283", customer: "Norda Electric", part: "Terminal plates", value: "$128,000", margin: "24.8%", valid: "20 Nov", follow: "1 sent", status: "Sent" },
  { no: "Q-2281", customer: "Kiran Motors", part: "FLG-77 rev 3", value: "$210,000", margin: "19.2%", valid: "18 Nov", follow: "—", status: "Revised" },
  { no: "Q-2279", customer: "Meridian Agri", part: "PIN-09 × 40,000", value: "$64,000", margin: "29.4%", valid: "—", follow: "1 sent", status: "Won" },
  { no: "Q-2270", customer: "Delmar Pumps", part: "Shafts × 300", value: "$9,300", margin: "31.0%", valid: "—", follow: "3 sent", status: "Lost: price" },
];

export const CUSTOMERS = [
  { name: "Apex Motors", segment: "Automotive · Tier 1", ytd: "$4.82M", open: "9 orders", pays: "31 days", otif: "97%", health: "Growing" },
  { name: "Vega Systems", segment: "Industrial", ytd: "$3.10M", open: "7 orders", pays: "44 days", otif: "95%", health: "Contract in negotiation" },
  { name: "Kiran Motors", segment: "Automotive · OEM", ytd: "$2.64M", open: "6 orders", pays: "58 days", otif: "93%", health: "Pays late, disputes" },
  { name: "Norda Electric", segment: "Electrical", ytd: "$1.95M", open: "5 orders", pays: "36 days", otif: "98%", health: "Growing" },
  { name: "Meridian Agri", segment: "Agricultural", ytd: "$1.40M", open: "4 orders", pays: "29 days", otif: "99%", health: "Stable" },
  { name: "Talon Trucks", segment: "Commercial vehicles", ytd: "$0.88M", open: "2 orders", pays: "47 days", otif: "94%", health: "Quiet for 6 weeks" },
];

export const SALES_IMPACT: Impact[] = [
  { label: "Enquiry reply", before: "26 h", now: "4 min" },
  { label: "RFQ to quote", before: "6 days", now: "6.5 h" },
  { label: "Quotes followed up", before: "35%", now: "100%" },
  { label: "Win rate", before: "24%", now: "34%" },
];

// ---------------------------------------------------------------- Customer service

export const SERVICE_STATS: Stat[] = [
  { label: "Open tickets", value: "23", sub: "7 complaints · 16 requests" },
  { label: "Close to deadline", value: "2", sub: "escalated to owners", tone: "warn" },
  { label: "First response", value: "38 s", sub: "average, all channels", tone: "good" },
  { label: "Time to resolve", value: "1.6 days", sub: "complaints: 3.2 days" },
  { label: "Satisfaction", value: "4.7 / 5", sub: "96% positive, 30 days", tone: "good" },
  { label: "Solved by the agent", value: "81%", sub: "the rest go to people" },
];

export type Ticket = {
  id: string;
  customer: string;
  subject: string;
  type: "Complaint" | "Order status" | "Documents" | "Return" | "Change request";
  pri: "P1" | "P2" | "P3";
  channel: string;
  sla: string;
  slaTone: Tone;
  status: string;
  owner: string;
  thread: { who: string; text: string; time: string }[];
  link?: string;
};

export const TICKETS: Ticket[] = [
  {
    id: "T-1088", customer: "Apex Motors", subject: "Burrs on BRK-2210, 120 pcs held at line", type: "Complaint", pri: "P1", channel: "Email", sla: "Containment met", slaTone: "good", status: "8D at D3", owner: "Quality head", link: "8D-031 · lot L-2210-44",
    thread: [
      { who: "Apex Motors · quality", text: "We found burrs on 120 brackets from lot L-2210-44. Line is using sorted stock. Need containment today.", time: "Wed 17:10" },
      { who: "Service agent", text: "Logged as P1. Lot traced to CNC-03, 10 Nov. Quality head and plant head told. Sorting team can reach you by 07:00.", time: "Wed 17:11" },
      { who: "Quality head", text: "Approved: 2,400 pcs on hold here, sorting at Apex tomorrow 07:00, 8D opened.", time: "Wed 17:40" },
      { who: "Apex Motors · quality", text: "Sorting confirmed. Thanks for the fast response.", time: "Thu 07:40" },
    ],
  },
  {
    id: "T-1093", customer: "Vega Systems", subject: "Has SO-1176 left yet?", type: "Order status", pri: "P3", channel: "WhatsApp", sla: "Solved in 40 s", slaTone: "good", status: "Resolved", owner: "Service agent", link: "SO-1176 · SH-4410",
    thread: [
      { who: "Vega Systems · buyer", text: "Has SO-1176 left yet?", time: "09:38" },
      { who: "Service agent", text: "Yes. It left yesterday at 16:30 on shipment SH-4410 and arrives Friday around 10:00. Tracking link attached.", time: "09:38" },
      { who: "Vega Systems · buyer", text: "Perfect, thank you.", time: "09:39" },
    ],
  },
  {
    id: "T-1091", customer: "Kiran Motors", subject: "Need test certificates for lot L-77-19", type: "Documents", pri: "P2", channel: "Portal", sla: "2 h left", slaTone: "good", status: "Agent replied", owner: "Service agent", link: "SH-4398",
    thread: [
      { who: "Kiran Motors · stores", text: "Material test certificates missing for lot L-77-19. Cannot release to line.", time: "09:02" },
      { who: "Service agent", text: "Attached: mill certificate MTC-5521 and our final inspection report FI-3381 for L-77-19.", time: "09:03" },
    ],
  },
  {
    id: "T-1090", customer: "Norda Electric", subject: "Move SO-1190 delivery to 20 Nov", type: "Change request", pri: "P2", channel: "Email", sla: "40 min left", slaTone: "warn", status: "With planning", owner: "Planning head", link: "SO-1190",
    thread: [
      { who: "Norda Electric · planner", text: "Can we take SO-1190 on 20 Nov instead of 16 Nov? Our line is delayed.", time: "08:20" },
      { who: "Service agent", text: "Checked: moving it frees Press 2 time we need after today's fault. Recommended yes. Sent to planning to confirm.", time: "08:21" },
    ],
  },
  {
    id: "T-1086", customer: "Meridian Agri", subject: "Wrong label on 2 boxes, PIN-09", type: "Complaint", pri: "P2", channel: "Email", sla: "Waiting on customer", slaTone: "muted", status: "Replacement labels sent", owner: "Service agent", link: "SH-4385",
    thread: [
      { who: "Meridian Agri · stores", text: "2 boxes of PIN-09 have last month's labels.", time: "Tue 14:12" },
      { who: "Service agent", text: "Sorry about that. Correct labels sent by courier, arriving Wed. Packing check added for your parts.", time: "Tue 14:14" },
    ],
  },
  {
    id: "T-1084", customer: "Talon Trucks", subject: "Return 60 brackets: wrong hole position", type: "Return", pri: "P1", channel: "Phone", sla: "Overdue 3 h", slaTone: "bad", status: "Waiting for quality", owner: "Quality head", link: "8D-030 · SH-4371",
    thread: [
      { who: "Talon Trucks · quality", text: "60 brackets with hole position out of tolerance. Returning them.", time: "Tue 11:05" },
      { who: "Service agent", text: "Return authorised RMA-118. Pickup booked Wed. Escalated to quality head: drawing revision mismatch suspected.", time: "Tue 11:07" },
    ],
  },
  {
    id: "T-1082", customer: "Apex Motors", subject: "Copy of invoice INV-5530", type: "Documents", pri: "P3", channel: "Email", sla: "Solved in 1 min", slaTone: "good", status: "Resolved", owner: "Service agent",
    thread: [
      { who: "Apex Motors · accounts", text: "Please resend INV-5530.", time: "Mon 10:00" },
      { who: "Service agent", text: "Attached. It was paid today with INV-5521 and 5544.", time: "Mon 10:01" },
    ],
  },
];

export const SERVICE_IMPACT: Impact[] = [
  { label: "First response", before: "5 h", now: "38 s" },
  { label: "Status calls a day", before: "60", now: "4" },
  { label: "Complaints closed in 3 days", before: "48%", now: "92%" },
];

// ---------------------------------------------------------------- Orders and planning

export const ORDER_STATS: Stat[] = [
  { label: "Open orders", value: "64", sub: "$5.2M" },
  { label: "Due this week", value: "14", sub: "11 ready or on track" },
  { label: "At risk", value: "3", sub: "owners told with a plan", tone: "warn" },
  { label: "Late", value: "1", sub: "SO-1171, customer agreed", tone: "bad" },
  { label: "Load, next 2 weeks", value: "91%", sub: "of available hours" },
  { label: "Dates kept", value: "96%", sub: "last 30 days", tone: "good" },
];

/** Every order is tracked from confirmation to the money in the bank. */
export const STAGES = ["Order", "Material", "Production", "Quality", "Dispatched", "Delivered", "Invoiced", "Paid"] as const;

/** How many open orders sit at each stage right now, with their value. */
export const STAGE_COUNTS = [
  { n: 6, value: "$0.42M" },
  { n: 9, value: "$0.61M" },
  { n: 22, value: "$1.94M" },
  { n: 5, value: "$0.27M" },
  { n: 14, value: "$0.88M" },
  { n: 8, value: "$0.39M" },
  { n: 31, value: "$2.31M" },
  { n: 18, value: "$1.12M paid this month" },
];

export type Risk = "On track" | "At risk" | "Late" | "Done";
export type Order = {
  so: string;
  customer: string;
  part: string;
  qty: string;
  value: string;
  due: string;
  stage: number; // index into STAGES: where it is right now
  since: string; // time in the current stage
  next: string; // what happens next, and when
  owner: string;
  risk: Risk;
  why?: string;
  money: string; // invoiced / paid state in words
  history: { stage: number; when: string; by: string; text: string }[];
};

export const ORDERS: Order[] = [
  {
    so: "SO-1182", customer: "Apex Motors", part: "BRK-2210 bracket", qty: "8,000", value: "$59,400", due: "Fri 13 Nov", stage: 2, since: "5 days", next: "Saturday shift on Press 3, if approved", owner: "Plant head", risk: "At risk", why: "Press 2 hydraulic fault, 3 h lost", money: "Not invoiced",
    history: [
      { stage: 0, when: "28 Oct", by: "Order agent", text: "PO AM-55120 read and entered. Confirmed to Apex in 4 min." },
      { stage: 1, when: "29 Oct", by: "Purchase agent", text: "Steel 2.5 mm reserved: 6.2 t from stock." },
      { stage: 2, when: "7 Nov", by: "Production agent", text: "Started on Press 2. 5,760 of 8,000 made. Press 2 down since 06:10 today." },
    ],
  },
  {
    so: "SO-1190", customer: "Norda Electric", part: "Terminal plate TP-40", qty: "20,000", value: "$31,000", due: "Mon 16 Nov", stage: 1, since: "3 days", next: "Customer asked to move to 20 Nov. Planning to confirm", owner: "Planning head", risk: "At risk", why: "Needs Press 2 time", money: "Not invoiced",
    history: [
      { stage: 0, when: "2 Nov", by: "Order agent", text: "Entered from email PO NE-77790." },
      { stage: 1, when: "9 Nov", by: "Purchase agent", text: "Copper strip arrived and passed incoming inspection." },
    ],
  },
  {
    so: "SO-1188", customer: "Vega Systems", part: "SFT-450 shaft", qty: "900", value: "$38,700", due: "Thu 19 Nov", stage: 2, since: "2 days", next: "Heat treatment at Delta Thermal, Mon", owner: "Production head", risk: "At risk", why: "First heat-treat slot cancelled. Second supplier booked", money: "Not invoiced",
    history: [
      { stage: 0, when: "30 Oct", by: "Order agent", text: "Entered and confirmed." },
      { stage: 1, when: "4 Nov", by: "Purchase agent", text: "Bar stock received, certificate matched." },
      { stage: 2, when: "10 Nov", by: "Production agent", text: "Turning done on CNC-01. Waiting for heat treatment." },
    ],
  },
  {
    so: "SO-1185", customer: "Kiran Motors", part: "FLG-77 flange", qty: "6,000", value: "$27,600", due: "Tue 17 Nov", stage: 3, since: "6 h", next: "Final inspection, then ships today 14:00", owner: "Quality engineer", risk: "On track", money: "Invoice drafted, goes with the truck",
    history: [
      { stage: 0, when: "26 Oct", by: "Order agent", text: "Entered and confirmed." },
      { stage: 1, when: "27 Oct", by: "Purchase agent", text: "Steel 4.0 mm reserved." },
      { stage: 2, when: "5–11 Nov", by: "Production agent", text: "Pressed on Press 1, painted. 6,040 made, 40 scrapped." },
      { stage: 3, when: "Today 03:40", by: "Quality agent", text: "In-process checks passed. Final inspection booked." },
    ],
  },
  {
    so: "SO-1176", customer: "Vega Systems", part: "HSG-118 housing", qty: "1,200", value: "$44,400", due: "Fri 13 Nov", stage: 4, since: "1 day", next: "Arrives Fri 10:00. Customer told", owner: "Dispatch agent", risk: "On track", money: "Invoiced INV-5551 · due 11 Dec",
    history: [
      { stage: 0, when: "8 Oct", by: "Order agent", text: "Entered from email in 4 min." },
      { stage: 1, when: "8 Oct", by: "Purchase agent", text: "900 castings from stock, 300 ordered." },
      { stage: 2, when: "2–11 Nov", by: "Production agent", text: "Machined on VMC-02 over 8 shifts." },
      { stage: 3, when: "11 Nov", by: "Quality engineer", text: "CMM final inspection passed." },
      { stage: 4, when: "11 Nov 16:30", by: "Dispatch agent", text: "Shipped on SH-4410 with all documents." },
    ],
  },
  {
    so: "SO-1171", customer: "Talon Trucks", part: "Bracket TB-12", qty: "2,400", value: "$21,100", due: "Was 10 Nov", stage: 3, since: "1 day", next: "Rework inspection, ships Sat", owner: "Quality head", risk: "Late", why: "Rework after RMA-118. New date 14 Nov agreed with Talon", money: "Not invoiced",
    history: [
      { stage: 0, when: "20 Oct", by: "Order agent", text: "Entered and confirmed." },
      { stage: 2, when: "1–6 Nov", by: "Production agent", text: "Made on weld cell." },
      { stage: 3, when: "10 Nov", by: "Quality head", text: "Hole position issue found after Talon's return. Drawing rev D applied, rework under way." },
    ],
  },
  {
    so: "SO-1158", customer: "Kiran Motors", part: "FLG-77 flange", qty: "8,000", value: "$36,800", due: "Delivered 11 Nov", stage: 6, since: "1 day", next: "Payment due 10 Dec. Reminder at day 30", owner: "Finance agent", risk: "On track", money: "Invoiced INV-5544 · not yet due",
    history: [
      { stage: 4, when: "10 Nov", by: "Dispatch agent", text: "Shipped SH-4398." },
      { stage: 5, when: "11 Nov", by: "Dispatch agent", text: "Proof of delivery received and filed." },
      { stage: 6, when: "10 Nov", by: "Finance agent", text: "Invoiced on dispatch day." },
    ],
  },
  {
    so: "SO-1149", customer: "Talon Trucks", part: "Bracket TB-08", qty: "3,000", value: "$22,400", due: "Delivered 9 Oct", stage: 6, since: "34 days", next: "3 days overdue. Call with their accounts Mon", owner: "Finance head", risk: "Late", why: "Payment overdue", money: "Invoiced INV-5471 · overdue $22,400",
    history: [
      { stage: 5, when: "9 Oct", by: "Dispatch agent", text: "Delivered, POD received." },
      { stage: 6, when: "9 Oct", by: "Finance agent", text: "Invoiced. Reminders sent day 25 and day 32." },
    ],
  },
  {
    so: "SO-1141", customer: "Apex Motors", part: "BRK-2210 bracket", qty: "10,000", value: "$74,200", due: "Delivered 6 Oct", stage: 7, since: "Today", next: "Closed", owner: "Finance agent", risk: "Done", money: "Paid in full today · 31 days",
    history: [
      { stage: 5, when: "6 Oct", by: "Dispatch agent", text: "Delivered." },
      { stage: 6, when: "6 Oct", by: "Finance agent", text: "Invoiced INV-5521." },
      { stage: 7, when: "Today 09:41", by: "Finance agent", text: "$86,200 received and matched to 3 invoices including this one." },
    ],
  },
  {
    so: "SO-1203", customer: "Norda Electric", part: "Housing NH-6", qty: "12,000", value: "$92,400", due: "Fri 4 Dec", stage: 0, since: "Today", next: "Material check, then plan on VMC-02 from 16 Nov", owner: "Order agent", risk: "On track", money: "Not invoiced",
    history: [{ stage: 0, when: "Today 09:34", by: "Order agent", text: "PO NE-77812 read from email, matched to Q-2287, entered and confirmed." }],
  },
];

/** Capacity plan: machine rows, 7 day columns. Each block: start day, length in days, label, kind. */
export const PLAN_DAYS = ["Thu 12", "Fri 13", "Sat 14", "Sun 15", "Mon 16", "Tue 17", "Wed 18"];
export const PLAN: { machine: string; blocks: { start: number; len: number; label: string; kind: "job" | "risk" | "down" | "ot" }[] }[] = [
  { machine: "Press 1 · 250 t", blocks: [{ start: 0, len: 3, label: "SO-1185 FLG-77", kind: "job" }, { start: 4, len: 3, label: "SO-1203 NH-6", kind: "job" }] },
  { machine: "Press 2 · 400 t", blocks: [{ start: 0, len: 1, label: "Hydraulic fault", kind: "down" }, { start: 1, len: 2, label: "SO-1182 BRK-2210", kind: "risk" }, { start: 4, len: 3, label: "SO-1190 TP-40", kind: "job" }] },
  { machine: "Press 3 · 250 t", blocks: [{ start: 0, len: 2, label: "SO-1171 rework", kind: "job" }, { start: 2, len: 1, label: "Sat shift SO-1182", kind: "ot" }, { start: 4, len: 3, label: "SO-1205 PIN-09", kind: "job" }] },
  { machine: "CNC-03", blocks: [{ start: 0, len: 2, label: "SO-1182 deburr", kind: "job" }, { start: 2, len: 2, label: "Tool change, PM", kind: "down" }, { start: 4, len: 3, label: "SO-1188 SFT-450", kind: "job" }] },
  { machine: "VMC-02", blocks: [{ start: 0, len: 1, label: "SO-1176 done", kind: "job" }, { start: 1, len: 6, label: "SO-1203 NH-6 housings", kind: "job" }] },
  { machine: "Paint line", blocks: [{ start: 0, len: 2, label: "SO-1185", kind: "job" }, { start: 4, len: 2, label: "SO-1182", kind: "job" }] },
];

export const ORDER_IMPACT: Impact[] = [
  { label: "Orders typed in twice", before: "All", now: "None" },
  { label: "Delay first seen", before: "On due date", now: "4 days early" },
  { label: "On time in full", before: "81%", now: "96.4%" },
];

// ---------------------------------------------------------------- Production

export const PRODUCTION_STATS: Stat[] = [
  { label: "OEE today", value: "78%", sub: "Availability 88 · Speed 91 · Quality 97" },
  { label: "Output today", value: "18,420", sub: "of 19,600 planned pieces" },
  { label: "Scrap", value: "1.9%", sub: "target 2.0%", tone: "good" },
  { label: "Downtime today", value: "5.2 h", sub: "3.0 h Press 2 hydraulics", tone: "warn" },
  { label: "Machines running", value: "9 / 12", sub: "1 down · 1 setup · 1 idle" },
  { label: "Changeover, average", value: "38 min", sub: "was 64 min" },
];

export type Machine = { id: string; status: "Running" | "Setup" | "Down" | "Idle"; job: string; operator: string; oee: number; made: number; target: number; note?: string };
export const MACHINES: Machine[] = [
  { id: "Press 1", status: "Running", job: "SO-1185 FLG-77", operator: "D. Pawar", oee: 84, made: 3120, target: 3400 },
  { id: "Press 2", status: "Down", job: "SO-1182 BRK-2210", operator: "S. Khan", oee: 41, made: 1180, target: 3000, note: "Hydraulic fault since 06:10" },
  { id: "Press 3", status: "Running", job: "SO-1171 rework", operator: "M. Rao", oee: 81, made: 1960, target: 2200 },
  { id: "CNC-01", status: "Running", job: "SO-1188 SFT-450", operator: "P. Joshi", oee: 86, made: 142, target: 150 },
  { id: "CNC-02", status: "Running", job: "SO-1176 HSG-118", operator: "A. Das", oee: 88, made: 96, target: 100 },
  { id: "CNC-03", status: "Setup", job: "SO-1182 deburr", operator: "R. Gill", oee: 69, made: 820, target: 1100, note: "Tool change, 20 min left" },
  { id: "CNC-04", status: "Running", job: "PIN-09 stock", operator: "K. Nair", oee: 83, made: 4100, target: 4400 },
  { id: "CNC-05", status: "Idle", job: "Waiting SO-1203 material", operator: "—", oee: 0, made: 0, target: 0, note: "Material arrives 14:00" },
  { id: "VMC-01", status: "Running", job: "NH-6 first-off", operator: "V. Shetty", oee: 79, made: 38, target: 45 },
  { id: "VMC-02", status: "Running", job: "SO-1203 NH-6", operator: "T. Bose", oee: 82, made: 64, target: 72 },
  { id: "Weld cell", status: "Running", job: "TB-12 brackets", operator: "N. Ali", oee: 77, made: 610, target: 700 },
  { id: "Paint line", status: "Running", job: "SO-1185", operator: "Line team", oee: 85, made: 7390, target: 7600 },
];

export const DOWNTIME = [
  { reason: "Changeover", hours: 6.4 },
  { reason: "Hydraulic fault", hours: 3.0 },
  { reason: "Waiting for material", hours: 2.1 },
  { reason: "Tool change", hours: 1.8 },
  { reason: "Quality hold", hours: 1.2 },
  { reason: "No operator", hours: 0.7 },
];

export const SHIFTS = [
  { shift: "A · 06:00–14:00", planned: "9,800", made: "8,640", scrap: "1.7%", oee: "74%", note: "Press 2 fault from 06:10" },
  { shift: "C · 22:00–06:00", planned: "8,900", made: "8,910", scrap: "2.1%", oee: "83%", note: "CNC-04 ran 30 min over plan" },
  { shift: "B · 14:00–22:00 (yesterday)", planned: "9,800", made: "9,620", scrap: "1.8%", oee: "81%", note: "Changeover on Press 1 took 52 min" },
];

export const PRODUCTION_IMPACT: Impact[] = [
  { label: "Shift report reaches you", before: "Next day", now: "Live" },
  { label: "Downtime with a reason", before: "40%", now: "100%" },
  { label: "Average changeover", before: "64 min", now: "38 min" },
];

// ---------------------------------------------------------------- Quality

export const QUALITY_STATS: Stat[] = [
  { label: "Customer PPM", value: "412", sub: "target under 500", tone: "good" },
  { label: "First pass yield", value: "97.3%", sub: "this week" },
  { label: "Customer 8Ds open", value: "2", sub: "Apex Motors, Talon Trucks", tone: "warn" },
  { label: "Internal NCRs open", value: "6", sub: "$3,940 cost this month" },
  { label: "Inspections today", value: "148", sub: "145 passed · 3 on hold" },
  { label: "Gauges due calibration", value: "4", sub: "within 7 days" },
];

export const EIGHT_DS = [
  { id: "8D-031", customer: "Apex Motors", part: "BRK-2210", issue: "Burrs on edge, 120 pcs", opened: "Wed", step: 3, due: "Root cause by Sat", owner: "Quality head" },
  { id: "8D-030", customer: "Talon Trucks", part: "TB-12", issue: "Hole position out, 60 pcs", opened: "Tue", step: 4, due: "Corrective action by Mon", owner: "Quality engineer" },
  { id: "8D-029", customer: "Kiran Motors", part: "FLG-77", issue: "Flatness, 400 pcs (disputed)", opened: "2 Nov", step: 8, due: "Closed · claim raised", owner: "Quality head" },
];
export const D_STEPS = ["Team", "Problem", "Contain", "Root cause", "Fix", "Verify", "Prevent", "Close"];

export const NCRS = [
  { no: "NCR-418", part: "BRK-2210", defect: "Burrs", qty: "2,400 held", source: "In-house · CNC-03", action: "Sort and rework", cost: "$1,120", status: "Rework 60% done" },
  { no: "NCR-417", part: "Steel coil 2.5 mm", defect: "Thickness out", qty: "1.2 t", source: "Supplier · Coastal Steel", action: "Return to supplier", cost: "$0", status: "Debit note raised" },
  { no: "NCR-416", part: "TB-12", defect: "Hole position", qty: "60", source: "Customer · Talon", action: "Rework", cost: "$540", status: "Drawing rev check" },
  { no: "NCR-415", part: "HSG-118", defect: "Porosity", qty: "18", source: "Supplier · castings", action: "Scrap, charge back", cost: "$0", status: "Closed" },
  { no: "NCR-414", part: "PIN-09", defect: "Wrong label", qty: "2 boxes", source: "In-house · packing", action: "Relabel", cost: "$40", status: "Closed" },
];

export const INSPECTIONS = [
  { lot: "L-2210-46", part: "BRK-2210", type: "In-process", result: "Pass", by: "Inspector 2", time: "09:30" },
  { lot: "L-77-21", part: "FLG-77", type: "Final", result: "Pass", by: "Inspector 1", time: "09:12" },
  { lot: "GRN-3312", part: "Steel coil 2.5 mm", type: "Incoming", result: "Hold", by: "Inspector 3", time: "08:55" },
  { lot: "L-118-09", part: "HSG-118", type: "Final", result: "Pass", by: "CMM", time: "08:40" },
  { lot: "L-12-07", part: "TB-12", type: "In-process", result: "Hold", by: "Inspector 2", time: "08:05" },
];

export const QUALITY_IMPACT: Impact[] = [
  { label: "8D first response", before: "9 days", now: "Same day" },
  { label: "Rejections traced to cause", before: "Some", now: "All" },
  { label: "Customer PPM", before: "760", now: "412" },
];

// ---------------------------------------------------------------- Purchase and stock

export const PURCHASE_STATS: Stat[] = [
  { label: "Stock value", value: "$1.84M", sub: "31 days of sales" },
  { label: "Below reorder point", value: "3", sub: "orders drafted for all 3", tone: "warn" },
  { label: "Open purchase orders", value: "38", sub: "$0.92M" },
  { label: "Late deliveries", value: "2", sub: "Coastal Steel, PrimePack", tone: "bad" },
  { label: "Supplier on time", value: "91%", sub: "last 90 days" },
  { label: "Waiting for approval", value: "1", sub: "PO-7741, $21,600", tone: "warn" },
];

export const MATERIALS = [
  { code: "RM-ST25", name: "Steel coil 2.5 mm", onHand: "18.4 t", alloc: "14.1 t", cover: 4, reorder: "20 t", status: "Critical", action: "PO-7741 waiting for approval" },
  { code: "RM-ST40", name: "Steel coil 4.0 mm", onHand: "31.0 t", alloc: "12.6 t", cover: 12, reorder: "15 t", status: "OK", action: "—" },
  { code: "RM-AL60", name: "Aluminium bar 60 mm", onHand: "2.2 t", alloc: "1.9 t", cover: 6, reorder: "2.5 t", status: "Reorder", action: "PO-7738 sent, arrives Mon" },
  { code: "BO-FS08", name: "Flange screws M8", onHand: "84,000", alloc: "40,000", cover: 21, reorder: "50,000", status: "OK", action: "—" },
  { code: "PK-CT40", name: "Cartons 400 × 300", onHand: "1,900", alloc: "1,600", cover: 3, reorder: "3,000", status: "Reorder", action: "PrimePack late. Chased twice" },
  { code: "CS-HS118", name: "HSG-118 castings", onHand: "1,450", alloc: "1,200", cover: 9, reorder: "1,000", status: "OK", action: "—" },
  { code: "PT-GR01", name: "Powder coat, grey", onHand: "640 kg", alloc: "300 kg", cover: 18, reorder: "400 kg", status: "OK", action: "—" },
];

export const POS = [
  { no: "PO-7741", supplier: "Ridge Alloys", item: "Steel coil 2.5 mm × 12 t", value: "$21,600", due: "16 Nov", status: "Waiting for your approval" },
  { no: "PO-7738", supplier: "Ridge Alloys", item: "Aluminium bar 60 mm × 2 t", value: "$7,800", due: "16 Nov", status: "Confirmed" },
  { no: "PO-7735", supplier: "Coastal Steel", item: "Steel coil 2.5 mm × 20 t", value: "$35,400", due: "Was 10 Nov", status: "Late 2 days" },
  { no: "PO-7731", supplier: "PrimePack", item: "Cartons × 5,000", value: "$2,350", due: "Was 11 Nov", status: "Late 1 day" },
  { no: "PO-7712", supplier: "Unison Fasteners", item: "M8 screws × 60,000", value: "$4,860", due: "9 Nov", status: "Received, invoice matched" },
  { no: "PO-7709", supplier: "Delta Coatings", item: "Powder coat × 500 kg", value: "$3,900", due: "20 Nov", status: "Confirmed" },
];

export const SUPPLIERS = [
  { name: "Ridge Alloys", category: "Steel, aluminium", otif: "96%", reject: "0.3%", price: "−2%", rating: "Preferred" },
  { name: "Coastal Steel", category: "Steel coil", otif: "82%", reject: "1.9%", price: "+1%", rating: "On watch" },
  { name: "Unison Fasteners", category: "Fasteners", otif: "99%", reject: "0.1%", price: "0%", rating: "Preferred" },
  { name: "PrimePack", category: "Packaging", otif: "88%", reject: "0.0%", price: "+3%", rating: "On watch" },
  { name: "Delta Coatings", category: "Paint", otif: "94%", reject: "0.4%", price: "0%", rating: "Approved" },
  { name: "Pioneer Castings", category: "Castings", otif: "91%", reject: "1.2%", price: "−1%", rating: "Approved" },
];

export const PURCHASE_IMPACT: Impact[] = [
  { label: "Line stops for material", before: "2 a month", now: "0" },
  { label: "Urgent buys at a premium", before: "5 a month", now: "0" },
  { label: "Supplier invoices matched by hand", before: "All", now: "8%" },
];

// ---------------------------------------------------------------- Dispatch

export const DISPATCH_STATS: Stat[] = [
  { label: "Shipments today", value: "9", sub: "$214K of goods" },
  { label: "Ready to load", value: "6", sub: "loading from 14:00" },
  { label: "Documents complete", value: "100%", sub: "before the truck arrives", tone: "good" },
  { label: "In transit", value: "14", sub: "customers told arrival times" },
  { label: "On time in full", value: "96.4%", sub: "last 30 days", tone: "good" },
  { label: "Proof of delivery missing", value: "0", sub: "all 41 this month received" },
];

export const SHIPMENTS = [
  { no: "SH-4421", so: "SO-1185", customer: "Kiran Motors", load: "6,000 · 24 boxes", vehicle: "North Freight · 14:00", docs: [true, true, true], eta: "Sat 09:00", status: "Ready" },
  { no: "SH-4422", so: "SO-1176", customer: "Vega Systems", load: "1,200 · 10 crates", vehicle: "Own truck 2 · 14:30", docs: [true, true, true], eta: "Fri 10:00", status: "Loading" },
  { no: "SH-4423", so: "SO-1162", customer: "Meridian Agri", load: "40,000 · 16 boxes", vehicle: "Swift Cargo · 15:00", docs: [true, true, false], eta: "Mon 11:00", status: "Ready", note: "Test cert generating" },
  { no: "SH-4424", so: "SO-1171", customer: "Talon Trucks", load: "2,400 · 8 crates", vehicle: "Planned Sat", docs: [false, false, false], eta: "Mon 14:00", status: "Planned", note: "After rework inspection" },
  { no: "SH-4410", so: "SO-1176", customer: "Vega Systems", load: "Part 1 · 600", vehicle: "North Freight", docs: [true, true, true], eta: "Fri 10:00", status: "In transit" },
  { no: "SH-4398", so: "SO-1158", customer: "Kiran Motors", load: "8,000", vehicle: "Swift Cargo", docs: [true, true, true], eta: "Delivered Wed", status: "Delivered · POD received" },
];

export const DISPATCH_IMPACT: Impact[] = [
  { label: "“Where is my truck?” calls", before: "60 a day", now: "4 a day" },
  { label: "Invoice raised on dispatch day", before: "41%", now: "100%" },
  { label: "Missing documents at customer", before: "1 in 12", now: "None" },
];

// ---------------------------------------------------------------- Finance

export const FINANCE_STATS: Stat[] = [
  { label: "Revenue, month to date", value: "$1.38M", sub: "of $3.20M target", tone: "good" },
  { label: "Gross margin", value: "27.4%", sub: "steel up 4% this month" },
  { label: "Owed to you", value: "$4.12M", sub: "61 customers" },
  { label: "Overdue", value: "$0.38M", sub: "9% · 7 customers", tone: "warn" },
  { label: "Days to get paid", value: "34", sub: "was 52", tone: "good" },
  { label: "Bills due this week", value: "$0.41M", sub: "payroll Mon $0.62M" },
];

export const RECEIVABLES = [
  { customer: "Apex Motors", current: "$412K", d30: "$0", d60: "$0", d90: "$0", total: "$412K", pays: "31 days", next: "Nothing overdue" },
  { customer: "Vega Systems", current: "$268K", d30: "$61K", d60: "$0", d90: "$0", total: "$329K", pays: "44 days", next: "Reminder 2 sent Tue" },
  { customer: "Kiran Motors", current: "$190K", d30: "$84K", d60: "$47K", d90: "$18K", total: "$339K", pays: "58 days", next: "Claim $18.4K needs approval" },
  { customer: "Norda Electric", current: "$221K", d30: "$12K", d60: "$0", d90: "$0", total: "$233K", pays: "36 days", next: "Promised Fri" },
  { customer: "Talon Trucks", current: "$88K", d30: "$41K", d60: "$22K", d90: "$0", total: "$151K", pays: "47 days", next: "Call booked with their AP, Mon" },
  { customer: "Meridian Agri", current: "$140K", d30: "$0", d60: "$0", d90: "$0", total: "$140K", pays: "29 days", next: "Nothing overdue" },
];

export const DEDUCTIONS = [
  { customer: "Kiran Motors", invoice: "INV-5498", amount: "$18,400", reason: "400 flanges marked rejected. All accepted on recheck QR-0912", recover: "$18,400", status: "Claim needs approval" },
  { customer: "Talon Trucks", invoice: "INV-5471", amount: "$2,640", reason: "60 brackets returned, RMA-118. Valid", recover: "$0", status: "Accepted, credit note issued" },
  { customer: "Vega Systems", invoice: "INV-5502", amount: "$1,150", reason: "Freight charged twice on their side", recover: "$1,150", status: "Claim sent, they agreed" },
  { customer: "Apex Motors", invoice: "INV-5489", amount: "$740", reason: "Price on PO was last year's. Our quote Q-2241 is valid", recover: "$740", status: "Recovered" },
  { customer: "Kiran Motors", invoice: "INV-5460", amount: "$3,900", reason: "Late delivery penalty, 2 days. Delay was their schedule change", recover: "$3,900", status: "Claim sent" },
];

/** 13-week cash forecast, $K: money in, money out, closing balance. */
export const CASH_13 = [
  { wk: "W1", in: 690, out: 610 }, { wk: "W2", in: 540, out: 720 }, { wk: "W3", in: 480, out: 760 }, { wk: "W4", in: 820, out: 640 },
  { wk: "W5", in: 760, out: 700 }, { wk: "W6", in: 640, out: 610 }, { wk: "W7", in: 880, out: 690 }, { wk: "W8", in: 720, out: 650 },
  { wk: "W9", in: 700, out: 780 }, { wk: "W10", in: 810, out: 640 }, { wk: "W11", in: 760, out: 660 }, { wk: "W12", in: 690, out: 700 }, { wk: "W13", in: 840, out: 650 },
];
export const CASH_START = 1360;

export const MARGINS = [
  { customer: "Meridian Agri", margin: 31.2, revenue: "$1.40M" },
  { customer: "Norda Electric", margin: 29.0, revenue: "$1.95M" },
  { customer: "Apex Motors", margin: 26.4, revenue: "$4.82M" },
  { customer: "Vega Systems", margin: 25.1, revenue: "$3.10M" },
  { customer: "Talon Trucks", margin: 21.8, revenue: "$0.88M" },
  { customer: "Kiran Motors", margin: 17.9, revenue: "$2.64M" },
];

export const FINANCE_IMPACT: Impact[] = [
  { label: "Days to get paid", before: "52", now: "34" },
  { label: "Short payments explained", before: "None", now: "All" },
  { label: "Month-end close", before: "9 days", now: "2 days" },
  { label: "Recovered from wrong deductions", before: "$0", now: "$41K this year" },
];

// ---------------------------------------------------------------- People

export const PEOPLE_STATS: Stat[] = [
  { label: "Headcount", value: "240", sub: "212 plant · 28 office" },
  { label: "Present today", value: "226", sub: "94% · 9 on leave · 5 absent" },
  { label: "Overtime this week", value: "312 h", sub: "Sat shift adds 24 h" },
  { label: "Open roles", value: "4", sub: "CNC setter has 4 interviews" },
  { label: "Joined this month", value: "6", sub: "all onboarding on track" },
  { label: "Leaving rate, 12 months", value: "9%", sub: "was 17%", tone: "good" },
];

export const ATTENDANCE = [
  { team: "Press shop", shift: "A", planned: 34, present: 31, leave: 2, absent: 1 },
  { team: "Machining", shift: "A", planned: 41, present: 40, leave: 1, absent: 0 },
  { team: "Paint and assembly", shift: "A", planned: 28, present: 25, leave: 1, absent: 2 },
  { team: "Quality", shift: "A", planned: 12, present: 12, leave: 0, absent: 0 },
  { team: "Stores and dispatch", shift: "A", planned: 16, present: 15, leave: 1, absent: 0 },
  { team: "Night shift, all", shift: "C", planned: 81, present: 77, leave: 2, absent: 2 },
  { team: "Office", shift: "Day", planned: 28, present: 26, leave: 2, absent: 0 },
];

export const HIRING = [
  { role: "CNC setter, plant 2", applied: 120, screened: 9, interview: 4, offer: 0, open: "12 days", next: "Interviews Tue–Wed" },
  { role: "Quality engineer", applied: 64, screened: 6, interview: 3, offer: 1, open: "3 weeks", next: "Offer accepted, joins 1 Dec" },
  { role: "Press operator × 3", applied: 88, screened: 14, interview: 7, offer: 2, open: "2 weeks", next: "1 more offer this week" },
  { role: "Accounts assistant", applied: 47, screened: 5, interview: 2, offer: 0, open: "9 days", next: "Second round Fri" },
];

export const SKILLS = {
  machines: ["Press 1", "Press 2", "Press 3", "CNC", "VMC", "Weld"],
  people: [
    { name: "D. Pawar", s: [2, 2, 2, 0, 0, 1] },
    { name: "S. Khan", s: [2, 2, 1, 0, 0, 0] },
    { name: "M. Rao", s: [1, 2, 2, 0, 0, 2] },
    { name: "P. Joshi", s: [0, 0, 0, 2, 2, 0] },
    { name: "A. Das", s: [0, 0, 0, 2, 1, 0] },
    { name: "R. Gill", s: [0, 1, 0, 2, 2, 0] },
    { name: "New: K. Iqbal", s: [1, 0, 1, 0, 0, 0] },
  ],
};

export const PEOPLE_IMPACT: Impact[] = [
  { label: "Time to hire", before: "9 weeks", now: "3 weeks" },
  { label: "New joiner productive", before: "2 months", now: "2 weeks" },
  { label: "Attendance disputes", before: "Weekly", now: "Rare" },
];

// ---------------------------------------------------------------- Documents

export const DOC_STATS: Stat[] = [
  { label: "Documents read today", value: "186", sub: "email, portals, WhatsApp, scans" },
  { label: "Matched automatically", value: "92%", sub: "to orders, POs and receipts", tone: "good" },
  { label: "Need a person", value: "7", sub: "unclear or mismatched", tone: "warn" },
  { label: "Average time to read", value: "11 s", sub: "per document" },
];

export const DOCUMENTS = [
  { time: "09:34", type: "Customer PO", from: "Norda Electric", fields: "NE-77812 · NH-6 × 12,000 · $7.70 · 4 Dec", matched: "Quote Q-2287 → SO-1203", status: "Matched" },
  { time: "09:20", type: "Supplier invoice", from: "Unison Fasteners", fields: "UF-90321 · $4,860 · due 20 Nov", matched: "PO-7712 + GRN-3310", status: "Matched" },
  { time: "09:02", type: "Debit note", from: "Kiran Motors", fields: "DN-221 · $18,400 · 400 × FLG-77 rejected", matched: "INV-5498 · QR-0912 disagrees", status: "Needs a person" },
  { time: "08:55", type: "Mill certificate", from: "Coastal Steel", fields: "MTC-5530 · 2.5 mm · thickness 2.61", matched: "GRN-3312 · out of tolerance", status: "Needs a person" },
  { time: "08:31", type: "Drawing", from: "Talon Trucks", fields: "TB-12 rev D · hole moved 1.5 mm", matched: "Replaces rev C in production", status: "Filed, team told" },
  { time: "08:10", type: "Delivery note", from: "Ridge Alloys", fields: "DN-4471 · Al bar 60 mm × 2 t", matched: "PO-7738", status: "Matched" },
  { time: "Yesterday", type: "Quality agreement", from: "Kestrel Rail", fields: "PPAP level 3 · 12 requirements", matched: "Deal D-316", status: "Summarised for sales" },
];

// ---------------------------------------------------------------- Agents and audit

export const AGENT_STATS: Stat[] = [
  { label: "Agents running", value: "11", sub: "one per department, plus documents and planning" },
  { label: "Tasks today", value: "1,146", sub: "since 00:00" },
  { label: "Done without a person", value: "87%", sub: "the rest asked first" },
  { label: "Checked by people", value: "100%", sub: "of prices, payments, POs" },
];

export const AGENTS = [
  { name: "Sales agent", dept: "Sales", tasks: 214, alone: "84%", asked: 6, does: "Replies, quotes from your rates, follow-ups" },
  { name: "Service agent", dept: "Customer service", tasks: 389, alone: "81%", asked: 9, does: "Answers, tickets, documents to customers" },
  { name: "Order agent", dept: "Orders and planning", tasks: 64, alone: "95%", asked: 1, does: "Reads POs, enters orders, confirms" },
  { name: "Planning agent", dept: "Orders and planning", tasks: 41, alone: "78%", asked: 2, does: "Keeps the plan current, flags risks" },
  { name: "Production agent", dept: "Production", tasks: 96, alone: "100%", asked: 0, does: "Collects output, stoppages, reasons" },
  { name: "Quality agent", dept: "Quality", tasks: 52, alone: "71%", asked: 4, does: "Inspections, NCRs, 8D tracking" },
  { name: "Purchase agent", dept: "Purchase and stock", tasks: 41, alone: "80%", asked: 2, does: "Stock checks, supplier comparison, POs" },
  { name: "Dispatch agent", dept: "Dispatch", tasks: 38, alone: "100%", asked: 0, does: "Documents, arrival times, proof of delivery" },
  { name: "Finance agent", dept: "Finance", tasks: 302, alone: "91%", asked: 3, does: "Invoices, matching, reminders, claims" },
  { name: "People agent", dept: "People", tasks: 18, alone: "89%", asked: 1, does: "Screening, interviews, onboarding" },
  { name: "Document agent", dept: "Documents", tasks: 186, alone: "92%", asked: 7, does: "Reads and files every document" },
];

export const RULES = [
  { rule: "Prices under 20% margin", who: "MD approves" },
  { rule: "Purchase orders over $20,000", who: "MD approves" },
  { rule: "Disputes or claims over $10,000", who: "Finance head approves" },
  { rule: "Overtime over 20 hours a week", who: "Plant head approves" },
  { rule: "Any P1 customer complaint", who: "Quality head within 1 hour" },
  { rule: "Credit hold release", who: "Finance head approves" },
  { rule: "Agents never send money, change bank details or delete records", who: "Blocked" },
];

export const AUDIT = [
  { time: "09:41", agent: "Finance agent", action: "Closed INV-5521, 5530, 5544 against payment", record: "Ledger", by: "Rule: exact match", result: "Done" },
  { time: "09:39", agent: "Planning agent", action: "Proposed Saturday shift on Press 3", record: "SO-1182", by: "Waiting: plant head", result: "Asked" },
  { time: "09:37", agent: "Purchase agent", action: "Drafted PO-7741, $21,600", record: "Ridge Alloys", by: "Waiting: MD", result: "Asked" },
  { time: "09:36", agent: "Finance agent", action: "Drafted claim for $18,400", record: "Kiran Motors", by: "Waiting: finance head", result: "Asked" },
  { time: "09:34", agent: "Order agent", action: "Created SO-1203 from PO NE-77812", record: "Norda Electric", by: "Rule: matches quote", result: "Done" },
  { time: "09:31", agent: "Sales agent", action: "Sent 14 follow-ups", record: "Open quotes", by: "Rule: template approved", result: "Done" },
  { time: "08:56", agent: "Quality agent", action: "Put GRN-3312 on hold", record: "Coastal Steel coil", by: "Rule: certificate out of tolerance", result: "Done" },
  { time: "07:40", agent: "Quality agent", action: "Logged containment confirmation", record: "8D-031", by: "Quality head", result: "Approved" },
];
