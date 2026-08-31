import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/adminGuard";
import { writeAuditLog } from "@/lib/audit";
import { uniqueBusinessSlug } from "@/lib/slug";
import { normalizePhone } from "@/lib/phone";   // ✅ added

// GET /api/v1/admin/businesses?search=&status=&verificationStatus=&businessType=&page=&pageSize=
export async function GET(request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
  const search = searchParams.get("search")?.trim();
  const status = searchParams.get("status");
  const verificationStatus = searchParams.get("verificationStatus");
  const businessType = searchParams.get("businessType");

  const where = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(verificationStatus ? { verificationStatus } : {}),
    ...(businessType ? { businessType } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { slug: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [businesses, total] = await Promise.all([
    db.business.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        businessType: true,
        logoUrl: true,
        status: true,
        verificationStatus: true,
        ratingAvg: true,
        createdAt: true,
        owner: { select: { id: true, fullName: true, email: true, phone: true } },
        _count: { select: { products: true, members: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.business.count({ where }),
  ]);

  return Response.json({
    success: true,
    data: businesses,
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  });
}

// POST /api/v1/admin/businesses
// Creates the business, its owner (existing user or a brand-new invited
// one), and an initial "Owner" BusinessMember row so the owner shows up
// under Members immediately.
export async function POST(request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const {
    name, businessType, description,
    countryId, regionId, townId, physicalAddress,
    email, phone, whatsapp, website, homeCurrency,
    owner, // { mode: "existing", userId } | { mode: "new", fullName, email, phone }
  } = body;

  if (!name || !businessType || !countryId || !owner?.mode) {
    return Response.json(
      { success: false, error: { code: "VALIDATION", message: "name, businessType, countryId, and owner are required" } },
      { status: 400 }
    );
  }

  let ownerUserId;

  if (owner.mode === "existing") {
    if (!owner.userId) {
      return Response.json(
        { success: false, error: { code: "VALIDATION", message: "owner.userId is required for mode 'existing'" } },
        { status: 400 }
      );
    }
    const existingUser = await db.user.findUnique({ where: { id: owner.userId } });
    if (!existingUser) {
      return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Owner user not found" } }, { status: 404 });
    }
    ownerUserId = existingUser.id;
  } else if (owner.mode === "new") {
    if (!owner.fullName || (!owner.email && !owner.phone)) {
      return Response.json(
        { success: false, error: { code: "VALIDATION", message: "owner.fullName and owner.email or owner.phone are required" } },
        { status: 400 }
      );
    }

    // Normalize phone number (removes spaces, plus, leading zeros)
    const normalizedPhone = owner.phone ? normalizePhone(owner.phone) : null;
    const normalizedEmail = owner.email?.toLowerCase() || null;

    // Check for duplicate phone or email before creating
    if (normalizedPhone) {
      const phoneClash = await db.user.findUnique({ where: { phone: normalizedPhone } });
      if (phoneClash) {
        return Response.json(
          { success: false, error: { code: "CONFLICT", message: "A user with that phone number already exists" } },
          { status: 409 }
        );
      }
    }
    if (normalizedEmail) {
      const emailClash = await db.user.findUnique({ where: { email: normalizedEmail } });
      if (emailClash) {
        return Response.json(
          { success: false, error: { code: "CONFLICT", message: "A user with that email already exists" } },
          { status: 409 }
        );
      }
    }

    // No password is set here — the owner completes account setup via the
    // existing Forgot Password flow before they can log in as a seller.
    const newOwner = await db.user.create({
      data: {
        fullName: owner.fullName,
        email: normalizedEmail,
        phone: normalizedPhone,
        status: "active",
      },
    });
    ownerUserId = newOwner.id;
  } else {
    return Response.json({ success: false, error: { code: "VALIDATION", message: "owner.mode must be 'existing' or 'new'" } }, { status: 400 });
  }

  const slug = await uniqueBusinessSlug(name);

  // "Owner" is a system business-scope role, created once on first use
  // rather than requiring a manual seed step.
  const ownerRole = await db.role.upsert({
    where: { name_scope: { name: "Owner", scope: "business" } },
    update: {},
    create: { name: "Owner", scope: "business", isSystemRole: true },
  });

  const business = await db.business.create({
    data: {
      ownerUserId,
      name,
      slug,
      businessType,
      description: description || null,
      countryId,
      regionId: regionId || null,
      townId: townId || null,
      physicalAddress: physicalAddress || null,
      email: email || null,
      phone: phone || null,
      whatsapp: whatsapp || null,
      website: website || null,
      homeCurrency: homeCurrency || "KES",
      members: {
        create: { userId: ownerUserId, roleId: ownerRole.id, invitedBy: guard.adminId, status: "active" },
      },
    },
  });

  await writeAuditLog({
    actorId: guard.adminId,
    action: "business.created",
    entityType: "Business",
    entityId: business.id,
    after: business,
    request,
  });

  return Response.json({ success: true, data: business }, { status: 201 });
}