import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePlatformRole, unauthorized } from "@/lib/auth/rbac";
import { hashPassword } from "@/lib/auth/password";
import { normalizePhone } from "@/lib/phone";

const updateSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  password: z.string().min(8).optional().or(z.literal("")),
  role: z.enum(["Super Admin", "Ops Admin", "Agent"]).optional(),
  status: z.enum(["active", "suspended", "banned"]).optional(),
});

export async function PATCH(request, { params }) {
  const { session, role, allowed } = await requirePlatformRole("admin");
  if (!allowed) return unauthorized();

  const { id } = params;
  const user = await db.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
      { status: 404 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    const fields = {};
    for (const issue of parsed.error.issues) fields[issue.path[0]] = issue.message;
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Check the highlighted fields", fields } },
      { status: 400 }
    );
  }

  const dataToUpdate = {};
  if (parsed.data.fullName !== undefined) dataToUpdate.fullName = parsed.data.fullName;
  if (parsed.data.email !== undefined) dataToUpdate.email = parsed.data.email.toLowerCase();
  if (parsed.data.phone !== undefined) dataToUpdate.phone = normalizePhone(parsed.data.phone);
  if (parsed.data.password) dataToUpdate.passwordHash = await hashPassword(parsed.data.password);
  if (parsed.data.status !== undefined) dataToUpdate.status = parsed.data.status;

  // Role update
  if (parsed.data.role) {
    const roleRecord = await db.role.findUnique({
      where: { name_scope: { name: parsed.data.role, scope: "platform" } },
    });
    if (!roleRecord) {
      return NextResponse.json(
        { success: false, error: { code: "ROLE_NOT_FOUND", message: `Role "${parsed.data.role}" not found` } },
        { status: 400 }
      );
    }

    // Replace platform roles: delete all current platform roles, then create new one
    await db.$transaction(async (tx) => {
      await tx.userRole.deleteMany({
        where: { userId: id, role: { scope: "platform" } },
      });
      await tx.userRole.create({
        data: { userId: id, roleId: roleRecord.id, assignedBy: session.user.id },
      });
    });
  }

  if (Object.keys(dataToUpdate).length > 0) {
    await db.user.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request, { params }) {
  const { session, role, allowed } = await requirePlatformRole("admin");
  if (!allowed) return unauthorized();

  const { id } = params;
  await db.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}