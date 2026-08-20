import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, hasBusinessPermission, unauthorized, forbidden } from "@/lib/auth/rbac";

const schema = z.object({ businessId: z.string().uuid(), code: z.string().length(6) });

// POST /api/v1/seller/payout-method/verify-phone
// No SMS provider is configured in this build (Document 3 §1.2's OTP
// send/verify needs a real gateway decision — Africa's Talking, Twilio,
// etc. — that hasn't been made yet). This accepts any 6-digit code and
// marks the number verified, so the button genuinely updates the
// database rather than doing nothing — but it is NOT real verification
// until a real SMS provider sends and checks an actual code. Flagged
// here and in BACKEND.md so this isn't mistaken for a finished feature.
export async function POST(request) {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR" } }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Enter the 6-digit code" } }, { status: 400 });
  }

  const allowed = await hasBusinessPermission(session.user.id, parsed.data.businessId, "members.manage");
  if (!allowed) return forbidden();

  const method = await db.payoutMethod.update({
    where: { businessId: parsed.data.businessId },
    data: { phoneVerified: true },
    select: { phoneNumber: true, phoneVerified: true },
  });

  return Response.json({ success: true, data: method });
}
