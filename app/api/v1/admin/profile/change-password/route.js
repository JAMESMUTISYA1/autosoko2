import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformRole, unauthorized } from "@/lib/auth/rbac";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

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

  const { oldPassword, newPassword } = body;
  if (!oldPassword || !newPassword) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Both current and new password are required" } },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "New password must be at least 8 characters" } },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  const valid = await verifyPassword(oldPassword, user?.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_PASSWORD", message: "Current password is incorrect" } },
      { status: 400 }
    );
  }

  const newHash = await hashPassword(newPassword);
  await db.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newHash },
  });

  return NextResponse.json({ success: true });
}