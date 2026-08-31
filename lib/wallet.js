import { db } from "@/lib/db";

// The amount a business is actually owed per order. Shipping is a
// pass-through to the delivery provider and tax isn't the seller's money,
// so payouts are calculated off subtotalMinor, not totalMinor. If a
// platform commission is introduced later, this is the one place to
// subtract it from — nothing else needs to change.
export function sellerAmountForOrder(order) {
  return order.subtotalMinor;
}

// Only fully-delivered, payment-verified orders are ever eligible. This is
// deliberately strict: no "processing" or "shipped" order counts toward a
// seller's withdrawable balance, and cancelled/refunded/disputed orders
// never can (they're excluded just by not being "delivered").
const ELIGIBLE_ORDER_STATUS = "delivered";

// Returns every eligible order for a business along with how much of it is
// still unclaimed. An order can appear here with a SMALLER remaining
// amount than its subtotal if a previous withdrawal already claimed part
// of it — and won't appear at all once fully claimed (pending, approved,
// or paid all count as a claim; only a request that's later cancelled or
// rejected frees the amount back up, since that deletes its OrderPayout
// rows).
export async function getEligibleOrdersWithRemaining(businessId) {
  const orders = await db.order.findMany({
    where: { businessId, status: ELIGIBLE_ORDER_STATUS, paymentVerified: true },
    include: { payoutLinks: { select: { amountMinor: true } } },
    orderBy: { createdAt: "asc" }, // oldest first — used for FIFO allocation too
  });

  return orders
    .map((order) => {
      const claimed = order.payoutLinks.reduce((sum, link) => sum + link.amountMinor, 0);
      const total = sellerAmountForOrder(order);
      return { order, total, claimed, remaining: total - claimed };
    })
    .filter((o) => o.remaining > 0);
}

export async function getAvailableBalance(businessId) {
  const eligible = await getEligibleOrdersWithRemaining(businessId);
  return eligible.reduce((sum, o) => sum + o.remaining, 0);
}

// "Pending" from the seller's point of view: requested but not yet in
// their hands. approved + pending both count — the money only stops being
// "pending" once status flips to paid (or the request disappears via
// cancel/reject).
export async function getPendingWithdrawalTotal(businessId) {
  const agg = await db.withdrawalRequest.aggregate({
    where: { businessId, status: { in: ["pending", "approved"] } },
    _sum: { amountMinor: true },
  });
  return agg._sum.amountMinor || 0;
}

export async function getLifetimePaidOutTotal(businessId) {
  const agg = await db.withdrawalRequest.aggregate({
    where: { businessId, status: "paid" },
    _sum: { amountMinor: true },
  });
  return agg._sum.amountMinor || 0;
}

// Allocates `amountMinor` across eligible orders FIFO (oldest first),
// creating one OrderPayout row per order touched — partial on the last one
// if the requested amount doesn't divide evenly across whole orders. Must
// be called with a transaction client and run in the SAME transaction as
// creating the WithdrawalRequest, so the reservation is atomic: either
// both the request and its order claims exist, or neither does.
export async function allocateOrdersToWithdrawal(tx, businessId, withdrawalRequestId, amountMinor) {
  const orders = await tx.order.findMany({
    where: { businessId, status: ELIGIBLE_ORDER_STATUS, paymentVerified: true },
    include: { payoutLinks: { select: { amountMinor: true } } },
    orderBy: { createdAt: "asc" },
  });

  let remainingToAllocate = amountMinor;
  for (const order of orders) {
    if (remainingToAllocate <= 0) break;
    const claimed = order.payoutLinks.reduce((sum, link) => sum + link.amountMinor, 0);
    const available = sellerAmountForOrder(order) - claimed;
    if (available <= 0) continue;

    const take = Math.min(available, remainingToAllocate);
    await tx.orderPayout.create({ data: { orderId: order.id, withdrawalRequestId, amountMinor: take } });
    remainingToAllocate -= take;
  }

  if (remainingToAllocate > 0) {
    // Only reachable via a race — two requests submitted at nearly the same
    // instant, both passing the initial balance check before either
    // commits. Throwing here rolls back the whole transaction.
    throw new Error("INSUFFICIENT_BALANCE");
  }
}