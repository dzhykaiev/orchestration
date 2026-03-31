"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import {
  type ApiFieldErrors,
  api,
  getErrorDetails,
  getErrorFieldErrors,
  getErrorMessage,
} from "../../../lib/api";

function getFieldError(fieldErrors: ApiFieldErrors, field: string): string | undefined {
  return fieldErrors[field]?.[0];
}

export default function NewWorkspacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors>({});

  const autoSlug = (val: string) =>
    val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setErrorDetails(undefined);
    setFieldErrors({});
    try {
      const { workspace } = await api.workspaces.create({
        name,
        slug: slug || undefined,
        description: description || undefined,
      });
      router.push(`/workspaces/${workspace.id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create workspace"));
      setErrorDetails(getErrorDetails(err));
      setFieldErrors(getErrorFieldErrors(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <Breadcrumbs
        items={[{ label: "Workspaces", href: "/workspaces" }, { label: "New Workspace" }]}
      />

      <div className="ws-page-header">
        <div className="ws-page-header-row">
          <div>
            <h2 className="ws-page-title">Create Workspace</h2>
            <p className="ws-page-subtitle">
              Set up a new workspace to organize your projects and AI agents.
            </p>
          </div>
        </div>
      </div>

      <div className="workspace-create-card" style={{ maxWidth: 560 }}>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
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
                setFieldErrors((prev) => ({ ...prev, name: [] }));
                if (!slug || slug === autoSlug(name)) {
                  setSlug(autoSlug(e.target.value));
                }
              }}
              placeholder="My Company"
              required
            />
            <p className="field-hint">
              Name the team, product area, or company this workspace belongs to.
            </p>
            {getFieldError(fieldErrors, "name") && (
              <p className="field-error">{getFieldError(fieldErrors, "name")}</p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="ws-slug">
              Slug
            </label>
            <input
              id="ws-slug"
              className="input"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setFieldErrors((prev) => ({ ...prev, slug: [] }));
              }}
              placeholder="my-company"
            />
            <p className="field-hint">
              Used in URLs and identifiers. Letters, numbers, and hyphens work best.
            </p>
            {getFieldError(fieldErrors, "slug") && (
              <p className="field-error">{getFieldError(fieldErrors, "slug")}</p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="ws-desc">
              Description
            </label>
            <textarea
              id="ws-desc"
              className="textarea"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setFieldErrors((prev) => ({ ...prev, description: [] }));
              }}
              rows={3}
              placeholder="What is this workspace for?"
            />
            <p className="field-hint">
              Optional, but useful when multiple teams share the same dashboard.
            </p>
            {getFieldError(fieldErrors, "description") && (
              <p className="field-error">{getFieldError(fieldErrors, "description")}</p>
            )}
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <strong>{error}</strong>
              {errorDetails && <pre className="error-banner-details">{errorDetails}</pre>}
            </div>
          )}

          <div className="flex gap-2" style={{ marginTop: "0.5rem" }}>
            <button type="submit" className="btn btn-primary" disabled={creating || !name.trim()}>
              {creating ? "Creating..." : "Create Workspace"}
            </button>
            <Link href="/workspaces" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
