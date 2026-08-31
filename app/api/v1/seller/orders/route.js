import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";
import { ORDER_STATUSES } from "@/lib/orders";

// GET /api/v1/seller/orders?status=&paymentStatus=&search=&dateFrom=&dateTo=&page=&perPage=
//
// Every query is scoped by `businessId` taken from the authenticated
// session (requireSeller), never from a query param or the request body.
// That's the entire tenant boundary for this route — there is no code
// path here that can return another business's orders.
export async function GET(request) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;
  const { businessId } = guard;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const paymentStatus = searchParams.get("paymentStatus"); // verified | unverified | all
  const search = searchParams.get("search")?.trim();
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = Math.min(100, Math.max(1, Number(searchParams.get("perPage")) || 20));

  const where = { businessId };

  if (status && status !== "all") {
    if (!ORDER_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid status filter." } },
        { status: 422 }
      );
    }
    where.status = status;
  }

  if (paymentStatus === "verified") where.paymentVerified = true;
  if (paymentStatus === "unverified") where.paymentVerified = false;

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom && !Number.isNaN(Date.parse(dateFrom))) where.createdAt.gte = new Date(dateFrom);
    if (dateTo && !Number.isNaN(Date.parse(dateTo))) {
      // Inclusive of the whole "to" day.
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { buyer: { fullName: { contains: search, mode: "insensitive" } } },
      { buyer: { phone: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalMinor: true,
        currency: true,
        deliveryMethod: true,
        paymentVerified: true,
        createdAt: true,
        buyer: { select: { id: true, fullName: true, phone: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.order.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      totalMinor: o.totalMinor,
      currency: o.currency,
      deliveryMethod: o.deliveryMethod,
      paymentVerified: o.paymentVerified,
      itemCount: o._count.items,
      buyer: o.buyer,
      createdAt: o.createdAt,
    })),
    meta: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
  });
}
