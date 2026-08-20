import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, hasBusinessPermission, unauthorized, forbidden } from "@/lib/auth/rbac";

const schema = z.object({
  businessId: z.string().uuid(),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{7,14}$/).optional(),
  bankName: z.string().min(1).optional(),
  bankAccountName: z.string().min(1).optional(),
  bankAccountNumber: z.string().min(6).optional(), // never stored raw — masked below
});

// POST /api/v1/seller/payout-method — upserts whichever fields are sent.
// Setting a new phoneNumber resets phoneVerified to false — verification
// is one-time per number, and changing the number means re-verifying
// (Document 3-adjacent design: verified-once-unless-changed, per the
// original request for this feature).
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
    const fields = {};
    for (const issue of parsed.error.issues) fields[issue.path[0]] = issue.message;
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR", fields } }, { status: 400 });
  }

  const { businessId, phoneNumber, bankName, bankAccountName, bankAccountNumber } = parsed.data;

  const allowed = await hasBusinessPermission(session.user.id, businessId, "members.manage");
  if (!allowed) return forbidden();

  const existing = await db.payoutMethod.findUnique({ where: { businessId } });
  const phoneChanged = phoneNumber && phoneNumber !== existing?.phoneNumber;

  const data = {
    ...(phoneNumber ? { phoneNumber, ...(phoneChanged ? { phoneVerified: false } : {}) } : {}),
    ...(bankName ? { bankName } : {}),
    ...(bankAccountName ? { bankAccountName } : {}),
    ...(bankAccountNumber ? { bankAccountMasked: `****${bankAccountNumber.slice(-4)}` } : {}),
  };

  const method = await db.payoutMethod.upsert({
    where: { businessId },
    update: data,
    create: { businessId, ...data },
    select: { phoneNumber: true, phoneVerified: true, bankName: true, bankAccountName: true, bankAccountMasked: true },
  });

  return Response.json({ success: true, data: method });
}
