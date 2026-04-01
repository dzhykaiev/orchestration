export const BOARD_WORKSPACE_STORAGE_KEY = "board_workspace_id";

function normalizeWorkspaceId(workspaceId?: string | null): string {
  return workspaceId?.trim() ?? "";
}

export function buildBoardHref(workspaceId?: string | null): string {
  const normalized = normalizeWorkspaceId(workspaceId);
  return normalized ? `/board?workspaceId=${normalized}` : "/board";
}

export function buildWorkspaceHref(workspaceId?: string | null): string {
  const normalized = normalizeWorkspaceId(workspaceId);
  return normalized ? `/workspaces/${normalized}` : "/workspaces";
}

export function resolveWorkspaceSelection({
  requestedWorkspaceId,
  storedWorkspaceId,
  availableWorkspaceIds,
}: {
  requestedWorkspaceId?: string | null;
  storedWorkspaceId?: string | null;
  availableWorkspaceIds: string[];
}): string {
  const available = new Set(
    availableWorkspaceIds.map((id) => normalizeWorkspaceId(id)).filter(Boolean),
  );
  const requested = normalizeWorkspaceId(requestedWorkspaceId);
  const stored = normalizeWorkspaceId(storedWorkspaceId);

  if (requested && available.has(requested)) return requested;
  if (stored && available.has(stored)) return stored;
  return normalizeWorkspaceId(availableWorkspaceIds[0]);
}

export function readStoredBoardWorkspaceId(storage: Storage | null | undefined): string {
  if (!storage) return "";
  return normalizeWorkspaceId(storage.getItem(BOARD_WORKSPACE_STORAGE_KEY));
}

export function writeStoredBoardWorkspaceId(
  storage: Storage | null | undefined,
  workspaceId: string,
): void {
  if (!storage) return;
  const normalized = normalizeWorkspaceId(workspaceId);
  if (!normalized) {
    storage.removeItem(BOARD_WORKSPACE_STORAGE_KEY);
    return;
  }
  storage.setItem(BOARD_WORKSPACE_STORAGE_KEY, normalized);
}
