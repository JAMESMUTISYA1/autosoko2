import { sellerAuth } from "@/Sellerauth";

// Call this first in every /api/v1/seller/** route handler — same reasoning
// as requireAdmin: middleware.js doesn't cover /api paths.
export async function requireSeller() {
  const session = await sellerAuth();

  if (!session?.user?.id || !session?.user?.businessId) {
    return {
      ok: false,
      response: Response.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Seller access required" } },
        { status: 401 }
      ),
    };
  }

  return { ok: true, sellerId: session.user.id, businessId: session.user.businessId };
}