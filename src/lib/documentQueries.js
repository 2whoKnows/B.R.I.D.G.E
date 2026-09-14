import { supabase } from "./supabase";

const BUCKET = "documents";

function resolveCurrentVersion(document) {
  const versions = [...(document.document_versions ?? [])];
  // Ground truth join: documents.current_version -> document_versions.version_number.
  // Prefer the exact match; fall back to the newest version only when the
  // current_version pointer has no matching row (e.g. stale pointer).
  const exact =
    document.current_version != null
      ? versions.find((v) => v.version_number === document.current_version)
      : null;
  const currentVersion =
    exact ??
    versions.sort((a, b) => (b.version_number ?? 0) - (a.version_number ?? 0))[0] ??
    null;

  return {
    ...document,
    file_name: currentVersion?.file_name ?? null,
    file_path: currentVersion?.file_path ?? null,
    file_size: currentVersion?.file_size ?? null,
    file_type: currentVersion?.mime_type ?? currentVersion?.file_type ?? null,
    version: currentVersion?.version_number ?? document.current_version ?? null,
    version_id: currentVersion?.id ?? null,
  };
}

function withCurrentVersion(document) {
  return resolveCurrentVersion(document);
}

export async function listDocuments({
  search = "",
  categoryId = null,
  page = 1,
  pageSize = 20,
} = {}) {
  let query = supabase
    .from("documents")
    .select(`
      id, title, description, status, current_version, category_id, created_at, updated_at,
      categories ( name ),
      document_versions ( id, version_number, file_name, file_path, file_size, file_type, mime_type )
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (categoryId) query = query.eq("category_id", categoryId);
  if (search) query = query.ilike("title", `%${search}%`);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    documents: (data ?? []).map(withCurrentVersion),
    total: count ?? 0,
  };
}

export async function getDocument(documentId) {
  const { data, error } = await supabase
    .from("documents")
    .select(`
      id, title, description, status, current_version, category_id, created_at, updated_at,
      categories ( name ),
      document_versions ( id, version_number, file_name, file_path, file_size, file_type, mime_type )
    `)
    .eq("id", documentId)
    .single();

  if (error) throw error;
  return withCurrentVersion(data);
}

export async function getSignedDownloadUrl(filePath, expiresInSeconds = 60, fileName = null) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresInSeconds, {
      // Passing a non-empty string sets Content-Disposition: attachment; filename=<fileName>
      // so the browser saves with the correct name. Falls back to the raw
      // storage path filename if no explicit name is provided.
      download: fileName || true,
    });

  if (error) throw error;
  return data.signedUrl;
}

export async function getSignedPreviewUrl(filePath, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresInSeconds, {
      // download:false → Supabase sets Content-Disposition: inline so the
      // browser renders the file in-place rather than saving it to disk.
      // Do NOT append &download=0 manually — the string "0" is truthy and
      // Supabase uses it as the attachment filename, causing an auto-download
      // with the saved filename literally being "0".
      download: false,
    });

  if (error) throw error;
  return data.signedUrl;
}

export async function recordDownload({ documentId, userId, versionId = null }) {
  await supabase.rpc("increment_document_downloads", { doc_id: documentId });

  if (!userId) return;

  let currentVersionId = versionId;
  if (!currentVersionId) {
    const { data, error } = await supabase
      .from("document_versions")
      .select("id, version_number")
      .eq("document_id", documentId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    currentVersionId = data?.id ?? null;
  }

  const { error: logError } = await supabase.from("download_logs").insert({
    document_id: documentId,
    version_id: currentVersionId,
    user_id: userId,
  });
  if (logError) throw logError;

  const { error: activityError } = await supabase.from("activity_logs").insert({
    user_id: userId,
    action: "download",
    document_id: documentId,
  });
  if (activityError) throw activityError;
}

export async function listDocumentsWithStats() {
  const { data, error } = await supabase
    .from("documents")
    .select(`
      id, title, description, status, current_version,
      total_views, total_downloads, created_at, updated_at,
      category_id,
      categories ( name ),
      profiles:uploaded_by ( full_name ),
      document_versions ( id, version_number, file_name, file_path, file_size, file_type, mime_type, created_at )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  // Sort nested versions client-side (PostgREST does not guarantee nested
  // order) so that document_versions[0] is always the newest version.
  // This keeps every `doc.document_versions?.[0]` call-site pointed at the
  // current version's real file_path/mime_type.
  const rows = (data ?? []).map((doc) => ({
    ...doc,
    document_versions: [...(doc.document_versions ?? [])].sort(
      (a, b) => (b.version_number ?? 0) - (a.version_number ?? 0)
    ),
  }));
  return rows;
}

export async function getCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function createCategory(name) {
  const { data, error } = await supabase
    .from("categories")
    .insert({ name, is_active: true })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCategory(categoryId) {
  const { error } = await supabase
    .from("categories")
    .update({ is_active: false })
    .eq("id", categoryId);

  if (error) throw error;
}

export async function getCurrentUserRole() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error) return null;
  return data.role;
}

