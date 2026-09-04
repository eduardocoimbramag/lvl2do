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
  /** uid do carregamento mais recente — descarta respostas fora de ordem. */
  const wantedUidRef = useRef<string | null>(null);

  const loadProfile = useCallback(
    async (uid: string | null) => {
      wantedUidRef.current = uid;
      if (!uid) {
        setProfile(null);
        return;
      }
      const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).single();

      // Resposta obsoleta: outro carregamento (troca de conta) começou depois
      // desta e é ele quem manda. Aplicar isto aqui mostraria o perfil de um
      // usuário dentro da sessão de outro.
      if (wantedUidRef.current !== uid) return;

      if (error) {
        // Falha de rede não pode DERRUBAR um profile bom: com profile null,
        // todo consumidor volta a ver 0 de XP. Mas só preservamos o que é
        // DESTE usuário — na troca de conta, o perfil anterior tem que cair.
        console.warn("[AuthProvider] falha ao carregar o profile:", error);
        setProfile((prev) => (prev && prev.id === uid ? prev : null));
        return;
      }
      setProfile(data as ProfileRow);
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

  // Re-carrega o profile ao voltar o foco para a aba/janela (auditoria A9):
  // se o usuário usou o app em outra aba/dispositivo, o estado local re-seeda
  // com os dados mais novos (os hooks só re-seedam quando não há interação
  // local pendente — flag `dirty` interna de cada um).
  useEffect(() => {
    if (!user?.id) return;
    const onFocus = () => {
      if (document.visibilityState === "visible") void loadProfile(user.id);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [user?.id, loadProfile]);

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
