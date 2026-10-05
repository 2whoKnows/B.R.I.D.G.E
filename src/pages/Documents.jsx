import { useAuth } from '../context/AuthContext';
import DriveExplorer from '../components/drive/DriveExplorer';
import '../styles/Pages.css';
import '../styles/Documents.css';

/**
 * Manager "Documents" tab.
 *
 * All browsing, folder management, multi-select and upload behaviour lives in
 * the shared DriveExplorer so the Dashboard and the teacher library stay in
 * lockstep with this page.
 */
export default function Documents() {
  const { session, role } = useAuth();

  return (
    <div className="page-container">
      <DriveExplorer canManage userId={session?.user?.id} role={role} />
    </div>
  );
}
