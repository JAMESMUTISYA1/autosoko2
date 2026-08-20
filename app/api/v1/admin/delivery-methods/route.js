import { z } from "zod";
import { db } from "@/lib/db";
import { requirePlatformRole, forbidden } from "@/lib/auth/rbac";

// GET /api/v1/admin/delivery-methods?townId=...
export async function GET(request) {
  const { allowed } = await requirePlatformRole("agent");
  if (!allowed) return forbidden();

  const { searchParams } = new URL(request.url);
  const townId = searchParams.get("townId");

  const methods = await db.deliveryMethod.findMany({
    where: townId ? { townId } : {},
    select: {
      id: true, townId: true, method: true, provider: true, etaDays: true, feeMinor: true, active: true,
      town: { select: { name: true } },
      adder: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({
    success: true,
    data: methods.map((m) => ({ ...m, addedBy: m.adder?.fullName || null })),
  });
}

const createSchema = z.object({
  townId: z.string().uuid(),
  method: z.string().min(2),
  provider: z.string().min(1),
  etaDays: z.number().int().min(0),
  feeMinor: z.number().int().min(0),
});

// POST /api/v1/admin/delivery-methods
export async function POST(request) {
  const { session, allowed } = await requirePlatformRole("agent");
  if (!allowed) return forbidden();

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR" } }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const fields = {};
    for (const issue of parsed.error.issues) fields[issue.path[0]] = issue.message;
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR", fields } }, { status: 400 });
  }

  const method = await db.deliveryMethod.create({
    data: { ...parsed.data, addedBy: session.user.id },
    select: { id: true, method: true, provider: true },
  });

  return Response.json({ success: true, data: method }, { status: 201 });
}
