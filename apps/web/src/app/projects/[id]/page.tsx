"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, type Project, type Workstream, type AgentTask } from "../../../lib/api";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { usePolling } from "../../../hooks/usePolling";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const [tasksByWorkstream, setTasksByWorkstream] = useState<
    Record<string, AgentTask[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planning, setPlanning] = useState(false);
  const [expandedWs, setExpandedWs] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [projectRes, wsRes] = await Promise.all([
        api.projects.get(projectId),
        api.projects.workstreams(projectId),
      ]);
      setProject(projectRes.project);
      setWorkstreams(wsRes.workstreams);
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

  // Poll when project is active
  const isActive =
    project && ["planning", "in_progress"].includes(project.status);
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

  async function toggleTasks(wsId: string) {
    if (expandedWs === wsId) {
      setExpandedWs(null);
      return;
    }
    setExpandedWs(wsId);
    if (!tasksByWorkstream[wsId]) {
      const res = await api.workstreams.tasks(wsId);
      setTasksByWorkstream((prev) => ({ ...prev, [wsId]: res.tasks }));
    }
  }

  if (loading) return <p className="text-muted">Loading project...</p>;
  if (error) return <p style={{ color: "#721c24" }}>Error: {error}</p>;
  if (!project) return <p>Project not found.</p>;

  return (
    <div>
      <button
        className="btn btn-secondary"
        onClick={() => router.push("/")}
        style={{ marginBottom: "1rem" }}
      >
        Back
      </button>

      <div className="flex justify-between items-center mb-2">
        <h2 style={{ margin: 0 }}>{project.name}</h2>
        <StatusBadge status={project.status} />
      </div>

      <p className="text-muted mb-2">{project.goal}</p>

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

      {project.architecture && (
        <details className="mb-2">
          <summary style={{ cursor: "pointer", fontWeight: 500 }}>
            Architecture
          </summary>
          <pre
            style={{
              background: "#f5f5f5",
              padding: "1rem",
              borderRadius: 8,
              overflow: "auto",
              fontSize: "0.8rem",
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
          >
            {project.architecture}
          </pre>
        </details>
      )}

      {workstreams.length > 0 && (
        <>
          <h3>Workstreams ({workstreams.length})</h3>
          {workstreams.map((ws) => (
            <div key={ws.id} className="card">
              <div
                className="flex justify-between items-center"
                style={{ cursor: "pointer" }}
                onClick={() => toggleTasks(ws.id)}
              >
                <div>
                  <strong>{ws.name}</strong>
                  {ws.assignedAgent && (
                    <span className="text-sm text-muted" style={{ marginLeft: 8 }}>
                      @{ws.assignedAgent}
                    </span>
                  )}
                </div>
                <StatusBadge status={ws.status} />
              </div>
              <p className="text-sm text-muted" style={{ margin: "0.5rem 0 0" }}>
                {ws.objective}
              </p>

              {expandedWs === ws.id && tasksByWorkstream[ws.id] && (() => {
                const tasks = tasksByWorkstream[ws.id]!;
                return (
                <div style={{ marginTop: "1rem", paddingLeft: "1rem", borderLeft: "2px solid #e0e0e0" }}>
                  <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem" }}>
                    Tasks ({tasks.length})
                  </h4>
                  {tasks.length === 0 ? (
                    <p className="text-sm text-muted">No tasks yet.</p>
                  ) : (
                    tasks.map((task) => (
                      <div
                        key={task.id}
                        style={{
                          padding: "0.5rem 0",
                          borderBottom: "1px solid #f0f0f0",
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm">
                            <strong>{task.role}</strong> agent
                            {task.attempts > 0 &&
                              ` (attempt ${task.attempts}/${task.maxAttempts})`}
                          </span>
                          <StatusBadge status={task.status} />
                        </div>
                        {task.error && (
                          <p
                            className="text-sm"
                            style={{ color: "#721c24", margin: "4px 0 0" }}
                          >
                            {task.error}
                          </p>
                        )}
                        {task.filesModified.length > 0 && (
                          <p className="text-sm text-muted" style={{ margin: "4px 0 0" }}>
                            Files: {task.filesModified.join(", ")}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
                );
              })()}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
