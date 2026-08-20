import { db } from "@/lib/db";
import { requirePlatformRole, forbidden } from "@/lib/auth/rbac";

// GET /api/v1/admin/verifications?townId=... — agent (city-scoped via
// townId) or admin (all, if townId omitted)
export async function GET(request) {
  const { allowed } = await requirePlatformRole("agent");
  if (!allowed) return forbidden();

  const { searchParams } = new URL(request.url);
  const townId = searchParams.get("townId");

  const businesses = await db.business.findMany({
    where: {
      verificationStatus: "pending",
      ...(townId ? { townId } : {}),
    },
    select: {
      id: true, name: true, businessType: true, createdAt: true,
      verificationDocuments: true,
      town: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return Response.json({ success: true, data: businesses });
}
