"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import { PageEmptyState, PageErrorState, PageLoadingState } from "../../../components/ui/PageStates";
import {
  type ApiFieldErrors,
  type Company,
  api,
  getErrorDetails,
  getErrorFieldErrors,
  getErrorMessage,
} from "../../../lib/api";
import { buildBoardHref } from "../../../lib/companyNavigation";

type ProjectMode = "greenfield" | "existing";
type ProviderOption = "claude" | "codex" | "opencode";

const PROVIDER_OPTIONS: Array<{
  value: ProviderOption;
  label: string;
  tagline: string;
  recommendedFor: string;
}> = [
  {
    value: "opencode",
    label: "OpenCode",
    tagline: "Fast default for most product and frontend iteration loops.",
    recommendedFor: "Recommended for day-to-day product execution and rapid retry cycles.",
  },
  {
    value: "claude",
    label: "Claude Code",
    tagline: "Useful when you want stronger long-context reasoning in planning-heavy tasks.",
    recommendedFor: "Good for architecture-heavy changes and larger codebase analysis.",
  },
  {
    value: "codex",
    label: "Codex",
    tagline: "Balanced option for agentic coding and implementation-heavy ticket execution.",
    recommendedFor: "Use when you want strong implementation throughput with structured planning.",
  },
];

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
  const searchParams = useSearchParams();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState("");
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [provider, setProvider] = useState<ProviderOption>("opencode");
  const [projectMode, setProjectMode] = useState<ProjectMode>("greenfield");
  const [repoUrl, setRepoUrl] = useState("");
  const [repoPath, setRepoPath] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors>({});
  const companyIdFromQuery = searchParams.get("companyId") || searchParams.get("workspaceId") || "";

  useEffect(() => {
    let active = true;

    async function loadCompanies() {
      setLoadingCompanies(true);
      setLoadError(null);

      try {
        const { data: list } = await api.companies.list(100, 0);
        if (!active) return;

        setCompanies(list);
        if (companyIdFromQuery) {
          const inList = list.some((company) => company.id === companyIdFromQuery);
          if (inList) {
            setCompanyId(companyIdFromQuery);
            return;
          }
        }

        if (list.length === 1 && list[0]) {
          setCompanyId(list[0].id);
        }
      } catch (error) {
        if (!active) return;
        setLoadError(getErrorMessage(error, "Failed to load companies"));
      } finally {
        if (active) {
          setLoadingCompanies(false);
        }
      }
    }

    void loadCompanies();

    return () => {
      active = false;
    };
  }, [companyIdFromQuery]);

  const activeTemplates = useMemo(() => GOAL_TEMPLATES[projectMode], [projectMode]);
  const selectedCompany = companies.find((company) => company.id === companyId);
  const selectedProvider = PROVIDER_OPTIONS.find((option) => option.value === provider);
  const boardHref = buildBoardHref(companyId);
  const cancelHref = companyId ? `/companies/${companyId}/projects` : "/companies";
  const repoSourceSummary =
    projectMode === "greenfield"
      ? "Not required for greenfield execution."
      : repoPath.trim()
        ? `Local path: ${repoPath.trim()}`
        : repoUrl.trim()
          ? `Git URL: ${repoUrl.trim()}`
          : "Not set yet. Add repo URL or local path before planning.";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !goal.trim() || !companyId) return;

    setSubmitting(true);
    setError(null);
    setErrorDetails(undefined);
    setFieldErrors({});

    try {
      const { project } = await api.projects.create({
        // API contract still expects workspaceId; value is canonical company id.
        workspaceId: companyId,
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

  if (loadingCompanies) {
    return <PageLoadingState title="New Project" subtitle="Loading companies..." />;
  }

  if (loadError) {
    return (
      <PageErrorState
        title="New Project"
        message={loadError}
        onRetry={() => router.refresh()}
        secondaryAction={
          <Link className="btn btn-secondary" href="/companies">
            Back to Companies
          </Link>
        }
      />
    );
  }

  if (companies.length === 0) {
    return (
      <div>
        <Breadcrumbs
          items={[{ label: "Companies", href: "/companies" }, { label: "Advanced: New Project" }]}
        />
        <div className="ws-page-header">
          <div className="ws-page-header-row">
            <div>
              <h2 className="ws-page-title">New Project</h2>
              <p className="ws-page-subtitle">
                Advanced path: create a project brief directly. Ticket-first flow through the board
                is the default for most work.
              </p>
            </div>
          </div>
        </div>
        <PageEmptyState
          title="No companies found"
          description="Create a company first to organize your projects."
          actions={
            <Link className="btn btn-primary" href="/companies/new">
              Create Company
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={
          selectedCompany
            ? [
                { label: "Companies", href: "/companies" },
                { label: selectedCompany.name, href: `/companies/${selectedCompany.id}` },
                { label: "Advanced: New Project" },
              ]
            : [{ label: "Companies", href: "/companies" }, { label: "Advanced: New Project" }]
        }
      />

      <div className="ws-page-header">
        <div className="ws-page-header-row">
          <div>
            <h2 className="ws-page-title">New Project</h2>
            <p className="ws-page-subtitle">
              {projectMode === "greenfield"
                ? "Advanced path: create a project brief directly. Ticket-first flow through the board is the default for most work."
                : "Advanced path: link an existing repository. Ticket-first flow through the board is the default for most work."}
            </p>
          </div>
        </div>
      </div>

      <div className="project-create-layout">
        <div className="company-create-card">
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
              <label className="label" htmlFor="company">
                Company
              </label>
              <select
                id="company"
                className="input"
                value={companyId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  setCompanyId(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, companyId: [], workspaceId: [] }));
                }}
                required
              >
                <option value="">Select company...</option>
                {companies.map((companyOption) => (
                  <option key={companyOption.id} value={companyOption.id}>
                    {companyOption.name}
                  </option>
                ))}
              </select>
              {selectedCompany ? (
                <p className="field-hint">
                  This project will belong to <strong>{selectedCompany.name}</strong>.
                </p>
              ) : (
                <p className="field-hint">Pick the company that should own this project.</p>
              )}
              {(getFieldError(fieldErrors, "companyId") || getFieldError(fieldErrors, "workspaceId")) && (
                <p className="field-error">
                  {getFieldError(fieldErrors, "companyId") || getFieldError(fieldErrors, "workspaceId")}
                </p>
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
              <input type="hidden" id="provider" value={provider} readOnly />
              <div className="provider-option-grid" role="radiogroup" aria-label="AI provider">
                {PROVIDER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={provider === option.value}
                    className={`provider-option-card ${provider === option.value ? "active" : ""}`}
                    onClick={() => setProvider(option.value)}
                  >
                    <span className="provider-option-title">{option.label}</span>
                    <span className="provider-option-tagline">{option.tagline}</span>
                    <span className="provider-option-note">{option.recommendedFor}</span>
                  </button>
                ))}
              </div>
              <p className="field-hint">
                You can switch provider later while the project is still in draft or after a failed
                run.
              </p>
            </div>

            {projectMode === "existing" && (
              <div className="project-source-note">
                <strong>Repository source</strong>
                <p>{repoSourceSummary}</p>
              </div>
            )}

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
                disabled={submitting || !companyId || !name.trim() || !goal.trim()}
              >
                {submitting ? "Creating..." : "Create Project"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => router.push(cancelHref)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        <aside className="project-guide-card">
          <h4>Execution setup</h4>
          <ul className="project-checklist project-summary-list">
            <li>
              Company: <strong>{selectedCompany?.name ?? "Not selected"}</strong>
            </li>
            <li>
              Mode:{" "}
              <strong>{projectMode === "greenfield" ? "New project" : "Existing repo"}</strong>
            </li>
            <li>
              Provider: <strong>{selectedProvider?.label ?? "Not selected"}</strong>
            </li>
            <li>
              Repo source: <strong>{repoSourceSummary}</strong>
            </li>
          </ul>
          {selectedCompany && (
            <Link className="btn btn-secondary" href={boardHref}>
              Open {selectedCompany.name} Board
            </Link>
          )}

          <div className="project-guide-divider" />

          <h3>What happens next</h3>
          <ol className="project-guide-list">
            <li>The project is created in draft inside the selected company.</li>
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
