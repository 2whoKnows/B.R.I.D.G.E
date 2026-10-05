import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DriveExplorer from '../components/drive/DriveExplorer';
import { useAuth } from '../context/AuthContext';
import '../styles/Pages.css';
import '../styles/Documents.css';

/**
 * Teacher document library.
 *
 * Renders the shared DriveExplorer in read-only mode. Teachers see exactly the
 * documents and folders the document managers created and organised - the same
 * nested tree, breadcrumbs and side tree - but with no create/rename/move/delete
 * controls. The root is labelled "Documents" rather than "My Drive" because it is
 * a read-only view of what was shared with them, not a personal drive.
 */
export default function TeacherDocuments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, session, role } = useAuth();

  // The teacher's typed search hands off to the shared explorer's search box.
  const initialSearch = searchParams.get('search') || '';

  // Favorites are per-account: re-load when the signed-in user changes, and
  // never fall back to another account's list. A single global key is what
  // leaked favorites across deleted/recreated accounts on shared browsers.
  const favoritesKey = profile?.id ? `bridge_teacher_favorites:${profile.id}` : null;
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (!favoritesKey) {
      setFavorites([]);
      return;
    }
    try {
      setFavorites(JSON.parse(localStorage.getItem(favoritesKey)) || []);
    } catch {
      setFavorites([]);
    }
  }, [favoritesKey]);

  const toggleFavorite = useCallback(
    (docId, e) => {
      e?.stopPropagation();
      setFavorites((prev) => {
        const updated = prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId];
        if (favoritesKey) localStorage.setItem(favoritesKey, JSON.stringify(updated));
        return updated;
      });
    },
    [favoritesKey],
  );

  return (
    <div className="page-container">
      <DriveExplorer
        canManage={false}
        userId={session?.user?.id}
        role={role}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        onOpenDocument={(doc) => navigate(`/teacher/documents/${doc.id}`)}
        initialSearch={initialSearch}
        rootLabel="Documents"
      />
    </div>
  );
}
