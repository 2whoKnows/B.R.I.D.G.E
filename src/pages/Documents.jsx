import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Upload, 
  FileText, 
  Eye, 
  Download, 
  Trash2, 
  Edit3, 
  Folder, 
  FolderPlus, 
  MoreVertical, 
  ChevronRight, 
  Home, 
  Files, 
  FolderOpen, 
  ArrowLeft,
  Edit2
} from 'lucide-react';
import { 
  listDocumentsWithStats, 
  getCategories, 
  deleteDocument, 
  uploadNewDocument, 
  uploadNewVersion,
  listFolders,
  createFolder,
  deleteFolder,
  renameFolder
} from '../lib/documentQueries';
import { useAuth } from '../context/AuthContext';
import UploadDocumentModal from './UploadDocumentModal';
import CreateFolderModal from './CreateFolderModal';
import BulkUploadModal from './BulkUploadModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import '../styles/Pages.css';
import '../styles/Documents.css';

export default function Documents() {
  const { session } = useAuth();

  // Navigation / Folder State
  const [currentFolderId, setCurrentFolderId] = useState(null); // null = Root
  const [folderStack, setFolderStack] = useState([{ id: null, name: 'All Documents' }]);

  // Data
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('');

  // Modals state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState('create');
  const [selectedDoc, setSelectedDoc] = useState(null);

  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'document', doc } | { type: 'folder', folder }

  // Folder card dropdown menu
  const [activeMenuFolderId, setActiveMenuFolderId] = useState(null);
  const menuRef = useRef(null);

  // Close folder menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuFolderId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [folderList, docList, catList] = await Promise.all([
        listFolders(currentFolderId),
        listDocumentsWithStats(currentFolderId),
        getCategories()
      ]);
      setFolders(folderList);
      setDocuments(docList);
      setCategories(catList);
    } catch (err) {
      console.error('Failed to fetch documents and folders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentFolderId]);

  // Folder Navigation Handlers
  const handleOpenFolder = (folder) => {
    setCurrentFolderId(folder.id);
    setFolderStack((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index) => {
    const target = folderStack[index];
    setFolderStack((prev) => prev.slice(0, index + 1));
    setCurrentFolderId(target.id);
  };

  const handleNavigateUp = () => {
    if (folderStack.length <= 1) return;
    const newStack = folderStack.slice(0, -1);
    setFolderStack(newStack);
    setCurrentFolderId(newStack[newStack.length - 1].id);
  };

  // Folder Actions
  const handleCreateFolder = async ({ name, categoryId }) => {
    await createFolder({
      name,
      parentId: currentFolderId,
      categoryId,
      createdBy: session?.user?.id,
    });
    fetchData();
  };

  const handleRenameFolder = async (folder, e) => {
    e?.stopPropagation();
    setActiveMenuFolderId(null);
    const newName = window.prompt('Enter new folder name:', folder.name);
    if (!newName || !newName.trim() || newName.trim() === folder.name) return;

    try {
      await renameFolder(folder.id, newName.trim());
      fetchData();
    } catch (err) {
      console.error('Failed to rename folder:', err);
      alert('Could not rename folder: ' + err.message);
    }
  };

  const handleDeleteFolderClick = (folder, e) => {
    e?.stopPropagation();
    setActiveMenuFolderId(null);
    setDeleteTarget({ type: 'folder', folder });
  };

  // Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'folder') {
        await deleteFolder(deleteTarget.folder.id);
      } else if (deleteTarget.type === 'document') {
        await deleteDocument(deleteTarget.doc);
      }
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete target:', err);
      throw err;
    }
  };

  // Single Document Upload / Version Upload
  const handleUploadSubmit = async (uploadData) => {
    try {
      if (uploadMode === 'create') {
        await uploadNewDocument({
          ...uploadData,
          userId: session?.user?.id,
          folderId: currentFolderId || null,
        });
      } else if (uploadMode === 'version' && selectedDoc) {
        const nextVersion = (selectedDoc.current_version || 0) + 1;
        await uploadNewVersion({
          documentId: selectedDoc.id,
          nextVersion,
          file: uploadData.file,
          userId: session?.user?.id,
          changeNotes: uploadData.changeNotes,
        });
      }
      setShowUploadModal(false);
      fetchData();
    } catch (err) {
      console.error('Upload failed:', err);
      throw err;
    }
  };

  // Filters
  const filteredFolders = folders.filter((f) => {
    const matchesSearch = search === '' || f.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === '' || f.category_id?.toString() === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      search === '' ||
      doc.title?.toLowerCase().includes(search.toLowerCase()) ||
      doc.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === '' || doc.category_id?.toString() === categoryFilter;
    const latestVersion = doc.document_versions?.[0];
    const fileType = latestVersion?.file_type?.toLowerCase() || '';
    const matchesFileType = fileTypeFilter === '' || fileType.includes(fileTypeFilter.toLowerCase());

    return matchesSearch && matchesCat && matchesFileType;
  });

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="page-container">
      {/* Top Header / Actions & Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search folders and documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select 
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select 
            className="filter-select"
            value={fileTypeFilter}
            onChange={(e) => setFileTypeFilter(e.target.value)}
          >
            <option value="">All File Types</option>
            <option value="pdf">PDF Document</option>
            <option value="docx">Word (.docx)</option>
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="pptx">PowerPoint (.pptx)</option>
          </select>

          {/* Action Buttons */}
          <button 
            className="btn-secondary"
            onClick={() => setShowCreateFolderModal(true)}
            title="Create a new folder in current directory"
          >
            <FolderPlus size={16} />
            New Folder
          </button>

          <button 
            className="btn-secondary"
            onClick={() => setShowBulkUploadModal(true)}
            title="Bulk upload multiple files or entire folder tree"
          >
            <Files size={16} />
            Bulk Upload
          </button>

          <button 
            className="btn-primary"
            onClick={() => {
              setUploadMode('create');
              setSelectedDoc(null);
              setShowUploadModal(true);
            }}
          >
            <Upload size={16} />
            Upload Document
          </button>
        </div>
      </div>

      {/* Breadcrumb Navigation Bar */}
      <div className="doc-breadcrumb-bar">
        <div className="doc-breadcrumb">
          {folderStack.map((seg, idx) => {
            const isLast = idx === folderStack.length - 1;
            return (
              <span key={seg.id || 'root'} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                {idx > 0 && <span className="doc-breadcrumb-sep"><ChevronRight size={14} /></span>}
                <button
                  type="button"
                  className={`doc-breadcrumb-seg ${isLast ? 'current' : ''}`}
                  onClick={() => handleBreadcrumbClick(idx)}
                  disabled={isLast}
                >
                  {idx === 0 ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <Home size={14} /> {seg.name}
                    </span>
                  ) : (
                    seg.name
                  )}
                </button>
              </span>
            );
          })}
        </div>

        {folderStack.length > 1 && (
          <button
            type="button"
            className="btn-ghost"
            onClick={handleNavigateUp}
            style={{ fontSize: '0.8125rem' }}
          >
            <ArrowLeft size={14} /> Up One Level
          </button>
        )}
      </div>

      {/* Subfolders Grid Section */}
      {filteredFolders.length > 0 && (
        <div className="doc-folder-section">
          <div className="doc-folder-section-title">
            <FolderOpen size={15} /> Folders ({filteredFolders.length})
          </div>
          <div className="doc-folder-grid">
            {filteredFolders.map((folder) => {
              const isMenuOpen = activeMenuFolderId === folder.id;
              return (
                <div
                  key={folder.id}
                  className="doc-folder-card"
                  onClick={() => handleOpenFolder(folder)}
                >
                  <div className="doc-folder-card-icon">
                    <Folder size={20} fill="#FDE68A" />
                  </div>
                  <div className="doc-folder-card-info">
                    <span className="doc-folder-card-name" title={folder.name}>
                      {folder.name}
                    </span>
                    <span className="doc-folder-card-meta">
                      {folder.categories?.name ? folder.categories.name : 'Folder'}
                    </span>
                  </div>

                  {/* ⋮ Menu Button */}
                  <button
                    type="button"
                    className="doc-folder-card-menu-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuFolderId(isMenuOpen ? null : folder.id);
                    }}
                    title="Folder options"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {/* Dropdown Menu */}
                  {isMenuOpen && (
                    <div ref={menuRef} className="doc-folder-card-menu" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="doc-folder-card-menu-item"
                        onClick={(e) => handleRenameFolder(folder, e)}
                      >
                        <Edit2 size={13} /> Rename
                      </button>
                      <button
                        type="button"
                        className="doc-folder-card-menu-item danger"
                        onClick={(e) => handleDeleteFolderClick(folder, e)}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Documents Table List */}
      <div className="bridge-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="bridge-table">
            <thead>
              <tr>
                <th>Title & Info</th>
                <th>Category</th>
                <th>File Type</th>
                <th>Size</th>
                <th>Version</th>
                <th>Upload Date</th>
                <th>Stats</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>
                    Loading documents library...
                  </td>
                </tr>
              ) : filteredDocs.length === 0 && filteredFolders.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <FolderOpen size={32} color="#CBD5E1" />
                      <div style={{ fontWeight: 600, color: '#475569' }}>This folder is empty</div>
                      <div style={{ fontSize: '0.8125rem' }}>Create a new folder or upload documents to get started.</div>
                    </div>
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                    No documents found in this folder.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const currentVer = doc.document_versions?.[0];
                  return (
                    <tr key={doc.id}>
                      <td data-label="Title" style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <FileText size={18} color="#2563EB" />
                          <div>
                            <div style={{ color: '#0F172A' }}>{doc.title}</div>
                            {doc.description && (
                              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 400 }}>
                                {doc.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td data-label="Category">
                        <span className="badge badge-gray">
                          {doc.categories?.name || 'Uncategorized'}
                        </span>
                      </td>

                      <td data-label="File Type">
                        <span className="badge badge-blue" style={{ textTransform: 'uppercase' }}>
                          {currentVer?.file_type || currentVer?.mime_type?.split('/')?.[1] || 'PDF'}
                        </span>
                      </td>

                      <td data-label="Size" style={{ color: '#64748B' }}>
                        {formatFileSize(currentVer?.file_size)}
                      </td>

                      <td data-label="Version">
                        <span className="badge badge-green">v{doc.current_version || 1}</span>
                      </td>

                      <td data-label="Upload Date" style={{ color: '#64748B', fontSize: '0.8125rem' }}>
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>

                      <td data-label="Stats">
                        <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', color: '#64748B' }}>
                          <span><Eye size={12} /> {doc.total_views || 0}</span>
                          <span><Download size={12} /> {doc.total_downloads || 0}</span>
                        </div>
                      </td>

                      <td data-label="Actions" style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                            title="New Version"
                            onClick={() => {
                              setSelectedDoc(doc);
                              setUploadMode('version');
                              setShowUploadModal(true);
                            }}
                          >
                            <Edit3 size={14} /> Version
                          </button>

                          <button
                            className="btn-danger"
                            style={{ padding: '6px 10px' }}
                            title="Delete Document"
                            onClick={() => setDeleteTarget({ type: 'document', doc })}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showUploadModal && (
        <UploadDocumentModal
          mode={uploadMode}
          document={selectedDoc}
          categories={categories}
          onClose={() => setShowUploadModal(false)}
          onSubmit={handleUploadSubmit}
        />
      )}

      {showCreateFolderModal && (
        <CreateFolderModal
          categories={categories}
          onClose={() => setShowCreateFolderModal(false)}
          onSubmit={handleCreateFolder}
        />
      )}

      {showBulkUploadModal && (
        <BulkUploadModal
          categories={categories}
          currentFolderId={currentFolderId}
          userId={session?.user?.id}
          onClose={() => setShowBulkUploadModal(false)}
          onComplete={fetchData}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          documentTitle={
            deleteTarget.type === 'folder'
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