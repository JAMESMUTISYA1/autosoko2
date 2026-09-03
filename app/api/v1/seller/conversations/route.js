import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";
import { getBusinessMemberIds } from "@/lib/business";

// GET /api/v1/seller/conversations?search=&unread=true
//
// Scoped by businessId from the session in every query — a seller only
// ever sees conversations belonging to their own business.
export async function GET(request) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;
  const { businessId } = guard;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const unreadOnly = searchParams.get("unread") === "true";

  const memberIds = await getBusinessMemberIds(businessId);

  const where = {
    businessId,
    ...(search ? { buyer: { fullName: { contains: search, mode: "insensitive" } } } : {}),
  };

  const conversations = await db.conversation.findMany({
    where,
    include: {
      buyer: { select: { id: true, fullName: true, phone: true, avatarUrl: true } },
      product: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      // A buyer's message is anything NOT sent by someone on the business
      // team — this correctly counts unread regardless of which team
      // member eventually replies.
      _count: { select: { messages: { where: { readAt: null, senderId: { notIn: memberIds } } } } },
    },
    orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
    take: 150,
  });

  let data = conversations.map((c) => ({
    id: c.id,
    buyer: c.buyer,
    product: c.product,
    lastMessage: c.messages[0]
      ? {
          body: c.messages[0].body,
          senderId: c.messages[0].senderId,
          messageType: c.messages[0].messageType,
          createdAt: c.messages[0].createdAt,
        }
      : null,
    lastMessageAt: c.lastMessageAt,
    unreadCount: c._count.messages,
  }));

  if (unreadOnly) data = data.filter((c) => c.unreadCount > 0);

  return NextResponse.json({ success: true, data });
}
