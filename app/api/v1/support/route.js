import { z } from "zod";
import { db } from "@/lib/db";
import { requirePlatformRole, forbidden } from "@/lib/auth/rbac";
import { checkRateLimit, getClientIdentifier } from "@/lib/auth/rateLimit";

const submitSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email(),
  subject: z.string().trim().min(2).max(200),
  message: z.string().trim().min(5).max(4000),
});

// POST /api/v1/support — public, the actual Contact Us form target.
// This is what finally connects the public form to the admin/agent
// inbox — previously each used a separate static mock array.
export async function POST(request) {
  const { success: withinLimit } = await checkRateLimit(getClientIdentifier(request), "default");
  if (!withinLimit) {
    return Response.json({ success: false, error: { code: "RATE_LIMITED" } }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR" } }, { status: 400 });
  }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    const fields = {};
    for (const issue of parsed.error.issues) fields[issue.path[0]] = issue.message;
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR", fields } }, { status: 400 });
  }

  const message = await db.supportMessage.create({ data: parsed.data, select: { id: true } });
  return Response.json({ success: true, data: message }, { status: 201 });
}

// GET /api/v1/support — agent/admin only
export async function GET() {
  const { allowed } = await requirePlatformRole("agent");
  if (!allowed) return forbidden();

  const messages = await db.supportMessage.findMany({
    select: {
      id: true, name: true, email: true, subject: true, message: true,
      status: true, resolvedAt: true, createdAt: true,
      resolver: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({
    success: true,
    data: messages.map((m) => ({ ...m, resolvedBy: m.resolver?.fullName || null })),
  });
}
