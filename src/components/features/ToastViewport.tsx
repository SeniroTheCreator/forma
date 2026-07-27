"use client";

import { useSelector, useDispatch } from "react-redux";
import { selectToasts, dismissToast } from "@/store/slices/uiSlice";

export function ToastViewport() {
  const toasts = useSelector(selectToasts);
  const dispatch = useDispatch();

  return (
    <div className="fixed bottom-4 right-4 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`rounded-md px-4 py-2 text-sm text-white shadow ${
            toast.variant === "error" ? "bg-red-600" : toast.variant === "success" ? "bg-green-600" : "bg-gray-800"
          }`}
          onClick={() => dispatch(dismissToast(toast.id))}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
