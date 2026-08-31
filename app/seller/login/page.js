"use client";

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";
import CountryCodeSelect from "@/components/CountryCodeSelect";
import { countries } from "@/data/countries";
import { loginSchema, validate } from "@/lib/validation/authSchemas";
import { useToast } from "@/contexts/ToastContext";
import { normalizePhone } from "@/lib/phone";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

function SellerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { status } = useSession();

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
  const redirectTo = searchParams.get("redirectTo") || "/seller";

  // Already have a valid seller session? auth.seller.js's authorize() only
  // ever issues this session to an actual business member, so no extra
  // role check is needed on redirect.
  useEffect(() => {
    if (status === "authenticated") {
      router.replace(redirectTo);
    }
  }, [status, redirectTo, router]);

  function getIdentifier() {
    if (mode === "email") return email;
    const dial = countries.find((c) => c.iso === countryCode)?.dial || "";
    const rawPhone = `+${dial}${nationalNumber}`;
    return normalizePhone(rawPhone);
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
      // Deliberately generic — this covers both "wrong password" and
      // "this account has no business on it", so a login attempt can't be
      // used to probe whether an email/phone belongs to a seller.
      setFormError("Invalid credentials, or this account isn't set up as a seller.");

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
      <Link href="/" className="inline-flex items-center gap-2 text-blue-600 text-sm mb-8">
        <ArrowLeft size={16} />
        Back to AutoSoko
      </Link>

      <h1 className="font-display text-2xl text-gray-900 mb-1">Seller Sign In</h1>
      <p className="text-sm text-gray-500 mb-8">Manage your AutoSoko business listings.</p>

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

        <div className="flex justify-end mt-1">
          <Link href="/seller/forgot-password" className="text-sm text-blue-500 hover:underline">
            Forgot password?
          </Link>
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
        Seller accounts are separate from your buyer account session.
      </div>
    </div>
  );
}

export default function SellerLoginPage() {
  return (
    <Suspense fallback={null}>
      <SellerLoginForm />
    </Suspense>
  );
}