import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Download, Star, ZoomIn, ZoomOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getDocument, getSignedDownloadUrl, recordDownload, recordView } from "../lib/documentQueries";
import "../styles/TeacherPortal.css";

export default function DocumentPreview() {
  const { documentId } = useParams();
  const { profile } = useAuth();
  const [doc, setDoc] = useState(null);
  const [tab, setTab] = useState("preview");
  const [zoom, setZoom] = useState(100);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    getDocument(documentId).then((d) => { setDoc(d); recordView(documentId, profile?.id, profile?.role); });
  }, [documentId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDownload() {
    if (!doc) return;
    setDownloading(true);
    try {
      const url = await getSignedDownloadUrl(doc.file_path);
      await recordDownload({ documentId: doc.id, userId: profile?.id, versionId: doc.version_id });
      window.open(url, "_blank");
    } finally { setDownloading(false); }
  }

  if (!doc) return <p className="teacher-page text-sm text-ink-400">Loading document…</p>;
  return <div className="teacher-page space-y-4"><div className="flex items-center justify-between"><Link to="/teacher/documents" className="flex items-center gap-2 text-sm font-medium text-ink-600"><ArrowLeft size={16} /> Back</Link><div className="flex gap-2"><button onClick={() => alert("Added to favorites")} className="flex items-center gap-1.5 rounded-control border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-slate-50"><Star size={14} /> Favorite</button><button onClick={handleDownload} disabled={downloading} className="flex items-center gap-1.5 rounded-control bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-50"><Download size={14} /> {downloading ? "Preparing…" : "Download"}</button></div></div><div><h1 className="text-lg font-semibold text-ink-900">{doc.title}</h1><p className="text-xs text-ink-400">{doc.file_type?.split("/").pop()?.toUpperCase()} · {(doc.file_size / 1024 / 1024).toFixed(1)} MB · Version {doc.version}</p></div><div className="flex gap-6 border-b border-slate-200 text-sm font-medium">{["preview", "details"].map((t) => <button key={t} onClick={() => setTab(t)} className={`-mb-px border-b-2 px-1 pb-2 capitalize ${tab === t ? "border-accent text-accent" : "border-transparent text-ink-400"}`}>{t}</button>)}</div>{tab === "preview" ? <div className="rounded-card border border-slate-200 bg-navy-900 p-4"><div className="mb-3 flex items-center justify-between text-white/70"><span className="text-xs">1 / 5</span><div className="flex items-center gap-2"><button onClick={() => setZoom((z) => Math.max(50, z - 10))} aria-label="Zoom out"><ZoomOut size={16} /></button><span className="w-10 text-center text-xs">{zoom}%</span><button onClick={() => setZoom((z) => Math.min(200, z + 10))} aria-label="Zoom in"><ZoomIn size={16} /></button></div></div><div className="mx-auto max-w-2xl rounded-md bg-white p-6" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}><p className="text-center text-sm text-ink-400">PDF preview renders here (wire up react-pdf or an &lt;iframe&gt; with a signed URL).</p></div></div> : <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-card border border-slate-100 bg-white p-5 text-sm sm:grid-cols-3"><Detail label="Category" value={doc.categories?.name} /><Detail label="File Type" value={doc.file_type} /><Detail label="File Size" value={`${(doc.file_size / 1024 / 1024).toFixed(1)} MB`} /><Detail label="Uploaded On" value={new Date(doc.created_at).toLocaleDateString()} /><Detail label="Version" value={`v${doc.version}`} /><div className="col-span-full"><dt className="text-xs font-medium text-ink-400">Description</dt><dd className="text-ink-900">{doc.description || "—"}</dd></div></dl>}</div>;
}

function Detail({ label, value }) { return <div><dt className="text-xs font-medium text-ink-400">{label}</dt><dd className="text-ink-900">{value || "—"}</dd></div>; }
