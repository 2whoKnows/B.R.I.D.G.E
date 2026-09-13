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

  const maxVal = Math.max(
    ...((data.monthlyAnalytics || []).map(m => Number(m.value) || 0)),
    10
  );

  return (
    <div className="page-container">
      {/* Welcome Header */}
      <div className="welcome-banner">
        <div className="welcome-info">
          <h2 className="welcome-title">Welcome back, {managerName}</h2>
          <p className="welcome-subtitle">
            Academic document management overview &bull; {currentDateStr}
          </p>
        </div>
        <div className="welcome-actions">
          <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
            <Upload size={16} />
            Upload Document
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap">
            <FileText size={20} />
          </div>
          <div className="kpi-content">
            <div className="kpi-val">{loading ? '—' : data.totalDocuments}</div>
            <div className="kpi-lbl">Total Documents</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap">
            <Users size={20} />
          </div>
          <div className="kpi-content">
            <div className="kpi-val">{loading ? '—' : data.totalTeachers}</div>
            <div className="kpi-lbl">Total Teachers</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap">
            <Download size={20} />
          </div>
          <div className="kpi-content">
            <div className="kpi-val">{loading ? '—' : data.totalDownloads}</div>
            <div className="kpi-lbl">Total Downloads</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap">
            <TrendingUp size={20} />
          </div>
          <div className="kpi-content">
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
        <div className="quick-actions-bar">
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

      {/* Main Dual Grid: Charts & Most Downloaded */}
      <div className="dashboard-dual-grid">
        {/* Download Analytics */}
        <div className="bridge-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Download Analytics</h3>
              <p className="card-subtitle">Monthly volume across all faculties</p>
            </div>
            <span className="badge badge-gray">Current Year</span>
          </div>

          <div className="chart-container">
            {(!data.monthlyAnalytics || data.monthlyAnalytics.length === 0) ? (
              <div className="table-cell-subtle" style={{ padding: '32px 0', textAlign: 'center' }}>
                No download data recorded yet for this period.
              </div>
            ) : (
              <div className="chart-bars-wrap">
                {data.monthlyAnalytics.map((item, idx) => {
                  const val = Number(item.value) || 0;
                  const heightPct = Math.max(8, Math.round((val / maxVal) * 100));
                  return (
                    <div key={idx} className="chart-col">
                      <span className="chart-val-label">{val}</span>
                      <div className="chart-bar-track">
                        <div 
                          className="chart-bar-fill" 
                          style={{ height: `${heightPct}%` }}
                          title={`${item.label}: ${val} downloads`}
                        />
                      </div>
                      <span className="chart-axis-label">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Most Downloaded Documents */}
        <div className="bridge-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Most Downloaded</h3>
              <p className="card-subtitle">Top performing assets</p>
            </div>
            <button 
              className="btn-ghost" 
              onClick={() => navigate('/manager/documents')}
            >
              View All <ArrowRight size={12} />
            </button>
          </div>

          <div className="doc-list">
            {(!data.mostDownloaded || data.mostDownloaded.length === 0) ? (
              <div className="table-cell-subtle" style={{ padding: '24px 0', textAlign: 'center' }}>
                No documents available.
              </div>
            ) : (
              data.mostDownloaded.map((doc, idx) => (
                <div key={doc.id || idx} className="doc-item-row">
                  <div className="doc-item-left">
                    <span className="doc-item-rank">#{idx + 1}</span>
                    <FileText size={16} className="doc-item-icon" />
                    <span className="doc-item-title" title={doc.title}>
                      {doc.title}
                    </span>
                  </div>
                  <span className="badge badge-gray">
                    <Download size={11} /> {doc.download_count || 0}
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
          <div>
            <h3 className="card-title">Recent Activity</h3>
            <p className="card-subtitle">Latest system and document events</p>
          </div>
          <button 
            className="btn-ghost" 
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
              {(!data.recentActivity || data.recentActivity.length === 0) ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '24px' }} className="table-cell-subtle">
                    No recent activity logged.
                  </td>
                </tr>
              ) : (
                data.recentActivity.map((act) => {
                  const actionType = (act.action || '').toLowerCase();
                  const badgeClass = actionType.includes('download')
                    ? 'badge-blue'
                    : actionType.includes('upload') || actionType.includes('create')
                    ? 'badge-green'
                    : 'badge-gray';

                  return (
                    <tr key={act.id}>
                      <td data-label="User" className="table-cell-title">{act.user}</td>
                      <td data-label="Action">
                        <span className={`badge ${badgeClass}`}>
                          {act.action}
                        </span>
                      </td>
                      <td data-label="Document" className="table-cell-title">{act.document}</td>
                      <td data-label="Timestamp" className="table-cell-subtle">
                        {act.time ? new Date(act.time).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '—'}
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