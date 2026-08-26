import { Suspense } from "react";
import OtpForm from "./OtpForm";

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div>Loading verification…</div>}>
      <OtpForm />
    </Suspense>
  );
}