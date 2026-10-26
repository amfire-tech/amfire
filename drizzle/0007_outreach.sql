CREATE TYPE "app"."prospect_status" AS ENUM('to_contact', 'trying', 'talking', 'meeting', 'lead', 'partner', 'not_now', 'dropped');--> statement-breakpoint
CREATE TYPE "app"."touch_channel" AS ENUM('call', 'whatsapp', 'email', 'linkedin', 'visit', 'note');--> statement-breakpoint
CREATE TABLE "app"."outreach_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"author" text DEFAULT 'claude' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."prospects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"contact_role" text,
	"phone" text,
	"email" text,
	"website" text,
	"linkedin_url" text,
	"maps_url" text,
	"city" text DEFAULT 'Pune' NOT NULL,
	"area" text,
	"industry" text,
	"kind" text DEFAULT 'business' NOT NULL,
	"tier" text DEFAULT 'C' NOT NULL,
	"score" integer DEFAULT 50 NOT NULL,
	"signal" text,
	"brief" text,
	"opener" text,
	"status" "app"."prospect_status" DEFAULT 'to_contact' NOT NULL,
	"status_reason" text,
	"do_not_contact" boolean DEFAULT false NOT NULL,
	"next_follow_up_at" timestamp with time zone,
	"missed_calls" integer DEFAULT 0 NOT NULL,
	"last_touch_at" timestamp with time zone,
	"lead_id" uuid,
	"source" text DEFAULT 'owner' NOT NULL,
	"source_url" text,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."touches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prospect_id" uuid NOT NULL,
	"channel" "app"."touch_channel" NOT NULL,
	"outcome" text NOT NULL,
	"objection" text,
	"note" text,
	"duration_sec" integer,
	"recording_ref" text,
	"transcript" text,
	"analysis" jsonb,
	"logged_by" text DEFAULT 'owner' NOT NULL,
	"author_id" uuid,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."prospects" ADD CONSTRAINT "prospects_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "app"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."prospects" ADD CONSTRAINT "prospects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."touches" ADD CONSTRAINT "touches_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "app"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."touches" ADD CONSTRAINT "touches_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "outreach_notes_kind_idx" ON "app"."outreach_notes" USING btree ("kind","created_at");--> statement-breakpoint
CREATE INDEX "prospects_status_idx" ON "app"."prospects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "prospects_follow_up_idx" ON "app"."prospects" USING btree ("next_follow_up_at");--> statement-breakpoint
CREATE INDEX "prospects_phone_idx" ON "app"."prospects" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "touches_prospect_idx" ON "app"."touches" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "touches_occurred_idx" ON "app"."touches" USING btree ("occurred_at");--> statement-breakpoint
ALTER TABLE "app"."prospects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."touches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."outreach_notes" ENABLE ROW LEVEL SECURITY;
