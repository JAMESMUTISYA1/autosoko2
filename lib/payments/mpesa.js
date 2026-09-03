// PATH: lib/payments/mpesa.js
//
// Safaricom Daraja API client (STK Push / Lipa na M-Pesa Online).
// Sandbox base URL by default — set MPESA_ENV=production to switch once
// you have live Daraja credentials.
//
// Required env vars:
//   MPESA_ENV                "sandbox" (default) | "production"
//   MPESA_CONSUMER_KEY
//   MPESA_CONSUMER_SECRET
//   MPESA_SHORTCODE          your Paybill/Till number (sandbox default: 174379)
//   MPESA_PASSKEY            Lipa na M-Pesa Online passkey
//   MPESA_CALLBACK_URL       full public HTTPS URL Safaricom will POST to
//                            (must be reachable from the internet — use
//                            ngrok or similar for local dev)
//   PAYMENT_CALLBACK_SECRET  shared secret appended to callback URLs as
//                            ?key=... — Daraja does not sign webhook
//                            payloads, so this is what stops a spoofed
//                            POST to your callback route from faking a
//                            payment confirmation

const BASE_URL =
  process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

function timestamp() {
  const d = new Date();
  const pad = (n) => n.toString().padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

async function getAccessToken() {
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString("base64");
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`M-Pesa auth failed: ${res.status}`);
  const json = await res.json();
  return json.access_token;
}

// amountMinor is in the schema's lowest-unit convention (cents) — M-Pesa
// wants a whole-KES integer, so this divides by 100 and rounds. Daraja
// sandbox also rejects decimals.
export async function initiateStkPush({ phone, amountMinor, accountReference, description }) {
  const token = await getAccessToken();
  const ts = timestamp();
  const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${ts}`).toString("base64");
  const callbackUrl = `${process.env.MPESA_CALLBACK_URL}?key=${encodeURIComponent(process.env.PAYMENT_CALLBACK_SECRET)}`;

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: ts,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amountMinor / 100),
      PartyA: phone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: accountReference.slice(0, 12), // Daraja hard limit
      TransactionDesc: description.slice(0, 13),
    }),
  });

  const json = await res.json();
  if (!res.ok || json.ResponseCode !== "0") {
    throw new Error(json.errorMessage || json.ResponseDescription || "STK push failed");
  }
  // CheckoutRequestID is the only handle Safaricom gives back — this is
  // what gets stored as Payment.providerTransactionId and used for every
  // later query.
  return { checkoutRequestId: json.CheckoutRequestID, merchantRequestId: json.MerchantRequestID, raw: json };
}

// Re-queries Safaricom directly for a transaction we already initiated.
// This is the "check again" fallback for when the async callback never
// arrives (a known, documented Daraja quirk, common in sandbox) — it only
// ever accepts OUR OWN stored CheckoutRequestID, never anything supplied
// by the buyer, so it can't be used to fake a payment.
export async function queryStkPush(checkoutRequestId) {
  const token = await getAccessToken();
  const ts = timestamp();
  const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${ts}`).toString("base64");

  const res = await fetch(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: ts,
      CheckoutRequestID: checkoutRequestId,
    }),
  });
  const json = await res.json();

  // ResultCode 0 = paid. Any other defined ResultCode (e.g. 1032 =
  // cancelled by user, 1037 = timeout) means it's genuinely over and
  // failed. An UNDEFINED ResultCode means Safaricom is still processing —
  // that has to stay "pending", not get treated as a failure, or a slow
  // (but eventually successful) payment would be wrongly rejected.
  if (json.ResultCode === "0" || json.ResultCode === 0) {
    return { status: "completed", raw: json };
  }
  if (json.ResultCode !== undefined && json.ResultCode !== null) {
    return { status: "failed", raw: json };
  }
  return { status: "pending", raw: json };
}

// Parses Safaricom's async STK callback body into a normalized shape.
// Shape reference: https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate
export function parseStkCallback(body) {
  const stk = body?.Body?.stkCallback;
  if (!stk) return null;

  const success = stk.ResultCode === 0;
  let amountMinor = null;
  let mpesaReceiptNumber = null;
  if (success && Array.isArray(stk.CallbackMetadata?.Item)) {
    for (const item of stk.CallbackMetadata.Item) {
      if (item.Name === "Amount") amountMinor = Math.round(item.Value * 100);
      if (item.Name === "MpesaReceiptNumber") mpesaReceiptNumber = item.Value;
    }
  }

  return {
    checkoutRequestId: stk.CheckoutRequestID,
    success,
    resultCode: stk.ResultCode,
    resultDesc: stk.ResultDesc,
    amountMinor,
    mpesaReceiptNumber,
    raw: body,
  };
}