"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CompanyHeader } from "../../components/ui/CompanyHeader";
import { PageLoadingState } from "../../components/ui/PageStates";
import { type Company, api } from "../../lib/api";

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.companies.list(100).then((data) => {
      setCompanies(data.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <PageLoadingState title="Companies" subtitle="Loading companies..." />;
  }

  return (
    <div>
      <CompanyHeader
        content={
          <>
            <h2 className="ws-page-title">Companies</h2>
            <p className="ws-page-subtitle">Manage autonomous companies and their projects</p>
          </>
        }
        actions={
          <Link href="/companies/new" className="btn btn-primary">
            New Company
          </Link>
        }
      />

      {companies.length === 0 ? (
        <div className="company-empty">
          <div className="company-empty-icon">
            <svg
              aria-hidden="true"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3 className="company-empty-title">No companies yet</h3>
          <p className="company-empty-desc">
            Create your first company to launch projects, tickets, and agent teams.
          </p>
          <Link href="/companies/new" className="btn btn-primary">
            Create Company
          </Link>
        </div>
      ) : (
        <div className="company-grid">
          {companies.map((company) => (
            <button
              key={company.id}
              type="button"
              className="company-card"
              onClick={() => router.push(`/companies/${company.id}`)}
            >
              <div className="company-card-top">
                <div className="company-card-icon">{company.name.charAt(0).toUpperCase()}</div>
                <div className="company-card-body">
                  <h3 className="company-card-title">{company.name}</h3>
                  <span className="company-card-slug">{company.slug}</span>
                </div>
              </div>
              {company.description && <p className="company-card-desc">{company.description}</p>}
              <div className="company-card-arrow">
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
