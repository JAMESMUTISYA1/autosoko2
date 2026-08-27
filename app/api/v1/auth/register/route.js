import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { checkRateLimit, getClientIdentifier } from "@/lib/auth/rateLimit";
import { verifyOtp } from "@/lib/auth/otp";
import { normalizePhone } from "@/lib/phone";

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/),
  password: z
    .string()
    .min(8)
    .refine((v) => /[A-Z]/.test(v), "Include an uppercase letter")
    .refine((v) => /[0-9]/.test(v), "Include a number"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export async function POST(request) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(request);
    const { success: withinLimit } = await checkRateLimit(identifier, "auth-register");
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

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const fields = {};
      for (const issue of parsed.error.issues) fields[issue.path[0]] = issue.message;
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Check the highlighted fields", fields } },
        { status: 400 }
      );
    }

    const { fullName, phone, password, otp } = parsed.data;
    // Normalize phone using shared function (removes +, spaces, leading zeros)
    const normalizedPhone = normalizePhone(phone);

    // 1. Verify OTP
    const otpRecord = await db.otpCode.findFirst({
      where: {
        phone: normalizedPhone,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, error: { code: "OTP_INVALID", message: "Invalid or expired verification code." } },
        { status: 400 }
      );
    }

    const isOtpValid = verifyOtp(otp, otpRecord.codeHash);
    if (!isOtpValid) {
      return NextResponse.json(
        { success: false, error: { code: "OTP_INVALID", message: "Invalid verification code." } },
        { status: 400 }
      );
    }

    // 2. Mark OTP as used
    await db.otpCode.update({
      where: { id: otpRecord.id },
      data: { usedAt: new Date() },
    });

    // 3. Check if user already exists (race condition safety)
    const existingUser = await db.user.findUnique({ where: { phone: normalizedPhone } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: { code: "ALREADY_REGISTERED", message: "This phone number is already registered. Please sign in." } },
        { status: 409 }
      );
    }

    // 4. Create user with phoneVerifiedAt set
    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: {
        fullName,
        phone: normalizedPhone,
        passwordHash,
        status: "active",
        phoneVerifiedAt: new Date(),
      },
      select: { id: true, fullName: true, phone: true },
    });

    return NextResponse.json(
      { success: true, data: user },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not create account. Please try again." } },
      { status: 500 }
    );
  }
}