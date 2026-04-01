"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NextActionPanel } from "../../../components/ui/NextActionPanel";
import { PageErrorState, PageLoadingState } from "../../../components/ui/PageStates";
import { useToastContext } from "../../../components/ui/ToastProvider";
import { api, getErrorDetails, getErrorMessage, type AgentDefinition, type Company, type Project, type Ticket } from "../../../lib/api";
import { buildBoardHref } from "../../../lib/companyNavigation";

export default function CompanyOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToastContext();

  const [company, setCompany] = useState<Company | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | undefined>();

  const load = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const [companyRes, ticketsRes, projectsRes, agentsRes] = await Promise.all([
        api.companies.get(id),
        api.companies.tickets(id, 100, 0),
        api.companies.projects(id, 100, 0, true),
        api.companies.agents(id),
      ]);
      setCompany(companyRes.workspace);
      setTickets(ticketsRes.tickets);
      setProjects(projectsRes.data);
      setAgents(agentsRes.agents);
      setError(null);
      setErrorDetails(undefined);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load company"));
      setErrorDetails(getErrorDetails(loadError));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const ticketReady = tickets.filter((ticket) => ticket.status === "todo").length;
    const ticketInProgress = tickets.filter((ticket) => ticket.status === "in_progress").length;
    const projectActive = projects.filter((project) =>
      ["planning", "in_progress"].includes(project.status),
    ).length;
    const projectFailed = projects.filter((project) => project.status === "failed").length;

    return { ticketReady, ticketInProgress, projectActive, projectFailed };
  }, [projects, tickets]);

  if (loading) {
    return <PageLoadingState title="Company Overview" subtitle="Loading company context..." />;
  }

  if (!company || error) {
    return (
      <PageErrorState
        title="Company overview failed to load"
        message={error ?? "Company not found"}
        details={errorDetails}
        onRetry={() => void load()}
        secondaryAction={
          <Link href="/companies" className="btn btn-secondary">
            Back to Companies
          </Link>
        }
      />
    );
  }

  const nextAction =
    tickets.length === 0 && projects.length === 0
      ? "Create the first ticket or start a project from a brief."
      : stats.ticketReady > 0
        ? `${stats.ticketReady} ticket${stats.ticketReady === 1 ? "" : "s"} are ready for kickoff.`
        : stats.projectActive > 0
          ? `${stats.projectActive} project${stats.projectActive === 1 ? "" : "s"} are currently active.`
          : "Review project outcomes and prepare the next ticket batch.";

  return (
    <div className="workspace-shell">
      <section className="workspace-overview card">
        <div className="workspace-overview-copy">
          <p className="workspace-overview-eyebrow">Company context</p>
          <h1 className="workspace-detail-title">{company.name}</h1>
          <p className="workspace-detail-desc">{company.mission}</p>
          <p className="workspace-overview-description">
            {company.description || "Add a short company description to make ownership and scope explicit."}
          </p>
          <div className="workspace-meta-row">
            <span className="workspace-meta-pill">{projects.length} total projects</span>
            <span className="workspace-meta-pill">{tickets.length} total tickets</span>
            <span className="workspace-meta-pill">{agents.length} agent definitions</span>
            <span className="workspace-meta-pill">Next: {nextAction}</span>
          </div>
          <div className="workspace-detail-actions">
            <Link href={`/companies/${id}/tickets`} className="btn btn-primary">
              Open Tickets
            </Link>
            <Link href={`/companies/${id}/projects`} className="btn btn-secondary">
              Open Projects
            </Link>
            <Link href={`/companies/${id}/agents`} className="btn btn-secondary">
              Open Agents
            </Link>
          </div>
        </div>

        <div className="workspace-overview-stats" aria-label="Company summary">
          <div className="workspace-stat-card stat-total">
            <div className="workspace-stat-value">{stats.projectActive}</div>
            <div className="workspace-stat-label">Active Projects</div>
          </div>
          <div className="workspace-stat-card stat-active">
            <div className="workspace-stat-value">{stats.ticketReady}</div>
            <div className="workspace-stat-label">Ready Tickets</div>
          </div>
          <div className="workspace-stat-card stat-completed">
            <div className="workspace-stat-value">{stats.ticketInProgress}</div>
            <div className="workspace-stat-label">Tickets In Progress</div>
          </div>
          <div className="workspace-stat-card stat-failed">
            <div className="workspace-stat-value">{stats.projectFailed}</div>
            <div className="workspace-stat-label">Failed Projects</div>
          </div>
        </div>
      </section>

      <section className="workspace-context-grid">
        <div className="card workspace-context-card">
          <p className="workspace-card-eyebrow">Recommended sequence</p>
          <ul className="workspace-context-list">
            <li>
              <span>1. Capture and prioritize</span>
              <strong>Tickets tab</strong>
            </li>
            <li>
              <span>2. Launch and monitor execution</span>
              <strong>Projects tab</strong>
            </li>
            <li>
              <span>3. Tune delegation model</span>
              <strong>Agents tab</strong>
            </li>
            <li>
              <span>4. Review outcomes and history</span>
              <strong>Activity tab</strong>
            </li>
          </ul>
        </div>

        <div className="card workspace-context-card">
          <NextActionPanel
            eyebrow="Quick actions"
            title="Use ticket-first flow"
            description="Capture and prioritize on the board first, then manage execution in Projects and delegation in Agents."
            titleTag="h3"
            eyebrowClassName="workspace-card-eyebrow"
            actionsClassName="workspace-detail-actions"
            actions={
              <>
                <Link href={buildBoardHref(id)} className="btn btn-primary">
                  Open Ticket Board
                </Link>
                <Link href={`/companies/${id}/projects`} className="btn btn-secondary">
                  Open Projects
                </Link>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    toast.info({
                      title: "Context-first navigation",
                      message: "Use company tabs to keep tickets, projects, and activity scoped.",
                    })
                  }
                >
                  How This Works
                </button>
              </>
            }
          />
        </div>
      </section>
    </div>
  );
}
