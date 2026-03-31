"use client";

import { useCallback, useRef, useState } from "react";
import type { ToastData } from "../components/ui/Toast";

type ToastInput =
  | string
  | {
      message: string;
      title?: string;
      details?: string;
      durationMs?: number;
    };

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const counter = useRef(0);

  const add = useCallback((input: ToastInput, type: ToastData["type"]) => {
    const id = `toast-${++counter.current}-${Date.now()}`;
    const payload = typeof input === "string" ? { message: input } : input;
    setToasts((prev) => [...prev, { id, type, ...payload }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    toasts,
    dismiss,
    success: useCallback((input: ToastInput) => add(input, "success"), [add]),
    error: useCallback((input: ToastInput) => add(input, "error"), [add]),
    info: useCallback((input: ToastInput) => add(input, "info"), [add]),
    warning: useCallback((input: ToastInput) => add(input, "warning"), [add]),
  };
}
