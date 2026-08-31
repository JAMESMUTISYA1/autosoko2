import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformRole, unauthorized } from "@/lib/auth/rbac";

export async function GET() {
  const { allowed } = await requirePlatformRole("admin");
  if (!allowed) return unauthorized();

  // Define order statuses that count as revenue (exclude cancelled/refunded/disputed)
  const revenueStatuses = ["pending", "confirmed", "processing", "shipped", "delivered"];

  const [totalOrders, revenueAgg, payoutsAgg] = await Promise.all([
    db.order.count({
      where: { status: { in: revenueStatuses } },
    }),
    db.order.aggregate({
      where: { status: { in: revenueStatuses } },
      _sum: { totalMinor: true },
    }),
    db.withdrawalRequest.aggregate({
      where: { status: "paid" },
      _sum: { amountMinor: true },
    }),
  ]);

  const totalRevenueMinor = revenueAgg._sum.totalMinor || 0;
  const totalPayoutsMinor = payoutsAgg._sum.amountMinor || 0;
  const platformFeesMinor = Math.round(totalRevenueMinor * 0.05); // 5% commission
  const avgOrderValueMinor = totalOrders > 0 ? Math.round(totalRevenueMinor / totalOrders) : 0;

  return NextResponse.json({
    success: true,
    data: {
      totalRevenueMinor,
      platformFeesMinor,
      totalPayoutsMinor,
      avgOrderValueMinor,
      totalOrders,
    },
  });
}