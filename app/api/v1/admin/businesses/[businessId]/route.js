import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/adminGuard";
import { writeAuditLog } from "@/lib/audit";

const ADMIN_DETAIL_SELECT = {
  id: true, ownerUserId: true, name: true, slug: true, businessType: true,
  logoUrl: true, bannerUrl: true, description: true,
  countryId: true, regionId: true, townId: true, physicalAddress: true,
  latitude: true, longitude: true, email: true, phone: true, whatsapp: true, website: true,
  registrationNumber: true, taxPin: true, verificationStatus: true, verificationDocuments: true,
  ratingAvg: true, ratingCount: true, followerCount: true, status: true, homeCurrency: true,
  createdAt: true, updatedAt: true, deletedAt: true,
  owner: { select: { id: true, fullName: true, email: true, phone: true } },
  country: { select: { id: true, name: true } },
  region: { select: { id: true, name: true } },
  town: { select: { id: true, name: true } },
  _count: { select: { products: true, members: true, branches: true, orders: true } },
};

// GET — full admin view, including taxPin/registrationNumber/verification
// docs, which the public /api/v1/businesses/:slug endpoint deliberately
// never selects.
export async function GET(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const business = await db.business.findUnique({
    where: { id: params.businessId },
    select: ADMIN_DETAIL_SELECT,
  });

  if (!business) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Business not found" } }, { status: 404 });
  }
  return Response.json({ success: true, data: business });
}

// PATCH — general info only. ownerUserId, status, verificationStatus,
// slug, logoUrl/bannerUrl and deletedAt each have their own dedicated
// endpoint (own validation, own audit action) — this route whitelists
// fields specifically so a stray extra key in the body can't sneak
// through one of those.
export async function PATCH(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const before = await db.business.findUnique({ where: { id: params.businessId } });
  if (!before) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Business not found" } }, { status: 404 });
  }

  const body = await request.json();
  const {
    name, businessType, description, countryId, regionId, townId,
    physicalAddress, latitude, longitude, email, phone, whatsapp, website,
    registrationNumber, taxPin, homeCurrency,
  } = body;

  const business = await db.business.update({
    where: { id: params.businessId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(businessType !== undefined ? { businessType } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(countryId !== undefined ? { countryId } : {}),
      ...(regionId !== undefined ? { regionId } : {}),
      ...(townId !== undefined ? { townId } : {}),
      ...(physicalAddress !== undefined ? { physicalAddress } : {}),
      ...(latitude !== undefined ? { latitude } : {}),
      ...(longitude !== undefined ? { longitude } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(whatsapp !== undefined ? { whatsapp } : {}),
      ...(website !== undefined ? { website } : {}),
      ...(registrationNumber !== undefined ? { registrationNumber } : {}),
      ...(taxPin !== undefined ? { taxPin } : {}),
      ...(homeCurrency !== undefined ? { homeCurrency } : {}),
    },
    select: ADMIN_DETAIL_SELECT,
  });

  await writeAuditLog({
    actorId: guard.adminId, action: "business.updated", entityType: "Business",
    entityId: business.id, before, after: business, request,
  });

  return Response.json({ success: true, data: business });
}

// DELETE — soft delete only (sets deletedAt), matching the schema's
// convention. Also forces status to "suspended" so it disappears from any
// active-only query even if one forgets to check deletedAt.
export async function DELETE(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const before = await db.business.findUnique({ where: { id: params.businessId } });
  if (!before) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Business not found" } }, { status: 404 });
  }

  const business = await db.business.update({
    where: { id: params.businessId },
    data: { deletedAt: new Date(), status: "suspended" },
  });

  await writeAuditLog({
    actorId: guard.adminId, action: "business.deleted", entityType: "Business",
    entityId: business.id, before, after: business, request,
  });

  return Response.json({ success: true, data: business });
}