import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateOtp, hashOtp, sendOtpSms } from "@/lib/auth/otp";
import { checkRateLimit, getClientIdentifier } from "@/lib/auth/rateLimit";
import { normalizePhone } from "@/lib/phone";

export async function POST(request) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(request);
    const { success: withinLimit } = await checkRateLimit(identifier, "forgot-password");
    if (!withinLimit) {
      return NextResponse.json(
        { success: false, error: { code: "RATE_LIMITED", message: "Too many attempts. Please try again later." } },
        { status: 429 }
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

    const { identifier: contact } = body;
    if (!contact || !contact.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Email or phone number is required" } },
        { status: 400 }
      );
    }

    const normalized = contact.trim().toLowerCase();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
    // Normalize phone using shared function
    const phone = isEmail ? null : normalizePhone(normalized);

    // Check if user exists
    const user = await db.user.findFirst({
      where: isEmail ? { email: normalized } : { phone },
      select: { id: true, email: true, phone: true },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "No account found with that email or phone number.",
          },
        },
        { status: 404 }
      );
    }

    // Generate and store OTP
    const code = generateOtp();
    const codeHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Invalidate previous unused OTPs for this user's contact
    if (user.email) {
      await db.otpCode.updateMany({
        where: { email: user.email, usedAt: null },
        data: { usedAt: new Date() },
      });
      await db.otpCode.create({
        data: { email: user.email, phone: user.phone, codeHash, expiresAt },
      });
    } else {
      await db.otpCode.updateMany({
        where: { phone: user.phone, usedAt: null },
        data: { usedAt: new Date() },
      });
      await db.otpCode.create({
        data: { phone: user.phone, codeHash, expiresAt },
      });
    }

    // Send OTP via email or SMS
    if (isEmail) {
      // TODO: Implement email sending (e.g., nodemailer)
      console.log(`[FORGOT PASSWORD] Email OTP for ${user.email}: ${code}`);
    } else {
      await sendOtpSms(user.phone, code);
    }

    return NextResponse.json(
      { success: true, message: "Verification code sent" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password send OTP error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not send code. Please try again." } },
      { status: 500 }
    );
  }
}