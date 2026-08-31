import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";
import { writeAuditLog } from "@/lib/audit";
import { getAvailableBalance, allocateOrdersToWithdrawal } from "@/lib/wallet";

// Adjust to your real policy — could also vary by currency/country later.
const MIN_WITHDRAWAL_MINOR = 100000; // KES 1,000

const VALID_METHODS = new Set(["M-Pesa", "Airtel Money", "Bank Transfer"]);

export async function GET(request) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 20));

  const [withdrawals, total] = await Promise.all([
    db.withdrawalRequest.findMany({
      where: { businessId: guard.businessId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        payoutLinks: {
          select: { orderId: true, amountMinor: true, order: { select: { orderNumber: true } } },
        },
      },
    }),
    db.withdrawalRequest.count({ where: { businessId: guard.businessId } }),
  ]);

  return Response.json({
    success: true,
    data: withdrawals,
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  });
}

export async function POST(request) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const { amountMinor, method } = await request.json();

  if (!VALID_METHODS.has(method)) {
    return Response.json(
      { success: false, error: { code: "VALIDATION", message: "method must be M-Pesa, Airtel Money, or Bank Transfer" } },
      { status: 400 }
    );
  }
  if (!amountMinor || amountMinor < MIN_WITHDRAWAL_MINOR) {
    return Response.json(
      {
        success: false,
        error: { code: "VALIDATION", message: `Minimum withdrawal is ${(MIN_WITHDRAWAL_MINOR / 100).toLocaleString()}` },
      },
      { status: 400 }
    );
  }

  const payoutMethod = await db.payoutMethod.findUnique({ where: { businessId: guard.businessId } });

  let destination;
  if (method === "Bank Transfer") {
    if (!payoutMethod?.bankAccountMasked) {
      return Response.json(
        { success: false, error: { code: "VALIDATION", message: "Add your bank account details in Payout Settings first" } },
        { status: 400 }
      );
    }
    destination = `${payoutMethod.bankName || "Bank"} ${payoutMethod.bankAccountMasked}`;
  } else {
    if (!payoutMethod?.phoneNumber) {
      return Response.json(
        { success: false, error: { code: "VALIDATION", message: "Add your mobile money number in Payout Settings first" } },
        { status: 400 }
      );
    }
    destination = payoutMethod.phoneNumber;
  }

  const business = await db.business.findUnique({ where: { id: guard.businessId }, select: { homeCurrency: true } });

  const available = await getAvailableBalance(guard.businessId);
  if (amountMinor > available) {
    return Response.json(
      { success: false, error: { code: "VALIDATION", message: "Amount exceeds your available balance" } },
      { status: 400 }
    );
  }

  // Create the request AND reserve the orders that fund it in one
  // transaction. This is what makes "an order can never be requested
  // twice" airtight: the moment this commits, the OrderPayout rows exist,
  // and getAvailableBalance()/getEligibleOrdersWithRemaining() will
  // permanently exclude that portion of those orders from every future
  // request — this one or any other — regardless of whether this request
  // is later approved, paid, or just left pending.
  let withdrawal;
  try {
    withdrawal = await db.$transaction(async (tx) => {
      const created = await tx.withdrawalRequest.create({
        data: {
          businessId: guard.businessId,
          amountMinor,
          currency: business?.homeCurrency || "KES",
          method,
          destination,
          status: "pending",
        },
      });
      await allocateOrdersToWithdrawal(tx, guard.businessId, created.id, amountMinor);
      return created;
    });
  } catch (err) {
    if (err.message === "INSUFFICIENT_BALANCE") {
      return Response.json(
        { success: false, error: { code: "CONFLICT", message: "Your balance changed — please refresh and try again" } },
        { status: 409 }
      );
    }
    throw err;
  }

  await writeAuditLog({
    actorId: guard.sellerId, action: "withdrawal.requested_by_seller", entityType: "WithdrawalRequest",
    entityId: withdrawal.id, after: withdrawal, request,
  });

  return Response.json({ success: true, data: withdrawal }, { status: 201 });
}