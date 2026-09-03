// PATH: components/PaymentStatusPanel.js

"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

const POLL_INTERVAL_MS = 3000;
const SHOW_HELP_AFTER_MS = 25000; // how long to wait before offering "check again" / manual code, during active checkout polling

// mode="checkout": auto-polls /api/v1/payments/status every 3s, shows a
//   spinner, reveals help options after ~25s of no confirmation.
// mode="resume": no polling at all (for revisiting an order later, e.g.
//   the buyer closed the tab mid-payment) — jumps straight to the
//   check-again/code UI with no spinner.
export default function PaymentStatusPanel({ paymentRef, provider, mode = "checkout", onSuccess, onFailure }) {
  const [status, setStatus] = useState("pending");
  const [showHelp, setShowHelp] = useState(mode === "resume");
  const [checking, setChecking] = useState(false);
  const [code, setCode] = useState("");
  const [submittingCode, setSubmittingCode] = useState(false);
  const [message, setMessage] = useState("");
  const pollTimer = useRef(null);
  const helpTimer = useRef(null);

  useEffect(() => {
    if (mode !== "checkout") return;
    helpTimer.current = setTimeout(() => setShowHelp(true), SHOW_HELP_AFTER_MS);
    poll();
    return () => {
      clearTimeout(pollTimer.current);
      clearTimeout(helpTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function poll() {
    try {
      const res = await fetch(`/api/v1/payments/status?ref=${encodeURIComponent(paymentRef)}`);
      const json = await res.json();
      if (json.success) {
        if (json.data.status === "completed") {
          setStatus("completed");
          onSuccess?.();
          return;
        }
        if (json.data.status === "failed") {
          setStatus("failed");
          onFailure?.();
          return;
        }
      }
    } catch {
      // Network hiccup — just try again on the next tick.
    }
    pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
  }

  async function runReconcile(note) {
    setMessage("");
    try {
      const res = await fetch("/api/v1/payments/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: paymentRef, ...(note ? { note } : {}) }),
      });
      const json = await res.json();
      if (json.success && json.data.status === "completed") {
        setStatus("completed");
        onSuccess?.();
      } else if (json.success && json.data.status === "failed") {
        setStatus("failed");
        onFailure?.();
      } else {
        setMessage(
          provider === "mpesa"
            ? "No confirmation from M-Pesa yet — this can take up to a minute. Try again shortly."
            : "Still checking with Airtel Money — try again in a moment."
        );
      }
    } catch {
      setMessage("Couldn't reach the server — check your connection and try again.");
    }
  }

  async function handleCheckAgain() {
    setChecking(true);
    await runReconcile();
    setChecking(false);
  }

  async function handleSubmitCode(e) {
    e.preventDefault();
    setSubmittingCode(true);
    await runReconcile(code);
    setSubmittingCode(false);
  }

  if (status === "completed") {
    return (
      <div className="text-center py-6">
        <CheckCircle2 size={40} className="mx-auto mb-3 text-green-500" />
        <p className="font-medium text-gray-900">Payment confirmed</p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="text-center py-6">
        <XCircle size={40} className="mx-auto mb-3 text-red-500" />
        <p className="font-medium text-gray-900">Payment didn't go through</p>
        <p className="text-sm text-gray-500 mt-1">You can try again with the same or a different number.</p>
      </div>
    );
  }

  return (
    <div className="text-center py-6">
      {mode === "checkout" && (
        <>
          <Loader2 size={36} className="mx-auto mb-3 text-blue-600 animate-spin" />
          <p className="font-medium text-gray-900">
            Check your phone for the {provider === "mpesa" ? "M-Pesa" : "Airtel Money"} prompt
          </p>
          <p className="text-sm text-gray-500 mt-1">Waiting for confirmation…</p>
        </>
      )}
      {mode === "resume" && <p className="font-medium text-gray-900">Payment not yet confirmed</p>}

      {showHelp && (
        <div className={`${mode === "checkout" ? "mt-6 border-t border-gray-100 pt-5" : "mt-3"} max-w-xs mx-auto`}>
          <p className="text-xs text-gray-500 mb-3">Already paid but it's not showing?</p>
          <button
            type="button"
            onClick={handleCheckAgain}
            disabled={checking}
            className="w-full inline-flex items-center justify-center gap-2 border border-gray-300 text-sm font-medium py-2 rounded-md hover:bg-gray-50 disabled:opacity-60"
          >
            {checking ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Check Again
          </button>

          <form onSubmit={handleSubmitCode} className="mt-3 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={provider === "mpesa" ? "M-Pesa code (optional)" : "Airtel reference (optional)"}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={submittingCode}
              className="bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-3 py-2 rounded-md disabled:opacity-60"
            >
              {submittingCode ? "…" : "Submit"}
            </button>
          </form>
          {message && <p className="text-xs text-gray-500 mt-2">{message}</p>}
        </div>
      )}
    </div>
  );
}