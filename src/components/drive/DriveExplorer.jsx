import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Plus, Upload, Trash2, Edit3, Folder, FolderPlus, FolderUp, FolderOpen,
  FolderSymlink, MoreVertical, ChevronRight, Home, Files, ArrowLeft, LayoutGrid,
  List as ListIcon, FileText, FileCode, FileSpreadsheet, File as FileIcon, X,
  Download, Star, Loader2, Check, FolderTree, CheckSquare,
} from "lucide-react";
import {
  listDocumentsWithStats, getCategories, listFolders, getAllFolders, createFolder,
  deleteDocuments, deleteFolders, renameFolder, renameDocument, moveDocuments,
  moveFolders, uploadNewDocument, uploadNewVersion, downloadDocument,
} from "../../lib/documentQueries";
import { buildFolderTrail, buildFolderIndex, flattenFolderTree, collectDescendantIds } from "../../lib/driveTree";
import UploadDocumentModal from "../../pages/UploadDocumentModal";
import CreateFolderModal from "../../pages/CreateFolderModal";
import BulkUploadModal from "../../pages/BulkUploadModal";
import RenameModal from "../../pages/RenameModal";
import MoveItemModal from "../../pages/MoveItemModal";
import ConfirmDeleteModal from "../../pages/ConfirmDeleteModal";
import DriveItemMenu from "./DriveItemMenu";
import "../../styles/DriveExplorer.css";

// These stay module-private (no `export`) so this file only exports the
// component, which keeps React Fast Refresh working during development.
const FOLDER = "folder";
const DOC = "document";
const keyOf = (kind, id) => `${kind}:${id}`;

/** Custom MIME type distinguishes "dragging rows" from "dropping OS files". */
const ROWS_MIME = "application/x-bridge-rows";

function formatFileSize(bytes) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function fileIcon(fileType) {
  const type = (fileType || "").toLowerCase();
  if (type.includes("pdf")) return <FileText size={20} color="#DC2626" />;
  if (type.includes("xls") || type.includes("sheet") || type.includes("csv"))
    return <FileSpreadsheet size={20} color="#16A34A" />;
  if (type.includes("doc") || type.includes("word")) return <FileText size={20} color="#2563EB" />;
  if (type.includes("ppt") || type.includes("presentation")) return <FileText size={20} color="#EA580C" />;
  if (type.includes("js") || type.includes("html") || type.includes("code"))
    return <FileCode size={20} color="#7C3AED" />;
  return <FileIcon size={20} color="#64748B" />;
}

/** True when the drag payload is an OS file drop (upload) rather than a row drag. */
const isFileDrag = (e) => e.dataTransfer?.types?.includes("Files");

/**
 * Recursively reads a dropped directory tree (via the non-standard but
 * universally supported `webkitGetAsEntry`) into a flat list of files tagged
 * with their relative path, so a dropped folder can be recreated as nested
 * folders by BulkUploadModal.
 *
 * Defined at module scope (not inside the component) because it recurses into
 * itself, and a self-referencing callback would capture a stale reference.
 */
