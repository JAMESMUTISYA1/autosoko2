
"use client";
export const dynamic = 'force-dynamic';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, ShieldCheck } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import CountryCodeSelect from "@/components/CountryCodeSelect";
import { countries } from "@/data/countries";
import { registerSchema, validate } from "@/lib/validation/authSchemas";
import { useToast } from "@/contexts/ToastContext";

function passwordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const STRENGTH_LABEL = ["Too short", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLOR = ["bg-gray-300", "bg-gray-400", "bg-gray-500", "bg-gray-700", "bg-gray-900"];

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();

  const [fullName, setFullName] = useState("");
  const [countryCode, setCountryCode] = useState("KE");
  const [nationalNumber, setNationalNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const strength = passwordStrength(password);

  function getFullPhone() {
    const dial = countries.find((c) => c.iso === countryCode)?.dial || "";
    return `+${dial}${nationalNumber}`;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const phone = getFullPhone();
    const { success, fieldErrors: errs } = validate(registerSchema, {
      fullName,
      phone,
      password,
      confirmPassword,
      agreeToTerms,
    });
    setFieldErrors(errs);
    if (!success) return;

    setSubmitting(true);
    let response;
    try {
      response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone, password }),
      });
    } catch {
      setSubmitting(false);
      toast.error("Couldn't reach the server. Check your connection and try again.");
      return;
    }

    const json = await response.json().catch(() => null);
    setSubmitting(false);

    if (!response.ok || !json?.success) {
      if (json?.error?.fields) setFieldErrors(json.error.fields);
      toast.error(json?.error?.message || "Something went wrong. Please try again.");
      return;
    }

    toast.success("Account created. Verify your phone to continue.");
    router.push(`/auth/verify-otp?phone=${encodeURIComponent(phone)}`);
  }

  return (
    <div className="max-w-sm mx-auto px-4 sm:px-6 py-16">
      <h1 className="font-display text-2xl text-gray-900 mb-1">Create Account</h1>
      <p className="text-sm text-gray-500 mb-8">Join AutoSoko to buy or sell auto parts.</p>

      <GoogleSignInButton
        label="Sign up with Google"
        onClick={() => signIn("google", { callbackUrl: "/" })}
      />

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-500">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="block text-xs text-gray-500 mb-1.5">Full Name</label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            aria-invalid={!!fieldErrors.fullName}
            className={`w-full border rounded-sm px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500 ${
              fieldErrors.fullName ? "border-red-500" : "border-gray-300"
            }`}
          />
          {fieldErrors.fullName && (
            <p className="text-xs text-red-500 font-semibold mt-1">{fieldErrors.fullName}</p>
          )}
        </div>

        {/* Phone Number with country code */}
        <div>
          <label htmlFor="phone" className="block text-xs text-gray-500 mb-1.5">Phone Number</label>
          <div className="flex gap-2">
            <div className="w-1/3">
              <CountryCodeSelect value={countryCode} onChange={setCountryCode} />
            </div>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="712345678"
              value={nationalNumber}
              onChange={(e) => setNationalNumber(e.target.value)}
              aria-invalid={!!fieldErrors.phone}
              className={`flex-1 border rounded-sm px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500 ${
                fieldErrors.phone ? "border-red-500" : "border-gray-300"
              }`}
            />
          </div>
          {fieldErrors.phone && (
            <p className="text-xs text-red-500 font-semibold mt-1">{fieldErrors.phone}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-xs text-gray-500 mb-1.5">Password</label>
          <PasswordInput
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            error={fieldErrors.password}
          />
          {password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${
                      i < strength ? STRENGTH_COLOR[strength] : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">{STRENGTH_LABEL[strength]}</p>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-xs text-gray-500 mb-1.5">Confirm Password</label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            error={fieldErrors.confirmPassword}
          />
        </div>

        {/* Terms */}
        <label className="flex items-start gap-2 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={agreeToTerms}
            onChange={(e) => setAgreeToTerms(e.target.checked)}
            className="mt-0.5 rounded-sm border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <span>
            I agree to AutoSoko's{" "}
            <Link href="/legal" className="text-blue-500 underline underline-offset-2">
              Terms of Service and Privacy Policy
            </Link>
          </span>
        </label>
        {fieldErrors.agreeToTerms && (
          <p className="text-xs text-red-500 font-semibold -mt-2">{fieldErrors.agreeToTerms}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 transition-colors text-white font-semibold text-sm py-3 rounded-sm"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
        <ShieldCheck size={13} className="text-blue-500 shrink-0" />
        We'll text you a 6-digit code to verify your number
      </div>

      <p className="text-sm text-gray-500 text-center mt-6">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-blue-500 underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </div>
  );
}