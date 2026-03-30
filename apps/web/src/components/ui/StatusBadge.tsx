"use client";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: "var(--color-status-neutral-bg)", text: "var(--color-status-neutral-text)" },
  pending: { bg: "var(--color-status-neutral-bg)", text: "var(--color-status-neutral-text)" },
  blocked: { bg: "var(--color-status-yellow-bg)", text: "var(--color-status-yellow-text)" },
  planning: { bg: "var(--color-status-blue-bg)", text: "var(--color-status-blue-text)" },
  queued: { bg: "var(--color-status-blue-bg)", text: "var(--color-status-blue-text)" },
  in_progress: { bg: "var(--color-status-yellow-bg)", text: "var(--color-status-yellow-text)" },
  running: { bg: "var(--color-status-yellow-bg)", text: "var(--color-status-yellow-text)" },
  completed: { bg: "var(--color-status-green-bg)", text: "var(--color-status-green-text)" },
  failed: { bg: "var(--color-status-red-bg)", text: "var(--color-status-red-text)" },
  cancelled: { bg: "var(--color-status-neutral-bg)", text: "var(--color-status-neutral-text)" },
  archived: { bg: "var(--color-status-gray-bg)", text: "var(--color-status-gray-text)" },
};

export function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? { bg: "var(--color-status-neutral-bg)", text: "var(--color-status-neutral-text)" };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "12px",
        fontSize: "0.75rem",
        fontWeight: 600,
        backgroundColor: colors.bg,
        color: colors.text,
      }}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
