import { useState } from "react";
import "../styles/ConfirmDeleteModal.css";

export default function ConfirmDeleteModal({ documentTitle, onCancel, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setError("");
    setLoading(true);
    try {
      await onConfirm();
    } catch (err) {
      console.error("Delete failed:", err);
      setError(err.message ?? "Could not delete this document. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="cdm-overlay" onClick={onCancel}>
      <div className="cdm-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="cdm-title">Delete Document</h2>
        <p className="cdm-text">
          Are you sure you want to delete <strong>{documentTitle}</strong>? This removes
          all versions of the file and cannot be undone.
        </p>

        {error && <div className="cdm-error">{error}</div>}

        <div className="cdm-actions">
          <button type="button" className="cdm-btn cdm-btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button type="button" className="cdm-btn cdm-btn-danger" onClick={handleConfirm} disabled={loading}>
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}