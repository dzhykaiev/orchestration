"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import {
  type ApiFieldErrors,
  api,
  getErrorDetails,
  getErrorFieldErrors,
  getErrorMessage,
} from "../../../lib/api";

type BootstrapRole = "ceo" | "orchestrator";
type BootstrapProvider = "claude" | "codex" | "opencode";

function getFieldError(fieldErrors: ApiFieldErrors, field: string): string | undefined {
  return fieldErrors[field]?.[0];
}

function getFieldErrorWithAliases(
  fieldErrors: ApiFieldErrors,
  field: string,
  aliases: string[] = [],
): string | undefined {
  return getFieldError(fieldErrors, field) ?? aliases.map((alias) => getFieldError(fieldErrors, alias)).find(Boolean);
}

function buildBootstrapPrompt({
  companyName,
  goal,
  description,
  role,
}: {
  companyName: string;
  goal: string;
  description?: string;
  role: BootstrapRole;
}): string {
  const roleLine =
    role === "ceo"
      ? "You are the founding CEO agent."
      : "You are the founding orchestrator agent acting as the company operator.";
  return [
    roleLine,
    `Company name: ${companyName}`,
    `Company goal: ${goal}`,
    description ? `Company description: ${description}` : undefined,
    "Operate ticket-first. Break work into traceable tickets and keep all work decisions in ticket history.",
  ]
    .filter(Boolean)
    .join("\n");
}

function getBootstrapAgentDefinition(role: BootstrapRole) {
  return role === "ceo"
    ? { role: "ceo" as const, tier: "ceo" as const, name: "Founding CEO" }
    : { role: "planner" as const, tier: "planner" as const, name: "Founding Orchestrator" };
}

function buildBootstrapTicket({
  companyName,
  goal,
  role,
}: {
  companyName: string;
  goal: string;
  role: BootstrapRole;
}) {
  return {
    title: `Initial operating plan for ${companyName}`,
    description: [
      `Company goal: ${goal}`,
      `Assigned by bootstrap flow to ${role === "ceo" ? "Founding CEO" : "Founding Orchestrator"}.`,
      "Break this into the first executable tickets and start with the highest-leverage hire.",
    ].join("\n"),
  };
}

