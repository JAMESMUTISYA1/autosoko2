"use client";

import { useState } from "react";
import { useToast } from "@/contexts/ToastContext";

const OPTIONS = ["unverified", "pending", "verified", "rejected"];

export default function VerificationTab({ business, onUpdate }) {
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function setVerification(verificationStatus) {
    if (verificationStatus === business.verificationStatus) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/businesses/${business.id}/verification`, {
        
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Verification status updated");
        onUpdate();
      } else {
        toast.error(json.error?.message || "Failed to update");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="font-semibold mb-3">Verification Status</h3>
        <div className="flex flex-wrap gap-2">
          {OPTIONS.map((o) => (
            <button
              key={o}
              disabled={saving || o === business.verificationStatus}
              onClick={() => setVerification(o)}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 capitalize disabled:opacity-40 hover:bg-gray-50"
            >
              Mark {o}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="font-semibold mb-2">Registration Details</h3>
        <p className="text-sm text-gray-600"><strong>Registration #:</strong> {business.registrationNumber || "—"}</p>
        <p className="text-sm text-gray-600"><strong>Tax PIN:</strong> {business.taxPin || "—"}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="font-semibold mb-2">Submitted Documents</h3>
        {Array.isArray(business.verificationDocuments) && business.verificationDocuments.length > 0 ? (
          <ul className="space-y-2">
            {business.verificationDocuments.map((doc, i) => (
              <li key={i} className="text-sm">
                <a href={doc.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  {doc.type || `Document ${i + 1}`}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No documents submitted yet.</p>
        )}
      </div>
    </div>
  );
}