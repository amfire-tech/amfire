CREATE TYPE "app"."approval_status" AS ENUM('pending', 'approved', 'rejected', 'merged');--> statement-breakpoint
CREATE TYPE "app"."change_request_status" AS ENUM('submitted', 'estimated', 'accepted', 'declined');--> statement-breakpoint
CREATE TYPE "app"."interaction_kind" AS ENUM('call', 'whatsapp', 'email', 'linkedin', 'meeting', 'note');--> statement-breakpoint
CREATE TYPE "app"."invoice_status" AS ENUM('draft', 'sent', 'paid', 'void');--> statement-breakpoint
CREATE TYPE "app"."payment_method" AS ENUM('upi', 'bank_transfer', 'card', 'cash', 'razorpay', 'other');--> statement-breakpoint
CREATE TYPE "app"."subscription_status" AS ENUM('active', 'paused', 'cancelled');--> statement-breakpoint
CREATE TABLE "app"."agent_settings" (
	"role" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"daily_budget_micro_usd" integer DEFAULT 200000 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" text NOT NULL,
	"kind" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"org_id" uuid,
	"lead_id" uuid,
	"title" text NOT NULL,
	"reason" text NOT NULL,
	"channel" text NOT NULL,
	"recipient_name" text,
	"recipient" text,
	"draft" text NOT NULL,
	"final_text" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "app"."approval_status" DEFAULT 'pending' NOT NULL,
	"fingerprint" text NOT NULL,
	"merged_into" uuid,
	"team_run_id" uuid,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approvals_fingerprint_unique" UNIQUE("fingerprint")
);
--> statement-breakpoint
CREATE TABLE "app"."briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_run_id" uuid NOT NULL,
	"headline" text NOT NULL,
	"body" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."change_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"author_id" uuid,
	"description" text NOT NULL,
	"status" "app"."change_request_status" DEFAULT 'submitted' NOT NULL,
	"estimate_amount" integer,
	"estimate_weeks" integer,
	"estimate_note" text,
	"estimated_by" uuid,
	"estimated_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"milestone_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."content_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"channel" text DEFAULT 'linkedin' NOT NULL,
	"slug" text NOT NULL,
	"target_path" text DEFAULT '/start' NOT NULL,
	"post_url" text,
	"clicks" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "app"."draft_edits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"approval_id" uuid NOT NULL,
	"role" text NOT NULL,
	"kind" text NOT NULL,
	"original" text NOT NULL,
	"edited" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"org_id" uuid,
	"kind" "app"."interaction_kind" NOT NULL,
	"direction" text,
	"summary" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"author_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"project_id" uuid,
	"milestone_id" uuid,
	"subscription_id" uuid,
	"number" text NOT NULL,
	"title" text NOT NULL,
	"currency" text NOT NULL,
	"subtotal" integer NOT NULL,
	"tax_rate" integer DEFAULT 0 NOT NULL,
	"tax" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"status" "app"."invoice_status" DEFAULT 'draft' NOT NULL,
	"issued_at" timestamp with time zone,
	"due_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"payment_link_url" text,
	"sent_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_milestone_id_unique" UNIQUE("milestone_id"),
	CONSTRAINT "invoices_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "app"."memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"fact" text NOT NULL,
	"source" text NOT NULL,
	"confidence" integer DEFAULT 100 NOT NULL,
	"superseded_by" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."milestone_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"milestone_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"author_id" uuid,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "milestone_feedback_milestone_id_unique" UNIQUE("milestone_id")
);
--> statement-breakpoint
CREATE TABLE "app"."notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" text NOT NULL,
	"recipient" text,
	"subject" text,
	"body" text NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"method" "app"."payment_method" NOT NULL,
	"reference" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "app"."signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_run_id" uuid NOT NULL,
	"role" text NOT NULL,
	"kind" text NOT NULL,
	"severity" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"org_id" uuid,
	"lead_id" uuid,
	"summary" text NOT NULL,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"project_id" uuid,
	"title" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"status" "app"."subscription_status" DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_invoice_at" timestamp with time zone NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."time_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid,
	"minutes" integer NOT NULL,
	"note" text,
	"worked_on" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."leads" ADD COLUMN "deal_value" integer;--> statement-breakpoint
ALTER TABLE "app"."leads" ADD COLUMN "next_follow_up_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."milestones" ADD COLUMN "ready_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."approvals" ADD CONSTRAINT "approvals_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."approvals" ADD CONSTRAINT "approvals_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "app"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."approvals" ADD CONSTRAINT "approvals_team_run_id_agent_runs_id_fk" FOREIGN KEY ("team_run_id") REFERENCES "app"."agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."approvals" ADD CONSTRAINT "approvals_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."briefs" ADD CONSTRAINT "briefs_team_run_id_agent_runs_id_fk" FOREIGN KEY ("team_run_id") REFERENCES "app"."agent_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."change_requests" ADD CONSTRAINT "change_requests_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."change_requests" ADD CONSTRAINT "change_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."change_requests" ADD CONSTRAINT "change_requests_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."change_requests" ADD CONSTRAINT "change_requests_estimated_by_users_id_fk" FOREIGN KEY ("estimated_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."change_requests" ADD CONSTRAINT "change_requests_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "app"."milestones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."content_posts" ADD CONSTRAINT "content_posts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."draft_edits" ADD CONSTRAINT "draft_edits_approval_id_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "app"."approvals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."interactions" ADD CONSTRAINT "interactions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "app"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."interactions" ADD CONSTRAINT "interactions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."interactions" ADD CONSTRAINT "interactions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."invoices" ADD CONSTRAINT "invoices_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."invoices" ADD CONSTRAINT "invoices_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."invoices" ADD CONSTRAINT "invoices_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "app"."milestones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."invoices" ADD CONSTRAINT "invoices_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "app"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."invoices" ADD CONSTRAINT "invoices_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."memories" ADD CONSTRAINT "memories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."milestone_feedback" ADD CONSTRAINT "milestone_feedback_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "app"."milestones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."milestone_feedback" ADD CONSTRAINT "milestone_feedback_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."milestone_feedback" ADD CONSTRAINT "milestone_feedback_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."milestone_feedback" ADD CONSTRAINT "milestone_feedback_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "app"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payments" ADD CONSTRAINT "payments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payments" ADD CONSTRAINT "payments_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."signals" ADD CONSTRAINT "signals_team_run_id_agent_runs_id_fk" FOREIGN KEY ("team_run_id") REFERENCES "app"."agent_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."signals" ADD CONSTRAINT "signals_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."signals" ADD CONSTRAINT "signals_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "app"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."subscriptions" ADD CONSTRAINT "subscriptions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."subscriptions" ADD CONSTRAINT "subscriptions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."time_entries" ADD CONSTRAINT "time_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."time_entries" ADD CONSTRAINT "time_entries_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."time_entries" ADD CONSTRAINT "time_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "approvals_status_idx" ON "app"."approvals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "interactions_lead_idx" ON "app"."interactions" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "interactions_org_idx" ON "app"."interactions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "invoices_org_idx" ON "app"."invoices" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "app"."invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "memories_subject_idx" ON "app"."memories" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "signals_run_idx" ON "app"."signals" USING btree ("team_run_id");--> statement-breakpoint
ALTER TABLE "app"."agent_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."approvals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."briefs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."change_requests" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."content_posts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."draft_edits" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."interactions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."invoices" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."memories" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."milestone_feedback" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."notifications" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."payments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."signals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."subscriptions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."time_entries" ENABLE ROW LEVEL SECURITY;
