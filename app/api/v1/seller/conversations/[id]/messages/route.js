import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";
import { MAX_MESSAGE_LENGTH } from "@/lib/messaging";

const PAGE_SIZE = 40;

async function attachSenderNames(messages) {
  const senderIds = [...new Set(messages.map((m) => m.senderId))];
  const senders = senderIds.length
    ? await db.user.findMany({ where: { id: { in: senderIds } }, select: { id: true, fullName: true } })
    : [];
  const senderName = Object.fromEntries(senders.map((s) => [s.id, s.fullName]));
  return messages.map((m) => ({ ...m, senderName: senderName[m.senderId] || null }));
}

// GET /api/v1/seller/conversations/:id/messages?after=<id>|before=<id>
// Same cursor design as the buyer-side route: a real message id, its
// createdAt resolved server-side (and ownership-checked in the same
// query), never a client-supplied timestamp.
export async function GET(request, { params }) {
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
      take: 100,
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

  messages = await attachSenderNames(messages);

  return NextResponse.json({ success: true, data: { messages, hasMoreOlder } });
}

const sendSchema = z.object({
  body: z.string().trim().min(1, "Message can't be empty").max(MAX_MESSAGE_LENGTH),
});

// POST /api/v1/seller/conversations/:id/messages   { body }
// Any business member can reply — no per-role gate, matching the "any
// team member, full access" call made for this feature.
export async function POST(request, { params }) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;
  const { sellerId, businessId } = guard;
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

  const conversation = await db.conversation.findFirst({ where: { id, businessId }, select: { id: true } });
  if (!conversation) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Conversation not found." } },
      { status: 404 }
    );
  }

  const [message] = await db.$transaction([
    db.message.create({
      data: { conversationId: id, senderId: sellerId, body: parsed.data.body, messageType: "text" },
    }),
    db.conversation.update({ where: { id }, data: { lastMessageAt: new Date() } }),
  ]);

  const [withName] = await attachSenderNames([message]);
  return NextResponse.json({ success: true, data: withName }, { status: 201 });
}
