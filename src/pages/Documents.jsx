import { useEffect, useState, useCallback, useRef, Fragment } from "react";
import DashboardLayout from "./Dashboardlayout";
import UploadDocumentModal from "./UploadDocumentModal";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import { supabase } from "../lib/supabase";
import {
  listDocumentsWithStats,
  getCategories,
  uploadNewDocument,
  recordView,
  downloadDocument,
  deleteDocument,
  getCurrentUserRole,
} from "../lib/documentQueries";
import "../styles/Documents.css";

function formatDate(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v4h4" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12m0 0-4-4m4 4 4-4M5 19.5h14" />
    </svg>
  );
}

function ViewIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 12s3.5-7 10.5-7 10.5 7 10.5 7-3.5 7-10.5 7-10.5-7-10.5-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M9 7V4h6v3m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export default function Documents({ managerName = "Manager" }) {
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [currentRole, setCurrentRole] = useState(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deleteTargetDoc, setDeleteTargetDoc] = useState(null);
  const [actionError, setActionError] = useState("");
  const [busyDocId, setBusyDocId] = useState(null);
  const previewAnchorRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [docs, cats] = await Promise.all([
        listDocumentsWithStats(),
        getCategories(),
      ]);
      setDocuments(docs);
      setCategories(cats);
    } catch (err) {
      console.error("Failed to load documents:", err);
      setError(err.message ?? "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!cancelled) setCurrentUser(user);

      const role = await getCurrentUserRole();
      if (!cancelled) setCurrentRole(role);
    }

    queueMicrotask(() => {
      if (!cancelled) {
        loadUser();
        loadData();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const handleCreateDocument = async ({ title, description, categoryId, file }) => {
    if (!currentUser) throw new Error("You must be signed in.");
    await uploadNewDocument({
      title,
      description,
      categoryId,
      file,
      userId: currentUser.id,
    });
    await loadData();
  };

  const handleDownload = async (doc) => {
    setActionError("");
    setBusyDocId(doc.id);
    try {
      const latestVersion = [...(doc.document_versions ?? [])].sort(
        (a, b) => b.version_number - a.version_number
      )[0];

      if (!latestVersion) {
        setActionError("No file found for this document.");
        return;
      }

      await downloadDocument(
        doc.id,
        latestVersion.id,
        latestVersion.file_path,
        currentUser?.id,
        currentRole,
        latestVersion.file_name
      );

      await loadData();
    } catch (err) {
      console.error("Download failed:", err);
      setActionError("Could not download this document. Try again.");
    } finally {
      setBusyDocId(null);
    }
  };

  const handleView = async (doc) => {
    setActionError("");

    try {
      const latestVersion = [...(doc.document_versions ?? [])].sort(
        (a, b) => b.version_number - a.version_number
      )[0];

      if (!latestVersion) {
        setActionError("No file found for this document.");
        return;
      }

      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(latestVersion.file_path, 60);

      if (error) throw error;

      if (data?.signedUrl) {
        const fileName = (latestVersion.file_name || "document").toLowerCase();
        const mimeType = (latestVersion.mime_type || "").toLowerCase();

        const previewableExtensions = [
          "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "rtf"
        ];
        const isPreviewable = previewableExtensions.some((ext) => fileName.endsWith(ext)) ||
          ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "text/plain", "text/csv"].includes(mimeType);

        const previewUrl = isPreviewable
          ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(data.signedUrl)}`
          : data.signedUrl;

        // Use a hidden real <a> element instead of window.open. Native
        // anchor navigation isn't flagged as a popup by browsers/extensions
        // the way window.open() is, so it survives the await far more
        // reliably.
        const anchor = previewAnchorRef.current;
        if (anchor) {
          anchor.href = previewUrl;
          anchor.click();
        } else {
          setActionError("Could not open the preview. Please try again.");
          return;
        }
      }

      await recordView(doc.id, currentUser?.id, currentRole);
      const isManager = currentRole === "document_manager" || currentRole === "system_admin";
      if (!isManager) {
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === doc.id ? { ...d, total_views: (d.total_views ?? 0) + 1 } : d
          )
        );
      }
    } catch (err) {
      console.error("Failed to open document:", err);
      setActionError("Could not open this document. Try again.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetDoc) return;
    await deleteDocument(deleteTargetDoc);
    setDeleteTargetDoc(null);
    await loadData();
  };

  return (
    <DashboardLayout
      activeKey="documents"
      managerName={managerName}
      pageTitle="Documents"
    >
      <p className="doc-page-subtitle">Manage uploaded documents, views, and downloads</p>

      {error && <div className="doc-error">{error}</div>}
      {actionError && <div className="doc-error">{actionError}</div>}

      <a
        ref={previewAnchorRef}
        href="about:blank"
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "none" }}
        aria-hidden="true"
        tabIndex={-1}
      />


      <div className="doc-toolbar">
        <span className="doc-count">
          {loading ? "Loading…" : `${documents.length} document${documents.length === 1 ? "" : "s"}`}
        </span>
        <button
          type="button"
          className="doc-upload-btn"
          onClick={() => setShowUploadModal(true)}
        >
          + Upload Document
        </button>
      </div>

      <div className="doc-panel">
        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Category</th>
                <th>Uploaded By</th>
                <th>Views</th>
                <th>Downloads</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7}><span className="doc-skeleton" /></td>
                  </tr>
                ))}

              {!loading && documents.length === 0 && (
                <tr>
                  <td colSpan={7} className="doc-empty-cell">
                    No documents uploaded yet.
                  </td>
                </tr>
              )}

              {!loading &&
                documents.map((doc) => (
                  <Fragment key={doc.id}>
                    <tr className="doc-row">
                      <td className="doc-td-title">
                        <span className="doc-row-icon"><FileIcon /></span>
                        {doc.title}
                      </td>
                      <td>{doc.categories?.name ?? "—"}</td>
                      <td>{doc.profiles?.full_name ?? "—"}</td>
                      <td>{(doc.total_views ?? 0).toLocaleString()}</td>
                      <td>{(doc.total_downloads ?? 0).toLocaleString()}</td>
                      <td className="doc-td-time">{formatDate(doc.updated_at)}</td>
                      <td className="doc-td-actions">
                        <button
                          type="button"
                          className="doc-action-btn doc-action-view"
                          onClick={() => handleView(doc)}
                        >
                          <ViewIcon />
                          View
                        </button>
                        <button
                          type="button"
                          className="doc-action-btn doc-action-download"
                          onClick={() => handleDownload(doc)}
                          disabled={busyDocId === doc.id}
                        >
                          <DownloadIcon />
                          {busyDocId === doc.id ? "…" : "Download"}
                        </button>
                        <button
                          type="button"
                          className="doc-action-btn doc-action-delete"
                          onClick={() => setDeleteTargetDoc(doc)}
                        >
                          <DeleteIcon />
                          Delete
                        </button>
                      </td>
                    </tr>

                  </Fragment>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {showUploadModal && (
        <UploadDocumentModal
          mode="create"
          categories={categories}
          onClose={() => setShowUploadModal(false)}
          onSubmit={handleCreateDocument}
        />
      )}

      {deleteTargetDoc && (
        <ConfirmDeleteModal
          documentTitle={deleteTargetDoc.title}
          onCancel={() => setDeleteTargetDoc(null)}
          onConfirm={handleDelete}
        />
      )}
    </DashboardLayout>
  );
}