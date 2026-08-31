import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";
import { SPONSORSHIP_STATUSES, effectiveStatus, isCurrentlyActive, daysRemaining } from "@/lib/sponsorships";

// GET /api/v1/seller/sponsorships?status=&search=&page=&perPage=
export async function GET(request) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;
  const { businessId } = guard;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = Math.min(100, Math.max(1, Number(searchParams.get("perPage")) || 20));

  const where = { businessId };

  if (status && status !== "all") {
    if (!SPONSORSHIP_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid status filter." } },
        { status: 422 }
      );
    }
    where.status = status;
  }

  if (search) {
    where.product = { name: { contains: search, mode: "insensitive" } };
  }

  const [rows, total] = await Promise.all([
    db.productSponsorship.findMany({
      where,
      include: { product: { select: { id: true, name: true, slug: true, images: { where: { isPrimary: true }, take: 1, select: { url: true } } } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.productSponsorship.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: rows.map((r) => ({
      id: r.id,
      status: r.status,
      effectiveStatus: effectiveStatus(r),
      isCurrentlyActive: isCurrentlyActive(r),
      daysRemaining: daysRemaining(r),
      amountMinor: r.amountMinor,
      currency: r.currency,
      durationDays: r.durationDays,
      startAt: r.startAt,
      endAt: r.endAt,
      createdAt: r.createdAt,
      product: {
        id: r.product.id,
        name: r.product.name,
        slug: r.product.slug,
        imageUrl: r.product.images?.[0]?.url || null,
      },
    })),
    meta: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
  });
}

const createSchema = z.object({
  productId: z.string().uuid(),
  requestNote: z.string().trim().max(1000).optional(),
});

// POST /api/v1/seller/sponsorships   { productId, requestNote? }
//
// Two things enforced here that matter for security/correctness:
//   1. The product must actually belong to the seller's own business —
//      re-checked against businessId from the session, never trusted from
//      the client. Without this a seller could sponsor a competitor's
//      product by guessing its id.
//   2. A product can only have one non-terminal sponsorship at a time —
//      checked inside the transaction to prevent a duplicate/overlapping
//      request slipping in via a race.
export async function POST(request) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;
  const { sellerId, businessId } = guard;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body." } },
      { status: 400 }
    );
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Invalid input." } },
      { status: 422 }
    );
  }
  const { productId, requestNote } = parsed.data;

  try {
    const result = await db.$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { id: productId, businessId }, select: { id: true } });
      if (!product) {
        return { error: { status: 404, code: "NOT_FOUND", message: "Product not found on your business." } };
      }

      const existing = await tx.productSponsorship.findFirst({
        where: { productId, status: { in: ["requested", "quoted", "active"] } },
      });
      if (existing) {
        return {
          error: {
            status: 409,
            code: "ALREADY_SPONSORED",
            message: "This product already has an active or pending sponsorship.",
          },
        };
      }

      const sponsorship = await tx.productSponsorship.create({
        data: { productId, businessId, requestedBy: sellerId, requestNote: requestNote || null },
      });

      return { sponsorship };
    });

    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.error.status });
    }

    return NextResponse.json({ success: true, data: result.sponsorship }, { status: 201 });
  } catch (error) {
    console.error("Failed to create sponsorship request:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not create sponsorship request." } },
      { status: 500 }
    );
  }
}
