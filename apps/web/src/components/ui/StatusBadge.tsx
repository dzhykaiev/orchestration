"use client";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: "#f0f0f0", text: "#666" },
  pending: { bg: "#f0f0f0", text: "#666" },
  blocked: { bg: "#fff3cd", text: "#856404" },
  planning: { bg: "#cce5ff", text: "#004085" },
  queued: { bg: "#cce5ff", text: "#004085" },
  in_progress: { bg: "#fff3cd", text: "#856404" },
  running: { bg: "#fff3cd", text: "#856404" },
  completed: { bg: "#d4edda", text: "#155724" },
  failed: { bg: "#f8d7da", text: "#721c24" },
  cancelled: { bg: "#f0f0f0", text: "#666" },
};

export function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? { bg: "#f0f0f0", text: "#666" };

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
      {status.replace("_", " ")}
    </span>
  );
}
