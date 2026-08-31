"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Ban,
  CheckCircle,
  X,
  Search,
  Users,
  UserCheck,
  UserX,
  Shield,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

// ------------------ MAIN PAGE WITH TABS ------------------
export default function AdminAccountsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "accounts", label: "Accounts", icon: Users },
    { id: "roles", label: "Roles", icon: Shield },
  ];

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "accounts" && <AccountsTab />}
      {activeTab === "roles" && <RolesTab />}
    </div>
  );
}

// ------------------ OVERVIEW TAB ------------------
function OverviewTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/v1/admin/accounts/stats")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (json.success && json.data) {
          setStats(json.data);
        } else {
          setError("Failed to load stats.");
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load stats.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (error || !stats) {
    return <p className="text-sm text-red-600">{error || "No stats available."}</p>;
  }

  const monthly = stats.monthlySignups || [];
  const maxCount = Math.max(...monthly.map((m) => m.count), 1);

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Total Users" value={stats.totalUsers ?? 0} icon={Users} />
        <StatCard label="Active Users" value={stats.activeUsers ?? 0} icon={UserCheck} />
        <StatCard label="Suspended Users" value={stats.suspendedUsers ?? 0} icon={UserX} />
        <StatCard label="Platform Staff" value={stats.platformStaff ?? 0} icon={Shield} />
        <StatCard label="Regular Users" value={stats.regularUsers ?? 0} icon={Users} />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">User Signups (Last 6 Months)</h2>
        <div className="flex items-end justify-between gap-2 h-64">
          {monthly.length === 0 ? (
            <p className="text-sm text-gray-500">No data available.</p>
          ) : (
            monthly.map((item) => (
              <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-blue-600 rounded-t"
                  style={{ height: `${(item.count / maxCount) * 200}px` }}
                />
                <span className="text-xs text-gray-500">{item.month.slice(5)}</span>
                <span className="text-xs font-medium text-gray-700">{item.count}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
        <Icon size={16} className="text-blue-600" />
        {label}
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

// ------------------ ACCOUNTS TAB ------------------
function AccountsTab() {
  const { data: session } = useSession();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") || "all");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [meta, setMeta] = useState({ page: 1, perPage: 20, total: 0, totalPages: 1 });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "Agent",
    status: "active",
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch accounts whenever filters/page change
  useEffect(() => {
    fetchAccounts();
  }, [search, typeFilter, statusFilter, page]);

  async function fetchAccounts() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", page);
      params.set("perPage", 20);

      const res = await fetch(`/api/v1/admin/accounts?${params.toString()}`);
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (json.success) {
        setAccounts(json.data);
        setMeta(json.meta || { page: 1, perPage: 20, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function updateQueryParams() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (page > 1) params.set("page", page);
    router.push(`/admin/accounts?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    updateQueryParams();
  }, [search, typeFilter, statusFilter, page]);

  function openCreate() {
    setEditingUser(null);
    setForm({ fullName: "", email: "", phone: "", password: "", role: "Agent", status: "active" });
    setModalOpen(true);
  }

  function openEdit(user) {
    setEditingUser(user);
    setForm({
      fullName: user.fullName,
      email: user.email || "",
      phone: user.phone || "",
      password: "",
      role: user.platformRoles?.[0] || "Agent",
      status: user.status,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingUser ? `/api/v1/admin/accounts/${editingUser.id}` : "/api/v1/admin/accounts";
      const method = editingUser ? "PATCH" : "POST";
      const body = {
        fullName: form.fullName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        role: form.role,
        status: form.status,
      };
      if (form.password) body.password = form.password;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (!res.ok || !json.success) {
        toast.error(json.error?.message || "Operation failed");
        return;
      }
      toast.success(editingUser ? "Account updated" : "Account created");
      setModalOpen(false);
      fetchAccounts();
    } catch (err) {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSuspendToggle(user) {
    const newStatus = user.status === "active" ? "suspended" : "active";
    if (!window.confirm(`${newStatus === "suspended" ? "Suspend" : "Reactivate"} ${user.fullName}?`)) return;
    try {
      const res = await fetch(`/api/v1/admin/accounts/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (!res.ok || !json.success) {
        toast.error(json.error?.message || "Failed to update status");
        return;
      }
      toast.success(`Account ${newStatus === "suspended" ? "suspended" : "reactivated"}`);
      fetchAccounts();
    } catch (err) {
      toast.error("Network error");
    }
  }

  async function handleDelete(user) {
    if (!window.confirm(`Delete ${user.fullName}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/v1/admin/accounts/${user.id}`, { method: "DELETE" });
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (!res.ok || !json.success) {
        toast.error(json.error?.message || "Failed to delete");
        return;
      }
      toast.success("Account deleted");
      fetchAccounts();
    } catch (err) {
      toast.error("Network error");
    }
  }

  if (loading && !accounts.length) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl mb-1">Accounts</h1>
          <p className="text-sm text-muted">Manage platform users — admins, ops admins, and agents.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-4 py-2.5 rounded-md"
        >
          <Plus size={16} />
          Add Account
        </button>
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, email, phone..."
            className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-md px-3 py-2.5 text-sm"
        >
          <option value="all">All Users</option>
          <option value="platform">Platform Staff</option>
          <option value="regular">Regular Users</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-md px-3 py-2.5 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
      </div>

      {/* Accounts Table / Cards */}
      {accounts.length === 0 ? (
        <p className="text-sm text-muted">No accounts found matching criteria.</p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role(s)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accounts.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.fullName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {user.email || user.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {user.platformRoles?.join(", ") || "Regular User"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => openEdit(user)} className="text-blue-600 hover:text-blue-800"><Pencil size={16} /></button>
                      <button onClick={() => handleSuspendToggle(user)} className="text-yellow-600 hover:text-yellow-800">
                        {user.status === "active" ? <Ban size={16} /> : <CheckCircle size={16} />}
                      </button>
                      <button onClick={() => handleDelete(user)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {accounts.map((user) => (
              <div key={user.id} className="border border-gray-200 rounded-md p-4 bg-white">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">{user.fullName}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    user.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {user.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{user.email || user.phone || "—"}</p>
                <p className="text-sm text-gray-500 mt-0.5">{user.platformRoles?.join(", ") || "Regular User"}</p>
                <div className="flex gap-4 mt-3 text-sm">
                  <button onClick={() => openEdit(user)} className="text-blue-600">Edit</button>
                  <button onClick={() => handleSuspendToggle(user)} className="text-yellow-600">
                    {user.status === "active" ? "Suspend" : "Reactivate"}
                  </button>
                  <button onClick={() => handleDelete(user)} className="text-red-600">Delete</button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-600">
                Page {meta.page} of {meta.totalPages} ({meta.total} total)
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingUser ? "Edit Account" : "Add Account"}
              </h2>
              <button onClick={() => setModalOpen(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Full Name</label>
                <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Password {editingUser ? "(leave blank to keep)" : ""}</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm">
                  <option value="Super Admin">Super Admin</option>
                  <option value="Ops Admin">Ops Admin</option>
                  <option value="Agent">Agent</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm">
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="banned">Banned</option>
                </select>
              </div>
              <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm py-3 rounded-md disabled:opacity-60">
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? "Saving..." : editingUser ? "Update Account" : "Create Account"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------ ROLES TAB ------------------
function RolesTab() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [form, setForm] = useState({ name: "", scope: "platform", isSystemRole: false });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchRoles();
  }, []);

  async function fetchRoles() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/admin/roles");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const text = await res.text();
      if (!text) {
        throw new Error("Empty response");
      }
      const json = JSON.parse(text);
      if (json.success) {
        setRoles(json.data || []);
      } else {
        throw new Error(json.error?.message || "Failed to load roles");
      }
    } catch (err) {
      console.error("Roles fetch error:", err);
      setError(err.message || "Could not load roles.");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingRole(null);
    setForm({ name: "", scope: "platform", isSystemRole: false });
    setModalOpen(true);
  }

  function openEdit(role) {
    setEditingRole(role);
    setForm({ name: role.name, scope: role.scope, isSystemRole: role.isSystemRole });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingRole ? `/api/v1/admin/roles/${editingRole.id}` : "/api/v1/admin/roles";
      const method = editingRole ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (json.success) {
        toast.success(editingRole ? "Role updated" : "Role created");
        setModalOpen(false);
        fetchRoles();
      } else {
        toast.error(json.error?.message || "Operation failed");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(role) {
    if (!confirm(`Delete role "${role.name}"?`)) return;
    await fetch(`/api/v1/admin/roles/${role.id}`, { method: "DELETE" });
    fetchRoles();
  }

  if (loading) {
    return <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />;
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        {error}. Please ensure the roles API is implemented.
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-display text-2xl mb-1">Roles</h1>
          <p className="text-sm text-muted">Manage platform and business roles.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-4 py-2.5 rounded-md">
          <Plus size={16} /> Add Role
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scope</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">System</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {roles.map((role) => (
              <tr key={role.id}>
                <td className="px-4 py-3 text-sm text-gray-900">{role.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{role.scope}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{role.isSystemRole ? "Yes" : "No"}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{role.userCount}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => openEdit(role)} className="text-blue-600"><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(role)} className="text-red-600"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">{editingRole ? "Edit Role" : "Add Role"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Scope</label>
                <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm">
                  <option value="platform">Platform</option>
                  <option value="business">Business</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.isSystemRole} onChange={(e) => setForm({ ...form, isSystemRole: e.target.checked })} />
                <span className="text-sm text-gray-700">System Role</span>
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm py-3 rounded-md">
                {submitting ? "Saving..." : editingRole ? "Update Role" : "Create Role"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}