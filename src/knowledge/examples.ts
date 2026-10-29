// Example engagements for Indian businesses.
//
// These are ILLUSTRATIVE scenarios built from common situations — not client
// case studies. They are labelled as such on the site. When real, client-
// approved case studies exist, add them with `verified: true` and real outcomes.

import type { ServicePathId } from "./catalog";

export type Example = {
  slug: string;
  path: ServicePathId;
  title: string;
  industry: string;
  city: string;
  profile: string;
  situation: string;
  pains: string[];
  solution: string;
  flow: { step: string; detail: string; human?: boolean }[];
  stack: string[];
  changes: string[];
  measures: string[];
  engagement: string;
  verified?: false;
};

export const EXAMPLES: Example[] = [
  // --- Automate --------------------------------------------------------------
  {
    slug: "whatsapp-orders-into-tally",
    path: "automate",
    title: "WhatsApp orders straight into Tally",
    industry: "Textile wholesale",
    city: "Surat",
    profile: "Fabric wholesaler · 300+ retailer customers · 3 people on order entry",
    situation:
      "Retailers send orders on WhatsApp — typed in Gujarati, Hindi or English, sometimes as voice notes. Three people re-type every order into Tally, then log in to the GST portal to raise the e-invoice and e-way bill.",
    pains: [
      "Wrong design numbers and quantities slip through when orders are re-typed",
      "Orders placed after 4 PM wait until the next morning",
      "E-invoices and e-way bills are raised by hand, one at a time",
      "The owner has no live view of the day's order book",
    ],
    solution:
      "Orders keep arriving on WhatsApp exactly as before. The system reads each message into line items, checks stock in Tally and shows staff a ready-made order to confirm with one click. Confirmed orders are posted to Tally with the e-invoice raised automatically, and the retailer gets a confirmation with a UPI payment link.",
    flow: [
      { step: "Order arrives on WhatsApp", detail: "Text or voice note, in any of the three languages" },
      { step: "Read into line items", detail: "Design number, quantity in thaan or metres, agreed rate" },
      { step: "Check stock and credit", detail: "Live stock and outstanding balance from Tally" },
      { step: "Staff confirm", detail: "One click; credit-limit breaches and new rates always need a person", human: true },
      { step: "Post to Tally + e-invoice", detail: "Sales voucher, IRN and e-way bill generated" },
      { step: "Confirm to the retailer", detail: "WhatsApp confirmation with a UPI payment link" },
    ],
    stack: ["WhatsApp Business Platform", "TallyPrime", "GST e-invoice (IRP) via GSP", "UPI payment links"],
    changes: [
      "Staff check and confirm orders instead of re-typing them",
      "Late-afternoon orders are confirmed the same day",
      "E-invoices and e-way bills are raised with the order, not afterwards",
      "The owner sees today's orders, pending confirmations and dispatches on one screen",
    ],
    measures: ["Minutes spent per order", "Order errors per week", "Time from WhatsApp message to dispatch"],
    engagement: "Automate · about 6 weeks · fixed-price milestones",
  },
  {
    slug: "gst-reconciliation-for-ca-firm",
    path: "automate",
    title: "GST reconciliation without the month-end scramble",
    industry: "CA & professional services",
    city: "Ahmedabad",
    profile: "Chartered accountancy firm · 120 SME clients · 6 article assistants",
    situation:
      "Every month the team chases clients for purchase bills on WhatsApp and email, then matches GSTR-2B against each client's purchase register in Excel. Mismatches surface days before the deadline.",
    pains: [
      "Hours lost chasing the same clients for documents every month",
      "Manual matching in Excel across 120 clients",
      "Input tax credit mismatches found too late to fix with suppliers",
    ],
    solution:
      "Clients get friendly reminders with a simple upload link. Purchase data is matched against GSTR-2B automatically, and only genuine mismatches reach an assistant, with the likely reason already noted. A CA reviews every flagged item before anything is filed.",
    flow: [
      { step: "Reminders go out", detail: "WhatsApp and email reminders with an upload link, per client" },
      { step: "Collect purchase data", detail: "Tally exports, Excel sheets or photos of bills" },
      { step: "Match against GSTR-2B", detail: "Invoice-level matching with tolerance rules" },
      { step: "Flag mismatches", detail: "Missing invoices, GSTIN errors, amount differences" },
      { step: "CA review", detail: "A qualified person reviews every flagged item", human: true },
      { step: "Client follow-up", detail: "Clients see exactly which supplier invoices need attention" },
    ],
    stack: ["GST portal data via GSP", "TallyPrime / Excel exports", "WhatsApp Business Platform", "Google Drive"],
    changes: [
      "Assistants spend their time on exceptions, not on matching every line",
      "Mismatches surface early in the month while suppliers can still correct them",
      "Partners see which clients are ready, pending or at risk",
    ],
    measures: ["Hours per client per month", "Days before deadline that reconciliation is complete", "Clients chased more than twice"],
    engagement: "Automate · about 8 weeks · fixed-price milestones",
  },
  {
    slug: "collections-for-fmcg-distributor",
    path: "automate",
    title: "Payment follow-ups that run themselves",
    industry: "Wholesale & distribution",
    city: "Chennai",
    profile: "FMCG distributor · 450 retailer accounts · outstanding tracked in Tally",
    situation:
      "Salesmen chase payments during their beat while the accounts team matches UPI and NEFT receipts against invoices from the bank statement by hand.",
    pains: [
      "Outstanding grows quietly until it becomes a problem",
      "Receipts without a clear reference take hours to match",
      "Retailers receive inconsistent, sometimes awkward, follow-ups",
    ],
    solution:
      "Each morning, outstanding balances are read from Tally and polite reminders go out on WhatsApp in Tamil or English with a UPI link. Incoming payments are matched to invoices automatically; anything unclear or disputed goes to a person.",
    flow: [
      { step: "Sync outstanding from Tally", detail: "Every morning, per retailer and invoice" },
      { step: "Send reminders", detail: "Courteous WhatsApp reminders with a UPI link, on an agreed schedule" },
      { step: "Match receipts", detail: "UPI/NEFT receipts from the bank statement matched to invoices" },
      { step: "Escalate exceptions", detail: "Disputes, part-payments and 60+ day accounts go to a person", human: true },
      { step: "Update Tally", detail: "Receipt vouchers posted once matched" },
    ],
    stack: ["TallyPrime", "WhatsApp Business Platform", "UPI payment links", "Bank statement import"],
    changes: [
      "Every account gets a consistent reminder at the right time",
      "The accounts team handles exceptions instead of matching every receipt",
      "Salesmen spend their beat selling, with a short list of accounts that need a visit",
    ],
    measures: ["Days sales outstanding", "Receipts matched without manual work", "Accounts over 60 days"],
    engagement: "Automate · about 5 weeks · fixed-price milestones",
  },

  // --- Build -----------------------------------------------------------------
  {
    slug: "dealer-ordering-app",
    path: "build",
    title: "A dealer ordering app for an auto-parts manufacturer",
    industry: "Manufacturing",
    city: "Ludhiana",
    profile: "Auto-parts manufacturer · 250 dealers across Punjab, Haryana and UP",
    situation:
      "Dealers phone or WhatsApp the sales office to check stock, prices and order status. Every enquiry interrupts someone, and dealers often order the wrong variant from an outdated price list.",
    pains: [
      "Sales coordinators spend the day answering 'is it in stock?' and 'where is my order?'",
      "Dealers work from old PDF price lists with outdated schemes",
      "No visibility of credit limits until an order is held",
    ],
    solution:
      "A simple ordering app for dealers — in Hindi and English, working well on a basic Android phone. Dealers see live stock and their own price list and schemes, place orders within their credit limit and track dispatch with the transporter's LR number. Orders flow into Tally.",
    flow: [
      { step: "Dealer signs in", detail: "With a mobile OTP — no passwords to remember" },
      { step: "Browse and order", detail: "Live stock, tier-specific prices and current schemes" },
      { step: "Credit check", detail: "Orders above the limit are routed to the sales manager", human: true },
      { step: "Order to Tally", detail: "Sales order created automatically" },
      { step: "Track dispatch", detail: "Status, invoice and LR number visible to the dealer" },
    ],
    stack: ["Progressive web app (Android-friendly)", "TallyPrime sync", "SMS / WhatsApp OTP", "Hindi + English"],
    changes: [
      "Dealers answer their own stock and status questions, any time of day",
      "One up-to-date price list and scheme for every dealer",
      "Sales coordinators focus on new dealers and large orders",
    ],
    measures: ["Orders placed through the app", "Status calls per week", "Order errors from outdated prices"],
    engagement: "Build · about 12 weeks to the first release · fixed-price milestones",
  },
  {
    slug: "diagnostic-chain-booking-and-reports",
    path: "build",
    title: "Bookings and reports for a diagnostic chain",
    industry: "Healthcare",
    city: "Pune",
    profile: "Diagnostic chain · 6 collection centres · home sample collection",
    situation:
      "Patients phone to book tests and home collections, then call again to ask whether reports are ready. Reports are emailed as attachments or collected in person.",
    pains: [
      "Phone lines are busy all morning with bookings and report requests",
      "Home-collection slots are managed in a shared spreadsheet",
      "Sharing medical reports by email attachment is risky",
    ],
    solution:
      "Patients book tests and home-collection slots online or on WhatsApp, and receive reports through a secure, OTP-protected link. Front desk staff get one dashboard for the day's bookings and collections, with patient consent recorded as required under the DPDP Act.",
    flow: [
      { step: "Book online or on WhatsApp", detail: "Choose tests, centre or home collection, and a slot" },
      { step: "Confirm and remind", detail: "Confirmation and fasting instructions sent automatically" },
      { step: "Phlebotomist route", detail: "Daily home-collection list with addresses and time slots" },
      { step: "Report approval", detail: "The pathologist signs off before release", human: true },
      { step: "Secure delivery", detail: "Patient receives an OTP-protected report link" },
    ],
    stack: ["Web booking + WhatsApp Business Platform", "Lab system integration", "Consent records (DPDP)", "India-hosted data"],
    changes: [
      "Fewer phone calls for bookings and report status",
      "Home collections planned by area and time slot",
      "Reports shared securely, with a record of consent and access",
    ],
    measures: ["Bookings made online", "Report-status calls per day", "Missed home-collection slots"],
    engagement: "Build · about 10 weeks to the first release · fixed-price milestones",
  },
  {
    slug: "coaching-institute-fees-and-parents",
    path: "build",
    title: "Fees, attendance and parent updates for a coaching institute",
    industry: "Education",
    city: "Kota",
    profile: "Coaching institute · 2,000 students · 4 batches a day",
    situation:
      "Fees are paid in instalments by cash, cheque and UPI screenshots. Attendance is on paper, and parents call the office to ask about test results.",
    pains: [
      "Reconciling instalments and UPI screenshots takes days",
      "Parents only hear about poor attendance or results when it is too late",
      "Office staff field the same questions from hundreds of parents",
    ],
    solution:
      "A portal for students and parents: instalment schedules with UPI payment links, QR-based attendance and test results shared on WhatsApp. The office gets a live view of dues, attendance and performance by batch.",
    flow: [
      { step: "Admission", detail: "Student and parent details, batch and fee plan" },
      { step: "Instalments", detail: "UPI links and reminders before each due date" },
      { step: "Attendance", detail: "QR scan at entry; parents notified of absences" },
      { step: "Results", detail: "Test scores shared with parents after teacher review", human: true },
      { step: "Office dashboard", detail: "Dues, attendance and results by batch" },
    ],
    stack: ["Web portal + PWA", "UPI payment links / AutoPay", "WhatsApp Business Platform", "QR attendance"],
    changes: [
      "Payments reconcile themselves; the office follows up only on exceptions",
      "Parents hear about absences the same day",
      "Teachers see which students need attention before the next test",
    ],
    measures: ["Overdue instalments", "Parent calls to the office", "Attendance by batch"],
    engagement: "Build · about 10 weeks to the first release · fixed-price milestones",
  },

  // --- Operate ---------------------------------------------------------------
  {
    slug: "online-presence-for-showroom",
    path: "operate",
    title: "Running everything online for a family showroom",
    industry: "Retail & showrooms",
    city: "Nagpur",
    profile: "Family-run furniture showroom · two locations · no in-house tech staff",
    situation:
      "The website was built years ago by a relative and hasn't been updated since. The Google listing shows old timings, Instagram gets a post once a month, and enquiries arrive on three different phones.",
    pains: [
      "Customers searching nearby find competitors first",
      "Nobody owns the website, domain renewal or business email",
      "Hiring a developer and a digital marketer would cost close to ₹70,000 a month in salaries",
      "The owner has no idea which marketing spend brings customers",
    ],
    solution:
      "amfire becomes the showroom's technology partner for one monthly fee: the website is refreshed and maintained, the Google Business Profile is corrected, Instagram gets regular posts, local SEO and small ad campaigns run every month, and every enquiry is routed to one WhatsApp number.",
    flow: [
      { step: "Free review", detail: "Website, Google listing, social media, domain and email checked" },
      { step: "Take over safely", detail: "Domain, hosting, email and social accounts moved into the owner's name" },
      { step: "Fix the basics", detail: "Correct timings, photos and reviews; fast mobile website" },
      { step: "Monthly plan", detail: "Weekly posts, local SEO, small Google and Meta campaigns" },
      { step: "Owner approves", detail: "Offers, prices and ad budgets are always approved by the owner", human: true },
      { step: "Monthly report", detail: "Enquiries, calls and visits — in plain language" },
    ],
    stack: ["Website & hosting", "Google Business Profile", "Instagram & Facebook", "Google & Meta Ads", "WhatsApp Business"],
    changes: [
      "The showroom shows up correctly when people search nearby",
      "Accounts, domain and email are in the owner's name and looked after",
      "Every enquiry reaches one WhatsApp number, so none are missed",
      "The owner sees what marketing brings in every month",
    ],
    measures: ["Enquiries per month", "Calls and direction requests from Google", "Cost per enquiry from ads"],
    engagement: "Operate · one monthly plan",
  },
  {
    slug: "d2c-brand-festive-sale",
    path: "operate",
    title: "Staying online through the festive sale",
    industry: "D2C & e-commerce",
    city: "Jaipur",
    profile: "Home décor D2C brand · Shopify store + custom order-tracking and returns app",
    situation:
      "Most of the year's revenue arrives during Diwali and wedding-season sales. Last season the custom tracking app slowed down under load and support was flooded with 'where is my order?' messages.",
    pains: [
      "Nobody is watching the systems during peak sale hours",
      "Problems are discovered by customers first",
      "No load testing before big campaigns",
    ],
    solution:
      "Round-the-clock monitoring of the store, tracking app and payment flows; a load test and readiness checklist before every major sale; on-call cover during sale windows; and clear incident updates in the Client Hub.",
    flow: [
      { step: "Readiness review", detail: "Load test and checklist two weeks before each sale" },
      { step: "Monitor", detail: "Uptime, checkout errors and payment-gateway latency, 24×7" },
      { step: "Respond", detail: "On-call engineer during sale windows with agreed response times" },
      { step: "Communicate", detail: "Incident updates posted to the Client Hub as they happen", human: true },
      { step: "Review", detail: "Monthly report with fixes and recommendations" },
    ],
    stack: ["Shopify + custom apps", "Uptime and error monitoring", "CDN and autoscaling", "Payment gateway health checks"],
    changes: [
      "Issues are caught by monitoring, not by customers",
      "Every big sale starts with a tested, documented plan",
      "The founder gets one clear status page instead of chasing developers",
    ],
    measures: ["Uptime during sale windows", "Time to detect and resolve incidents", "Checkout error rate"],
    engagement: "Operate · onboarding, then a monthly plan",
  },
  {
    slug: "taking-over-a-legacy-erp",
    path: "operate",
    title: "Taking over an ERP whose developer moved on",
    industry: "Textile manufacturing",
    city: "Coimbatore",
    profile: "Spinning mill · custom PHP/MySQL ERP on an office server · 80 daily users",
    situation:
      "The ERP was built years ago by a freelancer who has since moved on. It runs on a single server in the office, there is no documentation, and backups are copied to a USB drive when someone remembers.",
    pains: [
      "One hardware failure away from losing years of data",
      "Every small change is risky because nobody understands the code",
      "Passwords and access are shared across the team",
    ],
    solution:
      "A careful takeover: audit the system, secure access, set up encrypted off-site backups that are tested by restoring them, add monitoring and document how everything works. Then fix the most painful bugs and agree a plan for what to improve or replace.",
    flow: [
      { step: "Audit", detail: "Code, server, data, access and known issues" },
      { step: "Secure", detail: "Individual logins, removal of shared passwords, OS and PHP updates" },
      { step: "Back up", detail: "Nightly encrypted backups to India-region cloud storage, with restore tests" },
      { step: "Document", detail: "Runbook and system map your team can read" },
      { step: "Improve", detail: "Agreed roadmap — fix, modernise or replace module by module", human: true },
    ],
    stack: ["PHP / MySQL", "Linux server hardening", "Encrypted cloud backups (Mumbai region)", "Uptime monitoring"],
    changes: [
      "A tested backup exists, and restoring it has been practised",
      "Each person has their own access, which can be removed when they leave",
      "Changes are made with documentation and a way to roll back",
    ],
    measures: ["Successful restore tests", "Unplanned downtime", "Open critical issues"],
    engagement: "Operate · 4-week takeover, then a monthly plan",
  },
  {
    slug: "hospital-systems-support",
    path: "operate",
    title: "Keeping a hospital's systems secure and supported",
    industry: "Healthcare",
    city: "Indore",
    profile: "120-bed hospital · hospital management system, lab system and billing",
    situation:
      "The hospital depends on its HMS around the clock, but IT support is one overstretched person. Security updates are irregular, and nobody has ever tested restoring a backup.",
    pains: [
      "Downtime at billing or the lab directly affects patients",
      "No clear response times when something breaks at night",
      "Patient data obligations under the DPDP Act are unclear",
    ],
    solution:
      "A support plan with agreed response times, regular patching and access reviews, backup restore drills and a practical data-protection checklist — with a monthly health report the management can read.",
    flow: [
      { step: "Onboard", detail: "Inventory of systems, vendors, access and backups" },
      { step: "Monitor and patch", detail: "Monitoring, security updates on a schedule" },
      { step: "Helpdesk", detail: "One number and WhatsApp for issues, with response times by severity" },
      { step: "Drills", detail: "Quarterly backup restore and downtime drills", human: true },
      { step: "Report", detail: "Monthly health and security report" },
    ],
    stack: ["Hospital management system", "Endpoint and server monitoring", "Backup and restore drills", "DPDP readiness checklist"],
    changes: [
      "Issues are logged and tracked to resolution with clear ownership",
      "Backups are proven to work before they are needed",
      "Management sees the state of IT in one monthly page",
    ],
    measures: ["Response and resolution times", "Patch compliance", "Restore drill results"],
    engagement: "Operate · onboarding, then a monthly plan",
  },
];

export function examplesFor(path: ServicePathId) {
  return EXAMPLES.filter((e) => e.path === path);
}

export function exampleBySlug(slug: string) {
  return EXAMPLES.find((e) => e.slug === slug);
}
