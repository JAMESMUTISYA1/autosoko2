import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { checkRateLimit, getClientIdentifier } from "@/lib/auth/rateLimit";
import { generateOtp, hashOtp, sendOtpSms } from "@/lib/auth/otp"; // ✅ new import

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/),
  password: z
    .string()
    .min(8)
    .refine((v) => /[A-Z]/.test(v), "Include an uppercase letter")
    .refine((v) => /[0-9]/.test(v), "Include a number"),
});

// POST /api/v1/auth/register — Document 3 §1.1
export async function POST(request) {
  // Rate limit before any DB work — registration is a common bot target.
  const identifier = getClientIdentifier(request);
  const { success: withinLimit } = await checkRateLimit(identifier, "auth");
  if (!withinLimit) {
    return Response.json(
      { success: false, error: { code: "RATE_LIMITED", message: "Too many attempts. Try again shortly." } },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const fields = {};
    for (const issue of parsed.error.issues) fields[issue.path[0]] = issue.message;
    return Response.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Check the highlighted fields", fields } },
      { status: 400 }
    );
  }

  const { fullName, phone, password } = parsed.data;
  const normalizedPhone = phone.replace(/\s+/g, ""); // ensure no spaces

  const existing = await db.user.findUnique({ where: { phone: normalizedPhone } });
  if (existing) {
    return Response.json(
      { success: false, error: { code: "REGISTRATION_FAILED", message: "Couldn't create that account. Try signing in instead." } },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);

  const user = await db.user.create({
    data: { fullName, phone: normalizedPhone, passwordHash, status: "active" },
    select: { id: true, fullName: true, phone: true },
  });

  // ✅ Generate OTP and store its hash
  const code = generateOtp();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Invalidate any previous unused OTPs for this phone
  await db.otpCode.updateMany({
    where: { phone: normalizedPhone, usedAt: null },
    data: { usedAt: new Date() },
  });

  await db.otpCode.create({
    data: {
      phone: normalizedPhone,
      codeHash,
      expiresAt,
    },
  });

  // ✅ Send the OTP SMS via textsms.co.ke
  try {
    await sendOtpSms(normalizedPhone, code);
  } catch (smsError) {
    console.error("SMS sending failed:", smsError);
    // In development we may still return success, but log the error.
    // For production, you may want to handle differently.
  }

  return Response.json(
    {
      success: true,
      data: {
        userId: user.id,
        phone: normalizedPhone,
        verificationRequired: "phone",
        // Optionally include expiresInSeconds for client countdown
        expiresInSeconds: 300,
      },
    },
    { status: 201 }
  );
}