function traverseFileTree(item, path = "") {
  return new Promise((resolve) => {
    if (item.isFile) {
      item.file((file) =>
        resolve([{ file, name: file.name, relativePath: path ? `${path}/${file.name}` : file.name }]),
      );
    } else if (item.isDirectory) {
      const dirReader = item.createReader();
      const entries = [];
      const readEntries = () => {
        dirReader.readEntries(async (result) => {
          if (result.length === 0) {
            const nested = [];
            for (const child of entries) {
              const childFiles = await traverseFileTree(child, path ? `${path}/${item.name}` : item.name);
              nested.push(...childFiles);
            }
            resolve(nested);
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
}

/**
 * Single source of truth for the Google-Drive-style browser.
 *
 * The same component powers the manager Documents tab, the manager Dashboard
 * and the teacher library, so folder navigation, multi-select and the item
 * menus can never drift apart between tabs.
 *
 * `canManage` gates every organising/destructive affordance, so a teacher sees
 * the identical folder structure and navigation but only read/download actions.
 */
export default function DriveExplorer({
  canManage = false,
  userId = null,
  role = null,
  onOpenDocument = null,
  favorites = [],
  onToggleFavorite = null,
  initialFolderId = null,
  initialSearch = "",
  compact = false,
  // Label for the root of the tree. Managers own the structure and call it
  // "My Drive"; for teachers this is a read-only view of what was shared, so
  // their portal labels the same root "Documents".
  rootLabel = "My Drive",
}) {
  const [currentFolderId, setCurrentFolderId] = useState(initialFolderId);
  const [folders, setFolders] = useState([]);
  const [allFolders, setAllFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState(compact ? "grid" : "list");
  const [search, setSearch] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("");

  // Multi-selection. `lastAnchorIndex` is what makes shift-click pick a range.
  // Selection is opt-in: `selectionMode` is toggled by the "Select" button, and
  // checkboxes / select-all stay hidden until then (like Google Drive).
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const lastAnchorIndex = useRef(null);

  const [showNewMenu, setShowNewMenu] = useState(false);
  const newMenuRef = useRef(null);
  const [activeMenuKey, setActiveMenuKey] = useState(null);
  const activeMenuRef = useRef(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState("create");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkUploadTab, setBulkUploadTab] = useState("files");
  const [bulkDroppedItems, setBulkDroppedItems] = useState([]);

  const [renameTarget, setRenameTarget] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [isDragOverPage, setIsDragOverPage] = useState(false);
  const [dropFolderId, setDropFolderId] = useState(null);
  const dragCounter = useRef(0);
  const [toast, setToast] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [folderList, docList, catList, tree] = await Promise.all([
        listFolders(currentFolderId),
        listDocumentsWithStats(currentFolderId),
        getCategories(),
        getAllFolders(),
      ]);
      setFolders(folderList);
      setDocuments(docList);
      setCategories(catList);
      setAllFolders(tree);
    } catch (err) {
      console.error("Failed to load drive contents:", err);
    } finally {
      setLoading(false);
    }
  }, [currentFolderId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target)) setShowNewMenu(false);
      if (activeMenuRef.current && !activeMenuRef.current.contains(e.target)) setActiveMenuKey(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Changing folder invalidates the selection: rows may no longer be visible.
  // Done in the navigation handlers (not an effect) to avoid a cascading render.
  const goToFolder = useCallback((id) => {
    setCurrentFolderId(id);
    setSelected(new Set());
    lastAnchorIndex.current = null;
  }, []);

  const showToast = useCallback((message, tone = "success") => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 3200);
  }, []);

  // --- Derived data --------------------------------------------------------
  const breadcrumbs = useMemo(
    () => buildFolderTrail(currentFolderId, allFolders),
    [currentFolderId, allFolders],
  );
  const folderIndex = useMemo(() => buildFolderIndex(allFolders), [allFolders]);

  const filteredFolders = useMemo(
    () =>
      folders.filter((f) => {
        const matchesSearch = search === "" || (f.name || "").toLowerCase().includes(search.toLowerCase());
        const matchesCat = categoryFilter === "" || f.category_id?.toString() === categoryFilter;
        return matchesSearch && matchesCat;
      }),
    [folders, search, categoryFilter],
  );

  const filteredDocs = useMemo(
    () =>
      documents.filter((doc) => {
        const matchesSearch =
          search === "" ||
          (doc.title || "").toLowerCase().includes(search.toLowerCase()) ||
          (doc.description || "").toLowerCase().includes(search.toLowerCase());
        const matchesCat = categoryFilter === "" || doc.category_id?.toString() === categoryFilter;
        const latest = doc.document_versions?.[0];
        const fileType = (latest?.file_type || latest?.mime_type || "").toLowerCase();
        const matchesFileType = fileTypeFilter === "" || fileType.includes(fileTypeFilter.toLowerCase());
        return matchesSearch && matchesCat && matchesFileType;
      }),
    [documents, search, categoryFilter, fileTypeFilter],
  );

  /**
   * One ordered list of visible rows. Shift-click ranges are computed against
   * this array, so folders and files take part in the same selection in exactly
   * the order they are rendered (folders first).
   */
  const visibleRows = useMemo(
    () => [
      ...filteredFolders.map((f) => ({ kind: FOLDER, id: f.id, data: f })),
      ...filteredDocs.map((d) => ({ kind: DOC, id: d.id, data: d })),
    ],
    [filteredFolders, filteredDocs],
  );

  const selectedRows = useMemo(
    () => visibleRows.filter((row) => selected.has(keyOf(row.kind, row.id))),
    [visibleRows, selected],
  );
  const selectedDocRows = selectedRows.filter((r) => r.kind === DOC);
  const selectedFolderRows = selectedRows.filter((r) => r.kind === FOLDER);
  const selectedCount = selectedRows.length;
  const allVisibleSelected = visibleRows.length > 0 && selectedCount === visibleRows.length;

  const indexOfRow = useCallback(
    (row) => visibleRows.findIndex((r) => r.kind === row.kind && r.id === row.id),
    [visibleRows],
  );

  // --- Selection ----------------------------------------------------------
  const selectOnly = useCallback((key) => setSelected(new Set([key])), []);

  const toggleOne = useCallback((key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectRange = useCallback(
    (from, to) => {
      const [start, end] = from <= to ? [from, to] : [to, from];
      const range = visibleRows.slice(start, end + 1).map((r) => keyOf(r.kind, r.id));
      setSelected((prev) => new Set([...prev, ...range]));
    },
    [visibleRows],
  );

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    lastAnchorIndex.current = null;
  }, []);

  const handleSelectAll = useCallback(() => {
    if (allVisibleSelected) setSelected(new Set());
    else setSelected(new Set(visibleRows.map((r) => keyOf(r.kind, r.id))));
    lastAnchorIndex.current = null;
  }, [allVisibleSelected, visibleRows]);

  /** Ctrl/Cmd-click toggle and Shift-click range, shared by every renderer. */
  const selectRow = useCallback(
    (event, row, index) => {
      const key = keyOf(row.kind, row.id);
      // A context menu acts on exactly the row it was opened on.
      if (event.type === "contextmenu") return selectOnly(key);
      if (event.shiftKey && lastAnchorIndex.current != null) {
        selectRange(lastAnchorIndex.current, index);
        return;
      }
      if (event.ctrlKey || event.metaKey) {
        toggleOne(key);
        lastAnchorIndex.current = index;
        return;
      }
      selectOnly(key);
      lastAnchorIndex.current = index;
    },
    [selectOnly, selectRange, toggleOne],
  );

  /** Opens a row: teachers preview a document, managers enter a folder. */
  const openRow = useCallback(
    (row) => {
      if (row.kind === FOLDER) goToFolder(row.id);
      else if (onOpenDocument) onOpenDocument(row.data);
    },
    [goToFolder, onOpenDocument],
  );

  /**
   * The single click handler for a row.
   *
   * Outside selection mode a plain click opens the item (enter folder / preview
   * document) and never changes the selection, so checkboxes can stay hidden.
   * Inside selection mode the same click selects instead.
   */
  const handleRowClick = useCallback(
    (event, row, index) => {
      if (!selectionMode) {
        // Modifier-clicks are reserved for selection, which is off right now.
        if (event.ctrlKey || event.metaKey || event.shiftKey) return;
        openRow(row);
        return;
      }
      selectRow(event, row, index);
    },
    [selectionMode, selectRow, openRow],
  );

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelected(new Set());
    lastAnchorIndex.current = null;
  }, []);

  const enterSelectionMode = useCallback(() => setSelectionMode(true), []);

  // Ctrl/Cmd+A selects everything in view (only while selection mode is on);
  // Escape leaves selection mode. Both match Drive.
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        if (!selectionMode) return; // don't hijack select-all in the search box
        e.preventDefault();
        handleSelectAll();
      } else if (e.key === "Escape") {
        setShowNewMenu(false);
        setActiveMenuKey(null);
        if (selectionMode) exitSelectionMode();
        else clearSelection();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSelectAll, clearSelection, selectionMode, exitSelectionMode]);

  // --- Item actions --------------------------------------------------------
  const currentFolderName = breadcrumbs[breadcrumbs.length - 1]?.name || rootLabel;

  const downloadOne = useCallback(
    async (doc) => {
      const ver = doc.document_versions?.[0];
      if (!ver) {
        showToast("This document has no uploaded file yet.", "error");
        return;
      }
      try {
        await downloadDocument(doc.id, ver.id, ver.file_path, userId, role, ver.file_name || doc.title);
      } catch (err) {
        console.error("Download error:", err);
        showToast(err.message || "Download failed.", "error");
      }
    },
    [userId, role, showToast],
  );

  const handleDownloadSelected = useCallback(async () => {
    // Sequential on purpose: firing many parallel downloads of large files gets
    // throttled by the browser and trips "multiple downloads" prompts.
    for (const row of selectedDocRows) await downloadOne(row.data);
    showToast(`Downloading ${selectedDocRows.length} file(s).`);
    clearSelection();
  }, [selectedDocRows, downloadOne, showToast, clearSelection]);

  const handleCreateFolder = useCallback(
    async ({ name, categoryId }) => {
      await createFolder({ name, parentId: currentFolderId, categoryId, createdBy: userId });
      await fetchData();
      showToast(`Folder "${name}" created.`);
    },
    [currentFolderId, userId, fetchData, showToast],
  );

  const handleRename = useCallback(
    async (item, newName) => {
      if (item.type === FOLDER) await renameFolder(item.id, newName);
      else await renameDocument(item.id, newName);
      await fetchData();
      showToast(`Renamed to "${newName}".`);
    },
    [fetchData, showToast],
  );

  /**
 * Moves an arbitrary set of rows at once - shared by the "Move to..." dialog
   * and by folder drop targets, so both paths behave identically.
   */
  const executeMove = useCallback(
    async (rows, targetFolderId) => {
      const folderIds = rows.filter((r) => r.kind === FOLDER).map((r) => r.id);
      const docIds = rows.filter((r) => r.kind === DOC).map((r) => r.id);

      if (folderIds.length > 0) await moveFolders(folderIds, targetFolderId, allFolders);
      if (docIds.length > 0) await moveDocuments(docIds, targetFolderId);

      await fetchData();
      clearSelection();
      const destination = targetFolderId
        ? allFolders.find((f) => f.id === targetFolderId)?.name || "the selected folder"
        : rootLabel;
      showToast(`Moved ${rows.length} item(s) to ${destination}.`);
    },
    [allFolders, fetchData, clearSelection, showToast, rootLabel],
  );

  const handleMoveConfirm = useCallback(
    (item, targetFolderId) => {
      const rows =
        item?.type === "multiple" && Array.isArray(item.rows) ? item.rows : [{ kind: item.type, id: item.id }];
      return executeMove(rows, targetFolderId);
    },
    [executeMove],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "bulk") {
        await deleteFolders(deleteTarget.folderIds);
        await deleteDocuments(deleteTarget.documents);
      } else if (deleteTarget.type === FOLDER) {
        await deleteFolders([deleteTarget.folder.id]);
      } else {
        await deleteDocuments([deleteTarget.doc]);
      }
      setDeleteTarget(null);
      clearSelection();
      await fetchData();
      showToast("Deleted successfully.");
    } catch (err) {
      console.error("Failed to delete:", err);
      throw err;
    }
  }, [deleteTarget, fetchData, clearSelection, showToast]);

  const handleUploadSubmit = useCallback(
    async (uploadData) => {
      try {
        if (uploadMode === "create") {
          await uploadNewDocument({ ...uploadData, userId, folderId: currentFolderId || null });
        } else if (selectedDoc) {
          const nextVersion = (selectedDoc.current_version || 0) + 1;
          await uploadNewVersion({
            documentId: selectedDoc.id,
            nextVersion,
            file: uploadData.file,
            userId,
            changeNotes: uploadData.changeNotes,
          });
        }
        setShowUploadModal(false);
        await fetchData();
        showToast("Upload complete.");
      } catch (err) {
        console.error("Upload failed:", err);
        throw err;
      }
    },
    [uploadMode, selectedDoc, userId, currentFolderId, fetchData, showToast],
  );

  const startRename = useCallback((row) => {
    setActiveMenuKey(null);
    setRenameTarget(
      row.kind === FOLDER
        ? { type: FOLDER, id: row.id, name: row.data.name }
        : { type: DOC, id: row.id, title: row.data.title },
    );
  }, []);

  const startMove = useCallback((rows) => {
    setActiveMenuKey(null);
    if (rows.length === 1) {
      const row = rows[0];
      setMoveTarget(
        row.kind === FOLDER
          ? { type: FOLDER, id: row.id, name: row.data.name, parent_id: row.data.parent_id }
          : { type: DOC, id: row.id, title: row.data.title, folder_id: row.data.folder_id },
      );
    } else {
      setMoveTarget({ type: "multiple", rows, items: rows });
    }
  }, []);

  const startDelete = useCallback((rows) => {
    setActiveMenuKey(null);
    if (rows.length === 1) {
      const row = rows[0];
      setDeleteTarget(row.kind === FOLDER ? { type: FOLDER, folder: row.data } : { type: DOC, doc: row.data });
    } else {
      setDeleteTarget({
        type: "bulk",
        folderIds: rows.filter((r) => r.kind === FOLDER).map((r) => r.id),
        documents: rows.filter((r) => r.kind === DOC).map((r) => r.data),
      });
    }
  }, []);

  const startNewVersion = useCallback((doc) => {
    setActiveMenuKey(null);
    setSelectedDoc(doc);
    setUploadMode("version");
    setShowUploadModal(true);
  }, []);


  const handlePageDragEnter = useCallback((e) => {
    if (!isFileDrag(e)) return; // internal row drag, not an upload
    e.preventDefault();
    dragCounter.current += 1;
    if (canManage) setIsDragOverPage(true);
  }, [canManage]);

  const handlePageDragLeave = useCallback((e) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      setIsDragOverPage(false);
      dragCounter.current = 0;
    }
  }, []);

  const handlePageDragOver = useCallback((e) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
  }, []);

  const handlePageDrop = useCallback(
    async (e) => {
      // A row drop handled by a folder target must not also trigger an upload.
      if (!isFileDrag(e)) return;
      e.preventDefault();
      setIsDragOverPage(false);
      dragCounter.current = 0;

      const items = e.dataTransfer.items;
      if (!items || items.length === 0) return;

      const collected = [];
      const promises = [];
      let hasDirectories = false;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.webkitGetAsEntry) {
          const entry = item.webkitGetAsEntry();
          if (entry) {
            if (entry.isDirectory) hasDirectories = true;
            promises.push(traverseFileTree(entry));
          }
        } else if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) collected.push({ file, name: file.name, relativePath: file.name });
        }
      }

      const results = await Promise.all(promises);
      results.forEach((list) => collected.push(...list));

      if (collected.length > 0) {
        setBulkDroppedItems(collected);
        setBulkUploadTab(hasDirectories ? "folder" : "files");
        setShowBulkUploadModal(true);
      }
    },
    // traverseFileTree is module-scoped and stable, so no dependency is needed.
    [],
  );

  // --- Row drag-and-drop onto folders (move) ---------------------------------
  const handleRowDragStart = useCallback(
    (e, row) => {
      const key = keyOf(row.kind, row.id);
      // Dragging an unselected row drags only that row, like a file manager.
      const keys = selected.has(key) ? [...selected] : [key];
      if (!selected.has(key)) setSelected(new Set([key]));
      e.dataTransfer.setData(ROWS_MIME, JSON.stringify(keys));
      e.dataTransfer.setData("text/plain", keys.join(","));
      e.dataTransfer.effectAllowed = "move";
    },
    [selected],
  );

  const handleRowDragEnd = useCallback(() => setDropFolderId(null), []);

  const handleFolderDragOver = useCallback((e, folderId) => {
    if (!e.dataTransfer?.types?.includes(ROWS_MIME)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDropFolderId(folderId);
  }, []);

  const handleFolderDragLeave = useCallback((e, folderId) => {
    e.preventDefault();
    e.stopPropagation();
    setDropFolderId((current) => (current === folderId ? null : current));
  }, []);

  const handleFolderDrop = useCallback(
    async (e, targetFolderId) => {
      const payload = e.dataTransfer.getData(ROWS_MIME);
      if (!payload) return; // not an internal row drag
      e.preventDefault();
      e.stopPropagation();
      setDropFolderId(null);

      let keys;
      try {
        keys = JSON.parse(payload);
      } catch {
        return;
      }

      // A folder can never be dropped inside itself or its own subtree.
      const blocked = new Set();
      for (const key of keys) {
        const [kind, id] = key.split(":");
        if (kind === FOLDER) collectDescendantIds(id, allFolders).forEach((d) => blocked.add(d));
      }
      if (blocked.has(targetFolderId)) {
        showToast("A folder cannot be moved into itself.", "error");
        return;
      }

      const rows = visibleRows.filter((row) => keys.includes(keyOf(row.kind, row.id)));
      if (rows.length === 0) return;

      try {
        await executeMove(rows, targetFolderId);
      } catch (err) {
        console.error("Move failed:", err);
        showToast(err.message || "Move failed.", "error");
      }
    },
    [allFolders, visibleRows, executeMove, showToast],
  );

  const sideTree = useMemo(() => flattenFolderTree(allFolders), [allFolders]);

  const childCountOf = useCallback(
    (parentId) => (folderIndex.get(parentId ?? null) ?? []).length,
    [folderIndex],
  );

  /** Folders that cannot be a move destination for the current selection. */
  const blockedTargets = useMemo(() => {
    const blocked = new Set();
    for (const row of selectedFolderRows) {
      collectDescendantIds(row.id, allFolders).forEach((id) => blocked.add(id));
    }
    return blocked;
  }, [selectedFolderRows, allFolders]);

  // --- Shared row rendering helpers -----------------------------------------
  const toggleCheckbox = (e, row, index) => {
    e.stopPropagation();
    if (e.shiftKey && lastAnchorIndex.current != null) {
      selectRange(lastAnchorIndex.current, index);
    } else {
      toggleOne(keyOf(row.kind, row.id));
      lastAnchorIndex.current = index;
    }
  };

  /**
   * Returns null unless selection mode is active, so checkboxes are not merely
   * hidden with CSS - they are absent from the DOM and out of the tab order.
   */
  const renderCheckbox = (row, index) => {
    if (!selectionMode) return null;
    const isChecked = selected.has(keyOf(row.kind, row.id));
    return (
      <span
        role="checkbox"
        aria-checked={isChecked}
        tabIndex={0}
        aria-label={`Select ${row.kind === FOLDER ? "folder" : "file"} ${row.data.name || row.data.title}`}
        className={`gd-checkbox ${isChecked ? "checked" : ""}`}
        onClick={(e) => toggleCheckbox(e, row, index)}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            toggleCheckbox(e, row, index);
          }
        }}
      >
        {isChecked && <Check size={12} strokeWidth={3.5} />}
      </span>
    );
  };

  const menuHandlers = (row) => ({
    canManage,
    canOpen: Boolean(onOpenDocument),
    onOpen: () => {
      setActiveMenuKey(null);
      if (row.kind === DOC && onOpenDocument) onOpenDocument(row.data);
    },
    onDownload: (e) => {
      setActiveMenuKey(null);
      downloadOne(row.data);
      e?.stopPropagation?.();
    },
    onNewVersion: () => startNewVersion(row.data),
    onRename: () => startRename(row),
    onMove: () => startMove([row]),
    onDelete: () => startDelete([row]),
    onOpenFolder: () => {
      setActiveMenuKey(null);
      goToFolder(row.id);
    },
  });

  const toggleFavoriteOn = useCallback(
    (docId, e) => {
      // Toggling the star must not also select the row it sits on.
      e?.stopPropagation();
      onToggleFavorite?.(docId, e);
    },
    [onToggleFavorite],
  );

  const rowClass = (row) => (selected.has(keyOf(row.kind, row.id)) ? "selected" : "");

  const NewMenu = canManage ? (
    <div style={{ position: "relative" }} ref={newMenuRef}>
      <button
        type="button"
        className="gd-btn-new"
        onClick={() => setShowNewMenu(!showNewMenu)}
        aria-label="New creation options"
      >
        <div className="gd-btn-new-icon">
          <Plus size={20} strokeWidth={2.5} />
        </div>
        <span>New</span>
      </button>

      {showNewMenu && (
        <div className="gd-new-dropdown">
          <button
            type="button"
            className="gd-new-menu-item"
            onClick={() => {
              setShowNewMenu(false);
              setShowCreateFolderModal(true);
            }}
          >
            <FolderPlus size={18} color="#D97706" />
            <span>New folder</span>
          </button>

          <div className="gd-menu-divider" />

          <button
            type="button"
            className="gd-new-menu-item"
            onClick={() => {
              setShowNewMenu(false);
              setUploadMode("create");
              setSelectedDoc(null);
              setShowUploadModal(true);
            }}
          >
            <Upload size={18} color="#2563EB" />
            <span>File upload</span>
          </button>

          <button
            type="button"
            className="gd-new-menu-item"
            onClick={() => {
              setShowNewMenu(false);
              setBulkDroppedItems([]);
              setBulkUploadTab("folder");
              setShowBulkUploadModal(true);
            }}
          >
            <FolderUp size={18} color="#059669" />
            <span>Folder upload</span>
          </button>

          <button
            type="button"
            className="gd-new-menu-item"
            onClick={() => {
              setShowNewMenu(false);
              setBulkDroppedItems([]);
              setBulkUploadTab("files");
              setShowBulkUploadModal(true);
            }}
          >
            <Files size={18} color="#4F46E5" />
            <span>Bulk file upload</span>
          </button>
        </div>
      )}
    </div>
  ) : null;

  // The Drive multi-select bar. Shown for the whole time selection mode is on
  // (not only once items are picked) so Cancel / Done are always reachable.
  const selectionBar = selectionMode ? (
    <div className="gd-selection-bar" role="toolbar" aria-label="Selection actions">
      <strong className="gd-selection-count">
        {selectedCount > 0
          ? `${selectedCount} item${selectedCount === 1 ? "" : "s"} selected`
          : "Select items"}
      </strong>

      <div className="gd-selection-actions">
        <button
          type="button"
          className="gd-selection-btn"
          onClick={handleSelectAll}
          disabled={visibleRows.length === 0}
        >
          <CheckSquare size={16} />
          {allVisibleSelected ? "Deselect all" : "Select all"}
        </button>

        {selectedDocRows.length > 0 && (
          <button type="button" className="gd-selection-btn" onClick={handleDownloadSelected}>
            <Download size={16} /> Download
          </button>
        )}

        {canManage && (
          <>
            <button
              type="button"
              className="gd-selection-btn"
              onClick={() => startMove(selectedRows)}
              disabled={selectedCount === 0 || blockedTargets.has(currentFolderId)}
              title={
                blockedTargets.has(currentFolderId)
                  ? "These folders are already inside this folder"
                  : "Move the selection into another folder"
              }
            >
              <FolderSymlink size={16} /> Move to...
            </button>

            {selectedCount === 1 && (
              <button type="button" className="gd-selection-btn" onClick={() => startRename(selectedRows[0])}>
                <Edit3 size={16} /> Rename
              </button>
            )}

            <button
              type="button"
              className="gd-selection-btn danger"
              onClick={() => startDelete(selectedRows)}
              disabled={selectedCount === 0}
            >
              <Trash2 size={16} /> Delete
            </button>
          </>
        )}

        {/* Exit points, matching Drive: Cancel discards, Done confirms. */}
        <button type="button" className="gd-selection-btn ghost" onClick={exitSelectionMode}>
          Cancel
        </button>
        <button type="button" className="gd-selection-btn primary" onClick={exitSelectionMode}>
          Done
        </button>
      </div>
    </div>
  ) : null;

  const breadcrumbBar = (
    <div className="doc-breadcrumb-bar gd-breadcrumbs">
      <div className="doc-breadcrumb">
        {breadcrumbs.map((seg, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <span key={seg.id || "root"} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              {idx > 0 && (
                <span className="doc-breadcrumb-sep">
                  <ChevronRight size={15} />
                </span>
              )}
              <button
                type="button"
                className={`doc-breadcrumb-seg ${isLast ? "current" : ""}`}
                onClick={() => goToFolder(seg.id)}
                disabled={isLast}
              >
                {idx === 0 ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <Home size={15} /> {rootLabel}
                  </span>
                ) : (
                  seg.name
                )}
              </button>
            </span>
          );
        })}
      </div>

      <div className="gd-breadcrumb-actions">
        {breadcrumbs.length > 1 && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => goToFolder(breadcrumbs[breadcrumbs.length - 2].id)}
            style={{ fontSize: "0.8125rem" }}
          >
            <ArrowLeft size={14} /> Back
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={`gd-explorer ${compact ? "gd-explorer-compact" : ""} ${
        selectionMode ? "selection-active" : ""
      }`}
      onDragEnter={handlePageDragEnter}
      onDragOver={handlePageDragOver}
      onDragLeave={handlePageDragLeave}
      onDrop={handlePageDrop}
    >
      {isDragOverPage && canManage && (
        <div className="gd-drop-overlay">
          <div className="gd-drop-overlay-box">
            <Upload size={48} className="gd-bounce" />
            <h3>Drop files or folders here</h3>
            <p>
              Upload directly into <strong>{currentFolderName}</strong>
            </p>
          </div>
        </div>
      )}

      {toast && (
        <div className={`gd-toast ${toast.tone}`} role="status">
          {toast.tone === "success" ? <Check size={16} /> : <X size={16} />}
          {toast.message}
        </div>
      )}

      <div className="gd-layout">
        {/* Folder side tree - the same structure both portals navigate. */}
        {!compact && (
          <nav className="gd-tree" aria-label="Folders">
            <div className="gd-tree-header">
              <FolderTree size={15} />
              <span>Folders</span>
            </div>

            {/* My Drive doubles as a drop target so items can be moved to root. */}
            <button
              type="button"
              className={`gd-tree-item ${dropFolderId === null ? "drop-target" : ""}`}
              onClick={() => goToFolder(null)}
              draggable={canManage}
              onDragOver={(e) => handleFolderDragOver(e, null)}
              onDragLeave={(e) => handleFolderDragLeave(e, null)}
              onDrop={(e) => handleFolderDrop(e, null)}
            >
              <Home size={15} />
              <span className="gd-tree-name">{rootLabel}</span>
            </button>

            <div className="gd-tree-list">
              {sideTree.map((folder) => {
                const isBlocked = blockedTargets.has(folder.id);
                return (
                  <button
                    key={folder.id}
                    type="button"
                    style={{ paddingLeft: `${12 + folder.depth * 14}px` }}
                    className={`gd-tree-item ${currentFolderId === folder.id ? "active" : ""} ${
                      dropFolderId === folder.id ? "drop-target" : ""
                    } ${isBlocked ? "blocked" : ""}`}
                    onClick={() => goToFolder(folder.id)}
                    draggable={canManage && !isBlocked}
                    onDragOver={(e) => !isBlocked && handleFolderDragOver(e, folder.id)}
                    onDragLeave={(e) => handleFolderDragLeave(e, folder.id)}
                    onDrop={(e) => !isBlocked && handleFolderDrop(e, folder.id)}
                    title={isBlocked ? "A folder cannot be moved into itself" : folder.name}
                  >
                    <Folder
                      size={15}
                      fill={currentFolderId === folder.id ? "#BFDBFE" : "#FDE68A"}
                      color="#D97706"
                    />
                    <span className="gd-tree-name">{folder.name}</span>
                  </button>
                );
              })}
              {sideTree.length === 0 && <p className="gd-tree-empty">No folders yet.</p>}
            </div>
          </nav>
        )}

