CREATE TABLE "app"."connector_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"token_hash" text NOT NULL,
	"hint" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connector_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "app"."hunt_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"segment" text NOT NULL,
	"place" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"count" integer DEFAULT 25 NOT NULL,
	"brief" text,
	"assigned_to" uuid,
	"requested_by" uuid,
	"status" text DEFAULT 'queued' NOT NULL,
	"claimed_by" uuid,
	"claimed_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"result" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."connector_tokens" ADD CONSTRAINT "connector_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."hunt_requests" ADD CONSTRAINT "hunt_requests_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "app"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."hunt_requests" ADD CONSTRAINT "hunt_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "app"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."hunt_requests" ADD CONSTRAINT "hunt_requests_claimed_by_users_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "app"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hunt_requests_status_idx" ON "app"."hunt_requests" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "app"."connector_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."hunt_requests" ENABLE ROW LEVEL SECURITY;
