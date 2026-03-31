"use client";

import { useEffect, useState } from "react";
import type { Feature, Workspace } from "../../lib/api";
import { Modal } from "../ui/Modal";

interface FeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    workspaceId?: string;
    title: string;
    description?: string;
    type: string;
    priority: number;
    status?: string;
  }) => void;
  feature?: Feature | null;
  workspaces: Workspace[];
  defaultWorkspaceId?: string;
}

export function FeatureModal({
  isOpen,
  onClose,
  onSave,
  feature,
  workspaces,
  defaultWorkspaceId,
}: FeatureModalProps) {
  const [workspaceId, setWorkspaceId] = useState(defaultWorkspaceId || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("feature");
  const [priority, setPriority] = useState(0);
  const [status, setStatus] = useState("backlog");

  const isEditing = !!feature;

  useEffect(() => {
    if (feature) {
      setTitle(feature.title);
      setDescription(feature.description || "");
      setType(feature.type);
      setPriority(feature.priority);
      setStatus(feature.status);
      setWorkspaceId(feature.workspaceId || defaultWorkspaceId || "");
    } else {
      setTitle("");
      setDescription("");
      setType("feature");
      setPriority(0);
      setStatus("backlog");
      setWorkspaceId(defaultWorkspaceId || "");
    }
  }, [feature, defaultWorkspaceId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || (!isEditing && !workspaceId)) return;
    onSave({
      ...(!isEditing ? { workspaceId } : {}),
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      priority,
      ...(isEditing ? { status } : {}),
    });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Edit Feature" : "New Feature"}>
      <form onSubmit={handleSubmit}>
        {!isEditing && (
          <div className="mb-2">
            <label
              htmlFor="feat-workspace"
              style={{ display: "block", fontWeight: 500, marginBottom: 4 }}
            >
              Workspace
            </label>
            <select
              id="feat-workspace"
              className="input"
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              required
              style={{ width: "100%", padding: "0.5rem" }}
            >
              <option value="">Select workspace...</option>
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-2">
          <label
            htmlFor="feat-title"
            style={{ display: "block", fontWeight: 500, marginBottom: 4 }}
          >
            Title
          </label>
          <input
            id="feat-title"
            className="input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Feature title..."
            required
            maxLength={500}
          />
        </div>

        <div className="mb-2">
          <label htmlFor="feat-desc" style={{ display: "block", fontWeight: 500, marginBottom: 4 }}>
            Description
          </label>
          <textarea
            id="feat-desc"
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the feature, expected behavior, acceptance criteria..."
            maxLength={5000}
            rows={4}
          />
        </div>

        <div style={{ display: "flex", gap: "1rem" }} className="mb-2">
          <div style={{ flex: 1 }}>
            <label
              htmlFor="feat-type"
              style={{ display: "block", fontWeight: 500, marginBottom: 4 }}
            >
              Type
            </label>
            <select
              id="feat-type"
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{ width: "100%", padding: "0.5rem" }}
            >
              <option value="feature">Feature</option>
              <option value="bug">Bug</option>
              <option value="improvement">Improvement</option>
              <option value="refactor">Refactor</option>
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label
              htmlFor="feat-priority"
              style={{ display: "block", fontWeight: 500, marginBottom: 4 }}
            >
              Priority
            </label>
            <select
              id="feat-priority"
              className="input"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              style={{ width: "100%", padding: "0.5rem" }}
            >
              <option value={0}>Low</option>
              <option value={1}>Medium</option>
              <option value={2}>High</option>
              <option value={3}>Critical</option>
            </select>
          </div>
        </div>

        {isEditing && (
          <div className="mb-2">
            <label
              htmlFor="feat-status"
              style={{ display: "block", fontWeight: 500, marginBottom: 4 }}
            >
              Status
            </label>
            <select
              id="feat-status"
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: "100%", padding: "0.5rem" }}
            >
              <option value="backlog">Backlog</option>
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        )}

        <div className="flex gap-1" style={{ marginTop: "1rem" }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!title.trim() || (!isEditing && !workspaceId)}
          >
            {isEditing ? "Save" : "Create"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
