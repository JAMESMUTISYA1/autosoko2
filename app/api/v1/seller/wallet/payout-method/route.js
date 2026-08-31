import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const payout = await db.payoutMethod.findUnique({ where: { businessId: guard.businessId } });
  return Response.json({ success: true, data: payout });
}

// PATCH — same masking rule as the admin payout endpoint: the full bank
// account number is never persisted, only the last 4 digits. `phoneVerified`
// is deliberately NOT writable here — only an admin/verification flow can
// set that to true; changing the number resets it to false so a stale
// "verified" flag can never survive a number change.
export async function PATCH(request) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const { phoneNumber, bankName, bankAccountName, bankAccountNumber } = await request.json();

  const bankAccountMasked = bankAccountNumber ? `****${bankAccountNumber.toString().slice(-4)}` : undefined;

  const before = await db.payoutMethod.findUnique({ where: { businessId: guard.businessId } });

  const payout = await db.payoutMethod.upsert({
    where: { businessId: guard.businessId },
    update: {
      ...(phoneNumber !== undefined ? { phoneNumber, phoneVerified: false } : {}),
      ...(bankName !== undefined ? { bankName } : {}),
      ...(bankAccountName !== undefined ? { bankAccountName } : {}),
      ...(bankAccountMasked !== undefined ? { bankAccountMasked } : {}),
    },
    create: {
      businessId: guard.businessId,
      phoneNumber: phoneNumber || null,
      bankName: bankName || null,
      bankAccountName: bankAccountName || null,
      bankAccountMasked: bankAccountMasked || null,
    },
  });

  await writeAuditLog({
    actorId: guard.sellerId, action: "payout_method.updated_by_seller", entityType: "Business",
    entityId: guard.businessId, before, after: payout, request,
  });

  return Response.json({ success: true, data: payout });
}