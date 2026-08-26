"use client";
export const dynamic = 'force-dynamic';
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;
const MAX_ATTEMPTS = 5;

function OtpForm() {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") || "your phone";

  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function handleChange(index, value) {
    if (!/^\d*$/.test(value)) return;
    const next = [...digits];
    next[index] = value.slice(-1);
    setDigits(next);
    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    setDigits(pasted.split("").concat(Array(CODE_LENGTH).fill("")).slice(0, CODE_LENGTH));
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  }

  const code = digits.join("");
  const complete = code.length === CODE_LENGTH;
  const locked = attempts >= MAX_ATTEMPTS;

  async function handleVerify(e) {
    e.preventDefault();
    if (!complete || locked) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/v1/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        if (json?.error?.code === "TOO_MANY_ATTEMPTS") {
          setAttempts(MAX_ATTEMPTS);
        } else {
          setAttempts((a) => a + 1);
        }
        setError(json?.error?.message || "Incorrect code. Please try again.");
        setDigits(Array(CODE_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      toast.success("Phone verified. You can now sign in.");
      router.push("/auth/login?verified=1");
    } catch {
      setSubmitting(false);
      toast.error("Couldn't reach the server. Try again.");
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setCooldown(RESEND_SECONDS);

    try {
      const res = await fetch("/api/v1/auth/otp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        toast.error(json?.error?.message || "Could not resend code.");
        return;
      }
      toast.info(`New code sent to ${phone}`);
      setAttempts(0);
      setDigits(Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch {
      toast.error("Couldn't resend code. Check connection.");
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 sm:px-6 py-16">
      <h1 className="font-display text-2xl text-gray-900 mb-1">Verify Your Number</h1>
      <p className="text-sm text-gray-500 mb-8">
        Enter the 6-digit code we sent to <span className="text-gray-900">{phone}</span>
      </p>

      <form onSubmit={handleVerify}>
        <div className="flex gap-2 justify-between" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={locked}
              aria-label={`Digit ${i + 1} of ${CODE_LENGTH}`}
              className="w-11 h-13 sm:w-12 sm:h-14 text-center text-lg font-mono border border-gray-300 rounded-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
          ))}
        </div>

        {error && !locked && (
          <p className="text-sm text-red-500 font-semibold mt-3" role="alert">{error}</p>
        )}
        {locked && (
          <p className="text-sm text-red-500 font-semibold mt-3" role="alert">
            Too many incorrect attempts. Please request a new code.
          </p>
        )}

        <button
          type="submit"
          disabled={!complete || submitting || locked}
          className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 transition-colors text-white font-semibold text-sm py-3 rounded-sm mt-5"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? "Verifying..." : "Verify"}
        </button>
      </form>

      <button
        type="button"
        onClick={handleResend}
        disabled={cooldown > 0}
        className="w-full text-sm text-gray-500 mt-4 disabled:opacity-60"
      >
        {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
      </button>

      <div className="flex items-center gap-2 mt-6 text-xs text-gray-500">
        <ShieldCheck size={13} className="text-blue-500 shrink-0" />
        Codes expire after 5 minutes and can only be used once
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <OtpForm />
    </Suspense>
  );
}