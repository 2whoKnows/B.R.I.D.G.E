import { supabase } from "./supabase";
import { collectDescendantIds, isSameOrDescendant } from "./driveTree";

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

export async function listDocumentsWithStats(folderId) {
  let query = supabase
    .from("documents")
    .select(`
      id, title, description, status, current_version,
      total_views, total_downloads, created_at, updated_at,
      category_id, folder_id,
      categories ( name ),
      profiles:uploaded_by ( full_name ),
      document_versions ( id, version_number, file_name, file_path, file_size, file_type, mime_type, created_at )
    `)
    .order("created_at", { ascending: false });

  // folderId === undefined -> return all (no filter)
  // folderId === null -> root docs only (where folder_id IS NULL)
  // folderId = string -> docs inside that specific folder
  if (folderId === null) {
    query = query.is("folder_id", null);
  } else if (folderId !== undefined) {
    query = query.eq("folder_id", folderId);
  }

  const { data, error } = await query;
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

export async function uploadNewDocument({ title, description, categoryId, file, userId, folderId = null }) {
  console.log('Upload data:', { title, description, categoryId, file, userId, folderId });
  
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({
      title,
      description: description || null,
      category_id: categoryId || null,
      folder_id: folderId || null,
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
  return deleteDocuments([doc]);
}

/**
 * Deletes many documents in one round-trip.
 *
 * `doc` objects must carry `document_versions` (as returned by
 * `listDocumentsWithStats`) so their storage objects can be reclaimed. Storage
 * cleanup is best-effort: a missing/failed storage delete must not block the
 * database rows from being removed, otherwise the user is left with orphaned
 * rows they can never get rid of. Storage objects are addressable by path, so
 * orphans are recoverable out-of-band.
 */
export async function deleteDocuments(docs) {
  const list = (docs ?? []).filter(Boolean);
  if (list.length === 0) return 0;

  const filePaths = list.flatMap((doc) => (doc.document_versions ?? []).map((v) => v.file_path)).filter(Boolean);

  if (filePaths.length > 0) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove(filePaths);
    if (storageError) console.warn("Storage cleanup failed for deleted documents:", storageError);
  }

  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .in("id", list.map((doc) => doc.id));

  if (deleteError) throw deleteError;
  return list.length;
}

/**
 * Immediate children of `parentId` (null = root).
 *
 * Read access is intentionally role-agnostic: folders created by document
 * managers are part of the shared drive structure and must also be listed for
 * teachers, so both portals navigate the exact same tree. Write access stays
 * behind the manager-only RLS policies in supabase/migrations.
 */
export async function listFolders(parentId = null) {
  let query = supabase
    .from("folders")
    .select(`
      id, name, parent_id, category_id, created_by, created_at, updated_at,
      categories ( name )
    `)
    .order("name", { ascending: true });

  if (parentId === null) {
    query = query.is("parent_id", null);
  } else {
    query = query.eq("parent_id", parentId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createFolder({ name, parentId = null, categoryId = null, createdBy = null }) {
  const { data, error } = await supabase
    .from("folders")
    .insert({
      name: name.trim(),
      parent_id: parentId || null,
      category_id: categoryId || null,
      created_by: createdBy || null,
    })
    .select(`
      id, name, parent_id, category_id, created_by, created_at, updated_at,
      categories ( name )
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFolder(folderId) {
  return deleteFolders([folderId]);
}

export async function renameFolder(folderId, newName) {
  const { data, error } = await supabase
    .from("folders")
    .update({ name: newName.trim(), updated_at: new Date().toISOString() })
    .eq("id", folderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function renameDocument(documentId, newTitle) {
  const { data, error } = await supabase
    .from("documents")
    .update({ title: newTitle.trim(), updated_at: new Date().toISOString() })
    .eq("id", documentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function moveDocument(documentId, targetFolderId) {
  const [moved] = await moveDocuments([documentId], targetFolderId);
  return moved;
}

/**
 * Moves many documents into a single folder (or to the root when
 * `targetFolderId` is null) with one UPDATE.
 *
 * `updated_at` is refreshed so the destination folder's listing re-sorts by
 * recency, matching what a single move already did.
 */
export async function moveDocuments(documentIds, targetFolderId) {
  const ids = [...new Set((documentIds ?? []).filter(Boolean))];
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("documents")
    .update({ folder_id: targetFolderId || null, updated_at: new Date().toISOString() })
    .in("id", ids)
    .select("id, folder_id");

  if (error) throw error;
  return data ?? [];
}

export async function moveFolder(folderId, targetParentId) {
  const [moved] = await moveFolders([folderId], targetParentId);
  return moved;
}

/**
 * Moves many folders under a new parent.
 *
 * Guards against moving a folder into itself or into one of its own
 * descendants, which would detach the subtree from the tree and make it
 * unreachable through the UI. Callers are expected to filter those out via
 * `driveTree` helpers; this is the last line of defence so a crafted request
 * cannot corrupt the hierarchy.
 */
export async function moveFolders(folderIds, targetParentId, allFolders = null) {
  const ids = [...new Set((folderIds ?? []).filter(Boolean))];
  if (ids.length === 0) return [];

  if (targetParentId != null && ids.includes(targetParentId)) {
    throw new Error("Cannot move a folder into itself.");
  }

  if (targetParentId != null && allFolders) {
    const blocked = ids.some((id) => isSameOrDescendant(targetParentId, id, allFolders));
    if (blocked) throw new Error("Cannot move a folder into one of its own subfolders.");
  }

  const { data, error } = await supabase
    .from("folders")
    .update({ parent_id: targetParentId || null, updated_at: new Date().toISOString() })
    .in("id", ids)
    .select("id, parent_id");

  if (error) throw error;
  return data ?? [];
}

/**
 * Deletes many folders at once.
 *
 * Folders that still contain documents or nested folders are emptied first,
 * matching the "delete folder and all of its contents" wording the UI already
 * used for a single folder.
 */
export async function deleteFolders(folderIds) {
  const ids = [...new Set((folderIds ?? []).filter(Boolean))];
  if (ids.length === 0) return 0;

  const allFolders = await getAllFolders();
  const toDelete = collectDescendantIds(ids[0], allFolders);
  ids.slice(1).forEach((id) => collectDescendantIds(id, allFolders).forEach((d) => toDelete.add(d)));

  // Detach contained documents so they surface at the root instead of
  // pointing at a folder row that no longer exists.
  await supabase
    .from("documents")
    .update({ folder_id: null })
    .in("folder_id", [...toDelete]);

  const { error } = await supabase.from("folders").delete().in("id", [...toDelete]);
  if (error) throw error;
  return toDelete.size;
}

/**
 * The complete folder tree, used to build breadcrumbs, the side tree and the
 * "Move to…" dialog without walking the hierarchy one level at a time.
 */
export async function getAllFolders() {
  const { data, error } = await supabase
    .from("folders")
    .select("id, name, parent_id, category_id, created_by, created_at, updated_at")
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listDocumentsInFolder(folderId) {
  return listDocumentsWithStats(folderId);
}


