import { supabase } from "./supabase";

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function loadProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("id, email, full_name, role, department, is_active").eq("id", userId).single();
  if (error) throw error;
  return data;
}

export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return subscription;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
