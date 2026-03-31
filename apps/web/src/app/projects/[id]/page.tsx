"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArtifactList } from "../../../components/ArtifactList";
import { AuditTimeline } from "../../../components/AuditTimeline";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import { EscalationBanner } from "../../../components/EscalationBanner";
import { FileTree } from "../../../components/FileTree";
import { FileViewer } from "../../../components/FileViewer";
import { ConfirmModal } from "../../../components/ui/ConfirmModal";
import { ProgressBar } from "../../../components/ui/ProgressBar";
import { SkeletonProjectDetail } from "../../../components/ui/SkeletonProjectDetail";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useToastContext } from "../../../components/ui/ToastProvider";
import { usePolling } from "../../../hooks/usePolling";
import { useSSE } from "../../../hooks/useSSE";
import {
  type AgentTask,
  type Feature,
  type Project,
  type Workspace,
  type Workstream,
  api,
} from "../../../lib/api";
import { getProviderStyle, timeAgo } from "../../../lib/utils";

const DependencyGraph = dynamic(
  () => import("../../../components/DependencyGraph").then((m) => m.DependencyGraph),
  { ssr: false, loading: () => <div className="dependency-graph-loading">Loading graph...</div> },
);

const PROVIDER_LABELS: Record<string, string> = {
  claude: "Claude Code",
  opencode: "OpenCode",
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const toast = useToastContext();

  const [project, setProject] = useState<Project | null>(null);
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const [tasksByWorkstream, setTasksByWorkstream] = useState<Record<string, AgentTask[]>>({});
  const [linkedFeature, setLinkedFeature] = useState<Feature | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<{
    total: number;
    byWorkstream: { workstreamId: string; name: string; cost: number }[];
    byRole: { role: string; cost: number }[];
    taskCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planning, setPlanning] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [retryingTaskId, setRetryingTaskId] = useState<string | null>(null);
  const [expandedWs, setExpandedWs] = useState<Set<string>>(new Set());
  const [expandedTaskOutput, setExpandedTaskOutput] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | "stop" | "archive" | "delete">(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const {
        project: proj,
        workstreams: ws,
        tasks,
        feature,
      } = await api.projects.detail(projectId);
      setProject(proj);
      setWorkstreams(ws);
      setLinkedFeature(feature ?? null);

      // Group tasks by workstreamId
      const grouped: Record<string, AgentTask[]> = {};
      for (const task of tasks) {
        const wsId = task.workstreamId;
        if (!grouped[wsId]) grouped[wsId] = [];
        (grouped[wsId] as AgentTask[]).push(task);
      }
      setTasksByWorkstream(grouped);

      // Fetch workspace info for breadcrumbs
      if (proj.workspaceId) {
        api.workspaces
          .get(proj.workspaceId)
          .then((res) => setWorkspace(res.workspace))
          .catch(() => {});
      }

      // Fetch cost breakdown
      api.projects
        .costs(projectId)
        .then((data) => setCostBreakdown(data))
        .catch(() => {});

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isActive = project && ["planning", "in_progress"].includes(project.status);
  usePolling(fetchData, 10000, !!isActive);

  useSSE({
    projectId,
    onEvent: useCallback(
      (event: { type: string; payload: unknown }) => {
        const type = event.type;
        if (
          type === "task.started" ||
          type === "task.completed" ||
          type === "task.failed" ||
          type === "workstream.started" ||
          type === "workstream.completed" ||
          type === "workstream.failed" ||
          type === "project.planning_completed"
        ) {
          fetchData();
        }
      },
      [fetchData],
    ),
    enabled: !!isActive,
  });

  async function handleStartPlanning() {
    setPlanning(true);
    try {
      const result = await api.projects.plan(projectId);
      setProject(result.project);
      setWorkstreams(result.workstreams);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start planning");
    } finally {
      setPlanning(false);
    }
  }

  async function executeStop() {
    setStopping(true);
    try {
      const result = await api.projects.stop(projectId);
      setProject(result.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop project");
    } finally {
      setStopping(false);
    }
  }

  async function executeArchive() {
    setArchiving(true);
    try {
      const result = await api.projects.archive(projectId);
      setProject(result.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive project");
    } finally {
      setArchiving(false);
    }
  }

  async function executeDelete() {
    setDeleting(true);
    try {
      await api.projects.delete(projectId);
      toast.success("Project deleted");
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete project");
      setDeleting(false);
    }
  }

  async function handleRetryTask(taskId: string) {
    setRetryingTaskId(taskId);
    try {
      const result = await api.tasks.retry(taskId);
      toast.success("Task queued for retry");
      setTasksByWorkstream((prev) => {
        const updated = { ...prev };
        for (const wsId of Object.keys(updated)) {
          const tasks = updated[wsId];
          if (tasks) {
            updated[wsId] = tasks.map((t) => (t.id === taskId ? result.task : t));
          }
        }
        return updated;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to retry task");
    } finally {
      setRetryingTaskId(null);
    }
  }

  async function handleProviderChange(newProvider: string) {
    try {
      const result = await api.projects.update(projectId, { provider: newProvider });
      setProject(result.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change provider");
    }
  }

  function toggleWs(wsId: string) {
    setExpandedWs((prev) => {
      const next = new Set(prev);
      if (next.has(wsId)) next.delete(wsId);
      else next.add(wsId);
      return next;
    });
    if (!tasksByWorkstream[wsId]) {
      api.workstreams
        .tasks(wsId)
        .then((res) => {
          setTasksByWorkstream((prev) => ({ ...prev, [wsId]: res.tasks }));
        })
        .catch((err) => {
          toast.error(err instanceof Error ? err.message : "Failed to load tasks");
        });
    }
  }

  function handleGraphNodeClick(wsId: string) {
    setExpandedWs((prev) => {
      const next = new Set(prev);
      next.add(wsId);
      return next;
    });
    const el = document.getElementById(`ws-${wsId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  if (loading) return <SkeletonProjectDetail />;
  if (error)
    return (
      <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
        <p style={{ color: "var(--color-danger)", marginBottom: "1rem" }}>Error: {error}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button type="button" className="btn btn-primary" onClick={fetchData}>
            Retry
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => router.push("/")}>
            Back to Projects
          </button>
        </div>
      </div>
    );
  if (!project) return <p>Project not found.</p>;

  const providerLabel = PROVIDER_LABELS[project.provider] ?? project.provider;
  const canStop = ["planning", "in_progress"].includes(project.status);
  const canArchive = ["completed", "failed", "cancelled", "draft"].includes(project.status);
  const canDelete = ["archived", "completed", "failed", "cancelled"].includes(project.status);
  const canChangeProvider = ["draft", "failed", "cancelled"].includes(project.status);

  const completedWs = workstreams.filter((ws) => ws.status === "completed").length;
  const activeWs = workstreams.filter((ws) => ws.status === "in_progress").length;
  const failedWs = workstreams.filter((ws) => ws.status === "failed").length;
  const allTasks = Object.values(tasksByWorkstream).flat();
  const runningTasks = allTasks.filter((t) => t.status === "running");

  // Build cost lookup by workstream
  const costByWorkstream: Record<string, number> = {};
  if (costBreakdown) {
    for (const entry of costBreakdown.byWorkstream) {
      costByWorkstream[entry.workstreamId] = entry.cost;
    }
  }

  return (
    <div>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Workspaces", href: "/workspaces" },
          ...(workspace ? [{ label: workspace.name, href: `/workspaces/${workspace.id}` }] : []),
          { label: project.name },
        ]}
      />

      {/* Header */}
      <div className="flex justify-between items-center mb-1">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2 style={{ margin: 0 }}>{project.name}</h2>
          <span
            className="text-sm"
            style={{
              ...getProviderStyle(project.provider),
              padding: "2px 10px",
              borderRadius: 10,
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            {providerLabel}
          </span>
          {costBreakdown && costBreakdown.total > 0 && (
            <span
              className="text-sm"
              style={{
                padding: "2px 10px",
                borderRadius: 10,
                fontSize: "0.75rem",
                fontWeight: 600,
                background: "var(--color-status-neutral-bg)",
                color: "var(--color-status-neutral-text)",
              }}
            >
              ${costBreakdown.total.toFixed(4)}
            </span>
          )}
        </div>
        <StatusBadge status={project.status} />
      </div>
      <p className="text-muted" style={{ margin: "0 0 0.5rem" }}>
        {project.goal}
      </p>

      {/* Link to source feature */}
      {linkedFeature && (
        <p className="text-sm" style={{ margin: "0 0 1rem", color: "var(--color-text-muted)" }}>
          Created from feature:{" "}
          <Link href="/board" style={{ color: "var(--color-primary)" }}>
            {linkedFeature.title}
          </Link>
        </p>
      )}
      {!linkedFeature && <div style={{ marginBottom: "0.5rem" }} />}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {project.status === "draft" && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleStartPlanning}
            disabled={planning}
          >
            {planning ? "Starting..." : "Start Planning"}
          </button>
        )}

        {canStop && (
          <button
            type="button"
            className="btn"
            onClick={() => setConfirmAction("stop")}
            disabled={stopping}
            style={{ background: "var(--color-danger)", color: "#fff", border: "none" }}
          >
            {stopping ? "Stopping..." : "Stop"}
          </button>
        )}

        {canArchive && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setConfirmAction("archive")}
            disabled={archiving}
          >
            {archiving ? "Archiving..." : "Archive"}
          </button>
        )}

        {canDelete && (
          <button
            type="button"
            className="btn"
            onClick={() => setConfirmAction("delete")}
            disabled={deleting}
            style={{ background: "var(--color-danger)", color: "#fff", border: "none" }}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        )}

        {canChangeProvider && (
          <select
            className="input"
            value={project.provider}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              handleProviderChange(e.target.value)
            }
            aria-label="AI provider"
            style={{ padding: "0.35rem 0.5rem", width: "auto" }}
          >
            <option value="opencode">OpenCode</option>
            <option value="claude">Claude Code</option>
          </select>
        )}
      </div>

      {/* Live status banner */}
      {project.status === "planning" && (
        <div
          className="card"
          style={{ background: "var(--color-status-blue-bg)", borderColor: "var(--color-border)" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                display: "inline-block",
                width: 18,
                height: 18,
                border: "2px solid var(--color-status-blue-text)",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <strong>Architect is analyzing your goal...</strong>
          </div>
          <p className="text-sm" style={{ margin: "4px 0 0" }}>
            {providerLabel} is designing architecture and creating workstreams. This page will
            update automatically.
          </p>
          <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
        </div>
      )}

      {project.status === "in_progress" && runningTasks.length > 0 && (
        <div
          className="card"
          style={{
            background: "var(--color-status-yellow-bg)",
            borderColor: "var(--color-border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1.2rem" }}>&#9881;</span>
            <strong>
              {runningTasks.length} agent{runningTasks.length > 1 ? "s" : ""} working
            </strong>
          </div>
          <div style={{ marginTop: 8 }}>
            {runningTasks.map((t) => (
              <span
                key={t.id}
                className="text-sm"
                style={{
                  display: "inline-block",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 4,
                  padding: "2px 8px",
                  marginRight: 6,
                  marginBottom: 4,
                }}
              >
                @{t.role}
              </span>
            ))}
          </div>
        </div>
      )}

      {project.status === "completed" && (
        <div
          className="card"
          style={{ background: "var(--color-status-green-bg)", borderColor: "var(--color-border)" }}
        >
          <strong>Project completed</strong>
          <p className="text-sm" style={{ margin: "4px 0 0" }}>
            All workstreams finished. Output files in{" "}
            <code>apps/orchestrator/projects/{project.id.slice(0, 8)}...</code>
          </p>
        </div>
      )}

      {project.status === "failed" && (
        <div
          className="card"
          style={{ background: "var(--color-status-red-bg)", borderColor: "var(--color-border)" }}
        >
          <strong>Project failed</strong>
          <p className="text-sm" style={{ margin: "4px 0 0" }}>
            One or more workstreams failed after max retries.
          </p>
        </div>
      )}

      {project.status === "cancelled" && (
        <div
          className="card"
          style={{ background: "var(--color-status-gray-bg)", borderColor: "var(--color-border)" }}
        >
          <strong>Project cancelled</strong>
          <p className="text-sm" style={{ margin: "4px 0 0" }}>
            The project was stopped by the user. You can archive or delete it.
          </p>
        </div>
      )}

      {project.status === "archived" && (
        <div
          className="card"
          style={{ background: "var(--color-status-gray-bg)", borderColor: "var(--color-border)" }}
        >
          <strong>Project archived</strong>
        </div>
      )}

      {/* Summary stats */}
      {workstreams.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: "0.75rem",
            margin: "1rem 0",
          }}
        >
          <div className="card" style={{ textAlign: "center", padding: "0.75rem" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{workstreams.length}</div>
            <div className="text-sm text-muted">Workstreams</div>
          </div>
          <div className="card" style={{ textAlign: "center", padding: "0.75rem" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-success)" }}>
              {completedWs}
            </div>
            <div className="text-sm text-muted">Completed</div>
          </div>
          <div className="card" style={{ textAlign: "center", padding: "0.75rem" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-warning)" }}>
              {activeWs}
            </div>
            <div className="text-sm text-muted">In Progress</div>
          </div>
          <div className="card" style={{ textAlign: "center", padding: "0.75rem" }}>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: failedWs > 0 ? "var(--color-danger)" : "var(--color-text-muted)",
              }}
            >
              {failedWs}
            </div>
            <div className="text-sm text-muted">Failed</div>
          </div>
        </div>
      )}

      {/* Overall progress */}
      {workstreams.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div className="flex justify-between items-center mb-1">
            <span style={{ fontWeight: 500 }}>Overall Progress</span>
            <span className="text-sm text-muted">
              {Math.round((completedWs / workstreams.length) * 100)}%
            </span>
          </div>
          <ProgressBar value={completedWs} max={workstreams.length} />
        </div>
      )}

      {/* Architecture */}
      {project.architecture && (
        <details className="mb-2" style={{ marginBottom: "1.5rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 500 }}>Architecture Document</summary>
          <pre
            style={{
              background: "var(--color-code-bg)",
              color: "var(--color-code-text)",
              padding: "1rem",
              borderRadius: 8,
              overflow: "auto",
              fontSize: "0.8rem",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              maxHeight: 500,
            }}
          >
            {project.architecture}
          </pre>
        </details>
      )}

      {/* Dependency Graph */}
      {workstreams.some((ws) => ws.dependencies.length > 0) && (
        <details className="mb-2" style={{ marginBottom: "1.5rem" }} open>
          <summary style={{ cursor: "pointer", fontWeight: 500 }}>Dependency Graph</summary>
          <DependencyGraph workstreams={workstreams} onNodeClick={handleGraphNodeClick} />
        </details>
      )}

      {/* Files */}
      <details style={{ marginBottom: "1.5rem" }}>
        <summary style={{ cursor: "pointer", fontWeight: 500 }}>Project Files</summary>
        <div style={{ marginTop: "0.5rem" }}>
          <FileTree projectId={projectId} onFileClick={(path) => setSelectedFile(path)} />
        </div>
      </details>

      {/* Workstreams */}
      {workstreams.length > 0 && (
        <>
          <h3 style={{ marginBottom: "0.75rem" }}>Workstreams</h3>
          {workstreams.map((ws) => {
            const tasks = tasksByWorkstream[ws.id] ?? [];
            const completedTasks = tasks.filter((t) => t.status === "completed").length;
            const isExpanded = expandedWs.has(ws.id);

            return (
              <div
                key={ws.id}
                id={`ws-${ws.id}`}
                className="card"
                style={{
                  borderLeft: `4px solid ${
                    ws.status === "completed"
                      ? "var(--color-success)"
                      : ws.status === "in_progress"
                        ? "var(--color-warning)"
                        : ws.status === "failed"
                          ? "var(--color-danger)"
                          : "var(--color-border)"
                  }`,
                }}
              >
                <div
                  className="flex justify-between items-center"
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  aria-label={`Toggle workstream: ${ws.name}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => toggleWs(ws.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleWs(ws.id);
                    }
                  }}
                >
                  <div>
                    <span style={{ marginRight: 6, fontSize: "0.8rem" }}>
                      {isExpanded ? "▼" : "▶"}
                    </span>
                    <strong>{ws.name}</strong>
                    {ws.assignedAgent && (
                      <span
                        className="text-sm"
                        style={{
                          marginLeft: 8,
                          background: "var(--color-agent-bg)",
                          color: "var(--color-agent-text)",
                          padding: "1px 8px",
                          borderRadius: 10,
                          fontSize: "0.7rem",
                          fontWeight: 600,
                        }}
                      >
                        @{ws.assignedAgent}
                      </span>
                    )}
                  </div>
                  <StatusBadge status={ws.status} />
                </div>

                <p className="text-sm text-muted" style={{ margin: "0.5rem 0 0" }}>
                  {ws.objective}
                </p>

                {costByWorkstream[ws.id] != null && (costByWorkstream[ws.id] ?? 0) > 0 && (
                  <span
                    className="text-sm"
                    style={{
                      display: "inline-block",
                      marginTop: 4,
                      fontSize: "0.75rem",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    Cost: ${(costByWorkstream[ws.id] ?? 0).toFixed(4)}
                  </span>
                )}

                {tasks.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <ProgressBar value={completedTasks} max={tasks.length} />
                  </div>
                )}

                {ws.deliverables.length > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span className="text-sm text-muted">Deliverables: </span>
                    {ws.deliverables.map((d) => (
                      <code
                        key={d}
                        className="text-sm"
                        style={{
                          background: "var(--color-status-neutral-bg)",
                          color: "var(--color-status-neutral-text)",
                          padding: "1px 4px",
                          borderRadius: 3,
                          fontSize: "0.75rem",
                        }}
                      >
                        {d}
                      </code>
                    ))}
                  </div>
                )}

                {ws.dependencies.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    <span className="text-sm text-muted">
                      Depends on:{" "}
                      {ws.dependencies
                        .map((depId) => {
                          const dep = workstreams.find((w) => w.id === depId || w.name === depId);
                          return dep ? dep.name : depId.slice(0, 8);
                        })
                        .join(", ")}
                    </span>
                  </div>
                )}

                {isExpanded && (
                  <div
                    style={{
                      marginTop: "1rem",
                      borderTop: "1px solid var(--color-border)",
                      paddingTop: "0.75rem",
                    }}
                  >
                    {tasks.length === 0 ? (
                      <p className="text-sm text-muted">
                        {ws.status === "pending" ? "Waiting for dependencies..." : "No tasks yet."}
                      </p>
                    ) : (
                      tasks.map((task) => (
                        <div
                          key={task.id}
                          style={{
                            padding: "0.75rem",
                            marginBottom: "0.5rem",
                            background: "var(--color-bg-secondary)",
                            borderRadius: 6,
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <strong style={{ fontSize: "0.85rem" }}>@{task.role}</strong>
                              <span className="text-sm text-muted" style={{ marginLeft: 8 }}>
                                attempt {task.attempts}/{task.maxAttempts}
                              </span>
                              {task.status === "running" && (
                                <span
                                  style={{
                                    marginLeft: 8,
                                    color: "var(--color-warning)",
                                    fontSize: "0.8rem",
                                  }}
                                >
                                  &#8987; working...
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <StatusBadge status={task.status} />
                              {task.status === "failed" && (
                                <button
                                  type="button"
                                  className="btn"
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    handleRetryTask(task.id);
                                  }}
                                  disabled={retryingTaskId === task.id}
                                  style={{
                                    background: "var(--color-warning)",
                                    color: "var(--color-text)",
                                    border: "none",
                                    padding: "2px 10px",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                  }}
                                >
                                  {retryingTaskId === task.id ? "Retrying..." : "Retry"}
                                </button>
                              )}
                            </div>
                          </div>

                          <p
                            className="text-sm"
                            style={{ margin: "6px 0 0", color: "var(--color-text-muted)" }}
                          >
                            {task.prompt.length > 150
                              ? `${task.prompt.slice(0, 150)}...`
                              : task.prompt}
                          </p>

                          {task.error && (
                            <div
                              style={{
                                marginTop: 6,
                                padding: "6px 10px",
                                background: "var(--color-status-red-bg)",
                                borderRadius: 4,
                                fontSize: "0.8rem",
                                color: "var(--color-status-red-text)",
                              }}
                            >
                              {task.error}
                            </div>
                          )}

                          {task.filesModified.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <span className="text-sm" style={{ fontWeight: 500 }}>
                                Files ({task.filesModified.length}):
                              </span>
                              <div style={{ marginTop: 4 }}>
                                {task.filesModified.map((f) => (
                                  <code
                                    key={f}
                                    style={{
                                      display: "block",
                                      fontSize: "0.75rem",
                                      color: "var(--color-success)",
                                      padding: "1px 0",
                                    }}
                                  >
                                    + {f}
                                  </code>
                                ))}
                              </div>
                            </div>
                          )}

                          {task.output && (
                            <div style={{ marginTop: 8 }}>
                              <button
                                type="button"
                                className="text-sm"
                                style={{
                                  background: "none",
                                  border: "1px solid var(--color-border)",
                                  borderRadius: 4,
                                  padding: "2px 10px",
                                  cursor: "pointer",
                                  color: "var(--color-primary)",
                                  fontSize: "0.75rem",
                                }}
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  setExpandedTaskOutput(
                                    expandedTaskOutput === task.id ? null : task.id,
                                  );
                                }}
                              >
                                {expandedTaskOutput === task.id ? "Hide output" : "Show output"}
                              </button>
                              {expandedTaskOutput === task.id && (
                                <pre
                                  style={{
                                    marginTop: 6,
                                    padding: "0.75rem",
                                    background: "#1e1e1e",
                                    color: "#d4d4d4",
                                    borderRadius: 6,
                                    fontSize: "0.7rem",
                                    lineHeight: 1.5,
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                    maxHeight: 400,
                                    overflow: "auto",
                                  }}
                                >
                                  {task.output}
                                </pre>
                              )}
                            </div>
                          )}

                          <div
                            className="text-sm text-muted"
                            style={{ marginTop: 6, fontSize: "0.7rem" }}
                          >
                            Created {timeAgo(task.createdAt)}
                            {task.status === "completed" &&
                              task.updatedAt &&
                              ` · Finished ${timeAgo(task.updatedAt)}`}
                            {task.costUsd != null &&
                              Number(task.costUsd) > 0 &&
                              ` · $${Number(task.costUsd).toFixed(4)}`}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* Escalations */}
      <EscalationBanner projectId={projectId} />

      {/* Artifacts */}
      <ArtifactList projectId={projectId} />

      {/* Activity Log */}
      <AuditTimeline projectId={projectId} />

      <ConfirmModal
        isOpen={confirmAction === "stop"}
        onClose={() => setConfirmAction(null)}
        onConfirm={executeStop}
        title="Stop Project"
        message="All running agents will be cancelled."
        confirmText="Stop"
        variant="danger"
      />

      <ConfirmModal
        isOpen={confirmAction === "archive"}
        onClose={() => setConfirmAction(null)}
        onConfirm={executeArchive}
        title="Archive Project"
        message="It will be hidden from the main list."
        confirmText="Archive"
      />

      <ConfirmModal
        isOpen={confirmAction === "delete"}
        onClose={() => setConfirmAction(null)}
        onConfirm={executeDelete}
        title="Delete Project"
        message="This will permanently delete the project, all workstreams, and tasks. This cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      {selectedFile && (
        <FileViewer
          projectId={projectId}
          filePath={selectedFile}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </div>
  );
}
