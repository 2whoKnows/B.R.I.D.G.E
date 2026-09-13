export default function StatCard({ icon: Icon, label, value }) {
  return <div className="flex items-center gap-3 rounded-card border border-slate-100 bg-white p-4 shadow-sm"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent"><Icon size={18} /></div><div><p className="text-xs font-medium text-ink-400">{label}</p><p className="text-xl font-semibold text-ink-900">{value}</p></div></div>;
}
