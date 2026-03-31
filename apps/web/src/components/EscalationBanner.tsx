"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface Escalation {
  id: string;
  taskId: string;
  fromTier: string;
  toTier: string;
  reason: string;
  status: string;
  resolution: string | null;
  createdAt: string;
}

export function EscalationBanner({ projectId }: { projectId: string }) {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/projects/${projectId}/escalations?status=open&limit=10`,
    )
      .then((r) => r.json())
      .then((data: { escalations: Escalation[] }) => {
        setEscalations(data.escalations ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  if (loading || escalations.length === 0) return null;

  const handleResolve = async (id: string) => {
    const resolution = prompt("Resolution note:");
    if (!resolution) return;
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/escalations/${id}/resolve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution }),
      },
    );
    setEscalations((prev) => prev.filter((e) => e.id !== id));
  };

  const handleDismiss = async (id: string) => {
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/escalations/${id}/dismiss`,
      { method: "POST" },
    );
    setEscalations((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div
      style={{
        padding: "1rem",
        background: "var(--color-status-orange-bg, #fff7ed)",
        border: "1px solid var(--color-warning, #f59e0b)",
        borderRadius: "var(--radius, 6px)",
        marginBottom: "1rem",
      }}
    >
      <strong style={{ fontSize: "0.9rem" }}>
        {escalations.length} Active Escalation{escalations.length > 1 ? "s" : ""}
      </strong>
      {escalations.map((esc) => (
        <div
          key={esc.id}
          className="flex items-center justify-between"
          style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}
        >
          <div>
            <span style={{ fontWeight: 500 }}>
              {esc.fromTier} → {esc.toTier}:
            </span>{" "}
            {esc.reason}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: "0.75rem", padding: "2px 8px" }}
              onClick={() => handleResolve(esc.id)}
            >
              Resolve
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: "0.75rem", padding: "2px 8px" }}
              onClick={() => handleDismiss(esc.id)}
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
