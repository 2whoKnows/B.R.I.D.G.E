import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  FileText, 
  Star, 
  Eye, 
  Download, 
  Clock, 
  Folder, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { listDocuments, getCategories, recordView, downloadDocument } from '../lib/documentQueries';
import { useAuth } from '../context/AuthContext';
import { fileTypeLabel } from '../lib/fileTypeLabel';
import '../styles/Pages.css';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bridge_teacher_favorites')) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [docRes, catRes] = await Promise.all([
          listDocuments({ pageSize: 50 }),
          getCategories()
        ]);
        setDocuments(docRes.documents || []);
        setCategories(catRes || []);
      } catch (err) {
        console.error('Failed to load teacher dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/teacher/documents?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const favoritedDocs = documents.filter(d => favorites.includes(d.id));
  const recentlyAdded = [...documents].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4);

  return (
    <div className="page-container">
      {/* Welcome Banner & Search Hero */}
      <div className="welcome-banner" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '20px' }}>
        <div>
          <h2 className="welcome-title">Welcome back, {profile?.full_name || 'Faculty Member'}</h2>
          <p className="welcome-subtitle">Search and access verified institutional syllabi, exam templates, and academic guidelines.</p>
        </div>

        {/* Large Prominent Document Search Bar */}
        <form onSubmit={handleSearchSubmit} className="search-hero-wrap teacher-search-hero" style={{ position: 'relative', width: '100%' }}>
          <Search className="teacher-search-icon" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} size={22} />
          <input
            type="text"
            className="search-input"
            style={{
              padding: '16px 20px 16px 52px',
              fontSize: '1rem',
              borderRadius: '14px',
              backgroundColor: '#FFFFFF',
              border: 'none',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)'
            }}
            placeholder="Search all institutional documents, course codes, or titles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button 
            type="submit" 
            className="btn-primary teacher-search-submit"
            style={{ position: 'absolute', right: '8px', top: '8px', bottom: '8px', padding: '0 20px', borderRadius: '10px' }}
          >
            Search
          </button>
        </form>

        {/* Interactive Category Pills */}
        <div className="teacher-category-row" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button 
            className={`badge ${!selectedCategory ? 'badge-blue' : 'badge-gray'}`}
            style={{ padding: '8px 16px', fontSize: '0.8125rem', cursor: 'pointer' }}
            onClick={() => setSelectedCategory(null)}
          >
            All Categories
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`badge ${selectedCategory === cat.id ? 'badge-blue' : 'badge-gray'}`}
              style={{ padding: '8px 16px', fontSize: '0.8125rem', cursor: 'pointer' }}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Access & Favorite Documents */}
      {favoritedDocs.length > 0 && (
        <div className="bridge-card">
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star size={18} color="#EAB308" fill="#EAB308" /> Favorite Documents Quick Access
            </span>
            <button className="btn-secondary" style={{ fontSize: '0.75rem' }} onClick={() => navigate('/teacher/favorites')}>
              View All Favorites ({favoritedDocs.length})
            </button>
          </div>

          <div className="doc-grid">
            {favoritedDocs.slice(0, 3).map(doc => (
              <div key={doc.id} className="doc-card" onClick={() => navigate(`/teacher/documents/${doc.id}`)} style={{ cursor: 'pointer' }}>
                <div>
                  <div className="doc-card-header">
                    <span className="badge badge-blue">{doc.categories?.name || 'Academic'}</span>
                    <button 
                      onClick={(e) => toggleFavorite(doc.id, e)} 
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <Star size={18} color="#EAB308" fill="#EAB308" />
                    </button>
                  </div>
                  <h3 className="doc-title" style={{ marginTop: '10px' }}>{doc.title}</h3>
                  <p className="doc-desc" style={{ marginTop: '6px' }}>{doc.description || 'Verified document.'}</p>
                </div>

                <div className="doc-card-actions">
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>v{doc.version || 1} • {fileTypeLabel(doc.file_type)}</span>
                  <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                    <Eye size={14} /> Preview
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently Added Documents */}
      <div className="bridge-card">
        <div className="card-header">
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="#2563EB" /> Recently Added Documents
          </span>
          <button className="btn-secondary" style={{ fontSize: '0.75rem' }} onClick={() => navigate('/teacher/documents')}>
            Browse Library <ArrowRight size={14} />
          </button>
        </div>

        <div className="doc-grid">
          {loading ? (
            <div style={{ color: '#94A3B8', fontSize: '0.875rem' }}>Loading documents...</div>
          ) : recentlyAdded.length === 0 ? (
            <div style={{ color: '#94A3B8', fontSize: '0.875rem' }}>No recent documents available.</div>
          ) : (
            recentlyAdded.map(doc => {
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
                      >
                        <Star size={18} color={isFav ? '#EAB308' : '#CBD5E1'} fill={isFav ? '#EAB308' : 'none'} />
                      </button>
                    </div>
                    <h3 className="doc-title" style={{ marginTop: '10px' }}>{doc.title}</h3>
                    <p className="doc-desc" style={{ marginTop: '6px' }}>{doc.description || 'Institutional document resource.'}</p>
                  </div>

                  <div className="doc-card-actions">
                    <span className="badge badge-gray">{fileTypeLabel(doc.file_type)}</span>
                    <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                      <Eye size={14} /> Preview
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
