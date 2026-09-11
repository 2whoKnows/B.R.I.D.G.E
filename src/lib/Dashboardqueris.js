import { supabase } from "./supabase";

/**
 * These queries assume a schema along the lines of:
 *   documents      (id, title, uploaded_at, download_count, ...)
 *   users          (id, full_name, role, created_at)  -- role: 'teacher' | 'manager' | ...
 *   activity_log   (id, user_id, action, document_id, created_at)
 *
 * Rename tables/columns below to match your actual Supabase schema.
 * Everything here reads live data — nothing is hardcoded.
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
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "teacher");
  if (error) throw error;
  return count ?? 0;
}

export async function getTotalDownloads() {
  const { count, error } = await supabase
    .from("activity_log")
    .select("*", { count: "exact", head: true })
    .eq("action", "download");
  if (error) throw error;
  return count ?? 0;
}

export async function getDownloadsThisMonth() {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("activity_log")
    .select("*", { count: "exact", head: true })
    .eq("action", "download")
    .gte("created_at", start.toISOString());
  if (error) throw error;
  return count ?? 0;
}

// --- Download analytics (monthly totals for the current year) --------

export async function getMonthlyDownloadAnalytics() {
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();

  const { data, error } = await supabase
    .from("activity_log")
    .select("created_at")
    .eq("action", "download")
    .gte("created_at", yearStart);
  if (error) throw error;

  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const counts = new Array(12).fill(0);

  (data ?? []).forEach((row) => {
    const m = new Date(row.created_at).getMonth();
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
    .select("id, title, download_count")
    .order("download_count", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// --- Recent activity feed ----------------------------------------------

export async function getRecentActivity(limit = 6) {
  const { data, error } = await supabase
    .from("activity_log")
    .select("id, action, created_at, users(full_name), documents(title)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    user: row.users?.full_name ?? "Unknown",
    action: row.action,
    document: row.documents?.title ?? "—",
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