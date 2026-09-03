import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";

const PAGE_SIZE = 40;

// GET /api/v1/seller/conversations/:id
//
// Scoped by businessId in the WHERE clause itself — a conversation id
// belonging to another business and a made-up id both 404 identically.
export async function GET(request, { params }) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;
  const { sellerId, businessId } = guard;
  const { id } = params;

  const conversation = await db.conversation.findFirst({
    where: { id, businessId },
    include: {
      buyer: { select: { id: true, fullName: true, phone: true, avatarUrl: true } },
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
  messages.reverse();

  // Resolve display names for whoever has sent messages in this thread —
  // lets a multi-person team tell each other's replies apart in the UI.
  const senderIds = [...new Set(messages.map((m) => m.senderId))];
  const senders = senderIds.length
    ? await db.user.findMany({ where: { id: { in: senderIds } }, select: { id: true, fullName: true } })
    : [];
  const senderName = Object.fromEntries(senders.map((s) => [s.id, s.fullName]));

  return NextResponse.json({
    success: true,
    data: {
      id: conversation.id,
      viewerId: sellerId,
      buyer: conversation.buyer,
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
      messages: messages.map((m) => ({ ...m, senderName: senderName[m.senderId] || null })),
      hasMoreOlder: messages.length === PAGE_SIZE,
    },
  });
}
