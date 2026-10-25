ALTER TABLE "app"."invoices" ADD COLUMN "place_of_supply" text;--> statement-breakpoint
ALTER TABLE "app"."invoices" ADD COLUMN "is_record" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."organizations" ADD COLUMN "billing_name" text;--> statement-breakpoint
ALTER TABLE "app"."organizations" ADD COLUMN "billing_address" text;--> statement-breakpoint
ALTER TABLE "app"."organizations" ADD COLUMN "gstin" text;--> statement-breakpoint
ALTER TABLE "app"."organizations" ADD COLUMN "state" text;