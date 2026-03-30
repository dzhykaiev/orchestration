"use client";

import { useTheme } from "../../hooks/useTheme";

export function ThemeToggle() {
  const { isDark, toggleTheme, mounted } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      suppressHydrationWarning
      aria-label={mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
      title={mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
    >
      <span suppressHydrationWarning>{mounted ? (isDark ? "☀" : "☾") : "☾"}</span>
    </button>
  );
}
