import { db } from "@/lib/db";
import { getSession, unauthorized } from "@/lib/auth/rbac";

// GET /api/v1/seller/wallet?businessId=...
// Balance is computed, not stored — a stored counter can drift out of
// sync with reality; summing the actual orders/withdrawals every time
// can't drift, since there's nothing else to disagree with it.
export async function GET(request) {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  if (!businessId) {
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR", message: "businessId is required" } }, { status: 400 });
  }

  const [deliveredOrders, pendingOrders, withdrawals, payoutMethod] = await Promise.all([
    db.order.findMany({
      where: { businessId, status: "delivered" },
      select: { id: true, orderNumber: true, totalMinor: true, currency: true, deliveredConfirmedAt: true },
    }),
    db.order.findMany({
      where: { businessId, status: { notIn: ["delivered", "cancelled", "refunded"] } },
      select: { totalMinor: true },
    }),
    db.withdrawalRequest.findMany({
      where: { businessId },
      select: { id: true, amountMinor: true, currency: true, method: true, status: true, createdAt: true, processedAt: true },
      orderBy: { createdAt: "desc" },
    }),
    db.payoutMethod.findUnique({ where: { businessId } }),
  ]);

  const currency = deliveredOrders[0]?.currency || "KES";
  const grossEarnedMinor = deliveredOrders.reduce((sum, o) => sum + o.totalMinor, 0);
  const withdrawnMinor = withdrawals
    .filter((w) => w.status === "paid" || w.status === "approved")
    .reduce((sum, w) => sum + w.amountMinor, 0);
  const pendingWithdrawalMinor = withdrawals
    .filter((w) => w.status === "pending")
    .reduce((sum, w) => sum + w.amountMinor, 0);

  const availableMinor = grossEarnedMinor - withdrawnMinor - pendingWithdrawalMinor;
  const pendingBalanceMinor = pendingOrders.reduce((sum, o) => sum + o.totalMinor, 0);

  const transactions = [
    ...deliveredOrders.map((o) => ({
      id: `sale-${o.id}`,
      type: "sale",
      description: `Sale — Order ${o.orderNumber}`,
      amountMinor: o.totalMinor,
      currency: o.currency,
      date: o.deliveredConfirmedAt,
      status: "completed",
    })),
    ...withdrawals.map((w) => ({
      id: w.id,
      type: "withdrawal",
      description: `Withdrawal via ${w.method}`,
      amountMinor: -w.amountMinor,
      currency: w.currency,
      date: w.createdAt,
      status: w.status,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return Response.json({
    success: true,
    data: {
      currency,
      availableMinor: Math.max(0, availableMinor),
      pendingMinor: pendingBalanceMinor,
      payoutMethod: payoutMethod
        ? {
            phoneNumber: payoutMethod.phoneNumber,
            phoneVerified: payoutMethod.phoneVerified,
            bankName: payoutMethod.bankName,
            bankAccountName: payoutMethod.bankAccountName,
            bankAccountMasked: payoutMethod.bankAccountMasked,
          }
        : null,
      transactions,
    },
  });
}
