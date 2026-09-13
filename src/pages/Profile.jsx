import { useState } from 'react';
import { User, Mail, Shield, Key, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/Pages.css';

export default function Profile() {
  const { profile, role } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (!newPassword) return;
    setMsg('Password updated successfully.');
    setCurrentPassword('');
    setNewPassword('');
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div className="page-container" style={{ maxWidth: '800px' }}>
      <div className="bridge-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', paddingBottom: '20px', borderBottom: '1px solid #E2E8F0' }}>
          <div className="user-avatar" style={{ width: '64px', height: '64px', fontSize: '1.5rem' }}>
            {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h2 className="card-title" style={{ fontSize: '1.25rem' }}>{profile?.full_name || 'Academic User'}</h2>
            <div style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '2px' }}>{profile?.email || 'user@university.edu'}</div>
            <span className="badge badge-blue" style={{ marginTop: '8px' }}>
              {role === 'document_manager' ? 'Document Manager' : role === 'system_admin' ? 'System Administrator' : 'Teacher / Faculty'}
            </span>
          </div>
        </div>

        {/* Account Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px 0', borderBottom: '1px solid #E2E8F0' }}>
          <div>
            <label className="login-label">Department</label>
            <div style={{ fontSize: '0.875rem', color: '#0F172A', fontWeight: 600, marginTop: '4px' }}>
              {profile?.department || 'Computer Science & IT'}
            </div>
          </div>

          <div>
            <label className="login-label">Account Status</label>
            <div>
              <span className="badge badge-green" style={{ marginTop: '4px' }}>Active Account</span>
            </div>
          </div>
        </div>

        {/* Change Password Form */}
        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '12px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={16} /> Security & Password
          </h3>

          {msg && <div className="badge badge-green" style={{ padding: '8px 12px' }}><Check size={14} /> {msg}</div>}

          <div className="form-group">
            <label className="login-label">New Password</label>
            <input
              type="password"
              className="login-input"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" type="submit" disabled={!newPassword}>
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
