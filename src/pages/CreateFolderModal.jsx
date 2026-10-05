import { useState } from "react";
import { FolderPlus, X, CheckCircle } from "lucide-react";
import "../styles/UploadDocumentModal.css";
import "../styles/Login.css";

export default function CreateFolderModal({
  categories = [],
  onClose,
  onSubmit,
}) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter a folder name.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        categoryId: categoryId || null,
      });
      setSuccess(true);
    } catch (err) {
      console.error("Folder creation failed:", err);
      setError(err.message ?? "Could not create folder. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="udm-overlay" onClick={onClose}>
      <div className="udm-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="udm-header">
          <div className="udm-header-left">
            <div className="kpi-icon-wrap" style={{ width: "36px", height: "36px", color: "#D97706", backgroundColor: "#FEF3C7" }}>
              <FolderPlus size={18} />
            </div>
            <div>
              <h2 className="udm-title">Create New Folder</h2>
              <p className="udm-subtitle">Organize documents into structured folders</p>
            </div>
          </div>
          <button className="udm-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Error banner */}
        {error && <div className="login-error">{error}</div>}

        {/* Success state */}
        {success ? (
          <div className="udm-success">
            <div className="udm-success-icon">
              <CheckCircle size={28} />
            </div>
            <p className="udm-success-text">Folder created successfully.</p>
            <button type="button" className="btn-primary" style={{ width: "100%" }} onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form className="udm-form" onSubmit={handleSubmit} noValidate>
            {/* Folder Name */}
            <div className="form-group">
              <label className="login-label" htmlFor="folder-name">Folder Name</label>
              <input
                id="folder-name"
                type="text"
                className="login-input"
                placeholder="e.g. Science Department / Syllabi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            {/* Optional Category */}
            <div className="form-group">
              <label className="login-label" htmlFor="folder-category">Category (Optional)</label>
              <select
                id="folder-category"
                className="login-input"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">No Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Actions */}
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
                disabled={loading}
                style={{ flex: 1 }}
              >
                {loading ? "Creating…" : "Create Folder"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
