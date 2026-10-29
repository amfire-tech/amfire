CREATE TABLE "app"."buying_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prospect_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"detail" text,
	"source_url" text,
	"observed_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"confidence" double precision DEFAULT 0.8 NOT NULL,
	"found_by" text DEFAULT 'claude' NOT NULL,
	"dedupe_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."engine_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prospect_id" uuid NOT NULL,
	"signal_id" uuid,
	"touch_id" uuid,
	"kind" text NOT NULL,
	"note" text,
	"given_by" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."engine_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trigger" text NOT NULL,
	"prospects_scored" integer DEFAULT 0 NOT NULL,
	"touches_read" integer DEFAULT 0 NOT NULL,
	"changes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"insights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."engine_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"segment" text NOT NULL,
	"dimension" text NOT NULL,
	"key" text NOT NULL,
	"trials" double precision DEFAULT 0 NOT NULL,
	"successes" double precision DEFAULT 0 NOT NULL,
	"meetings" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"weight" double precision NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."prospect_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prospect_id" uuid NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"role" text DEFAULT 'decision_maker' NOT NULL,
	"phone" text,
	"email" text,
	"linkedin_url" text,
	"source_url" text,
	"notes" text,
	"do_not_contact" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."prospects" ADD COLUMN "facts" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."prospects" ADD COLUMN "pincode" text;--> statement-breakpoint
ALTER TABLE "app"."prospects" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "app"."prospects" ADD COLUMN "lng" double precision;--> statement-breakpoint
ALTER TABLE "app"."prospects" ADD COLUMN "score_parts" jsonb;--> statement-breakpoint
ALTER TABLE "app"."prospects" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "app"."prospects" ADD COLUMN "scored_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."prospects" ADD COLUMN "asset_url" text;--> statement-breakpoint
ALTER TABLE "app"."prospects" ADD COLUMN "play" text;--> statement-breakpoint
ALTER TABLE "app"."prospects" ADD COLUMN "play_step" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."prospects" ADD COLUMN "play_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."prospects" ADD COLUMN "play_ended_reason" text;--> statement-breakpoint
ALTER TABLE "app"."touches" ADD COLUMN "contact_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."touches" ADD COLUMN "signal_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."touches" ADD COLUMN "play" text;--> statement-breakpoint
ALTER TABLE "app"."touches" ADD COLUMN "play_step" integer;--> statement-breakpoint
ALTER TABLE "app"."touches" ADD COLUMN "variant" text;--> statement-breakpoint
ALTER TABLE "app"."buying_signals" ADD CONSTRAINT "buying_signals_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "app"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."engine_feedback" ADD CONSTRAINT "engine_feedback_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "app"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."engine_feedback" ADD CONSTRAINT "engine_feedback_signal_id_buying_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "app"."buying_signals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."engine_feedback" ADD CONSTRAINT "engine_feedback_touch_id_touches_id_fk" FOREIGN KEY ("touch_id") REFERENCES "app"."touches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."prospect_contacts" ADD CONSTRAINT "prospect_contacts_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "app"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "buying_signals_prospect_idx" ON "app"."buying_signals" USING btree ("prospect_id");--> statement-breakpoint
CREATE UNIQUE INDEX "buying_signals_dedupe_idx" ON "app"."buying_signals" USING btree ("prospect_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "engine_feedback_prospect_idx" ON "app"."engine_feedback" USING btree ("prospect_id");--> statement-breakpoint
CREATE UNIQUE INDEX "engine_stats_key_idx" ON "app"."engine_stats" USING btree ("segment","dimension","key");--> statement-breakpoint
CREATE INDEX "prospect_contacts_prospect_idx" ON "app"."prospect_contacts" USING btree ("prospect_id");--> statement-breakpoint
ALTER TABLE "app"."touches" ADD CONSTRAINT "touches_contact_id_prospect_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "app"."prospect_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."touches" ADD CONSTRAINT "touches_signal_id_buying_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "app"."buying_signals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."buying_signals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."prospect_contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."engine_feedback" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."engine_stats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."engine_runs" ENABLE ROW LEVEL SECURITY;
