import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateOtp, hashOtp, sendOtpSms } from "@/lib/auth/otp";
import { checkRateLimit, getClientIdentifier } from "@/lib/auth/rateLimit";
import { normalizePhone } from "@/lib/phone";

export async function POST(request) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(request);
    const { success: withinLimit } = await checkRateLimit(identifier, "auth-otp-send");
    if (!withinLimit) {
      return NextResponse.json(
        { success: false, error: { code: "RATE_LIMITED", message: "Too many OTP requests. Please try again later." } },
        { status: 429 }
      );
    }

    const body = await request.json();
    const rawPhone = body.phone;

    // Validate phone before normalization (accepts +, spaces, leading zero)
    if (!rawPhone || !/^\+?[0-9\s]+$/.test(rawPhone)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "A valid phone number is required." } },
        { status: 400 }
      );
    }

    // Normalize phone: remove non-digits, convert leading 0 to 254, ensure 254 prefix
    const phone = normalizePhone(rawPhone);

    // Check that normalized phone is valid (should be 12 digits starting with 254)
    if (!phone || phone.length !== 12 || !phone.startsWith("254")) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "A valid phone number is required." } },
        { status: 400 }
      );
    }

    // Optional: check if phone is already registered (prevents duplicate accounts)
    const existingUser = await db.user.findUnique({
      where: { phone },
      select: { id: true },
    });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: { code: "ALREADY_REGISTERED", message: "This phone number is already registered. Please sign in." } },
        { status: 409 }
      );
    }

    // Invalidate any previous unused OTPs for this phone
    await db.otpCode.updateMany({
      where: { phone, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Generate and store new OTP
    const code = generateOtp();
    const codeHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.otpCode.create({
      data: { phone, codeHash, expiresAt },
    });

    // Send SMS
    try {
      await sendOtpSms(phone, code);
    } catch (smsError) {
      console.error("SMS sending failed:", smsError);
      // For security, do not reveal whether the SMS was sent or not.
      return NextResponse.json(
        { success: false, error: { code: "SMS_FAILED", message: "Could not send verification code. Please try again." } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { expiresInSeconds: 300 },
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Something went wrong. Please try again." } },
      { status: 500 }
    );
  }
}