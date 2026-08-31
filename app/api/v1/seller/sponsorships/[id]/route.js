import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";
import { effectiveStatus, isCurrentlyActive, daysRemaining, sellerCanCancel } from "@/lib/sponsorships";

// GET /api/v1/seller/sponsorships/:id
// Scoped by businessId in the WHERE clause — a seller requesting another
// business's sponsorship id gets the same 404 as a made-up id.
export async function GET(request, { params }) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;
  const { businessId } = guard;
  const { id } = params;

  const row = await db.productSponsorship.findFirst({
    where: { id, businessId },
    include: {
      product: {
        select: {
          id: true, name: true, slug: true, sku: true,
          images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1, select: { url: true } },
        },
      },
    },
  });

  if (!row) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Sponsorship not found." } },
      { status: 404 }
    );
  }

  // quotedBy / paymentVerifiedBy / rejectedBy are plain id columns (not
  // Prisma relations, same convention as the Order model), resolved here
  // with one small lookup rather than an include.
  const actorIds = [row.quotedBy, row.paymentVerifiedBy, row.rejectedBy, row.cancelledBy].filter(Boolean);
  const actors = actorIds.length
    ? await db.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, fullName: true } })
    : [];
  const actorName = Object.fromEntries(actors.map((a) => [a.id, a.fullName]));

  return NextResponse.json({
    success: true,
    data: {
      id: row.id,
      status: row.status,
      effectiveStatus: effectiveStatus(row),
      isCurrentlyActive: isCurrentlyActive(row),
      daysRemaining: daysRemaining(row),
      canCancel: sellerCanCancel(row),
      product: {
        id: row.product.id,
        name: row.product.name,
        slug: row.product.slug,
        sku: row.product.sku,
        imageUrl: row.product.images?.[0]?.url || null,
      },
      requestNote: row.requestNote,
      requestedAt: row.requestedAt,
      amountMinor: row.amountMinor,
      currency: row.currency,
      durationDays: row.durationDays,
      quoteNote: row.quoteNote,
      quotedBy: row.quotedBy ? actorName[row.quotedBy] || "Admin" : null,
      quotedAt: row.quotedAt,
      paymentVerifiedBy: row.paymentVerifiedBy ? actorName[row.paymentVerifiedBy] || "Admin" : null,
      paymentVerifiedAt: row.paymentVerifiedAt,
      startAt: row.startAt,
      endAt: row.endAt,
      rejectedBy: row.rejectedBy ? actorName[row.rejectedBy] || "Admin" : null,
      rejectedAt: row.rejectedAt,
      rejectionReason: row.rejectionReason,
      cancelledAt: row.cancelledAt,
      cancelReason: row.cancelReason,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
  });
}
