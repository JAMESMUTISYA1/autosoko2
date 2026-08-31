import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";
import {
  getAvailableBalance,
  getPendingWithdrawalTotal,
  getLifetimePaidOutTotal,
  getEligibleOrdersWithRemaining,
} from "@/lib/wallet";

export async function GET(request) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const [business, available, pending, paidOut, eligible, payoutMethod] = await Promise.all([
    db.business.findUnique({ where: { id: guard.businessId }, select: { homeCurrency: true } }),
    getAvailableBalance(guard.businessId),
    getPendingWithdrawalTotal(guard.businessId),
    getLifetimePaidOutTotal(guard.businessId),
    getEligibleOrdersWithRemaining(guard.businessId),
    db.payoutMethod.findUnique({ where: { businessId: guard.businessId } }),
  ]);

  return Response.json({
    success: true,
    data: {
      currency: business?.homeCurrency || "KES",
      availableBalance: available,
      pendingWithdrawalTotal: pending,
      lifetimePaidOut: paidOut,
      eligibleOrderCount: eligible.length,
      payoutMethod,
    },
  });
}