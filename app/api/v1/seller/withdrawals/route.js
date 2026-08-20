import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, hasBusinessPermission, unauthorized, forbidden } from "@/lib/auth/rbac";

const schema = z.object({
  businessId: z.string().uuid(),
  amountMinor: z.number().int().positive(),
  method: z.enum(["M-Pesa", "Airtel Money", "Bank Transfer"]),
});

// POST /api/v1/seller/withdrawals
export async function POST(request) {
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
  const { businessId, amountMinor, method } = parsed.data;

  const allowed = await hasBusinessPermission(session.user.id, businessId, "members.manage");
  if (!allowed) return forbidden();

  const payoutMethod = await db.payoutMethod.findUnique({ where: { businessId } });
  if (method === "Bank Transfer" && !payoutMethod?.bankAccountMasked) {
    return Response.json({ success: false, error: { code: "NO_PAYOUT_METHOD", message: "Save a bank account first" } }, { status: 400 });
  }
  if (method !== "Bank Transfer" && !payoutMethod?.phoneVerified) {
    return Response.json({ success: false, error: { code: "NO_PAYOUT_METHOD", message: "Verify a phone number first" } }, { status: 400 });
  }

  // Re-derive available balance server-side — never trust a
  // client-supplied balance for a financial check.
  const [deliveredOrders, existingWithdrawals] = await Promise.all([
    db.order.findMany({ where: { businessId, status: "delivered" }, select: { totalMinor: true, currency: true } }),
    db.withdrawalRequest.findMany({ where: { businessId, status: { in: ["pending", "approved", "paid"] } }, select: { amountMinor: true } }),
  ]);
  const earned = deliveredOrders.reduce((s, o) => s + o.totalMinor, 0);
  const alreadyWithdrawn = existingWithdrawals.reduce((s, w) => s + w.amountMinor, 0);
  const available = earned - alreadyWithdrawn;

  if (amountMinor > available) {
    return Response.json({ success: false, error: { code: "INSUFFICIENT_BALANCE", message: "Amount exceeds your available balance" } }, { status: 409 });
  }

  const destination = method === "Bank Transfer"
    ? `${payoutMethod.bankName} ${payoutMethod.bankAccountMasked}`
    : payoutMethod.phoneNumber;

  const withdrawal = await db.withdrawalRequest.create({
    data: {
      businessId,
      amountMinor,
      currency: deliveredOrders[0]?.currency || "KES",
      method,
      destination,
      status: "pending",
    },
    select: { id: true, amountMinor: true, currency: true, method: true, status: true, createdAt: true },
  });

  return Response.json({ success: true, data: withdrawal }, { status: 201 });
}
