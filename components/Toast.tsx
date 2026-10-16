"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CloseIcon } from "./Icons";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = "info", duration: number = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = { id, type, message, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, duration?: number) => addToast(message, "success", duration),
    [addToast]
  );
  const error = useCallback(
    (message: string, duration?: number) => addToast(message, "error", duration || 5000),
    [addToast]
  );
  const warning = useCallback(
    (message: string, duration?: number) => addToast(message, "warning", duration),
    [addToast]
  );
  const info = useCallback(
    (message: string, duration?: number) => addToast(message, "info", duration),
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, warning, info }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-[90vw] sm:max-w-md w-full pointer-events-none"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        let badgeColor = "bg-accent text-line";
        let borderColor = "border-line";
        let prefix = "INFO";

        if (toast.type === "success") {
          badgeColor = "bg-[#2ECC71] text-line";
          prefix = "OK";
        } else if (toast.type === "error") {
          badgeColor = "bg-danger text-white";
          prefix = "ERR";
        } else if (toast.type === "warning") {
          badgeColor = "bg-[#F39C12] text-line";
          prefix = "WARN";
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto border-2 ${borderColor} bg-surface p-3 shadow-hard font-mono text-xs text-ink flex items-start gap-2.5 animate-in slide-in-from-bottom-2 fade-in duration-150`}
          >
            <span
              className={`shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badgeColor}`}
            >
              {prefix}
            </span>
            <div className="flex-1 leading-snug break-words">{toast.message}</div>
            <button
              onClick={() => onRemove(toast.id)}
              className="shrink-0 p-1 text-muted hover:text-ink hover:bg-surface2 transition-colors"
              aria-label="Dismiss notification"
            >
              <CloseIcon size={11} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
