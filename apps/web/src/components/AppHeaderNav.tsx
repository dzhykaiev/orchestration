"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  buildBoardHref,
  readStoredBoardWorkspaceId,
  writeStoredBoardWorkspaceId,
} from "../lib/workspaceNavigation";
import { ThemeToggle } from "./ui/ThemeToggle";

export function AppHeaderNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [storedWorkspaceId, setStoredWorkspaceId] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const workspaceIdFromUrl = searchParams.get("workspaceId") || "";
    if (pathname === "/board" && workspaceIdFromUrl) {
      writeStoredBoardWorkspaceId(window.localStorage, workspaceIdFromUrl);
      setStoredWorkspaceId(workspaceIdFromUrl);
      return;
    }

    const savedWorkspaceId = readStoredBoardWorkspaceId(window.localStorage);
    setStoredWorkspaceId(savedWorkspaceId);
  }, [pathname, searchParams]);

  const boardHref = useMemo(() => buildBoardHref(storedWorkspaceId), [storedWorkspaceId]);

  return (
    <nav className="app-nav">
      <ThemeToggle />
      <Link href="/workspaces" className="btn btn-secondary">
        Workspaces
      </Link>
      <Link href={boardHref} className="btn btn-secondary">
        Board
      </Link>
      <Link href="/projects/new" className="btn btn-primary">
        New Project
      </Link>
    </nav>
  );
}
