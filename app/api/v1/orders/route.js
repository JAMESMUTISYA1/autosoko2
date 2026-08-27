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
  // Keep old field for backward compatibility (optional)
  deliveryMethod: z.enum(["pickup", "courier", "cross_border"]).optional(),
  // New fields
  deliveryMethodId: z.string().uuid().optional(),
  customDelivery: z
    .object({
      address: z.string().trim().min(5),
      explanation: z.string().trim().min(1),
    })
    .optional(),
});

function generateOrderNumber(businessId) {
  return `AS-${businessId.slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

// GET /api/v1/orders — buyer's own order history (unchanged)
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

// POST /api/v1/orders — updated to accept deliveryMethodId/customDelivery
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

  const { items, shippingAddressId, deliveryMethod: legacyDeliveryMethod, deliveryMethodId, customDelivery } = parsed.data;

  // Determine delivery details: method enum, shipping fee, and notes
  let finalDeliveryMethod = legacyDeliveryMethod || "courier"; // default to courier
  let shippingFeeMinor = 0;
  let deliveryNotes = "";

  if (customDelivery) {
    // Custom delivery: no fee, use courier as fallback, store details as JSON in notes
    finalDeliveryMethod = "courier";
    deliveryNotes = JSON.stringify({
      type: "custom",
      address: customDelivery.address,
      explanation: customDelivery.explanation,
    });
  } else if (deliveryMethodId) {
    // Predefined delivery method from DeliveryMethod table
    const method = await db.deliveryMethod.findUnique({
      where: { id: deliveryMethodId },
      select: { method: true, feeMinor: true, provider: true },
    });
    if (!method) {
      return Response.json(
        { success: false, error: { code: "INVALID_DELIVERY_METHOD", message: "Selected delivery method not found" } },
        { status: 400 }
      );
    }
    shippingFeeMinor = method.feeMinor;
    // Map method string to OrderStatus enum
    if (method.method.toLowerCase().includes("pickup")) {
      finalDeliveryMethod = "pickup";
    } else if (method.method.toLowerCase().includes("cross border")) {
      finalDeliveryMethod = "cross_border";
    } else {
      finalDeliveryMethod = "courier"; // includes "Courier", "Boda-boda", etc.
    }
    deliveryNotes = JSON.stringify({
      type: "predefined",
      method: method.method,
      provider: method.provider,
      feeMinor: method.feeMinor,
    });
  }

  // Fetch products to know price/business per item and to split a multi-seller cart
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

  // Group requested items by seller
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
        // Atomic stock decrement
        for (const item of businessItems) {
          const result = await tx.product.updateMany({
            where: { id: item.productId, stockQuantity: { gte: item.quantity } },
            data: { stockQuantity: { decrement: item.quantity } },
          });
          if (result.count === 0) {
            throw new InsufficientStockError(item.productId, item.product.name);
          }
        }

        const subtotalMinor = businessItems.reduce(
          (sum, i) => sum + i.product.priceMinor * i.quantity,
          0
        );
        const currency = businessItems[0].product.currency;
        const totalMinor = subtotalMinor + shippingFeeMinor;

        const order = await tx.order.create({
          data: {
            buyerId: session.user.id,
            businessId,
            orderNumber: generateOrderNumber(businessId),
            subtotalMinor,
            shippingMinor: shippingFeeMinor,
            totalMinor,
            currency,
            shippingAddressId,
            deliveryMethod: finalDeliveryMethod,
            notes: deliveryNotes || undefined,
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