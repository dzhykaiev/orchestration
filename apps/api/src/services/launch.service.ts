import { type ChildProcess, spawn } from "node:child_process";
import { cp, mkdir, readdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCompanyRuntimeContext } from "./orchestration/company-runtime.js";

/** Port range for launched projects */
const PORT_RANGE_START = 4100;
const PORT_RANGE_END = 4200;
const COPY_IGNORE = new Set([".git", ".next", ".turbo", "coverage", "dist", "logs", "node_modules"]);

interface LaunchedProject {
  projectId: string;
  serverPort: number;
  clientPort: number;
  process: ChildProcess;
  logs: string[];
  startedAt: Date;
  status: "starting" | "running" | "failed" | "stopped";
  url: string;
}

interface LaunchCommand {
  args: string[];
  envPort: number;
  note?: string;
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

function extractLocalUrl(line: string): string | null {
  const match = line.match(/https?:\/\/(?:localhost|127\.0\.0\.1):\d+/i);
  return match ? match[0] : null;
}

function updateRuntimeSignals(entry: LaunchedProject, line: string) {
  const detectedUrl = extractLocalUrl(line);
  if (detectedUrl) {
    entry.url = detectedUrl;
  }

  if (line.includes("listening") || line.includes("ready") || line.includes("Local:")) {
    entry.status = "running";
  }
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isFile();
  } catch {
    return false;
  }
}

async function isEmptyDirectory(path: string): Promise<boolean> {
  const entries = await readdir(path);
  return entries.length === 0;
}

function parseJsonObject(content: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(content) as unknown;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  } catch {
    // ignore parse failures
  }
  return null;
}

function getLegacyProjectCandidates(projectId: string): string[] {
  const repoRoot = getRepoRoot();
  return [
    resolve(repoRoot, "apps/orchestrator/projects", projectId),
    resolve(repoRoot, "projects", projectId),
  ];
}

async function hydrateClientNodeModulesFromLegacy(
  projectId: string,
  projectDir: string,
): Promise<boolean> {
  const clientNodeModules = join(projectDir, "src/client/node_modules");
  if (await isDirectory(clientNodeModules)) {
    return false;
  }

  for (const sourceDir of getLegacyProjectCandidates(projectId)) {
    const sourceClientNodeModules = join(sourceDir, "src/client/node_modules");
    if (!(await isDirectory(sourceClientNodeModules))) {
      continue;
    }

    await mkdir(dirname(clientNodeModules), { recursive: true });
    await cp(sourceClientNodeModules, clientNodeModules, {
      recursive: true,
      force: true,
    });
    return true;
  }

  return false;
}

async function resolveLaunchCommand(
  projectId: string,
  projectDir: string,
  clientPort: number,
  serverPort: number,
): Promise<LaunchCommand> {
  const clientManifest = await fileExists(join(projectDir, "src/client/package.json"));
  const serverManifest = await fileExists(join(projectDir, "src/server/package.json"));
  const rootManifestPath = join(projectDir, "package.json");

  // If the scaffold is client-only but root script still expects src/server, fallback to client launch.
  if (clientManifest && !serverManifest) {
    let rootDevScript = "";
    try {
      const { readFile } = await import("node:fs/promises");
      const raw = await readFile(rootManifestPath, "utf8");
      const parsed = parseJsonObject(raw);
      const scripts = parsed?.scripts;
      if (scripts && typeof scripts === "object" && !Array.isArray(scripts)) {
        const dev = (scripts as Record<string, unknown>).dev;
        if (typeof dev === "string") rootDevScript = dev;
      }
    } catch {
      // best-effort only
    }

    if (rootDevScript.includes("src/server")) {
      const hydratedClientModules = await hydrateClientNodeModulesFromLegacy(projectId, projectDir);
      return {
        args: [
          "--dir",
          "src/client",
          "--ignore-workspace",
          "dev",
          "--",
          "--host",
          "127.0.0.1",
          "--port",
          String(clientPort),
        ],
        envPort: clientPort,
        note: hydratedClientModules
          ? "Detected client-only sandbox; restored src/client/node_modules from legacy cache and launching src/client only."
          : "Detected client-only sandbox; launching src/client only.",
      };
    }
  }

  return {
    args: ["dev"],
    envPort: serverPort,
  };
}

function getRepoRoot(): string {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  return resolve(moduleDir, "../../../../");
}

