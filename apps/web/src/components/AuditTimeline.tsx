"use client";

import { useEffect, useMemo, useState } from "react";
import type { AuditLog } from "../lib/api";
import { api, getErrorDetails, getErrorMessage } from "../lib/api";
import { timeAgo } from "../lib/utils";

const ACTION_ICONS: Record<string, string> = {
  created: "+",
  updated: "~",
  status_changed: ">",
  delegated: "D",
  escalated: "E",
  reviewed: "R",
  completed: "C",
  failed: "!",
};

const ACTION_TITLES: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  status_changed: "Status changed",
  delegated: "Delegated",
  escalated: "Escalated",
  reviewed: "Reviewed",
  completed: "Completed",
  failed: "Failed",
};

function formatTimestamp(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/^./, (char) => char.toUpperCase());
}

function describeLog(log: AuditLog): { title: string; summary: string; detail?: string } {
  const meta = log.metadata as Record<string, unknown>;
  const entity = titleCase(log.entityType);

  switch (log.action) {
    case "status_changed":
      return {
        title: `${entity} status changed`,
        summary: `${meta.from ?? "Unknown"} -> ${meta.to ?? "Unknown"}`,
      };
    case "created":
      return {
        title: `${entity} created`,
        summary: "A new item was added to the execution flow.",
      };
    case "completed":
      return {
        title: `${entity} completed`,
        summary: "The work finished successfully.",
      };
    case "failed":
      return {
        title: `${entity} failed`,
        summary: "The run stopped with an error.",
        detail: typeof meta.error === "string" ? meta.error : undefined,
      };
    case "delegated":
      return {
        title: `${entity} delegated`,
        summary: meta.toTier
          ? `Work moved to ${titleCase(String(meta.toTier))}.`
          : "Work moved to another agent tier.",
      };
    case "escalated":
      return {
        title: `${entity} escalated`,
        summary: "The run needed intervention or a higher-level decision.",
        detail: typeof meta.reason === "string" ? meta.reason : undefined,
      };
    case "reviewed":
      return {
        title: `${entity} reviewed`,
        summary: meta.verdict
          ? `Verdict: ${String(meta.verdict)}`
          : "A review checkpoint was recorded.",
      };
    default:
      return {
        title: `${entity} ${titleCase(log.action).toLowerCase()}`,
        summary: "An execution event was recorded.",
      };
  }
}

export function AuditTimeline({ projectId }: { projectId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | undefined>();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!expanded) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setErrorDetails(undefined);

    void api.projects
      .auditLog(projectId)
      .then((data) => {
        if (cancelled) return;
        setLogs(data.data);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setLogs([]);
        setError(getErrorMessage(fetchError, "Failed to load activity log"));
        setErrorDetails(getErrorDetails(fetchError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, expanded]);

  useEffect(() => {
    if (selectedId && !logs.some((log) => log.id === selectedId)) {
      setSelectedId(logs[0]?.id ?? null);
    }
  }, [logs, selectedId]);

  useEffect(() => {
    if (expanded && logs.length > 0 && !selectedId) {
      const firstLog = logs[0];
      if (firstLog) {
        setSelectedId(firstLog.id);
      }
    }
  }, [logs, expanded, selectedId]);

  const selected = logs.find((log) => log.id === selectedId) ?? logs[0] ?? null;
  const summary = useMemo(() => {
    return logs.reduce<Record<string, number>>((acc, log) => {
      acc[log.action] = (acc[log.action] ?? 0) + 1;
      return acc;
    }, {});
  }, [logs]);

  return (
    <details
      className="review-surface"
      open={expanded}
      onToggle={(event) => setExpanded((event.target as HTMLDetailsElement).open)}
    >
      <summary className="review-surface-summary">
        <div>
          <p className="review-surface-eyebrow">Execution trace</p>
          <h2 className="review-surface-title">Activity Timeline</h2>
          <p className="review-surface-description">
            Use this timeline to understand what happened, where the run moved, and why it stopped
            or succeeded.
          </p>
        </div>
        <span className="review-surface-count">{logs.length}</span>
      </summary>

      {expanded && (
        <div className="review-surface-body">
          <div className="review-surface-toolbar">
            <div className="timeline-kpi-row">
              <span className="project-meta-pill">Completed {summary.completed ?? 0}</span>
              <span className="project-meta-pill">Failed {summary.failed ?? 0}</span>
              <span className="project-meta-pill">Escalated {summary.escalated ?? 0}</span>
              <span className="project-meta-pill">Reviewed {summary.reviewed ?? 0}</span>
            </div>
          </div>

          {loading ? (
            <div className="skeleton" style={{ height: 160 }} />
          ) : error ? (
            <div className="error-banner" role="alert">
              <strong>Activity log failed to load</strong>
              <div>{error}</div>
              {errorDetails && <pre className="error-banner-details">{errorDetails}</pre>}
            </div>
          ) : logs.length === 0 ? (
            <div className="review-empty-state">
              <h3>No activity recorded yet</h3>
              <p>
                The project has not emitted execution events yet. Start planning or implementation
                to generate a trace.
              </p>
            </div>
          ) : (
            <div className="timeline-layout">
              <div className="timeline-list" role="list" aria-label="Project activity timeline">
                {logs.map((log) => {
                  const description = describeLog(log);
                  const isSelected = log.id === selected?.id;
                  return (
                    <button
                      key={log.id}
                      type="button"
                      className={`timeline-item ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedId(log.id)}
                    >
                      <div className="timeline-item-icon" data-action={log.action}>
                        {ACTION_ICONS[log.action] || "·"}
                      </div>
                      <div className="timeline-item-body">
                        <div className="timeline-item-top">
                          <strong>{description.title}</strong>
                          <span className="timeline-item-badge">
                            {ACTION_TITLES[log.action] || titleCase(log.action)}
                          </span>
                        </div>
                        <p>{description.summary}</p>
                        <div className="timeline-item-meta">
                          <span>{formatTimestamp(log.createdAt)}</span>
                          <span>{timeAgo(log.createdAt)}</span>
                          <span>{titleCase(log.actorType)}</span>
                          {log.actorId && <span>{log.actorId}</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selected && (
                <div className="timeline-preview card">
                  <p className="project-card-eyebrow">Selected event</p>
                  <h3>{describeLog(selected).title}</h3>
                  <p className="artifact-preview-summary">{describeLog(selected).summary}</p>
                  <div className="timeline-preview-meta">
                    <span className="project-meta-pill">{formatTimestamp(selected.createdAt)}</span>
                    <span className="project-meta-pill">{titleCase(selected.actorType)}</span>
                    <span className="project-meta-pill">{titleCase(selected.entityType)}</span>
                  </div>
                  {describeLog(selected).detail && (
                    <div className="timeline-detail-note">
                      <strong>Why it matters</strong>
                      <p>{describeLog(selected).detail}</p>
                    </div>
                  )}
                  <pre className="timeline-metadata">
                    {JSON.stringify(selected.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </details>
  );
}
