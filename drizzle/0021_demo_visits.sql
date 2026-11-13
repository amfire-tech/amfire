CREATE TABLE "app"."demo_visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prospect_id" uuid,
	"visitor_id" text,
	"page" text DEFAULT 'demo' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"active_seconds" integer DEFAULT 0 NOT NULL,
	"views" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"device" text,
	"city" text,
	"region" text,
	"country" text,
	"referrer" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."prospects" ADD COLUMN "demo_visits" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."prospects" ADD COLUMN "demo_first_visit_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."prospects" ADD COLUMN "demo_last_visit_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."demo_visits" ADD CONSTRAINT "demo_visits_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "app"."prospects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "demo_visits_prospect_idx" ON "app"."demo_visits" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "demo_visits_started_idx" ON "app"."demo_visits" USING btree ("started_at");--> statement-breakpoint
ALTER TABLE "app"."demo_visits" ENABLE ROW LEVEL SECURITY;