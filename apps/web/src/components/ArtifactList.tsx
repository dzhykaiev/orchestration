"use client";

import { useEffect, useMemo, useState } from "react";
import type { Artifact } from "../lib/api";
import { api, getErrorDetails, getErrorMessage } from "../lib/api";
import { timeAgo } from "../lib/utils";

const TYPE_LABELS: Record<string, string> = {
  code_diff: "Code changes",
  test_result: "Test results",
  document: "Document",
  architecture: "Architecture",
  config: "Config",
  log: "Logs",
  review_report: "Review",
};

const TYPE_COLORS: Record<string, string> = {
  code_diff: "var(--color-artifact-code-diff)",
  test_result: "var(--color-artifact-test-result)",
  document: "var(--color-artifact-document)",
  architecture: "var(--color-artifact-architecture)",
  config: "var(--color-artifact-config)",
  log: "var(--color-artifact-log)",
  review_report: "var(--color-artifact-review-report)",
};

function formatSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getArtifactSummary(artifact: Artifact) {
  const lines = artifact.content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines[0] || "Open this artifact to inspect the generated output.";
}

export function ArtifactList({ projectId }: { projectId: string }) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | undefined>();

  useEffect(() => {
    if (!expanded) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setErrorDetails(undefined);

    void api.projects
      .artifacts(projectId, filter)
      .then((data) => {
        if (cancelled) return;
        setArtifacts(data.data);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setArtifacts([]);
        setError(getErrorMessage(fetchError, "Failed to load artifacts"));
        setErrorDetails(getErrorDetails(fetchError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, expanded, filter]);

  useEffect(() => {
    if (selectedId && !artifacts.some((artifact) => artifact.id === selectedId)) {
      setSelectedId(artifacts[0]?.id ?? null);
    }
  }, [artifacts, selectedId]);

  useEffect(() => {
    if (expanded && artifacts.length > 0 && !selectedId) {
      const firstArtifact = artifacts[0];
      if (firstArtifact) {
        setSelectedId(firstArtifact.id);
      }
    }
  }, [artifacts, expanded, selectedId]);

  const selected = artifacts.find((artifact) => artifact.id === selectedId) ?? artifacts[0] ?? null;
  const artifactCounts = useMemo(() => {
    return artifacts.reduce<Record<string, number>>((acc, artifact) => {
      acc[artifact.type] = (acc[artifact.type] ?? 0) + 1;
      return acc;
    }, {});
  }, [artifacts]);

  return (
    <details
      className="review-surface"
      open={expanded}
      onToggle={(event) => setExpanded((event.target as HTMLDetailsElement).open)}
    >
      <summary className="review-surface-summary">
        <div>
          <p className="review-surface-eyebrow">Outputs</p>
          <h2 className="review-surface-title">Artifacts</h2>
          <p className="review-surface-description">
            Review the generated deliverables before you archive or share the project.
          </p>
        </div>
        <span className="review-surface-count">{artifacts.length}</span>
      </summary>

      {expanded && (
        <div className="review-surface-body">
          <div className="review-surface-toolbar">
            <div className="review-filter-row" role="tablist" aria-label="Artifact type filters">
              <button
                type="button"
                className={`review-filter-chip ${!filter ? "active" : ""}`}
                onClick={() => setFilter(undefined)}
              >
                All
                <span>{artifacts.length}</span>
              </button>
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`review-filter-chip ${filter === key ? "active" : ""}`}
                  onClick={() => setFilter(key)}
                >
                  {label}
                  <span>{artifactCounts[key] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="skeleton" style={{ height: 160 }} />
          ) : error ? (
            <div className="error-banner" role="alert">
              <strong>Artifacts failed to load</strong>
              <div>{error}</div>
              {errorDetails && <pre className="error-banner-details">{errorDetails}</pre>}
            </div>
          ) : artifacts.length === 0 ? (
            <div className="review-empty-state">
              <h3>No artifacts yet</h3>
              <p>
                {filter
                  ? "No artifacts match the selected filter. Switch filters to inspect other outputs."
                  : "The project has not produced reviewable outputs yet. Run planning or implementation first."}
              </p>
            </div>
          ) : (
            <div className="artifact-layout">
              <div className="artifact-list" role="list" aria-label="Project artifacts">
                {artifacts.map((artifact) => {
                  const isSelected = artifact.id === selected?.id;
                  return (
                    <button
                      key={artifact.id}
                      type="button"
                      className={`artifact-card ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedId(artifact.id)}
                    >
                      <div className="artifact-card-top">
                        <div className="artifact-card-title-row">
                          <span
                            className="artifact-type-dot"
                            style={{ background: TYPE_COLORS[artifact.type] || "var(--color-text-muted)" }}
                          />
                          <strong>{artifact.name}</strong>
                        </div>
                        <span className="artifact-type-badge">
                          {TYPE_LABELS[artifact.type] || artifact.type}
                        </span>
                      </div>
                      <p className="artifact-card-summary">{getArtifactSummary(artifact)}</p>
                      <div className="artifact-card-meta">
                        <span>{formatSize(artifact.sizeBytes)}</span>
                        <span>{timeAgo(artifact.createdAt)}</span>
                        <span>
                          {artifact.taskId
                            ? "Task output"
                            : artifact.workstreamId
                              ? "Workstream output"
                              : "Project output"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selected && (
                <div className="artifact-preview card">
                  <div className="artifact-preview-header">
                    <div>
                      <p className="project-card-eyebrow">Selected artifact</p>
                      <h3>{selected.name}</h3>
                      <p className="artifact-preview-summary">{getArtifactSummary(selected)}</p>
                    </div>
                    <div className="artifact-preview-meta">
                      <span className="artifact-type-badge">
                        {TYPE_LABELS[selected.type] || selected.type}
                      </span>
                      <span className="project-meta-pill">{formatSize(selected.sizeBytes)}</span>
                      <span className="project-meta-pill">
                        Created {timeAgo(selected.createdAt)}
                      </span>
                    </div>
                  </div>
                  <pre className="artifact-preview-content">{selected.content}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </details>
  );
}
