"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, X, Star } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

export default function BranchesTab({ businessId }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const toast = useToast();

  async function fetchBranches() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/businesses/${businessId}/branches`);
      const json = await res.json();
      if (json.success) setBranches(json.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBranches();
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function deleteBranch(id) {
    if (!confirm("Delete this branch?")) return;
    const res = await fetch(`/api/v1/admin/businesses/${businessId}/branches/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Branch deleted");
      fetchBranches();
    } else {
      toast.error(json.error?.message || "Failed to delete branch");
    }
  }

  if (loading) return <Loader2 className="animate-spin text-blue-600" size={32} />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Branches</h2>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-4 py-2 rounded-md"
        >
          <Plus size={16} /> Add Branch
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {branches.map((b) => (
          <div key={b.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium flex items-center gap-1.5">
                  {b.name} {b.isPrimary && <Star size={14} className="text-yellow-500 fill-yellow-500" />}
                </h3>
                <p className="text-sm text-gray-500">{b.address}</p>
                <p className="text-sm text-gray-500">{b.town?.name}</p>
                <p className="text-sm text-gray-500">{b.phone}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(b);
                    setShowForm(true);
                  }}
                  className="text-yellow-600"
                >
                  <Pencil size={16} />
                </button>
                <button onClick={() => deleteBranch(b.id)} className="text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {branches.length === 0 && <p className="text-sm text-gray-500">No branches yet.</p>}
      </div>

      {showForm && (
        <BranchFormModal
          businessId={businessId}
          editing={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            fetchBranches();
          }}
        />
      )}
    </div>
  );
}

// NOTE: kept to name/address/phone/isPrimary for brevity — add a townId
// select here the same way CreateBusinessModal.js does if you want branches
// linked to a Town record rather than free-text address.
function BranchFormModal({ businessId, editing, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: editing?.name || "",
    address: editing?.address || "",
    phone: editing?.phone || "",
    isPrimary: editing?.isPrimary || false,
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name) {
      toast.error("Branch name is required");
      return;
    }
    setSaving(true);
    try {
      const url = editing
        ? `/api/v1/admin/businesses/${businessId}/branches/${editing.id}`
        : `/api/v1/admin/businesses/${businessId}/branches`;
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editing ? "Branch updated" : "Branch created");
        onSaved();
      } else {
        toast.error(json.error?.message || "Failed to save branch");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{editing ? "Edit Branch" : "Add Branch"}</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            placeholder="Branch name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
          />
          <input
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
          />
          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isPrimary}
              onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
              className="h-4 w-4 text-blue-600"
            />
            Primary branch
          </label>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm py-3 rounded-md disabled:opacity-60"
          >
            {saving ? "Saving..." : editing ? "Update Branch" : "Create Branch"}
          </button>
        </form>
      </div>
    </div>
  );
}