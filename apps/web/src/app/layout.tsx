import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orchestration — AI Software Development",
  description: "Orchestrate AI agents to build software from high-level goals",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <header style={{ padding: "1rem 2rem", borderBottom: "1px solid #eee" }}>
          <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Orchestration</h1>
        </header>
        <main style={{ padding: "2rem" }}>{children}</main>
      </body>
    </html>
  );
}
