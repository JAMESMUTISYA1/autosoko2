// PATH: app/api/v1/payments/reconcile/route.js
//
// POST { ref, note? } — "I already paid but it's not showing" fallback.
// Actively re-queries the provider using OUR stored reference (never the
// client's own claim of success) — this is what makes it safe to expose
// directly to buyers with no admin in the loop. `note` (e.g. an M-Pesa
// receipt number the buyer read off their phone) is stored purely for
// support traceability; it is NEVER used to decide whether the order gets
// marked paid — see lib/payments/mpesa.js's queryStkPush and
// lib/payments/airtel.js's queryTransaction, both of which only accept
// server-held references.

import { db } from "@/lib/db";
import { getSession, unauthorized, forbidden } from "@/lib/auth/rbac";
import { checkRateLimit, getClientIdentifier } from "@/lib/auth/rateLimit";
import { reconcilePayment } from "@/lib/orderPayments";

export async function POST(request) {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  const identifier = getClientIdentifier(request, session.user.id);
  const { success: withinLimit } = await checkRateLimit(identifier, "payment-reconcile");
  if (!withinLimit) {
    return Response.json(
      { success: false, error: { code: "RATE_LIMITED", message: "Please wait a moment before checking again" } },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const ref = body?.ref;
  if (!ref) {
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR", message: "ref is required" } }, { status: 400 });
  }

  const payment = await db.payment.findFirst({ where: { providerTransactionId: ref }, include: { order: true } });
  if (!payment) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Payment not found" } }, { status: 404 });
  }
  if (payment.order.buyerId !== session.user.id) {
    return forbidden("Not your payment");
  }

  // Stored for support only — see file header. Never read by the
  // verification path itself.
  if (body.note) {
    await db.payment.update({
      where: { id: payment.id },
      data: { rawProviderResponse: { ...(payment.rawProviderResponse || {}), buyerNote: String(body.note).slice(0, 200) } },
    });
  }

  try {
    const result = await reconcilePayment(ref);
    return Response.json({ success: true, data: { status: result.status } });
  } catch (err) {
    console.error("[payments/reconcile]", err);
    return Response.json({ success: false, error: { code: "PROVIDER_ERROR", message: "Couldn't reach the payment provider — try again shortly" } }, { status: 502 });
  }
}