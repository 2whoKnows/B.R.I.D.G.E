import { useEffect, useState } from "react";
import DashboardLayout from "./Dashboardlayout";
import LineTrendChart from "./Linetrendchart";
import { getDashboardData } from "../lib/Dashboardqueris";
import "../styles/Dashboard.css";

const STAT_CARDS = [
  { key: "totalDocuments", label: "Total Documents", icon: "file", tint: "blue" },
  { key: "totalTeachers", label: "Total Teachers", icon: "users", tint: "purple" },
  { key: "totalDownloads", label: "Total Downloads", icon: "download", tint: "green" },
  { key: "downloadsThisMonth", label: "Downloads This Month", icon: "trend", tint: "orange" },
];

function StatIcon({ name }) {
  const paths = {
    file: <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v4h4" />,
    users: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 20c0-3.6 2.9-6 5.5-6s5.5 2.4 5.5 6" />
        <circle cx="17" cy="9" r="2.6" />
        <path d="M15.5 14.2c2.2.3 4.5 2.1 5 5.8" />
      </>
    ),
    download: <path d="M12 3v12m0 0-4-4m4 4 4-4M5 19.5h14" />,
    trend: <path d="M4 17l5-5 4 3 7-8M20 7h-4M20 7v4" />,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

function formatTime(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Dashboard({ managerName = "Manager" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getDashboardData()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Failed to load dashboard data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardLayout
      activeKey="dashboard"
      managerName={managerName}
      pageTitle="Dashboard"
      pageSubtitle={`Welcome back, ${managerName}!`}
    >
      {error && <div className="db-error">{error}</div>}

      <section className="db-stats-grid">
        {STAT_CARDS.map((card) => (
          <div className="db-stat-card" key={card.key}>
            <span className={`db-stat-icon db-tint-${card.tint}`}>
              <StatIcon name={card.icon} />
            </span>
            <div className="db-stat-body">
              <span className="db-stat-label">{card.label}</span>
              <span className="db-stat-value">
                {loading ? <span className="db-skeleton" /> : (data?.[card.key] ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </section>

      <section className="db-lower-grid">
        <div className="db-panel db-analytics-panel">
          <div className="db-panel-header">
            <h2>Download Analytics</h2>
          </div>
          <div className="db-chart-wrap">
            {loading ? (
              <div className="db-chart-skeleton" />
            ) : (
              <LineTrendChart data={data?.monthlyAnalytics ?? []} />
            )}
          </div>

          <div className="db-panel-header db-recent-header">
            <h2>Recent Activity</h2>
          </div>
          <div className="db-table-wrap">
            <table className="db-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Action</th>
                  <th>Document</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={4}><span className="db-skeleton db-skeleton-row" /></td>
                    </tr>
                  ))}
                {!loading && (data?.recentActivity?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={4} className="db-empty-cell">No recent activity yet.</td>
                  </tr>
                )}
                {!loading &&
                  data?.recentActivity?.map((row) => (
                    <tr key={row.id}>
                      <td className="db-td-user">
                        <span className="db-mini-avatar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <circle cx="12" cy="8" r="3.5" />
                            <path d="M4.5 20c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5" />
                          </svg>
                        </span>
                        {row.user}
                      </td>
                      <td className="db-td-action">{row.action}</td>
                      <td>{row.document}</td>
                      <td className="db-td-time">{formatTime(row.time)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="db-panel db-downloads-panel">
          <div className="db-panel-header">
            <h2>Most Downloaded Documents</h2>
          </div>
          <ul className="db-doc-list">
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="db-doc-item">
                  <span className="db-skeleton db-skeleton-row" />
                </li>
              ))}
            {!loading && (data?.mostDownloaded?.length ?? 0) === 0 && (
              <li className="db-empty-cell">No documents yet.</li>
            )}
            {!loading &&
              data?.mostDownloaded?.map((doc) => (
                <li className="db-doc-item" key={doc.id}>
                  <span className="db-doc-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v4h4" />
                    </svg>
                  </span>
                  <div className="db-doc-text">
                    <span className="db-doc-title">{doc.title}</span>
                    <span className="db-doc-count">{doc.download_count ?? 0} downloads</span>
                  </div>
                  <svg className="db-doc-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </li>
              ))}
          </ul>
        </aside>
      </section>
    </DashboardLayout>
  );
}