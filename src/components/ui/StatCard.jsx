export default function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon-wrap">
        {Icon && <Icon size={20} />}
      </div>
      <div className="kpi-content">
        <div className="kpi-val">{value}</div>
        <div className="kpi-lbl">{label}</div>
      </div>
    </div>
  );
}
