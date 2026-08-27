import { db } from "@/lib/db";
import { getSession, unauthorized } from "@/lib/auth/rbac";

// DELETE /api/v1/wishlist/:productId — remove a saved product (idempotent)
export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  await db.wishlist.deleteMany({
    where: { userId: session.user.id, productId: params.productId },
  });

  return Response.json({ success: true, data: { saved: false } });
}