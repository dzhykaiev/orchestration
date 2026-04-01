function normalizeCompanyId(companyId?: string | null): string {
  return companyId?.trim() ?? "";
}

function setParamIfPresent(params: URLSearchParams, key: string, value?: string | null): void {
  const normalized = value?.trim();
  if (normalized) {
    params.set(key, normalized);
  }
}

export function buildBoardHref(
  companyId?: string | null,
  options?: {
    q?: string | null;
    type?: string | null;
    status?: string | null;
    projectId?: string | null;
  },
): string {
  const normalized = normalizeCompanyId(companyId);
  const params = new URLSearchParams();

  setParamIfPresent(params, "q", options?.q);
  setParamIfPresent(params, "type", options?.type);
  setParamIfPresent(params, "status", options?.status);
  setParamIfPresent(params, "projectId", options?.projectId);

  const query = params.toString();
  if (!normalized) {
    return query ? `/board?${query}` : "/board";
  }
  return query ? `/companies/${normalized}/board?${query}` : `/companies/${normalized}/board`;
}

export function buildCompanyHref(companyId?: string | null): string {
  const normalized = normalizeCompanyId(companyId);
  return normalized ? `/companies/${normalized}` : "/companies";
}

export function resolveCompanySelection({
  requestedCompanyId,
  availableCompanyIds,
}: {
  requestedCompanyId?: string | null;
  availableCompanyIds: string[];
}): string {
  const available = new Set(
    availableCompanyIds.map((id) => normalizeCompanyId(id)).filter(Boolean),
  );
  const requested = normalizeCompanyId(requestedCompanyId);

  if (requested && available.has(requested)) return requested;
  return normalizeCompanyId(availableCompanyIds[0]);
}

/** @deprecated Use buildCompanyHref */
export function buildWorkspaceHref(workspaceId?: string | null): string {
  return buildCompanyHref(workspaceId);
}

/** @deprecated Use resolveCompanySelection */
export function resolveWorkspaceSelection({
  requestedWorkspaceId,
  availableWorkspaceIds,
}: {
  requestedWorkspaceId?: string | null;
  availableWorkspaceIds: string[];
}): string {
  return resolveCompanySelection({
    requestedCompanyId: requestedWorkspaceId,
    availableCompanyIds: availableWorkspaceIds,
  });
}
