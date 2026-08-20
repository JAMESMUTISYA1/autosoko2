import { db } from "@/lib/db";
import { getSession, unauthorized, forbidden } from "@/lib/auth/rbac";

// GET /api/v1/orders/:id — Document 3 §6.2
export async function GET(request, { params }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  const order = await db.order.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      subtotalMinor: true,
      shippingMinor: true,
      taxMinor: true,
      totalMinor: true,
      currency: true,
      deliveryMethod: true,
      paymentVerified: true,
      paymentVerifiedAt: true,
      deliveredConfirmedAt: true,
      createdAt: true,
      buyerId: true,
      businessId: true,
      business: { select: { name: true, slug: true, phone: true } },
      items: {
        select: {
          quantity: true,
          unitPriceMinor: true,
          subtotalMinor: true,
          product: { select: { name: true, slug: true, images: { take: 1, select: { url: true } } } },
        },
      },
      statusHistory: { select: { status: true, note: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) {
    return Response.json(
      { success: false, error: { code: "NOT_FOUND", message: "Order not found" } },
      { status: 404 }
    );
  }

  // Caller must be the buyer, or a member of the owning business
  // (Document 3 §6.2's stated access rule).
  const isBuyer = order.buyerId === session.user.id;
  const isBusinessMember = isBuyer
    ? true
    : Boolean(
        await db.businessMember.findUnique({
          where: { businessId_userId: { businessId: order.businessId, userId: session.user.id } },
        })
      );

  if (!isBuyer && !isBusinessMember) {
    return forbidden("You don't have access to this order");
  }

  const { buyerId, businessId, ...publicOrder } = order;
  return Response.json({ success: true, data: publicOrder });
}
