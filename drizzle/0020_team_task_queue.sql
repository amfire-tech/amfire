ALTER TABLE "app"."connector_tokens" ADD COLUMN "kind" text DEFAULT 'personal' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."connector_tokens" ADD COLUMN "task_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."connector_tokens" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."connector_tokens" ADD COLUMN "heartbeat_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."connector_tokens" ADD COLUMN "runner_info" jsonb;--> statement-breakpoint
ALTER TABLE "app"."hunt_requests" ADD COLUMN "type" text DEFAULT 'hunt' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."hunt_requests" ADD COLUMN "payload" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."hunt_requests" ADD COLUMN "priority" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."hunt_requests" ADD COLUMN "lease_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."hunt_requests" ADD COLUMN "fence" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."hunt_requests" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."hunt_requests" ADD COLUMN "max_attempts" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."hunt_requests" ADD COLUMN "next_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."hunt_requests" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."hunt_requests" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "app"."hunt_requests" ADD COLUMN "output" jsonb;--> statement-breakpoint
ALTER TABLE "app"."hunt_requests" ADD COLUMN "progress" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "hunt_requests_queue_idx" ON "app"."hunt_requests" USING btree ("status","type","priority");--> statement-breakpoint
ALTER TABLE "app"."hunt_requests" ADD CONSTRAINT "hunt_requests_idempotency_key_unique" UNIQUE("idempotency_key");