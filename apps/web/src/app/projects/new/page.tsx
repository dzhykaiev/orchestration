"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import {
  type ApiFieldErrors,
  type Workspace,
  api,
  getErrorDetails,
  getErrorFieldErrors,
  getErrorMessage,
} from "../../../lib/api";

type ProjectMode = "greenfield" | "existing";

const GOAL_TEMPLATES: Record<ProjectMode, { label: string; value: string }[]> = {
  greenfield: [
    {
      label: "Internal tool",
      value:
        "Build an internal ops dashboard with authentication, task management, audit history, and role-based access. Use a modular monolith and prioritize a clean admin workflow.",
    },
    {
      label: "Customer-facing app",
      value:
        "Build a customer-facing SaaS app with onboarding, billing hooks, project management, notifications, and analytics. Prioritize fast activation and clear UX flows.",
    },
  ],
  existing: [
    {
      label: "Refactor flow",
      value:
        "Analyze the current codebase, identify the main architectural bottlenecks, and implement an incremental refactor plan for the project creation and execution flow.",
    },
    {
      label: "Improve UX",
      value:
        "Review the existing product from a UX and product design perspective, identify friction in the key user flows, and implement the highest-impact improvements without a rewrite.",
    },
  ],
};

function getFieldError(fieldErrors: ApiFieldErrors, field: string): string | undefined {
  return fieldErrors[field]?.[0];
}

