import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateOtp, hashOtp, sendOtpSms } from "@/lib/auth/otp";

export async function POST(request) {
  try {
    const body = await request.json();
    const phone = body.phone?.replace(/\s+/g, "");

    if (!phone) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Phone is required." } },
        { status: 400 }
      );
    }

    // Check that the user exists
    const user = await db.user.findUnique({
      where: { phone },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "No account found for this phone number." } },
        { status: 404 }
      );
    }

    // Invalidate previous unused OTPs for this phone
    await db.otpCode.updateMany({
      where: { phone, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Generate new OTP
    const code = generateOtp();
    const codeHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP hash
    await db.otpCode.create({
      data: { phone, codeHash, expiresAt },
    });

    // Send SMS
    try {
      await sendOtpSms(phone, code);
    } catch (smsError) {
      console.error("SMS sending failed:", smsError);
      // Still return success in development; in production you may want to handle differently
    }

    return NextResponse.json({
      success: true,
      data: { expiresInSeconds: 300 },
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not resend code. Please try again later." } },
      { status: 500 }
    );
  }
}