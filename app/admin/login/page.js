"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";

export default function AdminLoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If already logged in as admin, redirect to /admin
  if (status === "authenticated") {
    const role = session.user.role;
    const isAdmin = Array.isArray(role)
      ? role.some(r => ["Super Admin", "Ops Admin"].includes(r))
      : ["Super Admin", "Ops Admin"].includes(role);
    if (isAdmin) {
      router.replace("/admin");
      return null;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
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

    if (result?.error) {
      setError("Invalid credentials or not authorized.");
      return;
    }

    // After successful sign-in, check role from session
    const sessionRes = await fetch("/api/auth/session");
    const sessionData = await sessionRes.json();
    const role = sessionData?.user?.role;
    const isAdmin = Array.isArray(role)
      ? role.some(r => ["Super Admin", "Ops Admin"].includes(r))
      : ["Super Admin", "Ops Admin"].includes(role);

    if (!isAdmin) {
      await signOut({ redirect: false });
      setError("This account does not have admin access.");
      return;
    }

    router.replace("/admin");
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Simple Header */}
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

      {/* Main Login Form */}
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
                placeholder="admin@autosoko.africa"
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