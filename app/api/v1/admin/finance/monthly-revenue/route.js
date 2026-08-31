import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformRole, unauthorized } from "@/lib/auth/rbac";

export async function GET() {
  const { allowed } = await requirePlatformRole("admin");
  if (!allowed) return unauthorized();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5, 1); // start of month 6 months ago

  const result = await db.$queryRaw`
    SELECT to_char(created_at, 'YYYY-MM') AS month,
           COALESCE(SUM(total_minor), 0)::int AS revenue_minor
    FROM orders
    WHERE status IN ('pending','confirmed','processing','shipped','delivered')
      AND created_at >= ${sixMonthsAgo}
    GROUP BY month
    ORDER BY month ASC
  `;

  // Ensure all 6 months are present
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ month: key, revenueMinor: 0 });
  }

  const map = new Map(result.map((r) => [r.month, r.revenue_minor]));
  const data = months.map((m) => ({
    month: m.month,
    revenueMinor: map.get(m.month) || 0,
  }));

  return NextResponse.json({ success: true, data });
}