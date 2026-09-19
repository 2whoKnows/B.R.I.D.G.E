import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, FolderPlus, Trash2 } from 'lucide-react';
import { getCategories, createCategory, deleteCategory } from '../lib/documentQueries';
import '../styles/Pages.css';

export default function ManagerSettings() {
  const [categories, setCategories] = useState([]);
  const [newCat, setNewCat] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const cats = await getCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    try {
      await createCategory(newCat.trim());
      setNewCat('');
      setSavedMsg('Category added successfully.');
      setTimeout(() => setSavedMsg(''), 3000);
      loadCategories();
    } catch (err) {
      console.error('Failed to add category:', err);
      setSavedMsg('Failed to add category.');
      setTimeout(() => setSavedMsg(''), 3000);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      await deleteCategory(categoryId);
      setSavedMsg('Category removed successfully.');
      setTimeout(() => setSavedMsg(''), 3000);
      loadCategories();
    } catch (err) {
      console.error('Failed to delete category:', err);
      setSavedMsg('Failed to remove category.');
      setTimeout(() => setSavedMsg(''), 3000);
    }
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
            <button className="btn-primary" type="button" onClick={handleAddCategory} disabled={loading}>
              Add Category
            </button>
          </div>

          {loading ? (
            <div style={{ color: '#64748B', fontSize: '0.875rem' }}>Loading categories...</div>
          ) : categories.length === 0 ? (
            <div style={{ color: '#64748B', fontSize: '0.875rem' }}>No categories created yet.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {categories.map((cat) => (
                <span key={cat.id} className="badge badge-gray" style={{ padding: '6px 14px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {cat.name}
                  <button 
                    onClick={() => handleDeleteCategory(cat.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', padding: '0' }}
                    title="Delete category"
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* The hardcoded storage allocation placeholder and the non-functional
            Save Preferences control were removed. */}
      </div>
    </div>
  );
}
