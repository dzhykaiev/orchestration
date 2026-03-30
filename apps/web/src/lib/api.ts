const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function fetchAPI<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...opts?.headers },
    ...opts,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `API error: ${res.status}`);
  }
  return res.json();
}

// --- Types ---

interface Project {
  id: string;
  name: string;
  goal: string;
  status: string;
  architecture?: string;
  createdAt: string;
  updatedAt: string;
}

interface Workstream {
  id: string;
  projectId: string;
  name: string;
  objective: string;
  status: string;
  dependencies: string[];
  assignedAgent: string | null;
  deliverables: string[];
  ownedPaths: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface AgentTask {
  id: string;
  workstreamId: string;
  projectId: string;
  role: string;
  prompt: string;
  status: string;
  output?: string;
  filesModified: string[];
  error?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
}

// --- API Client ---

export const api = {
  projects: {
    list: (limit = 20, offset = 0) =>
      fetchAPI<{ projects: Project[]; total: number }>(
        `/api/projects?limit=${limit}&offset=${offset}`,
      ),
    get: (id: string) => fetchAPI<{ project: Project }>(`/api/projects/${id}`),
    create: (body: { name: string; goal: string }) =>
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
      fetchAPI<{ project: Project; workstreams: Workstream[] }>(
        `/api/projects/${id}/plan`,
        { method: "POST" },
      ),
    workstreams: (id: string) =>
      fetchAPI<{ workstreams: Workstream[] }>(`/api/projects/${id}/workstreams`),
  },
  workstreams: {
    get: (id: string) =>
      fetchAPI<{ workstream: Workstream }>(`/api/workstreams/${id}`),
    tasks: (id: string) =>
      fetchAPI<{ tasks: AgentTask[] }>(`/api/workstreams/${id}/tasks`),
  },
};

export type { Project, Workstream, AgentTask };
