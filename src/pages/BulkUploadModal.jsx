import { useState, useRef } from "react";
import { Upload, FolderUp, Files, X, CheckCircle, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { uploadNewDocument, createFolder } from "../lib/documentQueries";
import "../styles/UploadDocumentModal.css";
import "../styles/Login.css";

export default function BulkUploadModal({
  categories = [],
  currentFolderId = null,
  userId,
  initialTab = "files",
  initialItems = [],
  onClose,
  onComplete,
}) {
  const [tab, setTab] = useState(initialTab); // "files" | "folder"
  const [selectedItems, setSelectedItems] = useState(initialItems); // array of { file, relativePath, name }
  const [categoryId, setCategoryId] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({}); // { [index]: 'pending' | 'uploading' | 'done' | 'error' }
  const [uploadErrors, setUploadErrors] = useState({});
  const [isFinished, setIsFinished] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    const items = files.map((file) => ({
      file,
      name: file.name,
      relativePath: file.webkitRelativePath || file.name,
    }));
    setSelectedItems((prev) => [...prev, ...items]);
  };

  // Drag & drop traversal
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const traverseFileTree = async (item, path = "") => {
    return new Promise((resolve) => {
      if (item.isFile) {
        item.file((file) => {
          resolve([{
            file,
            name: file.name,
            relativePath: path ? `${path}/${file.name}` : file.name,
          }]);
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        const entries = [];
        const readEntries = () => {
          dirReader.readEntries(async (result) => {
            if (result.length === 0) {
              const nestedFiles = [];
              for (const child of entries) {
                const childFiles = await traverseFileTree(child, path ? `${path}/${item.name}` : item.name);
                nestedFiles.push(...childFiles);
              }
              resolve(nestedFiles);
            } else {
              entries.push(...result);
              readEntries();
            }
          });
        };
        readEntries();
      } else {
        resolve([]);
      }
    });
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    const collected = [];
    const promises = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.webkitGetAsEntry) {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          promises.push(traverseFileTree(entry));
        }
      } else if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          collected.push({
            file,
            name: file.name,
            relativePath: file.name,
          });
        }
      }
    }

    const results = await Promise.all(promises);
    results.forEach((subList) => collected.push(...subList));

    setSelectedItems((prev) => [...prev, ...collected]);
  };

  const removeSelected = (index) => {
    if (isUploading) return;
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    if (isUploading) return;
    setSelectedItems([]);
  };

  const handleStartUpload = async () => {
    if (selectedItems.length === 0) return;

    setIsUploading(true);
    const initialProgress = {};
    selectedItems.forEach((_, idx) => {
      initialProgress[idx] = "pending";
    });
    setUploadProgress(initialProgress);

    // Map of normalized directory paths to folder IDs: e.g. "Math/Term1" -> uuid
    // Root level in this context is `currentFolderId`
    const folderCache = new Map();
    folderCache.set("", currentFolderId);

    const getOrCreateFolderIdForPath = async (dirPath) => {
      if (!dirPath || dirPath === "." || dirPath === "") return currentFolderId;

      const segments = dirPath.split("/").filter(Boolean);
      let runningPath = "";
      let parentId = currentFolderId;

      for (const segment of segments) {
        const nextPath = runningPath ? `${runningPath}/${segment}` : segment;
        if (folderCache.has(nextPath)) {
          parentId = folderCache.get(nextPath);
        } else {
          // Create the folder on Supabase
          try {
            const newFolder = await createFolder({
              name: segment,
              parentId: parentId || null,
              categoryId: categoryId || null,
              createdBy: userId,
            });
            folderCache.set(nextPath, newFolder.id);
            parentId = newFolder.id;
          } catch (err) {
            console.error(`Error creating folder ${segment}:`, err);
            throw err;
          }
        }
        runningPath = nextPath;
      }
      return parentId;
    };

    // Upload sequentially to ensure steady progress and reliable folder creation
    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      setUploadProgress((prev) => ({ ...prev, [i]: "uploading" }));

      try {
        // Determine target folderId
        let targetFolderId = currentFolderId;
        if (item.relativePath && item.relativePath.includes("/")) {
          const lastSlash = item.relativePath.lastIndexOf("/");
          const dirPath = item.relativePath.substring(0, lastSlash);
          targetFolderId = await getOrCreateFolderIdForPath(dirPath);
        }

        // Title defaults to file name (without extension or with extension)
        const docTitle = item.file.name;

        await uploadNewDocument({
          title: docTitle,
          description: item.relativePath !== item.file.name ? `Path: ${item.relativePath}` : "",
          categoryId: categoryId || null,
          file: item.file,
          userId,
          folderId: targetFolderId || null,
        });

        setUploadProgress((prev) => ({ ...prev, [i]: "done" }));
      } catch (err) {
        console.error(`Failed to upload ${item.name}:`, err);
        setUploadProgress((prev) => ({ ...prev, [i]: "error" }));
        setUploadErrors((prev) => ({ ...prev, [i]: err.message || "Failed to upload" }));
      }
    }

    setIsUploading(false);
    setIsFinished(true);
  };

  const totalFiles = selectedItems.length;
  const completedCount = Object.values(uploadProgress).filter((s) => s === "done").length;
  const errorCount = Object.values(uploadProgress).filter((s) => s === "error").length;

  return (
    <div className="udm-overlay" onClick={isUploading ? undefined : onClose}>
      <div
        className="udm-card"
        style={{ maxWidth: "580px", width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="udm-header">
          <div className="udm-header-left">
            <div
              className="kpi-icon-wrap"
              style={{
                width: "38px",
                height: "38px",
                color: "#2563EB",
                backgroundColor: "#EFF6FF",
              }}
            >
              <Upload size={18} />
            </div>
            <div>
              <h2 className="udm-title">Bulk Document Upload</h2>
              <p className="udm-subtitle">
                Upload multiple files or entire folders with preserved structure
              </p>
            </div>
          </div>
          {!isUploading && (
            <button className="udm-close-btn" onClick={onClose} aria-label="Close modal">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Finished banner */}
        {isFinished ? (
          <div className="udm-success" style={{ padding: "16px 0" }}>
            <div className="udm-success-icon" style={{ width: "60px", height: "60px" }}>
              {errorCount === 0 ? (
                <CheckCircle size={32} color="#16A34A" />
              ) : (
                <AlertCircle size={32} color="#D97706" />
              )}
            </div>
            <h3 style={{ margin: "6px 0 0", fontSize: "1.1rem", fontWeight: 600, color: "#0F172A" }}>
              {errorCount === 0 ? "Bulk Upload Complete!" : "Upload Completed with Some Errors"}
            </h3>
            <p className="udm-subtitle">
              Successfully uploaded <strong>{completedCount}</strong> of <strong>{totalFiles}</strong> file(s)
              {errorCount > 0 && ` (${errorCount} failed)`}.
            </p>

            {/* Results breakdown */}
            <div
              className="udm-progress-list"
              style={{ width: "100%", maxHeight: "200px", marginTop: "12px" }}
            >
              {selectedItems.map((item, idx) => (
                <div key={idx} className="udm-progress-item">
                  <span className="udm-progress-name">{item.relativePath}</span>
                  <span className={`udm-progress-status ${uploadProgress[idx] || "pending"}`}>
                    {uploadProgress[idx] === "done" ? "✓ Done" : "✗ Failed"}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{ width: "100%", marginTop: "16px" }}
              onClick={() => {
                onComplete();
                onClose();
              }}
            >
              Done & View Documents
            </button>
          </div>
        ) : (
          <>
            {/* Tabs for mode selection */}
            {!isUploading && (
              <div className="udm-tabs">
                <button
                  type="button"
                  className={`udm-tab ${tab === "files" ? "active" : ""}`}
                  onClick={() => setTab("files")}
                >
                  <Files size={15} style={{ display: "inline", marginRight: "6px" }} />
                  Select Files
                </button>
                <button
                  type="button"
                  className={`udm-tab ${tab === "folder" ? "active" : ""}`}
                  onClick={() => setTab("folder")}
                >
                  <FolderUp size={15} style={{ display: "inline", marginRight: "6px" }} />
                  Upload Entire Folder
                </button>
              </div>
            )}

            {/* Dropzone / Picker */}
            {!isUploading && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: dragOver ? "2px dashed #2563EB" : "2px dashed #CBD5E1",
                  borderRadius: "12px",
                  padding: "24px 16px",
                  textAlign: "center",
                  backgroundColor: dragOver ? "#EFF6FF" : "#F8FAFC",
                  transition: "all 0.15s ease",
                  cursor: "pointer",
                }}
                onClick={() => {
                  if (tab === "files") {
                    fileInputRef.current?.click();
                  } else {
                    folderInputRef.current?.click();
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleFilesSelected}
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  webkitdirectory=""
                  directory=""
                  multiple
                  style={{ display: "none" }}
                  onChange={handleFilesSelected}
                />

                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#2563EB",
                    marginBottom: "8px",
                  }}
                >
                  {tab === "files" ? <Files size={20} /> : <FolderUp size={20} />}
                </div>

                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0F172A" }}>
                  {tab === "files"
                    ? "Click to choose multiple files or drag & drop"
                    : "Click to choose a folder (includes all nested subfolders)"}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "4px" }}>
                  Preserves folder hierarchy automatically on upload
                </div>
              </div>
            )}

            {/* Category selection */}
            {!isUploading && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="login-label" htmlFor="bulk-category">
                  Default Category (Optional)
                </label>
                <select
                  id="bulk-category"
                  className="login-input"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">No Default Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Selected files preview / Progress list */}
            {selectedItems.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.8125rem",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "#334155" }}>
                    {isUploading
                      ? `Uploading (${completedCount}/${totalFiles})…`
                      : `Selected Items (${selectedItems.length})`}
                  </span>
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={clearAll}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#DC2626",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Live progress bar */}
                {isUploading && (
                  <div
                    style={{
                      height: "6px",
                      borderRadius: "3px",
                      backgroundColor: "#E2E8F0",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.round((completedCount / (totalFiles || 1)) * 100)}%`,
                        backgroundColor: "#2563EB",
                        transition: "width 0.2s ease",
                      }}
                    />
                  </div>
                )}

                <div className="udm-progress-list">
                  {selectedItems.map((item, idx) => {
                    const status = uploadProgress[idx] || "pending";
                    return (
                      <div key={idx} className="udm-progress-item">
                        <span className="udm-progress-name" title={item.relativePath}>
                          {item.relativePath}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {isUploading ? (
                            <span className={`udm-progress-status ${status}`}>
                              {status === "uploading" && (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <Loader2 size={12} className="animate-spin" /> Uploading…
                                </span>
                              )}
                              {status === "done" && "✓ Done"}
                              {status === "error" && "✗ Failed"}
                              {status === "pending" && "Pending"}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => removeSelected(idx)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#94A3B8",
                                cursor: "pointer",
                                padding: "2px",
                              }}
                              title="Remove"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="udm-actions" style={{ marginTop: "8px" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={isUploading}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleStartUpload}
                disabled={isUploading || selectedItems.length === 0}
                style={{ flex: 1 }}
              >
                {isUploading ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <Loader2 size={14} className="animate-spin" />
                    Uploading ({completedCount}/{totalFiles})
                  </span>
                ) : (
                  `Upload ${selectedItems.length} File${selectedItems.length === 1 ? "" : "s"}`
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
