import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SPONSORSHIP_STATUSES, effectiveStatus, isCurrentlyActive, daysRemaining } from "@/lib/sponsorships";

// GET /api/v1/admin/sponsorships?status=&search=&page=&perPage=
// TODO: gate with the admin auth guard once it's wired back in (same as
// every other /admin route right now — see lib/orders.js history).
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = Math.min(100, Math.max(1, Number(searchParams.get("perPage")) || 20));

  const where = {};

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
    where.OR = [
      { product: { name: { contains: search, mode: "insensitive" } } },
      { business: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [rows, total] = await Promise.all([
    db.productSponsorship.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, slug: true } },
        business: { select: { id: true, name: true, slug: true } },
      },
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
      product: r.product,
      business: r.business,
      requestedAt: r.requestedAt,
      createdAt: r.createdAt,
    })),
    meta: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
  });
}
