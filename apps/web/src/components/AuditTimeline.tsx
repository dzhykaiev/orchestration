"use client";

import { useEffect, useState } from "react";
import type { AuditLog } from "../lib/api";
import { api } from "../lib/api";

const ACTION_ICONS: Record<string, string> = {
  created: "+",
  updated: "~",
  status_changed: "→",
  delegated: "↓",
  escalated: "↑",
  reviewed: "✓",
  completed: "●",
  failed: "✕",
};

const ACTION_COLORS: Record<string, string> = {
  created: "var(--color-status-blue-bg, #dbeafe)",
  completed: "var(--color-status-green-bg, #dcfce7)",
  failed: "var(--color-status-red-bg, #fee2e2)",
  status_changed: "var(--color-status-yellow-bg, #fef9c3)",
  delegated: "var(--color-status-purple-bg, #f3e8ff)",
  escalated: "var(--color-status-orange-bg, #ffedd5)",
  reviewed: "var(--color-status-green-bg, #dcfce7)",
  updated: "var(--color-status-neutral-bg, #f3f4f6)",
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function describeLog(log: AuditLog): string {
  const meta = log.metadata as Record<string, unknown>;
  const entity = log.entityType;

  switch (log.action) {
    case "status_changed":
      return `${entity} status: ${meta.from ?? "?"} → ${meta.to ?? "?"}`;
    case "created":
      return `${entity} created`;
    case "completed":
      return `${entity} completed`;
    case "failed":
      return `${entity} failed${meta.error ? `: ${meta.error}` : ""}`;
    case "delegated":
      return `${entity} delegated${meta.toTier ? ` to ${meta.toTier}` : ""}`;
    case "escalated":
      return `${entity} escalated${meta.reason ? `: ${meta.reason}` : ""}`;
    case "reviewed":
      return `${entity} reviewed${meta.verdict ? ` — ${meta.verdict}` : ""}`;
    default:
      return `${entity} ${log.action}`;
  }
}

export function AuditTimeline({ projectId }: { projectId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    api.projects.auditLog(projectId).then((data) => {
      setLogs(data.data);
      setLoading(false);
    });
  }, [projectId, expanded]);

  return (
    <details
      open={expanded}
      onToggle={(e) => setExpanded((e.target as HTMLDetailsElement).open)}
      style={{ marginTop: "1.5rem" }}
    >
      <summary
        style={{
          cursor: "pointer",
          fontWeight: 600,
          fontSize: "1rem",
          marginBottom: "1rem",
          color: "var(--color-text-primary)",
        }}
      >
        Activity Log {logs.length > 0 && `(${logs.length})`}
      </summary>

      {loading && expanded ? (
        <div className="skeleton" style={{ height: 100 }} />
      ) : logs.length === 0 ? (
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>
          No activity recorded yet.
        </p>
      ) : (
        <div style={{ position: "relative", paddingLeft: "1.5rem" }}>
          <div
            style={{
              position: "absolute",
              left: "0.55rem",
              top: 0,
              bottom: 0,
              width: 2,
              background: "var(--color-border)",
            }}
          />
          {logs.map((log) => (
            <div
              key={log.id}
              style={{
                position: "relative",
                marginBottom: "0.75rem",
                paddingLeft: "1rem",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "-1.1rem",
                  top: "0.15rem",
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: ACTION_COLORS[log.action] || ACTION_COLORS.updated,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  border: "2px solid var(--color-surface)",
                }}
              >
                {ACTION_ICONS[log.action] || "·"}
              </div>
              <div style={{ fontSize: "0.85rem" }}>{describeLog(log)}</div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--color-text-secondary)",
                  marginTop: "0.1rem",
                }}
              >
                {formatTime(log.createdAt)} · {log.actorType}
                {log.actorId ? ` (${log.actorId})` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </details>
  );
}
