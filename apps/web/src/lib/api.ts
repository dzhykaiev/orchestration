import type { AgentTaskDto, FeatureDto, ProjectDto, WorkstreamDto } from "@orchestration/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function fetchAPI<T>(path: string, opts?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...(opts?.headers as Record<string, string>) };
  if (opts?.body) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: res.statusText }))) as Record<
      string,
      string
    >;
    throw new Error(body.error || `API error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// --- Types ---

interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
}

// Re-export shared DTO types for use in components
type Project = ProjectDto;
type Workstream = WorkstreamDto;
type AgentTask = AgentTaskDto;
type Feature = FeatureDto;

// --- API Client ---

export const api = {
  projects: {
    list: (limit = 20, offset = 0, includeArchived = false) =>
      fetchAPI<{ projects: Project[]; total: number }>(
        `/api/projects?limit=${limit}&offset=${offset}&includeArchived=${includeArchived}`,
      ),
    get: (id: string) => fetchAPI<{ project: Project }>(`/api/projects/${id}`),
    create: (body: {
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
      fetchAPI<{ project: Project; workstreams: Workstream[]; tasks: AgentTask[] }>(
        `/api/projects/${id}/detail`,
      ),
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
  },
  features: {
    list: (status?: string) => {
      const query = status ? `?status=${status}&limit=200` : "?limit=200";
      return fetchAPI<{ features: Feature[]; total: number }>(`/api/features${query}`);
    },
    get: (id: string) => fetchAPI<{ feature: Feature }>(`/api/features/${id}`),
    create: (body: { title: string; description?: string; type?: string; priority?: number }) =>
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

export type { Project, Workstream, AgentTask, FileEntry, Feature };
