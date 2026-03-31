"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type Workspace, api } from "../../../lib/api";

type ProjectMode = "greenfield" | "existing";

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

  useEffect(() => {
    api.workspaces.list(100, 0).then(({ data: ws }) => {
      setWorkspaces(ws);
      if (ws.length === 1 && ws[0]) setWorkspaceId(ws[0].id);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !goal.trim() || !workspaceId) return;

    setSubmitting(true);
    setError(null);

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
      setError(err instanceof Error ? err.message : "Failed to create project");
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h2>New Project</h2>

      {/* Mode Toggle */}
      <div className="mb-2" style={{ display: "flex", gap: "0.5rem" }}>
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

      <p className="text-muted mb-2">
        {projectMode === "greenfield"
          ? "Describe what you want to build. The architect agent will design the system and create parallel workstreams for implementation."
          : "Link an existing repository. The architect agent will analyze the codebase and plan changes to achieve your goal."}
      </p>

      {workspaces.length === 0 && (
        <div className="card mb-2" style={{ textAlign: "center", padding: "2rem" }}>
          <p className="text-muted mb-2">No workspaces yet. Create a workspace first.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => router.push("/workspaces")}
          >
            Create Workspace
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-2">
          <label htmlFor="workspace" style={{ display: "block", fontWeight: 500, marginBottom: 4 }}>
            Workspace
          </label>
          <select
            id="workspace"
            className="input"
            value={workspaceId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setWorkspaceId(e.target.value)}
            required
            style={{ width: "100%", padding: "0.5rem" }}
          >
            <option value="">Select workspace...</option>
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-2">
          <label htmlFor="name" style={{ display: "block", fontWeight: 500, marginBottom: 4 }}>
            Project Name
          </label>
          <input
            id="name"
            className="input"
            type="text"
            placeholder="e.g., E-Commerce Platform"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            required
            maxLength={200}
          />
        </div>

        {projectMode === "existing" && (
          <>
            <div className="mb-2">
              <label
                htmlFor="repoUrl"
                style={{ display: "block", fontWeight: 500, marginBottom: 4 }}
              >
                Repository URL
              </label>
              <input
                id="repoUrl"
                className="input"
                type="text"
                placeholder="https://github.com/user/repo.git"
                value={repoUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRepoUrl(e.target.value)}
              />
              <p className="text-sm text-muted" style={{ marginTop: 4 }}>
                Git URL to clone. Leave empty if using a local path.
              </p>
            </div>

            <div className="mb-2">
              <label
                htmlFor="repoPath"
                style={{ display: "block", fontWeight: 500, marginBottom: 4 }}
              >
                Local Path
              </label>
              <input
                id="repoPath"
                className="input"
                type="text"
                placeholder="/path/to/existing/project"
                value={repoPath}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRepoPath(e.target.value)}
              />
              <p className="text-sm text-muted" style={{ marginTop: 4 }}>
                Absolute path to a local repo. Takes priority if both are set.
              </p>
            </div>
          </>
        )}

        <div className="mb-2">
          <label htmlFor="goal" style={{ display: "block", fontWeight: 500, marginBottom: 4 }}>
            {projectMode === "greenfield" ? "Goal" : "What changes do you want to make?"}
          </label>
          <textarea
            id="goal"
            className="textarea"
            placeholder={
              projectMode === "greenfield"
                ? "Describe the software you want built. Be specific about features, tech requirements, and constraints."
                : "Describe the changes, features, or improvements you want. The agents will analyze the existing code first."
            }
            value={goal}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setGoal(e.target.value)}
            required
            maxLength={5000}
            rows={6}
          />
          <p className="text-sm text-muted" style={{ marginTop: 4 }}>
            {goal.length}/5000
          </p>
        </div>

        <div className="mb-2">
          <label htmlFor="provider" style={{ display: "block", fontWeight: 500, marginBottom: 4 }}>
            AI Provider
          </label>
          <select
            id="provider"
            className="input"
            value={provider}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setProvider(e.target.value as "claude" | "opencode")
            }
            style={{ width: "100%", padding: "0.5rem" }}
          >
            <option value="opencode">OpenCode</option>
            <option value="claude">Claude Code</option>
          </select>
        </div>

        {error && <p style={{ color: "var(--color-danger)", marginBottom: "1rem" }}>{error}</p>}

        <div className="flex gap-1">
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
  );
}
