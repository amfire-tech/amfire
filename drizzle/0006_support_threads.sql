CREATE TABLE "app"."support_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"author_id" uuid,
	"from_staff" boolean DEFAULT false NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."support_messages" ADD CONSTRAINT "support_messages_request_id_support_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "app"."support_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."support_messages" ADD CONSTRAINT "support_messages_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."support_messages" ADD CONSTRAINT "support_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_messages_request_idx" ON "app"."support_messages" USING btree ("request_id");--> statement-breakpoint
ALTER TABLE "app"."support_messages" ENABLE ROW LEVEL SECURITY;
