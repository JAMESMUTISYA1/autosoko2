import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireBuyer } from "@/lib/auth/buyer";

// POST /api/v1/conversations/:id/read
// Marks every message from the other party as read. Idempotent — safe to
// call repeatedly (on open, on focus, whenever new messages arrive while
// the thread is already visible).
export async function POST(request, { params }) {
  const guard = await requireBuyer();
  if (!guard.ok) return guard.response;
  const { userId } = guard;
  const { id } = params;

  const conversation = await db.conversation.findFirst({ where: { id, buyerId: userId }, select: { id: true } });
  if (!conversation) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Conversation not found." } },
      { status: 404 }
    );
  }

  const result = await db.message.updateMany({
    where: { conversationId: id, readAt: null, NOT: { senderId: userId } },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ success: true, data: { markedRead: result.count } });
}
