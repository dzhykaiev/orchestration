export default function Loading() {
  return (
    <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
      <div
        style={{
          display: "inline-block",
          width: "2rem",
          height: "2rem",
          border: "3px solid var(--color-border)",
          borderTopColor: "var(--color-primary)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
      <p style={{ color: "var(--color-text-muted)", marginTop: "1rem" }}>Loading...</p>
    </div>
  );
}
