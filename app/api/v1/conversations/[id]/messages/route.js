import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireBuyer } from "@/lib/auth/buyer";
import { MAX_MESSAGE_LENGTH } from "@/lib/messaging";

const PAGE_SIZE = 40;

// GET /api/v1/conversations/:id/messages?after=<messageId>
// GET /api/v1/conversations/:id/messages?before=<messageId>
//
// `after`  -> messages newer than a known one. This is the polling path:
//             cheap, small result, called every few seconds while a
//             thread is open.
// `before` -> messages older than a known one. This is "load more" when
//             scrolling up through history.
// Neither takes a client-supplied timestamp — the cursor is a real
// message id, and its createdAt is looked up server-side (scoped to this
// conversation, so it doubles as an ownership check on the cursor itself)
// rather than trusted from the request. Avoids clock-skew bugs and
// forged-cursor edge cases for free.
export async function GET(request, { params }) {
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

  const { searchParams } = new URL(request.url);
  const afterId = searchParams.get("after");
  const beforeId = searchParams.get("before");

  let cursor = null;
  if (afterId || beforeId) {
    cursor = await db.message.findFirst({
      where: { id: afterId || beforeId, conversationId: id },
      select: { createdAt: true },
    });
    if (!cursor) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid cursor." } },
        { status: 422 }
      );
    }
  }

  let messages;
  let hasMoreOlder = false;

  if (beforeId) {
    messages = await db.message.findMany({
      where: { conversationId: id, createdAt: { lt: cursor.createdAt } },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    });
    hasMoreOlder = messages.length === PAGE_SIZE;
    messages.reverse();
  } else if (afterId) {
    messages = await db.message.findMany({
      where: { conversationId: id, createdAt: { gt: cursor.createdAt } },
      orderBy: { createdAt: "asc" },
      take: 100, // a "what did I miss" catch-up, generously capped
    });
  } else {
    messages = await db.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    });
    hasMoreOlder = messages.length === PAGE_SIZE;
    messages.reverse();
  }

  return NextResponse.json({ success: true, data: { messages, hasMoreOlder } });
}

const sendSchema = z.object({
  body: z.string().trim().min(1, "Message can't be empty").max(MAX_MESSAGE_LENGTH),
});

// POST /api/v1/conversations/:id/messages   { body }
export async function POST(request, { params }) {
  const guard = await requireBuyer();
  if (!guard.ok) return guard.response;
  const { userId } = guard;
  const { id } = params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body." } },
      { status: 400 }
    );
  }

  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Invalid input." } },
      { status: 422 }
    );
  }

  const conversation = await db.conversation.findFirst({ where: { id, buyerId: userId }, select: { id: true } });
  if (!conversation) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Conversation not found." } },
      { status: 404 }
    );
  }

  const [message] = await db.$transaction([
    db.message.create({
      data: { conversationId: id, senderId: userId, body: parsed.data.body, messageType: "text" },
    }),
    db.conversation.update({ where: { id }, data: { lastMessageAt: new Date() } }),
  ]);

  return NextResponse.json({ success: true, data: message }, { status: 201 });
}
