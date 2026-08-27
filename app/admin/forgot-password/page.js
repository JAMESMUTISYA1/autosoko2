"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";
import { useToast } from "@/contexts/ToastContext";

export default function AdminForgotPasswordPage() {
  const router = useRouter();
  const toast = useToast();

  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function handleSendOtp(e) {
    e.preventDefault();
    setFieldErrors({});
    setNotFound(false);

    if (!identifier.trim()) {
      setFieldErrors({ identifier: "Enter your phone number" });
      return;
    }

    setSendingOtp(true);
    try {
      const res = await fetch("/api/v1/auth/admin/forgot-password/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        if (json.error?.code === "USER_NOT_FOUND") {
          setNotFound(true);
          setFieldErrors({ identifier: json.error.message });
        } else {
          setFieldErrors({ identifier: json.error?.message || "Failed to send OTP" });
          toast.error(json.error?.message || "Could not send OTP");
        }
        return;
      }

      toast.success("Verification code sent");
      setResendCooldown(30);
      setStep(2);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0 || sendingOtp) return;
    setSendingOtp(true);
    try {
      const res = await fetch("/api/v1/auth/admin/forgot-password/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error?.message || "Could not resend OTP");
        return;
      }
      toast.success("Verification code resent");
      setResendCooldown(30);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setFieldErrors({});

    if (otp.length !== 6) {
      setFieldErrors({ otp: "OTP must be 6 digits" });
      return;
    }
    if (newPassword.length < 8) {
      setFieldErrors({ newPassword: "Password must be at least 8 characters" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/auth/admin/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, otp, newPassword }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error?.message || "Password reset failed");
        if (json.error?.fields) setFieldErrors(json.error.fields);
        return;
      }
      toast.success("Password reset successful. Please sign in.");
      router.push("/admin/login");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Simple Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/admin/login" className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
            <ArrowLeft size={16} />
            Back to Admin Sign In
          </Link>
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <ShieldCheck size={14} className="text-blue-600" />
            Admin Portal
          </span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-display text-gray-900 mb-1">Reset Password</h1>
          <p className="text-sm text-gray-500 mb-8">
            {step === 1
              ? "Enter your phone number to receive a verification code."
              : "Enter the code we sent and choose a new password."}
          </p>

          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label htmlFor="identifier" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Phone Number
                </label>
                <input
                  id="identifier"
                  type="tel"
                  inputMode="tel"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="0712345678"
                  className={`w-full border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                    fieldErrors.identifier ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {fieldErrors.identifier && (
                  <p className="text-xs text-red-500 font-semibold mt-1">{fieldErrors.identifier}</p>
                )}
                {notFound && (
                  <p className="text-sm text-gray-600 mt-2">
                    No admin account found with that phone number.{" "}
                    <Link href="/admin/login" className="text-blue-600 underline">
                      Back to sign in
                    </Link>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={sendingOtp}
                className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm py-3 rounded-md disabled:opacity-60 transition-colors"
              >
                {sendingOtp && <Loader2 size={16} className="animate-spin" />}
                {sendingOtp ? "Sending code..." : "Send Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label htmlFor="otp" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Verification Code
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit code"
                  className={`w-full border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                    fieldErrors.otp ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {fieldErrors.otp && (
                  <p className="text-xs text-red-500 font-semibold mt-1">{fieldErrors.otp}</p>
                )}
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-xs font-medium text-gray-700 mb-1.5">
                  New Password
                </label>
                <PasswordInput
                  id="newPassword"
                  name="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  error={fieldErrors.newPassword}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Confirm New Password
                </label>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  error={fieldErrors.confirmPassword}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm py-3 rounded-md disabled:opacity-60 transition-colors"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? "Resetting..." : "Reset Password"}
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || sendingOtp}
                className="w-full text-sm text-gray-500 disabled:opacity-60"
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}