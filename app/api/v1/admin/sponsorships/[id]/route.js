import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  effectiveStatus, isCurrentlyActive, daysRemaining,
  adminCanQuote, adminCanReject, adminCanVerifyPayment,
} from "@/lib/sponsorships";

// GET /api/v1/admin/sponsorships/:id
// TODO: gate with the admin auth guard once it's wired back in.
export async function GET(request, { params }) {
  const { id } = params;

  const row = await db.productSponsorship.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          id: true, name: true, slug: true, sku: true, priceMinor: true, currency: true,
          images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1, select: { url: true } },
        },
      },
      business: { select: { id: true, name: true, slug: true, phone: true, email: true } },
    },
  });

  if (!row) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Sponsorship not found." } },
      { status: 404 }
    );
  }

  const actorIds = [row.requestedBy, row.quotedBy, row.paymentVerifiedBy, row.rejectedBy, row.cancelledBy].filter(Boolean);
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
      canQuote: adminCanQuote(row),
      canReject: adminCanReject(row),
      canVerifyPayment: adminCanVerifyPayment(row),
      product: {
        id: row.product.id,
        name: row.product.name,
        slug: row.product.slug,
        sku: row.product.sku,
        listPriceMinor: row.product.priceMinor,
        listCurrency: row.product.currency,
        imageUrl: row.product.images?.[0]?.url || null,
      },
      business: row.business,
      requestedBy: row.requestedBy ? actorName[row.requestedBy] || "Unknown" : null,
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
