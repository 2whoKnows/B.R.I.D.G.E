import { supabase } from "./supabase";

/**
 * Dashboard queries aligned to the schema in the project SQL.
 * Relevant tables:
 *   public.documents
 *   public.profiles
 *   public.activity_logs
 *   public.download_logs
 */

// --- Top stat cards ---------------------------------------------------

export async function getTotalDocuments() {
  const { count, error } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

export async function getTotalTeachers() {
  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "teacher");

  if (error) throw error;
  return count ?? 0;
}

export async function getTotalDownloads() {
  const { count, error } = await supabase
    .from("download_logs")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

export async function getDownloadsThisMonth() {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("download_logs")
    .select("*", { count: "exact", head: true })
    .gte("downloaded_at", start.toISOString());

  if (error) throw error;
  return count ?? 0;
}

// --- Download analytics (monthly totals for the current year) --------

export async function getMonthlyDownloadAnalytics() {
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();

  const { data, error } = await supabase
    .from("download_logs")
    .select("downloaded_at")
    .gte("downloaded_at", yearStart);

  if (error) throw error;

  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const counts = new Array(12).fill(0);

  (data ?? []).forEach((row) => {
    const m = new Date(row.downloaded_at).getMonth();
    counts[m] += 1;
  });

  const currentMonth = new Date().getMonth();
  return monthLabels
    .slice(0, currentMonth + 1)
    .map((label, i) => ({ label, value: counts[i] }));
}

// --- Most downloaded documents ----------------------------------------

export async function getMostDownloadedDocuments(limit = 5) {
  const { data, error } = await supabase
    .from("documents")
    .select("id, title, total_downloads")
    .order("total_downloads", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((doc) => ({
    ...doc,
    download_count: doc.total_downloads ?? 0,
  }));
}

// --- Recent activity feed ----------------------------------------------

export async function getRecentActivity(limit = 6) {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("id, action, created_at, user_id, document_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  const rows = data ?? [];
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
  const documentIds = [...new Set(rows.map((row) => row.document_id).filter(Boolean))];

  const [usersResult, documentsResult] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [] }),
    documentIds.length
      ? supabase.from("documents").select("id, title").in("id", documentIds)
      : Promise.resolve({ data: [] }),
  ]);

  const usersById = new Map((usersResult.data ?? []).map((user) => [user.id, user.full_name]));
  const documentsById = new Map((documentsResult.data ?? []).map((doc) => [doc.id, doc.title]));

  return rows.map((row) => ({
    id: row.id,
    user: usersById.get(row.user_id) ?? "Unknown",
    action: row.action,
    document: documentsById.get(row.document_id) ?? "—",
    time: row.created_at,
  }));
}

// --- One call to load everything the dashboard needs --------------------

export async function getDashboardData() {
  const [
    totalDocuments,
    totalTeachers,
    totalDownloads,
    downloadsThisMonth,
    monthlyAnalytics,
    mostDownloaded,
    recentActivity,
  ] = await Promise.all([
    getTotalDocuments(),
    getTotalTeachers(),
    getTotalDownloads(),
    getDownloadsThisMonth(),
    getMonthlyDownloadAnalytics(),
    getMostDownloadedDocuments(),
    getRecentActivity(),
  ]);

  return {
    totalDocuments,
    totalTeachers,
    totalDownloads,
    downloadsThisMonth,
    monthlyAnalytics,
    mostDownloaded,
    recentActivity,
  };
}