export default function NewProjectPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [provider, setProvider] = useState<"claude" | "opencode">("opencode");
  const [projectMode, setProjectMode] = useState<ProjectMode>("greenfield");
  const [repoUrl, setRepoUrl] = useState("");
  const [repoPath, setRepoPath] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors>({});

  useEffect(() => {
    api.workspaces.list(100, 0).then(({ data: ws }) => {
      setWorkspaces(ws);
      if (ws.length === 1 && ws[0]) setWorkspaceId(ws[0].id);
    });
  }, []);

  const activeTemplates = useMemo(() => GOAL_TEMPLATES[projectMode], [projectMode]);
  const selectedWorkspace = workspaces.find((workspace) => workspace.id === workspaceId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !goal.trim() || !workspaceId) return;

    setSubmitting(true);
    setError(null);
    setErrorDetails(undefined);
    setFieldErrors({});

    try {
      const { project } = await api.projects.create({
        workspaceId,
        name: name.trim(),
        goal: goal.trim(),
        provider,
        projectMode,
        ...(projectMode === "existing" && repoUrl.trim() ? { repoUrl: repoUrl.trim() } : {}),
        ...(projectMode === "existing" && repoPath.trim() ? { repoPath: repoPath.trim() } : {}),
      });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create project"));
      setErrorDetails(getErrorDetails(err));
      setFieldErrors(getErrorFieldErrors(err));
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "New Project" }]} />

      <div className="ws-page-header">
        <div className="ws-page-header-row">
          <div>
            <h2 className="ws-page-title">New Project</h2>
            <p className="ws-page-subtitle">
              {projectMode === "greenfield"
                ? "Describe what you want to build. The architect agent will design the system and create parallel workstreams."
                : "Link an existing repository. The architect agent will analyze the codebase and plan changes."}
            </p>
          </div>
        </div>
      </div>

      {workspaces.length === 0 && (
        <div className="workspace-empty" style={{ marginBottom: "1.5rem" }}>
          <div className="workspace-empty-icon">
            <svg
              aria-hidden="true"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3 className="workspace-empty-title">No workspaces found</h3>
          <p className="workspace-empty-desc">
            Create a workspace first to organize your projects.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => router.push("/workspaces/new")}
          >
            Create Workspace
          </button>
        </div>
      )}

      <div className="project-create-layout">
        <div className="workspace-create-card">
          <div className="project-mode-switch">
            <button
              type="button"
              className={`btn ${projectMode === "greenfield" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setProjectMode("greenfield")}
            >
              New Project
            </button>
            <button
              type="button"
              className={`btn ${projectMode === "existing" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setProjectMode("existing")}
            >
              Link Existing Repo
            </button>
          </div>

          <div className="project-mode-note">
            {projectMode === "greenfield"
              ? "Use this when you want the system to start from a product goal and generate the architecture, workstreams, and implementation plan."
              : "Use this when you already have a repository and want the agents to inspect the current code before planning and implementing changes."}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="label" htmlFor="workspace">
                Workspace
              </label>
              <select
                id="workspace"
                className="input"
                value={workspaceId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  setWorkspaceId(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, workspaceId: [] }));
                }}
                required
              >
                <option value="">Select workspace...</option>
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
              {selectedWorkspace ? (
                <p className="field-hint">
                  This project will belong to <strong>{selectedWorkspace.name}</strong>.
                </p>
              ) : (
                <p className="field-hint">Pick the workspace that should own this project.</p>
              )}
              {getFieldError(fieldErrors, "workspaceId") && (
                <p className="field-error">{getFieldError(fieldErrors, "workspaceId")}</p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="name">
                Project Name
              </label>
              <input
                id="name"
                className="input"
                type="text"
                placeholder="e.g., E-Commerce Platform"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setName(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, name: [] }));
                }}
                required
                maxLength={200}
              />
              <p className="field-hint">
                Use a short name that the team will recognize in the dashboard.
              </p>
              {getFieldError(fieldErrors, "name") && (
                <p className="field-error">{getFieldError(fieldErrors, "name")}</p>
              )}
            </div>

            {projectMode === "existing" && (
              <>
                <div>
                  <label className="label" htmlFor="repoUrl">
                    Repository URL
                  </label>
                  <input
                    id="repoUrl"
                    className="input"
                    type="text"
                    placeholder="https://github.com/user/repo.git"
                    value={repoUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setRepoUrl(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, repoUrl: [] }));
                    }}
                  />
                  <p className="field-hint">Git URL to clone. Leave empty if using a local path.</p>
                  {getFieldError(fieldErrors, "repoUrl") && (
                    <p className="field-error">{getFieldError(fieldErrors, "repoUrl")}</p>
                  )}
                </div>

                <div>
                  <label className="label" htmlFor="repoPath">
                    Local Path
                  </label>
                  <input
                    id="repoPath"
                    className="input"
                    type="text"
                    placeholder="/path/to/existing/project"
                    value={repoPath}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setRepoPath(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, repoPath: [] }));
                    }}
                  />
                  <p className="field-hint">
                    Absolute path to a local repo. Takes priority if both are set.
                  </p>
                  {getFieldError(fieldErrors, "repoPath") && (
                    <p className="field-error">{getFieldError(fieldErrors, "repoPath")}</p>
                  )}
                </div>
              </>
            )}

            <div>
              <div className="project-field-row">
                <label className="label" htmlFor="goal">
                  {projectMode === "greenfield" ? "Goal" : "What changes do you want to make?"}
                </label>
                <div className="goal-template-list">
                  {activeTemplates.map((template) => (
                    <button
                      key={template.label}
                      type="button"
                      className="goal-template-chip"
                      onClick={() => setGoal(template.value)}
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                id="goal"
                className="textarea"
                placeholder={
                  projectMode === "greenfield"
                    ? "Describe the software you want built. Be specific about features, tech requirements, and constraints."
                    : "Describe the changes, features, or improvements you want. The agents will analyze the existing code first."
                }
                value={goal}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                  setGoal(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, goal: [] }));
                }}
                required
                maxLength={5000}
                rows={8}
              />
              <div className="field-meta-row">
                <p className="field-hint">
                  Focus on desired outcome, constraints, and any non-negotiable requirements.
                </p>
                <p className="text-sm text-muted">{goal.length}/5000</p>
              </div>
              {getFieldError(fieldErrors, "goal") && (
                <p className="field-error">{getFieldError(fieldErrors, "goal")}</p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="provider">
                AI Provider
              </label>
              <select
                id="provider"
                className="input"
                value={provider}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setProvider(e.target.value as "claude" | "opencode")
                }
              >
                <option value="opencode">OpenCode</option>
                <option value="claude">Claude Code</option>
              </select>
              <p className="field-hint">
                You can switch provider later while the project is still in draft or after a failed
                run.
              </p>
            </div>

            {error && (
              <div className="error-banner" role="alert">
                <strong>{error}</strong>
                {errorDetails && <pre className="error-banner-details">{errorDetails}</pre>}
              </div>
            )}

            <div className="flex gap-2" style={{ marginTop: "0.25rem" }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || !workspaceId || !name.trim() || !goal.trim()}
              >
                {submitting ? "Creating..." : "Create Project"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => router.push("/")}>
                Cancel
              </button>
            </div>
          </form>
        </div>

        <aside className="project-guide-card">
          <h3>What happens next</h3>
          <ol className="project-guide-list">
            <li>The project is created in draft inside the selected workspace.</li>
            <li>You start planning when the brief looks correct.</li>
            <li>The architect agent generates the architecture and workstreams.</li>
            <li>Implementation agents run in parallel once planning completes.</li>
          </ol>

          <div className="project-guide-divider" />

          <h4>Write a strong brief</h4>
          <ul className="project-checklist">
            <li>State the desired user outcome, not just the feature name.</li>
            <li>Include technical constraints, integrations, and deployment expectations.</li>
            <li>Call out what is out of scope to reduce wasted planning.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
