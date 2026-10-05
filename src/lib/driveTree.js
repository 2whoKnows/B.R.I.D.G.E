/**
 * Pure helpers for working with the `folders` table as a tree.
 *
 * These are deliberately dependency-free (no React, no Supabase) so the same
 * logic can be used by the explorer UI, the "Move to…" dialog and any future
 * server-side or test code without pulling the app bundle in.
 *
 * Every function tolerates `null`/`undefined` entries and guards against
 * cycles, because folder data comes from a user-writable table and a bad
 * `parent_id` should never be able to hang the UI with an infinite loop.
 */

const safe = (list) => (Array.isArray(list) ? list.filter(Boolean) : []);

/**
 * Builds `Map<parentId, Folder[]>` for O(1) child lookups.
 * `null` is used as the key for root-level folders because `folders.parent_id`
 * is NULL for them.
 */
export function buildFolderIndex(folders) {
  const index = new Map();
  for (const folder of safe(folders)) {
    const key = folder.parent_id ?? null;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(folder);
  }
  // Alphabetical ordering everywhere so both the side tree and the "Move to…"
  // dialog list folders in the same, predictable order.
  for (const children of index.values()) {
    children.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }
  return index;
}

/**
 * Breadcrumb trail from the root down to `folderId`.
 * Always returns at least the root segment.
 *
 * The root segment uses `id: null` to match `documents.folder_id` and
 * `folders.parent_id`, where NULL means "top level".
 */
export function buildFolderTrail(folderId, folders) {
  const byId = new Map(safe(folders).map((f) => [f.id, f]));
  const trail = [];
  const seen = new Set();

  let currentId = folderId ?? null;
  while (currentId != null) {
    if (seen.has(currentId)) break; // cycle guard
    seen.add(currentId);
    const folder = byId.get(currentId);
    if (!folder) break; // folder deleted or not visible to this role
    trail.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parent_id ?? null;
  }

  return [{ id: null, name: "My Drive" }, ...trail];
}

/**
 * The folder itself plus every descendant, used to grey out illegal drop
 * targets (you cannot move a folder into itself or one of its own children).
 */
export function collectDescendantIds(folderId, folders) {
  const index = buildFolderIndex(folders);
  const result = new Set([folderId]);
  const queue = [folderId];

  while (queue.length > 0) {
    const current = queue.shift();
    for (const child of index.get(current) ?? []) {
      if (!result.has(child.id)) {
        result.add(child.id);
        queue.push(child.id);
      }
    }
  }
  return result;
}

/**
 * Flattened, depth-annotated list of every folder under `parentId`, sorted by
 * name. Powers the explorer side tree and the "Move to…" picker.
 *
 * `blockedIds` are skipped so a folder can never be shown as a drop target for
 * itself or for any of its own descendants.
 */
export function flattenFolderTree(folders, { parentId = null, blockedIds = new Set() } = {}) {
  const index = buildFolderIndex(folders);
  const result = [];

  const walk = (parent, depth) => {
    for (const folder of index.get(parent) ?? []) {
      if (blockedIds.has(folder.id)) continue;
      result.push({ ...folder, depth });
      walk(folder.id, depth + 1);
    }
  };

  walk(parentId ?? null, 0);
  return result;
}

/**
 * True when `candidateId` is `ancestorId` or lives beneath it. Used to reject
 * moves that would detach a subtree from the tree.
 */
export function isSameOrDescendant(candidateId, ancestorId, folders) {
  if (candidateId == null || ancestorId == null) return false;
  return collectDescendantIds(ancestorId, folders).has(candidateId);
}