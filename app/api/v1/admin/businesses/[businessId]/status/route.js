import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/adminGuard";
import { writeAuditLog } from "@/lib/audit";

const VALID_STATUSES = new Set(["active", "suspended", "banned"]);

export async function PATCH(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { status } = await request.json();
  if (!VALID_STATUSES.has(status)) {
    return Response.json({ success: false, error: { code: "VALIDATION", message: "status must be active, suspended, or banned" } }, { status: 400 });
  }

  const before = await db.business.findUnique({ where: { id: params.businessId } });
  if (!before) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Business not found" } }, { status: 404 });
  }

  const business = await db.business.update({ where: { id: params.businessId }, data: { status } });

  await writeAuditLog({
    actorId: guard.adminId, action: "business.status_changed", entityType: "Business",
    entityId: business.id, before: { status: before.status }, after: { status: business.status }, request,
  });

  return Response.json({ success: true, data: business });
}