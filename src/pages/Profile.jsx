import { useState } from 'react';
import { User, Mail, Shield, Key, Check, Eye, EyeOff, Building2, GraduationCap, BookOpen, Save, Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { updateOwnProfile, subjectsToInput } from '../lib/profileQueries';
import '../styles/Pages.css';
import '../styles/Login.css';

export default function Profile() {
  const { profile, role, refreshProfile } = useAuth();
  return <ProfileView key={profile?.id ?? 'loading'} profile={profile} role={role} refreshProfile={refreshProfile} />;
}

function ProfileView({ profile, role, refreshProfile }) {
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  // Editable teaching-profile fields (safe columns only — saved via RPC).
  // Initialized once from the loaded profile. ProfileView is keyed by
  // profile.id, so switching users remounts and re-initializes cleanly.
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(() => profile?.full_name ?? '');
  const [department, setDepartment] = useState(() => profile?.department ?? '');
  const [gradeLevel, setGradeLevel] = useState(() => profile?.grade_level ?? '');
  const [subjectsInput, setSubjectsInput] = useState(() => subjectsToInput(profile?.subjects));
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const dirty =
    (fullName ?? '') !== (profile?.full_name ?? '') ||
    (department ?? '') !== (profile?.department ?? '') ||
    (gradeLevel ?? '') !== (profile?.grade_level ?? '') ||
    subjectsInput !== subjectsToInput(profile?.subjects);

  const handleProfileSave = async (e) => {
    e?.preventDefault?.();
    if (profileSaving) return;
    setProfileMsg('');
    setProfileErr('');
    if (!fullName.trim()) {
      setProfileErr('Full name is required.');
      return;
    }
    setProfileSaving(true);
    try {
      await updateOwnProfile({
        full_name: fullName,
        department,
        grade_level: gradeLevel,
        subjects: subjectsInput,
        avatar_url: profile?.avatar_url ?? null,
      });
      await refreshProfile?.();
      setProfileMsg('Profile updated successfully.');
      setEditing(false);
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (updateErr) {
      console.error('Profile update error:', updateErr);
      setProfileErr(updateErr.message || 'Could not update profile. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setFullName(profile?.full_name ?? '');
    setDepartment(profile?.department ?? '');
    setGradeLevel(profile?.grade_level ?? '');
    setSubjectsInput(subjectsToInput(profile?.subjects));
    setProfileErr('');
    setEditing(false);
  };

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
        <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <User size={16} /> Teaching Profile
            </h3>
            {!editing ? (
              <button type="button" className="btn-secondary" style={{ fontSize: '0.8125rem' }} onClick={() => setEditing(true)}>
                <Pencil size={14} /> Edit
              </button>
            ) : null}
          </div>

          {profileMsg && <div className="login-error" role="status" style={{ background: '#F0FDF4', borderColor: '#BBF7D0', color: '#15803D', marginBottom: '12px' }}><Check size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {profileMsg}</div>}
          {profileErr && <div className="login-error" role="alert" style={{ marginBottom: '12px' }}>{profileErr}</div>}

          {!editing ? (
            <div className="filter-bar" style={{ boxShadow: 'none' }}>
              <div>
                <div className="kpi-lbl"><Building2 size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Department</div>
                <div className="table-cell-title" style={{ marginTop: '4px' }}>
                  {profile?.department || 'General Faculty'}
                </div>
              </div>
              <div>
                <div className="kpi-lbl"><GraduationCap size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Grade Level</div>
                <div className="table-cell-title" style={{ marginTop: '4px' }}>
                  {profile?.grade_level || 'Not set'}
                </div>
              </div>
              <div>
                <div className="kpi-lbl"><BookOpen size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Subjects</div>
                <div className="table-cell-title" style={{ marginTop: '4px' }}>
                  {Array.isArray(profile?.subjects) ? (profile.subjects.length > 0 ? profile.subjects.join(', ') : 'Not set') : (profile?.subjects || 'Not set')}
                </div>
              </div>
              <span className="badge badge-gray">B.R.I.D.G.E. Academic SaaS</span>
            </div>
          ) : (
            <form onSubmit={handleProfileSave} noValidate>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div className="form-group">
                  <label className="login-label" htmlFor="profile-full-name">Full Name</label>
                  <input
                    id="profile-full-name"
                    type="text"
                    className="login-input"
                    placeholder="Your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                  />
                </div>

                <div className="form-group">
                  <label className="login-label" htmlFor="profile-department">Department</label>
                  <input
                    id="profile-department"
                    type="text"
                    className="login-input"
                    placeholder="e.g. Computer Science"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    autoComplete="organization"
                  />
                </div>

                <div className="form-group">
                  <label className="login-label" htmlFor="profile-grade-level">Grade Level</label>
                  <input
                    id="profile-grade-level"
                    type="text"
                    className="login-input"
                    placeholder="e.g. Grade 7, Senior High, College"
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="login-label" htmlFor="profile-subjects">Subjects (comma-separated)</label>
                  <input
                    id="profile-subjects"
                    type="text"
                    className="login-input"
                    placeholder="e.g. Mathematics, Physics, Research"
                    value={subjectsInput}
                    onChange={(e) => setSubjectsInput(e.target.value)}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
                    Separate multiple subjects with commas.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="btn-secondary" onClick={handleCancelEdit} disabled={profileSaving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={profileSaving || !dirty}>
                  <Save size={16} /> {profileSaving ? 'Saving…' : 'Save Profile'}
                </button>
              </div>
            </form>
          )}
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
