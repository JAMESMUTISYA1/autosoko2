"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Search,
  Package,
  CheckCircle2,
  Truck,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  BadgeCheck,
  ShieldCheck,
  Pencil,
  Plus,
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

export default function AdminOrdersPage() {
  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, perPage: 20, total: 0, totalPages: 1 });

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const toast = useToast();

  // Hydration fix: wait until mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchOrders();
  }, [search, statusFilter, page, mounted]);

  useEffect(() => {
    if (!mounted) return;
    fetchStats();
  }, [mounted]);

  async function fetchStats() {
    try {
      const res = await fetch("/api/v1/admin/orders/stats");
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchOrders() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", page);
      params.set("perPage", 20);

      const res = await fetch(`/api/v1/admin/orders?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setOrders(json.data);
        setMeta(json.meta || { page: 1, perPage: 20, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyPayment(order) {
    if (!confirm(`Verify payment for order ${order.orderNumber}?`)) return;
    try {
      const res = await fetch(`/api/v1/admin/orders/${order.id}/verify-payment`, { method: "PATCH" });
      const json = await res.json();
      if (json.success) {
        toast.success("Payment verified");
        fetchOrders();
        fetchStats();
      } else {
        toast.error(json.error?.message || "Failed to verify payment");
      }
    } catch {
      toast.error("Network error");
    }
  }

  async function handleMarkDelivered(order) {
    if (!confirm(`Mark order ${order.orderNumber} as delivered?`)) return;
    try {
      const res = await fetch(`/api/v1/admin/orders/${order.id}/mark-delivered`, { method: "PATCH" });
      const json = await res.json();
      if (json.success) {
        toast.success("Order marked delivered");
        fetchOrders();
        fetchStats();
      } else {
        toast.error(json.error?.message || "Failed to mark delivered");
      }
    } catch {
      toast.error("Network error");
    }
  }

  function openDetail(order) {
    setSelectedOrder(order);
    setShowDetailModal(true);
  }

  function openEdit(order) {
    setEditingOrder(order);
    setShowEditModal(true);
  }

  function openCreate() {
    setShowCreateModal(true);
  }

  // If not mounted, return a static placeholder to avoid hydration mismatch
  if (!mounted) {
    return <div className="min-h-screen bg-white"></div>;
  }

  if (loading && !orders.length) {
    return <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl mb-1">Orders</h1>
          <p className="text-sm text-muted">Manage all customer orders across the platform.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-4 py-2 rounded-md"
        >
          <Plus size={16} /> Create Order
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
          <StatCard label="Total Orders" value={stats.total} icon={Package} />
          <StatCard label="Pending" value={stats.pending} icon={Clock} />
          <StatCard label="Processing" value={stats.processing} icon={Loader2} />
          <StatCard label="Shipped" value={stats.shipped} icon={Truck} />
          <StatCard label="Delivered" value={stats.delivered} icon={CheckCircle2} />
        </div>
      )}

      {/* Search & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search order number, buyer, business..."
            className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-md px-3 py-2.5 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
          <option value="disputed">Disputed</option>
        </select>
      </div>

      {/* Orders Table / Cards */}
      {orders.length === 0 ? (
        <p className="text-sm text-muted">No orders found.</p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{order.buyer?.fullName || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{order.business?.name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">KES {(order.totalMinor / 100).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      {order.paymentVerified ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                          <BadgeCheck size={14} /> Verified
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">Unverified</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => openDetail(order)} className="text-blue-600 hover:text-blue-800"><Eye size={16} /></button>
                      <button onClick={() => openEdit(order)} className="text-yellow-600 hover:text-yellow-800"><Pencil size={16} /></button>
                      {!order.paymentVerified && (
                        <button onClick={() => handleVerifyPayment(order)} className="text-green-600 hover:text-green-800">
                          <ShieldCheck size={16} />
                        </button>
                      )}
                      {order.status !== "delivered" && (
                        <button onClick={() => handleMarkDelivered(order)} className="text-indigo-600 hover:text-indigo-800">
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="border border-gray-200 rounded-md p-4 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-medium">{order.orderNumber}</span>
                  <StatusBadge status={order.status} />
                </div>
                <p className="text-sm text-gray-600">{order.buyer?.fullName || "—"}</p>
                <p className="text-sm text-gray-600">{order.business?.name || "—"}</p>
                <p className="text-sm font-medium text-gray-900">KES {(order.totalMinor / 100).toLocaleString()}</p>
                <div className="flex gap-4 mt-3 text-sm">
                  <button onClick={() => openDetail(order)} className="text-blue-600">View</button>
                  <button onClick={() => openEdit(order)} className="text-yellow-600">Edit</button>
                  {!order.paymentVerified && (
                    <button onClick={() => handleVerifyPayment(order)} className="text-green-600">Verify</button>
                  )}
                  {order.status !== "delivered" && (
                    <button onClick={() => handleMarkDelivered(order)} className="text-indigo-600">Deliver</button>
                  )}
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

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setShowDetailModal(false)} />
      )}

      {/* Edit Order Modal */}
      {showEditModal && editingOrder && (
        <OrderEditModal
          order={editingOrder}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            fetchOrders();
            fetchStats();
          }}
        />
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <OrderCreateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchOrders();
            fetchStats();
          }}
        />
      )}
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

function StatusBadge({ status }) {
  const config = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    processing: "bg-purple-100 text-purple-800",
    shipped: "bg-indigo-100 text-indigo-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    refunded: "bg-gray-100 text-gray-800",
    disputed: "bg-orange-100 text-orange-800",
  };
  const cls = config[status] || "bg-gray-100 text-gray-800";
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${cls}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function OrderDetailModal({ order, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Order Details</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Order Number</span>
            <span className="font-mono font-medium">{order.orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Buyer</span>
            <span>{order.buyer?.fullName || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Business</span>
            <span>{order.business?.name || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Total</span>
            <span className="font-medium">KES {(order.totalMinor / 100).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Status</span>
            <StatusBadge status={order.status} />
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Payment Verified</span>
            <span>{order.paymentVerified ? "Yes" : "No"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Created At</span>
            <span>{new Date(order.createdAt).toLocaleString()}</span>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Items</h4>
            <ul className="space-y-1">
              {order.items?.map((item, idx) => (
                <li key={idx} className="flex justify-between">
                  <span>{item.product?.name || "Product"} × {item.quantity}</span>
                  <span>KES {((item.unitPriceMinor * item.quantity) / 100).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
          {order.notes && (
            <div>
              <h4 className="font-medium text-gray-700 mb-1">Notes</h4>
              <p className="text-gray-600">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderEditModal({ order, onClose, onSaved }) {
  const [form, setForm] = useState({
    status: order.status,
    notes: order.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Order updated");
        onSaved();
      } else {
        toast.error(json.error?.message || "Update failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Edit Order</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
              <option value="disputed">Disputed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm py-3 rounded-md disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

function OrderCreateModal({ onClose, onCreated }) {
  const [buyers, setBuyers] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    buyerId: "",
    businessId: "",
    items: [{ productId: "", quantity: 1 }],
    deliveryMethod: "pickup",
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // Fetch regular users (buyers)
    fetch("/api/v1/admin/accounts?type=regular&perPage=100")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setBuyers(json.data);
      })
      .catch(() => {});

    // Fetch businesses
    fetch("/api/v1/admin/businesses")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setBusinesses(json.data);
      })
      .catch(() => {});
  }, []);

  // Fetch products when business changes
  useEffect(() => {
    if (!form.businessId) {
      setProducts([]);
      return;
    }
    fetch(`/api/v1/admin/businesses/${form.businessId}/products`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setProducts(json.data);
      })
      .catch(() => {});
  }, [form.businessId]);

  function handleItemChange(index, field, value) {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  }

  function addItem() {
    setForm((prev) => ({ ...prev, items: [...prev.items, { productId: "", quantity: 1 }] }));
  }

  function removeItem(index) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.buyerId || !form.businessId || form.items.some((i) => !i.productId || i.quantity < 1)) {
      toast.error("Please fill all fields and ensure at least one item.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/v1/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Order created");
        onCreated();
      } else {
        toast.error(json.error?.message || "Failed to create order");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Create Order</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Buyer</label>
              <select
                value={form.buyerId}
                onChange={(e) => setForm({ ...form, buyerId: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
                required
              >
                <option value="">Select buyer</option>
                {buyers.map((b) => (
                  <option key={b.id} value={b.id}>{b.fullName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Business</label>
              <select
                value={form.businessId}
                onChange={(e) => setForm({ ...form, businessId: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
                required
              >
                <option value="">Select business</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Delivery Method</label>
            <select
              value={form.deliveryMethod}
              onChange={(e) => setForm({ ...form, deliveryMethod: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
            >
              <option value="pickup">Pickup</option>
              <option value="courier">Courier</option>
              <option value="cross_border">Cross Border</option>
            </select>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Items</h4>
            {form.items.map((item, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-2 mb-2">
                <select
                  value={item.productId}
                  onChange={(e) => handleItemChange(index, "productId", e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2.5 text-sm"
                  required
                >
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
                  className="w-full sm:w-24 border border-gray-300 rounded-md px-3 py-2.5 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X size={20} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-2 text-blue-600 text-sm font-medium"
            >
              <Plus size={16} /> Add Item
            </button>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm py-3 rounded-md disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create Order"}
          </button>
        </form>
      </div>
    </div>
  );
}