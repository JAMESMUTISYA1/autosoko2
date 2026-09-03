// PATH: lib/payments/index.js
//
// Thin dispatcher so route handlers and lib/orderPayments.js never need to
// know which provider module to import directly — one call site, provider
// picked at runtime off the `provider` string already stored on Payment
// rows (matches the PaymentProviderType enum values "mpesa"/"airtel_money"
// in the schema).

import * as mpesa from "./mpesa";
import * as airtel from "./airtel";

export async function initiateProviderPayment(provider, { phone, amountMinor, reference, description, transactionId }) {
  if (provider === "mpesa") {
    const { checkoutRequestId, raw } = await mpesa.initiateStkPush({ phone, amountMinor, accountReference: reference, description });
    return { providerTransactionId: checkoutRequestId, raw };
  }
  if (provider === "airtel_money") {
    const { raw } = await airtel.initiateCollection({ phone, amountMinor, transactionId });
    return { providerTransactionId: transactionId, raw };
  }
  throw new Error(`Unsupported payment provider: ${provider}`);
}

export async function queryProviderPayment(provider, providerTransactionId) {
  if (provider === "mpesa") return mpesa.queryStkPush(providerTransactionId);
  if (provider === "airtel_money") return airtel.queryTransaction(providerTransactionId);
  throw new Error(`Unsupported payment provider: ${provider}`);
}