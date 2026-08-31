"use client";

export default function EligibleOrdersList({ orders, currency }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-500">
          <tr>
            <th className="px-4 py-2.5 font-medium">Order #</th>
            <th className="px-4 py-2.5 font-medium">Delivered</th>
            <th className="px-4 py-2.5 font-medium">Order Total</th>
            <th className="px-4 py-2.5 font-medium">Already Claimed</th>
            <th className="px-4 py-2.5 font-medium">Available</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                No delivered, payment-verified orders are contributing to your balance yet.
              </td>
            </tr>
          )}
          {orders.map((o) => (
            <tr key={o.id}>
              <td className="px-4 py-3 font-medium">{o.orderNumber}</td>
              <td className="px-4 py-3 text-gray-600">{new Date(o.createdAt).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-gray-600">{currency} {(o.subtotalMinor / 100).toLocaleString()}</td>
              <td className="px-4 py-3 text-gray-500">{currency} {(o.claimedMinor / 100).toLocaleString()}</td>
              <td className="px-4 py-3 font-medium text-green-700">{currency} {(o.remainingMinor / 100).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}