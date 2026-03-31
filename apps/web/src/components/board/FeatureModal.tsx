"use client";

import { useEffect, useState } from "react";
import { getErrorDetails, getErrorFieldErrors, getErrorMessage } from "../../lib/api";
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
  }) => Promise<void>;
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
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formErrorDetails, setFormErrorDetails] = useState<string | undefined>();

  const isEditing = !!feature;
  const selectedWorkspace = workspaces.find((workspace) => workspace.id === workspaceId);
  const titleCount = title.trim().length;
  const descriptionCount = description.trim().length;
  const canSubmit = titleCount > 0 && (isEditing || Boolean(workspaceId)) && !submitting;

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
    setSubmitting(false);
    setFieldErrors({});
    setFormError(null);
    setFormErrorDetails(undefined);
  }, [feature, defaultWorkspaceId]);

  function getFieldError(field: string) {
    return fieldErrors[field]?.[0];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || (!isEditing && !workspaceId)) return;

    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    setFormErrorDetails(undefined);

    try {
      await onSave({
        ...(!isEditing ? { workspaceId } : {}),
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        priority,
        ...(isEditing ? { status } : {}),
      });
    } catch (error) {
      setFieldErrors(getErrorFieldErrors(error));
      setFormError(getErrorMessage(error, "Failed to save feature"));
      setFormErrorDetails(getErrorDetails(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Edit Feature" : "New Feature"}>
      <form onSubmit={handleSubmit} className="feature-modal-form">
        <div className="feature-modal-intro">
          <span className="feature-modal-eyebrow">
            {isEditing ? "Refine backlog item" : "Capture backlog work"}
          </span>
          <p className="feature-modal-copy">
            {isEditing
              ? "Keep the title outcome-focused, update the status only when the team is ready to change execution state, and use the description for acceptance criteria."
              : "Create one clear unit of work. Good features describe the user problem, expected result, and any constraints the agents need to respect."}
          </p>
        </div>

        {formError && (
          <div className="error-banner" role="alert">
            <strong>{isEditing ? "Feature update failed" : "Feature creation failed"}</strong>
            <div>{formError}</div>
            {formErrorDetails && <pre className="error-banner-details">{formErrorDetails}</pre>}
          </div>
        )}

        {!isEditing && (
          <div className="mb-2">
            <label htmlFor="feat-workspace" className="feature-modal-label">
              Workspace
            </label>
            <select
              id="feat-workspace"
              className="input"
              value={workspaceId}
              onChange={(e) => {
                setWorkspaceId(e.target.value);
                setFieldErrors((prev) => ({ ...prev, workspaceId: [] }));
              }}
              required
            >
              <option value="">Select workspace...</option>
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
            <div className="field-meta-row">
              <p className="field-hint">
                {selectedWorkspace
                  ? `This feature will be added to ${selectedWorkspace.name}.`
                  : "Choose the workspace where this feature should be prioritized and launched."}
              </p>
            </div>
            {getFieldError("workspaceId") && (
              <p className="field-error">{getFieldError("workspaceId")}</p>
            )}
          </div>
        )}

        <div className="mb-2">
          <label htmlFor="feat-title" className="feature-modal-label">
            Title
          </label>
          <input
            id="feat-title"
            className="input"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setFieldErrors((prev) => ({ ...prev, title: [] }));
            }}
            placeholder="Example: Improve project detail review flow"
            required
            maxLength={500}
          />
          <div className="field-meta-row">
            <p className="field-hint">
              Use a short outcome that a PM or engineer can recognize in the board.
            </p>
            <span className="field-hint">{title.length}/500</span>
          </div>
          {getFieldError("title") && <p className="field-error">{getFieldError("title")}</p>}
        </div>

        <div className="mb-2">
          <label htmlFor="feat-desc" className="feature-modal-label">
            Description
          </label>
          <textarea
            id="feat-desc"
            className="textarea"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setFieldErrors((prev) => ({ ...prev, description: [] }));
            }}
            placeholder="What user problem are we solving, what should change, and what constraints or acceptance criteria matter?"
            maxLength={5000}
            rows={6}
          />
          <div className="field-meta-row">
            <p className="field-hint">
              Include expected behavior, success criteria, and any important implementation
              guardrails.
            </p>
            <span className="field-hint">{description.length}/5000</span>
          </div>
          {getFieldError("description") && (
            <p className="field-error">{getFieldError("description")}</p>
          )}
        </div>

        <div className="feature-modal-grid mb-2">
          <div>
            <label htmlFor="feat-type" className="feature-modal-label">
              Type
            </label>
            <select
              id="feat-type"
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="feature">Feature</option>
              <option value="bug">Bug</option>
              <option value="improvement">Improvement</option>
              <option value="refactor">Refactor</option>
            </select>
            <p className="field-hint">
              This helps the board communicate whether the work is new value, a fix, or internal
              cleanup.
            </p>
          </div>

          <div>
            <label htmlFor="feat-priority" className="feature-modal-label">
              Priority
            </label>
            <select
              id="feat-priority"
              className="input"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
            >
              <option value={0}>Low</option>
              <option value={1}>Medium</option>
              <option value={2}>High</option>
              <option value={3}>Critical</option>
            </select>
            <p className="field-hint">
              Use high or critical only when this should displace currently queued work.
            </p>
          </div>
        </div>

        {isEditing && (
          <div className="mb-2">
            <label htmlFor="feat-status" className="feature-modal-label">
              Status
            </label>
            <select
              id="feat-status"
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="backlog">Backlog</option>
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
              <option value="rejected">Rejected</option>
            </select>
            <p className="field-hint">
              Move to `Todo` only when the brief is clear enough to kick off execution without extra
              clarification.
            </p>
          </div>
        )}

        <div className="feature-modal-summary">
          <span className="feature-modal-summary-label">Ready for board</span>
          <p className="feature-modal-summary-copy">
            {isEditing
              ? `This feature stays in ${selectedWorkspace?.name ?? "the current workspace"} and will keep its linked execution context if a project already exists.`
              : selectedWorkspace
                ? `This will create a new backlog item in ${selectedWorkspace.name}.`
                : "Select a workspace and add a concise title to create the backlog item."}
          </p>
          <p className="feature-modal-summary-meta">
            {titleCount > 0 ? `${titleCount} characters in title` : "Add a title"}
            {descriptionCount > 0 ? ` · ${descriptionCount} characters in description` : ""}
          </p>
        </div>

        <div className="flex gap-1" style={{ marginTop: "1rem" }}>
          <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
            {submitting ? (isEditing ? "Saving..." : "Creating...") : isEditing ? "Save" : "Create"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
