import { db } from "@/lib/db";

// GET /api/v1/businesses/:slug — Document 3 §2.4
// Public profile only — taxPin, registrationNumber, and verification
// documents are never in this `select`, by construction, not by
// remembering to strip them after the fact.
export async function GET(request, { params }) {
  const business = await db.business.findFirst({
    where: { slug: params.slug, deletedAt: null, status: "active" },
    select: {
      id: true,
      slug: true,
      name: true,
      businessType: true,
      logoUrl: true,
      bannerUrl: true,
      description: true,
      verificationStatus: true,
      ratingAvg: true,
      ratingCount: true,
      followerCount: true,
      website: true,
      whatsapp: true,
      createdAt: true,
      country: { select: { name: true } },
      town: { select: { name: true } },
      branches: {
        select: { name: true, address: true, phone: true, isPrimary: true, town: { select: { name: true } } },
      },
      _count: { select: { products: true } },
    },
  });

  if (!business) {
    return Response.json(
      { success: false, error: { code: "NOT_FOUND", message: "Business not found" } },
      { status: 404 }
    );
  }

  return Response.json({ success: true, data: business });
}