export default function NewWorkspacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [goal, setGoal] = useState("");
  const [description, setDescription] = useState("");
  const [bootstrapRole, setBootstrapRole] = useState<BootstrapRole>("ceo");
  const [bootstrapProvider, setBootstrapProvider] = useState<BootstrapProvider>("opencode");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors>({});

  const autoSlug = (val: string) =>
    val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const goalFieldError = getFieldErrorWithAliases(fieldErrors, "goal", ["mission"]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedGoal = goal.trim();
    const trimmedDescription = description.trim();
    const trimmedSlug = slug.trim();

    if (!trimmedName || !trimmedGoal) {
      return;
    }

    setCreating(true);
    setError(null);
    setErrorDetails(undefined);
    setFieldErrors({});

    try {
      const { workspace } = await api.companies.create({
        name: trimmedName,
        slug: trimmedSlug || undefined,
        description: trimmedDescription || undefined,
        mission: trimmedGoal,
        bootstrapAgentRole: bootstrapRole,
        bootstrapAgentProvider: bootstrapProvider,
      });

      try {
        const bootstrapAgent = getBootstrapAgentDefinition(bootstrapRole);
        const { agent } = await api.companies.createAgent(workspace.id, {
          role: bootstrapAgent.role,
          tier: bootstrapAgent.tier,
          name: bootstrapAgent.name,
          systemPrompt: buildBootstrapPrompt({
            companyName: trimmedName,
            goal: trimmedGoal,
            description: trimmedDescription || undefined,
            role: bootstrapRole,
          }),
          capabilities: ["company-planning", "agent-hiring", "ticket-orchestration"],
          provider: bootstrapProvider,
        });

        const bootstrapTicket = buildBootstrapTicket({
          companyName: trimmedName,
          goal: trimmedGoal,
          role: bootstrapRole,
        });
        const { ticket } = await api.companies.createTicket(workspace.id, {
          title: bootstrapTicket.title,
          description: bootstrapTicket.description,
          type: "improvement",
          status: "todo",
          assigneeMode: "agent",
          assigneeAgentDefinitionId: agent.id,
        });
        await api.tickets.addLog(ticket.id, {
          actorType: "system",
          channel: "note",
          message:
            "Bootstrap flow created this first ticket. Use it to plan company structure, first hires, and initial execution queue.",
          metadata: { source: "company-bootstrap" },
        });
      } catch (agentError) {
        await api.companies.delete(workspace.id).catch(() => undefined);
        throw agentError;
      }

      router.push(`/companies/${workspace.id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create company"));
      setErrorDetails(getErrorDetails(err));
      setFieldErrors(getErrorFieldErrors(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <Breadcrumbs
        items={[{ label: "Companies", href: "/companies" }, { label: "New Company" }]}
      />

      <div className="ws-page-header">
        <div className="ws-page-header-row">
          <div>
            <h2 className="ws-page-title">Initialize Company</h2>
            <p className="ws-page-subtitle">
              Define the company goal, then launch the first managing agent in one flow.
            </p>
          </div>
        </div>
      </div>

      <div className="workspace-create-card" style={{ maxWidth: 700 }}>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div>
            <label className="label" htmlFor="ws-name">
              Company Name
            </label>
            <input
              id="ws-name"
              className="input"
              value={name}
              onChange={(e) => {
                const nextName = e.target.value;
                setName(nextName);
                setFieldErrors((prev) => ({ ...prev, name: [] }));
                if (!slug || slug === autoSlug(name)) {
                  setSlug(autoSlug(nextName));
                }
              }}
              placeholder="Nova Operations"
              required
            />
            {getFieldError(fieldErrors, "name") && (
              <p className="field-error">{getFieldError(fieldErrors, "name")}</p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="ws-goal">
              Company Goal
            </label>
            <textarea
              id="ws-goal"
              className="textarea"
              value={goal}
              onChange={(e) => {
                setGoal(e.target.value);
                setFieldErrors((prev) => ({ ...prev, goal: [], mission: [] }));
              }}
              rows={4}
              placeholder="Build a zero-human, ticket-driven company that runs products 24/7 through autonomous agents."
              required
            />
            <p className="field-hint">
              This is the outcome the CEO/Orchestrator will optimize for.
            </p>
            {goalFieldError && <p className="field-error">{goalFieldError}</p>}
          </div>

          <div>
            <label className="label" htmlFor="ws-desc">
              Description (optional)
            </label>
            <textarea
              id="ws-desc"
              className="textarea"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setFieldErrors((prev) => ({ ...prev, description: [] }));
              }}
              rows={3}
              placeholder="Context about market, product direction, and constraints."
            />
          </div>

          <div>
            <label className="label" htmlFor="ws-slug">
              URL Slug (optional)
            </label>
            <input
              id="ws-slug"
              className="input"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setFieldErrors((prev) => ({ ...prev, slug: [] }));
              }}
              placeholder="nova-operations"
            />
            <p className="field-hint">
              Optional. Leave blank to auto-generate from the company name.
            </p>
          </div>

          <div>
            <p className="label">First Managing Agent</p>
            <div className="project-mode-switch">
              <button
                type="button"
                className={`btn ${bootstrapRole === "ceo" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setBootstrapRole("ceo")}
              >
                CEO Agent
              </button>
              <button
                type="button"
                className={`btn ${bootstrapRole === "orchestrator" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setBootstrapRole("orchestrator")}
              >
                Orchestrator Agent
              </button>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="ws-provider">
              Agent CLI
            </label>
            <select
              id="ws-provider"
              className="input"
              value={bootstrapProvider}
              onChange={(e) => setBootstrapProvider(e.target.value as BootstrapProvider)}
            >
              <option value="claude">Claude</option>
              <option value="codex">Codex</option>
              <option value="opencode">OpenCode</option>
            </select>
            <p className="field-hint">
              This provider is used as the default runtime for the initial managing agent.
            </p>
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <strong>{error}</strong>
              {errorDetails && <pre className="error-banner-details">{errorDetails}</pre>}
            </div>
          )}

          <div className="flex gap-2" style={{ marginTop: "0.5rem" }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creating || !name.trim() || !goal.trim()}
            >
              {creating ? "Initializing..." : "Launch Company"}
            </button>
            <Link href="/companies" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
