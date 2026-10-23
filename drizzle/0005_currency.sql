ALTER TABLE "leads" ADD COLUMN "currency" text DEFAULT 'INR' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "currency" text DEFAULT 'INR' NOT NULL;--> statement-breakpoint
-- Existing projects take the currency of the proposal they were created from.
UPDATE "projects" SET "currency" = "proposals"."currency" FROM "proposals" WHERE "projects"."proposal_id" = "proposals"."id";
