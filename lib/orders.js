// Single source of truth for "what is a seller allowed to do to this
// order, and what does the UI call it". Both the status API route (which
// enforces it) and the frontend pages (which render matching buttons and
// badges) import from here, so the two can never drift apart — if this
// file says a transition isn't allowed, there is no button for it AND no
// endpoint will accept it.

export const ORDER_STATUSES = [
  "pending", "confirmed", "processing", "shipped", "delivered",
  "cancelled", "refunded", "disputed",
];

// Statuses a seller can never move an order out of — refunds and
// dispute resolution are admin-only actions, and cancelled is final.
const SELLER_TERMINAL = new Set(["cancelled", "refunded"]);

/**
 * Returns the list of statuses a seller is allowed to move this order
 * into right now, given its current status, delivery method, and payment
 * verification state. This is the actual security policy — the API route
 * re-derives and enforces this same list server-side on every write, it
 * never trusts a status sent from the client without checking it against
 * this function first.
 */
export function sellerAllowedTransitions(order) {
  if (SELLER_TERMINAL.has(order.status)) return [];

  const base = baseTransitions(order);
  if (!order.paymentVerified) return base;

  // Once payment is verified, the seller loses the ability to cancel
  // unilaterally — the money has to go back through an admin-issued
  // refund. "disputed" stays available as the escalation path.
  return base.filter((s) => s !== "cancelled");
}

function baseTransitions(order) {
  switch (order.status) {
    case "pending":
      return ["confirmed", "cancelled"];

    case "confirmed":
      return ["processing", "cancelled", "disputed"];

    case "processing": {
      // Pickup orders have no shipping leg — go straight to delivered.
      const next = order.deliveryMethod === "pickup" ? "delivered" : "shipped";
      return [next, "cancelled", "disputed"];
    }

    case "shipped":
      return ["delivered", "disputed"];

    case "delivered":
      // Still disputable (e.g. wrong/damaged item found after delivery),
      // but nothing else — the sale is otherwise complete.
      return ["disputed"];

    case "disputed":
      // Only an admin can resolve a dispute (into refunded / cancelled /
      // back to an active status). A seller can't clear their own
      // dispute — see the notes endpoint for how they respond instead.
      return [];

    default:
      return [];
  }
}

// Statuses where the seller must supply a reason — these are consequential
// and the reason becomes part of the permanent order history.
export const NOTE_REQUIRED_FOR = new Set(["cancelled", "disputed"]);

export const STATUS_META = {
  pending: { label: "Pending", badge: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Confirmed", badge: "bg-blue-100 text-blue-800" },
  processing: { label: "Processing", badge: "bg-indigo-100 text-indigo-800" },
  shipped: { label: "Shipped", badge: "bg-purple-100 text-purple-800" },
  delivered: { label: "Delivered", badge: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", badge: "bg-gray-100 text-gray-600" },
  refunded: { label: "Refunded", badge: "bg-gray-100 text-gray-600" },
  disputed: { label: "Disputed", badge: "bg-red-100 text-red-800" },
};

export const PAYMENT_STATUS_META = {
  pending: { label: "Pending", badge: "bg-amber-100 text-amber-800" },
  completed: { label: "Completed", badge: "bg-green-100 text-green-800" },
  failed: { label: "Failed", badge: "bg-red-100 text-red-800" },
  refunded: { label: "Refunded", badge: "bg-gray-100 text-gray-600" },
};

export const PROVIDER_LABELS = {
  mpesa: "M-Pesa",
  airtel_money: "Airtel Money",
  mtn_momo: "MTN MoMo",
  tigo_pesa: "Tigo Pesa",
  halopesa: "HaloPesa",
  card: "Card",
  bank_transfer: "Bank Transfer",
  wallet: "Wallet",
};

export const DELIVERY_METHOD_LABELS = {
  pickup: "Pickup",
  courier: "Courier",
  cross_border: "Cross-border",
};

// Target status -> { label, tone } for action buttons. Order here also
// defines the display order of buttons in the UI.
export const STATUS_ACTIONS = {
  confirmed: { label: "Confirm Order", tone: "primary" },
  processing: { label: "Start Processing", tone: "primary" },
  shipped: { label: "Mark as Shipped", tone: "primary" },
  delivered: { label: "Mark as Delivered", tone: "primary" },
  cancelled: { label: "Cancel Order", tone: "danger" },
  disputed: { label: "Flag Dispute", tone: "danger" },
};

// amountMinor is always an integer in the smallest currency unit
// (cents, matlisi, etc.) per the schema's money convention.
export function formatMoney(amountMinor, currency = "KES") {
  const amount = (amountMinor ?? 0) / 100;
  try {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}
