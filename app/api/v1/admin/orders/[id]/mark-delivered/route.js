import { db } from "@/lib/db";
import { requirePlatformRole, forbidden } from "@/lib/auth/rbac";

// PATCH /api/v1/admin/orders/:id/mark-delivered
export async function PATCH(request, { params }) {
  const { session, allowed } = await requirePlatformRole("agent");
  if (!allowed) return forbidden();

  const existing = await db.order.findUnique({ where: { id: params.id }, select: { paymentVerified: true } });
  if (!existing) {
    return Response.json({ success: false, error: { code: "NOT_FOUND" } }, { status: 404 });
  }
  if (!existing.paymentVerified) {
    return Response.json(
      { success: false, error: { code: "PAYMENT_NOT_VERIFIED", message: "Verify payment before confirming delivery" } },
      { status: 409 }
    );
  }

  const order = await db.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: params.id },
      data: {
        status: "delivered",
        deliveredConfirmedBy: session.user.id,
        deliveredConfirmedAt: new Date(),
      },
      select: { id: true, orderNumber: true, status: true, deliveredConfirmedAt: true },
    });
    await tx.orderStatusHistory.create({
      data: { orderId: updated.id, status: "delivered", changedBy: session.user.id },
    });
    return updated;
  });

  await db.auditLog.create({
    data: { actorId: session.user.id, action: "order.delivered_confirmed", entityType: "order", entityId: order.id },
  });

  return Response.json({ success: true, data: order });
}
