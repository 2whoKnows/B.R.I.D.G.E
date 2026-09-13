import { useState, useEffect } from 'react';
import { Search, UserPlus, Shield, CheckCircle, XCircle, Mail, Building } from 'lucide-react';
import { listUsers, updateUserActive, updateUserRole } from '../lib/userQueries';
import AddTeacherModal from './AddTeacherModal';
import '../styles/Pages.css';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await listUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      await updateUserActive(userId, !currentStatus);
      fetchUsers();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = search === '' || 
      user.full_name?.toLowerCase().includes(search.toLowerCase()) || 
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.department?.toLowerCase().includes(search.toLowerCase());
      
    const matchesStatus = statusFilter === '' || 
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="page-container">
      {/* Top Filter & Actions */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search teachers by name, email, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select 
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <UserPlus size={16} />
            Invite / Add Teacher
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bridge-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="bridge-table">
            <thead>
              <tr>
                <th>Teacher / Staff</th>
                <th>Department</th>
                <th>Role</th>
                <th>Account Status</th>
                <th>Joined Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>
                    Loading user directory...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>
                    No users matching the search criteria found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td data-label="Teacher / Staff">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="user-avatar" style={{ width: '36px', height: '36px', fontSize: '0.875rem' }}>
                          {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{user.full_name || 'Academic User'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>

                    <td data-label="Department">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                        <Building size={14} color="#94A3B8" />
                        <span>{user.department || 'General Faculty'}</span>
                      </div>
                    </td>

                    <td data-label="Role">
                      <span className={`badge ${user.role === 'document_manager' || user.role === 'system_admin' ? 'badge-blue' : 'badge-gray'}`}>
                        {user.role === 'document_manager' ? 'Document Manager' : user.role === 'system_admin' ? 'System Admin' : 'Teacher'}
                      </span>
                    </td>

                    <td data-label="Account Status">
                      <span className={`badge ${user.is_active !== false ? 'badge-green' : 'badge-red'}`}>
                        {user.is_active !== false ? <><CheckCircle size={12} /> Active</> : <><XCircle size={12} /> Inactive</>}
                      </span>
                    </td>

                    <td data-label="Joined Date" style={{ color: '#64748B', fontSize: '0.8125rem' }}>
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recent'}
                    </td>

                    <td data-label="Actions" style={{ textAlign: 'right' }}>
                      <button
                        className={user.is_active !== false ? "btn-danger" : "btn-secondary"}
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        onClick={() => handleToggleActive(user.id, user.is_active !== false)}
                      >
                        {user.is_active !== false ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddTeacherModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}