async function hydrateSandboxFromLegacy(projectId: string, projectDir: string): Promise<boolean> {
  const candidates = getLegacyProjectCandidates(projectId);

  for (const sourceDir of candidates) {
    if (!(await isDirectory(sourceDir))) {
      continue;
    }
    if (!(await fileExists(join(sourceDir, "package.json")))) {
      continue;
    }

    await cp(sourceDir, projectDir, {
      recursive: true,
      force: false,
      filter: (src) => !COPY_IGNORE.has(src.split("/").pop() ?? ""),
    });
    return true;
  }

  return false;
}

export const launchService = {
  async launch(projectId: string): Promise<{ port: number; url: string; status: string }> {
    // Already running?
    const existing = registry.get(projectId);
    if (existing && (existing.status === "running" || existing.status === "starting")) {
      return { port: existing.serverPort, url: existing.url, status: existing.status };
    }

    const runtimeContext = await resolveCompanyRuntimeContext(projectId);
    const projectDir = runtimeContext.projectRoot;

    // Ensure isolated project directory exists
    let createdProjectDir = false;
    try {
      const s = await stat(projectDir);
      if (!s.isDirectory()) throw new Error("not a directory");
    } catch {
      await mkdir(projectDir, { recursive: true });
      createdProjectDir = true;
    }

    if (createdProjectDir || (await isEmptyDirectory(projectDir))) {
      await hydrateSandboxFromLegacy(projectId, projectDir);
    }

    try {
      const pkg = await stat(join(projectDir, "package.json"));
      if (!pkg.isFile()) {
        throw new Error("package.json is not a file");
      }
    } catch {
      throw new Error(
        `Project is not runnable yet: missing package.json in sandbox (${projectDir})`,
      );
    }

    const port = findFreePort();
    usedPorts.add(port);

    const serverPort = port;
    const clientPort = port + 1;
    usedPorts.add(clientPort);

    const launchCommand = await resolveLaunchCommand(projectId, projectDir, clientPort, serverPort);

    // Spawn the project dev server with PORT env.
    // For fullstack projects: PORT=serverPort, CLIENT_PORT=clientPort.
    // For client-only fallback: PORT=clientPort.
    const child = spawn("pnpm", launchCommand.args, {
      cwd: projectDir,
      env: {
        ...process.env,
        PORT: String(launchCommand.envPort),
        CLIENT_PORT: String(clientPort),
        API_URL: `http://localhost:${serverPort}`,
      },
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
      detached: false,
    });

    const entry: LaunchedProject = {
      projectId,
      serverPort,
      clientPort,
      process: child,
      logs: [],
      startedAt: new Date(),
      status: "starting",
      url: `http://localhost:${clientPort}`,
    };

    registry.set(projectId, entry);
    if (launchCommand.note) {
      pushLog(entry, `[launch] ${launchCommand.note}\n`);
    }

    child.stdout?.on("data", (data: Buffer) => {
      const line = data.toString();
      pushLog(entry, line);
      updateRuntimeSignals(entry, line);
    });

    child.stderr?.on("data", (data: Buffer) => {
      const line = data.toString();
      pushLog(entry, `[stderr] ${line}`);
      updateRuntimeSignals(entry, line);
    });

    child.on("error", (err) => {
      entry.status = "failed";
      pushLog(entry, `[error] ${err.message}`);
      usedPorts.delete(serverPort);
      usedPorts.delete(clientPort);
    });

    child.on("exit", (code) => {
      if (entry.status !== "stopped") {
        entry.status = code === 0 ? "stopped" : "failed";
      }
      usedPorts.delete(serverPort);
      usedPorts.delete(clientPort);
      pushLog(entry, `[exit] Process exited with code ${code}`);
    });

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
    usedPorts.delete(entry.serverPort);
    usedPorts.delete(entry.clientPort);
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
    if (!entry) return { running: false, status: "stopped" };

    if (entry.status === "starting" || entry.status === "running") {
      if (entry.process.exitCode !== null) {
        entry.status = entry.process.exitCode === 0 ? "stopped" : "failed";
      }
    }

    return {
      running: entry.status === "running",
      port: entry.serverPort,
      url: entry.url,
      status: entry.status,
      logs: entry.logs.slice(-50),
      startedAt: entry.startedAt.toISOString(),
    };
  },
};
