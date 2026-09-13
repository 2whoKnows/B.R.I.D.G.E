import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Download, FileText, BookOpen, ClipboardList, LayoutTemplate } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getCategories as listCategories, listDocuments } from "../lib/documentQueries";
import "../styles/TeacherPortal.css";

const CATEGORY_ICONS = {
  Rubrics: FileText,
  Guidelines: BookOpen,
  Templates: LayoutTemplate,
  Forms: ClipboardList,
};

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState([]);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [cats, docs] = await Promise.all([
        listCategories(),
        listDocuments({ page: 1, pageSize: 5 }),
      ]);
      setCategories(cats);
      setRecentDocuments(docs.documents);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, []);

  return (
    <div className="teacher-page space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">
          Good morning, {profile?.full_name ?? "[Teacher Name]"}!
        </h1>
        <p className="text-sm text-ink-400">Find the documents you need for your work.</p>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents, categories, or keywords..."
          className="w-full rounded-control border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-900">Browse by Category</h2>
          <Link to="/teacher/documents" className="text-xs font-medium text-accent">View All</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(loading ? Array.from({ length: 4 }) : categories).map((cat, i) => {
            const Icon = CATEGORY_ICONS[cat?.name] ?? FileText;
            return (
              <Link key={cat?.id ?? i} to={`/teacher/documents?category=${cat?.id ?? ""}`} className="flex items-center gap-3 rounded-card border border-slate-100 bg-white p-4 shadow-sm hover:border-accent/40">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent"><Icon size={16} /></div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{cat?.name ?? "—"}</p>
                  <p className="text-xs text-ink-400">{cat?.docCount ?? "—"} documents</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-900">Recent Documents</h2>
          <Link to="/teacher/documents" className="text-xs font-medium text-accent">View All</Link>
        </div>
        <div className="divide-y divide-slate-100 rounded-card border border-slate-100 bg-white shadow-sm">
          {(loading ? Array.from({ length: 3 }) : recentDocuments).map((doc, i) => (
            <div key={doc?.id ?? i} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <FileText size={18} className="shrink-0 text-ink-400" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{doc?.title ?? "Loading…"}</p>
                  <p className="truncate text-xs text-ink-400">{doc?.categories?.name ?? ""} · {doc ? new Date(doc.created_at).toLocaleDateString() : ""}</p>
                </div>
              </div>
              <Link to={doc ? `/teacher/documents/${doc.id}` : "#"} className="flex shrink-0 items-center gap-1.5 rounded-control bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"><Download size={14} /> Download</Link>
            </div>
          ))}
          {!loading && recentDocuments.length === 0 && <p className="px-4 py-6 text-center text-sm text-ink-400">No documents yet.</p>}
        </div>
      </section>
    </div>
  );
}
