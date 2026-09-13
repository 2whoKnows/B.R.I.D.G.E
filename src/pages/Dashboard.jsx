import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Users, 
  Download, 
  TrendingUp, 
  Upload, 
  UserPlus, 
  FileCheck,
  Eye,
  ArrowRight
} from 'lucide-react';
import { getDashboardData } from '../lib/Dashboardqueris';
import UploadDocumentModal from './UploadDocumentModal';
import AddTeacherModal from './AddTeacherModal';
import '../styles/Pages.css';

export default function Dashboard({ managerName = 'Manager' }) {
  const navigate = useNavigate();
  const [data, setData] = useState({
    totalDocuments: 0,
    totalTeachers: 0,
    totalDownloads: 0,
    downloadsThisMonth: 0,
    monthlyAnalytics: [],
    mostDownloaded: [],
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getDashboardData();
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="page-container">
      {/* Welcome Header */}
      <div className="welcome-banner">
        <div>
          <h2 className="welcome-title">Welcome back, {managerName}</h2>
          <p className="welcome-subtitle">B.R.I.D.G.E. Academic Document Management Overview — {currentDateStr}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
            <Upload size={16} />
            Upload Document
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
            <FileText size={24} />
          </div>
          <div>
            <div className="kpi-val">{loading ? '—' : data.totalDocuments}</div>
            <div className="kpi-lbl">Total Documents</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}>
            <Users size={24} />
          </div>
          <div>
            <div className="kpi-val">{loading ? '—' : data.totalTeachers}</div>
            <div className="kpi-lbl">Total Teachers</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ backgroundColor: '#FAF5FF', color: '#9333EA' }}>
            <Download size={24} />
          </div>
          <div>
            <div className="kpi-val">{loading ? '—' : data.totalDownloads}</div>
            <div className="kpi-lbl">Total Downloads</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ backgroundColor: '#FFF7ED', color: '#EA580C' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="kpi-val">{loading ? '—' : data.downloadsThisMonth}</div>
            <div className="kpi-lbl">Downloads This Month</div>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="bridge-card">
        <div className="card-header">
          <span className="card-title">Quick Actions</span>
        </div>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
            <Upload size={16} />
            Upload Document
          </button>
          <button className="btn-secondary" onClick={() => setShowInviteModal(true)}>
            <UserPlus size={16} />
            Add / Invite Teacher
          </button>
          <button className="btn-secondary" onClick={() => navigate('/manager/documents')}>
            <FileCheck size={16} />
            Manage Documents
          </button>
        </div>
      </div>

      {/* Main Dual Grid: Charts & Activity */}
      <div className="dashboard-dual-grid">
        {/* Download Analytics */}
        <div className="bridge-card">
          <div className="card-header">
            <span className="card-title">Download Analytics (Current Year)</span>
            <span className="badge badge-blue">Monthly Volume</span>
          </div>

          <div style={{ padding: '16px 0', minHeight: '180px', display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
            {data.monthlyAnalytics.length === 0 ? (
              <div style={{ color: '#94A3B8', fontSize: '0.875rem' }}>No download data recorded yet for this period.</div>
            ) : (
              data.monthlyAnalytics.map((item, idx) => {
                const maxVal = Math.max(...data.monthlyAnalytics.map(m => m.value), 10);
                const heightPct = Math.max(12, Math.round((item.value / maxVal) * 100));
                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>{item.value}</span>
                    <div 
                      style={{ 
                        width: '100%', 
                        maxWidth: '28px', 
                        height: `${heightPct}px`, 
                        backgroundColor: '#2563EB', 
                        borderRadius: '6px 6px 2px 2px',
                        transition: 'height 0.3s ease'
                      }} 
                    />
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 500 }}>{item.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Most Downloaded Documents */}
        <div className="bridge-card">
          <div className="card-header">
            <span className="card-title">Most Downloaded</span>
            <button 
              className="btn-secondary" 
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={() => navigate('/manager/documents')}
            >
              View All <ArrowRight size={12} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.mostDownloaded.length === 0 ? (
              <div style={{ color: '#94A3B8', fontSize: '0.875rem', padding: '12px 0' }}>No documents available.</div>
            ) : (
              data.mostDownloaded.map((doc) => (
                <div 
                  key={doc.id}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <FileText size={18} color="#2563EB" />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {doc.title}
                    </span>
                  </div>
                  <span className="badge badge-blue">
                    <Download size={12} /> {doc.download_count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bridge-card">
        <div className="card-header">
          <span className="card-title">Recent Activity</span>
          <button 
            className="btn-secondary" 
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            onClick={() => navigate('/manager/activity-log')}
          >
            Full Log <ArrowRight size={12} />
          </button>
        </div>

        <div className="table-responsive">
          <table className="bridge-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Document / Resource</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {data.recentActivity.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: '#94A3B8', padding: '24px' }}>
                    No recent activity logged.
                  </td>
                </tr>
              ) : (
                data.recentActivity.map((act) => (
                  <tr key={act.id}>
                    <td data-label="User" style={{ fontWeight: 600 }}>{act.user}</td>
                    <td data-label="Action">
                      <span className={`badge ${act.action === 'download' ? 'badge-blue' : act.action === 'upload' ? 'badge-green' : 'badge-gray'}`}>
                        {act.action}
                      </span>
                    </td>
                    <td data-label="Document">{act.document}</td>
                    <td data-label="Timestamp" style={{ color: '#94A3B8', fontSize: '0.8125rem' }}>
                      {new Date(act.time).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showUploadModal && (
        <UploadDocumentModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            loadData();
          }}
        />
      )}

      {showInviteModal && (
        <AddTeacherModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}