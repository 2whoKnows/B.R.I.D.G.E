import { supabase } from "./supabase";

/**
 * List all user profiles.
 *
 * WHY THE RPC PATH:
 * The `profiles` table has RLS enabled. The default anon-key policy only allows
 * each user to read their own row (auth.uid() = id). Document managers need to
 * read all rows, but we cannot use the service-role key on the client.
 *
 * Solution: call a SECURITY DEFINER Postgres function `get_all_profiles()` that
 * runs with elevated privileges and is only callable by authenticated users.
 *
 * Required SQL (run once in Supabase SQL Editor):
 * ─────────────────────────────────────────────────────────────────────────────
 * CREATE OR REPLACE FUNCTION get_all_profiles()
 * RETURNS SETOF profiles
 * LANGUAGE sql
 * SECURITY DEFINER
 * SET search_path = public
 * AS $$
 *   SELECT * FROM profiles ORDER BY created_at DESC;
 * $$;
 *
 * -- Allow any authenticated user to call it (route-level auth still protects
 * -- the manager UI, so only managers ever reach this code path).
 * GRANT EXECUTE ON FUNCTION get_all_profiles() TO authenticated;
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Alternatively, add a permissive RLS SELECT policy for managers:
 * ─────────────────────────────────────────────────────────────────────────────
 * CREATE POLICY "managers_can_read_all_profiles"
 * ON profiles FOR SELECT
 * TO authenticated
 * USING (
 *   (SELECT role FROM profiles WHERE id = auth.uid())
 *   IN ('document_manager', 'system_admin')
 * );
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function listUsers() {
  // Try the SECURITY DEFINER RPC first (bypasses RLS).
  const { data: rpcData, error: rpcError } = await supabase.rpc("get_all_profiles");

  if (!rpcError && rpcData) {
    return rpcData;
  }

  // Fallback: direct table query — works if the permissive RLS policy is in
  // place instead of the RPC function.
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
