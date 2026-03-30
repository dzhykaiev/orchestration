export function ProgressBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const barColor = color ?? (pct === 100 ? "var(--color-success)" : "var(--color-primary)");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {/* biome-ignore lint/a11y/useFocusableInteractive: progressbar is display-only, not interactive */}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${value} of ${max} completed`}
        style={{ flex: 1, height: 6, background: "var(--color-border)", borderRadius: 3 }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: barColor,
            borderRadius: 3,
            transition: "width 0.3s",
          }}
        />
      </div>
      <span className="text-sm text-muted">
        {value}/{max}
      </span>
    </div>
  );
}
