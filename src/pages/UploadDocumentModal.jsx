import { useState } from "react";
import { Upload, X, FileText, CheckCircle } from "lucide-react";
import "../styles/UploadDocumentModal.css";
// login-label, login-input, form-group, login-error come from Login.css
import "../styles/Login.css";

export default function UploadDocumentModal({
  mode = "create",
  document,
  categories = [],
  onClose,
  onSubmit,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [changeNotes, setChangeNotes] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const isVersionMode = mode === "version";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isVersionMode && !title.trim()) {
      setError("Please enter a document title.");
      return;
    }
    if (!file) {
      setError("Please choose a file to upload.");
      return;
    }

    setLoading(true);
    try {
      if (isVersionMode) {
        await onSubmit({ file, changeNotes: changeNotes.trim() });
      } else {
        await onSubmit({
          title: title.trim(),
          description: description.trim(),
          categoryId: categoryId || null,
          file,
        });
      }
      setSuccess(true);
    } catch (err) {
      console.error("Upload failed:", err);
      setError(err.message ?? "Upload failed. Please try again.");
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
            <div className="kpi-icon-wrap" style={{ width: "36px", height: "36px" }}>
              <Upload size={17} />
            </div>
            <div>
              <h2 className="udm-title">
                {isVersionMode ? "Upload New Version" : "Upload Document"}
              </h2>
              {isVersionMode && (
                <p className="udm-subtitle">
                  {document?.title} — currently v{document?.current_version}
                </p>
              )}
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
            <p className="udm-success-text">Upload successful.</p>
            <button type="button" className="btn-primary" style={{ width: "100%" }} onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form className="udm-form" onSubmit={handleSubmit} noValidate>

            {!isVersionMode && (
              <>
                {/* Title */}
                <div className="form-group">
                  <label className="login-label" htmlFor="doc-title">Title</label>
                  <input
                    id="doc-title"
                    type="text"
                    className="login-input"
                    placeholder="e.g. Course Syllabus AY 2025–2026"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="login-label" htmlFor="doc-description">Description</label>
                  <textarea
                    id="doc-description"
                    className="login-input udm-textarea"
                    placeholder="Brief description of the document (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Category */}
                <div className="form-group">
                  <label className="login-label" htmlFor="doc-category">Category</label>
                  <select
                    id="doc-category"
                    className="login-input"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {isVersionMode && (
              <div className="form-group">
                <label className="login-label" htmlFor="change-notes">Change Notes</label>
                <textarea
                  id="change-notes"
                  className="login-input udm-textarea"
                  placeholder="What changed in this version? (optional)"
                  value={changeNotes}
                  onChange={(e) => setChangeNotes(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            {/* File Input — hidden native input wrapped inside the styled label */}
            <div className="form-group">
              <span className="login-label">File</span>
              <label className="udm-file-label">
                <input
                  id="doc-file"
                  type="file"
                  className="udm-file-hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <div className="udm-file-label-inner">
                  <FileText size={16} className="udm-file-icon" />
                  <span className={`udm-file-label-text${file ? " has-file" : ""}`}>
                    {file ? file.name : "Choose file…"}
                  </span>
                  <span className="udm-file-browse-btn">Browse</span>
                </div>
              </label>
              {file && (
                <p className="udm-file-hint">
                  {(file.size / 1024 / 1024).toFixed(2)} MB &middot; {file.type || "unknown type"}
                </p>
              )}
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
                {loading ? "Uploading…" : isVersionMode ? "Upload Version" : "Upload"}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
}
