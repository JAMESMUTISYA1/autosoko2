import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";
import { writeAuditLog } from "@/lib/audit";

// A seller can only cancel their own request, and only while it's still
// "pending" — once an admin has approved or paid it, it's locked (that's
// the whole point). Rejection is an admin action for later; this is the
// seller-side equivalent for a request nobody has acted on yet.
export async function DELETE(request, { params }) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const withdrawal = await db.withdrawalRequest.findFirst({
    where: { id: params.withdrawalId, businessId: guard.businessId },
  });
  if (!withdrawal) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Withdrawal request not found" } }, { status: 404 });
  }
  if (withdrawal.status !== "pending") {
    return Response.json(
      { success: false, error: { code: "CONFLICT", message: "Only a pending request can be cancelled — this one has already been actioned" } },
      { status: 409 }
    );
  }

  // OrderPayout has onDelete: Cascade on its withdrawalRequest relation, so
  // deleting the request automatically deletes its order claims — the
  // orders it had reserved become available again on the very next balance
  // calculation, with no manual cleanup needed here.
  await db.withdrawalRequest.delete({ where: { id: params.withdrawalId } });

  await writeAuditLog({
    actorId: guard.sellerId, action: "withdrawal.cancelled_by_seller", entityType: "WithdrawalRequest",
    entityId: params.withdrawalId, before: withdrawal, request,
  });

  return Response.json({ success: true });
}