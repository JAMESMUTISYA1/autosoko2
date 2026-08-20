import { db } from "@/lib/db";
import { requirePlatformRole, forbidden } from "@/lib/auth/rbac";

// GET /api/v1/admin/orders?townId=... — agent (their city) or admin (all)
export async function GET(request) {
  const { allowed } = await requirePlatformRole("agent");
  if (!allowed) return forbidden();

  const { searchParams } = new URL(request.url);
  const townId = searchParams.get("townId");

  const orders = await db.order.findMany({
    where: townId ? { business: { townId } } : {},
    select: {
      id: true, orderNumber: true, status: true, totalMinor: true, currency: true, createdAt: true,
      paymentVerified: true, paymentVerifiedBy: true, paymentVerifiedAt: true,
      deliveredConfirmedBy: true, deliveredConfirmedAt: true,
      buyer: { select: { fullName: true } },
      business: { select: { name: true, town: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return Response.json({ success: true, data: orders });
}
