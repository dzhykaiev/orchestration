"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface ToastData {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  title?: string;
  details?: string;
  durationMs?: number;
}

interface ToastProps extends ToastData {
  onDismiss: (id: string) => void;
}

export function Toast({ id, message, type, title, details, durationMs, onDismiss }: ToastProps) {
  const handleDismiss = useCallback(() => onDismiss(id), [id, onDismiss]);
  const [expanded, setExpanded] = useState(false);
  const timeout = useMemo(() => durationMs ?? (details ? 8000 : 4000), [details, durationMs]);

  useEffect(() => {
    const timer = setTimeout(handleDismiss, timeout);
    return () => clearTimeout(timer);
  }, [handleDismiss, timeout]);

  return (
    <div className={`toast toast-${type}`} role="alert">
      <div className="toast-content">
        {title && <div className="toast-title">{title}</div>}
        <div className="toast-message">{message}</div>
        {details && (
          <div className="toast-details-block">
            <button
              type="button"
              className="toast-details-toggle"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? "Hide details" : "Details"}
            </button>
            {expanded && <pre className="toast-details">{details}</pre>}
          </div>
        )}
      </div>
      <button type="button" className="toast-close" onClick={handleDismiss} aria-label="Dismiss">
        &times;
      </button>
    </div>
  );
}
