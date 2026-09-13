import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Users as UsersIcon, 
  BarChart3, 
  Clock, 
  Settings, 
  User, 
  LogOut, 
  Star, 
  History, 
  Bell, 
  Menu, 
  X,
  Search
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../ui/Logo';
import '../../styles/AppLayout.css';

export default function AppLayout({ roleOverride = null }) {
  const { profile, role: contextRole, signOut } = useAuth();
  const role = roleOverride || contextRole || 'teacher';
  const isManager = role === 'document_manager' || role === 'system_admin';
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const managerNavItems = [
    { label: 'Dashboard', path: '/manager/dashboard', icon: LayoutDashboard },
    { label: 'Documents', path: '/manager/documents', icon: FileText },
    { label: 'Users', path: '/manager/users', icon: UsersIcon },
    { label: 'Analytics', path: '/manager/analytics', icon: BarChart3 },
    { label: 'Activity Log', path: '/manager/activity-log', icon: Clock },
    { label: 'Settings', path: '/manager/settings', icon: Settings },
    { label: 'Profile', path: '/manager/profile', icon: User },
  ];

  const teacherNavItems = [
    { label: 'Dashboard / Home', path: '/teacher', icon: LayoutDashboard },
    { label: 'Documents', path: '/teacher/documents', icon: FileText },
    { label: 'Favorites', path: '/teacher/favorites', icon: Star },
    { label: 'Recently Viewed', path: '/teacher/recently-viewed', icon: History },
    { label: 'Profile', path: '/teacher/profile', icon: User },
    { label: 'Settings', path: '/teacher/settings', icon: Settings },
  ];

  const navItems = isManager ? managerNavItems : teacherNavItems;

  const mobileBottomNavItems = isManager ? [
    { label: 'Dashboard', path: '/manager/dashboard', icon: LayoutDashboard },
    { label: 'Documents', path: '/manager/documents', icon: FileText },
    { label: 'Analytics', path: '/manager/analytics', icon: BarChart3 },
    { label: 'Users', path: '/manager/users', icon: UsersIcon },
    { label: 'Profile', path: '/manager/profile', icon: User },
  ] : [
    { label: 'Home', path: '/teacher', icon: LayoutDashboard },
    { label: 'Documents', path: '/teacher/documents', icon: FileText },
    { label: 'Favorites', path: '/teacher/favorites', icon: Star },
    { label: 'Profile', path: '/teacher/profile', icon: User },
  ];

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const getPageTitle = () => {
    const currentItem = navItems.find(item => location.pathname === item.path || location.pathname.startsWith(item.path + '/'));
    if (currentItem) return currentItem.label.replace('Dashboard / ', '');
    return 'B.R.I.D.G.E.';
  };

  const userInitial = profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="app-shell">
      {/* Mobile Top Header */}
      <header className="mobile-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="mobile-menu-trigger" 
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            aria-label="Toggle menu"
          >
            {mobileDrawerOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <Logo size={32} variant="light" showText={true} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
            {userInitial}
          </div>
        </div>
      </header>

      {/* Mobile Backdrop */}
      <div 
        className={`mobile-backdrop ${mobileDrawerOpen ? 'open' : ''}`}
        onClick={() => setMobileDrawerOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`app-sidebar ${mobileDrawerOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <Logo size={40} variant="light" showText={true} />
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-section-title">
            {isManager ? 'Management Navigation' : 'Teacher Portal'}
          </span>
          {navItems.map((item) => {
            const IconComp = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/teacher' && location.pathname.startsWith(item.path + '/'));
            return (
              <button
                key={item.path}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  navigate(item.path);
                  setMobileDrawerOpen(false);
                }}
              >
                <div className="sidebar-item-icon">
                  <IconComp size={18} />
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="app-main">
        {/* Top Header */}
        <header className="app-header">
          <div className="header-left">
            <h1 className="header-page-title">{getPageTitle()}</h1>
          </div>

          <div className="header-right">
            <span className="role-badge">
              {isManager ? 'Document Manager' : 'Teacher'}
            </span>

            <button className="header-icon-btn" aria-label="Notifications">
              <Bell size={18} />
              <span className="notification-dot"></span>
            </button>

            <div 
              className="user-profile-menu"
              onClick={() => navigate(isManager ? '/manager/profile' : '/teacher/profile')}
            >
              <div className="user-avatar">{userInitial}</div>
              <div className="user-info">
                <span className="user-name">{profile?.full_name || 'Academic User'}</span>
                <span className="user-email">{profile?.email || 'user@bridge.edu'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content View */}
        <main className="app-content">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        {mobileBottomNavItems.map((item) => {
          const IconComp = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              className={`mobile-nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <IconComp size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
