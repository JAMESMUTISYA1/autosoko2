// PATH: app/api/v1/payments/status/route.js
//
// GET ?ref=<providerTransactionId> — lightweight poll endpoint the
// checkout page calls every few seconds while the buyer completes the
// prompt on their phone. No provider calls happen here — it only reads
// what's already in the DB (kept up to date by the webhook callbacks or a
// reconcile call), so this stays fast and cheap to poll frequently.

import { db } from "@/lib/db";
import { getSession, unauthorized, forbidden } from "@/lib/auth/rbac";

export async function GET(request) {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  const ref = new URL(request.url).searchParams.get("ref");
  if (!ref) {
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR", message: "ref is required" } }, { status: 400 });
  }

  const payments = await db.payment.findMany({
    where: { providerTransactionId: ref },
    include: { order: { select: { id: true, orderNumber: true, buyerId: true, paymentVerified: true, status: true } } },
  });

  if (payments.length === 0) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Payment not found" } }, { status: 404 });
  }
  if (payments.some((p) => p.order.buyerId !== session.user.id)) {
    return forbidden("Not your payment");
  }

  const anyFailed = payments.some((p) => p.status === "failed");
  const allCompleted = payments.every((p) => p.status === "completed");

  return Response.json({
    success: true,
    data: {
      status: allCompleted ? "completed" : anyFailed ? "failed" : "pending",
      orders: payments.map((p) => ({ id: p.order.id, orderNumber: p.order.orderNumber, paymentVerified: p.order.paymentVerified })),
    },
  });
}