import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformRole, unauthorized } from "@/lib/auth/rbac";

export async function GET() {
  const { allowed } = await requirePlatformRole("admin");
  if (!allowed) return unauthorized();

  const result = await db.$queryRaw`
    SELECT c.name AS country,
           COALESCE(SUM(o.total_minor), 0)::int AS revenue_minor
    FROM orders o
    JOIN businesses b ON o.business_id = b.id
    JOIN countries c ON b.country_id = c.id
    WHERE o.status IN ('pending','confirmed','processing','shipped','delivered')
    GROUP BY c.name
    ORDER BY revenue_minor DESC
  `;

  const total = result.reduce((sum, r) => sum + r.revenue_minor, 0) || 1;
  const data = result.map((r) => ({
    country: r.country,
    share: r.revenue_minor / total,
    revenueMinor: r.revenue_minor,
  }));

  return NextResponse.json({ success: true, data });
}