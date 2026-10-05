import { useState, useEffect } from "react";
import { FolderSymlink, X, Folder, Home, ChevronRight, Check } from "lucide-react";
import { getAllFolders } from "../lib/documentQueries";
import "../styles/UploadDocumentModal.css";
import "../styles/Login.css";

export default function MoveItemModal({
  item, // { type: 'folder' | 'document', id, name / title, folder_id / parent_id }
  onClose,
  onMove,
}) {
  const isFolder = item?.type === "folder";
  const itemName = isFolder ? item?.name : item?.title;
  const currentParentId = isFolder ? item?.parent_id : item?.folder_id;

  const [allFolders, setAllFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null); // null = Root
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        setLoading(true);
        const folders = await getAllFolders();
        setAllFolders(folders);
      } catch (err) {
        console.error("Failed to load folders for move:", err);
        setError("Failed to load folder list.");
      } finally {
        setLoading(false);
      }
    };
    fetchFolders();
  }, []);

  // Helper to find all descendant IDs of a folder to prevent moving into its own descendants
  const getDescendantIds = (folderId, list) => {
    const descendants = new Set([folderId]);
    let added = true;
    while (added) {
      added = false;
      list.forEach((f) => {
        if (f.parent_id && descendants.has(f.parent_id) && !descendants.has(f.id)) {
          descendants.add(f.id);
          added = true;
        }
      });
    }
    return descendants;
  };

  const disallowedIds = isFolder ? getDescendantIds(item.id, allFolders) : new Set();

  // Build folder hierarchy tree for display
  const buildFolderTree = (parentId = null, depth = 0) => {
    const children = allFolders.filter((f) => (f.parent_id || null) === parentId);
    let result = [];
    children.forEach((child) => {
      const isDisallowed = disallowedIds.has(child.id);
      result.push({ ...child, depth, isDisallowed });
      if (!isDisallowed) {
        result = result.concat(buildFolderTree(child.id, depth + 1));
      }
    });
    return result;
  };

  const treeList = buildFolderTree(null, 0);

  const handleConfirmMove = async () => {
    if (selectedFolderId === currentParentId) {
      onClose();
      return;
    }

    setMoving(true);
    setError("");
    try {
      await onMove(item, selectedFolderId);
      onClose();
    } catch (err) {
      console.error("Move failed:", err);
      setError(err.message || "Failed to move item.");
      setMoving(false);
    }
  };

  return (
    <div className="udm-overlay" onClick={onClose}>
      <div className="udm-card" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="udm-header">
          <div className="udm-header-left">
            <div
              className="kpi-icon-wrap"
              style={{ width: "36px", height: "36px", color: "#2563EB", backgroundColor: "#EFF6FF" }}
            >
              <FolderSymlink size={18} />
            </div>
            <div>
              <h2 className="udm-title">Move "{itemName}"</h2>
              <p className="udm-subtitle">Select a destination folder</p>
            </div>
          </div>
          <button className="udm-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {error && <div className="login-error">{error}</div>}

        {/* Folder Selection List */}
        <div
          style={{
            maxHeight: "260px",
            overflowY: "auto",
            border: "1px solid #E2E8F0",
            borderRadius: "10px",
            background: "#F8FAFC",
            padding: "6px",
          }}
        >
          {loading ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#94A3B8", fontSize: "0.85rem" }}>
              Loading folders…
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {/* Root / All Documents Option */}
              <button
                type="button"
                onClick={() => setSelectedFolderId(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "none",
                  background: selectedFolderId === null ? "#EFF6FF" : "transparent",
                  color: selectedFolderId === null ? "#2563EB" : "#1E293B",
                  fontWeight: selectedFolderId === null ? 600 : 500,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Home size={16} color={selectedFolderId === null ? "#2563EB" : "#64748B"} />
                  <span>All Documents (Root)</span>
                </div>
                {selectedFolderId === null && <Check size={16} color="#2563EB" />}
              </button>

              {/* Subfolders list */}
              {treeList.map((f) => {
                const isSelected = selectedFolderId === f.id;
                const isCurrentLoc = currentParentId === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    disabled={f.isDisallowed}
                    onClick={() => !f.isDisallowed && setSelectedFolderId(f.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      paddingLeft: `${12 + (f.depth + 1) * 16}px`,
                      borderRadius: "8px",
                      border: "none",
                      background: isSelected ? "#EFF6FF" : "transparent",
                      color: f.isDisallowed
                        ? "#CBD5E1"
                        : isSelected
                        ? "#2563EB"
                        : "#1E293B",
                      fontWeight: isSelected ? 600 : 500,
                      fontSize: "0.85rem",
                      cursor: f.isDisallowed ? "not-allowed" : "pointer",
                      textAlign: "left",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                      <Folder
                        size={15}
                        fill={isSelected ? "#93C5FD" : "#FDE68A"}
                        color={isSelected ? "#2563EB" : "#D97706"}
                      />
                      <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {f.name} {isCurrentLoc && <span style={{ fontSize: "0.75rem", color: "#94A3B8" }}>(current)</span>}
                      </span>
                    </div>
                    {isSelected && <Check size={16} color="#2563EB" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="udm-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={moving}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleConfirmMove}
            disabled={moving || loading || selectedFolderId === currentParentId}
            style={{ flex: 1 }}
          >
            {moving ? "Moving…" : "Move Here"}
          </button>
        </div>
      </div>
    </div>
  );
}
