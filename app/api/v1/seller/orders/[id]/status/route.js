import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";
import { sellerAllowedTransitions, NOTE_REQUIRED_FOR } from "@/lib/orders";

const TARGET_STATUSES = ["confirmed", "processing", "shipped", "delivered", "cancelled", "disputed"];

const bodySchema = z.object({
  status: z.enum(TARGET_STATUSES),
  note: z.string().trim().max(1000).optional(),
});

// PATCH /api/v1/seller/orders/:id/status   { status, note? }
//
// This is the one place order.status ever changes for a seller, and it's
// deliberately paranoid:
//   1. The order is re-fetched inside the transaction, scoped by
//      businessId — never trust anything read before the transaction.
//   2. The target status is checked against sellerAllowedTransitions(),
//      the same function the UI uses to decide which buttons to show.
//      The client's opinion of what's allowed is never trusted.
//   3. A reason is required for consequential transitions (cancel/dispute).
//   4. A paid order can't be cancelled outright — see lib/orders.js.
//   5. The actual update is a compare-and-swap (`updateMany` scoped to the
//      status we just read) so a concurrent change from a teammate loses
//      cleanly with a 409 instead of silently overwriting.
//   6. The status-history row is written in the same transaction, so the
//      order and its audit trail can never disagree.
export async function PATCH(request, { params }) {
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
  const { status: targetStatus, note } = parsed.data;

  try {
    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id, businessId } });
      if (!order) {
        return { error: { status: 404, code: "NOT_FOUND", message: "Order not found." } };
      }

      const allowed = sellerAllowedTransitions(order);
      if (!allowed.includes(targetStatus)) {
        const reason =
          targetStatus === "cancelled" && order.paymentVerified
            ? "This order's payment is already verified, so it can't be cancelled directly. Flag a dispute instead so an admin can process a refund."
            : `Cannot move an order from "${order.status}" to "${targetStatus}".`;
        return { error: { status: 409, code: "INVALID_TRANSITION", message: reason } };
      }

      if (NOTE_REQUIRED_FOR.has(targetStatus) && !note) {
        return {
          error: {
            status: 422,
            code: "NOTE_REQUIRED",
            message:
              targetStatus === "cancelled"
                ? "A reason is required to cancel an order."
                : "A reason is required to flag a dispute.",
          },
        };
      }

      const extraData =
        targetStatus === "delivered"
          ? { deliveredConfirmedBy: sellerId, deliveredConfirmedAt: new Date() }
          : {};

      const updateResult = await tx.order.updateMany({
        where: { id, status: order.status }, // compare-and-swap guard
        data: { status: targetStatus, ...extraData },
      });

      if (updateResult.count === 0) {
        return {
          error: {
            status: 409,
            code: "CONFLICT",
            message: "This order was just updated by someone else. Refresh and try again.",
          },
        };
      }

      await tx.orderStatusHistory.create({
        data: { orderId: id, status: targetStatus, changedBy: sellerId, note: note || null },
      });

      return { orderId: id };
    });

    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.error.status });
    }

    return NextResponse.json({ success: true, data: { id: result.orderId, status: targetStatus } });
  } catch (error) {
    console.error("Failed to update order status:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not update order status." } },
      { status: 500 }
    );
  }
}