<div className="gd-main">
          <div className="filter-bar gd-toolbar">
            {NewMenu}

            {/* Entering selection mode reveals checkboxes and the action bar. */}
            {!selectionMode && (
              <button
                type="button"
                className="gd-select-toggle"
                onClick={enterSelectionMode}
                disabled={visibleRows.length === 0}
                title="Select multiple items"
              >
                <CheckSquare size={16} />
                Select
              </button>
            )}

            <div className="search-input-wrap" style={{ flex: 1 }}>
              <Search className="search-icon" size={18} />
              <input
                type="text"
                className="search-input"
                placeholder={`Search in ${rootLabel}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="gd-search-clear"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="filter-group">
              <select
                className="filter-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <select
                className="filter-select"
                value={fileTypeFilter}
                onChange={(e) => setFileTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="pdf">PDF Document</option>
                <option value="docx">Word (.docx)</option>
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="pptx">PowerPoint (.pptx)</option>
              </select>

              <div className="gd-view-toggle">
                <button
                  type="button"
                  className={`gd-view-btn ${viewMode === "list" ? "active" : ""}`}
                  onClick={() => setViewMode("list")}
                  title="List layout"
                >
                  <ListIcon size={18} />
                </button>
                <button
                  type="button"
                  className={`gd-view-btn ${viewMode === "grid" ? "active" : ""}`}
                  onClick={() => setViewMode("grid")}
                  title="Grid layout"
                >
                  <LayoutGrid size={18} />
                </button>
              </div>
            </div>
          </div>

          {selectionBar}
          {breadcrumbBar}

          {loading ? (
            <div className="gd-loading">
              <Loader2 size={22} className="animate-spin" /> Loading...
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="bridge-card gd-empty">
              <FolderOpen size={48} color="#CBD5E1" />
              <div className="gd-empty-title">This folder is empty</div>
              <p>
                {search || categoryFilter || fileTypeFilter
                  ? "No items match the current filters."
                  : canManage
                  ? "Drop files here or use the New button to add documents."
                  : "Nothing has been shared in this folder yet."}
              </p>
            </div>
          ) : (
            <>
              {/* --- Folders ------------------------------------------------- */}
              {filteredFolders.length > 0 && (
                <>
                  <div className="doc-folder-section-title">
                    <FolderOpen size={16} /> Folders ({filteredFolders.length})
                  </div>
                  <div className="doc-folder-grid">
                    {filteredFolders.map((folder) => {
                      const row = { kind: FOLDER, id: folder.id, data: folder };
                      const index = indexOfRow(row);
                      const isMenuOpen = activeMenuKey === keyOf(FOLDER, folder.id);

                      return (
                        <div
                          key={folder.id}
                          className={`doc-folder-card gd-folder-card ${rowClass(row)} ${
                            dropFolderId === folder.id ? "drop-target" : ""
                          }`}
                          role="option"
                          tabIndex={0}
                          aria-selected={selected.has(keyOf(FOLDER, folder.id))}
                          onClick={(e) => handleRowClick(e, row, index)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            selectRow(e, row, index);
                          }}
                                                    onKeyDown={(e) => {
                            if (e.key === "Enter") openRow(row);
                          }}
                          draggable={canManage}
                          onDragStart={(e) => handleRowDragStart(e, row)}
                          onDragEnd={handleRowDragEnd}
                          onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                          onDragLeave={(e) => handleFolderDragLeave(e, folder.id)}
                          onDrop={(e) => handleFolderDrop(e, folder.id)}
                        >
                          {renderCheckbox(row, index)}
                          <div className="doc-folder-card-icon">
                            <Folder size={22} fill="#FDE68A" />
                          </div>
                          <div className="doc-folder-card-info">
                            <span className="doc-folder-card-name" title={folder.name}>
                              {folder.name}
                            </span>
                            <span className="doc-folder-card-meta">
                              {childCountOf(folder.id)} subfolder{childCountOf(folder.id) === 1 ? "" : "s"}
                              {folder.categories?.name ? ` - ${folder.categories.name}` : ""}
                            </span>
                          </div>

                          <button
                            type="button"
                            className="doc-folder-card-menu-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuKey(isMenuOpen ? null : keyOf(FOLDER, folder.id));
                            }}
                            aria-label={`Options for folder ${folder.name}`}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {isMenuOpen && (
                            <div ref={activeMenuRef} className="doc-folder-card-menu" onClick={(e) => e.stopPropagation()}>
                              <DriveItemMenu row={row} {...menuHandlers(row)} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* --- Files --------------------------------------------------- */}
              {filteredDocs.length > 0 && (
                <>
                  {filteredFolders.length > 0 && (
                    <div className="doc-folder-section-title" style={{ marginTop: 8 }}>
                      <FileText size={16} /> Files ({filteredDocs.length})
                    </div>
                  )}

                  {viewMode === "grid" ? (
                    <div className="gd-file-grid" role="listbox" aria-multiselectable="true">
                      {filteredDocs.map((doc) => {
                        const row = { kind: DOC, id: doc.id, data: doc };
                        const index = indexOfRow(row);
                        const ver = doc.document_versions?.[0];
                        const isMenuOpen = activeMenuKey === keyOf(DOC, doc.id);
                        const isFav = favorites.includes(doc.id);

                        return (
                          <div
                            key={doc.id}
                            className={`gd-file-card ${rowClass(row)}`}
                            role="option"
                            tabIndex={0}
                            aria-selected={selected.has(keyOf(DOC, doc.id))}
                            onClick={(e) => handleRowClick(e, row, index)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              selectRow(e, row, index);
                            }}
                                                        onKeyDown={(e) => {
                              if (e.key === "Enter") openRow(row);
                            }}
                            draggable={canManage}
                            onDragStart={(e) => handleRowDragStart(e, row)}
                            onDragEnd={handleRowDragEnd}
                          >
                            {renderCheckbox(row, index)}

                            <div className="gd-file-card-header">
                              <div className="gd-file-card-icon">{fileIcon(ver?.file_type || ver?.mime_type)}</div>
                              {canManage && (
                                <span className="badge badge-green" style={{ fontSize: "0.6875rem" }}>
                                  v{doc.current_version || 1}
                                </span>
                              )}
                              <div className="gd-file-card-header-actions">
                                {onToggleFavorite && (
                                  <button
                                    type="button"
                                    className="gd-fav-btn"
                                    onClick={(e) => toggleFavoriteOn(doc.id, e)}
                                    title={isFav ? "Remove from favorites" : "Add to favorites"}
                                    aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                                  >
                                    <Star
                                      size={15}
                                      color={isFav ? "#EAB308" : "#CBD5E1"}
                                      fill={isFav ? "#EAB308" : "none"}
                                    />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="doc-folder-card-menu-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuKey(isMenuOpen ? null : keyOf(DOC, doc.id));
                                  }}
                                  aria-label={`Options for ${doc.title}`}
                                >
                                  <MoreVertical size={16} />
                                </button>
                              </div>
                            </div>

                            {isMenuOpen && (
                              <div
                                ref={activeMenuRef}
                                className="doc-folder-card-menu"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <DriveItemMenu row={row} {...menuHandlers(row)} />
                              </div>
                            )}

                            <div className="gd-file-card-body">
                              <div className="gd-file-card-title" title={doc.title}>
                                {doc.title}
                              </div>
                              {doc.description && (
                                <div className="gd-file-card-desc" title={doc.description}>
                                  {doc.description}
                                </div>
                              )}
                            </div>

                            <div className="gd-file-card-footer">
                              <span className="badge badge-gray" style={{ fontSize: "0.7rem" }}>
                                {doc.categories?.name || "Uncategorized"}
                              </span>
                              <span style={{ fontSize: "0.75rem", color: "#94A3B8" }}>{formatFileSize(ver?.file_size)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bridge-card gd-list-card">
                      <div className="table-responsive">
                        <table className="bridge-table gd-list-table">
                          <thead>
                            <tr>
                              {/*
                        The select-all checkbox column only exists in selection
                        mode. When hidden the column collapses entirely so the
                        table does not show an empty gutter.
                      */}
                              {selectionMode && (
                                <th className="gd-checkbox-cell">
                                  <span
                                    role="checkbox"
                                    tabIndex={0}
                                    aria-checked={allVisibleSelected}
                                    aria-label="Select all items"
                                    className={`gd-checkbox ${allVisibleSelected ? "checked" : ""}`}
                                    onClick={handleSelectAll}
                                    onKeyDown={(e) => {
                                      if (e.key === " " || e.key === "Enter") {
                                        e.preventDefault();
                                        handleSelectAll();
                                      }
                                    }}
                                  >
                                    {allVisibleSelected && <Check size={12} strokeWidth={3.5} />}
                                  </span>
                                </th>
                              )}
                              <th>Name</th>
                              <th>Category</th>
                              <th>Size</th>
                              <th>Modified</th>
                              {canManage && <th>Version</th>}
                              <th style={{ textAlign: "right" }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredFolders.map((folder) => {
                              const row = { kind: FOLDER, id: folder.id, data: folder };
                              const index = indexOfRow(row);
                              const isMenuOpen = activeMenuKey === keyOf(FOLDER, folder.id);

                              return (
                                <tr
                                  key={folder.id}
                                  className={`${rowClass(row)} ${dropFolderId === folder.id ? "drop-target" : ""}`}
                                  onClick={(e) => handleRowClick(e, row, index)}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    selectRow(e, row, index);
                                  }}
                                                                    draggable={canManage}
                                  onDragStart={(e) => handleRowDragStart(e, row)}
                                  onDragEnd={handleRowDragEnd}
                                  onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                                  onDragLeave={(e) => handleFolderDragLeave(e, folder.id)}
                                  onDrop={(e) => handleFolderDrop(e, folder.id)}
                                >
                                  {selectionMode && (
                                    <td className="gd-checkbox-cell">{renderCheckbox(row, index)}</td>
                                  )}
                                  <td data-label="Name">
                                    <div className="gd-name-cell">
                                      <Folder size={18} fill="#FDE68A" color="#D97706" />
                                      <span className="gd-name-text">{folder.name}</span>
                                    </div>
                                  </td>
                                  <td data-label="Category">
                                    <span className="badge badge-gray">{folder.categories?.name || "Folder"}</span>
                                  </td>
                                  <td data-label="Size" className="table-cell-subtle">
                                    ---
                                  </td>
                                  <td data-label="Modified" className="table-cell-subtle">
                                    {folder.updated_at ? new Date(folder.updated_at).toLocaleDateString() : "-"}
                                  </td>
                                  {canManage && (
                                    <td data-label="Version" className="table-cell-subtle">
                                      ---
                                    </td>
                                  )}
                                  <td data-label="Actions" style={{ textAlign: "right", position: "relative" }}>
                                    <button
                                      type="button"
                                      className="doc-folder-card-menu-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuKey(isMenuOpen ? null : keyOf(FOLDER, folder.id));
                                      }}
                                      aria-label={`Options for folder ${folder.name}`}
                                    >
                                      <MoreVertical size={16} />
                                    </button>

                                    {isMenuOpen && (
                                      <div
                                        ref={activeMenuRef}
                                        className="doc-folder-card-menu"
                                        style={{ top: 36, right: 4 }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <DriveItemMenu row={row} {...menuHandlers(row)} />
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}

                            {filteredDocs.map((doc) => {
                              const row = { kind: DOC, id: doc.id, data: doc };
                              const index = indexOfRow(row);
                              const ver = doc.document_versions?.[0];
                              const isMenuOpen = activeMenuKey === keyOf(DOC, doc.id);
                              const isFav = favorites.includes(doc.id);

                              return (
                                <tr
                                  key={doc.id}
                                  className={rowClass(row)}
                                  onClick={(e) => handleRowClick(e, row, index)}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    selectRow(e, row, index);
                                  }}
                                                                    draggable={canManage}
                                  onDragStart={(e) => handleRowDragStart(e, row)}
                                  onDragEnd={handleRowDragEnd}
                                >
                                  {selectionMode && (
                                    <td className="gd-checkbox-cell">{renderCheckbox(row, index)}</td>
                                  )}
                                  <td data-label="Name">
                                    <div className="gd-name-cell">
                                      {fileIcon(ver?.file_type || ver?.mime_type)}
                                      <div style={{ minWidth: 0 }}>
                                        <div className="gd-name-text" title={doc.title}>
                                          {doc.title}
                                        </div>
                                        {doc.description && (
                                          <div className="gd-name-sub" title={doc.description}>
                                            {doc.description}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td data-label="Category">
                                    <span className="badge badge-gray">{doc.categories?.name || "Uncategorized"}</span>
                                  </td>
                                  <td data-label="Size" className="table-cell-subtle">
                                    {formatFileSize(ver?.file_size)}
                                  </td>
                                  <td data-label="Modified" className="table-cell-subtle">
                                    {new Date(doc.updated_at || doc.created_at).toLocaleDateString()}
                                  </td>
                                  {canManage && (
                                    <td data-label="Version">
                                      <span className="badge badge-green">v{doc.current_version || 1}</span>
                                    </td>
                                  )}
                                  <td data-label="Actions" style={{ textAlign: "right", position: "relative" }}>
                                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                      {onToggleFavorite && (
                                        <button
                                          type="button"
                                          className="gd-fav-btn"
                                          onClick={(e) => toggleFavoriteOn(doc.id, e)}
                                          title={isFav ? "Remove from favorites" : "Add to favorites"}
                                          aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                                        >
                                          <Star
                                            size={15}
                                            color={isFav ? "#EAB308" : "#CBD5E1"}
                                            fill={isFav ? "#EAB308" : "none"}
                                          />
                                        </button>
                                      )}
                                      <button
                                        className="btn-ghost"
                                        style={{ padding: 6 }}
                                        title="Download"
                                        onClick={() => downloadOne(doc)}
                                      >
                                        <Download size={15} color="#2563EB" />
                                      </button>
                                      <button
                                        type="button"
                                        className="doc-folder-card-menu-btn"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveMenuKey(isMenuOpen ? null : keyOf(DOC, doc.id));
                                        }}
                                        aria-label={`Options for ${doc.title}`}
                                      >
                                        <MoreVertical size={16} />
                                      </button>
                                    </div>

                                    {isMenuOpen && (
                                      <div
                                        ref={activeMenuRef}
                                        className="doc-folder-card-menu"
                                        style={{ top: 36, right: 4 }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <DriveItemMenu row={row} {...menuHandlers(row)} />
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
        </div>

      {/* --- Modals ---------------------------------------------------------- */}
      {showUploadModal && canManage && (
        <UploadDocumentModal
          mode={uploadMode}
          document={selectedDoc}
          categories={categories}
          onClose={() => setShowUploadModal(false)}
          onSubmit={handleUploadSubmit}
        />
      )}

      {showCreateFolderModal && canManage && (
        <CreateFolderModal
          categories={categories}
          onClose={() => setShowCreateFolderModal(false)}
          onSubmit={handleCreateFolder}
        />
      )}

      {showBulkUploadModal && canManage && (
        <BulkUploadModal
          categories={categories}
          currentFolderId={currentFolderId}
          userId={userId}
          initialTab={bulkUploadTab}
          initialItems={bulkDroppedItems}
          onClose={() => {
            setShowBulkUploadModal(false);
            setBulkDroppedItems([]);
          }}
          onComplete={fetchData}
        />
      )}

      {renameTarget && canManage && (
        <RenameModal item={renameTarget} onClose={() => setRenameTarget(null)} onRename={handleRename} />
      )}

      {moveTarget && canManage && (
        <MoveItemModal
          item={moveTarget}
          onClose={() => setMoveTarget(null)}
          onMove={handleMoveConfirm}
        />
      )}

      {deleteTarget && canManage && (
        <ConfirmDeleteModal
          isBulk={deleteTarget.type === "bulk"}
          documentTitle={
            deleteTarget.type === "bulk"
              ? `${deleteTarget.folderIds.length + deleteTarget.documents.length} selected item(s) and all of their contents`
              : deleteTarget.type === FOLDER
              ? `folder "${deleteTarget.folder?.name}" and all of its contents`
              : deleteTarget.doc?.title
          }
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}
