import { Suspense } from "react";
import CheckoutView from "./CheckoutView";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Loading checkout…</div>}>
      <CheckoutView />
    </Suspense>
  );
}