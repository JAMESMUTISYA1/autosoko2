"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Search, X } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

export default function MembersTab({ businessId }) {
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const toast = useToast();

  async function fetchAll() {
    setLoading(true);
    try {
      const [mRes, rRes] = await Promise.all([
        fetch(`/api/v1/admin/businesses/${businessId}/members`),
        fetch(`/api/v1/admin/roles?scope=business`),
      ]);
      const mJson = await mRes.json();
      const rJson = await rRes.json();
      if (mJson.success) setMembers(mJson.data);
      if (rJson.success) setRoles(rJson.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function updateRole(userId, roleId) {
    const res = await fetch(`/api/v1/admin/businesses/${businessId}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleId }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Role updated");
      fetchAll();
    } else {
      toast.error(json.error?.message || "Failed to update role");
    }
  }

  async function toggleSuspend(userId, currentStatus) {
    const nextStatus = currentStatus === "active" ? "pending" : "active";
    const res = await fetch(`/api/v1/admin/businesses/${businessId}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Membership updated");
      fetchAll();
    } else {
      toast.error(json.error?.message || "Failed to update membership");
    }
  }

  async function removeMember(userId) {
    if (!confirm("Remove this member from the business?")) return;
    const res = await fetch(`/api/v1/admin/businesses/${businessId}/members/${userId}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Member removed");
      fetchAll();
    } else {
      toast.error(json.error?.message || "Failed to remove member");
    }
  }

  if (loading) return <Loader2 className="animate-spin text-blue-600" size={32} />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Members</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-4 py-2 rounded-md"
        >
          <Plus size={16} /> Add Member
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Contact</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((m) => (
              <tr key={m.userId}>
                <td className="px-4 py-3">{m.user.fullName}</td>
                <td className="px-4 py-3 text-gray-500">{m.user.email || m.user.phone}</td>
                <td className="px-4 py-3">
                  <select
                    value={m.role.id}
                    onChange={(e) => updateRole(m.userId, e.target.value)}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleSuspend(m.userId, m.status)} className="text-xs capitalize underline">
                    {m.status}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => removeMember(m.userId)} className="text-red-600">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">No members yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddMemberModal
          businessId={businessId}
          roles={roles}
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}

function AddMemberModal({ businessId, roles, onClose, onAdded }) {
  const [mode, setMode] = useState("existing");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleId, setRoleId] = useState(roles[0]?.id || "");
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  async function runSearch() {
    if (search.trim().length < 2) return;
    const res = await fetch(`/api/v1/admin/users/search?q=${encodeURIComponent(search)}`);
    const json = await res.json();
    if (json.success) setResults(json.data);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!roleId) {
      toast.error("Choose a role");
      return;
    }

    const body =
      mode === "existing"
        ? { mode: "existing", userId: selected?.id, roleId }
        : { mode: "new", fullName, email: email || undefined, phone: phone || undefined, roleId };

    if (mode === "existing" && !body.userId) {
      toast.error("Select a user first");
      return;
    }
    if (mode === "new" && (!fullName || (!email && !phone))) {
      toast.error("Name and email or phone are required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/admin/businesses/${businessId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Member added");
        onAdded();
      } else {
        toast.error(json.error?.message || "Failed to add member");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Add Member</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode("existing")}
            className={`flex-1 py-2 text-sm font-medium rounded-md border ${
              mode === "existing" ? "border-blue-500 text-blue-600 bg-blue-50" : "border-gray-300 text-gray-500"
            }`}
          >
            Existing User
          </button>
          <button
            type="button"
            onClick={() => setMode("new")}
            className={`flex-1 py-2 text-sm font-medium rounded-md border ${
              mode === "new" ? "border-blue-500 text-blue-600 bg-blue-50" : "border-gray-300 text-gray-500"
            }`}
          >
            Invite New
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "existing" ? (
            <div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, email, or phone"
                    className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2.5 text-sm"
                  />
                </div>
                <button type="button" onClick={runSearch} className="px-4 py-2.5 border border-gray-300 rounded-md text-sm">
                  Search
                </button>
              </div>
              {results.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-md divide-y max-h-40 overflow-y-auto">
                  {results.map((u) => (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => setSelected(u)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${selected?.id === u.id ? "bg-blue-50" : ""}`}
                    >
                      {u.fullName} — {u.email || u.phone}
                    </button>
                  ))}
                </div>
              )}
              {selected && <p className="text-xs text-green-700 mt-1">Selected: {selected.fullName}</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <input
                placeholder="Full name *"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
              />
              <input
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
              />
              <input
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
              />
              <p className="text-xs text-gray-500">
                They'll be created with no password and use "Forgot password" to set one before their first login.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Role</label>
            <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm">
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm py-3 rounded-md disabled:opacity-60"
          >
            {submitting ? "Adding..." : "Add Member"}
          </button>
        </form>
      </div>
    </div>
  );
}