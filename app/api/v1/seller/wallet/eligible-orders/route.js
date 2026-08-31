import { requireSeller } from "@/lib/auth/sellerGuard";
import { getEligibleOrdersWithRemaining } from "@/lib/wallet";

export async function GET(request) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const eligible = await getEligibleOrdersWithRemaining(guard.businessId);
  const data = eligible.map(({ order, total, claimed, remaining }) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    subtotalMinor: total,
    claimedMinor: claimed,
    remainingMinor: remaining,
  }));

  return Response.json({ success: true, data });
}