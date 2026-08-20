import { z } from "zod";
import { db } from "@/lib/db";
import { requirePlatformRole, forbidden } from "@/lib/auth/rbac";

const statusSchema = z.object({ status: z.enum(["approved", "rejected", "paid"]) });

// PATCH /api/v1/admin/withdrawals/:id
export async function PATCH(request, { params }) {
  const { session, allowed } = await requirePlatformRole("admin");
  if (!allowed) return forbidden();

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR" } }, { status: 400 });
  }
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR" } }, { status: 400 });
  }

  const withdrawal = await db.withdrawalRequest.update({
    where: { id: params.id },
    data: { status: parsed.data.status, processedBy: session.user.id, processedAt: new Date() },
    select: { id: true, status: true, business: { select: { name: true } } },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: `withdrawal.${parsed.data.status}`,
      entityType: "withdrawal_request",
      entityId: withdrawal.id,
    },
  });

  return Response.json({ success: true, data: withdrawal });
}
