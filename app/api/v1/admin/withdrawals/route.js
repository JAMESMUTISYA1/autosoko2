import { db } from "@/lib/db";
import { requirePlatformRole, forbidden } from "@/lib/auth/rbac";

// GET /api/v1/admin/withdrawals — admin only
export async function GET() {
  const { allowed } = await requirePlatformRole("admin");
  if (!allowed) return forbidden();

  const requests = await db.withdrawalRequest.findMany({
    select: {
      id: true, amountMinor: true, currency: true, method: true, destination: true,
      status: true, createdAt: true, processedAt: true,
      business: { select: { name: true } },
      processor: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({
    success: true,
    data: requests.map((r) => ({
      ...r,
      sellerName: r.business.name,
      processedBy: r.processor?.fullName || null,
    })),
  });
}
