import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Eye, 
  Download, 
  Users, 
  Award,
  FileText,
  TrendingUp,
  FolderOpen
} from 'lucide-react';
import { getDashboardData } from '../lib/Dashboardqueris';
import '../styles/Pages.css';

export default function Analytics() {
  const [range, setRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalDocuments: 0,
    totalTeachers: 0,
    totalViews: 0,
    totalDownloads: 0,
    downloadsThisMonth: 0,
    monthlyAnalytics: [],
    mostDownloaded: [],
    topDownloaders: [],
    downloadsByCategory: [],
    activityBreakdown: [],
  });

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await getDashboardData(range);
        setData(res);
      } catch (err) {
        console.error('Analytics load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [range]);

  const maxVal = Math.max(
    ...((data.monthlyAnalytics || []).map(m => Number(m.value) || 0)),
    ...((data.monthlyViews || []).map(m => Number(m.value) || 0)),
    10
  );

  return (
    <div className="page-container">
      {/* Top Header / Range Selector */}
      <div className="filter-bar">
        <div className="welcome-info">
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={18} /> Document & System Analytics
          </h2>
          <p className="card-subtitle">
            Usage trends, download volumes, and engagement across academic departments.
          </p>
        </div>

        <div className="filter-group">
          <label htmlFor="analytics-range" className="table-cell-subtle" style={{ fontWeight: 500 }}>
            Date Range:
          </label>
          <select 
            id="analytics-range"
            className="filter-select"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Academic Year</option>
          </select>
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap">
            <Eye size={20} />
          </div>
          <div className="kpi-content">
            <div className="kpi-val">{loading ? '—' : (data.totalViews ?? 0)}</div>
            <div className="kpi-lbl">Total Views</div>
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
            <Users size={20} />
          </div>
          <div className="kpi-content">
            <div className="kpi-val">{loading ? '—' : data.totalTeachers}</div>
            <div className="kpi-lbl">Active Teachers</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap">
            <Award size={20} />
          </div>
          <div className="kpi-content">
            <div className="kpi-val" style={{ fontSize: '1.125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {data.mostDownloaded?.[0]?.title || 'Syllabus'}
            </div>
            <div className="kpi-lbl">Top Resource</div>
          </div>
        </div>
      </div>

      {/* Analytics Charts & Details Grid */}
      <div className="dashboard-dual-grid">
        {/* Download & View Trends Chart */}
        <div className="bridge-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Engagement & Volume Trends</h3>
              <p className="card-subtitle">Monthly views and document downloads</p>
            </div>
            <div className="chart-legend">
              <div className="chart-legend-item">
                <span className="chart-legend-dot" style={{ backgroundColor: '#CBD5E1' }} /> Views
              </div>
              <div className="chart-legend-item">
                <span className="chart-legend-dot" style={{ backgroundColor: '#0F172A' }} /> Downloads
              </div>
            </div>
          </div>

          <div className="chart-container">
            {(!data.monthlyAnalytics || data.monthlyAnalytics.length === 0) ? (
              <div className="table-cell-subtle" style={{ padding: '32px 0', textAlign: 'center' }}>
                No trend data recorded for this range.
              </div>
            ) : (
              <div className="chart-bars-wrap">
                {data.monthlyAnalytics.map((item, idx) => {
                  const val = Number(item.value) || 0;
                  const dlHeightPct = Math.max(8, Math.round((val / maxVal) * 100));
                  const viewsVal = Number(data.monthlyViews?.[idx]?.value) || 0;
                  const viewsHeightPct = Math.max(8, Math.round((viewsVal / maxVal) * 100));

                  return (
                    <div key={idx} className="chart-col">
                      <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '120px' }}>
                        {/* Views bar */}
                        <div 
                          className="chart-bar-fill" 
                          style={{ 
                            height: `${viewsHeightPct}%`, 
                            backgroundColor: '#CBD5E1', 
                            width: '10px' 
                          }}
                          title={`${item.label} Views: ${viewsVal}`}
                        />
                        {/* Downloads bar */}
                        <div 
                          className="chart-bar-fill" 
                          style={{ 
                            height: `${dlHeightPct}%`, 
                            backgroundColor: '#0F172A', 
                            width: '10px' 
                          }}
                          title={`${item.label} Downloads: ${val}`}
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

        {/* Most Downloaded Breakdown */}
        <div className="bridge-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Top Academic Resources</h3>
              <p className="card-subtitle">Highest frequency downloads</p>
            </div>
          </div>

          <div className="doc-list">
            {(!data.mostDownloaded || data.mostDownloaded.length === 0) ? (
              <div className="table-cell-subtle" style={{ padding: '24px 0', textAlign: 'center' }}>
                No document metrics logged yet.
              </div>
            ) : (
              data.mostDownloaded.map((doc, index) => (
                <div key={doc.id || index} className="doc-item-row">
                  <div className="doc-item-left">
                    <span className="doc-item-rank">#{index + 1}</span>
                    <div>
                      <div className="doc-item-title">{doc.title}</div>
                      <div className="table-cell-subtle" style={{ fontSize: '0.75rem' }}>
                        {doc.download_count || 0} total downloads
                      </div>
                    </div>
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

      {/* Additional Analytics Grid */}
      <div className="dashboard-dual-grid">
        {/* Top Downloaders */}
        <div className="bridge-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Top Downloaders</h3>
              <p className="card-subtitle">Most active teachers by download count</p>
            </div>
            <Users size={18} style={{ color: 'var(--text-muted)' }} />
          </div>

          <div className="doc-list">
            {(!data.topDownloaders || data.topDownloaders.length === 0) ? (
              <div className="table-cell-subtle" style={{ padding: '24px 0', textAlign: 'center' }}>
                No download activity recorded for this period.
              </div>
            ) : (
              data.topDownloaders.map((user, index) => (
                <div key={user.id || index} className="doc-item-row">
                  <div className="doc-item-left">
                    <span className="doc-item-rank">#{index + 1}</span>
                    <div>
                      <div className="doc-item-title">{user.name}</div>
                      <div className="table-cell-subtle" style={{ fontSize: '0.75rem' }}>
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-blue">
                    <Download size={11} /> {user.download_count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Downloads by Category */}
        <div className="bridge-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Downloads by Category</h3>
              <p className="card-subtitle">Resource type popularity</p>
            </div>
            <FolderOpen size={18} style={{ color: 'var(--text-muted)' }} />
          </div>

          <div className="doc-list">
            {(!data.downloadsByCategory || data.downloadsByCategory.length === 0) ? (
              <div className="table-cell-subtle" style={{ padding: '24px 0', textAlign: 'center' }}>
                No category data available for this period.
              </div>
            ) : (
              data.downloadsByCategory.map((cat, index) => {
                const maxCount = Math.max(...data.downloadsByCategory.map(c => c.count), 1);
                const percentage = Math.round((cat.count / maxCount) * 100);
                
                return (
                  <div key={cat.category || index} className="doc-item-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="doc-item-title">{cat.category || 'Uncategorized'}</span>
                      <span className="badge badge-gray">{cat.count}</span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      height: '8px', 
                      backgroundColor: 'var(--bg-subtle)', 
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        width: `${percentage}%`, 
                        height: '100%', 
                        backgroundColor: 'var(--primary-accent)',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Activity Breakdown Chart */}
      <div className="bridge-card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Activity Breakdown Over Time</h3>
            <p className="card-subtitle">Downloads, views, and uploads trends</p>
          </div>
          <div className="chart-legend">
            <div className="chart-legend-item">
              <span className="chart-legend-dot" style={{ backgroundColor: '#94A3B8' }} /> Views
            </div>
            <div className="chart-legend-item">
              <span className="chart-legend-dot" style={{ backgroundColor: '#0F172A' }} /> Downloads
            </div>
            <div className="chart-legend-item">
              <span className="chart-legend-dot" style={{ backgroundColor: '#10B981' }} /> Uploads
            </div>
          </div>
        </div>

        <div className="chart-container">
          {(!data.activityBreakdown || data.activityBreakdown.length === 0) ? (
            <div className="table-cell-subtle" style={{ padding: '32px 0', textAlign: 'center' }}>
              No activity breakdown data for this range.
            </div>
          ) : (
            <div className="chart-bars-wrap">
              {data.activityBreakdown.map((item, idx) => {
                const maxVal = Math.max(
                  ...data.activityBreakdown.map(d => Math.max(d.downloads, d.views, d.uploads)),
                  1
                );
                
                const dlHeight = Math.max(8, Math.round((item.downloads / maxVal) * 100));
                const viewHeight = Math.max(8, Math.round((item.views / maxVal) * 100));
                const uploadHeight = Math.max(8, Math.round((item.uploads / maxVal) * 100));

                const formatDate = (dateStr) => {
                  const date = new Date(dateStr);
                  if (range === '7d' || range === '30d') {
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  } else {
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }
                };

                return (
                  <div key={idx} className="chart-col">
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '140px' }}>
                      <div 
                        className="chart-bar-fill" 
                        style={{ 
                          height: `${viewHeight}%`, 
                          backgroundColor: '#94A3B8', 
                          width: '12px' 
                        }}
                        title={`${formatDate(item.date)} Views: ${item.views}`}
                      />
                      <div 
                        className="chart-bar-fill" 
                        style={{ 
                          height: `${dlHeight}%`, 
                          backgroundColor: '#0F172A', 
                          width: '12px' 
                        }}
                        title={`${formatDate(item.date)} Downloads: ${item.downloads}`}
                      />
                      <div 
                        className="chart-bar-fill" 
                        style={{ 
                          height: `${uploadHeight}%`, 
                          backgroundColor: '#10B981', 
                          width: '12px' 
                        }}
                        title={`${formatDate(item.date)} Uploads: ${item.uploads}`}
                      />
                    </div>
                    <span className="chart-axis-label">{formatDate(item.date)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
