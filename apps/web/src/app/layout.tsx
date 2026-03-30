import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orchestration — AI Software Development",
  description: "Orchestrate AI agents to build software from high-level goals",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header
          style={{
            padding: "0.75rem 2rem",
            borderBottom: "1px solid #e0e0e0",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
            <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
              Orchestration
            </h1>
          </Link>
          <Link href="/projects/new" className="btn btn-primary">
            New Project
          </Link>
        </header>
        <main style={{ padding: "2rem", maxWidth: 960, margin: "0 auto" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
