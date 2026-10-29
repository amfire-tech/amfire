// Authorisation lives on the server and is derived from database memberships —
// never from the client, the URL or an AI response.

import { eq } from "drizzle-orm";
import type { DB } from "@/db";
import { memberships, organizations, type MemberRole } from "@/db/schema";

export type Actor = {
  userId: string;
  email: string;
  name: string;
  internalRole: "owner" | "staff" | null;
  /** Client organisations this user belongs to. */
  clientOrgIds: string[];
  /** Signed in with a one-time password and hasn't chosen their own yet. */
  mustChangePassword?: boolean;
};

export class AccessDenied extends Error {
  constructor(message = "You don't have access to this.") {
    super(message);
    this.name = "AccessDenied";
  }
}

export async function loadActor(db: DB, user: { id: string; email: string; name: string; mustChangePassword?: boolean }): Promise<Actor> {
  const rows = await db
    .select({ orgId: memberships.orgId, role: memberships.role, kind: organizations.kind })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.orgId))
    .where(eq(memberships.userId, user.id));

  let internalRole: Actor["internalRole"] = null;
  const clientOrgIds: string[] = [];
  for (const row of rows) {
    if (row.kind === "internal" && isInternalRole(row.role)) {
      internalRole = internalRole === "owner" ? "owner" : row.role;
    } else if (row.kind === "client") {
      clientOrgIds.push(row.orgId);
    }
  }
  return { userId: user.id, email: user.email, name: user.name, internalRole, clientOrgIds, mustChangePassword: user.mustChangePassword ?? false };
}

function isInternalRole(role: MemberRole): role is "owner" | "staff" {
  return role === "owner" || role === "staff";
}

export function isStaff(actor: Actor | null): boolean {
  return !!actor?.internalRole;
}

export function assertStaff(actor: Actor | null): asserts actor is Actor & { internalRole: "owner" | "staff" } {
  if (!actor?.internalRole) throw new AccessDenied();
}

/** Commercial commitments (sending quotes, pricing overrides) need the owner. */
export function assertOwner(actor: Actor | null): asserts actor is Actor & { internalRole: "owner" } {
  if (actor?.internalRole !== "owner") throw new AccessDenied("Only the owner can approve commercial commitments.");
}

export function assertClientOrg(actor: Actor | null, orgId: string): asserts actor is Actor {
  if (!actor || !actor.clientOrgIds.includes(orgId)) throw new AccessDenied();
}
