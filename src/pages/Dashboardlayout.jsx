import Sidebar from "./Sidebar";
import "../styles/Dashboardlayout.css";

export default function DashboardLayout({
  activeKey,
  onNavigate,
  managerName,
  pageTitle,
  pageSubtitle,
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

          <div className="dl-topbar-actions" />
        </header>

        <main className="dl-content">{children}</main>
      </div>
    </div>
  );
}