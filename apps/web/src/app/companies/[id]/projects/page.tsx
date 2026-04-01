"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CompanyHeader } from "../../../../components/ui/CompanyHeader";
import { NextActionPanel } from "../../../../components/ui/NextActionPanel";
import { PageEmptyState, PageErrorState, PageLoadingState } from "../../../../components/ui/PageStates";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { api, getErrorDetails, getErrorMessage, type Company, type Project } from "../../../../lib/api";

export default function CompanyProjectsPage() {
  const { id } = useParams<{ id: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | undefined>();

  const load = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const [companyRes, projectsRes] = await Promise.all([
        api.companies.get(id),
        api.companies.projects(id, 100, 0, true),
      ]);
      setCompany(companyRes.workspace);
      setProjects(projectsRes.data);
      setError(null);
      setErrorDetails(undefined);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load projects"));
      setErrorDetails(getErrorDetails(loadError));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <PageLoadingState title="Projects" subtitle="Loading company projects..." />;
  }

  if (error || !company) {
    return (
      <PageErrorState
        title="Projects page failed to load"
        message={error ?? "Company not found"}
        details={errorDetails}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <div className="workspace-shell">
      <CompanyHeader
        content={
          <NextActionPanel
            title="Projects"
            description={`Track execution for ${company.name} without leaving company context.`}
            titleTag="h2"
            titleClassName="ws-page-title"
            descriptionClassName="ws-page-subtitle"
          />
        }
        actions={
          <>
            <Link href={`/companies/${id}/tickets`} className="btn btn-primary">
              Open Tickets
            </Link>
            <Link href={`/companies/${id}/projects/new`} className="btn btn-secondary">
              Advanced: Direct Project
            </Link>
          </>
        }
      />

      {projects.length === 0 ? (
        <PageEmptyState
          title="No projects in this company yet"
          description="Start from a ticket on the board or create a project directly."
          actions={
            <div className="home-empty-actions">
              <Link href={`/companies/${id}/tickets`} className="btn btn-primary">
                Open Tickets
              </Link>
              <Link href={`/companies/${id}/projects/new`} className="btn btn-secondary">
                Advanced: Direct Project
              </Link>
            </div>
          }
        />
      ) : (
        <div className="workspace-project-list">
          {[...projects]
            .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
            .map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="workspace-project-item">
                <div className="workspace-project-info">
                  <div className="workspace-project-name">{project.name}</div>
                  <p className="workspace-project-goal">{project.goal}</p>
                </div>
                <div className="workspace-project-status">
                  <StatusBadge status={project.status} />
                </div>
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
