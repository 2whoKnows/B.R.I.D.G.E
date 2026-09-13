import { createContext, useContext, useEffect, useState } from "react";
import { getSession, loadProfile, onAuthStateChange, signOut as authSignOut } from "../lib/authQueries";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  async function hydrate(nextSession) { setSession(nextSession); if (nextSession?.user) { try { setProfile(await loadProfile(nextSession.user.id)); } catch { setProfile(null); } } else setProfile(null); setLoading(false); }
  useEffect(() => { getSession().then(hydrate); const subscription = onAuthStateChange((_event, nextSession) => { setLoading(true); hydrate(nextSession); }); return () => subscription.unsubscribe(); }, []);
  const value = { session, profile, role: profile?.role ?? null, isActive: profile?.is_active ?? false, loading, isAuthenticated: Boolean(session?.user) && Boolean(profile) && profile?.is_active, signOut: authSignOut };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error("useAuth must be used within AuthProvider"); return ctx; }
