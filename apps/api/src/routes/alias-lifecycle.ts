import type { FastifyReply, FastifyRequest } from "fastify";

type AliasLifecycleConfig = {
  legacyPrefix: string;
  canonicalPrefix: string;
  sunsetAt: string;
};

const aliasUsageCounters = new Map<string, number>();

export const API_ALIAS_LIFECYCLE = {
  workspaceToCompany: {
    legacyPrefix: "/api/workspaces",
    canonicalPrefix: "/api/companies",
    sunsetAt: "Wed, 30 Sep 2026 23:59:59 GMT",
  },
  featureToTicket: {
    legacyPrefix: "/api/features",
    canonicalPrefix: "/api/tickets",
    sunsetAt: "Wed, 30 Sep 2026 23:59:59 GMT",
  },
} as const satisfies Record<string, AliasLifecycleConfig>;

function normalizePath(url: string | undefined): string {
  if (!url) return "";
  const [path] = url.split("?");
  return path ?? "";
}

function isPathWithinPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function bumpAliasCounter(aliasKey: string): number {
  const next = (aliasUsageCounters.get(aliasKey) ?? 0) + 1;
  aliasUsageCounters.set(aliasKey, next);
  return next;
}

export function markDeprecatedAliasUsage(
  request: FastifyRequest,
  reply: FastifyReply,
  config: AliasLifecycleConfig,
): void {
  const path = normalizePath(request.raw.url);
  if (!isPathWithinPrefix(path, config.legacyPrefix)) {
    return;
  }

  const aliasKey = `${config.legacyPrefix}->${config.canonicalPrefix}`;
  const usageCount = bumpAliasCounter(aliasKey);

  reply.header("Deprecation", "true");
  reply.header("Sunset", config.sunsetAt);
  reply.header("X-API-Alias-Legacy", config.legacyPrefix);
  reply.header("X-API-Alias-Canonical", config.canonicalPrefix);
  reply.header("X-API-Alias-Usage", String(usageCount));
  reply.header(
    "Warning",
    `299 - "${config.legacyPrefix} is deprecated; use ${config.canonicalPrefix}"`,
  );

  request.log.warn(
    {
      alias: aliasKey,
      legacyPrefix: config.legacyPrefix,
      canonicalPrefix: config.canonicalPrefix,
      sunsetAt: config.sunsetAt,
      usageCount,
    },
    "Deprecated API alias used",
  );
}

export function getApiAliasUsageMetrics(): Record<string, number> {
  return Object.fromEntries(aliasUsageCounters.entries());
}

export function resetApiAliasUsageMetrics(): void {
  aliasUsageCounters.clear();
}
