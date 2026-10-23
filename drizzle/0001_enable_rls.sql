-- Row level security with no policies denies Supabase's Data API (anon key) all
-- access, should the "app" schema ever be exposed there; the app's server
-- connection (table owner) is unaffected.
ALTER TABLE "app"."agent_runs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."audit_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."leads" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."login_tokens" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."memberships" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."milestones" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."organizations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."project_updates" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."projects" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."proposals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."rate_limits" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."recommendations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."sessions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."support_requests" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."tasks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."users" ENABLE ROW LEVEL SECURITY;
