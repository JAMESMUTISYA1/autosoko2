import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireBuyer } from "@/lib/auth/buyer";

// GET /api/v1/conversations?search=
//
// Inbox list for the signed-in buyer. Scoped by buyerId from the session
// on every query — there is no code path here that can return someone
// else's conversations.
export async function GET(request) {
  const guard = await requireBuyer();
  if (!guard.ok) return guard.response;
  const { userId } = guard;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();

  const where = {
    buyerId: userId,
    ...(search ? { business: { name: { contains: search, mode: "insensitive" } } } : {}),
  };

  const conversations = await db.conversation.findMany({
    where,
    include: {
      business: { select: { id: true, name: true, slug: true, logoUrl: true, verificationStatus: true } },
      product: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { messages: { where: { readAt: null, NOT: { senderId: userId } } } } },
    },
    orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
    take: 100,
  });

  return NextResponse.json({
    success: true,
    data: conversations.map((c) => ({
      id: c.id,
      business: c.business,
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
    })),
  });
}

const createSchema = z.object({
  businessId: z.string().uuid(),
  productSlug: z.string().trim().max(255).optional(),
});

// POST /api/v1/conversations   { businessId, productSlug? }
//
// Find-or-create — one conversation per (buyer, business) pair. A product
// slug just attaches context (and seeds a one-time system message); it
// never fragments the thread into multiple conversations with the same
// business.
export async function POST(request) {
  const guard = await requireBuyer();
  if (!guard.ok) return guard.response;
  const { userId } = guard;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body." } },
      { status: 400 }
    );
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Invalid input." } },
      { status: 422 }
    );
  }
  const { businessId, productSlug } = parsed.data;

  try {
    // 1. Verify business exists and is active
    const business = await db.business.findFirst({
      where: { id: businessId, deletedAt: null, status: "active" },
      select: { id: true },
    });
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "This seller isn't available to message right now." } },
        { status: 404 }
      );
    }

    // 2. Resolve product if slug provided
    let product = null;
    if (productSlug) {
      product = await db.product.findFirst({
        where: { businessId, slug: productSlug, deletedAt: null },
        select: { id: true, name: true },
      });
    }

    // 3. Find existing conversation
    let conversation = await db.conversation.findFirst({
      where: { buyerId: userId, businessId },
    });

    // 4. Create if not exists
    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          buyerId: userId,
          businessId,
          productId: product?.id || null,
          lastMessageAt: product ? new Date() : null,
        },
      });
      // Add system message if product context exists
      if (product) {
        await db.message.create({
          data: {
            conversationId: conversation.id,
            senderId: userId,
            body: `Started a conversation about "${product.name}".`,
            messageType: "system",
          },
        });
      }
    } else if (product && !conversation.productId) {
      // Existing thread, new product context
      await db.conversation.update({
        where: { id: conversation.id },
        data: { productId: product.id, lastMessageAt: new Date() },
      });
      await db.message.create({
        data: {
          conversationId: conversation.id,
          senderId: userId,
          body: `Also asking about "${product.name}".`,
          messageType: "system",
        },
      });
    }

    return NextResponse.json({ success: true, data: { id: conversation.id } }, { status: 201 });
  } catch (error) {
    console.error("Failed to find/create conversation:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not open conversation." } },
      { status: 500 }
    );
  }
}