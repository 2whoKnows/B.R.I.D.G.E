import { useState } from "react";
import { Edit3, X, CheckCircle } from "lucide-react";
import "../styles/UploadDocumentModal.css";
import "../styles/Login.css";

export default function RenameModal({
  item, // { type: 'folder' | 'document', id, name / title }
  onClose,
  onRename,
}) {
  const isFolder = item?.type === "folder";
  const currentName = isFolder ? item?.name : item?.title;
  const [name, setName] = useState(currentName || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError(`Please enter a valid ${isFolder ? "folder" : "document"} name.`);
      return;
    }

    if (name.trim() === currentName) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      await onRename(item, name.trim());
      onClose();
    } catch (err) {
      console.error("Rename failed:", err);
      setError(err.message || "Failed to rename item.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="udm-overlay" onClick={onClose}>
      <div className="udm-card" style={{ maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="udm-header">
          <div className="udm-header-left">
            <div
              className="kpi-icon-wrap"
              style={{ width: "36px", height: "36px", color: "#2563EB", backgroundColor: "#EFF6FF" }}
            >
              <Edit3 size={17} />
            </div>
            <div>
              <h2 className="udm-title">Rename {isFolder ? "Folder" : "Document"}</h2>
              <p className="udm-subtitle">Enter a new name for this item</p>
            </div>
          </div>
          <button className="udm-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form className="udm-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="login-label" htmlFor="rename-input">Name</label>
            <input
              id="rename-input"
              type="text"
              className="login-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onFocus={(e) => e.target.select()}
            />
          </div>

          <div className="udm-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !name.trim()}
              style={{ flex: 1 }}
            >
              {loading ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
