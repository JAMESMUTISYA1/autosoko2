import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";

const bodySchema = z.object({
  note: z.string().trim().min(1, "Note cannot be empty").max(1000),
});

// POST /api/v1/seller/orders/:id/notes   { note }
//
// Appends to the order's activity log at its *current* status — this is
// how a seller responds on a disputed order (or leaves context for their
// team) without going through the status state machine at all. A seller
// can call this regardless of order status, including "disputed", which
// is intentional: they can respond to a dispute, they just can't clear it
// themselves (that stays admin-only, enforced in the status route).
export async function POST(request, { params }) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;
  const { sellerId, businessId } = guard;
  const { id } = params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body." } },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Invalid input." } },
      { status: 422 }
    );
  }

  const order = await db.order.findFirst({ where: { id, businessId }, select: { id: true, status: true } });
  if (!order) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Order not found." } },
      { status: 404 }
    );
  }

  const entry = await db.orderStatusHistory.create({
    data: { orderId: id, status: order.status, changedBy: sellerId, note: parsed.data.note },
  });

  return NextResponse.json({ success: true, data: entry }, { status: 201 });
}
