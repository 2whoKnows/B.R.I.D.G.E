import { useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import '../styles/Pages.css';

export default function AddTeacherModal({ onClose, onSuccess }) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !fullName.trim()) {
      setError('Please provide a full name and valid email address.');
      return;
    }

    setLoading(true);
    try {
      // Create the auth user. raw_user_meta_data is passed here so the
      // on-signup trigger (if present) can pick up the role. We also upsert
      // the profiles row explicitly below to guarantee role='teacher' even
      // when the trigger doesn't propagate metadata.
      const { data, error: inviteError } = await supabase.auth.signUp({
        email: email.trim(),
        password: 'TempPassword123!',
        options: {
          data: {
            full_name: fullName.trim(),
            department: department,
            role: 'teacher',
          }
        }
      });

      if (inviteError) throw inviteError;

      // Explicitly upsert the profile so the role column is always correct
      // regardless of whether the DB trigger reads raw_user_meta_data.
      if (data?.user?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: email.trim(),
            full_name: fullName.trim(),
            department: department,
            role: 'teacher',
            is_active: true,
          }, { onConflict: 'id' });

        if (profileError) {
          console.error('Profile upsert error:', profileError);
          // Non-fatal: the auth user was created; profile may still be set by trigger.
        }
      }

      setSuccessMsg(`Teacher account created for ${email.trim()}.`);
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    } catch (err) {
      console.error('Invite teacher error:', err);
      setError(err.message || 'Failed to add teacher.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-modal-overlay" onClick={onClose}>
      <div className="login-modal" style={{ maxWidth: '420px', textAlign: 'left', alignItems: 'stretch' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="kpi-icon-wrap" style={{ width: '36px', height: '36px' }}>
              <UserPlus size={18} />
            </div>
            <h2 className="card-title">Add / Invite Teacher</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
            <X size={20} />
          </button>
        </div>

        {error && <div className="login-error">{error}</div>}
        {successMsg && <div className="badge badge-green" style={{ padding: '10px', width: '100%', marginBottom: '14px' }}>{successMsg}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="login-label">Full Name</label>
            <input
              type="text"
              className="login-input"
              placeholder="e.g. Dr. Jane Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="login-label">Email Address</label>
            <input
              type="email"
              className="login-input"
              placeholder="e.g. jsmith@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="login-label">Department</label>
            <select
              className="login-input"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="Computer Science">Computer Science</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Engineering">Engineering</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Business Administration">Business Administration</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating Account…' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
