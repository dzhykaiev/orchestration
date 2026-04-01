"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CompanyHeader } from "../../../../components/ui/CompanyHeader";
import { NextActionPanel } from "../../../../components/ui/NextActionPanel";
import { PageEmptyState, PageErrorState, PageLoadingState } from "../../../../components/ui/PageStates";
import { timeAgo } from "../../../../lib/utils";
import { api, getErrorDetails, getErrorMessage, type Company, type Project, type Ticket } from "../../../../lib/api";
import { buildBoardHref } from "../../../../lib/companyNavigation";

type ActivityItem = {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
  href: string;
};

export default function CompanyActivityPage() {
  const { id } = useParams<{ id: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | undefined>();

  const load = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const [companyRes, projectsRes, ticketsRes] = await Promise.all([
        api.companies.get(id),
        api.companies.projects(id, 100, 0, true),
        api.companies.tickets(id, 100, 0),
      ]);
      setCompany(companyRes.workspace);
      setProjects(projectsRes.data);
      setTickets(ticketsRes.tickets);
      setError(null);
      setErrorDetails(undefined);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load company activity"));
      setErrorDetails(getErrorDetails(loadError));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const activity = useMemo<ActivityItem[]>(() => {
    const projectEvents = projects.map((project) => ({
      id: `project:${project.id}`,
      timestamp: project.updatedAt,
      title: `Project ${project.status}`,
      detail: project.name,
      href: `/projects/${project.id}`,
    }));

    const ticketEvents = tickets.map((ticket) => ({
      id: `ticket:${ticket.id}`,
      timestamp: ticket.updatedAt,
      title: `Ticket ${ticket.status}`,
      detail: ticket.title,
      href: ticket.orchestrationProjectId
        ? `/projects/${ticket.orchestrationProjectId}`
        : buildBoardHref(id, { q: ticket.title }),
    }));

    return [...projectEvents, ...ticketEvents]
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
      .slice(0, 30);
  }, [id, projects, tickets]);

  if (loading) {
    return <PageLoadingState title="Activity" subtitle="Loading company activity..." />;
  }

  if (error || !company) {
    return (
      <PageErrorState
        title="Activity page failed to load"
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
            title="Activity"
            description={`Recent company-level changes for ${company.name}.`}
            titleTag="h2"
            titleClassName="ws-page-title"
            descriptionClassName="ws-page-subtitle"
          />
        }
      />

      {activity.length === 0 ? (
        <PageEmptyState
          title="No recent activity"
          description="Activity appears here as tickets and projects are updated."
        />
      ) : (
        <div className="workspace-project-list">
          {activity.map((item) => (
            <Link key={item.id} href={item.href} className="workspace-project-item">
              <div className="workspace-project-info">
                <div className="workspace-project-name">{item.title}</div>
                <p className="workspace-project-goal">{item.detail}</p>
              </div>
              <div className="workspace-project-status">
                <span className="workspace-meta-pill">{timeAgo(item.timestamp)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
