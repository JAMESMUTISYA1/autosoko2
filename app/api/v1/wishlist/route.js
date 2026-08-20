import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, unauthorized } from "@/lib/auth/rbac";

// GET /api/v1/wishlist — the signed-in user's saved products
export async function GET() {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  const items = await db.wishlist.findMany({
    where: { userId: session.user.id },
    select: {
      createdAt: true,
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          priceMinor: true,
          currency: true,
          condition: true,
          images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ success: true, data: items.map((i) => i.product) });
}

const addSchema = z.object({ productId: z.string().uuid() });

// POST /api/v1/wishlist — add a product. Idempotent: adding an
// already-saved product just succeeds again rather than erroring, since
// "make sure this is saved" is the actual intent, not "fail if it already is."
export async function POST(request) {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "productId is required" } },
      { status: 400 }
    );
  }

  await db.wishlist.upsert({
    where: { userId_productId: { userId: session.user.id, productId: parsed.data.productId } },
    update: {},
    create: { userId: session.user.id, productId: parsed.data.productId },
  });

  return Response.json({ success: true, data: { saved: true } }, { status: 201 });
}
