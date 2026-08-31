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

    const phone = normalizePhone(identifier);
    if (!phone) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid phone number" } },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { phone },
      select: { id: true, phone: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "USER_NOT_FOUND", message: "No account found with that phone number." } },
        { status: 404 }
      );
    }

    const membership = await db.businessMember.findFirst({
      where: { userId: user.id, business: { slug: { not: "autosoko-platform" } } },
      select: { businessId: true },  // ✅ corrected
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: "USER_NOT_FOUND", message: "No seller account found with that phone number." } },
        { status: 404 }
      );
    }

    const otpRecord = await db.otpCode.findFirst({
      where: {
        phone,
        usedAt: null,
        expiresAt: { gt: new Date() },
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
    console.error("Seller forgot password reset error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Password reset failed. Please try again." } },
      { status: 500 }
    );
  }
}