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

// --- Top downloaders (users who downloaded the most documents) --------

export async function getTopDownloaders(limit = 10, range = '30d') {
  let startDate = new Date();
  
  // Calculate start date based on range
  switch(range) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
  }
  
  startDate.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("download_logs")
    .select("user_id")
    .gte("downloaded_at", startDate.toISOString());

  if (error) throw error;

  // Count downloads per user
  const downloadCounts = {};
  (data ?? []).forEach((row) => {
    if (row.user_id) {
      downloadCounts[row.user_id] = (downloadCounts[row.user_id] || 0) + 1;
    }
  });

  // Get user details for top downloaders
  const sortedUserIds = Object.entries(downloadCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([userId]) => userId);

  if (sortedUserIds.length === 0) return [];

  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", sortedUserIds);

  if (usersError) throw usersError;

  return (users ?? [])
    .map((user) => ({
      id: user.id,
      name: user.full_name || "Unknown User",
      email: user.email,
      download_count: downloadCounts[user.id] || 0,
    }))
    .sort((a, b) => b.download_count - a.download_count);
}

// --- Downloads by category ----------------------------------------------

export async function getDownloadsByCategory(range = '30d') {
  let startDate = new Date();
  
  switch(range) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
  }
  
  startDate.setHours(0, 0, 0, 0);

  // Get download logs with document info
  const { data, error } = await supabase
    .from("download_logs")
    .select("document_id")
    .gte("downloaded_at", startDate.toISOString());

  if (error) throw error;

  const documentIds = [...new Set((data ?? []).map((row) => row.document_id).filter(Boolean))];

  if (documentIds.length === 0) return [];

  // Get document categories
  const { data: documents, error: docsError } = await supabase
    .from("documents")
    .select("id, category_id, categories ( name )")
    .in("id", documentIds);

  if (docsError) throw docsError;

  // Count downloads by category name
  const categoryCounts = {};
  const docsById = new Map((documents ?? []).map((doc) => [doc.id, doc]));

  (data ?? []).forEach((row) => {
    const doc = docsById.get(row.document_id);
    const categoryName = doc?.categories?.name;
    if (categoryName) {
      categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
    }
  });

  return Object.entries(categoryCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

// --- Activity breakdown (downloads vs views vs uploads over time) ------

export async function getActivityBreakdown(range = '30d') {
  let startDate = new Date();
  
  switch(range) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
  }
  
  startDate.setHours(0, 0, 0, 0);

  // Get all activity logs in range
  const { data, error } = await supabase
    .from("activity_logs")
    .select("action, created_at")
    .gte("created_at", startDate.toISOString());

  if (error) throw error;

  // Group by time period (daily for 7d/30d, weekly for 90d/1y)
  const isWeekly = range === '90d' || range === '1y';
  const timeGroups = {};

  (data ?? []).forEach((row) => {
    const date = new Date(row.created_at);
    let key;
    
    if (isWeekly) {
      // Group by week
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else {
      // Group by day
      key = date.toISOString().split('T')[0];
    }

    if (!timeGroups[key]) {
      timeGroups[key] = { downloads: 0, views: 0, uploads: 0 };
    }

    // Categorize actions
    const action = row.action?.toLowerCase() || '';
    if (action.includes('download')) {
      timeGroups[key].downloads++;
    } else if (action.includes('view') || action.includes('preview')) {
      timeGroups[key].views++;
    } else if (action.includes('upload') || action.includes('create')) {
      timeGroups[key].uploads++;
    }
  });

  // Convert to array and sort by date
  return Object.entries(timeGroups)
    .map(([date, activities]) => ({
      date,
      ...activities,
      total: activities.downloads + activities.views + activities.uploads
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

// --- One call to load everything the dashboard needs --------------------

export async function getDashboardData(range = '30d') {
  const [
    totalDocuments,
    totalTeachers,
    totalDownloads,
    downloadsThisMonth,
    monthlyAnalytics,
    mostDownloaded,
    recentActivity,
    topDownloaders,
    downloadsByCategory,
    activityBreakdown,
  ] = await Promise.all([
    getTotalDocuments(),
    getTotalTeachers(),
    getTotalDownloads(),
    getDownloadsThisMonth(),
    getMonthlyDownloadAnalytics(),
    getMostDownloadedDocuments(),
    getRecentActivity(),
    getTopDownloaders(10, range),
    getDownloadsByCategory(range),
    getActivityBreakdown(range),
  ]);

  return {
    totalDocuments,
    totalTeachers,
    totalDownloads,
    downloadsThisMonth,
    monthlyAnalytics,
    mostDownloaded,
    recentActivity,
    topDownloaders,
    downloadsByCategory,
    activityBreakdown,
  };
}