"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type Workspace, api } from "../../lib/api";

export default function WorkspacesPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.workspaces.list(100).then((data) => {
      setWorkspaces(data.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="ws-page-header">
        <h2 className="ws-page-title">Workspaces</h2>
        <div className="skeleton" style={{ height: 200, marginTop: "1.5rem" }} />
      </div>
    );
  }

  return (
    <div>
      <div className="ws-page-header">
        <div className="ws-page-header-row">
          <div>
            <h2 className="ws-page-title">Workspaces</h2>
            <p className="ws-page-subtitle">Organize your projects and AI agents</p>
          </div>
          <Link href="/workspaces/new" className="btn btn-primary">
            New Workspace
          </Link>
        </div>
      </div>

      {workspaces.length === 0 ? (
        <div className="workspace-empty">
          <div className="workspace-empty-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3 className="workspace-empty-title">No workspaces yet</h3>
          <p className="workspace-empty-desc">
            Create your first workspace to organize projects and features.
          </p>
          <Link href="/workspaces/new" className="btn btn-primary">
            Create Workspace
          </Link>
        </div>
      ) : (
        <div className="workspace-grid">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              type="button"
              className="workspace-card"
              onClick={() => router.push(`/workspaces/${ws.id}`)}
            >
              <div className="workspace-card-top">
                <div className="workspace-card-icon">{ws.name.charAt(0).toUpperCase()}</div>
                <div className="workspace-card-body">
                  <h3 className="workspace-card-title">{ws.name}</h3>
                  <span className="workspace-card-slug">{ws.slug}</span>
                </div>
              </div>
              {ws.description && <p className="workspace-card-desc">{ws.description}</p>}
              <div className="workspace-card-arrow">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
