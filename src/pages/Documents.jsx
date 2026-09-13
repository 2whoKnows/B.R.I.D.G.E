import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Upload, 
  FileText, 
  Eye, 
  Download, 
  Trash2, 
  Edit3, 
  History, 
  Calendar,
  Archive
} from 'lucide-react';
import { listDocumentsWithStats, getCategories, deleteDocument, uploadNewDocument, uploadNewVersion } from '../lib/documentQueries';
import { useAuth } from '../context/AuthContext';
import UploadDocumentModal from './UploadDocumentModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import '../styles/Pages.css';

export default function Documents() {
  const { session } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  // Modals state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState('create');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docList, catList] = await Promise.all([
        listDocumentsWithStats(),
        getCategories()
      ]);
      setDocuments(docList);
      setCategories(catList);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDocument(deleteTarget);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const handleUploadSubmit = async (uploadData) => {
    try {
      if (uploadMode === 'create') {
        await uploadNewDocument({
          ...uploadData,
          userId: session?.user?.id
        });
      } else if (uploadMode === 'version' && selectedDoc) {
        const nextVersion = (selectedDoc.current_version || 0) + 1;
        await uploadNewVersion({
          documentId: selectedDoc.id,
          nextVersion,
          file: uploadData.file,
          userId: session?.user?.id,
          changeNotes: uploadData.changeNotes
        });
      }
      setShowUploadModal(false);
      fetchData();
    } catch (err) {
      console.error('Upload failed:', err);
      throw err;
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = search === '' || doc.title?.toLowerCase().includes(search.toLowerCase()) || doc.description?.toLowerCase().includes(search.toLowerCase());
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
      {/* Top Header / Actions */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search documents by title, keyword, or metadata..."
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
            {categories.map(cat => (
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

      {/* Document Table List */}
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
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>
                    No matching academic documents found.
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
                              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 400 }}>{doc.description}</div>
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
                            onClick={() => setDeleteTarget(doc)}
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

      {deleteTarget && (
        <ConfirmDeleteModal
          documentTitle={deleteTarget.title}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}