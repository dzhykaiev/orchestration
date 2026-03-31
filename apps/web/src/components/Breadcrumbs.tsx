"use client";

import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        marginBottom: "0.75rem",
        fontSize: "0.85rem",
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
      }}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {index > 0 && <span style={{ color: "var(--color-text-secondary)" }}>/</span>}
            {isLast || !item.href ? (
              <span style={{ color: isLast ? "var(--color-text)" : "var(--color-text-secondary)" }}>
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                style={{
                  color: "var(--color-text-secondary)",
                  textDecoration: "none",
                }}
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
