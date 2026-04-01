import type {
  AgentDefinitionDto,
  AgentTaskDto,
  ArtifactDto,
  AuditLogDto,
  FeatureDto,
  ProjectDto,
  WorkspaceDto,
  WorkstreamDto,
} from "@orchestration/shared";
import { buildApiUrl } from "./api-base";

type ApiFieldErrors = Record<string, string[]>;

interface ApiErrorBody {
  error?: string;
  message?: string;
  statusCode?: number;
  requestId?: string;
  details?: unknown;
}

function normalizeFieldErrors(details: unknown): ApiFieldErrors {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return {};
  }

  const fieldErrors = (details as { fieldErrors?: unknown }).fieldErrors;
  if (!fieldErrors || typeof fieldErrors !== "object" || Array.isArray(fieldErrors)) {
    return {};
  }

  const normalized: ApiFieldErrors = {};
  for (const [field, value] of Object.entries(fieldErrors as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    const messages = value.filter(
      (item): item is string => typeof item === "string" && item.length > 0,
    );
    if (messages.length > 0) {
      normalized[field] = messages;
    }
  }

  return normalized;
}

function normalizeFormErrors(details: unknown): string[] {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return [];
  }

  const formErrors = (details as { formErrors?: unknown }).formErrors;
  if (!Array.isArray(formErrors)) {
    return [];
  }

  return formErrors.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function stringifyErrorDetails(details: unknown): string | undefined {
  const fieldErrors = normalizeFieldErrors(details);
  const formErrors = normalizeFormErrors(details);
  const lines: string[] = [];

  for (const formError of formErrors) {
    lines.push(formError);
  }

  for (const [field, messages] of Object.entries(fieldErrors)) {
    lines.push(`${field}: ${messages.join(", ")}`);
  }

  if (lines.length > 0) {
    return lines.join("\n");
  }

  if (typeof details === "string" && details.trim()) {
    return details;
  }

  return undefined;
}

function humanizeApiErrorMessage(message: string, statusCode: number, details: unknown): string {
  if (statusCode === 409) {
    return message || "This item was updated by another process. Refresh and try again.";
  }

  if (message === "Validation Error") {
    const fieldErrors = normalizeFieldErrors(details);
    const firstFieldError = Object.values(fieldErrors)[0]?.[0];
    return firstFieldError || "Please review the highlighted fields and try again.";
  }

  return message || `API error: ${statusCode}`;
}

export class ApiError extends Error {
  statusCode: number;
  requestId?: string;
  details?: unknown;
  detailsText?: string;
  fieldErrors: ApiFieldErrors;
  formErrors: string[];

  constructor({
    message,
    statusCode,
    requestId,
    details,
  }: {
    message: string;
    statusCode: number;
    requestId?: string;
    details?: unknown;
  }) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.requestId = requestId;
    this.details = details;
    this.detailsText = stringifyErrorDetails(details);
    this.fieldErrors = normalizeFieldErrors(details);
    this.formErrors = normalizeFormErrors(details);
  }
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function getErrorFieldErrors(error: unknown): ApiFieldErrors {
  if (error instanceof ApiError) return error.fieldErrors;
  return {};
}

export function getErrorDetails(error: unknown): string | undefined {
  if (error instanceof ApiError) {
    return error.detailsText;
  }
  return undefined;
}

async function fetchAPI<T>(path: string, opts?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...(opts?.headers as Record<string, string>) };
  if (opts?.body) {
    headers["Content-Type"] = "application/json";
  }
  let res: Response;
  try {
    res = await fetch(buildApiUrl(path), {
      ...opts,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error";
    throw new Error(`Network error while requesting ${path}: ${message}`);
  }
  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    let body: ApiErrorBody = {};

    if (contentType.includes("application/json")) {
      body = (await res.json().catch(() => ({}))) as ApiErrorBody;
    } else {
      const text = await res.text().catch(() => "");
      body = text.trim() ? { error: text } : {};
    }

    const statusCode = body.statusCode ?? res.status;
    const message = humanizeApiErrorMessage(
      body.error || body.message || res.statusText,
      statusCode,
      body.details,
    );

    throw new ApiError({
      message,
      statusCode,
      requestId: body.requestId,
      details: body.details,
    });
  }
  if (res.status === 204 || res.status === 205 || opts?.method?.toUpperCase() === "HEAD") {
    return undefined as T;
  }

  const contentLength = res.headers.get("content-length");
  if (contentLength === "0") {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await res.text();
    if (!text.trim()) return undefined as T;
    throw new Error("API error: expected JSON response");
  }

  const text = await res.text();
  if (!text.trim()) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

// --- Types ---

interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
}

