import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, unauthorized } from "@/lib/auth/rbac";
import { checkRateLimit, getClientIdentifier } from "@/lib/auth/rateLimit";

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
  shippingAddressId: z.string().uuid().optional(),
  deliveryMethod: z.enum(["pickup", "courier", "cross_border"]),
});

function generateOrderNumber(businessId) {
  // Human-readable, sequential-looking per business — real sequencing
  // would use a DB sequence scoped per business; this is a placeholder
  // scheme good enough until that's built.
  return `AS-${businessId.slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

// GET /api/v1/orders — buyer's own order history (implied alongside
// Document 3 §6.2's order-detail endpoint). Scoped to the session user
// by construction — there's no way to pass a different buyerId in.
export async function GET(request) {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = Math.min(50, Number(searchParams.get("perPage")) || 20);

  const where = { buyerId: session.user.id };

  const [total, orders] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalMinor: true,
        currency: true,
        createdAt: true,
        business: { select: { name: true, slug: true } },
        items: { select: { quantity: true, product: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  return Response.json({ success: true, data: orders, meta: { page, perPage, total } });
}

// POST /api/v1/orders — Document 3 §6.1
export async function POST(request) {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  const identifier = getClientIdentifier(request, session.user.id);
  const { success: withinLimit } = await checkRateLimit(identifier, "default");
  if (!withinLimit) {
    return Response.json(
      { success: false, error: { code: "RATE_LIMITED", message: "Too many requests" } },
      { status: 429 }
    );
  }

  // Idempotency: a double-tapped "Place Order" on a slow connection (a
  // real scenario in this market, per Document 3's cross-cutting notes)
  // must not create two orders. The client sends the same key on retry;
  // we short-circuit to the original result instead of creating a
  // duplicate. A real implementation persists this in Redis with a TTL —
  // sketched here, not fully wired, since it needs its own storage
  // decision (Upstash again, most likely) that's out of scope for this pass.
  const idempotencyKey = request.headers.get("Idempotency-Key");

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    const fields = {};
    for (const issue of parsed.error.issues) fields[issue.path[0]] = issue.message;
    return Response.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Check the highlighted fields", fields } },
      { status: 400 }
    );
  }

  const { items, shippingAddressId, deliveryMethod } = parsed.data;

  // Fetch products to know price/business per item and to split a
  // multi-seller cart into one order per business (Document 3 §6.1).
  const productIds = items.map((i) => i.productId);
  const products = await db.product.findMany({
    where: { id: { in: productIds }, deletedAt: null, status: "active" },
    select: { id: true, businessId: true, priceMinor: true, currency: true, name: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  const missingIds = productIds.filter((id) => !productById.has(id));
  if (missingIds.length > 0) {
    return Response.json(
      { success: false, error: { code: "PRODUCT_UNAVAILABLE", message: "One or more items are no longer available", fields: { productIds: missingIds } } },
      { status: 409 }
    );
  }

  // Group requested items by seller — a cart spanning multiple
  // businesses becomes multiple orders, created in one DB transaction.
  const itemsByBusiness = new Map();
  for (const item of items) {
    const product = productById.get(item.productId);
    if (!itemsByBusiness.has(product.businessId)) itemsByBusiness.set(product.businessId, []);
    itemsByBusiness.get(product.businessId).push({ ...item, product });
  }

  try {
    const createdOrders = await db.$transaction(async (tx) => {
      const results = [];

      for (const [businessId, businessItems] of itemsByBusiness) {
        // The critical safety property: atomically decrement stock only
        // if enough is available. `updateMany`'s WHERE clause is
        // evaluated as part of the same atomic UPDATE, so Postgres's
        // row-level locking makes this safe under concurrent checkout
        // without needing an explicit SELECT...FOR UPDATE — verified
        // equivalent to that pattern against real Postgres before this
        // route was written (see prisma/validation_ddl.sql's test).
        for (const item of businessItems) {
          const result = await tx.product.updateMany({
            where: { id: item.productId, stockQuantity: { gte: item.quantity } },
            data: { stockQuantity: { decrement: item.quantity } },
          });
          if (result.count === 0) {
            // Throwing inside $transaction rolls back everything already
            // done in this call, including stock already decremented
            // for earlier items in the loop — all-or-nothing.
            throw new InsufficientStockError(item.productId, item.product.name);
          }
        }

        const subtotalMinor = businessItems.reduce(
          (sum, i) => sum + i.product.priceMinor * i.quantity,
          0
        );
        const currency = businessItems[0].product.currency;

        const order = await tx.order.create({
          data: {
            buyerId: session.user.id,
            businessId,
            orderNumber: generateOrderNumber(businessId),
            subtotalMinor,
            totalMinor: subtotalMinor, // shipping/tax added once those rules are wired up
            currency,
            shippingAddressId,
            deliveryMethod,
            items: {
              create: businessItems.map((i) => ({
                productId: i.productId,
                quantity: i.quantity,
                unitPriceMinor: i.product.priceMinor,
                subtotalMinor: i.product.priceMinor * i.quantity,
              })),
            },
            statusHistory: { create: { status: "pending", changedBy: session.user.id } },
          },
          select: { id: true, orderNumber: true, businessId: true, totalMinor: true, currency: true, status: true, business: { select: { name: true } } },
        });

        results.push(order);
      }

      return results;
    });

    return Response.json({ success: true, data: { orders: createdOrders } }, { status: 201 });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return Response.json(
        {
          success: false,
          error: {
            code: "INSUFFICIENT_STOCK",
            message: `Not enough stock for "${err.productName}"`,
            fields: { productId: err.productId },
          },
        },
        { status: 409 }
      );
    }
    throw err;
  }
}

class InsufficientStockError extends Error {
  constructor(productId, productName) {
    super(`Insufficient stock for product ${productId}`);
    this.productId = productId;
    this.productName = productName;
  }
}
