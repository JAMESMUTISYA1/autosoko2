import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/adminGuard";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { roleId, status } = await request.json();
  const before = await db.businessMember.findUnique({
    where: { businessId_userId: { businessId: params.businessId, userId: params.userId } },
  });
  if (!before) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Membership not found" } }, { status: 404 });
  }

  if (roleId) {
    const role = await db.role.findFirst({ where: { id: roleId, scope: "business" } });
    if (!role) {
      return Response.json({ success: false, error: { code: "VALIDATION", message: "Unknown business role" } }, { status: 400 });
    }
  }
  if (status && !["active", "pending", "removed"].includes(status)) {
    return Response.json({ success: false, error: { code: "VALIDATION", message: "Invalid status" } }, { status: 400 });
  }

  const membership = await db.businessMember.update({
    where: { businessId_userId: { businessId: params.businessId, userId: params.userId } },
    data: { ...(roleId ? { roleId } : {}), ...(status ? { status } : {}) },
    select: {
      userId: true, status: true,
      user: { select: { id: true, fullName: true, email: true } },
      role: { select: { id: true, name: true } },
    },
  });

  await writeAuditLog({
    actorId: guard.adminId, action: "business.member_updated", entityType: "Business",
    entityId: params.businessId,
    before: { roleId: before.roleId, status: before.status },
    after: { roleId: membership.role.id, status: membership.status },
    request,
  });

  return Response.json({ success: true, data: membership });
}

export async function DELETE(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const before = await db.businessMember.findUnique({
    where: { businessId_userId: { businessId: params.businessId, userId: params.userId } },
  });
  if (!before) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Membership not found" } }, { status: 404 });
  }

  // Don't allow the last member (usually the owner) to be removed via this
  // route — that should go through deleting or transferring the business.
  const memberCount = await db.businessMember.count({ where: { businessId: params.businessId } });
  if (memberCount <= 1) {
    return Response.json(
      { success: false, error: { code: "CONFLICT", message: "Cannot remove the last member of a business — delete or transfer the business instead" } },
      { status: 409 }
    );
  }

  await db.businessMember.delete({
    where: { businessId_userId: { businessId: params.businessId, userId: params.userId } },
  });

  await writeAuditLog({
    actorId: guard.adminId, action: "business.member_removed", entityType: "Business",
    entityId: params.businessId, before, request,
  });

  return Response.json({ success: true });
}