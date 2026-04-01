import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function resolveDefaultCompaniesDir(): string {
  if (process.env.COMPANIES_DIR?.trim()) {
    return resolve(process.env.COMPANIES_DIR);
  }

  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const repoRootCompaniesDir = resolve(moduleDir, "../../../../companies");
  if (existsSync(repoRootCompaniesDir)) {
    return repoRootCompaniesDir;
  }

  return resolve(join(process.cwd(), "companies"));
}

const defaultCompaniesDir = resolveDefaultCompaniesDir();

export function resolveCompanyProjectRoot(
  companyId: string | null | undefined,
  projectId: string,
): string {
  const normalizedCompanyId = companyId?.trim() || "default";
  return resolve(defaultCompaniesDir, normalizedCompanyId, "projects", projectId);
}
