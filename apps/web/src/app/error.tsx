"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
      <h2 style={{ fontSize: "2rem", marginBottom: "1rem", color: "#dc3545" }}>
        Something went wrong
      </h2>
      <p style={{ color: "#666", marginBottom: "2rem" }}>{error.message}</p>
      <button
        onClick={reset}
        className="btn btn-primary"
        style={{
          padding: "0.5rem 1.5rem",
          background: "#0070f3",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}
