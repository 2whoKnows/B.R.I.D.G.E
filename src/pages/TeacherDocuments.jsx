import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, Star, Eye, Download, FileText, ArrowUpDown } from 'lucide-react';
import { listDocumentsWithStats, getCategories, getSignedDownloadUrl, recordDownload } from '../lib/documentQueries';
import { useAuth } from '../context/AuthContext';
import { fileTypeLabel } from '../lib/fileTypeLabel';
import '../styles/Pages.css';

export default function TeacherDocuments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, role } = useAuth();
  
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bridge_teacher_favorites')) || [];
    } catch {
      return [];
    }
  });

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
      console.error('Failed to load documents library:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleFavorite = (docId, e) => {
    e?.stopPropagation();
    let updated;
    if (favorites.includes(docId)) {
      updated = favorites.filter(id => id !== docId);
    } else {
      updated = [...favorites, docId];
    }
    setFavorites(updated);
    localStorage.setItem('bridge_teacher_favorites', JSON.stringify(updated));
  };

  const handleDownload = async (doc, e) => {
    e?.stopPropagation();
    const ver = doc.document_versions?.[0];
    if (!ver) return;
    try {
      const fileName = ver.file_name || doc.title || 'document';
      const downloadUrl = await getSignedDownloadUrl(ver.file_path, 60, fileName);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Record the download
      await recordDownload({ 
        documentId: doc.id, 
        userId: profile?.id, 
        versionId: ver.id 
      });
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  let filtered = documents.filter(doc => {
    const matchesSearch = search === '' || 
      doc.title?.toLowerCase().includes(search.toLowerCase()) || 
      doc.description?.toLowerCase().includes(search.toLowerCase());
    
    const matchesCat = categoryFilter === '' || doc.category_id?.toString() === categoryFilter;
    const currentVer = doc.document_versions?.[0];
    const fType = currentVer?.file_type?.toLowerCase() || '';
    const matchesFileType = fileTypeFilter === '' || fType.includes(fileTypeFilter.toLowerCase());

    return matchesSearch && matchesCat && matchesFileType;
  });

  if (sortBy === 'newest') {
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else if (sortBy === 'most_viewed') {
    filtered.sort((a, b) => (b.total_views || 0) - (a.total_views || 0));
  } else if (sortBy === 'most_downloaded') {
    filtered.sort((a, b) => (b.total_downloads || 0) - (a.total_downloads || 0));
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="page-container">
      {/* Search and Filters Header */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search academic documents, titles, or descriptions..."
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

          <select 
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Sort by Newest</option>
            <option value="most_viewed">Sort by Most Viewed</option>
            <option value="most_downloaded">Sort by Most Downloaded</option>
          </select>
        </div>
      </div>

      {/* Document Grid */}
      <div className="doc-grid">
        {loading ? (
          <div style={{ color: '#94A3B8', fontSize: '0.875rem', padding: '32px' }}>Loading document library...</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: '#94A3B8', fontSize: '0.875rem', padding: '32px' }}>No documents matched your filters.</div>
        ) : (
          filtered.map(doc => {
            const currentVer = doc.document_versions?.[0];
            const isFav = favorites.includes(doc.id);
            return (
              <div 
                key={doc.id} 
                className="doc-card"
                onClick={() => navigate(`/teacher/documents/${doc.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div>
                  <div className="doc-card-header">
                    <span className="badge badge-blue">{doc.categories?.name || 'General'}</span>
                    <button 
                      onClick={(e) => toggleFavorite(doc.id, e)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                      title={isFav ? "Remove Favorite" : "Add to Favorites"}
                    >
                      <Star size={18} color={isFav ? '#EAB308' : '#CBD5E1'} fill={isFav ? '#EAB308' : 'none'} />
                    </button>
                  </div>

                  <h3 className="doc-title" style={{ marginTop: '12px' }}>{doc.title}</h3>
                  <p className="doc-desc" style={{ marginTop: '6px' }}>{doc.description || 'Institutional document resource.'}</p>
                </div>

                <div>
                  <div className="doc-meta" style={{ marginBottom: '12px' }}>
                    <span className="badge badge-gray" style={{ textTransform: 'uppercase' }}>
                      {fileTypeLabel(currentVer?.file_type)}
                    </span>
                    <span>{formatFileSize(currentVer?.file_size)}</span>
                    <span>• {new Date(doc.updated_at || doc.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="doc-card-actions">
                    <button 
                      className="btn-primary" 
                      style={{ padding: '6px 14px', fontSize: '0.75rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/teacher/documents/${doc.id}`);
                      }}
                    >
                      <Eye size={14} /> Preview
                    </button>

                    <button 
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                      onClick={(e) => handleDownload(doc, e)}
                    >
                      <Download size={14} /> Download
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
