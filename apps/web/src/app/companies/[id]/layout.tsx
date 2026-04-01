import type { ReactNode } from "react";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import { CompanyShellTabs } from "../../../components/CompanyShellTabs";

export default async function CompanyLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="company-shell">
      <Breadcrumbs items={[{ label: "Companies", href: "/companies" }, { label: "Company" }]} />
      <CompanyShellTabs companyId={id} />
      <div className="company-shell-content">{children}</div>
    </div>
  );
}
