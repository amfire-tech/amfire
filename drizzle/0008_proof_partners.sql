CREATE TABLE "app"."demos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prospect_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"business_name" text NOT NULL,
	"greeting" text NOT NULL,
	"knowledge" text NOT NULL,
	"sample_questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"audit" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"chats" integer DEFAULT 0 NOT NULL,
	"first_viewed_at" timestamp with time zone,
	"last_viewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "demos_prospect_id_unique" UNIQUE("prospect_id"),
	CONSTRAINT "demos_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "app"."response_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prospect_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"sent_at" timestamp with time zone NOT NULL,
	"replied_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."prospects" ADD COLUMN "referral_post_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."demos" ADD CONSTRAINT "demos_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "app"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."response_tests" ADD CONSTRAINT "response_tests_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "app"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "response_tests_prospect_idx" ON "app"."response_tests" USING btree ("prospect_id");--> statement-breakpoint
ALTER TABLE "app"."prospects" ADD CONSTRAINT "prospects_referral_post_id_content_posts_id_fk" FOREIGN KEY ("referral_post_id") REFERENCES "app"."content_posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."demos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."response_tests" ENABLE ROW LEVEL SECURITY;
