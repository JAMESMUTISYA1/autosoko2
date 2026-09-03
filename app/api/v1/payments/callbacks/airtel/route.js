// PATH: app/api/v1/payments/callbacks/airtel/route.js
//
// POST — Airtel's equivalent webhook, fired when the buyer completes (or
// declines) the collection prompt. Same shared-secret gate as the M-Pesa
// callback — Airtel sandbox doesn't sign webhook payloads either.

import { parseCollectionCallback } from "@/lib/payments/airtel";
import { applyPaymentResult } from "@/lib/orderPayments";

export async function POST(request) {
  const key = new URL(request.url).searchParams.get("key");
  if (key !== process.env.PAYMENT_CALLBACK_SECRET) {
    return new Response(null, { status: 200 });
  }

  const body = await request.json().catch(() => null);
  const parsed = body ? parseCollectionCallback(body) : null;

  if (parsed?.transactionId) {
    await applyPaymentResult({
      providerTransactionId: parsed.transactionId,
      success: parsed.success,
      raw: parsed.raw,
    }).catch((err) => console.error("[callbacks/airtel]", err));
  }

  return Response.json({ status: "received" });
}