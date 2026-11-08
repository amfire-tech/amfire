ALTER TABLE "app"."prospects" ADD COLUMN "link_token" text DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 12) NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."prospects" ADD COLUMN "link_opens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."prospects" ADD COLUMN "link_first_opened_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."prospects" ADD COLUMN "link_last_opened_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."prospects" ADD CONSTRAINT "prospects_link_token_unique" UNIQUE("link_token");