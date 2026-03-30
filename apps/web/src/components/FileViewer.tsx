"use client";

import { useCallback, useEffect, useState } from "react";
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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const fileName = filePath.split("/").pop() || filePath;

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape handled via document listener
    <div className="file-viewer-backdrop" role="presentation" onClick={onClose}>
      <div
        className="file-viewer-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`File: ${fileName}`}
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
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close file viewer"
          >
            &times;
          </button>
        </div>
        <div className="file-viewer-body">
          {loading && (
            <p className="text-muted" style={{ padding: "2rem", textAlign: "center" }}>
              Loading file...
            </p>
          )}
          {error && (
            <p style={{ color: "var(--color-danger)", padding: "2rem", textAlign: "center" }}>
              {error}
            </p>
          )}
          {content !== null && <pre className="file-viewer-content">{content}</pre>}
        </div>
      </div>
    </div>
  );
}
