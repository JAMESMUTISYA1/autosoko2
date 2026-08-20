"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

const ToastContext = createContext(null);

const VARIANTS = {
  success: { icon: CheckCircle2, className: "border-line text-fg" },
  info: { icon: Info, className: "border-line text-fg" },
  error: { icon: AlertTriangle, className: "border-2 border-fg text-fg font-semibold" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, variant = "success", duration = 3500) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, variant }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  const api = {
    success: (msg, duration) => push(msg, "success", duration),
    info: (msg, duration) => push(msg, "info", duration),
    error: (msg, duration) => push(msg, "error", duration),
    dismiss,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Toast stack — bottom-center on mobile, bottom-right on desktop */}
      <div
        className="fixed z-[100] bottom-4 left-1/2 -translate-x-1/2 md:left-auto md:right-4 md:translate-x-0 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => {
          const { icon: Icon, className } = VARIANTS[t.variant] || VARIANTS.success;
          return (
            <div
              key={t.id}
              role="status"
              className={`flex items-start gap-2.5 bg-card border shadow-lg shadow-black/10 rounded-md px-4 py-3 text-sm text-fg animate-[toast-in_0.2s_ease-out] ${className}`}
            >
              <Icon size={17} className="shrink-0 mt-0.5" />
              <span className="flex-1">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="shrink-0 text-muted hover:text-fg"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
