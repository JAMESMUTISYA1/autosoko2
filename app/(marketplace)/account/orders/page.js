export const dynamic = 'force-dynamic';

import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { buyerOrders as mockOrders } from "@/data/buyerData";
import { formatPrice } from "@/data/sampleData";

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

async function loadOrders() {
  // Server Component → internal API call: the incoming request's cookies
  // (which carry the session) don't automatically forward to fetch() —
  // they have to be passed explicitly, which is what this does.
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
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="font-display text-2xl mb-1">My Orders</h1>
      <p className="text-sm text-muted mb-8">{orders.length} orders</p>

      {orders.length === 0 ? (
        <div className="border border-line rounded-md px-5 py-12 text-center">
          <p className="text-sm text-muted">You haven't placed any orders yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            // Real API orders and mock orders have slightly different
            // shapes (business.name vs storeName, items.length vs
            // items array of {quantity, product}) — normalize inline
            // since this is the only place it's needed.
            const storeName = fromApi ? o.business?.name : o.storeName;
            const itemCount = fromApi ? o.items.length : o.items.length;
            const placedAt = fromApi ? new Date(o.createdAt).toLocaleDateString() : o.placedAt;

            return (
              <Link
                key={o.id}
                href={`/account/orders/${o.id}`}
                className="block border border-line rounded-md p-4 hover:border-fg transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-medium">{o.orderNumber}</span>
                  <span className="text-[11px] px-2 py-1 rounded-sm border border-fg capitalize">
                    {o.status}
                  </span>
                </div>
                <p className="text-sm text-muted">
                  {storeName} · {itemCount} item{itemCount > 1 ? "s" : ""}
                </p>
                <div className="flex items-center justify-between mt-2 text-sm">
                  <span className="text-muted">{placedAt}</span>
                  <span className="font-mono">{formatPrice(o.totalMinor, o.currency)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
