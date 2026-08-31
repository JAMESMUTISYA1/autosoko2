import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/adminGuard";
import { writeAuditLog } from "@/lib/audit";
import { normalizePhone } from "@/lib/phone";

export async function GET(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const members = await db.businessMember.findMany({
    where: { businessId: params.businessId },
    select: {
      userId: true, status: true, joinedAt: true, invitedBy: true,
      user: { select: { id: true, fullName: true, email: true, phone: true, status: true, lastLoginAt: true } },
      role: { select: { id: true, name: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  return Response.json({ success: true, data: members });
}

// POST — attach an existing user (by userId or by email/phone lookup) or
// invite a brand-new one. New users are created with NO password; they set
// one via the existing Forgot Password flow before they can log in to the
// seller portal. This route never sets or even sees a password on
// someone else's behalf.
export async function POST(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const { mode, userId, identifier, fullName, email, phone, roleId } = body;

  if (!roleId) {
    return Response.json({ success: false, error: { code: "VALIDATION", message: "roleId is required" } }, { status: 400 });
  }
  const role = await db.role.findFirst({ where: { id: roleId, scope: "business" } });
  if (!role) {
    return Response.json({ success: false, error: { code: "VALIDATION", message: "Unknown business role" } }, { status: 400 });
  }

  const business = await db.business.findUnique({ where: { id: params.businessId } });
  if (!business) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Business not found" } }, { status: 404 });
  }

  let targetUserId;

  if (mode === "existing") {
    let user = null;
    if (userId) {
      user = await db.user.findUnique({ where: { id: userId } });
    } else if (identifier) {
      const isEmail = identifier.includes("@");
      const lookupValue = isEmail ? identifier.toLowerCase() : normalizePhone(identifier);
      user = await db.user.findUnique({ where: isEmail ? { email: lookupValue } : { phone: lookupValue } });
    }
    if (!user) {
      return Response.json({ success: false, error: { code: "NOT_FOUND", message: "No user matches that email/phone" } }, { status: 404 });
    }
    targetUserId = user.id;
  } else if (mode === "new") {
    if (!fullName || (!email && !phone)) {
      return Response.json({ success: false, error: { code: "VALIDATION", message: "fullName and email or phone are required" } }, { status: 400 });
    }
    const normalizedEmail = email?.toLowerCase() || null;
    const normalizedPhone = phone ? normalizePhone(phone) : null;

    if (normalizedEmail) {
      const clash = await db.user.findUnique({ where: { email: normalizedEmail } });
      if (clash) {
        return Response.json(
          { success: false, error: { code: "CONFLICT", message: "A user with that email already exists — add them as an existing user instead" } },
          { status: 409 }
        );
      }
    }
    if (normalizedPhone) {
      const clash = await db.user.findUnique({ where: { phone: normalizedPhone } });
      if (clash) {
        return Response.json(
          { success: false, error: { code: "CONFLICT", message: "A user with that phone already exists — add them as an existing user instead" } },
          { status: 409 }
        );
      }
    }

    const newUser = await db.user.create({
      data: { fullName, email: normalizedEmail, phone: normalizedPhone, status: "active" },
    });
    targetUserId = newUser.id;
  } else {
    return Response.json({ success: false, error: { code: "VALIDATION", message: "mode must be 'existing' or 'new'" } }, { status: 400 });
  }

  const existingMembership = await db.businessMember.findUnique({
    where: { businessId_userId: { businessId: params.businessId, userId: targetUserId } },
  });
  if (existingMembership) {
    return Response.json({ success: false, error: { code: "CONFLICT", message: "This user is already a member of this business" } }, { status: 409 });
  }

  const membership = await db.businessMember.create({
    data: { businessId: params.businessId, userId: targetUserId, roleId, invitedBy: guard.adminId, status: "active" },
    select: {
      userId: true, status: true, joinedAt: true,
      user: { select: { id: true, fullName: true, email: true, phone: true } },
      role: { select: { id: true, name: true } },
    },
  });

  await writeAuditLog({
    actorId: guard.adminId, action: "business.member_added", entityType: "Business",
    entityId: params.businessId, after: { userId: targetUserId, roleId }, request,
  });

  return Response.json({ success: true, data: membership }, { status: 201 });
}