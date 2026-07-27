"use client";

import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectToasts, dismissToast, type Toast } from "@/store/slices/uiSlice";

/**
 * How long a toast stays on screen before dismissing itself. Toasts previously persisted
 * until clicked, so a page whose toast the user never clicked kept it forever (and stacked
 * the next ones underneath it).
 */
export const TOAST_TIMEOUT_MS = 5000;

function ToastItem({ toast }: { toast: Toast }) {
  const dispatch = useDispatch();

  useEffect(() => {
    const timer = setTimeout(() => dispatch(dismissToast(toast.id)), TOAST_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [dispatch, toast.id]);

  return (
    <div
      role="status"
      className={`flex items-center gap-3 rounded-md px-4 py-2 text-sm text-white shadow ${
        toast.variant === "error" ? "bg-red-600" : toast.variant === "success" ? "bg-green-600" : "bg-gray-800"
      }`}
    >
      <span>{toast.message}</span>
      {/* A real <button>, not a <div onClick>: dismissal has to be reachable and operable
          by keyboard, and this is the most-reused UI primitive in the app (every form
          dispatches to it). Using the native element gets focusability, Enter/Space
          activation and button semantics without hand-rolling any of them. */}
      <button
        type="button"
        aria-label="Dismiss notification"
        className="-mr-1 shrink-0 rounded px-1 text-white/80 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        onClick={() => dispatch(dismissToast(toast.id))}
      >
        &times;
      </button>
    </div>
  );
}

export function ToastViewport() {
  const toasts = useSelector(selectToasts);

  return (
    <div className="fixed bottom-4 right-4 space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
