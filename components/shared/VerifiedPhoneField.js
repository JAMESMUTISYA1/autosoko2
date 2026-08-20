"use client";

import { useState } from "react";
import { ShieldCheck, Loader2, Pencil } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

const OTP_LENGTH = 6;

export default function VerifiedPhoneField({ initialPhone, initialVerified, onVerified }) {
  const toast = useToast();
  const [phone, setPhone] = useState(initialPhone || "");
  const [verified, setVerified] = useState(Boolean(initialVerified));
  const [editing, setEditing] = useState(!initialPhone);
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function sendOtp(e) {
    e.preventDefault();
    if (!phone.trim()) return;
    setSending(true);
    // Replace with POST /api/v1/auth/otp/send scoped to payout-phone
    // verification (Document 3 §1.2's OTP pattern, reused here).
    await new Promise((r) => setTimeout(r, 600));
    setSending(false);
    setOtpSent(true);
    toast.info(`Verification code sent to ${phone}`);
  }

  async function verifyOtp(e) {
    e.preventDefault();
    if (code.length !== OTP_LENGTH) return;
    setVerifying(true);
    await new Promise((r) => setTimeout(r, 600));
    setVerifying(false);
    setVerified(true);
    setEditing(false);
    setOtpSent(false);
    setCode("");
    toast.success("Phone number verified");
    onVerified?.(phone);
  }

  if (verified && !editing) {
    return (
      <div className="flex items-center justify-between border border-line rounded-sm px-3.5 py-2.5">
        <span className="flex items-center gap-2 text-sm">
          <ShieldCheck size={15} className="text-fg" />
          {phone}
          <span className="text-[11px] text-muted">Verified</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setEditing(true);
            setVerified(false);
          }}
          className="flex items-center gap-1 text-xs text-accent hover:underline"
        >
          <Pencil size={12} /> Change
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+254712345678"
          disabled={otpSent}
          className="flex-1 border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-accent disabled:opacity-60"
        />
        {!otpSent && (
          <button
            onClick={sendOtp}
            disabled={sending || !phone.trim()}
            className="flex items-center gap-1.5 shrink-0 bg-accent text-white text-sm font-medium px-4 py-2.5 rounded-sm hover:bg-accent/90 disabled:opacity-60 transition-colors"
          >
            {sending && <Loader2 size={14} className="animate-spin" />}
            Send Code
          </button>
        )}
      </div>

      {otpSent && (
        <form onSubmit={verifyOtp} className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            maxLength={OTP_LENGTH}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="6-digit code"
            className="flex-1 border border-line rounded-sm px-3 py-2.5 text-sm font-mono bg-bg focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={verifying || code.length !== OTP_LENGTH}
            className="flex items-center gap-1.5 shrink-0 bg-accent text-white text-sm font-medium px-4 py-2.5 rounded-sm hover:bg-accent/90 disabled:opacity-60 transition-colors"
          >
            {verifying && <Loader2 size={14} className="animate-spin" />}
            Verify
          </button>
        </form>
      )}
    </div>
  );
}
