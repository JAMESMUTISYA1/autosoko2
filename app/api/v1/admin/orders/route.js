import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformRole, unauthorized } from "@/lib/auth/rbac";

export async function POST(request) {
  const { session, allowed } = await requirePlatformRole("admin");
  if (!allowed) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const { buyerId, businessId, items, deliveryMethod, shippingAddressId } = body;
  if (!buyerId || !businessId || !items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Buyer, business, and at least one item are required" } },
      { status: 400 }
    );
  }

  // Fetch products to get prices
  const productIds = items.map((i) => i.productId);
  const products = await db.product.findMany({
    where: { id: { in: productIds }, deletedAt: null, status: "active" },
    select: { id: true, businessId: true, priceMinor: true, currency: true, name: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  const missing = productIds.filter((id) => !productById.has(id));
  if (missing.length > 0) {
    return NextResponse.json(
      { success: false, error: { code: "PRODUCT_UNAVAILABLE", message: "One or more products not found" } },
      { status: 400 }
    );
  }

  // For admin creation, all items must belong to the selected business (or we could auto-split, but keep simple)
  // Validate
  for (const item of items) {
    const product = productById.get(item.productId);
    if (product.businessId !== businessId) {
      return NextResponse.json(
        { success: false, error: { code: "BUSINESS_MISMATCH", message: "All items must belong to the same business" } },
        { status: 400 }
      );
    }
  }

  const subtotalMinor = items.reduce((sum, i) => sum + productById.get(i.productId).priceMinor * i.quantity, 0);
  const orderNumber = `AS-${businessId.slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  const order = await db.order.create({
    data: {
      buyerId,
      businessId,
      orderNumber,
      subtotalMinor,
      totalMinor: subtotalMinor, // no shipping/tax for admin manual order for now
      currency: "KES",
      deliveryMethod: deliveryMethod || "pickup",
      shippingAddressId,
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPriceMinor: productById.get(item.productId).priceMinor,
          subtotalMinor: productById.get(item.productId).priceMinor * item.quantity,
        })),
      },
      statusHistory: {
        create: { status: "pending", changedBy: session.user.id, note: "Order created by admin" },
      },
    },
    select: { id: true, orderNumber: true, totalMinor: true, status: true },
  });

  return NextResponse.json({ success: true, data: order }, { status: 201 });
}