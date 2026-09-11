import Sidebar from "./Sidebar";
import "../styles/Dashboardlayout.css";

export default function DashboardLayout({
  activeKey,
  onNavigate,
  managerName,
  pageTitle,
  pageSubtitle,
  dateLabel,
  children,
}) {
  return (
    <div className="dl-shell">
      <Sidebar
        activeKey={activeKey}
        onNavigate={onNavigate}
        managerName={managerName}
      />

      <div className="dl-main">
        <header className="dl-topbar">
          <div className="dl-topbar-title">
            <h1>{pageTitle}</h1>
            {pageSubtitle && <p>{pageSubtitle}</p>}
          </div>

          <div className="dl-topbar-actions">
            {dateLabel && (
              <span className="dl-date-chip">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <rect x="3.5" y="5" width="17" height="15.5" rx="2.3" />
                  <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" />
                </svg>
                {dateLabel}
              </span>
            )}
            <button className="dl-bell" aria-label="Notifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M6 9a6 6 0 1 1 12 0c0 4.2 1.4 5.6 2 6.3H4c.6-.7 2-2.1 2-6.3Z" />
                <path d="M10 19.2a2.2 2.2 0 0 0 4 0" />
              </svg>
            </button>
            <div className="dl-user-chip">
              <span className="dl-user-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M4.5 20c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5" />
                </svg>
              </span>
              <span>{managerName}</span>
            </div>
          </div>
        </header>

        <main className="dl-content">{children}</main>
      </div>
    </div>
  );
}