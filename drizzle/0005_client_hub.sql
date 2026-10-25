CREATE TYPE "app"."checklist_status" AS ENUM('open', 'done');--> statement-breakpoint
CREATE TABLE "app"."checklist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"title" text NOT NULL,
	"detail" text,
	"due_date" timestamp with time zone,
	"status" "app"."checklist_status" DEFAULT 'open' NOT NULL,
	"client_note" text,
	"done_by" uuid,
	"done_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."milestones" ADD COLUMN "client_feedback" text;--> statement-breakpoint
ALTER TABLE "app"."milestones" ADD COLUMN "client_feedback_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."notifications" ADD COLUMN "dedupe_key" text;--> statement-breakpoint
ALTER TABLE "app"."checklist_items" ADD CONSTRAINT "checklist_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checklist_items" ADD CONSTRAINT "checklist_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checklist_items" ADD CONSTRAINT "checklist_items_done_by_users_id_fk" FOREIGN KEY ("done_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checklist_items" ADD CONSTRAINT "checklist_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checklist_project_idx" ON "app"."checklist_items" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "app"."notifications" ADD CONSTRAINT "notifications_dedupe_key_unique" UNIQUE("dedupe_key");--> statement-breakpoint
ALTER TABLE "app"."checklist_items" ENABLE ROW LEVEL SECURITY;
