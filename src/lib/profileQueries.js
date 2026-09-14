import { supabase } from "./supabase";

/**
 * Safe self-service profile update path.
 *
 * Calls the SECURITY DEFINER RPC `update_own_profile(...)` which can only
 * touch: full_name, department, grade_level, subjects, avatar_url.
 * It CANNOT change role / is_active / email / id by construction.
 *
 * Requires the SQL migration from the RLS cleanup to have been run
 * (function + 5-policy set, no self-UPDATE policy remaining).
 */

export function parseSubjectsInput(input) {
  if (Array.isArray(input)) {
    return input.map((s) => String(s ?? "").trim()).filter(Boolean);
  }
  if (typeof input !== "string") return [];
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function subjectsToInput(subjects) {
  if (Array.isArray(subjects)) return subjects.join(", ");
  if (typeof subjects === "string") return subjects;
  return "";
}

export async function updateOwnProfile({ full_name, department, grade_level, subjects, avatar_url }) {
  const subjectArray = parseSubjectsInput(subjects);

  const { data, error } = await supabase.rpc("update_own_profile", {
    p_full_name: full_name?.trim() ? full_name.trim() : null,
    p_department: department?.trim() ? department.trim() : null,
    p_grade_level: grade_level?.trim() ? grade_level.trim() : null,
    p_subjects: subjectArray,
    p_avatar_url: avatar_url?.trim() ? avatar_url.trim() : null,
  });

  if (error) {
    if (error.code === "42883" || /function.*does not exist/i.test(error.message ?? "")) {
      throw new Error(
        "Profile update function not found. Run the update_own_profile SQL migration in Supabase first, then retry."
      );
    }
    throw error;
  }

  // RPC returns a single row (RETURNS profiles). PostgREST wraps it either as
  // an object or a single-element array depending on version — normalize.
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}
