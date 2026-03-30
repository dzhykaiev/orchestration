"use client";

import { Modal } from "./Modal";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "default";
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
}: ConfirmModalProps) {
  function handleConfirm() {
    onConfirm();
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p>{message}</p>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          {cancelText}
        </button>
        <button
          type="button"
          className={`btn ${variant === "danger" ? "btn-danger" : "btn-primary"}`}
          onClick={handleConfirm}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
