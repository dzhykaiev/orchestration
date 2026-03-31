"use client";

import { createContext, useContext } from "react";
import { useToast } from "../../hooks/useToast";
import { ToastContainer } from "./ToastContainer";

type ToastInput =
  | string
  | {
      message: string;
      title?: string;
      details?: string;
      durationMs?: number;
    };

interface ToastContextValue {
  success: (input: ToastInput) => void;
  error: (input: ToastInput) => void;
  info: (input: ToastInput) => void;
  warning: (input: ToastInput) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToastContext must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, dismiss, success, error, info, warning } = useToast();

  return (
    <ToastContext.Provider value={{ success, error, info, warning, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
