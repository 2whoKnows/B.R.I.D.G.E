import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Eye, Download, FileText } from 'lucide-react';
import { listDocumentsWithStats, downloadDocument } from '../lib/documentQueries';
import { useAuth } from '../context/AuthContext';
import { fileTypeLabel } from '../lib/fileTypeLabel';
import '../styles/Pages.css';

export default function TeacherFavorites() {
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const favoritesKey = profile?.id ? `bridge_teacher_favorites:${profile.id}` : null;

  // Favorites are per-account: re-load when the signed-in user changes, and
  // never fall back to another account's list. A single global key is what
  // leaked favorites across deleted/recreated accounts on shared browsers.
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (!favoritesKey) {
      setFavorites([]);
      return;
    }
    try {
      setFavorites(JSON.parse(localStorage.getItem(favoritesKey)) || []);
    } catch {
      setFavorites([]);
    }
  }, [favoritesKey]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await listDocumentsWithStats();
        setDocuments(data);
      } catch (err) {
        console.error('Failed to load favorites:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const toggleFavorite = (docId, e) => {
    e?.stopPropagation();
    const updated = favorites.filter(id => id !== docId);
    setFavorites(updated);
    if (favoritesKey) localStorage.setItem(favoritesKey, JSON.stringify(updated));
  };

  const favorited = documents.filter(d => favorites.includes(d.id));

  return (
    <div className="page-container">
      <div className="filter-bar">
        <div>
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Star size={20} color="#EAB308" fill="#EAB308" /> Favorite Documents Grid
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '2px' }}>
            Quick access library for your pinned academic resources and syllabi.
          </p>
        </div>
      </div>

      <div className="doc-grid">
        {loading ? (
          <div style={{ color: '#94A3B8', padding: '24px' }}>Loading favorites...</div>
        ) : favorited.length === 0 ? (
          <div className="bridge-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
            <Star size={32} color="#CBD5E1" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0F172A' }}>No Favorite Documents Yet</h3>
            <p style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '4px' }}>
              Click the star icon on any document in the library to save it here for instant access.
            </p>
            <button className="btn-primary" style={{ marginTop: '16px', alignSelf: 'center' }} onClick={() => navigate('/teacher/documents')}>
              Browse Documents Library
            </button>
          </div>
        ) : (
          favorited.map(doc => {
            const currentVer = doc.document_versions?.[0];
            return (
              <div 
                key={doc.id} 
                className="doc-card"
                onClick={() => navigate(`/teacher/documents/${doc.id}`)}
                style={{ cursor: 'pointer' }}
              >
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
                  <h3 className="doc-title" style={{ marginTop: '12px' }}>{doc.title}</h3>
                  <p className="doc-desc" style={{ marginTop: '6px' }}>{doc.description || 'Verified academic resource.'}</p>
                </div>

                <div className="doc-card-actions">
                  <span className="badge badge-gray">{fileTypeLabel(currentVer?.file_type)}</span>
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
  );
}
