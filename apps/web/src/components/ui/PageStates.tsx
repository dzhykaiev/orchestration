"use client";

import type { ReactNode } from "react";

interface PageLoadingStateProps {
  title?: string;
  subtitle?: string;
  height?: number;
}

interface PageErrorStateProps {
  title: string;
  message: string;
  details?: string;
  retryLabel?: string;
  onRetry?: () => void;
  secondaryAction?: ReactNode;
}

interface PageEmptyStateProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PageLoadingState({
  title = "Loading...",
  subtitle,
  height = 220,
}: PageLoadingStateProps) {
  return (
    <div className="ws-page-header" aria-busy="true">
      <div className="ws-page-header-row">
        <div>
          <h2 className="ws-page-title">{title}</h2>
          {subtitle && <p className="ws-page-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="skeleton" style={{ height }} />
    </div>
  );
}

export function PageErrorState({
  title,
  message,
  details,
  retryLabel = "Retry",
  onRetry,
  secondaryAction,
}: PageErrorStateProps) {
  return (
    <div className="project-load-error">
      <div className="error-banner" role="alert">
        <strong>{title}</strong>
        <div>{message}</div>
        {details && <pre className="error-banner-details">{details}</pre>}
      </div>
      {(onRetry || secondaryAction) && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {onRetry && (
            <button type="button" className="btn btn-primary" onClick={onRetry}>
              {retryLabel}
            </button>
          )}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

export function PageEmptyState({ title, description, actions }: PageEmptyStateProps) {
  return (
    <div className="company-empty">
      <h3 className="company-empty-title">{title}</h3>
      <p className="company-empty-desc">{description}</p>
      {actions}
    </div>
  );
}
