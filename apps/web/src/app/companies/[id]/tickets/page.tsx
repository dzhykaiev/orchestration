"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CompanyHeader } from "../../../../components/ui/CompanyHeader";
import { NextActionPanel } from "../../../../components/ui/NextActionPanel";
import { PageEmptyState, PageErrorState, PageLoadingState } from "../../../../components/ui/PageStates";
import { api, getErrorDetails, getErrorMessage, type Company, type Ticket } from "../../../../lib/api";
import { buildBoardHref } from "../../../../lib/companyNavigation";

type TicketStatus = Ticket["status"];

const STATUS_LABELS: Record<TicketStatus, string> = {
  backlog: "Backlog",
  todo: "Ready",
  in_progress: "In Progress",
  done: "Done",
  rejected: "Rejected",
};

export default function CompanyTicketsPage() {
  const { id } = useParams<{ id: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | undefined>();

  const load = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const [companyRes, ticketsRes] = await Promise.all([
        api.companies.get(id),
        api.companies.tickets(id, 100, 0),
      ]);
      setCompany(companyRes.workspace);
      setTickets(ticketsRes.tickets);
      setError(null);
      setErrorDetails(undefined);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load tickets"));
      setErrorDetails(getErrorDetails(loadError));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(
    () =>
      tickets.reduce(
        (acc, ticket) => {
          acc[ticket.status] += 1;
          return acc;
        },
        {
          backlog: 0,
          todo: 0,
          in_progress: 0,
          done: 0,
          rejected: 0,
        } as Record<TicketStatus, number>,
      ),
    [tickets],
  );

  if (loading) {
    return <PageLoadingState title="Tickets" subtitle="Loading company tickets..." />;
  }

  if (error || !company) {
    return (
      <PageErrorState
        title="Ticket page failed to load"
        message={error ?? "Company not found"}
        details={errorDetails}
        onRetry={() => void load()}
      />
    );
  }

  const recentTickets = [...tickets]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 12);

  return (
    <div className="workspace-shell">
      <CompanyHeader
        content={
          <NextActionPanel
            title="Tickets"
            description={`Manage and prioritize tickets for ${company.name}.`}
            titleTag="h2"
            titleClassName="ws-page-title"
            descriptionClassName="ws-page-subtitle"
          />
        }
        actions={
          <Link href={buildBoardHref(id)} className="btn btn-primary">
            Open Board
          </Link>
        }
      />

      <section className="workspace-context-grid">
        {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((status) => (
          <div className="card workspace-context-card" key={status}>
            <p className="workspace-card-eyebrow">{STATUS_LABELS[status]}</p>
            <strong style={{ fontSize: "1.6rem" }}>{grouped[status]}</strong>
          </div>
        ))}
      </section>

      {recentTickets.length === 0 ? (
        <PageEmptyState
          title="No tickets in this company yet"
          description="Open the board to create and prioritize the first ticket."
          actions={
            <Link href={buildBoardHref(id)} className="btn btn-primary">
              Open Board
            </Link>
          }
        />
      ) : (
        <div className="workspace-project-list">
          {recentTickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={
                ticket.orchestrationProjectId
                  ? `/projects/${ticket.orchestrationProjectId}`
                  : buildBoardHref(id, { q: ticket.title })
              }
              className="workspace-project-item"
            >
              <div className="workspace-project-info">
                <div className="workspace-project-name">{ticket.title}</div>
                <p className="workspace-project-goal">{ticket.description || "No description"}</p>
              </div>
              <div className="workspace-project-status">
                <span className="workspace-meta-pill">{STATUS_LABELS[ticket.status]}</span>
                <span className="workspace-meta-pill">
                  {ticket.orchestrationProjectId ? "Open Linked Project" : "Open on Board"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
