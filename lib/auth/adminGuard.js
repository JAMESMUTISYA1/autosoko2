import { adminAuth } from "@/Adminauth";

const ADMIN_ROLES = new Set(["Super Admin", "Ops Admin"]);

// Call this first in every /api/v1/admin/** route handler. There is NO
// middleware coverage for API routes (middleware.js only matches page
// routes: /admin/:path*, /agent/:path*, /seller/:path*) — so without this
// call, an admin API route is wide open to anyone who finds the URL.
export async function requireAdmin() {
  const session = await adminAuth();
  const role = session?.user?.role;

  if (!session?.user?.id || typeof role !== "string" || !ADMIN_ROLES.has(role)) {
    return {
      ok: false,
      response: Response.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Admin access required" } },
        { status: 401 }
      ),
    };
  }

  return { ok: true, adminId: session.user.id, role };
}