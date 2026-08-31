import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePlatformRole, unauthorized } from "@/lib/auth/rbac";
import { hashPassword } from "@/lib/auth/password";
import { normalizePhone } from "@/lib/phone";

const createSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    password: z.string().min(8),
    role: z.enum(["Super Admin", "Ops Admin", "Agent"]),
    status: z.enum(["active", "suspended"]).default("active"),
  })
  .refine((data) => data.email || data.phone, {
    message: "Either email or phone is required",
    path: ["email"],
  });

export async function GET(request) {
  const { allowed } = await requirePlatformRole("admin");
  if (!allowed) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";
  const type = searchParams.get("type") || "all"; // all | platform | regular
  const status = searchParams.get("status") || "all"; // all | active | suspended | banned
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = Math.min(100, Number(searchParams.get("perPage")) || 20);

  // Build where conditions
  const where = { deletedAt: null };

  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status !== "all") {
    where.status = status;
  }

  if (type === "platform") {
    where.userRoles = { some: { role: { scope: "platform" } } };
  } else if (type === "regular") {
    where.userRoles = { none: { role: { scope: "platform" } } };
  }

  // Count total matching records
  const total = await db.user.count({ where });

  // Fetch paginated users
  const users = await db.user.findMany({
    where,
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      status: true,
      createdAt: true,
      userRoles: {
        select: {
          role: { select: { id: true, name: true, scope: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * perPage,
    take: perPage,
  });

  const data = users.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    status: u.status,
    createdAt: u.createdAt,
    platformRoles: u.userRoles
      .filter((ur) => ur.role.scope === "platform")
      .map((ur) => ur.role.name),
    isPlatformStaff: u.userRoles.some((ur) => ur.role.scope === "platform"),
  }));

  return NextResponse.json({
    success: true,
    data,
    meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  });
}

export async function POST(request) {
  const { session, allowed } = await requirePlatformRole("admin");
  if (!allowed) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const fields = {};
    for (const issue of parsed.error.issues) fields[issue.path[0]] = issue.message;
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Check the highlighted fields", fields } },
      { status: 400 }
    );
  }

  const { fullName, email, phone, password, role, status } = parsed.data;
  const normalizedPhone = phone ? normalizePhone(phone) : null;
  const normalizedEmail = email?.toLowerCase() || null;

  // Build OR condition only with provided fields
  const orConditions = [];
  if (normalizedEmail) orConditions.push({ email: normalizedEmail });
  if (normalizedPhone) orConditions.push({ phone: normalizedPhone });

  if (orConditions.length === 0) {
    // This should never happen because of refine, but just in case
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Email or phone required" } },
      { status: 400 }
    );
  }

  // Check uniqueness
  const existing = await db.user.findFirst({
    where: { OR: orConditions },
  });
  if (existing) {
    return NextResponse.json(
      { success: false, error: { code: "ALREADY_EXISTS", message: "A user with that email or phone already exists" } },
      { status: 409 }
    );
  }

  // Find role
  const roleRecord = await db.role.findUnique({
    where: { name_scope: { name: role, scope: "platform" } },
  });
  if (!roleRecord) {
    return NextResponse.json(
      { success: false, error: { code: "ROLE_NOT_FOUND", message: `Role "${role}" not found` } },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(password);

  const newUser = await db.user.create({
    data: {
      fullName,
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
      status,
      userRoles: {
        create: { roleId: roleRecord.id, assignedBy: session.user.id },
      },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, data: newUser }, { status: 201 });
}