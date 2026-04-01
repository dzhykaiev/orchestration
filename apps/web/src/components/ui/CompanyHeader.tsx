"use client";

import type { ReactNode } from "react";

interface CompanyHeaderProps {
  content: ReactNode;
  actions?: ReactNode;
}

export function CompanyHeader({ content, actions }: CompanyHeaderProps) {
  return (
    <div className="ws-page-header">
      <div className="ws-page-header-row">
        <div>{content}</div>
        {actions && <div className="company-section-actions">{actions}</div>}
      </div>
    </div>
  );
}
