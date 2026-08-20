import { db } from "@/lib/db";
import { requirePlatformRole, forbidden } from "@/lib/auth/rbac";

// PATCH /api/v1/support/:id/resolve
export async function PATCH(request, { params }) {
  const { session, allowed } = await requirePlatformRole("agent");
  if (!allowed) return forbidden();

  const message = await db.supportMessage.update({
    where: { id: params.id },
    data: { status: "resolved", resolvedBy: session.user.id, resolvedAt: new Date() },
    select: { id: true, status: true },
  });

  return Response.json({ success: true, data: message });
}
