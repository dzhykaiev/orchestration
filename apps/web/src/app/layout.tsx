import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { ToastProvider } from "../components/ui/ToastProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orchestration — AI Software Development",
  description: "Orchestrate AI agents to build software from high-level goals",
};

const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem("theme");
    if (t === "light" || t === "dark") {
      document.documentElement.setAttribute("data-theme", t);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  } catch(e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <header
          style={{
            padding: "0.75rem 2rem",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
            <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Orchestration</h1>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <ThemeToggle />
            <Link href="/board" className="btn btn-secondary">
              Board
            </Link>
            <Link href="/projects/new" className="btn btn-primary">
              New Project
            </Link>
          </div>
        </header>
        <ToastProvider>
          <main style={{ padding: "2rem", maxWidth: 960, margin: "0 auto" }}>{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
