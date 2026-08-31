import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireBuyer } from "@/lib/auth/buyer";

const PAGE_SIZE = 40;

// GET /api/v1/conversations/:id
//
// Full bootstrap for opening a thread in one round trip: business info,
// product context (if any), and the most recent page of messages
// (returned oldest-first, ready to render top-to-bottom).
//
// Scoped by buyerId in the WHERE clause itself — a made-up id and someone
// else's conversation id both come back as the same 404, so a buyer can
// never learn whether a given conversation id even exists.
export async function GET(request, { params }) {
  const guard = await requireBuyer();
  if (!guard.ok) return guard.response;
  const { userId } = guard;
  const { id } = params;

  const conversation = await db.conversation.findFirst({
    where: { id, buyerId: userId },
    include: {
      business: { select: { id: true, name: true, slug: true, logoUrl: true, verificationStatus: true, status: true } },
      product: {
        select: {
          id: true, name: true, slug: true, priceMinor: true, currency: true,
          images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1, select: { url: true } },
        },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Conversation not found." } },
      { status: 404 }
    );
  }

  const messages = await db.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
  });
  messages.reverse(); // oldest first for rendering

  return NextResponse.json({
    success: true,
    data: {
      id: conversation.id,
      viewerId: userId,
      business: conversation.business,
      product: conversation.product
        ? {
            id: conversation.product.id,
            name: conversation.product.name,
            slug: conversation.product.slug,
            priceMinor: conversation.product.priceMinor,
            currency: conversation.product.currency,
            imageUrl: conversation.product.images?.[0]?.url || null,
          }
        : null,
      messages,
      hasMoreOlder: messages.length === PAGE_SIZE,
    },
  });
}
