import { z } from "zod";
import { db } from "@/lib/db";
import { requirePlatformRole, forbidden } from "@/lib/auth/rbac";

const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered"];
const statusSchema = z.object({ status: z.enum(ORDER_STATUSES) });

// PATCH /api/v1/admin/orders/:id/status — Document 3 §6.3
export async function PATCH(request, { params }) {
  const { session, allowed } = await requirePlatformRole("agent");
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

  const existing = await db.order.findUnique({ where: { id: params.id }, select: { status: true } });
  if (!existing) return Response.json({ success: false, error: { code: "NOT_FOUND" } }, { status: 404 });

  const currentIdx = ORDER_STATUSES.indexOf(existing.status);
  const nextIdx = ORDER_STATUSES.indexOf(parsed.data.status);
  if (nextIdx <= currentIdx) {
    return Response.json(
      { success: false, error: { code: "INVALID_STATUS_TRANSITION", message: "Orders can only move forward" } },
      { status: 422 }
    );
  }

  const order = await db.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: params.id },
      data: { status: parsed.data.status },
      select: { id: true, orderNumber: true, status: true },
    });
    await tx.orderStatusHistory.create({
      data: { orderId: updated.id, status: parsed.data.status, changedBy: session.user.id },
    });
    return updated;
  });

  return Response.json({ success: true, data: order });
}
