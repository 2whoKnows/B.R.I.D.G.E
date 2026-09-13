import { useState } from 'react';
import { Settings as SettingsIcon, Database, Bell, Shield, FolderPlus, Save } from 'lucide-react';
import '../styles/Pages.css';

export default function Settings() {
  const [categories, setCategories] = useState([
    'Curriculum & Syllabi',
    'Exam Papers & Quizzes',
    'Research & Publications',
    'Administrative Forms',
    'Departmental Guidelines'
  ]);
  const [newCat, setNewCat] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    setCategories([...categories, newCat.trim()]);
    setNewCat('');
  };

  const handleSave = () => {
    setSavedMsg('Settings updated successfully.');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  return (
    <div className="page-container" style={{ maxWidth: '900px' }}>
      <div className="bridge-card">
        <div className="card-header">
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SettingsIcon size={20} color="#2563EB" /> System Preferences & Categories
          </span>
          {savedMsg && <span className="badge badge-green">{savedMsg}</span>}
        </div>

        {/* Category Management */}
        <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '20px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderPlus size={16} /> Document Categories Management
          </h3>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <input
              type="text"
              className="search-input"
              style={{ paddingLeft: '14px' }}
              placeholder="Add new academic category..."
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
            />
            <button className="btn-primary" type="button" onClick={handleAddCategory}>
              Add Category
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {categories.map((cat, idx) => (
              <span key={idx} className="badge badge-gray" style={{ padding: '6px 14px', fontSize: '0.8125rem' }}>
                {cat}
              </span>
            ))}
          </div>
        </div>

        {/* Storage Overview */}
        <div style={{ padding: '16px 0', borderBottom: '1px solid #E2E8F0' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={16} /> Cloud Storage Allocation
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8125rem', color: '#64748B' }}>Supabase Storage Bucket (`documents`)</span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0F172A' }}>1.2 GB / 50 GB Used</span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: '2.4%', height: '100%', backgroundColor: '#2563EB', borderRadius: '4px' }} />
          </div>
        </div>

        {/* Save Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px' }}>
          <button className="btn-primary" onClick={handleSave}>
            <Save size={16} /> Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
