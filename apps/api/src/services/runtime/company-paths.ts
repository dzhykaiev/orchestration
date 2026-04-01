import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function resolveDefaultCompaniesDir(): string {
  if (process.env.COMPANIES_DIR?.trim()) {
    return resolve(process.env.COMPANIES_DIR);
  }

  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const repoRootCompaniesDir = resolve(moduleDir, "../../../../../companies");
  if (existsSync(repoRootCompaniesDir)) {
    return repoRootCompaniesDir;
  }

  return resolve(join(process.cwd(), "companies"));
}

const defaultCompaniesDir = resolveDefaultCompaniesDir();

export function getCompaniesBaseDir(): string {
  return defaultCompaniesDir;
}

export function resolveCompanyRoot(companyId: string): string {
  return resolve(getCompaniesBaseDir(), companyId);
}

export function resolveCompanyProjectsRoot(companyId: string): string {
  return resolve(resolveCompanyRoot(companyId), "projects");
}

export function resolveCompanyProjectRoot(companyId: string, projectId: string): string {
  return resolve(resolveCompanyProjectsRoot(companyId), projectId);
}

export function isWithinRoot(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export function resolveWithinRoot(root: string, subPath = ""): string {
  const target = resolve(root, subPath);
  if (!isWithinRoot(root, target)) {
    throw new Error(`Path escapes root: ${subPath}`);
  }
  return target;
}
