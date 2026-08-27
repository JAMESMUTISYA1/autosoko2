export const dynamic = 'force-dynamic';

import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { buyerOrders as mockOrders } from "@/data/buyerData";
import { formatPrice } from "@/data/sampleData";
import { Package, ShoppingBag, ChevronRight } from "lucide-react";

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

async function loadOrders() {
  try {
    const res = await fetch(`${getBaseUrl()}/api/v1/orders`, {
      headers: { cookie: headers().get("cookie") || "" },
      cache: "no-store",
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || "Failed to load orders");
    return { orders: json.data, fromApi: true };
  } catch (err) {
    console.warn("[account/orders] Falling back to mock data:", err.message);
    return { orders: mockOrders, fromApi: false };
  }
}

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login?redirectTo=/account/orders");
  }

  const { orders, fromApi } = await loadOrders();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-display text-gray-900">My Orders</h1>
            <p className="text-sm text-gray-500 mt-1">
              {orders.length} order{orders.length !== 1 ? "s" : ""} placed
            </p>
            {!fromApi && (
              <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1 mt-2 inline-block">
                Showing demo data — live API unavailable
              </p>
            )}
          </div>
          <Link
            href="/search"
            className="inline-flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-5 py-2.5 rounded-md transition-colors"
          >
            <ShoppingBag size={16} />
            Continue Shopping
          </Link>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="border border-dashed border-gray-300 bg-gray-50 rounded-lg p-12 text-center">
            <Package size={40} className="mx-auto mb-4 text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-700">No orders yet</h2>
            <p className="text-sm text-gray-500 mt-1">
              When you place an order, it will appear here.
            </p>
            <Link
              href="/search"
              className="inline-block mt-4 bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-md hover:bg-blue-700 transition-colors"
            >
              Browse Parts
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => {
              const storeName = fromApi ? o.business?.name : o.storeName;
              const itemCount = fromApi ? o.items.length : o.items.length;
              const placedAt = fromApi
                ? new Date(o.createdAt).toLocaleDateString()
                : o.placedAt;

              return (
                <Link
                  key={o.id}
                  href={`/account/orders/${o.id}`}
                  className="block bg-white border border-gray-200 rounded-lg shadow-sm hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-mono text-sm font-semibold text-gray-900">
                          {o.orderNumber}
                        </span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {storeName} · {itemCount} item{itemCount > 1 ? "s" : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-[11px] font-medium px-2 py-1 rounded-full capitalize ${
                          o.status === "delivered"
                            ? "bg-green-100 text-green-800"
                            : o.status === "shipped"
                            ? "bg-blue-100 text-blue-800"
                            : o.status === "processing"
                            ? "bg-purple-100 text-purple-800"
                            : o.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {o.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                      <span className="text-sm text-gray-500">{placedAt}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold text-gray-900">
                          {formatPrice(o.totalMinor, o.currency)}
                        </span>
                        <ChevronRight size={16} className="text-gray-400" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}