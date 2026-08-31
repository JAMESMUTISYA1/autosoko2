import { db } from "@/lib/db";

// audit_logs is append-only by design (never updated or deleted) — every
// state-changing admin action calls this. `before`/`after` can be whole
// objects or small diffs; Json columns accept either.
export async function writeAuditLog({ actorId, action, entityType, entityId, before, after, request }) {
  const ipAddress =
    request?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() || null;

  await db.auditLog.create({
    data: { actorId, action, entityType, entityId, before, after, ipAddress },
  });
}