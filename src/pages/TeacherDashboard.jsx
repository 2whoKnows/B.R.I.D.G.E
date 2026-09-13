import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  FileText, 
  Star, 
  Eye, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { listDocuments, getCategories } from '../lib/documentQueries';
import { useAuth } from '../context/AuthContext';
import { fileTypeLabel } from '../lib/fileTypeLabel';
import '../styles/Pages.css';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
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
  const recentlyAdded = [...documents]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 4);

  return (
    <div className="page-container">
      {/* Teacher Search & Welcome Card */}
      <div className="teacher-hero-card">
        <div className="welcome-info">
          <h2 className="welcome-title">Welcome back, {profile?.full_name || 'Faculty Member'}</h2>
          <p className="welcome-subtitle">
            Search and access institutional syllabi, exam templates, and academic guidelines.
          </p>
        </div>

        {/* Clean, Focused Search Bar */}
        <form onSubmit={handleSearchSubmit} className="teacher-search-bar">
          <Search className="teacher-search-icon-pos" size={18} />
          <input
            type="text"
            className="teacher-search-input"
            placeholder="Search documents by course code, title, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="btn-primary teacher-search-btn-pos btn-sm">
            Search
          </button>
        </form>

        {/* Interactive Category Filter Pills */}
        <div className="category-pills-wrap">
          <button 
            type="button"
            className={`category-pill ${!selectedCategory ? 'active' : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            All Categories
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={`category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Favorite Documents Quick Access */}
      {favoritedDocs.length > 0 && (
        <div className="bridge-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Favorite Documents</h3>
              <p className="card-subtitle">Quick access to pinned resources</p>
            </div>
            <button className="btn-ghost" onClick={() => navigate('/teacher/favorites')}>
              View All ({favoritedDocs.length}) <ArrowRight size={12} />
            </button>
          </div>

          <div className="doc-grid">
            {favoritedDocs.slice(0, 3).map(doc => (
              <div 
                key={doc.id} 
                className="doc-card" 
                onClick={() => navigate(`/teacher/documents/${doc.id}`)}
              >
                <div>
                  <div className="doc-card-header">
                    <span className="badge badge-gray">{doc.categories?.name || 'Academic'}</span>
                    <button 
                      className="star-btn starred"
                      title="Remove from favorites"
                      onClick={(e) => toggleFavorite(doc.id, e)} 
                    >
                      <Star size={16} fill="currentColor" />
                    </button>
                  </div>
                  <h4 className="doc-title">{doc.title}</h4>
                  <p className="doc-desc">{doc.description || 'Verified academic resource.'}</p>
                </div>

                <div className="doc-card-actions">
                  <span className="table-cell-subtle">
                    v{doc.version || 1} &bull; {fileTypeLabel(doc.file_type)}
                  </span>
                  <button className="btn-secondary btn-sm" onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/teacher/documents/${doc.id}`);
                  }}>
                    <Eye size={13} /> Preview
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
          <div>
            <h3 className="card-title">Recently Added Documents</h3>
            <p className="card-subtitle">Newly published curriculum resources and templates</p>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/teacher/documents')}>
            Browse Library <ArrowRight size={12} />
          </button>
        </div>

        {loading ? (
          <div className="table-cell-subtle" style={{ padding: '32px 0', textAlign: 'center' }}>
            Loading documents...
          </div>
        ) : recentlyAdded.length === 0 ? (
          <div className="table-cell-subtle" style={{ padding: '32px 0', textAlign: 'center' }}>
            No recent documents available.
          </div>
        ) : (
          <div className="doc-grid">
            {recentlyAdded.map(doc => {
              const isFav = favorites.includes(doc.id);
              return (
                <div 
                  key={doc.id} 
                  className="doc-card"
                  onClick={() => navigate(`/teacher/documents/${doc.id}`)}
                >
                  <div>
                    <div className="doc-card-header">
                      <span className="badge badge-gray">{doc.categories?.name || 'General'}</span>
                      <button 
                        className={`star-btn ${isFav ? 'starred' : ''}`}
                        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                        onClick={(e) => toggleFavorite(doc.id, e)} 
                      >
                        <Star size={16} fill={isFav ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                    <h4 className="doc-title">{doc.title}</h4>
                    <p className="doc-desc">{doc.description || 'Institutional document resource.'}</p>
                  </div>

                  <div className="doc-card-actions">
                    <span className="badge badge-gray">{fileTypeLabel(doc.file_type)}</span>
                    <button className="btn-secondary btn-sm" onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/teacher/documents/${doc.id}`);
                    }}>
                      <Eye size={13} /> Preview
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
