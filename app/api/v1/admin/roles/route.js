import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/adminGuard";

// GET /api/v1/admin/roles?scope=business (defaults to "business")
export async function GET(request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") || "business";

  const roles = await db.role.findMany({ where: { scope }, orderBy: { name: "asc" } });
  return Response.json({ success: true, data: roles });
}