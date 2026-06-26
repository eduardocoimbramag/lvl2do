"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { ProfileRow } from "@/types/database";

interface AuthContextValue {
  /** usuário do Supabase Auth (ou null). */
  user: User | null;
  /** profile do banco (nickname, classe, XP, etc.) ou null. */
  profile: ProfileRow | null;
  /** true até o auth + profile inicial carregarem. */
  loading: boolean;
  /** recarrega o profile a partir do banco (após updates). */
  refreshProfile: () => Promise<void>;
  /** encerra a sessão. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Provedor de autenticação (Supabase Auth) + profile do usuário.
 * Substitui o Clerk: expõe `useAuth()` para todo o app.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  const loadProfile = useCallback(
    async (uid: string | null) => {
      if (!uid) {
        setProfile(null);
        return;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
      setProfile((data as ProfileRow | null) ?? null);
    },
    [supabase],
  );

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      // adia chamadas ao supabase para fora do callback (evita deadlock do lock)
      setTimeout(async () => {
        await loadProfile(u?.id ?? null);
        if (!initialized.current) {
          initialized.current = true;
          setLoading(false);
        }
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, [supabase, loadProfile]);

  const refreshProfile = useCallback(
    () => loadProfile(user?.id ?? null),
    [loadProfile, user],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  return ctx;
}
