import { createContext, useContext, useEffect, useState } from "react";
import { getSession, loadProfile, onAuthStateChange, signOut as authSignOut } from "../lib/authQueries";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

// Swallow benign "play() interrupted by pause()" rejections that originate
// outside our code: there is no <video>/<audio> in this app, so this comes
// from a browser extension or embedded password-manager media probe on
// pages like /login. Without this, it surfaces as an uncaught console error.
if (typeof window !== "undefined" && !window.__bridgeMediaGuardInstalled) {
  window.__bridgeMediaGuardInstalled = true;
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event?.reason;
    const name = reason?.name;
    const message = String(reason?.message ?? reason ?? "");
    if (
      name === "AbortError" &&
      (/play\(\) request was interrupted/i.test(message) ||
        /interrupted by a call to pause\(\)/i.test(message))
    ) {
      event.preventDefault();
    }
  });
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  async function hydrate(nextSession) { setSession(nextSession); if (nextSession?.user) { try { setProfile(await loadProfile(nextSession.user.id)); } catch { setProfile(null); } } else setProfile(null); setLoading(false); }
  async function refreshProfile() {
    try {
      const { data: { session: current } } = await supabase.auth.getSession();
      if (current?.user) setProfile(await loadProfile(current.user.id));
    } catch {
      // keep stale profile on transient failure; caller surfaces the error
    }
  }
  useEffect(() => { getSession().then(hydrate); const subscription = onAuthStateChange((_event, nextSession) => { setLoading(true); hydrate(nextSession); }); return () => subscription.unsubscribe(); }, []);
  const value = { session, profile, role: profile?.role ?? null, isActive: profile?.is_active ?? false, loading, isAuthenticated: Boolean(session?.user) && Boolean(profile) && profile?.is_active, signOut: authSignOut, refreshProfile };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error("useAuth must be used within AuthProvider"); return ctx; }
