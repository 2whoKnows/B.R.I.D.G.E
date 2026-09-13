import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, Download, FileText } from "lucide-react";
import { listDocuments } from "../lib/documentQueries";
import "../styles/TeacherPortal.css";

const PAGE_SIZE = 10;

export default function TeacherDocuments() {
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get("category") || null;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ documents: [], total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    listDocuments({ search, categoryId, page, pageSize: PAGE_SIZE }).then(setResult).finally(() => setLoading(false));
  }, [search, categoryId, page]);

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div className="teacher-page space-y-5">
      <h1 className="text-xl font-semibold text-ink-900">Documents</h1>
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
        <input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="Search documents..." className="w-full rounded-control border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
      </div>
      <div className="divide-y divide-slate-100 rounded-card border border-slate-100 bg-white shadow-sm">
        {loading && <p className="px-4 py-6 text-center text-sm text-ink-400">Loading…</p>}
        {!loading && result.documents.length === 0 && <p className="px-4 py-6 text-center text-sm text-ink-400">No documents match your search.</p>}
        {!loading && result.documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3"><FileText size={18} className="shrink-0 text-ink-400" /><div className="min-w-0"><p className="truncate text-sm font-medium text-ink-900">{doc.title}</p><p className="truncate text-xs text-ink-400">{doc.categories?.name} · {new Date(doc.created_at).toLocaleDateString()}</p></div></div>
            <Link to={`/teacher/documents/${doc.id}`} className="flex shrink-0 items-center gap-1.5 rounded-control bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"><Download size={14} /> Open</Link>
          </div>
        ))}
      </div>
      {totalPages > 1 && <div className="flex items-center justify-center gap-2 text-sm"><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-control border border-slate-200 px-3 py-1.5 disabled:opacity-40">Prev</button><span className="text-ink-400">Page {page} of {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-control border border-slate-200 px-3 py-1.5 disabled:opacity-40">Next</button></div>}
    </div>
  );
}
