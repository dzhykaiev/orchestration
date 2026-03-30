"use client";

import { useCallback, useEffect } from "react";

export interface ToastData {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

interface ToastProps extends ToastData {
  onDismiss: (id: string) => void;
}

export function Toast({ id, message, type, onDismiss }: ToastProps) {
  const handleDismiss = useCallback(() => onDismiss(id), [id, onDismiss]);

  useEffect(() => {
    const timer = setTimeout(handleDismiss, 4000);
    return () => clearTimeout(timer);
  }, [handleDismiss]);

  return (
    <div className={`toast toast-${type}`} role="alert">
      <span className="toast-message">{message}</span>
      <button type="button" className="toast-close" onClick={handleDismiss} aria-label="Dismiss">
        &times;
      </button>
    </div>
  );
}
