import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus,
  Upload, 
  FileText, 
  Eye, 
  Download, 
  Trash2, 
  Edit3, 
  Folder, 
  FolderPlus, 
  FolderUp,
  MoreVertical, 
  ChevronRight, 
  Home, 
  Files, 
  FolderOpen, 
  ArrowLeft,
  LayoutGrid,
  List as ListIcon,
  FolderSymlink,
  FileCode,
  FileSpreadsheet,
  File,
  X
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
  renameFolder,
  renameDocument,
  moveDocument,
  moveFolder,
  downloadDocument
} from '../lib/documentQueries';
import { useAuth } from '../context/AuthContext';
import UploadDocumentModal from './UploadDocumentModal';
import CreateFolderModal from './CreateFolderModal';
import BulkUploadModal from './BulkUploadModal';
import RenameModal from './RenameModal';
import MoveItemModal from './MoveItemModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import '../styles/Pages.css';
import '../styles/Documents.css';

export default function Documents() {
  const { session, role } = useAuth();

  // Navigation / Folder State
  const [currentFolderId, setCurrentFolderId] = useState(null); // null = Root
  const [folderStack, setFolderStack] = useState([{ id: null, name: 'All Documents' }]);

  // Data
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // View Mode: 'list' | 'grid'
  const [viewMode, setViewMode] = useState('list');

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('');

  // Dropdown "+ New" menu
  const [showNewMenu, setShowNewMenu] = useState(false);
  const newMenuRef = useRef(null);

  // Modals state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState('create');
  const [selectedDoc, setSelectedDoc] = useState(null);

  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkUploadTab, setBulkUploadTab] = useState('files');
  const [bulkDroppedItems, setBulkDroppedItems] = useState([]);

  const [renameTarget, setRenameTarget] = useState(null); // { type: 'folder' | 'document', id, name/title }
  const [moveTarget, setMoveTarget] = useState(null);     // { type: 'folder' | 'document', id, name/title, folder_id/parent_id }
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'document', doc } | { type: 'folder', folder }

  // Action Menu Dropdown for items
  const [activeMenuId, setActiveMenuId] = useState(null); // "folder-{id}" | "doc-{id}"
  const activeMenuRef = useRef(null);

  // Drag & drop file overlay on explorer
  const [isDragOverPage, setIsDragOverPage] = useState(false);
  const dragCounter = useRef(0);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target)) {
        setShowNewMenu(false);
      }
      if (activeMenuRef.current && !activeMenuRef.current.contains(e.target)) {
        setActiveMenuId(null);
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

  // Drag and Drop Traversal for Page-Level Drop
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

  const handlePageDragEnter = (e) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOverPage(true);
    }
  };

  const handlePageDragLeave = (e) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      setIsDragOverPage(false);
      dragCounter.current = 0;
    }
  };

  const handlePageDragOver = (e) => {
    e.preventDefault();
  };

  const handlePageDrop = async (e) => {
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

    if (collected.length > 0) {
      setBulkDroppedItems(collected);
      setBulkUploadTab(hasDirectories ? "folder" : "files");
      setShowBulkUploadModal(true);
    }
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

  // Rename Action
  const handleRenameConfirm = async (item, newName) => {
    if (item.type === 'folder') {
      await renameFolder(item.id, newName);
    } else {
      await renameDocument(item.id, newName);
    }
    fetchData();
  };

  // Move Action
  const handleMoveConfirm = async (item, targetFolderId) => {
    if (item.type === 'folder') {
      await moveFolder(item.id, targetFolderId);
    } else {
      await moveDocument(item.id, targetFolderId);
    }
    fetchData();
  };

  // Delete Action
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

  // Direct File Download
  const handleDownloadFile = async (doc, e) => {
    e?.stopPropagation();
    const ver = doc.document_versions?.[0];
    if (!ver) return;
    try {
      await downloadDocument(
        doc.id,
        ver.id,
        ver.file_path,
        session?.user?.id,
        role,
        ver.file_name || doc.title
      );
    } catch (err) {
      console.error('Download error:', err);
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

  const getFileIcon = (fileType) => {
    const type = fileType?.toLowerCase() || '';
    if (type.includes('pdf')) return <FileText size={20} color="#DC2626" />;
    if (type.includes('xls') || type.includes('sheet') || type.includes('csv')) return <FileSpreadsheet size={20} color="#16A34A" />;
    if (type.includes('doc') || type.includes('word')) return <FileText size={20} color="#2563EB" />;
    if (type.includes('ppt') || type.includes('presentation')) return <FileText size={20} color="#EA580C" />;
    if (type.includes('js') || type.includes('html') || type.includes('code')) return <FileCode size={20} color="#7C3AED" />;
    return <File size={20} color="#64748B" />;
  };

  const currentFolderName = folderStack[folderStack.length - 1]?.name || 'All Documents';

  return (
    <div 
      className="page-container gd-explorer"
      onDragEnter={handlePageDragEnter}
      onDragOver={handlePageDragOver}
      onDragLeave={handlePageDragLeave}
      onDrop={handlePageDrop}
    >
      {/* Drag & Drop Full View Overlay */}
      {isDragOverPage && (
        <div className="gd-drop-overlay">
          <div className="gd-drop-overlay-box">
            <Upload size={48} className="gd-bounce" />
            <h3>Drop files or folders here</h3>
            <p>Upload directly into <strong>{currentFolderName}</strong></p>
          </div>
        </div>
      )}

      {/* Top Google Drive-style Action & Filter Bar */}
      <div className="filter-bar gd-toolbar">
        {/* Prominent "+ New" Button */}
        <div style={{ position: 'relative' }} ref={newMenuRef}>
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

          {/* Drive-Style "+ New" Dropdown Menu */}
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
                  setUploadMode('create');
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
                  setBulkUploadTab('folder');
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
                  setBulkUploadTab('files');
                  setShowBulkUploadModal(true);
                }}
              >
                <Files size={18} color="#4F46E5" />
                <span>Bulk file upload</span>
              </button>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="search-input-wrap" style={{ flex: 1 }}>
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search in Drive..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filters and View Switcher */}
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
            <option value="">All Types</option>
            <option value="pdf">PDF Document</option>
            <option value="docx">Word (.docx)</option>
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="pptx">PowerPoint (.pptx)</option>
          </select>

          {/* Grid / List View Toggle */}
          <div className="gd-view-toggle">
            <button
              type="button"
              className={`gd-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List layout"
            >
              <ListIcon size={18} />
            </button>
            <button
              type="button"
              className={`gd-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid layout"
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Google Drive Breadcrumb Bar */}
      <div className="doc-breadcrumb-bar gd-breadcrumbs">
        <div className="doc-breadcrumb">
          {folderStack.map((seg, idx) => {
            const isLast = idx === folderStack.length - 1;
            return (
              <span key={seg.id || 'root'} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                {idx > 0 && <span className="doc-breadcrumb-sep"><ChevronRight size={15} /></span>}
                <button
                  type="button"
                  className={`doc-breadcrumb-seg ${isLast ? 'current' : ''}`}
                  onClick={() => handleBreadcrumbClick(idx)}
                  disabled={isLast}
                >
                  {idx === 0 ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Home size={15} /> My Drive
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
            <ArrowLeft size={14} /> Back
          </button>
        )}
      </div>

      {/* Subfolders Section */}
      {filteredFolders.length > 0 && (
        <div className="doc-folder-section">
          <div className="doc-folder-section-title">
            <FolderOpen size={16} /> Folders ({filteredFolders.length})
          </div>
          <div className="doc-folder-grid">
            {filteredFolders.map((folder) => {
              const isMenuOpen = activeMenuId === `folder-${folder.id}`;
              return (
                <div
                  key={folder.id}
                  className="doc-folder-card gd-folder-card"
                  onClick={() => handleOpenFolder(folder)}
                >
                  <div className="doc-folder-card-icon">
                    <Folder size={22} fill="#FDE68A" />
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
                      setActiveMenuId(isMenuOpen ? null : `folder-${folder.id}`);
                    }}
                    title="Folder options"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {/* Dropdown Menu */}
                  {isMenuOpen && (
                    <div 
                      ref={activeMenuRef} 
                      className="doc-folder-card-menu" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="doc-folder-card-menu-item"
                        onClick={() => {
                          setActiveMenuId(null);
                          setRenameTarget({ type: 'folder', id: folder.id, name: folder.name });
                        }}
                      >
                        <Edit3 size={14} /> Rename
                      </button>
                      <button
                        type="button"
                        className="doc-folder-card-menu-item"
                        onClick={() => {
                          setActiveMenuId(null);
                          setMoveTarget({ 
                            type: 'folder', 
                            id: folder.id, 
                            name: folder.name, 
                            parent_id: folder.parent_id 
                          });
                        }}
                      >
                        <FolderSymlink size={14} /> Move to…
                      </button>
                      <button
                        type="button"
                        className="doc-folder-card-menu-item danger"
                        onClick={() => {
                          setActiveMenuId(null);
                          setDeleteTarget({ type: 'folder', folder });
                        }}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Files Section Header */}
      {filteredDocs.length > 0 && filteredFolders.length > 0 && (
        <div className="doc-folder-section-title" style={{ marginTop: '8px' }}>
          <FileText size={16} /> Files ({filteredDocs.length})
        </div>
      )}

      {/* VIEW MODE: GRID VIEW */}
      {viewMode === 'grid' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
              Loading items…
            </div>
          ) : filteredDocs.length === 0 && filteredFolders.length === 0 ? (
            <div className="bridge-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <FolderOpen size={48} color="#CBD5E1" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 600, fontSize: '1rem', color: '#334155' }}>This folder is empty</div>
              <p style={{ fontSize: '0.875rem', color: '#94A3B8', marginTop: '4px' }}>
                Drop files here or click the <strong>+ New</strong> button to add documents.
              </p>
            </div>
          ) : (
            <div className="gd-file-grid">
              {filteredDocs.map((doc) => {
                const currentVer = doc.document_versions?.[0];
                const isMenuOpen = activeMenuId === `doc-${doc.id}`;
                return (
                  <div key={doc.id} className="gd-file-card">
                    <div className="gd-file-card-header">
                      <div className="gd-file-card-icon">
                        {getFileIcon(currentVer?.file_type)}
                      </div>
                      <span className="badge badge-green" style={{ fontSize: '0.6875rem' }}>
                        v{doc.current_version || 1}
                      </span>
                      <button
                        type="button"
                        className="doc-folder-card-menu-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(isMenuOpen ? null : `doc-${doc.id}`);
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {isMenuOpen && (
                        <div
                          ref={activeMenuRef}
                          className="doc-folder-card-menu"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="doc-folder-card-menu-item"
                            onClick={(e) => {
                              setActiveMenuId(null);
                              handleDownloadFile(doc, e);
                            }}
                          >
                            <Download size={14} /> Download
                          </button>
                          <button
                            type="button"
                            className="doc-folder-card-menu-item"
                            onClick={() => {
                              setActiveMenuId(null);
                              setSelectedDoc(doc);
                              setUploadMode('version');
                              setShowUploadModal(true);
                            }}
                          >
                            <Upload size={14} /> New Version
                          </button>
                          <button
                            type="button"
                            className="doc-folder-card-menu-item"
                            onClick={() => {
                              setActiveMenuId(null);
                              setRenameTarget({ type: 'document', id: doc.id, title: doc.title });
                            }}
                          >
                            <Edit3 size={14} /> Rename
                          </button>
                          <button
                            type="button"
                            className="doc-folder-card-menu-item"
                            onClick={() => {
                              setActiveMenuId(null);
                              setMoveTarget({ 
                                type: 'document', 
                                id: doc.id, 
                                title: doc.title, 
                                folder_id: doc.folder_id 
                              });
                            }}
                          >
                            <FolderSymlink size={14} /> Move to…
                          </button>
                          <button
                            type="button"
                            className="doc-folder-card-menu-item danger"
                            onClick={() => {
                              setActiveMenuId(null);
                              setDeleteTarget({ type: 'document', doc });
                            }}
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </div>

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
                      <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>
                        {doc.categories?.name || 'Uncategorized'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                        {formatFileSize(currentVer?.file_size)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE: LIST VIEW (TABLE) */}
      {viewMode === 'list' && (
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
                        <FolderOpen size={36} color="#CBD5E1" />
                        <div style={{ fontWeight: 600, color: '#475569' }}>This folder is empty</div>
                        <div style={{ fontSize: '0.8125rem' }}>
                          Drop files here or click <strong>+ New</strong> to get started.
                        </div>
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
                    const isMenuOpen = activeMenuId === `doc-${doc.id}`;
                    return (
                      <tr key={doc.id}>
                        <td data-label="Title" style={{ fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {getFileIcon(currentVer?.file_type)}
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

                        <td data-label="Actions" style={{ textAlign: 'right', position: 'relative' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {/* Download Button */}
                            <button
                              className="btn-ghost"
                              style={{ padding: '6px' }}
                              title="Download"
                              onClick={(e) => handleDownloadFile(doc, e)}
                            >
                              <Download size={15} color="#2563EB" />
                            </button>

                            {/* Version Button */}
                            <button
                              className="btn-secondary"
                              style={{ padding: '5px 9px', fontSize: '0.75rem' }}
                              title="New Version"
                              onClick={() => {
                                setSelectedDoc(doc);
                                setUploadMode('version');
                                setShowUploadModal(true);
                              }}
                            >
                              <Upload size={13} /> Version
                            </button>

                            {/* ⋮ Item Context Menu */}
                            <button
                              className="doc-folder-card-menu-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(isMenuOpen ? null : `doc-${doc.id}`);
                              }}
                              title="More options"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {isMenuOpen && (
                              <div
                                ref={activeMenuRef}
                                className="doc-folder-card-menu"
                                style={{ top: '36px', right: '4px' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="doc-folder-card-menu-item"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    setRenameTarget({ type: 'document', id: doc.id, title: doc.title });
                                  }}
                                >
                                  <Edit3 size={14} /> Rename
                                </button>
                                <button
                                  type="button"
                                  className="doc-folder-card-menu-item"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    setMoveTarget({ 
                                      type: 'document', 
                                      id: doc.id, 
                                      title: doc.title, 
                                      folder_id: doc.folder_id 
                                    });
                                  }}
                                >
                                  <FolderSymlink size={14} /> Move to…
                                </button>
                                <button
                                  type="button"
                                  className="doc-folder-card-menu-item danger"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    setDeleteTarget({ type: 'document', doc });
                                  }}
                                >
                                  <Trash2 size={14} /> Delete
                                </button>
                              </div>
                            )}
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
      )}

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
          initialTab={bulkUploadTab}
          initialItems={bulkDroppedItems}
          onClose={() => {
            setShowBulkUploadModal(false);
            setBulkDroppedItems([]);
          }}
          onComplete={fetchData}
        />
      )}

      {renameTarget && (
        <RenameModal
          item={renameTarget}
          onClose={() => setRenameTarget(null)}
          onRename={handleRenameConfirm}
        />
      )}

      {moveTarget && (
        <MoveItemModal
          item={moveTarget}
          onClose={() => setMoveTarget(null)}
          onMove={handleMoveConfirm}
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