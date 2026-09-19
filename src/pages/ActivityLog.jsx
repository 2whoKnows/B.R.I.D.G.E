import { useState, useEffect } from 'react';
import { Clock, Filter, Search, User, FileText, Activity } from 'lucide-react';
import { getRecentActivity } from '../lib/Dashboardqueris';
import '../styles/Pages.css';

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await getRecentActivity(50);
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = search === '' || 
      log.user?.toLowerCase().includes(search.toLowerCase()) || 
      log.document?.toLowerCase().includes(search.toLowerCase());
    
    const matchesAction = actionFilter === '' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  return (
    <div className="page-container">
      {/* Top Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search activity by user, action, or document..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select
            className="filter-select"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All Action Types</option>
            <option value="login">Login / Logout</option>
            <option value="upload">Document Uploads</option>
            <option value="update">Document Updates</option>
            <option value="download">Document Downloads</option>
            <option value="view">Document Views</option>
            <option value="account">User Account Changes</option>
          </select>
        </div>
      </div>

      {/* Activity Table */}
      <div className="bridge-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="bridge-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User / Account</th>
                <th>Action Type</th>
                <th>Document / Resource</th>
                <th>System Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>
                    Loading system audit log...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>
                    No audit log records match the search filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td data-label="Timestamp" style={{ color: '#64748B', fontSize: '0.8125rem' }}>
                      {new Date(log.time).toLocaleString()}
                    </td>

                    <td data-label="User" style={{ fontWeight: 600, color: '#0F172A' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={14} color="#64748B" />
                        <span>{log.user}</span>
                      </div>
                    </td>

                    <td data-label="Action Type">
                      <span className={`badge ${
                        log.action === 'download' ? 'badge-blue' :
                        log.action === 'upload' ? 'badge-green' :
                        log.action === 'login' ? 'badge-gray' : 'badge-red'
                      }`}>
                        {log.action}
                      </span>
                    </td>

                    <td data-label="Document / Resource">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={14} color="#2563EB" />
                        <span>{log.document}</span>
                      </div>
                    </td>

                    <td data-label="Details" style={{ color: '#64748B', fontSize: '0.8125rem' }}>
                      —
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
