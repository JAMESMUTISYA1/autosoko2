// PATH: lib/orderPayments.js
//
// Orchestrates the buyer-facing payment flow: initiating a provider charge
// across one or more orders from the same checkout (a multi-seller cart
// creates multiple Order rows but should only prompt the buyer once), and
// applying the result — whether it arrives via an async webhook callback
// or a manual "check again" re-query.
//
// KEY DESIGN DECISION: Payment.orderId is a required 1:1 foreign key in
// the schema — there's no native "one payment covers many orders" concept,
// and this doesn't change that. Instead, a multi-order checkout creates
// ONE Payment ROW PER ORDER, all sharing the same providerTransactionId
// (the single CheckoutRequestID / Airtel transaction id behind the one
// prompt actually sent to the buyer's phone). Every confirm/fail operation
// works on the full set of Payment rows sharing that reference, so sibling
// orders always move together — the buyer never ends up with "3 of 4
// orders paid" from what felt like a single payment.

import crypto from "crypto";
import { db } from "@/lib/db";
import { initiateProviderPayment, queryProviderPayment } from "@/lib/payments";

const PROVIDER_LABELS = { mpesa: "M-Pesa", airtel_money: "Airtel Money" };

export async function initiateOrderPayment({ orders, provider, phone }) {
  const amountMinor = orders.reduce((sum, o) => sum + o.totalMinor, 0);
  const transactionId = crypto.randomUUID(); // Airtel needs this up front; M-Pesa ignores it and returns its own instead
  const reference = orders.length === 1 ? orders[0].orderNumber : `AS-${orders[0].id.slice(0, 6)}`;

  const { providerTransactionId, raw } = await initiateProviderPayment(provider, {
    phone,
    amountMinor,
    reference,
    description: `AutoSoko order ${reference}`,
    transactionId,
  });

  // One Payment row per order, all sharing providerTransactionId — see
  // file header for why.
  await db.$transaction(
    orders.map((order) =>
      db.payment.create({
        data: {
          orderId: order.id,
          provider,
          providerTransactionId,
          amountMinor: order.totalMinor,
          currency: order.currency,
          status: "pending",
          rawProviderResponse: raw,
        },
      })
    )
  );

  return { providerTransactionId, provider, amountMinor };
}

// Applies a confirmed result to every Payment row sharing this
// providerTransactionId, and advances their orders together. Idempotent —
// safe to call twice for the same reference (both Safaricom and Airtel
// retry callbacks on anything other than a clean 200 response, and the
// manual "check again" path can also land here after a callback already
// did).
export async function applyPaymentResult({ providerTransactionId, success, raw }) {
  const payments = await db.payment.findMany({ where: { providerTransactionId } });
  if (payments.length === 0) return { updated: 0 };

  if (payments.every((p) => p.status === "completed" || p.status === "failed")) {
    return { updated: 0, alreadyProcessed: true };
  }

  await db.$transaction(async (tx) => {
    for (const payment of payments) {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: success ? "completed" : "failed", rawProviderResponse: raw },
      });

      if (success) {
        const order = await tx.order.findUnique({ where: { id: payment.orderId } });
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentVerified: true,
            paymentVerifiedAt: new Date(),
            // No natural User id for an automated system confirmation —
            // paymentVerifiedBy has no FK constraint in the schema, so
            // this string marker is enough to show up honestly in the
            // audit trail as "not a human decision".
            paymentVerifiedBy: `system:${payment.provider}`,
            // Only advance a still-"pending" order — never clobber a
            // status an admin/agent may have already moved forward
            // (or backward, e.g. to "cancelled") in the meantime.
            ...(order?.status === "pending" ? { status: "confirmed" } : {}),
          },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: payment.orderId,
            status: "confirmed",
            note: `Payment confirmed via ${PROVIDER_LABELS[payment.provider] || payment.provider}`,
          },
        });
      }
    }
  });

  return { updated: payments.length };
}

// Actively re-queries the provider for a stored reference — the "check
// again" / reconciliation path. Never trusts a client-supplied claim of
// success; the provider's own answer, looked up by OUR stored reference,
// is the only thing that can ever mark an order paid.
export async function reconcilePayment(providerTransactionId) {
  const payment = await db.payment.findFirst({ where: { providerTransactionId } });
  if (!payment) return { status: "not_found" };

  const result = await queryProviderPayment(payment.provider, providerTransactionId);
  if (result.status === "completed" || result.status === "failed") {
    await applyPaymentResult({ providerTransactionId, success: result.status === "completed", raw: result.raw });
  }
  return result;
}