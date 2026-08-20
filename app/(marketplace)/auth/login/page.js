"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, ShieldCheck } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import CountryCodeSelect from "@/components/CountryCodeSelect";
import { countries } from "@/data/countries";
import { loginSchema, validate } from "@/lib/validation/authSchemas";
import { useToast } from "@/contexts/ToastContext";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  // Login mode – "email" or "phone"
  const [mode, setMode] = useState("email");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("KE");
  const [nationalNumber, setNationalNumber] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);

  const locked = lockedUntil !== null && Date.now() < lockedUntil;
  const redirectTo = searchParams.get("redirectTo") || "/";

  function getIdentifier() {
    if (mode === "email") return email;
    const dial = countries.find((c) => c.iso === countryCode)?.dial || "";
    return `+${dial}${nationalNumber}`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    if (locked) return;

    const identifier = getIdentifier();
    const { success, fieldErrors: errs } = validate(loginSchema, {
      identifier,
      password,
    });
    setFieldErrors(errs);
    if (!success) return;

    setSubmitting(true);
    const result = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });
    setSubmitting(false);

    if (result?.error) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setFormError("Invalid email/phone or password.");

      if (nextAttempts >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_SECONDS * 1000);
        toast.error(`Too many attempts. Try again in ${LOCKOUT_SECONDS}s.`);
      }
      return;
    }

    toast.success("Signed in");
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="max-w-sm mx-auto px-4 sm:px-6 py-16">
      <h1 className="font-display text-2xl text-gray-900 mb-1">Sign In</h1>
      <p className="text-sm text-gray-500 mb-8">Welcome back to AutoSoko.</p>

      <GoogleSignInButton onClick={() => signIn("google", { callbackUrl: redirectTo })} />

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-500">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Login mode toggle */}
      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => setMode("email")}
          className={`flex-1 py-2 text-sm font-medium rounded-sm border ${
            mode === "email"
              ? "border-blue-500 text-blue-500 bg-blue-50"
              : "border-gray-300 text-gray-500 hover:bg-gray-50"
          }`}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => setMode("phone")}
          className={`flex-1 py-2 text-sm font-medium rounded-sm border ${
            mode === "phone"
              ? "border-blue-500 text-blue-500 bg-blue-50"
              : "border-gray-300 text-gray-500 hover:bg-gray-50"
          }`}
        >
          Phone
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {mode === "email" ? (
          <div>
            <label htmlFor="email" className="block text-xs text-gray-500 mb-1.5">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!fieldErrors.identifier}
              className={`w-full border rounded-sm px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500 ${
                fieldErrors.identifier ? "border-red-500" : "border-gray-300"
              }`}
            />
          </div>
        ) : (
          <div>
            <label htmlFor="phone" className="block text-xs text-gray-500 mb-1.5">
              Phone Number
            </label>
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
                aria-invalid={!!fieldErrors.identifier}
                className={`flex-1 border rounded-sm px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500 ${
                  fieldErrors.identifier ? "border-red-500" : "border-gray-300"
                }`}
              />
            </div>
          </div>
        )}
        {fieldErrors.identifier && (
          <p className="text-xs text-red-500 font-semibold mt-1">{fieldErrors.identifier}</p>
        )}

        <div>
          <label htmlFor="password" className="block text-xs text-gray-500 mb-1.5">
            Password
          </label>
          <PasswordInput
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            error={fieldErrors.password}
          />
        </div>

        {formError && !locked && (
          <p className="text-sm text-red-500 font-semibold" role="alert">
            {formError}
          </p>
        )}
        {locked && (
          <p className="text-sm text-red-500 font-semibold" role="alert">
            Too many failed attempts. Please wait before trying again.
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || locked}
          className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 transition-colors text-white font-semibold text-sm py-3 rounded-sm"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
        <ShieldCheck size={13} className="text-blue-500 shrink-0" />
        Protected by rate limiting and optional two-factor authentication
      </div>

      <p className="text-sm text-gray-500 text-center mt-6">
        Don't have an account?{" "}
        <Link href="/auth/register" className="text-blue-500 underline underline-offset-2">
          Create one
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (

    
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}