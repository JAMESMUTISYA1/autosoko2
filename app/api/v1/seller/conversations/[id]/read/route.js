import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";
import { getBusinessMemberIds } from "@/lib/business";

// POST /api/v1/seller/conversations/:id/read
// Marks every buyer-sent message as read — shared team state (the schema
// has one readAt per message, not per-reader), so any team member opening
// the thread clears it for the whole business. Idempotent.
export async function POST(request, { params }) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;
  const { businessId } = guard;
  const { id } = params;

  const conversation = await db.conversation.findFirst({ where: { id, businessId }, select: { id: true } });
  if (!conversation) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Conversation not found." } },
      { status: 404 }
    );
  }

  const memberIds = await getBusinessMemberIds(businessId);

  const result = await db.message.updateMany({
    where: { conversationId: id, readAt: null, senderId: { notIn: memberIds } },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ success: true, data: { markedRead: result.count } });
}
