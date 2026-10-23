import type { DB } from "@/db";
import { auditEvents } from "@/db/schema";

type AuditInput = {
  actorId?: string | null;
  orgId?: string | null;
  action: string;
  subjectType: string;
  subjectId?: string | null;
  data?: Record<string, unknown>;
};

/** Append-only record of who did what. Call inside the same transaction as the change. */
export async function audit(db: Pick<DB, "insert">, event: AuditInput) {
  await db.insert(auditEvents).values({
    actorId: event.actorId ?? null,
    orgId: event.orgId ?? null,
    action: event.action,
    subjectType: event.subjectType,
    subjectId: event.subjectId ?? null,
    data: event.data ?? null,
  });
}
