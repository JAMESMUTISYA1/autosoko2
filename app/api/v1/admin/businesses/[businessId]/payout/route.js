import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/adminGuard";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const payout = await db.payoutMethod.findUnique({ where: { businessId: params.businessId } });
  return Response.json({ success: true, data: payout });
}

// PATCH — matches the schema, which only has bankAccountMasked: the full
// account number is masked down to its last 4 digits before it's ever
// written to the DB, and the raw number never touches a `select` or log.
export async function PATCH(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { phoneNumber, phoneVerified, bankName, bankAccountName, bankAccountNumber } = await request.json();

  const bankAccountMasked = bankAccountNumber
    ? `****${bankAccountNumber.toString().slice(-4)}`
    : undefined;

  const before = await db.payoutMethod.findUnique({ where: { businessId: params.businessId } });

  const payout = await db.payoutMethod.upsert({
    where: { businessId: params.businessId },
    update: {
      ...(phoneNumber !== undefined ? { phoneNumber } : {}),
      ...(phoneVerified !== undefined ? { phoneVerified } : {}),
      ...(bankName !== undefined ? { bankName } : {}),
      ...(bankAccountName !== undefined ? { bankAccountName } : {}),
      ...(bankAccountMasked !== undefined ? { bankAccountMasked } : {}),
    },
    create: {
      businessId: params.businessId,
      phoneNumber: phoneNumber || null,
      phoneVerified: Boolean(phoneVerified),
      bankName: bankName || null,
      bankAccountName: bankAccountName || null,
      bankAccountMasked: bankAccountMasked || null,
    },
  });

  await writeAuditLog({
    actorId: guard.adminId, action: "business.payout_updated", entityType: "Business",
    entityId: params.businessId, before, after: payout, request,
  });

  return Response.json({ success: true, data: payout });
}