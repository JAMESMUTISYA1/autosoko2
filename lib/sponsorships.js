// Mirrors the pattern in lib/orders.js: one shared, framework-agnostic
// module for "what does this status mean and what can happen to it next",
// imported by every API route and every page so they can't drift apart.

export const SPONSORSHIP_STATUSES = ["requested", "quoted", "active", "expired", "rejected", "cancelled"];

export const STATUS_META = {
  requested: { label: "Requested", badge: "bg-amber-100 text-amber-800" },
  quoted: { label: "Awaiting Payment", badge: "bg-blue-100 text-blue-800" },
  active: { label: "Active", badge: "bg-green-100 text-green-800" },
  expired: { label: "Expired", badge: "bg-gray-100 text-gray-600" },
  rejected: { label: "Rejected", badge: "bg-red-100 text-red-800" },
  cancelled: { label: "Cancelled", badge: "bg-gray-100 text-gray-600" },
};

// A seller can only withdraw a request before any money has moved.
export function sellerCanCancel(row) {
  return row.status === "requested" || row.status === "quoted";
}

// requested -> quoted or rejected. quoted -> active (via payment
// verification) or rejected. Nothing else is a valid admin transition.
export function adminCanQuote(row) {
  return row.status === "requested";
}
export function adminCanReject(row) {
  return row.status === "requested" || row.status === "quoted";
}
export function adminCanVerifyPayment(row) {
  return row.status === "quoted";
}

/**
 * The stored `status` only flips to "expired" when something (currently
 * nothing — see the schema note) sweeps past-due active rows. Compute the
 * true current state here so the UI is never wrong even before that sweep
 * exists: an "active" row whose endAt has already passed is displayed as
 * expired, without mutating anything.
 */
export function isCurrentlyActive(row) {
  if (row.status !== "active") return false;
  if (!row.endAt) return true; // shouldn't happen, but don't hide it if it does
  return new Date(row.endAt).getTime() > Date.now();
}

export function effectiveStatus(row) {
  if (row.status === "active" && !isCurrentlyActive(row)) return "expired";
  return row.status;
}

export function daysRemaining(row) {
  if (!isCurrentlyActive(row) || !row.endAt) return null;
  const ms = new Date(row.endAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
