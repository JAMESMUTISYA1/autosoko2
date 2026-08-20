import { db } from "@/lib/db";
import { getSession, unauthorized } from "@/lib/auth/rbac";

// DELETE /api/v1/wishlist/:productId
export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  await db.wishlist
    .delete({
      where: { userId_productId: { userId: session.user.id, productId: params.productId } },
    })
    .catch(() => {}); // already removed — deleting a non-existent wishlist entry is not an error

  return Response.json({ success: true, data: { saved: false } });
}
