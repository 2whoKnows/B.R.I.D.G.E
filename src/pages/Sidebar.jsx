import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Sidebar.css";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "grid", path: "/manager/dashboard" },
  { key: "documents", label: "Documents", icon: "file", path: "/documents" },
  { key: "users", label: "Users", icon: "users", path: "/users" },
  { key: "analytics", label: "Analytics", icon: "chart", path: "/analytics" },
  { key: "activity", label: "Activity Log", icon: "clock", path: "/activity" },
  { key: "settings", label: "Settings", icon: "gear", path: "/settings" },
];

function Icon({ name }) {
  const paths = {
    grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
    file: (
      <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v4h4" />
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 20c0-3.6 2.9-6 5.5-6s5.5 2.4 5.5 6" />
        <circle cx="17" cy="9" r="2.6" />
        <path d="M15.5 14.2c2.2.3 4.5 2.1 5 5.8" />
      </>
    ),
    chart: <path d="M4 20V10M11 20V4M18 20v-7" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </>
    ),
    gear: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V19.5a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H4.5a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10a1.7 1.7 0 0 0 1-1.55V4.5a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10a1.7 1.7 0 0 0 1.55 1H19.5a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="sb-icon">
      {paths[name]}
    </svg>
  );
}

export default function Sidebar({
  systemName = "B.R.I.D.G.E",
  institutionLabel = "Institution",
  activeKey = "dashboard",
  onNavigate,
  managerName = "Manager",
  onLogout,
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleNav = (key) => {
    const item = NAV_ITEMS.find((navItem) => navItem.key === key);
    setOpen(false);

    if (item?.path) {
      navigate(item.path);
    }

    onNavigate?.(key);
  };

  return (
    <>
      {/* Mobile top bar trigger */}
      <button
        className="sb-mobile-trigger"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      {open && <div className="sb-backdrop" onClick={() => setOpen(false)} />}

      <aside className={`sb-sidebar ${open ? "sb-open" : ""}`}>
        <div className="sb-brand">
          <div className="sb-brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="5" r="2" />
              <circle cx="5" cy="19" r="2" />
              <circle cx="19" cy="19" r="2" />
              <path d="M12 7v6M12 13l-6 4M12 13l6 4" />
            </svg>
          </div>
          <div className="sb-brand-text">
            <span className="sb-brand-name">{systemName}</span>
            <span className="sb-brand-sub">{institutionLabel}</span>
          </div>
          <button className="sb-close" aria-label="Close menu" onClick={() => setOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav className="sb-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`sb-nav-item ${activeKey === item.key ? "sb-active" : ""}`}
              onClick={() => handleNav(item.key)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button className="sb-user" onClick={onLogout}>
          <span className="sb-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M4.5 20c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5" />
            </svg>
          </span>
          <span className="sb-user-text">
            <span className="sb-user-name">{managerName}</span>
            <span className="sb-user-role">Document Manager</span>
          </span>
        </button>
      </aside>
    </>
  );
}