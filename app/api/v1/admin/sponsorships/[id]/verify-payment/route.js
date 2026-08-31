import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminCanVerifyPayment } from "@/lib/sponsorships";
// TODO: import the real admin actor id once auth is wired back in.

// POST /api/v1/admin/sponsorships/:id/verify-payment
//
// This is the money-moving step, so it's the most guarded route in the
// feature:
//   1. Only valid from "quoted" (there must be a price already).
//   2. Compare-and-swap update, same as every other status write in this
//      app — a concurrent double-click or two admins acting at once loses
//      cleanly with a 409 instead of double-activating.
//   3. startAt/endAt are computed server-side from durationDays that was
//      already locked in at quote time — never accepted from the request.
//   4. Product.sponsored is flipped to true in the SAME transaction as the
//      status change, so the two can never disagree (no window where the
//      sponsorship is "active" but the product isn't boosted, or vice
//      versa).
export async function POST(request, { params }) {
  const { id } = params;
  const actorId = null; // TODO: signed-in admin id once auth is wired back in

  try {
    const result = await db.$transaction(async (tx) => {
      const row = await tx.productSponsorship.findUnique({ where: { id } });
      if (!row) {
        return { error: { status: 404, code: "NOT_FOUND", message: "Sponsorship not found." } };
      }
      if (!adminCanVerifyPayment(row)) {
        return {
          error: {
            status: 409,
            code: "INVALID_TRANSITION",
            message: `Cannot verify payment on a sponsorship that is "${row.status}".`,
          },
        };
      }
      if (!row.durationDays || !row.amountMinor) {
        // Shouldn't be reachable (quote sets both), but never compute a
        // window off missing data.
        return { error: { status: 409, code: "MISSING_QUOTE", message: "This sponsorship has no quote to verify against." } };
      }

      const startAt = new Date();
      const endAt = new Date(startAt.getTime() + row.durationDays * 24 * 60 * 60 * 1000);

      const updateResult = await tx.productSponsorship.updateMany({
        where: { id, status: row.status }, // compare-and-swap
        data: {
          status: "active",
          paymentVerifiedBy: actorId,
          paymentVerifiedAt: new Date(),
          startAt,
          endAt,
        },
      });

      if (updateResult.count === 0) {
        return { error: { status: 409, code: "CONFLICT", message: "This was just updated. Refresh and try again." } };
      }

      await tx.product.update({ where: { id: row.productId }, data: { sponsored: true } });

      return { id, startAt, endAt };
    });

    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.error.status });
    }

    return NextResponse.json({
      success: true,
      data: { id: result.id, status: "active", startAt: result.startAt, endAt: result.endAt },
    });
  } catch (error) {
    console.error("Failed to verify sponsorship payment:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not verify payment." } },
      { status: 500 }
    );
  }
}
