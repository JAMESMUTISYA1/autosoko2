import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";

// How many days of daily revenue to return. If you change this, also
// update the literal '30 days' in the raw SQL below — it's not
// interpolated from this constant (see the comment on that query).
const REVENUE_DAYS = 30;

// GET /api/v1/seller/overview
//
// There's no Wallet/Ledger model in the schema, so "available" and
// "pending" balance are derived here rather than read off a stored field:
//   - deliveredMinor  = revenue from orders that are delivered AND paid.
//   - claimedMinor    = everything already requested via WithdrawalRequest
//                       (pending, approved, or paid) — money that's
//                       already spoken for, whether or not it's actually
//                       left the platform yet.
//   - availableMinor  = deliveredMinor - claimedMinor, floored at 0.
//   - pendingMinor    = revenue from orders that are paid but NOT YET
//                       delivered (confirmed/processing/shipped) — this
//                       is the "clears after delivery" bucket.
// This is a reasonable approximation, not a real accounting ledger — a
// dedicated Wallet/LedgerEntry model (mirroring the ProductSponsorship
// pattern) would be the correct long-term fix if exact-to-the-cent
// balances start to matter.
export async function GET() {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;
  const { businessId } = guard;

  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true, verificationStatus: true, homeCurrency: true },
  });
  if (!business) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Business not found." } },
      { status: 404 }
    );
  }

  const [
    activeListingsCount,
    listings,
    deliveredAgg,
    paidUndeliveredAgg,
    claimedAgg,
    unitsSoldTotalAgg,
    unitsSoldByProduct,
    ordersByStatusRaw,
    revenueRows,
  ] = await Promise.all([
    db.product.count({ where: { businessId, status: "active", deletedAt: null } }),
    db.product.findMany({
      where: { businessId, deletedAt: null },
      select: { id: true, name: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.order.aggregate({
      where: { businessId, status: "delivered", paymentVerified: true },
      _sum: { totalMinor: true },
    }),
    db.order.aggregate({
      where: { businessId, paymentVerified: true, status: { in: ["confirmed", "processing", "shipped"] } },
      _sum: { totalMinor: true },
    }),
    db.withdrawalRequest.aggregate({
      where: { businessId, status: { in: ["pending", "approved", "paid"] } },
      _sum: { amountMinor: true },
    }),
    db.orderItem.aggregate({
      where: { order: { businessId, status: "delivered" } },
      _sum: { quantity: true },
    }),
    db.orderItem.groupBy({
      by: ["productId"],
      where: { order: { businessId, status: "delivered" } },
      _sum: { quantity: true },
    }),
    db.order.groupBy({
      by: ["status"],
      where: { businessId },
      _count: { _all: true },
    }),
    // Raw SQL for the day-bucketed sum — Prisma's groupBy can't truncate
    // a DateTime to "day" portably. businessId is still safely
    // parameterized via the tagged-template placeholder; only the
    // literal '30 days' interval is inlined (it's a fixed constant, not
    // user input).
    db.$queryRaw`
      SELECT date_trunc('day', "created_at") AS day, SUM("total_minor")::bigint AS total
      FROM orders
      WHERE business_id = ${businessId}
        AND payment_verified = true
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day ASC
    `,
  ]);

  const deliveredMinor = deliveredAgg._sum.totalMinor || 0;
  const claimedMinor = claimedAgg._sum.amountMinor || 0;
  const availableMinor = Math.max(0, deliveredMinor - claimedMinor);
  const pendingMinor = paidUndeliveredAgg._sum.totalMinor || 0;
  const unitsSold = unitsSoldTotalAgg._sum.quantity || 0;

  const unitsSoldMap = Object.fromEntries(unitsSoldByProduct.map((r) => [r.productId, r._sum.quantity || 0]));

  // Build a continuous day series so the chart doesn't show gaps on days
  // with zero paid orders — easier to read than a sparse point cloud.
  const revenueMap = Object.fromEntries(
    revenueRows.map((r) => [new Date(r.day).toISOString().slice(0, 10), Number(r.total)])
  );
  const revenueByDay = [];
  for (let i = REVENUE_DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    revenueByDay.push({ date: key, totalMinor: revenueMap[key] || 0 });
  }

  const ordersByStatus = ordersByStatusRaw.map((r) => ({ status: r.status, count: r._count._all }));

  return NextResponse.json({
    success: true,
    data: {
      business,
      stats: { activeListings: activeListingsCount, unitsSold, availableMinor, pendingMinor },
      listings: listings.map((p) => ({ ...p, unitsSold: unitsSoldMap[p.id] || 0 })),
      revenueByDay,
      ordersByStatus,
    },
  });
}
