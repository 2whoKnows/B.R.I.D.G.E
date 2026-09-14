import { useState } from 'react';
import { User, Mail, Shield, Key, Check, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import '../styles/Pages.css';
import '../styles/Login.css';

export default function Profile() {
  const { profile, role } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!newPassword || saving) return;
    setMsg('');
    setErr('');
    if (newPassword.length < 6) {
      setErr('Password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setErr('Could not update password. Please try again.');
        return;
      }
      setMsg('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setMsg(''), 3000);
    } catch (updateErr) {
      console.error('Password update error:', updateErr);
      setErr('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '800px' }}>
      <div className="bridge-card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="user-avatar" style={{ width: '56px', height: '56px', fontSize: '1.375rem' }}>
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h2 className="card-title" style={{ fontSize: '1.125rem' }}>{profile?.full_name || 'Academic User'}</h2>
              <p className="card-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <Mail size={13} /> {profile?.email || 'user@university.edu'}
              </p>
              <span className="badge badge-blue" style={{ marginTop: '8px' }}>
                <Shield size={12} />
                {role === 'document_manager' ? 'Document Manager' : role === 'system_admin' ? 'System Administrator' : 'Teacher / Faculty'}
              </span>
            </div>
          </div>
          <span className="badge badge-green"><Check size={12} /> Active Account</span>
        </div>

        {/* Account Details */}
        <div className="filter-bar" style={{ boxShadow: 'none' }}>
          <div>
            <div className="kpi-lbl"><User size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Department</div>
            <div className="table-cell-title" style={{ marginTop: '4px' }}>
              {profile?.department || 'General Faculty'}
            </div>
          </div>
          <span className="badge badge-gray">B.R.I.D.G.E. Academic SaaS</span>
        </div>

        {/* Change Password Form */}
        <form onSubmit={handlePasswordChange} noValidate>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Key size={16} /> Security & Password
          </h3>

          {msg && <div className="login-error" role="status" style={{ background: '#F0FDF4', borderColor: '#BBF7D0', color: '#15803D' }}><Check size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {msg}</div>}
          {err && <div className="login-error" role="alert">{err}</div>}

          <div className="form-group">
            <label className="login-label" htmlFor="profile-new-password">New Password</label>
            <div className="login-password-wrap">
              <input
                id="profile-new-password"
                type={showNewPassword ? 'text' : 'password'}
                className="login-input"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowNewPassword((v) => !v)}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button className="btn-primary" type="submit" disabled={!newPassword || saving}>
              <Key size={16} /> {saving ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
