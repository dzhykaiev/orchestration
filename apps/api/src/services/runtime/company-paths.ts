import { isAbsolute, relative, resolve, join } from "node:path";

const defaultCompaniesDir = resolve(
  process.env.COMPANIES_DIR || join(process.cwd(), "..", "orchestrator", "companies"),
);

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
