import { z } from "zod";

// These mirror the request schemas in Document 3 (API Specification) —
// the same shape is validated again server-side; client-side validation
// here is purely for UX (fast feedback), never a substitute for the
// server boundary check per Document 4's coding standard.

// Deliberately generic password rule client-side: length + character
// variety, not a strict regex that would leak exact policy internals
// to anyone probing the form.
const passwordSchema = z
  .string()
  .min(8, "Must be at least 8 characters")
  .refine((val) => /[A-Z]/.test(val), "Include at least one uppercase letter")
  .refine((val) => /[0-9]/.test(val), "Include at least one number");

const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{7,14}$/, "Enter a valid phone number with country code");

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name"),
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    agreeToTerms: z.literal(true, {
      errorMap: () => ({ message: "You must accept the Terms to continue" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, "Enter your email or phone number"),
  password: z.string().min(1, "Password is required"),
});

export const otpSchema = z.object({
  code: z.string().length(6, "Enter the 6-digit code").regex(/^\d+$/, "Digits only"),
});

// Runs a Zod schema and returns { success, data, fieldErrors } instead of
// throwing — keeps form components simple and matches the discriminated
// ActionResult<T> shape used server-side (Document 4, coding standards).
export function validate(schema, values) {
  const result = schema.safeParse(values);
  if (result.success) {
    return { success: true, data: result.data, fieldErrors: {} };
  }
  const fieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] ?? "_form";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { success: false, data: null, fieldErrors };
}
