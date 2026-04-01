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
import { FeatureModal } from "../../../components/board/FeatureModal";
import { ConfirmModal } from "../../../components/ui/ConfirmModal";
import { ProgressBar } from "../../../components/ui/ProgressBar";
import { SkeletonProjectDetail } from "../../../components/ui/SkeletonProjectDetail";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useToastContext } from "../../../components/ui/ToastProvider";
import { usePolling } from "../../../hooks/usePolling";
import { useSSE } from "../../../hooks/useSSE";
import {
  type AgentTask,
  type AgentDefinition,
  type Feature,
  type Project,
  type Workspace,
  type Workstream,
  api,
  getErrorDetails,
  getErrorMessage,
} from "../../../lib/api";
import { getProviderStyle, timeAgo } from "../../../lib/utils";
import { buildBoardHref, buildWorkspaceHref } from "../../../lib/workspaceNavigation";

const DependencyGraph = dynamic(
  () => import("../../../components/DependencyGraph").then((m) => m.DependencyGraph),
  { ssr: false, loading: () => <div className="dependency-graph-loading">Loading graph...</div> },
);

const PROVIDER_LABELS: Record<string, string> = {
  claude: "Claude Code",
  opencode: "OpenCode",
};

function summarizeTaskPrompt(prompt: string) {
  return prompt.length > 180 ? `${prompt.slice(0, 180)}...` : prompt;
}

function summarizeTaskOutput(output: string) {
  const normalized = output.trim();
  if (!normalized) return "No output captured.";
  return normalized.length > 240 ? `${normalized.slice(0, 240)}...` : normalized;
}

function getTaskStateCopy(task: AgentTask) {
  switch (task.status) {
    case "completed":
      return task.output
        ? "Output captured and ready for review."
        : "Completed without a stored output payload.";
    case "failed":
      return "This task needs review before the workstream can move forward cleanly.";
    case "running":
      return "The assigned agent is currently working on this task.";
    case "queued":
      return "Queued and waiting for the workstream to reach this step.";
    default:
      return "Task state updated.";
  }
}

