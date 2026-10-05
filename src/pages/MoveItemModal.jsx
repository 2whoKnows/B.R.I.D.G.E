import { useState, useEffect, useMemo } from "react";
import { FolderSymlink, X, Folder, Home, Check } from "lucide-react";
import { getAllFolders } from "../lib/documentQueries";
import { collectDescendantIds, flattenFolderTree } from "../lib/driveTree";
import "../styles/UploadDocumentModal.css";
import "../styles/Login.css";

export default function MoveItemModal({
  item, // { type: 'folder' | 'document' | 'multiple', ... , rows?: Row[] }
  onClose,
  onMove,
}) {
  /**
   * A single target behaves exactly as before; a multi-selection is normalised
   * into the same `rows` shape so the picker and the disabled-target logic only
   * ever deal with one code path.
   */
  const isMulti = item?.type === "multiple";
  const rows = useMemo(() => {
    if (isMulti) return Array.isArray(item.rows) ? item.rows : [];
    return item ? [{ kind: item.type, id: item.id, data: item }] : [];
  }, [isMulti, item]);

  const folderCount = rows.filter((r) => r.kind === "folder").length;
  const docCount = rows.length - folderCount;

  const label = isMulti
    ? `${rows.length} selected item${rows.length === 1 ? "" : "s"}`
    : item?.type === "folder"
    ? item?.name
    : item?.title;

  // A folder is "already here" when its current parent equals the target.
  const currentParentId = isMulti ? null : item?.type === "folder" ? item?.parent_id : item?.folder_id;

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

  // Folders that cannot receive this move: for every selected folder, itself
  // plus its whole subtree (you cannot nest a folder inside its own children).
  const disallowedIds = useMemo(() => {
    const blocked = new Set();
    for (const row of rows) {
      if (row.kind !== "folder") continue;
      collectDescendantIds(row.id, allFolders).forEach((id) => blocked.add(id));
    }
    return blocked;
  }, [rows, allFolders]);

  // Ordered, depth-annotated folder list with the blocked ones flagged.
  const treeList = useMemo(
    () => flattenFolderTree(allFolders).map((f) => ({ ...f, isDisallowed: disallowedIds.has(f.id) })),
    [allFolders, disallowedIds],
  );

  /**
   * A move is a no-op when every selected folder already lives in the target
   * and there is nothing else to do.
   */
  const isAlreadyThere =
    !isMulti && selectedFolderId === (currentParentId ?? null);

  const handleConfirmMove = async () => {
    if (isAlreadyThere) {
      onClose();
      return;
    }
    if (disallowedIds.has(selectedFolderId)) {
      setError("A folder cannot be moved into itself or one of its subfolders.");
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
              <h2 className="udm-title">
                {isMulti ? `Move ${label}` : `Move "${label}"`}
              </h2>
              <p className="udm-subtitle">
                {isMulti
                  ? `${folderCount} folder${folderCount === 1 ? "" : "s"} and ${docCount} file${
                      docCount === 1 ? "" : "s"
                    } — select a destination folder`
                  : "Select a destination folder"}
              </p>
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
                  <span>My Drive (Root)</span>
                </div>
                {selectedFolderId === null && <Check size={16} color="#2563EB" />}
              </button>

              {/* Subfolders list */}
              {treeList.map((f) => {
                const isSelected = selectedFolderId === f.id;
                // Multi-item moves have no single "current" folder, so the
                // marker is only meaningful for a single-item move.
                const isCurrentLoc = !isMulti && (currentParentId ?? null) === f.id;
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
            disabled={moving || loading || isAlreadyThere || (disallowedIds.size > 0 && disallowedIds.has(selectedFolderId))}
            style={{ flex: 1 }}
          >
            {moving ? "Moving…" : isMulti ? `Move ${rows.length} Items` : "Move Here"}
          </button>
        </div>
      </div>
    </div>
  );
}
