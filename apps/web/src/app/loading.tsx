export default function Loading() {
  return (
    <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
      <div
        style={{
          display: "inline-block",
          width: "2rem",
          height: "2rem",
          border: "3px solid #e0e0e0",
          borderTopColor: "#0070f3",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: "#666", marginTop: "1rem" }}>Loading...</p>
    </div>
  );
}
