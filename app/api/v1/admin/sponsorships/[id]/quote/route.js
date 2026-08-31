import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminCanQuote } from "@/lib/sponsorships";
// TODO: import { getActorId } from wherever the real admin session lives,
// once auth is wired back in — see the TODO on every other admin route.

const bodySchema = z.object({
  amountMinor: z.number().int().positive(),
  currency: z.string().trim().min(3).max(3).default("KES"),
  durationDays: z.number().int().positive().max(365),
  quoteNote: z.string().trim().max(1000).optional(),
});

// POST /api/v1/admin/sponsorships/:id/quote
// { amountMinor, currency?, durationDays, quoteNote? }
// Only valid from "requested" — this is a one-shot price-setting step,
// not an edit; if the price needs to change, reject and have the seller
// re-request (keeps a clean, honest history instead of silently mutating
// a quote the seller may have already seen).
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
  const { amountMinor, currency, durationDays, quoteNote } = parsed.data;

  try {
    const result = await db.$transaction(async (tx) => {
      const row = await tx.productSponsorship.findUnique({ where: { id } });
      if (!row) {
        return { error: { status: 404, code: "NOT_FOUND", message: "Sponsorship not found." } };
      }
      if (!adminCanQuote(row)) {
        return {
          error: { status: 409, code: "INVALID_TRANSITION", message: `Cannot quote a sponsorship that is "${row.status}".` },
        };
      }

      const updateResult = await tx.productSponsorship.updateMany({
        where: { id, status: row.status }, // compare-and-swap
        data: {
          status: "quoted",
          amountMinor,
          currency,
          durationDays,
          quoteNote: quoteNote || null,
          quotedBy: actorId,
          quotedAt: new Date(),
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

    return NextResponse.json({ success: true, data: { id: result.id, status: "quoted" } });
  } catch (error) {
    console.error("Failed to quote sponsorship:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not quote sponsorship." } },
      { status: 500 }
    );
  }
}
