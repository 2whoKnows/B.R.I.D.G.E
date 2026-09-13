import { supabase } from "./supabase";

/**
 * List all user profiles.
 *
 * REQUIRED: one-time SQL in the Supabase SQL Editor so the manager can read
 * all profiles rows (RLS on `profiles` would otherwise restrict each user to
 * reading only their own row via auth.uid() = id).
 *
 * Run this once:
 * ─────────────────────────────────────────────────────────────────────────────
 * CREATE POLICY "managers_can_read_all_profiles"
 * ON profiles FOR SELECT
 * TO authenticated
 * USING (
 *   (SELECT role FROM profiles WHERE id = auth.uid())
 *   IN ('document_manager', 'system_admin')
 * );
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Also ensure the self-read policy exists so teachers can still read their own
 * profile (AuthContext calls loadProfile on every session):
 * ─────────────────────────────────────────────────────────────────────────────
 * CREATE POLICY "users_can_read_own_profile"
 * ON profiles FOR SELECT
 * TO authenticated
 * USING (auth.uid() = id);
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function listUsers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active, department, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function updateUserRole(userId, role) {
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) throw error;
}

export async function updateUserActive(userId, isActive) {
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) throw error;
}
