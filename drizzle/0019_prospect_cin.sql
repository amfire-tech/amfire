ALTER TABLE "app"."prospects" ADD COLUMN "cin" text;--> statement-breakpoint
ALTER TABLE "app"."prospects" ADD CONSTRAINT "prospects_cin_unique" UNIQUE("cin");