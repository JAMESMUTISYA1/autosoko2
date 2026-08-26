import { Suspense } from "react";
import CartView from "./CartView";

export default function CartPage() {
  return (
    <Suspense fallback={<div>Loading cart…</div>}>
      <CartView />
    </Suspense>
  );
}