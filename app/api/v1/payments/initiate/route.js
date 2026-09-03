// PATH: app/api/v1/payments/initiate/route.js
//
// POST — starts a real M-Pesa STK push or Airtel Money collection request
// for one or more orders from the same checkout. Buyer-only; every order
// id is re-verified against the caller's session, ownership, and current
// payment state before anything is charged, so this can't be used to pay
// (or worse, silently mark paid) an order that isn't the caller's own or
// is already settled.

import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, unauthorized } from "@/lib/auth/rbac";
import { checkRateLimit, getClientIdentifier } from "@/lib/auth/rateLimit";
import { normalizePhone } from "@/lib/phone";
import { initiateOrderPayment } from "@/lib/orderPayments";

const schema = z.object({
  orderIds: z.array(z.string().uuid()).min(1).max(10),
  provider: z.enum(["mpesa", "airtel_money"]),
  phone: z.string().min(9),
});

export async function POST(request) {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  // Its own, tighter rate-limit bucket — separate from general API
  // traffic, since each call triggers a real provider charge attempt and
  // sends a real phone prompt to a real person.
  const identifier = getClientIdentifier(request, session.user.id);
  const { success: withinLimit } = await checkRateLimit(identifier, "payment-initiate");
  if (!withinLimit) {
    return Response.json(
      { success: false, error: { code: "RATE_LIMITED", message: "Too many payment attempts — please wait a moment" } },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Check the highlighted fields" } }, { status: 400 });
  }
  const { orderIds, provider, phone } = parsed.data;

  const orders = await db.order.findMany({ where: { id: { in: orderIds } } });

  if (orders.length !== orderIds.length) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "One or more orders not found" } }, { status: 404 });
  }
  if (orders.some((o) => o.buyerId !== session.user.id)) {
    return Response.json({ success: false, error: { code: "FORBIDDEN", message: "These aren't your orders" } }, { status: 403 });
  }
  if (orders.some((o) => o.paymentVerified)) {
    return Response.json({ success: false, error: { code: "CONFLICT", message: "One or more of these orders is already paid" } }, { status: 409 });
  }
  if (orders.some((o) => o.status === "cancelled")) {
    return Response.json({ success: false, error: { code: "CONFLICT", message: "One or more of these orders was cancelled" } }, { status: 409 });
  }

  try {
    const result = await initiateOrderPayment({ orders, provider, phone: normalizePhone(phone) });
    return Response.json({ success: true, data: result }, { status: 201 });
  } catch (err) {
    console.error("[payments/initiate]", err);
    return Response.json({ success: false, error: { code: "PROVIDER_ERROR", message: "Couldn't start the payment — please try again" } }, { status: 502 });
  }
}