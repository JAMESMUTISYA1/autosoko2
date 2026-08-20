import { z } from "zod";
import { db } from "@/lib/db";
import { requirePlatformRole, forbidden } from "@/lib/auth/rbac";

const patchSchema = z.object({ active: z.boolean() });

// PATCH /api/v1/admin/delivery-methods/:id
export async function PATCH(request, { params }) {
  const { allowed } = await requirePlatformRole("agent");
  if (!allowed) return forbidden();

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR" } }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ success: false, error: { code: "VALIDATION_ERROR" } }, { status: 400 });

  const method = await db.deliveryMethod.update({
    where: { id: params.id },
    data: { active: parsed.data.active },
    select: { id: true, active: true },
  });

  return Response.json({ success: true, data: method });
}
