import { stores, getProductsByStore } from "@/data/sampleData";

// Stands in for "the currently signed-in seller" until real auth exists.
// Using the individual seller (not a business) here on purpose — it's
// the concrete proof that individuals can sell on AutoSoko, not just
// registered businesses.
export const CURRENT_SELLER_STORE_ID = "store-5";

export function getCurrentSellerStore() {
  return stores.find((s) => s.id === CURRENT_SELLER_STORE_ID);
}

export function getCurrentSellerListings() {
  return getProductsByStore(CURRENT_SELLER_STORE_ID);
}

export const wallet = {
  currency: "KES",
  availableMinor: 4820000, // withdrawable now
  pendingMinor: 1250000, // from orders not yet marked delivered (holdback per Document 1's escrow-adjacent logic)
};

export const walletTransactions = [
  {
    id: "txn-1",
    type: "sale",
    description: "Sale — Car Battery 75Ah (Order AS-8991)",
    amountMinor: 1450000,
    currency: "KES",
    date: "2026-08-07",
    status: "completed",
  },
  {
    id: "txn-2",
    type: "withdrawal",
    description: "Withdrawal to M-Pesa — 07XX XXX 111",
    amountMinor: -1000000,
    currency: "KES",
    date: "2026-08-05",
    status: "completed",
  },
  {
    id: "txn-3",
    type: "sale",
    description: "Sale — Car Battery 75Ah (Order AS-8975)",
    amountMinor: 1450000,
    currency: "KES",
    date: "2026-08-02",
    status: "completed",
  },
  {
    id: "txn-4",
    type: "sale",
    description: "Sale — Car Battery 75Ah (Order AS-8960)",
    amountMinor: 1450000,
    currency: "KES",
    date: "2026-07-29",
    status: "completed",
  },
  {
    id: "txn-5",
    type: "withdrawal",
    description: "Withdrawal to Equity Bank — ****4471",
    amountMinor: -2000000,
    currency: "KES",
    date: "2026-07-20",
    status: "completed",
  },
];

const WITHDRAW_METHODS = [
  { id: "mpesa", label: "M-Pesa" },
  { id: "airtel", label: "Airtel Money" },
  { id: "bank", label: "Bank Transfer" },
];

export { WITHDRAW_METHODS };

// ---- Payout methods & withdrawal requests ----
// Extends the wallet model: a seller verifies a phone number once (OTP)
// and/or saves a bank account (double-entry confirmed) before they can
// request a withdrawal against either. Withdrawal *requests* are
// separate from the wallet balance itself — they go into a queue an
// admin approves (see data/payoutData.js), matching how real payout
// systems work (never an instant, unreviewed transfer).

export const sellerPayoutMethods = {
  phone: { number: "+254712000555", verified: true },
  bank: {
    bankName: "Equity Bank",
    accountName: "James Mwangi",
    accountNumberMasked: "****4471",
  },
};

export const WITHDRAWAL_STATUSES = ["pending", "approved", "paid", "rejected"];

export const withdrawalRequests = [
  {
    id: "wd-501",
    sellerStoreId: "store-5",
    sellerName: "James Mwangi",
    amountMinor: 1000000,
    currency: "KES",
    method: "M-Pesa",
    destination: "+254712000555",
    status: "paid",
    requestedAt: "2026-08-05",
    processedBy: "Wanjiru Kamau",
    processedAt: "2026-08-05 14:20",
  },
  {
    id: "wd-502",
    sellerStoreId: "store-1",
    sellerName: "Nairobi Auto Spares",
    amountMinor: 4500000,
    currency: "KES",
    method: "Bank Transfer",
    destination: "Equity Bank ****2210",
    status: "pending",
    requestedAt: "2026-08-10",
    processedBy: null,
    processedAt: null,
  },
  {
    id: "wd-503",
    sellerStoreId: "store-4",
    sellerName: "Kampala Auto Traders",
    amountMinor: 2100000,
    currency: "UGX",
    method: "Bank Transfer",
    destination: "Stanbic Bank ****7734",
    status: "approved",
    requestedAt: "2026-08-09",
    processedBy: "Samuel Kariuki",
    processedAt: "2026-08-09 11:05",
  },
];
