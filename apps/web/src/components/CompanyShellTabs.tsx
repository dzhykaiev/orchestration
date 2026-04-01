"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface CompanyShellTabsProps {
  companyId: string;
}

const TAB_DEFS = [
  { key: "overview", label: "Overview", getHref: (id: string) => `/companies/${id}` },
  { key: "tickets", label: "Tickets", getHref: (id: string) => `/companies/${id}/tickets` },
  { key: "projects", label: "Projects", getHref: (id: string) => `/companies/${id}/projects` },
  { key: "agents", label: "Agents", getHref: (id: string) => `/companies/${id}/agents` },
  { key: "activity", label: "Activity", getHref: (id: string) => `/companies/${id}/activity` },
] as const;

export function CompanyShellTabs({ companyId }: CompanyShellTabsProps) {
  const pathname = usePathname();

  return (
    <nav className="company-shell-tabs" aria-label="Company sections">
      {TAB_DEFS.map((tab) => {
        const href = tab.getHref(companyId);
        const active = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={tab.key}
            href={href}
            className={`company-shell-tab ${active ? "active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
