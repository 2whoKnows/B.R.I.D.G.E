import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Star, 
  Download, 
  ExternalLink, 
  FileText, 
  Eye,
  Calendar,
  Layers,
  HardDrive
} from 'lucide-react';
import { getDocument, getSignedPreviewUrl, getSignedDownloadUrl, recordView, recordDownload } from '../lib/documentQueries';
import { useAuth } from '../context/AuthContext';
import { fileTypeLabel } from '../lib/fileTypeLabel';
import '../styles/Pages.css';

export default function TeacherDocumentPreview() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { profile, role } = useAuth();

  const [doc, setDoc] = useState(null);
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bridge_teacher_favorites')) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    async function loadDoc() {
      try {
        setLoading(true);
        const docData = await getDocument(documentId);
        setDoc(docData);

        if (docData?.file_path) {
          const url = await getSignedPreviewUrl(docData.file_path, 3600);
          setSignedUrl(url);
        }

        await recordView(documentId, profile?.id, role);
      } catch (err) {
        console.error('Failed to load document preview:', err);
        setError('Could not load document preview or file access expired.');
      } finally {
        setLoading(false);
      }
    }
    if (documentId) loadDoc();
  }, [documentId, profile?.id, role]);

  const isFav = favorites.includes(documentId);

  const toggleFavorite = () => {
    let updated;
    if (isFav) {
      updated = favorites.filter(id => id !== documentId);
    } else {
      updated = [...favorites, documentId];
    }
    setFavorites(updated);
    localStorage.setItem('bridge_teacher_favorites', JSON.stringify(updated));
  };

  const handleDownload = async () => {
    if (!doc || !doc.file_path) return;
    try {
      const downloadUrl = await getSignedDownloadUrl(doc.file_path, 60);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = doc.file_name || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Record the download
      await recordDownload({ 
        documentId: doc.id, 
        userId: profile?.id, 
        versionId: doc.version_id 
      });
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="page-container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ color: '#64748B', fontSize: '0.875rem' }}>Loading distraction-free document viewer...</div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="page-container">
        <button className="btn-secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back to Library
        </button>
        <div className="bridge-card" style={{ padding: '32px', textAlign: 'center' }}>
          <h2 className="card-title" style={{ color: '#DC2626' }}>Document Not Found</h2>
          <p style={{ color: '#64748B', marginTop: '8px' }}>{error || 'This document may have been archived or removed.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ gap: '20px' }}>
      {/* Top Navigation & Action Bar */}
      <div className="filter-bar">
        <button className="btn-secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>

        <div className="preview-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            className="btn-secondary" 
            onClick={toggleFavorite}
            style={{ color: isFav ? '#EAB308' : 'inherit' }}
          >
            <Star size={16} color={isFav ? '#EAB308' : 'currentColor'} fill={isFav ? '#EAB308' : 'none'} />
            {isFav ? 'Favorited' : 'Add to Favorites'}
          </button>

          {signedUrl && (
            <a 
              href={signedUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-secondary"
            >
              <ExternalLink size={16} /> Open in New Tab
            </a>
          )}

          <button className="btn-primary" onClick={handleDownload}>
            <Download size={16} /> Download File
          </button>
        </div>
      </div>

      {/* Document Metadata Header */}
      <div className="bridge-card">
        <div className="preview-metadata" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <span className="badge badge-blue">{doc.categories?.name || 'Academic'}</span>
              <span className="badge badge-green">v{doc.version || 1}</span>
              <span className="badge badge-gray" style={{ textTransform: 'uppercase' }}>{fileTypeLabel(doc.file_type)}</span>
            </div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>{doc.title}</h1>
            {doc.description && (
              <p style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '6px' }}>{doc.description}</p>
            )}
          </div>

          <div className="preview-stats" style={{ display: 'flex', gap: '16px', fontSize: '0.8125rem', color: '#64748B', background: '#F8FAFC', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#0F172A' }}>File Size</div>
              <div>{formatFileSize(doc.file_size)}</div>
            </div>
            <div style={{ borderLeft: '1px solid #CBD5E1', paddingLeft: '16px' }}>
              <div style={{ fontWeight: 600, color: '#0F172A' }}>Updated</div>
              <div>{new Date(doc.updated_at || doc.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Large Document / PDF Viewer Frame */}
      <div className="bridge-card preview-frame" style={{ padding: '0', overflow: 'hidden', minHeight: '650px', display: 'flex', flexDirection: 'column' }}>
        {signedUrl ? (
          <iframe
            src={signedUrl}
            title={doc.title}
            className="preview-iframe"
            style={{ width: '100%', height: '700px', border: 'none', backgroundColor: '#525659' }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px' }}>
            <FileText size={48} color="#94A3B8" />
            <h3 style={{ marginTop: '16px', fontSize: '1rem', color: '#0F172A' }}>Document File Preview</h3>
            <p style={{ color: '#64748B', fontSize: '0.875rem', marginTop: '4px' }}>Click download below to view this resource.</p>
            <button className="btn-primary" style={{ marginTop: '16px' }} onClick={handleDownload}>
              <Download size={16} /> Download {doc.file_name || 'Document'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
