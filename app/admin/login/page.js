"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";
import CountryCodeSelect from "@/components/CountryCodeSelect";
import { countries } from "@/data/countries";
import { normalizePhone } from "@/lib/phone";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();

  const [mode, setMode] = useState("email");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("KE");
  const [nationalNumber, setNationalNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = searchParams.get("redirectTo") || "/admin";

  // Already have a valid admin session (from the admin cookie only) — go
  // straight in. The admin session cookie is never issued to a non-admin
  // in the first place, so if this session exists at all, it's an admin.
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
    setError("");

    const identifier = getIdentifier();
    if (!identifier.trim() || !password) {
      setError("Enter your email/phone and password.");
      return;
    }

    setSubmitting(true);
    const result = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });
    setSubmitting(false);

    // adminAuth.js's authorize() already enforces Super Admin / Ops Admin
    // before it will return a user at all, so a successful sign-in here is
    // guaranteed to be an admin. No follow-up role fetch/sign-out needed.
    if (result?.error) {
      setError("Invalid credentials or not authorized.");
      return;
    }

    router.replace(redirectTo);
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
            <ArrowLeft size={16} />
            Back to AutoSoko
          </Link>
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <ShieldCheck size={14} className="text-blue-600" />
            Admin Portal
          </span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white mb-4">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-2xl font-display text-gray-900">Admin Sign In</h1>
            <p className="text-sm text-gray-500 mt-1">Restricted access — authorised personnel only.</p>
          </div>

          {/* Login mode toggle */}
          <div className="flex gap-2 mb-5">
            <button
              type="button"
              onClick={() => setMode("email")}
              className={`flex-1 py-2 text-sm font-medium rounded-md border ${
                mode === "email"
                  ? "border-blue-500 text-blue-600 bg-blue-50"
                  : "border-gray-300 text-gray-500 hover:bg-gray-50"
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => setMode("phone")}
              className={`flex-1 py-2 text-sm font-medium rounded-md border ${
                mode === "phone"
                  ? "border-blue-500 text-blue-600 bg-blue-50"
                  : "border-gray-300 text-gray-500 hover:bg-gray-50"
              }`}
            >
              Phone
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "email" ? (
              <div>
                <label htmlFor="identifier" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  id="identifier"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@autosoko.africa"
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="phone" className="block text-xs font-medium text-gray-700 mb-1.5">
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
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <PasswordInput
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div className="flex justify-end">
              <Link href="/admin/forgot-password" className="text-sm text-blue-600 hover:underline">
                Forgot password?
              </Link>
            </div>

            {error && (
              <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm py-3 rounded-md disabled:opacity-60 transition-colors"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}