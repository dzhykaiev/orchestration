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
      <h2 style={{ fontSize: "2rem", marginBottom: "1rem", color: "var(--color-danger)" }}>
        Something went wrong
      </h2>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "2rem" }}>{error.message}</p>
      <button type="button" onClick={reset} className="btn btn-primary">
        Try again
      </button>
    </div>
  );
}
