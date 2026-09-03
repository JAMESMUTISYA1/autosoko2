"use client";
export const dynamic = 'force-dynamic';

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";
import { normalizePhone } from "@/lib/phone";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);

  const locked = lockedUntil !== null && Date.now() < lockedUntil;
  const redirectTo = searchParams.get("callbackUrl") || "/admin";

  // If already authenticated as admin, redirect
  useState(() => {
    if (status === "authenticated") {
      const role = session.user.role;
      const isAdmin = Array.isArray(role)
        ? role.some((r) => ["Super Admin", "Ops Admin"].includes(r))
        : ["Super Admin", "Ops Admin"].includes(role);
      if (isAdmin) {
        router.replace("/admin");
      } else {
        signOut({ redirect: false });
      }
    }
  }, [status, session, router]);

  function getIdentifier() {
    // Only phone input, but admin may still use email; keep normalization for phone
    if (identifier.includes("@")) return identifier.toLowerCase();
    return normalizePhone(identifier);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    if (locked) return;

    const normalizedIdentifier = getIdentifier();
    setSubmitting(true);
    const result = await signIn("credentials", {
      identifier: normalizedIdentifier,
      password,
      redirect: false,
    });
    setSubmitting(false);

    if (result?.error) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setFormError("Invalid credentials or not authorized.");

      if (nextAttempts >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_SECONDS * 1000);
      }
      return;
    }

    // Verify admin role from fresh session
    const sessionRes = await fetch("/api/auth/session");
    const sessionData = await sessionRes.json();
    const role = sessionData?.user?.role;
    const isAdmin = Array.isArray(role)
      ? role.some((r) => ["Super Admin", "Ops Admin"].includes(r))
      : ["Super Admin", "Ops Admin"].includes(role);

    if (!isAdmin) {
      await signOut({ redirect: false });
      setFormError("This account does not have admin access.");
      return;
    }

    router.replace(redirectTo);
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
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

      {/* Main form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white mb-4">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-2xl font-display text-gray-900">Admin Sign In</h1>
            <p className="text-sm text-gray-500 mt-1">Restricted access — authorised personnel only.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="identifier" className="block text-xs font-medium text-gray-700 mb-1.5">
                Email or Phone
              </label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@autosoko.africa or 0712345678"
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

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
              <Link
                href="/admin/forgot-password"
                className="text-sm text-blue-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {formError && !locked && (
              <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {formError}
              </p>
            )}
            {locked && (
              <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                Too many failed attempts. Please wait before trying again.
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || locked}
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

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}