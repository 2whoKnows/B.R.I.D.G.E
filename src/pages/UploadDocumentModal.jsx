import { useState } from "react";
import "../styles/UploadDocumentModal.css";

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
      setError("Enter a document title.");
      return;
    }
    if (!file) {
      setError("Choose a file to upload.");
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
      setError(err.message ?? "Upload failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="udm-overlay" onClick={onClose}>
      <div className="udm-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="udm-title">
          {isVersionMode ? "Upload New Version" : "Upload Document"}
        </h2>
        {isVersionMode && (
          <p className="udm-subtitle">
            {document?.title} — currently v{document?.current_version}
          </p>
        )}

        {error && <div className="udm-error">{error}</div>}

        {success ? (
          <div className="udm-success">
            <div className="udm-success-icon">✓</div>
            <p>Upload successful.</p>
            <button type="button" className="udm-btn" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <form className="udm-form" onSubmit={handleSubmit} noValidate>
            {!isVersionMode && (
              <>
                <label className="udm-label" htmlFor="doc-title">Title</label>
                <input
                  id="doc-title"
                  type="text"
                  className="udm-input"
                  placeholder="Document title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                <label className="udm-label" htmlFor="doc-description">Description</label>
                <textarea
                  id="doc-description"
                  className="udm-textarea"
                  placeholder="Optional description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />

                <label className="udm-label" htmlFor="doc-category">Category</label>
                <select
                  id="doc-category"
                  className="udm-input"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Uncategorized</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </>
            )}

            {isVersionMode && (
              <>
                <label className="udm-label" htmlFor="change-notes">Change Notes</label>
                <textarea
                  id="change-notes"
                  className="udm-textarea"
                  placeholder="What changed in this version? (optional)"
                  value={changeNotes}
                  onChange={(e) => setChangeNotes(e.target.value)}
                  rows={3}
                />
              </>
            )}

            <label className="udm-label" htmlFor="doc-file">File</label>
            <input
              id="doc-file"
              type="file"
              className="udm-file-input"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && <span className="udm-file-name">{file.name}</span>}

            <div className="udm-actions">
              <button type="button" className="udm-btn udm-btn-secondary" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="udm-btn" disabled={loading}>
                {loading ? "Uploading…" : isVersionMode ? "Upload Version" : "Upload"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}