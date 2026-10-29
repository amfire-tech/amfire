CREATE TABLE "app"."outreach_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prospect_id" uuid NOT NULL,
	"to_email" text,
	"cc" text,
	"subject" text NOT NULL,
	"content" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"tested_version" integer,
	"test_sent_to" text,
	"test_sent_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"touch_id" uuid,
	"drafted_by" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."outreach_emails" ADD CONSTRAINT "outreach_emails_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "app"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."outreach_emails" ADD CONSTRAINT "outreach_emails_touch_id_touches_id_fk" FOREIGN KEY ("touch_id") REFERENCES "app"."touches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "outreach_emails_prospect_idx" ON "app"."outreach_emails" USING btree ("prospect_id","created_at");--> statement-breakpoint
ALTER TABLE "app"."outreach_emails" ENABLE ROW LEVEL SECURITY;