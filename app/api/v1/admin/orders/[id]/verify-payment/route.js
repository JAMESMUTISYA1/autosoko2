import { db } from "@/lib/db";
import { requirePlatformRole, forbidden } from "@/lib/auth/rbac";

// PATCH /api/v1/admin/orders/:id/verify-payment
export async function PATCH(request, { params }) {
  const { session, allowed } = await requirePlatformRole("agent");
  if (!allowed) return forbidden();

  const order = await db.order.update({
    where: { id: params.id },
    data: {
      paymentVerified: true,
      paymentVerifiedBy: session.user.id,
      paymentVerifiedAt: new Date(),
    },
    select: { id: true, orderNumber: true, paymentVerified: true, paymentVerifiedAt: true },
  });

  await db.auditLog.create({
    data: { actorId: session.user.id, action: "order.payment_verified", entityType: "order", entityId: order.id },
  });

  return Response.json({ success: true, data: order });
}
