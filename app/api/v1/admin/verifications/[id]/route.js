import { z } from "zod";
import { db } from "@/lib/db";
import { requirePlatformRole, forbidden } from "@/lib/auth/rbac";

const decisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
});

// PATCH /api/v1/admin/verifications/:id — Document 3 §11.2
export async function PATCH(request, { params }) {
  const { session, allowed } = await requirePlatformRole("agent");
  if (!allowed) return forbidden();

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR" } }, { status: 400 });
  }

  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR" } }, { status: 400 });
  }

  const verificationStatus = parsed.data.decision === "approved" ? "verified" : "rejected";

  const business = await db.business.update({
    where: { id: params.id },
    data: { verificationStatus },
    select: { id: true, name: true, verificationStatus: true },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: `business.verification.${parsed.data.decision}`,
      entityType: "business",
      entityId: business.id,
    },
  });

  return Response.json({ success: true, data: business });
}
