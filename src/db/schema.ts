import {
  boolean,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Shared business records. The website, AMFIRE HQ and the Client Hub are three
// interfaces over these same tables — a lead never has to explain their
// problem twice after becoming a client.
// ---------------------------------------------------------------------------

// Everything lives in its own "app" schema so it can share a Supabase database
// with other apps without table-name clashes.
export const appSchema = pgSchema("app");

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

// --- Identity & organisations ----------------------------------------------

export const orgKind = appSchema.enum("org_kind", ["internal", "client"]);
export const memberRole = appSchema.enum("member_role", ["owner", "staff", "client_admin", "client_member"]);

export const organizations = appSchema.table("organizations", {
  id: id(),
  name: text("name").notNull(),
  kind: orgKind("kind").notNull(),
  /** Billing details printed on tax invoices. */
  billingName: text("billing_name"),
  billingAddress: text("billing_address"),
  gstin: text("gstin"),
  /** State for GST place of supply, e.g. "Maharashtra". */
  state: text("state"),
  createdAt: createdAt(),
});

export const users = appSchema.table("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

export const memberships = appSchema.table(
  "memberships",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.orgId] })],
);

export const loginTokens = appSchema.table("login_tokens", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const sessions = appSchema.table("sessions", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

// --- Leads & discovery -----------------------------------------------------

export const leadStatus = appSchema.enum("lead_status", [
  "new",
  "qualified",
  "disqualified",
  "proposal_sent",
  "won",
  "lost",
]);

export const leads = appSchema.table(
  "leads",
  {
    id: id(),
    /** Unguessable reference shown to the visitor after discovery. */
    publicRef: text("public_ref").notNull().unique(),
    status: leadStatus("status").notNull().default("new"),
    name: text("name").notNull(),
    /** Null only for leads added in HQ from a conversation, until someone asks for it. */
    email: text("email"),
    /** WhatsApp / phone for the free demo call. */
    phone: text("phone"),
    callTime: text("call_time"),
    company: text("company").notNull(),
    goal: text("goal").notNull(),
    businessType: text("business_type").notNull(),
    urgency: text("urgency").notNull(),
    teamSize: text("team_size"),
    problem: text("problem").notNull(),
    currentTools: text("current_tools"),
    /** Currency the visitor was viewing prices in when they booked: "INR" or "USD". */
    currency: text("currency").notNull().default("INR"),
    /** When the visitor consented on the discovery form. Null for leads added in HQ. */
    consentAt: timestamp("consent_at", { withTimezone: true }),
    /**
     * Where the lead came from (LEAD_SOURCES in lib/attribution.ts): the
     * visitor's first meaningful visit for form leads, or what staff chose when
     * adding one by hand. "unknown" for leads from before this was recorded.
     */
    source: text("source").notNull().default("unknown"),
    /** Staff note on the source, e.g. "DM after the Oct 21 post" or "referred by Rahul". */
    sourceNote: text("source_note"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    utmContent: text("utm_content"),
    utmTerm: text("utm_term"),
    /** Host of the referring site only, never the full URL. */
    referrer: text("referrer"),
    /** First page the visitor landed on, without its query string. */
    landingPath: text("landing_path"),
    qualificationScore: integer("qualification_score").notNull().default(0),
    qualificationNotes: text("qualification_notes"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    nextAction: text("next_action"),
    /** Expected deal value in minor units, set by staff; the latest proposal total is used when empty. */
    dealValue: integer("deal_value"),
    /** When someone should next contact this lead. The Sales agent drafts the follow-up. */
    nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
    clientOrgId: uuid("client_org_id").references(() => organizations.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("leads_status_idx").on(t.status), index("leads_source_idx").on(t.source)],
);

// --- Agent work ------------------------------------------------------------

export const agentRunStatus = appSchema.enum("agent_run_status", ["running", "succeeded", "failed"]);

/** Every agent invocation is recorded with its inputs, outputs and cost. */
export const agentRuns = appSchema.table("agent_runs", {
  id: id(),
  role: text("role").notNull(),
  engine: text("engine").notNull(), // "rules" | "gemini"
  model: text("model"),
  subjectType: text("subject_type").notNull(),
  subjectId: uuid("subject_id").notNull(),
  status: agentRunStatus("status").notNull().default("running"),
  input: jsonb("input").notNull(),
  output: jsonb("output"),
  error: text("error"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  /** Estimated cost in micro-dollars (1e-6 USD) to avoid float drift. */
  costMicroUsd: integer("cost_micro_usd"),
  triggeredBy: uuid("triggered_by").references(() => users.id),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const servicePath = appSchema.enum("service_path", ["build", "operate", "automate"]);
export const recommendationStatus = appSchema.enum("recommendation_status", ["proposed", "accepted", "rejected"]);

/** A recommendation is a proposal from an agent — never a commitment. */
export const recommendations = appSchema.table("recommendations", {
  id: id(),
  leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  agentRunId: uuid("agent_run_id").references(() => agentRuns.id),
  path: servicePath("path").notNull(),
  headline: text("headline").notNull(),
  summary: text("summary").notNull(),
  approach: jsonb("approach").$type<string[]>().notNull(),
  assumptions: jsonb("assumptions").$type<string[]>().notNull(),
  risks: jsonb("risks").$type<string[]>().notNull(),
  openQuestions: jsonb("open_questions").$type<string[]>().notNull(),
  size: text("size").notNull(), // "small" | "medium" | "large"
  status: recommendationStatus("status").notNull().default("proposed"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: createdAt(),
});

// --- Proposals -------------------------------------------------------------

export const proposalStatus = appSchema.enum("proposal_status", ["draft", "sent", "accepted", "declined", "withdrawn"]);

export type ProposalMilestone = {
  title: string;
  description: string;
  weeks: number;
  /** Amount in minor units (pence/cents). */
  amount: number;
};

export const proposals = appSchema.table("proposals", {
  id: id(),
  leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  recommendationId: uuid("recommendation_id").references(() => recommendations.id),
  clientOrgId: uuid("client_org_id").references(() => organizations.id),
  status: proposalStatus("status").notNull().default("draft"),
  path: servicePath("path").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  scope: jsonb("scope").$type<string[]>().notNull(),
  outOfScope: jsonb("out_of_scope").$type<string[]>().notNull(),
  assumptions: jsonb("assumptions").$type<string[]>().notNull(),
  milestones: jsonb("milestones").$type<ProposalMilestone[]>().notNull(),
  currency: text("currency").notNull(),
  /** Taken off the milestone total, in minor units — e.g. the free-demo offer. */
  discount: integer("discount").notNull().default(0),
  /** What the discount is, shown on the proposal: "Free-demo offer · DEMO5K-…". */
  discountNote: text("discount_note"),
  terms: text("terms").notNull(),
  /** Set when pricing falls below the guideline floor and the owner approved it anyway. */
  pricingOverrideNote: text("pricing_override_note"),
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  decidedBy: uuid("decided_by").references(() => users.id),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  clientNote: text("client_note"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// --- Delivery --------------------------------------------------------------

export const projectStatus = appSchema.enum("project_status", ["active", "on_hold", "completed"]);
export const milestoneStatus = appSchema.enum("milestone_status", [
  "not_started",
  "in_progress",
  "awaiting_approval",
  "blocked",
  "done",
]);
export const taskStatus = appSchema.enum("task_status", ["todo", "doing", "blocked", "done"]);

export const projects = appSchema.table("projects", {
  id: id(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  proposalId: uuid("proposal_id").references(() => proposals.id),
  name: text("name").notNull(),
  status: projectStatus("status").notNull().default("active"),
  /** Currency of the milestone amounts, from the accepted proposal. */
  currency: text("currency").notNull().default("INR"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
});

export const milestones = appSchema.table(
  "milestones",
  {
    id: id(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    dueDate: timestamp("due_date", { withTimezone: true }),
    status: milestoneStatus("status").notNull().default("not_started"),
    /** Plain-language reason shown to the client when blocked. */
    blockerNote: text("blocker_note"),
    /** When the milestone was last set ready for the client's approval. */
    readyAt: timestamp("ready_at", { withTimezone: true }),
    /** What the client asked to change instead of approving, and when. */
    clientFeedback: text("client_feedback"),
    clientFeedbackAt: timestamp("client_feedback_at", { withTimezone: true }),
    amount: integer("amount").notNull().default(0),
    approvedBy: uuid("approved_by").references(() => users.id),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("milestones_project_idx").on(t.projectId)],
);

export const tasks = appSchema.table("tasks", {
  id: id(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  milestoneId: uuid("milestone_id").notNull().references(() => milestones.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  title: text("title").notNull(),
  status: taskStatus("status").notNull().default("todo"),
  clientVisible: boolean("client_visible").notNull().default(true),
  createdAt: createdAt(),
});

export const projectUpdates = appSchema.table("project_updates", {
  id: id(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  authorId: uuid("author_id").references(() => users.id),
  body: text("body").notNull(),
  createdAt: createdAt(),
});

export const requestStatus = appSchema.enum("request_status", ["open", "resolved"]);

/** "Talk to a person" — always available to clients. */
export const supportRequests = appSchema.table("support_requests", {
  id: id(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  authorId: uuid("author_id").references(() => users.id),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: requestStatus("status").notNull().default("open"),
  createdAt: createdAt(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

/** A change the client asks for during a project. Accepted changes become milestones. */
export const changeRequestStatus = appSchema.enum("change_request_status", ["submitted", "estimated", "accepted", "declined"]);

export const changeRequests = appSchema.table("change_requests", {
  id: id(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").references(() => users.id),
  description: text("description").notNull(),
  status: changeRequestStatus("status").notNull().default("submitted"),
  /** Minor units, in the project's currency. Set by staff; priced by people, never by AI. */
  estimateAmount: integer("estimate_amount"),
  estimateWeeks: integer("estimate_weeks"),
  estimateNote: text("estimate_note"),
  estimatedBy: uuid("estimated_by").references(() => users.id),
  estimatedAt: timestamp("estimated_at", { withTimezone: true }),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  milestoneId: uuid("milestone_id").references(() => milestones.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const checklistStatus = appSchema.enum("checklist_status", ["open", "done"]);

/** "What we need from you": things the client must provide (logins, data, content) for work to continue. */
export const checklistItems = appSchema.table(
  "checklist_items",
  {
    id: id(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    title: text("title").notNull(),
    detail: text("detail"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    status: checklistStatus("status").notNull().default("open"),
    /** The client's note when they mark it done ("sent the price list by email"). */
    clientNote: text("client_note"),
    doneBy: uuid("done_by").references(() => users.id),
    doneAt: timestamp("done_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("checklist_project_idx").on(t.projectId)],
);

/** The client's rating after approving a milestone. Feeds the account health score. */
export const milestoneFeedback = appSchema.table("milestone_feedback", {
  id: id(),
  milestoneId: uuid("milestone_id").notNull().unique().references(() => milestones.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").references(() => users.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: createdAt(),
});

// --- Relationships -------------------------------------------------------------

export const interactionKind = appSchema.enum("interaction_kind", ["call", "whatsapp", "email", "linkedin", "meeting", "note"]);

/** Every conversation with a lead or client: logged by staff, or recorded when an approved message is sent. */
export const interactions = appSchema.table(
  "interactions",
  {
    id: id(),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    orgId: uuid("org_id").references(() => organizations.id),
    kind: interactionKind("kind").notNull(),
    /** "in" (they contacted us), "out" (we contacted them) or null for notes. */
    direction: text("direction"),
    summary: text("summary").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    authorId: uuid("author_id").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("interactions_lead_idx").on(t.leadId), index("interactions_org_idx").on(t.orgId)],
);

// --- Money -----------------------------------------------------------------------

export const invoiceStatus = appSchema.enum("invoice_status", ["draft", "sent", "paid", "void"]);
export const paymentMethod = appSchema.enum("payment_method", ["upi", "bank_transfer", "card", "cash", "razorpay", "other"]);
export const subscriptionStatus = appSchema.enum("subscription_status", ["active", "paused", "cancelled"]);

/** Monthly retainers (Operate plans). The source of MRR. */
export const subscriptions = appSchema.table("subscriptions", {
  id: id(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  /** Monthly amount before tax, in minor units. */
  amount: integer("amount").notNull(),
  currency: text("currency").notNull(),
  status: subscriptionStatus("status").notNull().default("active"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  nextInvoiceAt: timestamp("next_invoice_at", { withTimezone: true }).notNull(),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const invoices = appSchema.table(
  "invoices",
  {
    id: id(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    /** One invoice per milestone. */
    milestoneId: uuid("milestone_id").unique().references(() => milestones.id, { onDelete: "set null" }),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
    /** Sequential per year, e.g. AMF-2026-0007. */
    number: text("number").notNull().unique(),
    title: text("title").notNull(),
    currency: text("currency").notNull(),
    subtotal: integer("subtotal").notNull(),
    /** GST in basis points: 1800 = 18%. Zero for clients billed in US dollars. */
    taxRate: integer("tax_rate").notNull().default(0),
    tax: integer("tax").notNull().default(0),
    total: integer("total").notNull(),
    status: invoiceStatus("status").notNull().default("draft"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    /** Razorpay payment link, when Razorpay is configured. */
    paymentLinkUrl: text("payment_link_url"),
    /** The client's state when the invoice was sent; decides CGST + SGST or IGST. */
    placeOfSupply: text("place_of_supply"),
    /** A record of money received before AMFIRE HQ (e.g. a past project), not an invoice that was issued from here. */
    isRecord: boolean("is_record").notNull().default(false),
    sentBy: uuid("sent_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("invoices_org_idx").on(t.orgId), index("invoices_status_idx").on(t.status)],
);

export const payments = appSchema.table("payments", {
  id: id(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  amount: integer("amount").notNull(),
  method: paymentMethod("method").notNull(),
  /** UTR, cheque number or Razorpay payment id. Unique so a webhook can't record a payment twice. */
  reference: text("reference").unique(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  recordedBy: uuid("recorded_by").references(() => users.id),
  createdAt: createdAt(),
});

/** Hours spent on a project, so HQ can show the effective rate earned. */
export const timeEntries = appSchema.table("time_entries", {
  id: id(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  userId: uuid("user_id").references(() => users.id),
  minutes: integer("minutes").notNull(),
  note: text("note"),
  workedOn: timestamp("worked_on", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
});

// --- Company Brain: what agents share ---------------------------------------------

/**
 * A short, typed fact an agent posts for the others ("payment overdue",
 * "client went quiet"). Agents never call each other; they read signals.
 * Each team run posts a fresh set, linked to that run.
 */
export const signals = appSchema.table(
  "signals",
  {
    id: id(),
    teamRunId: uuid("team_run_id").notNull().references(() => agentRuns.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    kind: text("kind").notNull(),
    severity: text("severity").notNull(), // "info" | "warn" | "critical"
    subjectType: text("subject_type").notNull(),
    subjectId: uuid("subject_id").notNull(),
    orgId: uuid("org_id").references(() => organizations.id),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    summary: text("summary").notNull(),
    data: jsonb("data"),
    createdAt: createdAt(),
  },
  (t) => [index("signals_run_idx").on(t.teamRunId)],
);

/**
 * The dossier: facts about a lead or client, with where each came from.
 * A newer fact supersedes an older one instead of overwriting it.
 */
export const memories = appSchema.table(
  "memories",
  {
    id: id(),
    subjectType: text("subject_type").notNull(), // "lead" | "organization"
    subjectId: uuid("subject_id").notNull(),
    fact: text("fact").notNull(),
    /** "owner", "staff" or an agent role. */
    source: text("source").notNull(),
    confidence: integer("confidence").notNull().default(100),
    supersededBy: uuid("superseded_by"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("memories_subject_idx").on(t.subjectType, t.subjectId)],
);

export const approvalStatus = appSchema.enum("approval_status", ["pending", "approved", "rejected", "merged"]);

/** The decision inbox: everything an agent wants done that needs a person. */
export const approvals = appSchema.table(
  "approvals",
  {
    id: id(),
    role: text("role").notNull(),
    kind: text("kind").notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: uuid("subject_id").notNull(),
    orgId: uuid("org_id").references(() => organizations.id),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    /** Why the agent suggests this, in one or two sentences. */
    reason: text("reason").notNull(),
    /** "whatsapp" | "email" | "hub" | "linkedin" | "internal" */
    channel: text("channel").notNull(),
    recipientName: text("recipient_name"),
    recipient: text("recipient"),
    draft: text("draft").notNull(),
    finalText: text("final_text"),
    /** What approving does: the invoice to send, the project to post to, the point to merge… */
    data: jsonb("data").$type<ApprovalData>().notNull().default({}),
    status: approvalStatus("status").notNull().default("pending"),
    /** Stops the same suggestion being made twice in one period. */
    fingerprint: text("fingerprint").notNull().unique(),
    mergedInto: uuid("merged_into"),
    teamRunId: uuid("team_run_id").references(() => agentRuns.id, { onDelete: "set null" }),
    decidedBy: uuid("decided_by").references(() => users.id),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("approvals_status_idx").on(t.status)],
);

export type ApprovalData = {
  invoiceId?: string;
  projectId?: string;
  /** One sentence the Chief of Staff can fold into a combined message to the same person. */
  point?: string;
  href?: string;
};

/** When the owner edits a draft before approving it, both versions are kept so agents learn the owner's voice. */
export const draftEdits = appSchema.table("draft_edits", {
  id: id(),
  approvalId: uuid("approval_id").notNull().references(() => approvals.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  kind: text("kind").notNull(),
  original: text("original").notNull(),
  edited: text("edited").notNull(),
  createdAt: createdAt(),
});

export const agentSettings = appSchema.table("agent_settings", {
  role: text("role").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  /** Daily AI spend limit in micro-dollars; once reached the agent uses rules only. */
  dailyBudgetMicroUsd: integer("daily_budget_micro_usd").notNull().default(200_000),
  updatedAt: updatedAt(),
});

/** The Chief of Staff's brief, one per team run. */
export const briefs = appSchema.table("briefs", {
  id: id(),
  teamRunId: uuid("team_run_id").notNull().references(() => agentRuns.id, { onDelete: "cascade" }),
  headline: text("headline").notNull(),
  body: jsonb("body").$type<BriefBody>().notNull(),
  createdAt: createdAt(),
});

export type BriefBody = {
  sections: { title: string; lines: { text: string; href?: string }[] }[];
  teamActivity: string[];
  narrative?: string;
};

// --- Growth ------------------------------------------------------------------------

/** A LinkedIn (or other) post with its own tracked link, so leads can be traced to the post. */
export const contentPosts = appSchema.table("content_posts", {
  id: id(),
  title: text("title").notNull(),
  channel: text("channel").notNull().default("linkedin"),
  /** Tracked link: /go/{slug} → targetPath?utm_source={channel}&utm_content={slug} */
  slug: text("slug").notNull().unique(),
  targetPath: text("target_path").notNull().default("/start"),
  postUrl: text("post_url"),
  clicks: integer("clicks").notNull().default(0),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: createdAt(),
});

/** Outgoing notifications (the brief by email or WhatsApp), including ones skipped because a channel isn't set up. */
export const notifications = appSchema.table("notifications", {
  id: id(),
  channel: text("channel").notNull(),
  recipient: text("recipient"),
  subject: text("subject"),
  body: text("body").notNull(),
  status: text("status").notNull(), // "sent" | "failed" | "skipped"
  error: text("error"),
  /** Stops a once-a-period email (the weekly client digest) going out twice. */
  dedupeKey: text("dedupe_key").unique(),
  createdAt: createdAt(),
});

/** A conversation on a client's support request: the client and AMFIRE reply back and forth. */
export const supportMessages = appSchema.table(
  "support_messages",
  {
    id: id(),
    requestId: uuid("request_id").notNull().references(() => supportRequests.id, { onDelete: "cascade" }),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    authorId: uuid("author_id").references(() => users.id),
    /** True when written by AMFIRE staff. */
    fromStaff: boolean("from_staff").notNull().default(false),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("support_messages_request_idx").on(t.requestId)],
);

// --- Rate limits ---------------------------------------------------------------

/** Fixed-window counters shared by every server instance (serverless-safe). */
export const rateLimits = appSchema.table("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull().default(0),
});

// --- Audit -----------------------------------------------------------------

export const auditEvents = appSchema.table(
  "audit_events",
  {
    id: id(),
    actorId: uuid("actor_id").references(() => users.id),
    orgId: uuid("org_id").references(() => organizations.id),
    action: text("action").notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: uuid("subject_id"),
    data: jsonb("data"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_subject_idx").on(t.subjectType, t.subjectId)],
);

export type Lead = typeof leads.$inferSelect;
export type Recommendation = typeof recommendations.$inferSelect;
export type Proposal = typeof proposals.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type AgentRun = typeof agentRuns.$inferSelect;
export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Interaction = typeof interactions.$inferSelect;
export type Approval = typeof approvals.$inferSelect;
export type Signal = typeof signals.$inferSelect;
export type Memory = typeof memories.$inferSelect;
export type ChangeRequest = typeof changeRequests.$inferSelect;
export type ContentPost = typeof contentPosts.$inferSelect;
export type ChecklistItem = typeof checklistItems.$inferSelect;
export type ServicePath = (typeof servicePath.enumValues)[number];
export type MemberRole = (typeof memberRole.enumValues)[number];
