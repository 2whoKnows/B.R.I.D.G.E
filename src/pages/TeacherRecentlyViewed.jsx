import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Eye, FileText, ArrowRight } from 'lucide-react';
import { listDocumentsWithStats } from '../lib/documentQueries';
import '../styles/Pages.css';

export default function TeacherRecentlyViewed() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await listDocumentsWithStats();
        setDocuments(data.slice(0, 6)); // Simulate recent view history
      } catch (err) {
        console.error('Failed to load recent history:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="page-container">
      <div className="filter-bar">
        <div>
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={20} color="#2563EB" /> Recently Viewed Documents
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '2px' }}>
            History of documents you have opened or previewed during your session.
          </p>
        </div>
      </div>

      <div className="doc-grid">
        {loading ? (
          <div style={{ color: '#94A3B8', padding: '24px' }}>Loading history...</div>
        ) : documents.length === 0 ? (
          <div className="bridge-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
            <History size={32} color="#CBD5E1" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0F172A' }}>No Recently Viewed Documents</h3>
            <p style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '4px' }}>
              Documents you preview will appear here for quick access.
            </p>
          </div>
        ) : (
          documents.map(doc => {
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
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Viewed Recently</span>
                  </div>
                  <h3 className="doc-title" style={{ marginTop: '12px' }}>{doc.title}</h3>
                  <p className="doc-desc" style={{ marginTop: '6px' }}>{doc.description || 'Verified academic resource.'}</p>
                </div>

                <div className="doc-card-actions">
                  <span className="badge badge-gray">{currentVer?.file_type || 'PDF'}</span>
                  <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                    <Eye size={14} /> Open Preview
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
