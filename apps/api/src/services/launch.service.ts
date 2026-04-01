import { type ChildProcess, spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import { resolveCompanyRuntimeContext } from "./orchestration/company-runtime.js";

/** Port range for launched projects */
const PORT_RANGE_START = 4100;
const PORT_RANGE_END = 4200;

interface LaunchedProject {
  projectId: string;
  port: number;
  process: ChildProcess;
  logs: string[];
  startedAt: Date;
  status: "starting" | "running" | "failed" | "stopped";
  url: string;
}

/** In-memory registry of running project processes */
const registry = new Map<string, LaunchedProject>();
const usedPorts = new Set<number>();

function findFreePort(): number {
  for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
    if (!usedPorts.has(port)) return port;
  }
  throw new Error("No free ports available in range");
}

function pushLog(entry: LaunchedProject, line: string) {
  entry.logs.push(line);
  // Keep last 200 lines
  if (entry.logs.length > 200) entry.logs.splice(0, entry.logs.length - 200);
}

export const launchService = {
  async launch(projectId: string): Promise<{ port: number; url: string; status: string }> {
    // Already running?
    const existing = registry.get(projectId);
    if (existing && (existing.status === "running" || existing.status === "starting")) {
      return { port: existing.port, url: existing.url, status: existing.status };
    }

    const runtimeContext = await resolveCompanyRuntimeContext(projectId);
    const projectDir = runtimeContext.projectRoot;

    // Check project directory exists
    try {
      const s = await stat(projectDir);
      if (!s.isDirectory()) throw new Error("not a directory");
    } catch {
      throw new Error(`Project directory not found: ${projectDir}`);
    }

    const port = findFreePort();
    usedPorts.add(port);

    const serverPort = port;
    const clientPort = port + 1;
    usedPorts.add(clientPort);

    // Spawn the project dev server with PORT env
    // Server gets `port`, client gets `port+1` — user sees the client URL
    const child = spawn("pnpm", ["dev"], {
      cwd: projectDir,
      env: {
        ...process.env,
        PORT: String(serverPort),
        CLIENT_PORT: String(clientPort),
        API_URL: `http://localhost:${serverPort}`,
      },
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
      detached: false,
    });

    const entry: LaunchedProject = {
      projectId,
      port,
      process: child,
      logs: [],
      startedAt: new Date(),
      status: "starting",
      url: `http://localhost:${clientPort}`,
    };

    registry.set(projectId, entry);

    child.stdout?.on("data", (data: Buffer) => {
      const line = data.toString();
      pushLog(entry, line);
      // Detect when server is ready
      if (
        line.includes("listening") ||
        line.includes("ready") ||
        line.includes("localhost") ||
        line.includes("Local:")
      ) {
        entry.status = "running";
      }
    });

    child.stderr?.on("data", (data: Buffer) => {
      pushLog(entry, `[stderr] ${data.toString()}`);
    });

    child.on("error", (err) => {
      entry.status = "failed";
      pushLog(entry, `[error] ${err.message}`);
      usedPorts.delete(port);
    });

    child.on("exit", (code) => {
      if (entry.status !== "stopped") {
        entry.status = code === 0 ? "stopped" : "failed";
      }
      usedPorts.delete(port);
      pushLog(entry, `[exit] Process exited with code ${code}`);
    });

    // Give it a moment then mark as running if not failed
    setTimeout(() => {
      if (entry.status === "starting") {
        entry.status = "running";
      }
    }, 3000);

    return { port, url: entry.url, status: "starting" };
  },

  stop(projectId: string): { stopped: boolean } {
    const entry = registry.get(projectId);
    if (!entry) return { stopped: false };

    entry.status = "stopped";
    try {
      entry.process.kill("SIGTERM");
    } catch {
      // already dead
    }
    usedPorts.delete(entry.port);
    registry.delete(projectId);
    return { stopped: true };
  },

  getStatus(projectId: string): {
    running: boolean;
    port?: number;
    url?: string;
    status?: string;
    logs?: string[];
    startedAt?: string;
  } {
    const entry = registry.get(projectId);
    if (!entry) return { running: false };

    return {
      running: entry.status === "running" || entry.status === "starting",
      port: entry.port,
      url: entry.url,
      status: entry.status,
      logs: entry.logs.slice(-50),
      startedAt: entry.startedAt.toISOString(),
    };
  },
};
