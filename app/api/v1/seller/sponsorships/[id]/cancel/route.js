import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";
import { sellerCanCancel } from "@/lib/sponsorships";

const bodySchema = z.object({ reason: z.string().trim().max(500).optional() });

// POST /api/v1/seller/sponsorships/:id/cancel   { reason? }
// Only valid while status is "requested" or "quoted" — once payment is
// verified and the boost is active, a seller can't unilaterally cancel it
// (mirrors the same rule on paid orders: money already moved, an admin
// has to be the one to unwind it).
export async function POST(request, { params }) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;
  const { sellerId, businessId } = guard;
  const { id } = params;

  let body = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine, reason is optional
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Invalid input." } },
      { status: 422 }
    );
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const row = await tx.productSponsorship.findFirst({ where: { id, businessId } });
      if (!row) {
        return { error: { status: 404, code: "NOT_FOUND", message: "Sponsorship not found." } };
      }
      if (!sellerCanCancel(row)) {
        return {
          error: {
            status: 409,
            code: "INVALID_TRANSITION",
            message: `Cannot cancel a sponsorship that is "${row.status}".`,
          },
        };
      }

      const updateResult = await tx.productSponsorship.updateMany({
        where: { id, status: row.status }, // compare-and-swap
        data: {
          status: "cancelled",
          cancelledBy: sellerId,
          cancelledAt: new Date(),
          cancelReason: parsed.data.reason || null,
        },
      });

      if (updateResult.count === 0) {
        return { error: { status: 409, code: "CONFLICT", message: "This was just updated. Refresh and try again." } };
      }

      return { id };
    });

    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.error.status });
    }

    return NextResponse.json({ success: true, data: { id: result.id, status: "cancelled" } });
  } catch (error) {
    console.error("Failed to cancel sponsorship:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not cancel sponsorship." } },
      { status: 500 }
    );
  }
}
