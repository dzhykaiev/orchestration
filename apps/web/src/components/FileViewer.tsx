"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface FileViewerProps {
  projectId: string;
  filePath: string;
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function FileViewer({ projectId, filePath, onClose }: FileViewerProps) {
  const [content, setContent] = useState<string | null>(null);
  const [size, setSize] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setContent(null);
    api.files
      .content(projectId, filePath)
      .then((res) => {
        setContent(res.content);
        setSize(res.size);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load file");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [projectId, filePath]);

  const fileName = filePath.split("/").pop() || filePath;

  return (
    <div
      className="file-viewer-backdrop"
      role="button"
      tabIndex={0}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="file-viewer-modal"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="file-viewer-header">
          <div>
            <strong style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}>
              {fileName}
            </strong>
            <div className="text-sm text-muted" style={{ fontSize: "0.75rem" }}>
              {filePath} ({formatSize(size)})
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="file-viewer-body">
          {loading && <p className="text-muted">Loading...</p>}
          {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}
          {content !== null && <pre className="file-viewer-content">{content}</pre>}
        </div>
      </div>
    </div>
  );
}
