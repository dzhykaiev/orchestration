"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type Workspace, api } from "../../lib/api";

export default function WorkspacesPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.workspaces.list(100).then((data) => {
      setWorkspaces(data.data);
      setLoading(false);
    });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { workspace } = await api.workspaces.create({
        name,
        slug: slug || undefined,
        description: description || undefined,
      });
      setWorkspaces((prev) => [workspace, ...prev]);
      setShowCreate(false);
      setName("");
      setSlug("");
      setDescription("");
    } finally {
      setCreating(false);
    }
  };

  const autoSlug = (val: string) =>
    val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  if (loading) {
    return (
      <div>
        <h2 style={{ marginBottom: "1.5rem" }}>Workspaces</h2>
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0 }}>Workspaces</h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
          New Workspace
        </button>
      </div>

      {showCreate && (
        <div className="card" style={{ marginBottom: "1.5rem", padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem 0" }}>Create Workspace</h3>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <div>
              <label className="label" htmlFor="ws-name">
                Name
              </label>
              <input
                id="ws-name"
                className="input"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug || slug === autoSlug(name)) {
                    setSlug(autoSlug(e.target.value));
                  }
                }}
                placeholder="My Company"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="ws-slug">
                Slug
              </label>
              <input
                id="ws-slug"
                className="input"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="my-company"
              />
            </div>
            <div>
              <label className="label" htmlFor="ws-desc">
                Description
              </label>
              <textarea
                id="ws-desc"
                className="textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Optional description"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={creating || !name.trim()}>
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {workspaces.length === 0 ? (
        <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
            Create your first workspace to organize projects and features.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
            Create Workspace
          </button>
        </div>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
        >
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              type="button"
              className="card"
              style={{
                padding: "1.25rem",
                cursor: "pointer",
                textAlign: "left",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                width: "100%",
              }}
              onClick={() => router.push(`/workspaces/${ws.id}`)}
            >
              <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1.1rem" }}>{ws.name}</h3>
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "var(--color-text-secondary)",
                  fontFamily: "monospace",
                }}
              >
                {ws.slug}
              </span>
              {ws.description && (
                <p
                  style={{
                    margin: "0.5rem 0 0 0",
                    fontSize: "0.85rem",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {ws.description}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
