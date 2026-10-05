import { Eye, Download, Upload, Edit3, FolderSymlink, Trash2, FolderOpen } from "lucide-react";

/**
 * The per-item "⋮" dropdown used by both the grid and list layouts.
 *
 * Rendered as one component so the action set can never drift between the two
 * views, and so `canManage` is applied in exactly one place.
 */
export default function DriveItemMenu({
  row, // { kind: 'folder' | 'document', id, data }
  canManage,
  canOpen,
  onOpen,
  onDownload,
  onNewVersion,
  onRename,
  onMove,
  onDelete,
  onOpenFolder,
}) {
  const isFolder = row.kind === "folder";

  return (
    <>
      {isFolder ? (
        <button type="button" className="doc-folder-card-menu-item" onClick={onOpenFolder}>
          <FolderOpen size={14} /> Open
        </button>
      ) : (
        canOpen && (
          <button type="button" className="doc-folder-card-menu-item" onClick={onOpen}>
            <Eye size={14} /> Preview
          </button>
        )
      )}

      {!isFolder && (
        <button type="button" className="doc-folder-card-menu-item" onClick={onDownload}>
          <Download size={14} /> Download
        </button>
      )}

      {canManage && !isFolder && (
        <button type="button" className="doc-folder-card-menu-item" onClick={onNewVersion}>
          <Upload size={14} /> New version
        </button>
      )}

      {canManage && (
        <>
          <button type="button" className="doc-folder-card-menu-item" onClick={onRename}>
            <Edit3 size={14} /> Rename
          </button>
          <button type="button" className="doc-folder-card-menu-item" onClick={onMove}>
            <FolderSymlink size={14} /> Move to…
          </button>
          <button type="button" className="doc-folder-card-menu-item danger" onClick={onDelete}>
            <Trash2 size={14} /> Delete
          </button>
        </>
      )}
    </>
  );
}