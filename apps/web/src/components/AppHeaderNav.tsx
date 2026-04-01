"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { ThemeToggle } from "./ui/ThemeToggle";

export function AppHeaderNav() {
  const pathname = usePathname();

  const companyContextId = useMemo(() => {
    const match = pathname.match(/^\/companies\/([^/]+)/);
    return match?.[1] ?? "";
  }, [pathname]);

  const activityHref = companyContextId ? `/companies/${companyContextId}/activity` : "/companies";

  return (
    <nav className="app-nav">
      <ThemeToggle />
      <Link href="/companies" className="btn btn-secondary">
        Companies
      </Link>
      <Link href={activityHref} className="btn btn-secondary">
        Activity
      </Link>
    </nav>
  );
}
