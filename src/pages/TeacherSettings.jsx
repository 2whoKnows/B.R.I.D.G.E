import { useState } from 'react';
import { Settings as SettingsIcon, User, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/Pages.css';

export default function TeacherSettings() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(true);

  return (
    <div className="page-container" style={{ maxWidth: '800px' }}>
      <div className="bridge-card">
        <div className="card-header">
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SettingsIcon size={20} color="#2563EB" /> Account Settings
          </span>
        </div>

        {/* Profile Information */}
        <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '20px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={16} /> Profile Information
          </h3>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', marginBottom: '6px', display: 'block' }}>
                Full Name
              </label>
              <input
                type="text"
                className="search-input"
                style={{ paddingLeft: '14px' }}
                defaultValue={profile?.full_name || ''}
                placeholder="Your full name"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', marginBottom: '6px', display: 'block' }}>
                Email Address
              </label>
              <input
                type="email"
                className="search-input"
                style={{ paddingLeft: '14px', backgroundColor: '#F8FAFC' }}
                defaultValue={profile?.email || ''}
                disabled
                title="Contact administrator to change email"
              />
              <span style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
                Contact administrator to change email address
              </span>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div style={{ padding: '16px 0', borderBottom: '1px solid #E2E8F0' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={16} /> Notification Preferences
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ fontSize: '0.875rem', color: '#334155' }}>
                Receive notifications for new document uploads
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={emailUpdates}
                onChange={(e) => setEmailUpdates(e.target.checked)}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ fontSize: '0.875rem', color: '#334155' }}>
                Email updates for document changes
              </span>
            </label>
          </div>
        </div>

        {/* The non-functional Change Password and Save Settings controls were
            removed. Password changes stay available from the Profile tab. */}
      </div>
    </div>
  );
}