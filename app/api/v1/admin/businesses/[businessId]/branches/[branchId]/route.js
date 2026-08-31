import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/adminGuard";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const before = await db.businessBranch.findFirst({ where: { id: params.branchId, businessId: params.businessId } });
  if (!before) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Branch not found" } }, { status: 404 });
  }

  const { name, address, townId, latitude, longitude, phone, openingHours, isPrimary } = await request.json();

  const branch = await db.$transaction(async (tx) => {
    if (isPrimary) {
      await tx.businessBranch.updateMany({
        where: { businessId: params.businessId, NOT: { id: params.branchId } },
        data: { isPrimary: false },
      });
    }
    return tx.businessBranch.update({
      where: { id: params.branchId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(townId !== undefined ? { townId } : {}),
        ...(latitude !== undefined ? { latitude } : {}),
        ...(longitude !== undefined ? { longitude } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(openingHours !== undefined ? { openingHours } : {}),
        ...(isPrimary !== undefined ? { isPrimary: Boolean(isPrimary) } : {}),
      },
    });
  });

  await writeAuditLog({
    actorId: guard.adminId, action: "business.branch_updated", entityType: "Business",
    entityId: params.businessId, before, after: branch, request,
  });

  return Response.json({ success: true, data: branch });
}

export async function DELETE(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const before = await db.businessBranch.findFirst({ where: { id: params.branchId, businessId: params.businessId } });
  if (!before) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Branch not found" } }, { status: 404 });
  }

  await db.businessBranch.delete({ where: { id: params.branchId } });

  await writeAuditLog({
    actorId: guard.adminId, action: "business.branch_removed", entityType: "Business",
    entityId: params.businessId, before, request,
  });

  return Response.json({ success: true });
}