// PATH: lib/payments/airtel.js
//
// Airtel Money Open API client (Collections / "request to pay").
// Sandbox base URL by default — set AIRTEL_ENV=production to switch once
// you have live Airtel credentials.
//
// Required env vars:
//   AIRTEL_ENV                "sandbox" (default) | "production"
//   AIRTEL_CLIENT_ID
//   AIRTEL_CLIENT_SECRET
//   AIRTEL_COUNTRY             e.g. "KE"
//   AIRTEL_CURRENCY            e.g. "KES"
//   AIRTEL_CALLBACK_URL        full public HTTPS URL Airtel will POST to
//   PAYMENT_CALLBACK_SECRET    shared with the M-Pesa client, same purpose
//                              — Airtel sandbox also doesn't sign webhooks

const BASE_URL =
  process.env.AIRTEL_ENV === "production"
    ? "https://openapi.airtel.africa"
    : "https://openapiuat.airtel.africa";

async function getAccessToken() {
  const res = await fetch(`${BASE_URL}/auth/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.AIRTEL_CLIENT_ID,
      client_secret: process.env.AIRTEL_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) throw new Error(`Airtel auth failed: ${res.status}`);
  const json = await res.json();
  return json.access_token;
}

// Unlike M-Pesa (which hands back its own CheckoutRequestID), Airtel
// expects US to generate the transaction id up front — the caller passes
// one in (see lib/orderPayments.js, uses crypto.randomUUID()).
export async function initiateCollection({ phone, amountMinor, transactionId }) {
  const token = await getAccessToken();

  const res = await fetch(`${BASE_URL}/merchant/v1/payments/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Country": process.env.AIRTEL_COUNTRY || "KE",
      "X-Currency": process.env.AIRTEL_CURRENCY || "KES",
    },
    body: JSON.stringify({
      reference: transactionId,
      subscriber: {
        country: process.env.AIRTEL_COUNTRY || "KE",
        currency: process.env.AIRTEL_CURRENCY || "KES",
        msisdn: phone.replace(/^254/, ""), // Airtel wants the local number without the country code
      },
      transaction: {
        amount: Math.round(amountMinor / 100),
        country: process.env.AIRTEL_COUNTRY || "KE",
        currency: process.env.AIRTEL_CURRENCY || "KES",
        id: transactionId,
      },
    }),
  });

  const json = await res.json();
  if (!res.ok || json.status?.success === false) {
    throw new Error(json.status?.message || "Airtel collection request failed");
  }
  return { transactionId, raw: json };
}

// Queries Airtel for the status of a transaction by its id. Used both for
// our own "check again" fallback (querying OUR stored transactionId) and
// — uniquely to Airtel, unlike M-Pesa — can also validly look up an id the
// buyer read off their own confirmation SMS, since Airtel's enquiry
// endpoint accepts any valid transaction id, not just ones this app
// created. Either way, this function only ever reports what Airtel itself
// says; it never trusts a status claimed by the caller.
export async function queryTransaction(transactionId) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/standard/v1/payments/${transactionId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Country": process.env.AIRTEL_COUNTRY || "KE",
      "X-Currency": process.env.AIRTEL_CURRENCY || "KES",
    },
  });
  const json = await res.json();

  const txStatus = json?.data?.transaction?.status; // "TS" success, "TF" failed, "TIP" in progress
  if (txStatus === "TS") return { status: "completed", raw: json };
  if (txStatus === "TF") return { status: "failed", raw: json };
  return { status: "pending", raw: json };
}

// Parses Airtel's async collection callback into a normalized shape.
export function parseCollectionCallback(body) {
  const tx = body?.transaction;
  if (!tx) return null;
  const success = tx.status_code === "TS" || body?.status?.success === true;
  return {
    transactionId: tx.id,
    success,
    resultDesc: tx.message || body?.status?.message,
    amountMinor: tx.amount ? Math.round(Number(tx.amount) * 100) : null,
    raw: body,
  };
}