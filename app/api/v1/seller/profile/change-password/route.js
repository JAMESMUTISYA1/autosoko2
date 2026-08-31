import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export async function POST(request) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const { oldPassword, newPassword } = await request.json();
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
    where: { id: guard.sellerId },
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
    where: { id: guard.sellerId },
    data: { passwordHash: newHash },
  });

  return NextResponse.json({ success: true });
}