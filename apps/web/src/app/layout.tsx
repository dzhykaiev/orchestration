import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { ToastProvider } from "../components/ui/ToastProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orchestration — AI Software Development",
  description: "Orchestrate AI agents to build software from high-level goals",
};

const themeInitScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}else if(window.matchMedia("(prefers-color-scheme: dark)").matches){document.documentElement.setAttribute("data-theme","dark")}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: theme init script must run before paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <header className="app-header">
          <Link href="/" className="app-logo">
            Orchestration
          </Link>
          <nav className="app-nav">
            <ThemeToggle />
            <Link href="/workspaces" className="btn btn-secondary">
              Workspaces
            </Link>
            <Link href="/board" className="btn btn-secondary">
              Board
            </Link>
            <Link href="/projects/new" className="btn btn-primary">
              New Project
            </Link>
          </nav>
        </header>
        <ToastProvider>
          <main className="app-main">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
