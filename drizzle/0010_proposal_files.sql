CREATE TABLE "app"."proposal_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"name" text NOT NULL,
	"size" integer NOT NULL,
	"content" "bytea" NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proposal_files_proposal_id_unique" UNIQUE("proposal_id")
);
--> statement-breakpoint
ALTER TABLE "app"."proposals" ADD COLUMN "monthly_starts_on" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."proposal_files" ADD CONSTRAINT "proposal_files_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "app"."proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."proposal_files" ADD CONSTRAINT "proposal_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;