export async function uploadNewDocument({ title, description, categoryId, file, userId }) {
  console.log('Upload data:', { title, description, categoryId, file, userId });
  
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({
      title,
      description: description || null,
      category_id: categoryId || null,
      uploaded_by: userId,
      current_version: 1,
    })
    .select()
    .single();

  if (docError) {
    console.error('Document insert error:', docError);
    throw docError;
  }

  const filePath = `${doc.id}/v1/${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { upsert: false });

  if (uploadError) {
    await supabase.from("documents").delete().eq("id", doc.id);
    throw uploadError;
  }

  const { error: versionError } = await supabase
    .from("document_versions")
    .insert({
      document_id: doc.id,
      version_number: 1,
      file_name: file.name,
      file_path: filePath,
      file_type: file.name.split(".").pop(),
      mime_type: file.type,
      file_size: file.size,
      uploaded_by: userId,
    });

  if (versionError) throw versionError;

  await supabase.from("activity_logs").insert({
    user_id: userId,
    action: "upload",
    document_id: doc.id,
    metadata: { title },
  });

  return doc;
}

export async function uploadNewVersion({ documentId, nextVersion, file, userId, changeNotes }) {
  const filePath = `${documentId}/v${nextVersion}/${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { upsert: false });

  if (uploadError) throw uploadError;

  const { error: versionError } = await supabase
    .from("document_versions")
    .insert({
      document_id: documentId,
      version_number: nextVersion,
      file_name: file.name,
      file_path: filePath,
      file_type: file.name.split(".").pop(),
      mime_type: file.type,
      file_size: file.size,
      change_notes: changeNotes || null,
      uploaded_by: userId,
    });

  if (versionError) throw versionError;

  const { error: docUpdateError } = await supabase
    .from("documents")
    .update({ current_version: nextVersion })
    .eq("id", documentId);

  if (docUpdateError) throw docUpdateError;

  await supabase.from("activity_logs").insert({
    user_id: userId,
    action: "update",
    document_id: documentId,
    metadata: { version: nextVersion },
  });
}

export async function recordView(documentId, userId, role) {
  if (role === "document_manager" || role === "system_admin") return;

  const { error: rpcError } = await supabase.rpc("increment_document_views", { doc_id: documentId });
  if (rpcError) throw rpcError;

  if (userId) {
    await supabase.from("activity_logs").insert({
      user_id: userId,
      action: "view",
      document_id: documentId,
    });
  }
}

export async function downloadDocument(documentId, versionId, filePath, userId, role, fileName) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 60);

  if (error) throw error;

  const response = await fetch(data.signedUrl);
  if (!response.ok) throw new Error("Failed to fetch file for download.");
  const blob = await response.blob();

  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = fileName || "download";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);

  const isManager = role === "document_manager" || role === "system_admin";

  if (!isManager) {
    await supabase.rpc("increment_document_downloads", { doc_id: documentId });

    if (userId) {
      await supabase.from("download_logs").insert({
        document_id: documentId,
        version_id: versionId,
        user_id: userId,
      });

      await supabase.from("activity_logs").insert({
        user_id: userId,
        action: "download",
        document_id: documentId,
      });
    }
  }
}
export async function deleteDocument(doc) {
  const filePaths = (doc.document_versions ?? []).map((v) => v.file_path);

  if (filePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove(filePaths);

    if (storageError) throw storageError;
  }

  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("id", doc.id);

  if (deleteError) throw deleteError;
}
