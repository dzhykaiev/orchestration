"use client";

import { useState } from "react";
import { api } from "../lib/api";

interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
}

interface FileTreeProps {
  projectId: string;
  basePath?: string;
  onFileClick: (path: string) => void;
  level?: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function FileTreeItem({
  entry,
  projectId,
  onFileClick,
  level,
}: {
  entry: FileEntry;
  projectId: string;
  onFileClick: (path: string) => void;
  level: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    if (entry.type === "file") {
      onFileClick(entry.path);
      return;
    }
    if (!expanded && children === null) {
      setLoading(true);
      try {
        const res = await api.files.list(projectId, entry.path);
        setChildren(res.files);
      } catch {
        setChildren([]);
      } finally {
        setLoading(false);
      }
    }
    setExpanded(!expanded);
  }

  return (
    <div>
      <div
        className="file-tree-item"
        role="button"
        tabIndex={0}
        style={{ paddingLeft: level * 16 }}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleToggle();
        }}
      >
        <span className="file-tree-icon">
          {entry.type === "directory" ? (expanded ? "\u25BC" : "\u25B6") : "\u{1F4C4}"}
        </span>
        <span className="file-tree-name">{entry.name}</span>
        {entry.type === "file" && entry.size !== undefined && (
          <span className="file-tree-size">{formatSize(entry.size)}</span>
        )}
        {entry.type === "directory" && loading && (
          <span className="file-tree-size text-muted">...</span>
        )}
      </div>
      {entry.type === "directory" && expanded && children && (
        <div>
          {children.length === 0 ? (
            <div
              className="file-tree-item text-muted"
              style={{ paddingLeft: (level + 1) * 16, fontStyle: "italic" }}
            >
              Empty
            </div>
          ) : (
            children.map((child) => (
              <FileTreeItem
                key={child.path}
                entry={child}
                projectId={projectId}
                onFileClick={onFileClick}
                level={level + 1}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function FileTree({ projectId, basePath = "", onFileClick, level = 0 }: FileTreeProps) {
  const [entries, setEntries] = useState<FileEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    if (loaded) return;
    setLoading(true);
    try {
      const res = await api.files.list(projectId, basePath);
      setEntries(res.files);
      setLoaded(true);
    } catch {
      setEntries([]);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  if (!loaded) {
    return (
      <div className="file-tree">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={load}
          disabled={loading}
          style={{ fontSize: "0.8rem" }}
        >
          {loading ? "Loading..." : "Load Files"}
        </button>
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="file-tree">
        <p className="text-sm text-muted" style={{ fontStyle: "italic" }}>
          No files found. Project may not have generated any output yet.
        </p>
      </div>
    );
  }

  return (
    <div className="file-tree">
      {entries.map((entry) => (
        <FileTreeItem
          key={entry.path}
          entry={entry}
          projectId={projectId}
          onFileClick={onFileClick}
          level={level}
        />
      ))}
    </div>
  );
}
