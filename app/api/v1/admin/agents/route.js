import { z } from "zod";
import { db } from "@/lib/db";
import { requirePlatformRole, unauthorized, forbidden } from "@/lib/auth/rbac";
import { hashPassword } from "@/lib/auth/password";

// GET /api/v1/admin/agents — every platform-staff user (Agent + Admin roles)
export async function GET() {
  const { allowed } = await requirePlatformRole("agent");
  if (!allowed) return forbidden();

  const agents = await db.businessMember.findMany({
    where: { role: { scope: "platform" } },
    select: {
      user: { select: { id: true, fullName: true, email: true, phone: true, status: true, createdAt: true } },
      role: { select: { name: true } },
    },
  });

  return Response.json({ success: true, data: agents.map((a) => ({ ...a.user, role: a.role.name })) });
}

const createAgentSchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/),
  townId: z.string().uuid().optional(),
});

// POST /api/v1/admin/agents — Super Admin only. Creates a Platform Staff
// account (an "Agent" per Document 2 §4/§5's scope model) with a
// temporary password delivered out-of-band, not set by the admin directly.
export async function POST(request) {
  const { allowed } = await requirePlatformRole("admin");
  if (!allowed) return forbidden("Only Super Admins can create agent accounts");

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body" } }, { status: 400 });
  }

  const parsed = createAgentSchema.safeParse(body);
  if (!parsed.success) {
    const fields = {};
    for (const issue of parsed.error.issues) fields[issue.path[0]] = issue.message;
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR", fields } }, { status: 400 });
  }

  const { fullName, email, phone } = parsed.data;

  const existing = await db.user.findFirst({ where: { OR: [{ email }, { phone }] } });
  if (existing) {
    return Response.json(
      { success: false, error: { code: "CONFLICT", message: "An account with that email or phone already exists" } },
      { status: 409 }
    );
  }

  // Agents are modeled as Platform Staff — a BusinessMember row with a
  // platform-scope role, not attached to any real business. Prisma
  // requires a businessId for that join table, so a lightweight
  // "AutoSoko Platform" business acts as the anchor — never shown
  // publicly, never sells anything.
  let platformBusiness = await db.business.findFirst({ where: { slug: "autosoko-platform" } });
  if (!platformBusiness) {
    const anyCountry = await db.country.findFirst();
    const platformOwner = await db.user.findFirst({ where: { email: "platform@autosoko.africa" } })
      ?? await db.user.create({ data: { fullName: "AutoSoko Platform", email: "platform@autosoko.africa", status: "active" } });
    platformBusiness = await db.business.create({
      data: {
        ownerUserId: platformOwner.id,
        name: "AutoSoko Platform",
        slug: "autosoko-platform",
        businessType: "distributor",
        countryId: anyCountry.id,
        status: "active",
      },
    });
  }

  const agentRole = await db.role.findFirst({ where: { name: "Agent", scope: "platform" } });
  const tempPassword = Math.random().toString(36).slice(-10);
  const passwordHash = await hashPassword(tempPassword);

  const user = await db.user.create({
    data: { fullName, email, phone, passwordHash, status: "active" },
  });

  await db.businessMember.create({
    data: { businessId: platformBusiness.id, userId: user.id, roleId: agentRole.id },
  });

  // Real implementation sends `tempPassword` via SMS here and never
  // returns it in the API response — included here only because there's
  // no SMS provider wired up yet, and is the one deliberate exception to
  // "never return secrets in a response," clearly flagged for that reason.
  return Response.json(
    { success: true, data: { id: user.id, fullName, email, phone, temporaryPassword: tempPassword } },
    { status: 201 }
  );
}
