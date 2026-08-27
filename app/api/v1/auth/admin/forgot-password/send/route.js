import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateOtp, hashOtp, sendOtpSms } from "@/lib/auth/otp";
import { checkRateLimit, getClientIdentifier } from "@/lib/auth/rateLimit";
import { normalizePhone } from "@/lib/phone";

export async function POST(request) {
  try {
    const identifier = getClientIdentifier(request);
    const { success: withinLimit } = await checkRateLimit(identifier, "admin-forgot-password");
    if (!withinLimit) {
      return NextResponse.json(
        { success: false, error: { code: "RATE_LIMITED", message: "Too many attempts. Please try again later." } },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { identifier: contact } = body;

    if (!contact || !contact.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Phone number is required" } },
        { status: 400 }
      );
    }

    // Normalize the phone number (removes plus, spaces, leading zeros)
    const phone = normalizePhone(contact);
    if (!phone) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid phone number" } },
        { status: 400 }
      );
    }

    // Find user by phone and verify admin role
    const user = await db.user.findUnique({
      where: { phone },
      select: {
        id: true,
        phone: true,
        userRoles: {
          select: { role: { select: { name: true, scope: true } } },
        },
      },
    });

    const isAdmin = user?.userRoles?.some(
      (ur) => ur.role.scope === "platform" && ["Super Admin", "Ops Admin"].includes(ur.role.name)
    );

    if (!user || !isAdmin) {
      return NextResponse.json(
        { success: false, error: { code: "USER_NOT_FOUND", message: "No admin account found with that phone number." } },
        { status: 404 }
      );
    }

    // Generate and store OTP (phone only)
    const code = generateOtp();
    const codeHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Invalidate previous unused OTPs for this phone
    await db.otpCode.updateMany({
      where: { phone: user.phone, usedAt: null },
      data: { usedAt: new Date() },
    });

    await db.otpCode.create({
      data: { phone: user.phone, codeHash, expiresAt },
    });

    // Send SMS
    await sendOtpSms(user.phone, code);

    return NextResponse.json({ success: true, message: "Verification code sent" });
  } catch (error) {
    console.error("Admin forgot password send OTP error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not send code. Please try again." } },
      { status: 500 }
    );
  }
}