// Re-export shared DTO types for use in components
type Company = WorkspaceDto;
type Project = ProjectDto;
type AuditLog = AuditLogDto;
type Artifact = ArtifactDto;
type AgentDefinition = AgentDefinitionDto;
type Workstream = WorkstreamDto;
type AgentTask = AgentTaskDto;
type Ticket = FeatureDto;
/** @deprecated Use Company */
type Workspace = Company;
/** @deprecated Use Ticket */
type Feature = Ticket;

const warnedDeprecations = new Set<string>();

function warnDeprecatedApi(legacyKey: string, replacementKey: string) {
  if (process.env.NODE_ENV === "production") return;
  const warningKey = `${legacyKey}->${replacementKey}`;
  if (warnedDeprecations.has(warningKey)) return;
  warnedDeprecations.add(warningKey);
  // Keep a soft warning in development while preserving runtime compatibility.
  console.warn(`[api] '${legacyKey}' is deprecated. Use '${replacementKey}' instead.`);
}

const markWorkspacesDeprecated = () => warnDeprecatedApi("api.workspaces", "api.companies");
const markFeaturesDeprecated = () => warnDeprecatedApi("api.features", "api.tickets");

// --- API Client ---

export const api = {
  workspaces: {
    list: (limit = 20, offset = 0) =>
      (markWorkspacesDeprecated(),
      fetchAPI<{ data: Company[]; total: number; limit: number; offset: number }>(
        `/api/companies?limit=${limit}&offset=${offset}`,
      )),
    get: (id: string) => (
      markWorkspacesDeprecated(),
      fetchAPI<{ workspace: Company }>(`/api/companies/${id}`)
    ),
    create: (body: {
      name: string;
      slug?: string;
      description?: string;
      mission?: string;
      bootstrapAgentRole?: "ceo" | "orchestrator";
      bootstrapAgentProvider?: "claude" | "codex" | "opencode";
    }) =>
      (markWorkspacesDeprecated(),
      fetchAPI<{ workspace: Company }>("/api/companies", {
        method: "POST",
        body: JSON.stringify(body),
      })),
    update: (id: string, body: Record<string, unknown>) =>
      (markWorkspacesDeprecated(),
      fetchAPI<{ workspace: Company }>(`/api/companies/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      })),
    delete: (id: string) =>
      (markWorkspacesDeprecated(),
      fetchAPI<void>(`/api/companies/${id}`, {
        method: "DELETE",
      })),
    projects: (id: string, limit = 20, offset = 0, includeArchived = false) =>
      (markWorkspacesDeprecated(),
      fetchAPI<{ data: Project[]; total: number; limit: number; offset: number }>(
        `/api/companies/${id}/projects?limit=${limit}&offset=${offset}&includeArchived=${includeArchived}`,
      )),
    agents: (id: string) => (
      markWorkspacesDeprecated(),
      fetchAPI<{ agents: AgentDefinition[] }>(`/api/companies/${id}/agents`)
    ),
    features: (id: string, limit = 100, offset = 0) =>
      (markWorkspacesDeprecated(),
      fetchAPI<{ tickets: Ticket[]; total: number; limit: number; offset: number }>(
        `/api/companies/${id}/tickets?limit=${limit}&offset=${offset}`,
      ).then((response) => ({
        data: response.tickets,
        total: response.total,
        limit: response.limit,
        offset: response.offset,
      }))),
    createAgent: (
      id: string,
      body: {
        role: string;
        tier: string;
        name: string;
        parentRole?: string;
        systemPrompt?: string;
        capabilities?: string[];
        maxConcurrentTasks?: number;
        provider?: string;
      },
    ) =>
      (markWorkspacesDeprecated(),
      fetchAPI<{ agent: AgentDefinition }>(`/api/companies/${id}/agents`, {
        method: "POST",
        body: JSON.stringify(body),
      })),
  },
  companies: {
    list: (limit = 20, offset = 0) =>
      fetchAPI<{ data: Company[]; total: number; limit: number; offset: number }>(
        `/api/companies?limit=${limit}&offset=${offset}`,
      ),
    get: (id: string) => fetchAPI<{ workspace: Company }>(`/api/companies/${id}`),
    create: (body: {
      name: string;
      slug?: string;
      description?: string;
      mission?: string;
      bootstrapAgentRole?: "ceo" | "orchestrator";
      bootstrapAgentProvider?: "claude" | "codex" | "opencode";
    }) =>
      fetchAPI<{ workspace: Company }>("/api/companies", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: Record<string, unknown>) =>
      fetchAPI<{ workspace: Company }>(`/api/companies/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      fetchAPI<void>(`/api/companies/${id}`, {
        method: "DELETE",
      }),
    projects: (id: string, limit = 20, offset = 0, includeArchived = false) =>
      fetchAPI<{ data: Project[]; total: number; limit: number; offset: number }>(
        `/api/companies/${id}/projects?limit=${limit}&offset=${offset}&includeArchived=${includeArchived}`,
      ),
    agents: (id: string) => fetchAPI<{ agents: AgentDefinition[] }>(`/api/companies/${id}/agents`),
    tickets: (id: string, limit = 100, offset = 0) =>
      fetchAPI<{ tickets: Ticket[]; total: number; limit: number; offset: number }>(
        `/api/companies/${id}/tickets?limit=${limit}&offset=${offset}`,
      ),
    createTicket: (
      id: string,
      body: {
        title: string;
        description?: string;
        status?: string;
        type?: string;
        sourceProjectId?: string;
        assigneeMode?: "orchestrator" | "agent";
        assigneeAgentDefinitionId?: string;
      },
    ) =>
      fetchAPI<{ ticket: Ticket }>(`/api/companies/${id}/tickets`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    createAgent: (
      id: string,
      body: {
        role: string;
        tier: string;
        name: string;
        parentRole?: string;
        systemPrompt?: string;
        capabilities?: string[];
        maxConcurrentTasks?: number;
        provider?: string;
      },
    ) =>
      fetchAPI<{ agent: AgentDefinition }>(`/api/companies/${id}/agents`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  projects: {
    list: (limit = 20, offset = 0, includeArchived = false) =>
      fetchAPI<{ data: Project[]; total: number; limit: number; offset: number }>(
        `/api/projects?limit=${limit}&offset=${offset}&includeArchived=${includeArchived}`,
      ),
    get: (id: string) => fetchAPI<{ project: Project }>(`/api/projects/${id}`),
    create: (body: {
      workspaceId: string;
      name: string;
      goal: string;
      provider?: string;
      projectMode?: string;
      repoUrl?: string;
      repoPath?: string;
    }) =>
      fetchAPI<{ project: Project }>("/api/projects", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: Record<string, unknown>) =>
      fetchAPI<{ project: Project }>(`/api/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    plan: (id: string) =>
      fetchAPI<{ project: Project; workstreams: Workstream[] }>(`/api/projects/${id}/plan`, {
        method: "POST",
      }),
    stop: (id: string) =>
      fetchAPI<{ project: Project }>(`/api/projects/${id}/stop`, {
        method: "POST",
      }),
    archive: (id: string) =>
      fetchAPI<{ project: Project }>(`/api/projects/${id}/archive`, {
        method: "POST",
      }),
    delete: (id: string) =>
      fetchAPI<void>(`/api/projects/${id}`, {
        method: "DELETE",
      }),
    workstreams: (id: string) =>
      fetchAPI<{ workstreams: Workstream[] }>(`/api/projects/${id}/workstreams`),
    detail: (id: string) =>
      fetchAPI<{
        project: Project;
        workstreams: Workstream[];
        tasks: AgentTask[];
        feature?: Ticket | null;
      }>(`/api/projects/${id}/detail`),
    costs: (id: string) =>
      fetchAPI<{
        total: number;
        byWorkstream: { workstreamId: string; name: string; cost: number }[];
        byRole: { role: string; cost: number }[];
        taskCount: number;
      }>(`/api/projects/${id}/costs`),
    auditLog: (id: string, limit = 50, offset = 0) =>
      fetchAPI<{ data: AuditLog[]; total: number; limit: number; offset: number }>(
        `/api/projects/${id}/audit-log?limit=${limit}&offset=${offset}`,
      ),
    artifacts: (id: string, type?: string) => {
      const query = type ? `?type=${type}` : "";
      return fetchAPI<{ data: Artifact[]; total: number; limit: number; offset: number }>(
        `/api/projects/${id}/artifacts${query}`,
      );
    },
    issues: (id: string, limit = 20, offset = 0, status?: string) => {
      const statusQuery = status ? `&status=${encodeURIComponent(status)}` : "";
      return fetchAPI<{ data: Ticket[]; total: number; limit: number; offset: number }>(
        `/api/projects/${id}/issues?limit=${limit}&offset=${offset}${statusQuery}`,
      );
    },
  },
  workstreams: {
    get: (id: string) => fetchAPI<{ workstream: Workstream }>(`/api/workstreams/${id}`),
    tasks: (id: string) => fetchAPI<{ tasks: AgentTask[] }>(`/api/workstreams/${id}/tasks`),
  },
  tasks: {
    retry: (taskId: string) =>
      fetchAPI<{ task: AgentTask }>(`/api/tasks/${taskId}/retry`, {
        method: "POST",
      }),
    children: (taskId: string) => fetchAPI<{ tasks: AgentTask[] }>(`/api/tasks/${taskId}/children`),
    tree: (taskId: string) => fetchAPI<{ tasks: AgentTask[] }>(`/api/tasks/${taskId}/tree`),
  },
  features: {
    list: (status?: string) => {
      markFeaturesDeprecated();
      const query = status ? `?status=${status}&limit=100` : "?limit=100";
      return fetchAPI<{ tickets: Ticket[]; total: number; limit: number; offset: number }>(
        `/api/tickets${query}`,
      ).then((response) => ({
        data: response.tickets,
        total: response.total,
        limit: response.limit,
        offset: response.offset,
      }));
    },
    get: (id: string) => (
      markFeaturesDeprecated(),
      fetchAPI<{ ticket: Ticket }>(`/api/tickets/${id}`).then((response) => ({
        feature: response.ticket,
      }))
    ),
    create: (body: {
      workspaceId: string;
      title: string;
      description?: string;
      type?: string;
      priority?: number;
      sourceProjectId?: string;
      assigneeMode?: "orchestrator" | "agent";
      assigneeAgentDefinitionId?: string | null;
    }) =>
      (markFeaturesDeprecated(),
      fetchAPI<{ ticket: Ticket }>("/api/tickets", {
        method: "POST",
        body: JSON.stringify(body),
      }).then((response) => ({
        feature: response.ticket,
      }))),
    update: (id: string, body: Record<string, unknown>) =>
      (markFeaturesDeprecated(),
      fetchAPI<{ ticket: Ticket }>(`/api/tickets/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }).then((response) => ({
        feature: response.ticket,
      }))),
    delete: (id: string) =>
      (markFeaturesDeprecated(),
      fetchAPI<void>(`/api/tickets/${id}`, {
        method: "DELETE",
      })),
    kickoff: (id: string) =>
      (markFeaturesDeprecated(),
      fetchAPI<{ ticket: Ticket; project: Project }>(`/api/tickets/${id}/kickoff`, {
        method: "POST",
      }).then((response) => ({
        feature: response.ticket,
        project: response.project,
      }))),
    reorder: (updates: { id: string; sortOrder: number }[]) =>
      (markFeaturesDeprecated(),
      fetchAPI<{ ok: boolean }>("/api/tickets/reorder", {
        method: "PATCH",
        body: JSON.stringify({ updates }),
      })),
  },
  tickets: {
    list: (status?: string) => {
      const query = status ? `?status=${status}&limit=100` : "?limit=100";
      return fetchAPI<{ tickets: Ticket[]; total: number; limit: number; offset: number }>(
        `/api/tickets${query}`,
      );
    },
    get: (id: string) => fetchAPI<{ ticket: Ticket }>(`/api/tickets/${id}`),
    create: (body: {
      workspaceId: string;
      title: string;
      description?: string;
      type?: string;
      priority?: number;
      sourceProjectId?: string;
      assigneeMode?: "orchestrator" | "agent";
      assigneeAgentDefinitionId?: string | null;
    }) =>
      fetchAPI<{ ticket: Ticket }>("/api/tickets", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: Record<string, unknown>) =>
      fetchAPI<{ ticket: Ticket }>(`/api/tickets/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      fetchAPI<void>(`/api/tickets/${id}`, {
        method: "DELETE",
      }),
    kickoff: (id: string) =>
      fetchAPI<{ ticket: Ticket; project: Project }>(`/api/tickets/${id}/kickoff`, {
        method: "POST",
      }),
    logs: (id: string, limit = 50, offset = 0) =>
      fetchAPI<{ logs: AuditLog[]; total: number; limit: number; offset: number }>(
        `/api/tickets/${id}/log?limit=${limit}&offset=${offset}`,
      ),
    addLog: (
      id: string,
      body: {
        message: string;
        channel?: "comment" | "question" | "handoff" | "note";
        actorType?: "user" | "agent" | "system";
        actorId?: string;
        projectId?: string;
        metadata?: Record<string, unknown>;
      },
    ) =>
      fetchAPI<{ log: AuditLog | null }>(`/api/tickets/${id}/log`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    hire: (
      id: string,
      body: {
        role: string;
        tier: string;
        name: string;
        parentRole?: string;
        systemPrompt?: string;
        capabilities?: string[];
        maxConcurrentTasks?: number;
        provider?: string;
        createFollowupTicket?: boolean;
        followupTitle?: string;
        followupDescription?: string;
        requestedByActorType?: "user" | "agent" | "system";
        requestedByActorId?: string;
      },
    ) =>
      fetchAPI<{ agent: AgentDefinition; delegatedTicket: Ticket | null }>(`/api/tickets/${id}/hire`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    reorder: (updates: { id: string; sortOrder: number }[]) =>
      fetchAPI<{ ok: boolean }>("/api/tickets/reorder", {
        method: "PATCH",
        body: JSON.stringify({ updates }),
      }),
  },
  launch: {
    start: (projectId: string) =>
      fetchAPI<{ port: number; url: string; status: string }>(`/api/projects/${projectId}/launch`, {
        method: "POST",
      }),
    stop: (projectId: string) =>
      fetchAPI<{ stopped: boolean }>(`/api/projects/${projectId}/launch/stop`, {
        method: "POST",
      }),
    status: (projectId: string) =>
      fetchAPI<{
        running: boolean;
        port?: number;
        url?: string;
        status?: string;
        logs?: string[];
        startedAt?: string;
      }>(`/api/projects/${projectId}/launch/status`),
  },
  files: {
    list: (projectId: string, path?: string) => {
      const query = path ? `?path=${encodeURIComponent(path)}` : "";
      return fetchAPI<{ files: FileEntry[] }>(`/api/projects/${projectId}/files${query}`);
    },
    content: (projectId: string, path: string) =>
      fetchAPI<{ content: string; path: string; size: number }>(
        `/api/projects/${projectId}/files/content?path=${encodeURIComponent(path)}`,
      ),
  },
};

export type {
  Company,
  Workspace,
  Project,
  Workstream,
  AgentTask,
  FileEntry,
  Ticket,
  Feature,
  AuditLog,
  Artifact,
  AgentDefinition,
  ApiFieldErrors,
};
