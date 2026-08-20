import { z } from "zod";
import { db } from "@/lib/db";
import { requirePlatformRole, forbidden } from "@/lib/auth/rbac";

const suspendSchema = z.object({
  targetType: z.enum(["seller", "agent"]),
  suspended: z.boolean(),
  reason: z.string().trim().min(3).optional(),
});

// PATCH /api/v1/admin/accounts/:id/suspend — admin only
export async function PATCH(request, { params }) {
  const { session, allowed } = await requirePlatformRole("admin");
  if (!allowed) return forbidden("Only admins can suspend accounts");

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR" } }, { status: 400 });
  }

  const parsed = suspendSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR", message: "reason is required to suspend" } }, { status: 400 });
  }
  const { targetType, suspended, reason } = parsed.data;

  if (suspended && !reason) {
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR", message: "A reason is required to suspend an account" } }, { status: 400 });
  }

  const status = suspended ? "suspended" : "active";

  if (targetType === "seller") {
    await db.business.update({ where: { id: params.id }, data: { status } });
  } else {
    await db.user.update({ where: { id: params.id }, data: { status } });
  }

  // Append-only accountability trail — Document 2's audit_logs table.
  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: suspended ? "account.suspend" : "account.reactivate",
      entityType: targetType,
      entityId: params.id,
      after: { status, reason },
    },
  });

  return Response.json({ success: true, data: { id: params.id, status } });
}
