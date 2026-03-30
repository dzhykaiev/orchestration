"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, type Project, type Workstream, type AgentTask } from "../../../lib/api";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { usePolling } from "../../../hooks/usePolling";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "#e0e0e0", borderRadius: 3 }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: pct === 100 ? "#28a745" : "#0066cc",
            borderRadius: 3,
            transition: "width 0.3s",
          }}
        />
      </div>
      <span className="text-sm text-muted">{completed}/{total}</span>
    </div>
  );
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const [tasksByWorkstream, setTasksByWorkstream] = useState<Record<string, AgentTask[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planning, setPlanning] = useState(false);
  const [expandedWs, setExpandedWs] = useState<Set<string>>(new Set());
  const [expandedTaskOutput, setExpandedTaskOutput] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [projectRes, wsRes] = await Promise.all([
        api.projects.get(projectId),
        api.projects.workstreams(projectId),
      ]);
      setProject(projectRes.project);
      setWorkstreams(wsRes.workstreams);

      // Auto-fetch tasks for active workstreams
      for (const ws of wsRes.workstreams) {
        if (["in_progress", "completed", "failed"].includes(ws.status)) {
          const res = await api.workstreams.tasks(ws.id);
          setTasksByWorkstream((prev) => ({ ...prev, [ws.id]: res.tasks }));
        }
      }

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
  usePolling(fetchData, 3000, !!isActive);

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

  function toggleWs(wsId: string) {
    setExpandedWs((prev) => {
      const next = new Set(prev);
      if (next.has(wsId)) next.delete(wsId);
      else next.add(wsId);
      return next;
    });
    if (!tasksByWorkstream[wsId]) {
      api.workstreams.tasks(wsId).then((res) => {
        setTasksByWorkstream((prev) => ({ ...prev, [wsId]: res.tasks }));
      });
    }
  }

  if (loading) return <p className="text-muted">Loading project...</p>;
  if (error) return <p style={{ color: "#721c24" }}>Error: {error}</p>;
  if (!project) return <p>Project not found.</p>;

  // Summary stats
  const completedWs = workstreams.filter((ws) => ws.status === "completed").length;
  const activeWs = workstreams.filter((ws) => ws.status === "in_progress").length;
  const failedWs = workstreams.filter((ws) => ws.status === "failed").length;
  const allTasks = Object.values(tasksByWorkstream).flat();
  const runningTasks = allTasks.filter((t) => t.status === "running");

  return (
    <div>
      <button className="btn btn-secondary" onClick={() => router.push("/")} style={{ marginBottom: "1rem" }}>
        Back
      </button>

      {/* Header */}
      <div className="flex justify-between items-center mb-1">
        <h2 style={{ margin: 0 }}>{project.name}</h2>
        <StatusBadge status={project.status} />
      </div>
      <p className="text-muted" style={{ margin: "0 0 1rem" }}>{project.goal}</p>

      {/* Action buttons */}
      {project.status === "draft" && (
        <button
          className="btn btn-primary"
          onClick={handleStartPlanning}
          disabled={planning}
          style={{ marginBottom: "1.5rem" }}
        >
          {planning ? "Starting planning..." : "Start Planning"}
        </button>
      )}

      {/* Live status banner */}
      {project.status === "planning" && (
        <div className="card" style={{ background: "#cce5ff", borderColor: "#b8daff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1.2rem" }}>&#9881;</span>
            <strong>Architect agent is planning...</strong>
          </div>
          <p className="text-sm" style={{ margin: "4px 0 0" }}>
            Claude is analyzing the goal, designing architecture, and creating workstreams.
          </p>
        </div>
      )}

      {project.status === "in_progress" && runningTasks.length > 0 && (
        <div className="card" style={{ background: "#fff3cd", borderColor: "#ffeeba" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1.2rem" }}>&#9881;</span>
            <strong>{runningTasks.length} agent{runningTasks.length > 1 ? "s" : ""} working</strong>
          </div>
          <div style={{ marginTop: 8 }}>
            {runningTasks.map((t) => (
              <span
                key={t.id}
                className="text-sm"
                style={{
                  display: "inline-block",
                  background: "#fff",
                  border: "1px solid #ddd",
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
        <div className="card" style={{ background: "#d4edda", borderColor: "#c3e6cb" }}>
          <strong>Project completed</strong>
          <p className="text-sm" style={{ margin: "4px 0 0" }}>
            All workstreams finished. Output files in <code>output/{project.id.slice(0, 8)}...</code>
          </p>
        </div>
      )}

      {project.status === "failed" && (
        <div className="card" style={{ background: "#f8d7da", borderColor: "#f5c6cb" }}>
          <strong>Project failed</strong>
          <p className="text-sm" style={{ margin: "4px 0 0" }}>
            One or more workstreams failed after max retries.
          </p>
        </div>
      )}

      {/* Summary stats */}
      {workstreams.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.75rem", margin: "1rem 0" }}>
          <div className="card" style={{ textAlign: "center", padding: "0.75rem" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{workstreams.length}</div>
            <div className="text-sm text-muted">Workstreams</div>
          </div>
          <div className="card" style={{ textAlign: "center", padding: "0.75rem" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#28a745" }}>{completedWs}</div>
            <div className="text-sm text-muted">Completed</div>
          </div>
          <div className="card" style={{ textAlign: "center", padding: "0.75rem" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#856404" }}>{activeWs}</div>
            <div className="text-sm text-muted">In Progress</div>
          </div>
          <div className="card" style={{ textAlign: "center", padding: "0.75rem" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: failedWs > 0 ? "#721c24" : "#666" }}>{failedWs}</div>
            <div className="text-sm text-muted">Failed</div>
          </div>
        </div>
      )}

      {/* Overall progress */}
      {workstreams.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div className="flex justify-between items-center mb-1">
            <span style={{ fontWeight: 500 }}>Overall Progress</span>
            <span className="text-sm text-muted">{Math.round((completedWs / workstreams.length) * 100)}%</span>
          </div>
          <ProgressBar completed={completedWs} total={workstreams.length} />
        </div>
      )}

      {/* Architecture */}
      {project.architecture && (
        <details className="mb-2" style={{ marginBottom: "1.5rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 500 }}>Architecture Document</summary>
          <pre
            style={{
              background: "#f5f5f5",
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
                className="card"
                style={{
                  borderLeft: `4px solid ${
                    ws.status === "completed" ? "#28a745" :
                    ws.status === "in_progress" ? "#ffc107" :
                    ws.status === "failed" ? "#dc3545" : "#dee2e6"
                  }`,
                }}
              >
                {/* Workstream header */}
                <div
                  className="flex justify-between items-center"
                  style={{ cursor: "pointer" }}
                  onClick={() => toggleWs(ws.id)}
                >
                  <div>
                    <span style={{ marginRight: 6, fontSize: "0.8rem" }}>{isExpanded ? "▼" : "▶"}</span>
                    <strong>{ws.name}</strong>
                    {ws.assignedAgent && (
                      <span
                        className="text-sm"
                        style={{
                          marginLeft: 8,
                          background: "#e8f4fd",
                          color: "#0066cc",
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

                <p className="text-sm text-muted" style={{ margin: "0.5rem 0 0" }}>{ws.objective}</p>

                {/* Task progress bar */}
                {tasks.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <ProgressBar completed={completedTasks} total={tasks.length} />
                  </div>
                )}

                {/* Deliverables */}
                {ws.deliverables.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
                    <span className="text-sm text-muted">Deliverables: </span>
                    {ws.deliverables.map((d, i) => (
                      <code key={i} className="text-sm" style={{ background: "#f0f0f0", padding: "1px 4px", borderRadius: 3, fontSize: "0.75rem" }}>
                        {d}
                      </code>
                    ))}
                  </div>
                )}

                {/* Dependencies */}
                {ws.dependencies.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    <span className="text-sm text-muted">
                      Depends on: {ws.dependencies.map((depId) => {
                        const dep = workstreams.find((w) => w.id === depId || w.name === depId);
                        return dep ? dep.name : depId.slice(0, 8);
                      }).join(", ")}
                    </span>
                  </div>
                )}

                {/* Expanded: task details */}
                {isExpanded && (
                  <div style={{ marginTop: "1rem", borderTop: "1px solid #eee", paddingTop: "0.75rem" }}>
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
                            background: "#fafafa",
                            borderRadius: 6,
                            border: "1px solid #eee",
                          }}
                        >
                          {/* Task header */}
                          <div className="flex justify-between items-center">
                            <div>
                              <strong style={{ fontSize: "0.85rem" }}>@{task.role}</strong>
                              <span className="text-sm text-muted" style={{ marginLeft: 8 }}>
                                attempt {task.attempts}/{task.maxAttempts}
                              </span>
                              {task.status === "running" && (
                                <span style={{ marginLeft: 8, color: "#856404", fontSize: "0.8rem" }}>
                                  &#8987; working...
                                </span>
                              )}
                            </div>
                            <StatusBadge status={task.status} />
                          </div>

                          {/* Task prompt preview */}
                          <p className="text-sm" style={{ margin: "6px 0 0", color: "#444" }}>
                            {task.prompt.length > 150 ? task.prompt.slice(0, 150) + "..." : task.prompt}
                          </p>

                          {/* Error */}
                          {task.error && (
                            <div style={{ marginTop: 6, padding: "6px 10px", background: "#f8d7da", borderRadius: 4, fontSize: "0.8rem", color: "#721c24" }}>
                              {task.error}
                            </div>
                          )}

                          {/* Files modified */}
                          {task.filesModified.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <span className="text-sm" style={{ fontWeight: 500 }}>
                                Files ({task.filesModified.length}):
                              </span>
                              <div style={{ marginTop: 4 }}>
                                {task.filesModified.map((f, i) => (
                                  <code
                                    key={i}
                                    style={{
                                      display: "block",
                                      fontSize: "0.75rem",
                                      color: "#28a745",
                                      padding: "1px 0",
                                    }}
                                  >
                                    + {f}
                                  </code>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Output toggle */}
                          {task.output && (
                            <div style={{ marginTop: 8 }}>
                              <button
                                className="text-sm"
                                style={{
                                  background: "none",
                                  border: "1px solid #ddd",
                                  borderRadius: 4,
                                  padding: "2px 10px",
                                  cursor: "pointer",
                                  color: "#0066cc",
                                  fontSize: "0.75rem",
                                }}
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  setExpandedTaskOutput(expandedTaskOutput === task.id ? null : task.id);
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
                                    maxWidth: "100%",
                                    overflow: "auto",
                                  }}
                                >
                                  {task.output}
                                </pre>
                              )}
                            </div>
                          )}

                          {/* Timestamps */}
                          <div className="text-sm text-muted" style={{ marginTop: 6, fontSize: "0.7rem" }}>
                            Created {timeAgo(task.createdAt)}
                            {task.status === "completed" && task.updatedAt && ` · Finished ${timeAgo(task.updatedAt)}`}
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
    </div>
  );
}
