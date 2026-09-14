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

  const [docData, setDocData] = useState(null);
  // Inline-renderable file (PDF / image / text) served with
  // Content-Disposition: inline — never a download URL.
  const [previewUrl, setPreviewUrl] = useState(null);
  // Office docs (docx/xlsx/pptx/...) rendered through the Office web viewer.
  const [officeViewerUrl, setOfficeViewerUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewError, setPreviewError] = useState('');
  const [error, setError] = useState('');

  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bridge_teacher_favorites')) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let cancelled = false;
    // Guard: record exactly one view per document open. The effect re-runs
    // when profile/role resolve after the first fetch, which previously
    // called recordView() twice (RPC + activity_logs insert) for one open.
    let viewRecorded = false;
    async function recordViewOnce() {
      if (viewRecorded || cancelled) return;
      viewRecorded = true;
      try {
        await recordView(documentId, profile?.id, role);
      } catch (err) {
        console.error('Failed to record document view:', err);
      }
    }
    async function loadDoc() {
      try {
        setLoading(true);
        setPreviewUrl(null);
        setOfficeViewerUrl(null);
        setPreviewError('');
        setError('');
        // getDocument() joins documents -> document_versions via
        // documents.current_version = document_versions.version_number and
        // flattens the real file_path / mime_type onto the result. The
        // documents table itself holds NO file columns — reading
        // `doc.file_path` straight off `documents` would be undefined.
        const data = await getDocument(documentId);
        if (cancelled) return;
        setDocData(data);

        // Build a PREVIEW-ONLY url. Never use the download helper here:
        // getSignedDownloadUrl() sets Content-Disposition: attachment, which
        // forces the browser to save the file (the "preview auto-downloads"
        // symptom). Office formats cannot render in an <iframe> at all, so
        // they go through the Office web viewer instead of loading the raw
        // file URL directly (a raw Office URL in an iframe is what triggers
        // the browser download bar).
        if (data?.file_path) {
          try {
            if (isInlinePreviewable(data.file_type, data.file_name)) {
              const url = await getSignedPreviewUrl(data.file_path, 3600);
              if (!cancelled) setPreviewUrl(url);
            } else if (isOfficePreviewable(data.file_type, data.file_name)) {
              const url = await getSignedPreviewUrl(data.file_path, 3600);
              if (!cancelled) {
                setOfficeViewerUrl(
                  `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
                );
              }
            } else if (!cancelled) {
              setPreviewError('preview-unsupported');
            }
          } catch (previewErr) {
            console.error('Failed to build preview URL:', previewErr);
            if (!cancelled) setPreviewError('preview-failed');
          }
        } else if (!cancelled) {
          setPreviewError('preview-missing');
        }

        await recordViewOnce();
      } catch (err) {
        console.error('Failed to load document preview:', err);
        if (!cancelled) setError('Could not load document preview or file access expired.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (documentId) loadDoc();
    return () => { cancelled = true; };
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
    if (!docData || !docData.file_path) return;
    try {
      const downloadUrl = await getSignedDownloadUrl(docData.file_path, 60, docData.file_name || docData.title || 'document');
      const link = window.document.createElement('a');
      link.href = downloadUrl;
      link.download = docData.file_name || docData.title || 'document';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      
      // Record the download
      await recordDownload({ 
        documentId: docData.id, 
        userId: profile?.id, 
        versionId: docData.version_id 
      });
    } catch (err) {
      console.error('Download error:', err);
    }
  };

function isInlinePreviewable(mime, fileName) {
  const m = String(mime || '').toLowerCase();
  if (m === 'application/pdf') return true;
  if (m.startsWith('image/')) return true;
  if (m === 'text/plain' || m === 'text/csv' || m.startsWith('text/')) return true;
  const n = String(fileName || '').toLowerCase();
  if (/\.pdf$/i.test(n)) return true;
  if (/\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(n)) return true;
  if (/\.(txt|csv)$/i.test(n)) return true;
  return false;
}

function isOfficePreviewable(mime, fileName) {
  const m = String(mime || '').toLowerCase();
  const officeMimes = [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
  ];
  if (officeMimes.includes(m)) return true;
  const n = String(fileName || '').toLowerCase();
  if (/\.(doc|docx|xls|xlsx|ppt|pptx|odt|ods|odp)$/i.test(n)) return true;
  return false;
}

function isImageMime(mime, fileName) {
  const m = String(mime || '').toLowerCase();
  if (m.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(String(fileName || ''));
}

function formatFileSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

  if (loading) {
    return (
      <div className="page-container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ color: '#64748B', fontSize: '0.875rem' }}>Loading distraction-free document viewer...</div>
      </div>
    );
  }

  if (error || !docData) {
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

          {previewUrl && (
            <a 
              href={previewUrl} 
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
              <span className="badge badge-blue">{docData.categories?.name || 'Academic'}</span>
              <span className="badge badge-green">v{docData.version || 1}</span>
              <span className="badge badge-gray" style={{ textTransform: 'uppercase' }}>{fileTypeLabel(docData.file_type)}</span>
            </div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>{docData.title}</h1>
            {docData.description && (
              <p style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '6px' }}>{docData.description}</p>
            )}
          </div>

          <div className="preview-stats" style={{ display: 'flex', gap: '16px', fontSize: '0.8125rem', color: '#64748B', background: '#F8FAFC', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#0F172A' }}>File Size</div>
              <div>{formatFileSize(docData.file_size)}</div>
            </div>
            <div style={{ borderLeft: '1px solid #CBD5E1', paddingLeft: '16px' }}>
              <div style={{ fontWeight: 600, color: '#0F172A' }}>Updated</div>
              <div>{new Date(docData.updated_at || docData.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Large Document / PDF Viewer Frame */}
      {/* Large Document / PDF Viewer Frame — preview only, never a download */}
      <div className="bridge-card preview-frame" style={{ padding: '0', overflow: 'hidden', minHeight: '650px', display: 'flex', flexDirection: 'column' }}>
        {previewUrl ? (
          isImageMime(docData.file_type, docData.file_name) ? (
            <img
              src={previewUrl}
              alt={docData.title}
              style={{ width: '100%', maxHeight: '700px', objectFit: 'contain', backgroundColor: '#F1F5F9' }}
            />
          ) : (
            <iframe
              src={previewUrl}
              title={docData.title}
              className="preview-iframe"
              style={{ width: '100%', height: '700px', border: 'none', backgroundColor: '#525659' }}
            />
          )
        ) : officeViewerUrl ? (
          <iframe
            src={officeViewerUrl}
            title={docData.title}
            className="preview-iframe"
            style={{ width: '100%', height: '700px', border: 'none', backgroundColor: '#F8FAFC' }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px' }}>
            <FileText size={48} color="#94A3B8" />
            <h3 style={{ marginTop: '16px', fontSize: '1rem', color: '#0F172A' }}>Document File Preview</h3>
            <p style={{ color: '#64748B', fontSize: '0.875rem', marginTop: '4px' }}>
              {previewError === 'preview-missing'
                ? 'No file is attached to this document version yet.'
                : previewError === 'preview-failed'
                  ? 'Preview could not be loaded right now. Please try again later.'
                  : 'This file type cannot be previewed in the browser.'}
            </p>
            <p style={{ color: '#64748B', fontSize: '0.8125rem', marginTop: '4px' }}>
              Use Download to open it locally — no file will download automatically.
            </p>
            <button className="btn-primary" style={{ marginTop: '16px' }} onClick={handleDownload}>
              <Download size={16} /> Download {docData.file_name || 'Document'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
