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
    email: text("email").notNull(),
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
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    qualificationScore: integer("qualification_score").notNull().default(0),
    qualificationNotes: text("qualification_notes"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    nextAction: text("next_action"),
    clientOrgId: uuid("client_org_id").references(() => organizations.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("leads_status_idx").on(t.status)],
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
export type ServicePath = (typeof servicePath.enumValues)[number];
export type MemberRole = (typeof memberRole.enumValues)[number];
