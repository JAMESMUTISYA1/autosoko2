// PATH: app/api/v1/payments/callbacks/mpesa/route.js
//
// POST — Safaricom Daraja calls this the instant the buyer completes (or
// cancels/times out) the STK prompt. Necessarily public — Safaricom can't
// send a session cookie — so it's protected instead by a shared secret in
// the URL's query string (appended when the callback URL is built in
// lib/payments/mpesa.js's initiateStkPush). Anything without a matching
// ?key= is rejected before the body is even parsed.
//
// This route is what "just confirms the payment direct" means in
// practice: there is no admin review step between this callback firing
// and the order flipping to paid — see applyPaymentResult in
// lib/orderPayments.js for exactly what that triggers.

import { parseStkCallback } from "@/lib/payments/mpesa";
import { applyPaymentResult } from "@/lib/orderPayments";

export async function POST(request) {
  const key = new URL(request.url).searchParams.get("key");
  if (key !== process.env.PAYMENT_CALLBACK_SECRET) {
    // Still 200 on a bad key — a non-200 here just makes Safaricom retry
    // the same forged request, and returning a different status for
    // "wrong secret" vs "right secret, bad payload" is itself an oracle
    // an attacker could use to find the real secret by trial and error.
    return Response.json({ ResultCode: 1, ResultDesc: "Rejected" }, { status: 200 });
  }

  const body = await request.json().catch(() => null);
  const parsed = body ? parseStkCallback(body) : null;

  if (parsed?.checkoutRequestId) {
    await applyPaymentResult({
      providerTransactionId: parsed.checkoutRequestId,
      success: parsed.success,
      raw: parsed.raw,
    }).catch((err) => console.error("[callbacks/mpesa]", err));
  }

  // Safaricom only wants a 200 + this exact ack shape — it is NOT read as
  // pass/fail of the actual payment, only "we received your callback".
  return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
}