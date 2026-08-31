// Guard for /api/v1/conversations/** routes — call this first in every
// handler, same reasoning as requireSeller(): middleware.js doesn't cover
// /api paths, so each route has to check for itself.
//
// NOTE: assuming the main storefront session (the one buyers and sellers
// both browse the site as themselves under — the admin auth config
// explicitly calls out keeping itself separate from "the buyer/seller
// auth") is exported as `auth` from a root `Auth.js`, matching the
// `Sellerauth.js` / `Adminauthconfig.js` convention already in the repo.
// If it actually lives somewhere else, this import is the only line that
// needs to change.
import { auth } from "@/auth";

export async function requireBuyer() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      response: Response.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Sign in to view your messages." } },
        { status: 401 }
      ),
    };
  }

  return { ok: true, userId: session.user.id };
}
