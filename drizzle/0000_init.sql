CREATE SCHEMA "app";
--> statement-breakpoint
CREATE TYPE "app"."agent_run_status" AS ENUM('running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "app"."lead_status" AS ENUM('new', 'qualified', 'disqualified', 'proposal_sent', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "app"."member_role" AS ENUM('owner', 'staff', 'client_admin', 'client_member');--> statement-breakpoint
CREATE TYPE "app"."milestone_status" AS ENUM('not_started', 'in_progress', 'awaiting_approval', 'blocked', 'done');--> statement-breakpoint
CREATE TYPE "app"."org_kind" AS ENUM('internal', 'client');--> statement-breakpoint
CREATE TYPE "app"."project_status" AS ENUM('active', 'on_hold', 'completed');--> statement-breakpoint
CREATE TYPE "app"."proposal_status" AS ENUM('draft', 'sent', 'accepted', 'declined', 'withdrawn');--> statement-breakpoint
CREATE TYPE "app"."recommendation_status" AS ENUM('proposed', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "app"."request_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TYPE "app"."service_path" AS ENUM('build', 'operate', 'automate');--> statement-breakpoint
CREATE TYPE "app"."task_status" AS ENUM('todo', 'doing', 'blocked', 'done');--> statement-breakpoint
CREATE TABLE "app"."agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" text NOT NULL,
	"engine" text NOT NULL,
	"model" text,
	"subject_type" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"status" "app"."agent_run_status" DEFAULT 'running' NOT NULL,
	"input" jsonb NOT NULL,
	"output" jsonb,
	"error" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_micro_usd" integer,
	"triggered_by" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app"."audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"org_id" uuid,
	"action" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_ref" text NOT NULL,
	"status" "app"."lead_status" DEFAULT 'new' NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"call_time" text,
	"company" text NOT NULL,
	"goal" text NOT NULL,
	"business_type" text NOT NULL,
	"urgency" text NOT NULL,
	"team_size" text,
	"problem" text NOT NULL,
	"current_tools" text,
	"currency" text DEFAULT 'INR' NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"qualification_score" integer DEFAULT 0 NOT NULL,
	"qualification_notes" text,
	"reviewed_at" timestamp with time zone,
	"next_action" text,
	"client_org_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_public_ref_unique" UNIQUE("public_ref")
);
--> statement-breakpoint
CREATE TABLE "app"."login_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "login_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "app"."memberships" (
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"role" "app"."member_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_user_id_org_id_pk" PRIMARY KEY("user_id","org_id")
);
--> statement-breakpoint
CREATE TABLE "app"."milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"due_date" timestamp with time zone,
	"status" "app"."milestone_status" DEFAULT 'not_started' NOT NULL,
	"blocker_note" text,
	"amount" integer DEFAULT 0 NOT NULL,
	"approved_by" uuid,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app"."organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" "app"."org_kind" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."project_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"author_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"proposal_id" uuid,
	"name" text NOT NULL,
	"status" "app"."project_status" DEFAULT 'active' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"recommendation_id" uuid,
	"client_org_id" uuid,
	"status" "app"."proposal_status" DEFAULT 'draft' NOT NULL,
	"path" "app"."service_path" NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"scope" jsonb NOT NULL,
	"out_of_scope" jsonb NOT NULL,
	"assumptions" jsonb NOT NULL,
	"milestones" jsonb NOT NULL,
	"currency" text NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"discount_note" text,
	"terms" text NOT NULL,
	"pricing_override_note" text,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"client_note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"agent_run_id" uuid,
	"path" "app"."service_path" NOT NULL,
	"headline" text NOT NULL,
	"summary" text NOT NULL,
	"approach" jsonb NOT NULL,
	"assumptions" jsonb NOT NULL,
	"risks" jsonb NOT NULL,
	"open_questions" jsonb NOT NULL,
	"size" text NOT NULL,
	"status" "app"."recommendation_status" DEFAULT 'proposed' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "app"."support_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"project_id" uuid,
	"author_id" uuid,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" "app"."request_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app"."tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"milestone_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" "app"."task_status" DEFAULT 'todo' NOT NULL,
	"client_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "app"."agent_runs" ADD CONSTRAINT "agent_runs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."audit_events" ADD CONSTRAINT "audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."audit_events" ADD CONSTRAINT "audit_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."leads" ADD CONSTRAINT "leads_client_org_id_organizations_id_fk" FOREIGN KEY ("client_org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."login_tokens" ADD CONSTRAINT "login_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."memberships" ADD CONSTRAINT "memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."milestones" ADD CONSTRAINT "milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."milestones" ADD CONSTRAINT "milestones_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."milestones" ADD CONSTRAINT "milestones_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."project_updates" ADD CONSTRAINT "project_updates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."project_updates" ADD CONSTRAINT "project_updates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."project_updates" ADD CONSTRAINT "project_updates_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."projects" ADD CONSTRAINT "projects_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."projects" ADD CONSTRAINT "projects_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "app"."proposals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."proposals" ADD CONSTRAINT "proposals_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "app"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."proposals" ADD CONSTRAINT "proposals_recommendation_id_recommendations_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "app"."recommendations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."proposals" ADD CONSTRAINT "proposals_client_org_id_organizations_id_fk" FOREIGN KEY ("client_org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."proposals" ADD CONSTRAINT "proposals_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."proposals" ADD CONSTRAINT "proposals_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."proposals" ADD CONSTRAINT "proposals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."recommendations" ADD CONSTRAINT "recommendations_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "app"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."recommendations" ADD CONSTRAINT "recommendations_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "app"."agent_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."recommendations" ADD CONSTRAINT "recommendations_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."support_requests" ADD CONSTRAINT "support_requests_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."support_requests" ADD CONSTRAINT "support_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."support_requests" ADD CONSTRAINT "support_requests_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."tasks" ADD CONSTRAINT "tasks_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "app"."milestones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."tasks" ADD CONSTRAINT "tasks_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_subject_idx" ON "app"."audit_events" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "app"."leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "milestones_project_idx" ON "app"."milestones" USING btree ("project_id");