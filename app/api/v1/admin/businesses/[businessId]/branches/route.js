import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/adminGuard";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const branches = await db.businessBranch.findMany({
    where: { businessId: params.businessId },
    include: { town: { select: { id: true, name: true } } },
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
  });

  return Response.json({ success: true, data: branches });
}

export async function POST(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const business = await db.business.findUnique({ where: { id: params.businessId } });
  if (!business) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Business not found" } }, { status: 404 });
  }

  const { name, address, townId, latitude, longitude, phone, openingHours, isPrimary } = await request.json();
  if (!name) {
    return Response.json({ success: false, error: { code: "VALIDATION", message: "name is required" } }, { status: 400 });
  }

  const branch = await db.$transaction(async (tx) => {
    if (isPrimary) {
      await tx.businessBranch.updateMany({ where: { businessId: params.businessId }, data: { isPrimary: false } });
    }
    return tx.businessBranch.create({
      data: {
        businessId: params.businessId,
        name,
        address: address || null,
        townId: townId || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        phone: phone || null,
        openingHours: openingHours || null,
        isPrimary: Boolean(isPrimary),
      },
    });
  });

  await writeAuditLog({
    actorId: guard.adminId, action: "business.branch_added", entityType: "Business",
    entityId: params.businessId, after: branch, request,
  });

  return Response.json({ success: true, data: branch }, { status: 201 });
}