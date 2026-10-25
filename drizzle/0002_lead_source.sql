ALTER TABLE "app"."leads" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."leads" ALTER COLUMN "consent_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."leads" ADD COLUMN "source" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."leads" ADD COLUMN "source_note" text;--> statement-breakpoint
ALTER TABLE "app"."leads" ADD COLUMN "utm_source" text;--> statement-breakpoint
ALTER TABLE "app"."leads" ADD COLUMN "utm_medium" text;--> statement-breakpoint
ALTER TABLE "app"."leads" ADD COLUMN "utm_campaign" text;--> statement-breakpoint
ALTER TABLE "app"."leads" ADD COLUMN "utm_content" text;--> statement-breakpoint
ALTER TABLE "app"."leads" ADD COLUMN "utm_term" text;--> statement-breakpoint
ALTER TABLE "app"."leads" ADD COLUMN "referrer" text;--> statement-breakpoint
ALTER TABLE "app"."leads" ADD COLUMN "landing_path" text;--> statement-breakpoint
CREATE INDEX "leads_source_idx" ON "app"."leads" USING btree ("source");