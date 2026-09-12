import { supabase } from "./supabase";

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