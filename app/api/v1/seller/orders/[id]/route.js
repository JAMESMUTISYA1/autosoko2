import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";
import { sellerAllowedTransitions } from "@/lib/orders";

// GET /api/v1/seller/orders/:id
//
// Scoped by businessId in the WHERE clause itself, not checked after the
// fact — a seller requesting an order id that belongs to another business
// gets exactly the same 404 as a made-up id. They can't distinguish
// "doesn't exist" from "not yours" (avoids leaking order existence).
export async function GET(request, { params }) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;
  const { businessId } = guard;
  const { id } = params;

  const order = await db.order.findFirst({
    where: { id, businessId },
    include: {
      buyer: { select: { id: true, fullName: true, phone: true, email: true } },
      shippingAddress: {
        include: {
          town: { include: { region: { include: { country: { select: { name: true } } } } } },
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true, name: true, slug: true, sku: true, oemNumber: true, partNumber: true,
              images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1, select: { url: true } },
            },
          },
          variant: { select: { id: true, sku: true, attributes: true } },
        },
      },
      payments: {
        // rawProviderResponse is intentionally excluded — it can contain
        // sensitive provider-side payloads with no reason to reach the
        // seller dashboard.
        select: {
          id: true, provider: true, providerTransactionId: true, amountMinor: true,
          currency: true, status: true, createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Order not found." } },
      { status: 404 }
    );
  }

  // paymentVerifiedBy / deliveredConfirmedBy / statusHistory.changedBy are
  // plain id columns in the schema, not Prisma relations, so display names
  // are resolved with one extra lookup rather than a nested `include`.
  const actorIds = new Set();
  if (order.paymentVerifiedBy) actorIds.add(order.paymentVerifiedBy);
  if (order.deliveredConfirmedBy) actorIds.add(order.deliveredConfirmedBy);
  for (const h of order.statusHistory) if (h.changedBy) actorIds.add(h.changedBy);

  const actors = actorIds.size
    ? await db.user.findMany({ where: { id: { in: [...actorIds] } }, select: { id: true, fullName: true } })
    : [];
  const actorName = Object.fromEntries(actors.map((a) => [a.id, a.fullName]));

  const allowedTransitions = sellerAllowedTransitions(order);

  return NextResponse.json({
    success: true,
    data: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotalMinor: order.subtotalMinor,
      shippingMinor: order.shippingMinor,
      taxMinor: order.taxMinor,
      totalMinor: order.totalMinor,
      currency: order.currency,
      deliveryMethod: order.deliveryMethod,
      buyerNotes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,

      payment: {
        verified: order.paymentVerified,
        verifiedBy: order.paymentVerifiedBy ? actorName[order.paymentVerifiedBy] || "Unknown" : null,
        verifiedAt: order.paymentVerifiedAt,
        records: order.payments,
      },

      delivery: {
        confirmedBy: order.deliveredConfirmedBy ? actorName[order.deliveredConfirmedBy] || "Unknown" : null,
        confirmedAt: order.deliveredConfirmedAt,
      },

      buyer: order.buyer,

      shippingAddress: order.shippingAddress
        ? {
            id: order.shippingAddress.id,
            label: order.shippingAddress.label,
            recipientName: order.shippingAddress.recipientName,
            phone: order.shippingAddress.phone,
            addressLine: order.shippingAddress.addressLine,
            town: order.shippingAddress.town?.name || null,
            region: order.shippingAddress.town?.region?.name || null,
            country: order.shippingAddress.town?.region?.country?.name || null,
          }
        : null,

      items: order.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        name: it.product?.name || "Product removed",
        slug: it.product?.slug || null,
        sku: it.product?.sku || null,
        oemNumber: it.product?.oemNumber || null,
        partNumber: it.product?.partNumber || null,
        imageUrl: it.product?.images?.[0]?.url || null,
        variant: it.variant ? { id: it.variant.id, sku: it.variant.sku, attributes: it.variant.attributes } : null,
        quantity: it.quantity,
        unitPriceMinor: it.unitPriceMinor,
        subtotalMinor: it.subtotalMinor,
      })),

      statusHistory: order.statusHistory.map((h) => ({
        id: h.id,
        status: h.status,
        note: h.note,
        actor: h.changedBy ? actorName[h.changedBy] || "Unknown" : "System",
        isBuyer: h.changedBy === order.buyerId,
        createdAt: h.createdAt,
      })),

      // Server-computed, not client-guessed — the status route re-derives
      // and enforces this exact same list on every write, so the UI can
      // trust these buttons will actually work.
      allowedTransitions,
    },
  });
}
