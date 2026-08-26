import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Image from "next/image";
import { Check } from "lucide-react";
import { auth } from "@/auth";
import { getBuyerOrder, ORDER_STATUS_FLOW } from "@/data/buyerData";
import { formatPrice } from "@/data/sampleData";

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

async function loadOrder(id) {
  try {
    const res = await fetch(`${getBaseUrl()}/api/v1/orders/${id}`, {
      headers: { cookie: headers().get("cookie") || "" },
      cache: "no-store",
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message);
    const o = json.data;

    // Adapt the real API's shape onto what this page was already built
    // against (mock buyerData.js's `history`/`items[].image` fields).
    return {
      id,
      orderNumber: o.orderNumber,
      storeName: o.business?.name,
      status: o.status,
      totalMinor: o.totalMinor,
      currency: o.currency,
      placedAt: new Date(o.createdAt).toLocaleDateString(),
      deliveryMethod: o.deliveryMethod,
      items: o.items.map((i) => ({
        name: i.product.name,
        image: i.product.images?.[0]?.url || null,
        priceMinor: i.unitPriceMinor,
        quantity: i.quantity,
      })),
      history: o.statusHistory.map((h) => ({
        status: h.status,
        at: new Date(h.createdAt).toLocaleString(),
      })),
    };
  } catch (err) {
    console.warn(`[account/orders/${id}] Falling back to mock data:`, err.message);
    return getBuyerOrder(id);
  }
}

export default async function OrderDetailPage({ params }) {
  const session = await auth();
  if (!session?.user) {
    redirect(`/auth/login?redirectTo=/account/orders/${params.id}`);
  }

  const order = await loadOrder(params.id);
  if (!order) return notFound();

  const currentIndex = ORDER_STATUS_FLOW.indexOf(order.status);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl font-mono">{order.orderNumber}</h1>
        <span className="text-[11px] px-2 py-1 rounded-sm border border-fg capitalize">
          {order.status}
        </span>
      </div>
      <p className="text-sm text-muted mb-8">{order.storeName} · Placed {order.placedAt}</p>

      {/* Tracking timeline */}
      <div className="border border-line rounded-md p-5 mb-6">
        <h2 className="font-display text-base mb-5">Tracking</h2>
        <div className="flex items-center justify-between relative">
          <div className="absolute top-3 left-0 right-0 h-0.5 bg-line" />
          <div
            className="absolute top-3 left-0 h-0.5 bg-fg transition-all"
            style={{
              width: `${(currentIndex / (ORDER_STATUS_FLOW.length - 1)) * 100}%`,
            }}
          />
          {ORDER_STATUS_FLOW.map((status, i) => {
            const reached = i <= currentIndex;
            return (
              <div key={status} className="relative z-10 flex flex-col items-center gap-2 flex-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                    reached ? "bg-fg border-fg text-bg" : "bg-bg border-line text-muted"
                  }`}
                >
                  {reached && <Check size={12} />}
                </div>
                <span className={`text-[11px] capitalize text-center ${reached ? "text-fg" : "text-muted"}`}>
                  {status}
                </span>
              </div>
            );
          })}
        </div>

        <ul className="mt-6 space-y-2 border-t border-line pt-4">
          {order.history.map((h, i) => (
            <li key={i} className="flex items-center justify-between text-xs">
              <span className="capitalize">{h.status}</span>
              <span className="text-muted font-mono">{h.at}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Items */}
      <div className="border border-line rounded-md divide-y divide-line mb-6">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            {item.image && (
              <div className="relative w-14 h-14 rounded-sm overflow-hidden border border-line shrink-0">
                <Image src={item.image} alt={item.name} fill className="object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm line-clamp-2">{item.name}</p>
              <p className="text-xs text-muted mt-0.5">Qty {item.quantity}</p>
            </div>
            <span className="text-sm font-mono shrink-0">
              {formatPrice(item.priceMinor * item.quantity, order.currency)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border border-fg rounded-md p-4">
        <span className="text-sm text-muted">
          Delivery: <span className="capitalize text-fg">{order.deliveryMethod}</span>
        </span>
        <span className="font-display text-lg">{formatPrice(order.totalMinor, order.currency)}</span>
      </div>
    </div>
  );
}
