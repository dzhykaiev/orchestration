import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
      <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>404 — Not Found</h2>
      <p style={{ color: "#666", marginBottom: "2rem" }}>
        The page you are looking for does not exist.
      </p>
      <Link href="/" className="btn btn-primary">
        Back to Projects
      </Link>
    </div>
  );
}
