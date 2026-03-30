export function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

export function getProviderStyle(provider: string): { background: string; color: string } {
  if (provider === "claude") {
    return {
      background: "var(--color-provider-claude-bg)",
      color: "var(--color-provider-claude-text)",
    };
  }
  return {
    background: "var(--color-provider-default-bg)",
    color: "var(--color-provider-default-text)",
  };
}
