import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminCanReject } from "@/lib/sponsorships";
// TODO: import the real admin actor id once auth is wired back in.

const bodySchema = z.object({ reason: z.string().trim().min(3, "A reason is required").max(500) });

// POST /api/v1/admin/sponsorships/:id/reject   { reason }
// Valid from "requested" or "quoted" — never from "active", a live,
// paid sponsorship isn't "rejected", it would need a refund/cancellation
// flow instead (out of scope here, same reasoning as orders).
export async function POST(request, { params }) {
  const { id } = params;
  const actorId = null; // TODO: signed-in admin id once auth is wired back in

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body." } },
      { status: 400 }
    );
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
      const row = await tx.productSponsorship.findUnique({ where: { id } });
      if (!row) {
        return { error: { status: 404, code: "NOT_FOUND", message: "Sponsorship not found." } };
      }
      if (!adminCanReject(row)) {
        return {
          error: { status: 409, code: "INVALID_TRANSITION", message: `Cannot reject a sponsorship that is "${row.status}".` },
        };
      }

      const updateResult = await tx.productSponsorship.updateMany({
        where: { id, status: row.status }, // compare-and-swap
        data: {
          status: "rejected",
          rejectedBy: actorId,
          rejectedAt: new Date(),
          rejectionReason: parsed.data.reason,
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

    return NextResponse.json({ success: true, data: { id: result.id, status: "rejected" } });
  } catch (error) {
    console.error("Failed to reject sponsorship:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not reject sponsorship." } },
      { status: 500 }
    );
  }
}
