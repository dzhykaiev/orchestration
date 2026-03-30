"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !goal.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const { project } = await api.projects.create({
        name: name.trim(),
        goal: goal.trim(),
      });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h2>New Project</h2>
      <p className="text-muted mb-2">
        Describe what you want to build. The architect agent will design the system
        and create parallel workstreams for implementation.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="mb-2">
          <label
            htmlFor="name"
            style={{ display: "block", fontWeight: 500, marginBottom: 4 }}
          >
            Project Name
          </label>
          <input
            id="name"
            className="input"
            type="text"
            placeholder="e.g., E-Commerce Platform"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            required
            maxLength={200}
          />
        </div>

        <div className="mb-2">
          <label
            htmlFor="goal"
            style={{ display: "block", fontWeight: 500, marginBottom: 4 }}
          >
            Goal
          </label>
          <textarea
            id="goal"
            className="textarea"
            placeholder="Describe the software you want built. Be specific about features, tech requirements, and constraints."
            value={goal}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setGoal(e.target.value)}
            required
            maxLength={5000}
            rows={6}
          />
          <p className="text-sm text-muted" style={{ marginTop: 4 }}>
            {goal.length}/5000
          </p>
        </div>

        {error && (
          <p style={{ color: "#721c24", marginBottom: "1rem" }}>{error}</p>
        )}

        <div className="flex gap-1">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || !name.trim() || !goal.trim()}
          >
            {submitting ? "Creating..." : "Create Project"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.push("/")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
