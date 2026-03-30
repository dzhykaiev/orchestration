"use client";

import { useState, useCallback, useRef } from "react";
import type { ToastData } from "../components/ui/Toast";

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const counter = useRef(0);

  const add = useCallback((message: string, type: ToastData["type"]) => {
    const id = `toast-${++counter.current}-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    toasts,
    dismiss,
    success: useCallback((msg: string) => add(msg, "success"), [add]),
    error: useCallback((msg: string) => add(msg, "error"), [add]),
    info: useCallback((msg: string) => add(msg, "info"), [add]),
    warning: useCallback((msg: string) => add(msg, "warning"), [add]),
  };
}
