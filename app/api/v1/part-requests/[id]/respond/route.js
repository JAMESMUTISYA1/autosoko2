import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, unauthorized, forbidden } from "@/lib/auth/rbac";

const schema = z.object({
  businessId: z.string().uuid(),
  message: z.string().trim().min(3).max(1000),
  priceMinor: z.number().int().positive().optional(),
});

// POST /api/v1/part-requests/:id/respond
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
  if (!parsed.success) {
    const fields = {};
    for (const issue of parsed.error.issues) fields[issue.path[0]] = issue.message;
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR", fields } }, { status: 400 });
  }

  // Caller must actually own/manage the business they're responding as.
  const membership = await db.businessMember.findUnique({
    where: { businessId_userId: { businessId: parsed.data.businessId, userId: session.user.id } },
  });
  if (!membership) return forbidden("You can only respond as a business you belong to");

  const response = await db.partRequestResponse.create({
    data: { partRequestId: params.id, ...parsed.data },
    select: { id: true, message: true, createdAt: true },
  });

  return Response.json({ success: true, data: response }, { status: 201 });
}