function getStageSummary(project: Project, runningTaskCount: number) {
  switch (project.status) {
    case "draft":
      return {
        title: "Ready to plan",
        description:
          "The brief is saved. Architecture and workstreams have not been generated yet.",
        nextStep: "Review provider and repo context, then start planning.",
      };
    case "planning":
      return {
        title: "Architecture in progress",
        description:
          "The architect agent is turning the goal into workstreams, dependencies, and execution structure.",
        nextStep: "Stay on this page. It updates automatically when planning finishes.",
      };
    case "in_progress":
      return {
        title: "Execution running",
        description:
          runningTaskCount > 0
            ? `${runningTaskCount} task${runningTaskCount === 1 ? "" : "s"} currently executing across active workstreams.`
            : "Workstreams are active and the page will refresh as tasks move forward.",
        nextStep: "Watch failed tasks and escalations so you can unblock the run quickly.",
      };
    case "completed":
      return {
        title: "Execution complete",
        description:
          "All workstreams finished successfully and the generated output is ready for review.",
        nextStep: "Review artifacts, files, and audit history before archiving.",
      };
    case "failed":
      return {
        title: "Execution failed",
        description:
          "One or more tasks exhausted retries or hit a blocking condition. Review the failed workstream before retrying related work.",
        nextStep: "Inspect the failed tasks, output, and escalations to identify the real blocker.",
      };
    case "cancelled":
      return {
        title: "Execution stopped",
        description:
          "The run was cancelled before completion. Existing outputs remain available for inspection.",
        nextStep:
          "Archive the project if it is finished, or create a new project brief for another run.",
      };
    case "archived":
      return {
        title: "Archived record",
        description:
          "This project is no longer part of the active queue, but its execution history and output remain accessible.",
        nextStep: "Keep it for reference or delete it if the record is no longer needed.",
      };
  }
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const toast = useToastContext();

  const [project, setProject] = useState<Project | null>(null);
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const [tasksByWorkstream, setTasksByWorkstream] = useState<Record<string, AgentTask[]>>({});
  const [linkedFeature, setLinkedFeature] = useState<Feature | null>(null);
  const [issues, setIssues] = useState<Feature[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaceAgents, setWorkspaceAgents] = useState<AgentDefinition[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<{
    total: number;
    byWorkstream: { workstreamId: string; name: string; cost: number }[];
    byRole: { role: string; cost: number }[];
    taskCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadErrorDetails, setLoadErrorDetails] = useState<string | undefined>();
  const [actionError, setActionError] = useState<{ message: string; details?: string } | null>(
    null,
  );
  const [planning, setPlanning] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [retryingTaskId, setRetryingTaskId] = useState<string | null>(null);
  const [expandedWs, setExpandedWs] = useState<Set<string>>(new Set());
  const [expandedTaskOutput, setExpandedTaskOutput] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | "stop" | "archive" | "delete">(null);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [launchStatus, setLaunchStatus] = useState<{
    running: boolean;
    port?: number;
    url?: string;
    status?: string;
    logs?: string[];
  } | null>(null);
  const [launching, setLaunching] = useState(false);
  const [stoppingLaunch, setStoppingLaunch] = useState(false);

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

      api.projects
        .issues(projectId, 100, 0)
        .then((result) => setIssues(result.data))
        .catch(() => setIssues([]));

      // Fetch workspace info for breadcrumbs
      if (proj.workspaceId) {
        Promise.all([api.workspaces.get(proj.workspaceId), api.workspaces.agents(proj.workspaceId)])
          .then(([workspaceRes, agentsRes]) => {
            setWorkspace(workspaceRes.workspace);
            setWorkspaceAgents(agentsRes.agents);
          })
          .catch(() => {});
      }

      // Fetch cost breakdown
      api.projects
        .costs(projectId)
        .then((data) => setCostBreakdown(data))
        .catch(() => {});

      setLoadError(null);
      setLoadErrorDetails(undefined);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to load project"));
      setLoadErrorDetails(getErrorDetails(err));
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
    setActionError(null);
    try {
      const result = await api.projects.plan(projectId);
      setProject(result.project);
      setWorkstreams(result.workstreams);
      toast.success({
        title: "Planning started",
        message: "Architecture analysis and workstream generation are now running.",
      });
    } catch (err) {
      setActionError({
        message: getErrorMessage(err, "Failed to start planning"),
        details: getErrorDetails(err),
      });
    } finally {
      setPlanning(false);
    }
  }

  async function executeStop() {
    setStopping(true);
    setActionError(null);
    try {
      const result = await api.projects.stop(projectId);
      setProject(result.project);
      setConfirmAction(null);
      toast.success("Project stopped");
    } catch (err) {
      setActionError({
        message: getErrorMessage(err, "Failed to stop project"),
        details: getErrorDetails(err),
      });
    } finally {
      setStopping(false);
    }
  }

  async function executeArchive() {
    setArchiving(true);
    setActionError(null);
    try {
      const result = await api.projects.archive(projectId);
      setProject(result.project);
      setConfirmAction(null);
      toast.success("Project archived");
    } catch (err) {
      setActionError({
        message: getErrorMessage(err, "Failed to archive project"),
        details: getErrorDetails(err),
      });
    } finally {
      setArchiving(false);
    }
  }

  async function executeDelete() {
    setDeleting(true);
    setActionError(null);
    try {
      await api.projects.delete(projectId);
      toast.success("Project deleted");
      router.push(buildWorkspaceHref(project?.workspaceId));
    } catch (err) {
      const message = getErrorMessage(err, "Failed to delete project");
      const details = getErrorDetails(err);
      setActionError({ message, details });
      toast.error({ title: "Delete failed", message, details });
      setDeleting(false);
    }
  }

  async function handleIssueSave(data: {
    workspaceId?: string;
    title: string;
    description?: string;
    type: string;
    priority: number;
    status?: string;
    sourceProjectId?: string | null;
    assigneeMode?: "orchestrator" | "agent";
    assigneeAgentDefinitionId?: string | null;
  }) {
    if (!project?.workspaceId) {
      toast.error("Workspace is required");
      return;
    }

    try {
      await api.features.create({
        workspaceId: project.workspaceId,
        title: data.title,
        description: data.description,
        type: data.type,
        priority: data.priority,
        sourceProjectId: projectId,
        assigneeMode: data.assigneeMode,
        assigneeAgentDefinitionId: data.assigneeAgentDefinitionId,
      });
      toast.success("Issue created on board");
      setIssueModalOpen(false);
      const issueResult = await api.projects.issues(projectId, 100, 0);
      setIssues(issueResult.data);
    } catch (err) {
      toast.error({
        title: "Couldn't create issue",
        message: getErrorMessage(err, "Failed to create issue"),
        details: getErrorDetails(err),
      });
      throw err;
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
      toast.error({
        title: "Retry failed",
        message: getErrorMessage(err, "Failed to retry task"),
        details: getErrorDetails(err),
      });
    } finally {
      setRetryingTaskId(null);
    }
  }

  async function handleProviderChange(newProvider: string) {
    setActionError(null);
    try {
      const result = await api.projects.update(projectId, { provider: newProvider });
      setProject(result.project);
      toast.success(`Provider changed to ${PROVIDER_LABELS[newProvider] ?? newProvider}`);
    } catch (err) {
      setActionError({
        message: getErrorMessage(err, "Failed to change provider"),
        details: getErrorDetails(err),
      });
    }
  }

  // Check launch status on mount and when project is completed
  useEffect(() => {
    if (project?.status === "completed") {
      api.launch
        .status(projectId)
        .then(setLaunchStatus)
        .catch(() => {});
    }
  }, [project?.status, projectId]);

  async function handleLaunch() {
    setLaunching(true);
    setActionError(null);
    try {
      const result = await api.launch.start(projectId);
      setLaunchStatus({ running: true, port: result.port, url: result.url, status: result.status });
      toast.success({
        title: "Project launched",
        message: `Running at ${result.url}`,
      });
      // Poll status to detect when it's ready
      const interval = setInterval(async () => {
        try {
          const status = await api.launch.status(projectId);
          setLaunchStatus(status);
          if (status.status === "running" || status.status === "failed" || !status.running) {
            clearInterval(interval);
          }
        } catch {
          clearInterval(interval);
        }
      }, 2000);
    } catch (err) {
      setActionError({
        message: getErrorMessage(err, "Failed to launch project"),
        details: getErrorDetails(err),
      });
    } finally {
      setLaunching(false);
    }
  }

  async function handleStopLaunch() {
    setStoppingLaunch(true);
    try {
      await api.launch.stop(projectId);
      setLaunchStatus(null);
      toast.success("Project stopped");
    } catch (err) {
      toast.error({
        title: "Stop failed",
        message: getErrorMessage(err, "Failed to stop launched project"),
      });
    } finally {
      setStoppingLaunch(false);
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
          toast.error({
            title: "Task load failed",
            message: getErrorMessage(err, "Failed to load tasks"),
            details: getErrorDetails(err),
          });
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
  if (loadError)
    return (
      <div className="project-load-error">
        <div className="error-banner" role="alert">
          <strong>Project page failed to load</strong>
          <div>{loadError}</div>
          {loadErrorDetails && <pre className="error-banner-details">{loadErrorDetails}</pre>}
        </div>
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
  const boardHref = buildBoardHref(project.workspaceId);
  const workspaceHref = buildWorkspaceHref(project.workspaceId);
  const agentNameById = Object.fromEntries(workspaceAgents.map((agent) => [agent.id, agent.name]));
  const boardIssuesHref = `${boardHref}${boardHref.includes("?") ? "&" : "?"}type=bug&projectId=${projectId}`;

  const completedWs = workstreams.filter((ws) => ws.status === "completed").length;
  const activeWs = workstreams.filter((ws) => ws.status === "in_progress").length;
  const failedWs = workstreams.filter((ws) => ws.status === "failed").length;
  const allTasks = Object.values(tasksByWorkstream).flat();
  const runningTasks = allTasks.filter((t) => t.status === "running");
  const totalTaskCount = allTasks.length;
  const deliverableCount = workstreams.reduce((count, ws) => count + ws.deliverables.length, 0);
  const stageSummary = getStageSummary(project, runningTasks.length);

  // Build cost lookup by workstream
  const costByWorkstream: Record<string, number> = {};
  if (costBreakdown) {
    for (const entry of costBreakdown.byWorkstream) {
      costByWorkstream[entry.workstreamId] = entry.cost;
    }
  }

  return (
    <div className="project-shell">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Workspaces", href: "/workspaces" },
          ...(workspace ? [{ label: workspace.name, href: `/workspaces/${workspace.id}` }] : []),
          { label: project.name },
        ]}
      />

      <div className="project-hero">
        <div className="project-hero-copy">
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>{project.name}</h2>
            <StatusBadge status={project.status} />
          </div>
          <p className="text-muted project-hero-goal">{project.goal}</p>
          <div className="project-hero-meta">
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
            <span className="project-meta-pill">
              {project.projectMode === "existing" ? "Existing repo" : "Greenfield"}
            </span>
            {costBreakdown && costBreakdown.total > 0 && (
              <span className="project-meta-pill">${costBreakdown.total.toFixed(4)} spent</span>
            )}
            <span className="project-meta-pill">Created {timeAgo(project.createdAt)}</span>
            {project.updatedAt !== project.createdAt && (
              <span className="project-meta-pill">Updated {timeAgo(project.updatedAt)}</span>
            )}
          </div>
        </div>

        <div className="project-hero-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setIssueModalOpen(true)}>
            Report Issue
          </button>

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
              className="btn btn-danger"
              onClick={() => setConfirmAction("stop")}
              disabled={stopping}
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
              className="btn btn-danger"
              onClick={() => setConfirmAction("delete")}
              disabled={deleting}
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
      </div>

      {linkedFeature && (
        <p className="text-sm project-source-link">
          Created from feature:{" "}
          <Link href={boardHref} style={{ color: "var(--color-primary)" }}>
            {linkedFeature.title}
          </Link>
        </p>
      )}

      <section className="card" style={{ marginBottom: "1rem" }}>
        <div className="flex justify-between items-center" style={{ gap: "0.75rem", flexWrap: "wrap" }}>
          <div>
            <p className="project-card-eyebrow">Issue Tickets</p>
            <h3 style={{ margin: 0 }}>Reported from this project</h3>
          </div>
          <Link href={boardIssuesHref} className="btn btn-secondary">
            Open Issues On Board
          </Link>
        </div>
        {issues.length === 0 ? (
          <p className="text-sm text-muted" style={{ marginTop: "0.75rem" }}>
            No issue tickets yet. Use `Report Issue` when you spot a bug in this run.
          </p>
        ) : (
          <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.5rem" }}>
            {issues.map((issue) => (
              <div
                key={issue.id}
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius)",
                  padding: "0.65rem 0.75rem",
                  background: "var(--color-bg)",
                }}
              >
                <div className="flex justify-between items-center" style={{ gap: "0.75rem", flexWrap: "wrap" }}>
                  <strong>{issue.title}</strong>
                  <StatusBadge status={issue.status} />
                </div>
                <p className="text-sm text-muted" style={{ margin: "0.35rem 0 0" }}>
                  Assignee:{" "}
                  {issue.assigneeMode === "orchestrator"
                    ? "Main orchestrator"
                    : agentNameById[issue.assigneeAgentDefinitionId ?? ""] || "Assigned agent"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {actionError && (
        <div className="error-banner" role="alert">
          <strong>Project action failed</strong>
          <div>{actionError.message}</div>
          {actionError.details && <pre className="error-banner-details">{actionError.details}</pre>}
        </div>
      )}

      <section className="project-meta-grid">
        <div className="card project-stage-card">
          <p className="project-card-eyebrow">Current stage</p>
          <h3>{stageSummary.title}</h3>
          <p>{stageSummary.description}</p>
          <div className="project-stage-next">
            <strong>Next step</strong>
            <span>{stageSummary.nextStep}</span>
          </div>
          <div className="project-stage-actions">
            <Link href={boardHref} className="btn btn-secondary">
              Open Workspace Board
            </Link>
            <Link href={workspaceHref} className="btn btn-secondary">
              Open Workspace
            </Link>
          </div>
        </div>

        <div className="card project-meta-card">
          <p className="project-card-eyebrow">Source and context</p>
          <ul className="project-meta-list">
            <li>
              <span>Workspace</span>
              <strong>{workspace?.name ?? "Loading workspace..."}</strong>
            </li>
            <li>
              <span>Mode</span>
              <strong>
                {project.projectMode === "existing" ? "Existing repository" : "Greenfield"}
              </strong>
            </li>
            <li>
              <span>Repository</span>
              <strong>
                {project.repoUrl ? (
                  <a href={project.repoUrl} target="_blank" rel="noreferrer">
                    {project.repoUrl}
                  </a>
                ) : (
                  "Not attached"
                )}
              </strong>
            </li>
            {project.repoPath && (
              <li>
                <span>Repo path</span>
                <code>{project.repoPath}</code>
              </li>
            )}
            {project.workBranch && (
              <li>
                <span>Working branch</span>
                <code>{project.workBranch}</code>
              </li>
            )}
          </ul>
        </div>

        <div className="card project-meta-card">
          <p className="project-card-eyebrow">Execution overview</p>
          <div className="project-kpi-grid">
            <div>
              <strong>{workstreams.length}</strong>
              <span>Workstreams</span>
            </div>
            <div>
              <strong>{totalTaskCount}</strong>
              <span>Tasks loaded</span>
            </div>
            <div>
              <strong>{runningTasks.length}</strong>
              <span>Running tasks</span>
            </div>
            <div>
              <strong>{deliverableCount}</strong>
              <span>Deliverables</span>
            </div>
          </div>
        </div>
      </section>

      {workstreams.length === 0 && project.status === "draft" && (
        <div className="card project-empty-state">
          <strong>No workstreams yet</strong>
          <p className="text-sm text-muted">
            This is still a saved brief. Start planning to generate architecture, workstreams,
            dependencies, and the first execution tasks.
          </p>
        </div>
      )}

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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <strong>Project completed</strong>
              <p className="text-sm" style={{ margin: "4px 0 0" }}>
                All workstreams finished. Output files in{" "}
                <code>apps/orchestrator/projects/{project.id.slice(0, 8)}...</code>
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {launchStatus?.running ? (
                <>
                  <a
                    href={launchStatus.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                    style={{ textDecoration: "none" }}
                  >
                    Open {launchStatus.url}
                  </a>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleStopLaunch}
                    disabled={stoppingLaunch}
                  >
                    {stoppingLaunch ? "Stopping..." : "Stop"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleLaunch}
                  disabled={launching}
                >
                  {launching ? "Launching..." : "Launch Locally"}
                </button>
              )}
            </div>
          </div>
          {launchStatus?.running && launchStatus.logs && launchStatus.logs.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary className="text-sm" style={{ cursor: "pointer" }}>
                Server logs
              </summary>
              <pre
                style={{
                  marginTop: 4,
                  padding: 8,
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 4,
                  fontSize: "0.75rem",
                  maxHeight: 200,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {launchStatus.logs.join("")}
              </pre>
            </details>
          )}
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
                        <div key={task.id} className="project-task-card">
                          <div className="project-task-header">
                            <div>
                              <div className="project-task-role-row">
                                <strong className="project-task-role">@{task.role}</strong>
                                <span className="project-task-attempt">
                                  attempt {task.attempts}/{task.maxAttempts}
                                </span>
                                {task.status === "running" && (
                                  <span className="project-task-running">&#8987; working now</span>
                                )}
                              </div>
                              <p className="project-task-state">{getTaskStateCopy(task)}</p>
                            </div>
                            <div className="project-task-actions">
                              <StatusBadge status={task.status} />
                              {task.status === "failed" && (
                                <button
                                  type="button"
                                  className="btn project-task-retry"
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    handleRetryTask(task.id);
                                  }}
                                  disabled={retryingTaskId === task.id}
                                >
                                  {retryingTaskId === task.id ? "Retrying..." : "Retry"}
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="project-task-section">
                            <span className="project-task-section-label">Task brief</span>
                            <p className="project-task-prompt">
                              {summarizeTaskPrompt(task.prompt)}
                            </p>
                          </div>

                          {task.error && (
                            <div className="project-task-error" role="alert">
                              <strong>Failure detail</strong>
                              <div>{task.error}</div>
                            </div>
                          )}

                          {task.filesModified.length > 0 && (
                            <div className="project-task-section">
                              <span className="project-task-section-label">
                                Files touched ({task.filesModified.length})
                              </span>
                              <div className="project-task-files">
                                {task.filesModified.map((file) => (
                                  <code key={file} className="project-task-file">
                                    {file}
                                  </code>
                                ))}
                              </div>
                            </div>
                          )}

                          {task.output && (
                            <div className="project-task-section">
                              <div className="project-task-output-summary">
                                <div>
                                  <span className="project-task-section-label">Agent output</span>
                                  <p className="project-task-output-preview">
                                    {summarizeTaskOutput(task.output)}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  className="project-task-output-toggle"
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    setExpandedTaskOutput(
                                      expandedTaskOutput === task.id ? null : task.id,
                                    );
                                  }}
                                >
                                  {expandedTaskOutput === task.id
                                    ? "Hide full output"
                                    : "Review full output"}
                                </button>
                              </div>
                              {expandedTaskOutput === task.id && (
                                <pre className="project-task-output">{task.output}</pre>
                              )}
                            </div>
                          )}

                          <div className="project-task-meta">
                            <span>Created {timeAgo(task.createdAt)}</span>
                            {task.status === "completed" && task.updatedAt && (
                              <span>Finished {timeAgo(task.updatedAt)}</span>
                            )}
                            {task.costUsd != null && Number(task.costUsd) > 0 && (
                              <span>${Number(task.costUsd).toFixed(4)}</span>
                            )}
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

      <FeatureModal
        isOpen={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        onSave={handleIssueSave}
        feature={null}
        workspaces={workspace ? [workspace] : []}
        agents={workspaceAgents}
        projects={project ? [{ id: project.id, name: project.name, status: project.status }] : []}
        defaultWorkspaceId={project.workspaceId}
        defaultType="bug"
        defaultSourceProjectId={projectId}
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
