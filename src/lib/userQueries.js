import { supabase } from "./supabase";

/**
 * List all user profiles.
 *
 * ─── IMPORTANT: RLS SETUP (run once in Supabase SQL Editor) ───────────────
 *
 * If you applied the "managers_can_read_all_profiles" policy that queries
 * `profiles` inside its USING clause, DROP IT IMMEDIATELY — it causes
 * infinite recursion (every profiles SELECT evaluates the policy, which
 * SELECTs profiles again → 500 errors on every profiles operation).
 *
 *   DROP POLICY IF EXISTS "managers_can_read_all_profiles" ON profiles;
 *
 * Then apply the correct approach — a SECURITY DEFINER helper function that
 * reads the current user's role without triggering RLS on profiles itself:
 *
 *   -- Step 1: helper function (bypasses RLS, safe because it only reads
 *   --         the calling user's own row by auth.uid())
 *   CREATE OR REPLACE FUNCTION get_my_role()
 *   RETURNS text
 *   LANGUAGE sql
 *   SECURITY DEFINER
 *   STABLE
 *   SET search_path = public
 *   AS $$
 *     SELECT role FROM profiles WHERE id = auth.uid();
 *   $$;
 *
 *   GRANT EXECUTE ON FUNCTION get_my_role() TO authenticated;
 *
 *   -- Step 2: manager read-all policy using the helper (no recursion)
 *   CREATE POLICY "managers_can_read_all_profiles"
 *   ON profiles FOR SELECT
 *   TO authenticated
 *   USING (get_my_role() IN ('document_manager', 'system_admin'));
 *
 *   -- Step 3: self-read policy so teachers can read their own profile
 *   CREATE POLICY "users_can_read_own_profile"
 *   ON profiles FOR SELECT
 *   TO authenticated
 *   USING (auth.uid() = id);
 *
 *   -- Step 4: allow authenticated users to insert/upsert their own profile
 *   --         (needed for the Login.jsx and AuthCallback fallback creation)
 *   CREATE POLICY "users_can_upsert_own_profile"
 *   ON profiles FOR INSERT
 *   TO authenticated
 *   WITH CHECK (auth.uid() = id);
 *
 *   CREATE POLICY "users_can_update_own_profile"
 *   ON profiles FOR UPDATE
 *   TO authenticated
 *   USING (auth.uid() = id);
 *
 * ──────────────────────────────────────────────────────────────────────────
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
