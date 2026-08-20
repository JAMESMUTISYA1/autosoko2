"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";
import { useToast } from "@/contexts/ToastContext";

export default function ChangePasswordForm() {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!currentPassword) {
      setError("Enter your current password");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match");
      return;
    }

    setSubmitting(true);
    // Replace with POST /api/v1/auth/change-password — verifies
    // currentPassword server-side before updating, and per Document 1's
    // auth design should invalidate other active sessions.
    await new Promise((r) => setTimeout(r, 700));
    setSubmitting(false);

    toast.success("Password updated");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-line rounded-md p-5">
      <h2 className="font-display text-base mb-1">Change Password</h2>

      <div>
        <label className="block text-xs text-muted mb-1.5">Current Password</label>
        <PasswordInput
          id="currentPassword"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1.5">New Password</label>
        <PasswordInput
          id="newPassword"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1.5">Confirm New Password</label>
        <PasswordInput
          id="confirmNewPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>

      {error && <p className="text-sm font-semibold">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="flex items-center gap-2 bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-sm hover:bg-accent/90 disabled:opacity-60 transition-colors"
      >
        {submitting && <Loader2 size={15} className="animate-spin" />}
        {submitting ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
}
