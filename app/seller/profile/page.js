"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import PasswordInput from "@/components/PasswordInput";

export default function SellerProfilePage() {
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/seller/profile");
      const json = await res.json();
      if (json.success) {
        setProfile(json.data);
        setFullName(json.data.fullName || "");
        setEmail(json.data.email || "");
        setPhone(json.data.phone || "");
      } else {
        toast.error(json.error?.message || "Failed to load profile");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch("/api/v1/seller/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, phone }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Profile updated");
        setProfile(json.data);
      } else {
        toast.error(json.error?.message || "Update failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch("/api/v1/seller/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Password changed successfully");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(json.error?.message || "Password change failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />;
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl mb-1">Profile</h1>
      <p className="text-sm text-muted mb-8">Manage your account details and password.</p>

      <div className="space-y-6">
        {/* Profile Details Form */}
        <form onSubmit={handleProfileSubmit} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-3 pb-2">
            <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center font-display text-xl shrink-0">
              {fullName?.charAt(0) || "?"}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{fullName}</h2>
              <p className="text-sm text-gray-500">{email}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Full Name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-4 py-2 rounded-md disabled:opacity-60"
          >
            {savingProfile ? "Saving..." : "Save Changes"}
          </button>
        </form>

        {/* Change Password Form */}
        <form onSubmit={handlePasswordSubmit} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Change Password</h2>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Current Password</label>
            <PasswordInput
              id="oldPassword"
              name="oldPassword"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">New Password</label>
            <PasswordInput
              id="newPassword"
              name="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Confirm New Password</label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={changingPassword}
            className="bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-4 py-2 rounded-md disabled:opacity-60"
          >
            {changingPassword ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}