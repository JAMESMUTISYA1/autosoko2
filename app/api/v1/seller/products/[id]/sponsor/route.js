import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, hasBusinessPermission, unauthorized, forbidden } from "@/lib/auth/rbac";

const schema = z.object({ durationDays: z.number().int().positive() });

// POST /api/v1/seller/products/:id/sponsor
// Sets `sponsored = true` immediately — expiry after `durationDays`
// needs a scheduled job (BullMQ, per Document 1) to flip it back, which
// isn't wired up yet; sponsorship is "on" but doesn't auto-expire until
// that job exists. Flagged, not hidden.
export async function POST(request, { params }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR" } }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ success: false, error: { code: "VALIDATION_ERROR" } }, { status: 400 });

  const product = await db.product.findUnique({ where: { id: params.id }, select: { businessId: true, name: true } });
  if (!product) return Response.json({ success: false, error: { code: "NOT_FOUND" } }, { status: 404 });

  const allowed = await hasBusinessPermission(session.user.id, product.businessId, "products.update");
  if (!allowed) return forbidden();

  const updated = await db.product.update({
    where: { id: params.id },
    data: { sponsored: true },
    select: { id: true, name: true, sponsored: true },
  });

  return Response.json({ success: true, data: updated }, { status: 201 });
}
