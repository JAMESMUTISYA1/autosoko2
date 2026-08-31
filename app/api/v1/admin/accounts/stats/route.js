import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformRole, unauthorized } from "@/lib/auth/rbac";

export async function GET() {
  const { allowed } = await requirePlatformRole("admin");
  if (!allowed) return unauthorized();

  const [totalUsers, activeUsers, suspendedUsers, platformStaff, regularUsers, monthlySignups] =
    await Promise.all([
      db.user.count({ where: { deletedAt: null } }),
      db.user.count({ where: { deletedAt: null, status: "active" } }),
      db.user.count({ where: { deletedAt: null, status: "suspended" } }),
      db.user.count({ where: { deletedAt: null, userRoles: { some: { role: { scope: "platform" } } } } }),
      db.user.count({ where: { deletedAt: null, userRoles: { none: { role: { scope: "platform" } } } } }),
      db.$queryRaw`
        SELECT to_char(created_at, 'YYYY-MM') AS month, COUNT(*)::int AS count
        FROM users
        WHERE deleted_at IS NULL
          AND created_at >= now() - interval '6 months'
        GROUP BY month
        ORDER BY month ASC
      `,
    ]);

  return NextResponse.json({
    success: true,
    data: {
      totalUsers,
      activeUsers,
      suspendedUsers,
      platformStaff,
      regularUsers,
      monthlySignups,
    },
  });
}