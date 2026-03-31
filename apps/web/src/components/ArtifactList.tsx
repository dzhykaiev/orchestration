"use client";

import { useEffect, useState } from "react";
import type { Artifact } from "../lib/api";
import { api } from "../lib/api";

const TYPE_LABELS: Record<string, string> = {
  code_diff: "Code",
  test_result: "Tests",
  document: "Document",
  architecture: "Architecture",
  config: "Config",
  log: "Log",
  review_report: "Review",
};

const TYPE_COLORS: Record<string, string> = {
  code_diff: "#3b82f6",
  test_result: "#22c55e",
  document: "#8b5cf6",
  architecture: "#f59e0b",
  config: "#6b7280",
  log: "#64748b",
  review_report: "#ec4899",
};

export function ArtifactList({ projectId }: { projectId: string }) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | undefined>();

  useEffect(() => {
    if (!expanded) return;
    setLoading(true);
    api.projects.artifacts(projectId, filter).then((data) => {
      setArtifacts(data.artifacts);
      setLoading(false);
    });
  }, [projectId, expanded, filter]);

  const selected = artifacts.find((a) => a.id === selectedId);

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
        Artifacts {artifacts.length > 0 && `(${artifacts.length})`}
      </summary>

      {loading && expanded ? (
        <div className="skeleton" style={{ height: 100 }} />
      ) : artifacts.length === 0 ? (
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>
          No artifacts yet.
        </p>
      ) : (
        <>
          <div className="flex gap-2" style={{ marginBottom: "0.75rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn ${!filter ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: "0.75rem", padding: "2px 10px" }}
              onClick={() => setFilter(undefined)}
            >
              All
            </button>
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`btn ${filter === key ? "btn-primary" : "btn-secondary"}`}
                style={{ fontSize: "0.75rem", padding: "2px 10px" }}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            {artifacts.map((artifact) => (
              <button
                key={artifact.id}
                type="button"
                onClick={() => setSelectedId(selectedId === artifact.id ? null : artifact.id)}
                style={{
                  background: "var(--color-surface)",
                  border: `1px solid ${selectedId === artifact.id ? "var(--color-primary)" : "var(--color-border)"}`,
                  borderRadius: "var(--radius, 6px)",
                  padding: "0.75rem 1rem",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: TYPE_COLORS[artifact.type] || "#6b7280",
                      }}
                    />
                    <strong style={{ fontSize: "0.85rem" }}>{artifact.name}</strong>
                  </div>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--color-text-secondary)",
                      background: "var(--color-bg)",
                      padding: "1px 6px",
                      borderRadius: 3,
                    }}
                  >
                    {TYPE_LABELS[artifact.type] || artifact.type}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--color-text-secondary)",
                    marginTop: "0.25rem",
                  }}
                >
                  {(artifact.sizeBytes / 1024).toFixed(1)} KB
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <pre
              style={{
                marginTop: "0.75rem",
                padding: "1rem",
                background: "#1e1e1e",
                color: "#d4d4d4",
                borderRadius: 6,
                fontSize: "0.75rem",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: 500,
                overflow: "auto",
              }}
            >
              {selected.content}
            </pre>
          )}
        </>
      )}
    </details>
  );
}
