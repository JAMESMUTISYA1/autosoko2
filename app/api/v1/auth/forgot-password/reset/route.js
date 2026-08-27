import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { verifyOtp } from "@/lib/auth/otp";
import { normalizePhone } from "@/lib/phone";

export async function POST(request) {
  try {
    const { identifier, otp, newPassword } = await request.json();
    if (!identifier || !otp || !newPassword) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "All fields are required" } },
        { status: 400 }
      );
    }

    const normalized = identifier.trim().toLowerCase();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
    // Use normalizePhone for phone numbers
    const phone = isEmail ? null : normalizePhone(normalized);

    // Find the latest unused OTP for this identifier
    const otpRecord = await db.otpCode.findFirst({
      where: {
        usedAt: null,
        expiresAt: { gt: new Date() },
        ...(isEmail ? { email: normalized } : { phone }),
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, error: { code: "OTP_INVALID", message: "Invalid or expired code" } },
        { status: 400 }
      );
    }

    const isValid = verifyOtp(otp, otpRecord.codeHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: { code: "OTP_INVALID", message: "Invalid verification code" } },
        { status: 400 }
      );
    }

    // Find user – use the normalized phone or email
    const user = await db.user.findFirst({
      where: isEmail ? { email: normalized } : { phone },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "USER_NOT_FOUND", message: "Account not found" } },
        { status: 404 }
      );
    }

    // Update password and mark OTP as used
    const passwordHash = await hashPassword(newPassword);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    await db.otpCode.update({
      where: { id: otpRecord.id },
      data: { usedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password reset error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Password reset failed. Please try again." } },
      { status: 500 }
    );
  }
}