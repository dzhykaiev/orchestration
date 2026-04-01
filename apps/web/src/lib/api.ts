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
type Workspace = WorkspaceDto;
type Project = ProjectDto;
type AuditLog = AuditLogDto;
type Artifact = ArtifactDto;
type AgentDefinition = AgentDefinitionDto;
type Workstream = WorkstreamDto;
type AgentTask = AgentTaskDto;
type Feature = FeatureDto;

// --- API Client ---

export const api = {
  workspaces: {
    list: (limit = 20, offset = 0) =>
      fetchAPI<{ data: Workspace[]; total: number; limit: number; offset: number }>(
        `/api/workspaces?limit=${limit}&offset=${offset}`,
      ),
    get: (id: string) => fetchAPI<{ workspace: Workspace }>(`/api/workspaces/${id}`),
    create: (body: { name: string; slug?: string; description?: string }) =>
      fetchAPI<{ workspace: Workspace }>("/api/workspaces", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: Record<string, unknown>) =>
      fetchAPI<{ workspace: Workspace }>(`/api/workspaces/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      fetchAPI<void>(`/api/workspaces/${id}`, {
        method: "DELETE",
      }),
    projects: (id: string, limit = 20, offset = 0, includeArchived = false) =>
      fetchAPI<{ data: Project[]; total: number; limit: number; offset: number }>(
        `/api/workspaces/${id}/projects?limit=${limit}&offset=${offset}&includeArchived=${includeArchived}`,
      ),
    agents: (id: string) => fetchAPI<{ agents: AgentDefinition[] }>(`/api/workspaces/${id}/agents`),
    features: (id: string, limit = 100, offset = 0) =>
      fetchAPI<{ data: Feature[]; total: number; limit: number; offset: number }>(
        `/api/workspaces/${id}/features?limit=${limit}&offset=${offset}`,
      ),
    createAgent: (
      id: string,
      body: {
        role: string;
        tier: string;
        name: string;
        parentRole?: string;
        systemPrompt?: string;
      },
    ) =>
      fetchAPI<{ agent: AgentDefinition }>(`/api/workspaces/${id}/agents`, {
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
        feature?: Feature | null;
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
      return fetchAPI<{ data: Feature[]; total: number; limit: number; offset: number }>(
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
      const query = status ? `?status=${status}&limit=100` : "?limit=100";
      return fetchAPI<{ data: Feature[]; total: number; limit: number; offset: number }>(
        `/api/features${query}`,
      );
    },
    get: (id: string) => fetchAPI<{ feature: Feature }>(`/api/features/${id}`),
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
      fetchAPI<{ feature: Feature }>("/api/features", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: Record<string, unknown>) =>
      fetchAPI<{ feature: Feature }>(`/api/features/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      fetchAPI<void>(`/api/features/${id}`, {
        method: "DELETE",
      }),
    kickoff: (id: string) =>
      fetchAPI<{ feature: Feature; project: Project }>(`/api/features/${id}/kickoff`, {
        method: "POST",
      }),
    reorder: (updates: { id: string; sortOrder: number }[]) =>
      fetchAPI<{ ok: boolean }>("/api/features/reorder", {
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
  Workspace,
  Project,
  Workstream,
  AgentTask,
  FileEntry,
  Feature,
  AuditLog,
  Artifact,
  AgentDefinition,
  ApiFieldErrors,
};
