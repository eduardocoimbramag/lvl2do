"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { emitBossHit } from "@/lib/bossEvents";
import { useAuth } from "@/components/AuthProvider";
import { updateMyProfile } from "@/lib/db/profiles";
import { daysBetweenDateKeys, DAILY_XP_LIMIT } from "@/lib/xp-system";
import { useUserStats } from "./useUserStats";
import { useMissions } from "./useMissions";
import { useStreak } from "./useStreak";
import { useTodayKey } from "./useTodayKey";
import { useAlarms } from "./useAlarms";
import { useNotifications } from "./useNotifications";

/**
 * Estado global do app (missões + progressão de XP) em uma única instância.
 * O XP/level e as missões são persistidos no Supabase (por usuário); o streak
 * vem do profile. Concluir uma missão credita XP e atualiza todas as telas.
 */
type AlarmsApi = ReturnType<typeof useAlarms> & {
  /** desativa um alarme por id (idempotente). */
  toggleEnabledOff: (id: string) => void;
};

type AppState = ReturnType<typeof useUserStats> & {
  /** chave do dia local ("YYYY-MM-DD") como estado — muda na virada (day tick). */
  todayKey: string;
  /** streak EXIBIDO (0 quando a sequência já quebrou — auditoria A4). */
  streak: number;
  /** maior streak já alcançado, vindo do profile. */
  bestStreak: number;
  missionsApi: ReturnType<typeof useMissions>;
  alarmsApi: AlarmsApi;
  notificationsApi: ReturnType<typeof useNotifications>;
};

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const userId = user?.id ?? null;

  /**
   * As sementes vieram MESMO do banco?
   *
   * Este provider monta ACIMA do ClassGuard/AccessGuard e o AuthProvider só
   * preenche o profile depois de um await de rede — então no primeiro render
   * `profile` é SEMPRE null e todas as sementes valem 0/null. Gravar nesse
   * estado zerava o XP do usuário a cada carregamento. Ver docs/auditoriaxp.md.
   */
  const seedReady = !loading && !!profile;

  // "hoje" como estado — atualiza na virada de meia-noite com o app aberto
  // (auditoria A2). Entra nas deps de tudo que depende do dia atual.
  const todayKey = useTodayKey();

  // a perda por inatividade só liga quando a coluna existe no banco (senão a
  // marca de checagem não persiste e a perda repetiria a cada reload).
  const lossCheckSupported = !!profile && "last_xp_loss_check_date" in profile;

  // persiste XP/level + contadores diários (hoje e ontem) no profile (best-effort).
  //
  // IMPORTANTE (robustez): as colunas yesterday_*/last_xp_loss_check_date podem
  // não existir ainda no banco. Se o upsert estendido falhar, refazemos SÓ com
  // os campos essenciais — total_xp/daily_xp SEMPRE persistem.
  const persistStats = useCallback(
    (s: {
      totalXp: number;
      level: number;
      dailyXp: number;
      dailyXpDate: string;
      yesterdayXp: number;
      yesterdayXpDate: string | null;
      lastXpLossCheckDate: string | null;
    }) => {
      const core = {
        total_xp: s.totalXp,
        level: s.level,
        daily_xp: s.dailyXp,
        daily_xp_date: s.dailyXpDate,
      };
      updateMyProfile({
        ...core,
        yesterday_xp: s.yesterdayXp,
        yesterday_xp_date: s.yesterdayXpDate,
        // só envia a marca de inatividade quando a coluna existe (evita
        // derrubar o upsert inteiro em bancos sem a migração)
        ...(lossCheckSupported ? { last_xp_loss_check_date: s.lastXpLossCheckDate } : {}),
      }).catch((e) => {
        console.warn("[persistStats] upsert estendido falhou; gravando essenciais:", e);
        updateMyProfile(core).catch((e2) =>
          console.warn("[persistStats] fallback essencial também falhou:", e2),
        );
      });
    },
    [lossCheckSupported],
  );

  /**
   * Persiste SOMENTE os orçamentos diários.
   *
   * Canal separado do persistStats de propósito: migrar o contador do dia não
   * é motivo para reescrever total_xp/level, e foi esse acoplamento que
   * produziu a zeragem. Sem fallback que reintroduza o total.
   */
  const persistDailyBudgets = useCallback(
    (s: {
      dailyXp: number;
      dailyXpDate: string;
      yesterdayXp: number;
      yesterdayXpDate: string | null;
      lastXpLossCheckDate: string | null;
    }) => {
      updateMyProfile({
        daily_xp: s.dailyXp,
        daily_xp_date: s.dailyXpDate,
        yesterday_xp: s.yesterdayXp,
        yesterday_xp_date: s.yesterdayXpDate,
        ...(lossCheckSupported ? { last_xp_loss_check_date: s.lastXpLossCheckDate } : {}),
      }).catch((e) => console.warn("[persistDailyBudgets] falhou:", e));
    },
    [lossCheckSupported],
  );

  // progressão (XP/level + diário) semeada do banco — conta nova começa em 0.
  const userStats = useUserStats({
    seedTotalXp: profile?.total_xp ?? 0,
    seedDailyXp: profile?.daily_xp ?? 0,
    seedDailyXpDate: profile?.daily_xp_date ?? null,
    seedYesterdayXp: profile?.yesterday_xp ?? 0,
    seedYesterdayXpDate: profile?.yesterday_xp_date ?? null,
    todayKey,
    seedLastCompletedAt: profile?.last_mission_completed_at ?? null,
    seedLossCheckDate: profile?.last_xp_loss_check_date ?? null,
    inactivityEnabled: lossCheckSupported,
    seedReady,
    persistDailyBudgets,
    persistStats,
  });

  // streak (dias consecutivos) semeado do profile e persistido ao concluir.
  const persistStreak = useCallback(
    (current: number, best: number, lastCompletedAtISO: string) => {
      updateMyProfile({
        current_streak: current,
        best_streak: best,
        last_mission_completed_at: lastCompletedAtISO,
      }).catch(() => {});
    },
    [],
  );
  const streakApi = useStreak({
    seedCurrent: profile?.current_streak ?? 0,
    seedBest: profile?.best_streak ?? 0,
    seedLastCompletedAt: profile?.last_mission_completed_at ?? null,
    persist: persistStreak,
  });

  // Streak de EXIBIÇÃO (auditoria A4): se a última conclusão foi antes de
  // ontem, a sequência já quebrou — mostra 0 sem esperar a próxima conclusão.
  const displayStreak = useMemo(() => {
    const last = streakApi.lastCompletedKey;
    if (!last) return 0;
    const gap = daysBetweenDateKeys(last, todayKey);
    return gap <= 1 ? streakApi.current : 0;
  }, [streakApi.lastCompletedKey, streakApi.current, todayKey]);

  // alarmes + notificações (estado local) — antes das missões, pois o fluxo
  // de erro das RPCs usa a central de notificações.
  const alarms = useAlarms();
  const notificationsApi = useNotifications();
  const addNotification = notificationsApi.addNotification;

  const adoptServerProfile = userStats.adoptServerProfile;
  const showFeedback = userStats.showFeedback;
  const adoptStreak = streakApi.adoptServerSnapshot;

  /**
   * Missões — conclusão/reversão via RPC ATÔMICA no servidor (XP + streak +
   * xp_events na mesma transação). O cliente apenas ADOTA o profile retornado
   * e exibe o toast; nenhuma matemática de crédito acontece aqui.
   */
  const missionsApi = useMissions({
    userId,
    todayKey,
    onServerUpdate: ({ kind, profile, xp, baseXp, dateKey, category, boss, bossDamage }) => {
      const { levelBefore, levelAfter } = adoptServerProfile(profile);
      adoptStreak(
        profile.current_streak ?? 0,
        profile.best_streak ?? 0,
        profile.last_mission_completed_at ?? null,
      );
      if (kind === "complete") {
        // O trigger de dano roda na MESMA transação da RPC, então o estado que
        // chega aqui já é o pós-golpe. Mandamos o estado inteiro (e o dano) em
        // vez de só a categoria: assim quem ouve não precisa adivinhar se houve
        // dano nem re-buscar. Revert não emite — revert não cura o boss.
        emitBossHit({ category, damage: bossDamage ?? 0, boss: boss ?? null });
        showFeedback({
          kind: "gain",
          xp,
          baseXp,
          wasCapped: baseXp != null && xp < baseXp,
          reachedDailyLimit:
            dateKey === profile.daily_xp_date && (profile.daily_xp ?? 0) >= DAILY_XP_LIMIT,
          levelDelta: levelAfter - levelBefore,
          level: levelAfter,
        });
      } else if (xp > 0) {
        showFeedback({
          kind: "revert",
          xp: -xp,
          levelDelta: levelAfter - levelBefore,
          level: levelAfter,
        });
      }
    },
    onRpcError: (message) => {
      addNotification({ type: "warning", title: "Falha ao salvar", description: message });
    },
  });

  const setEnabled = alarms.setEnabled;
  const toggleEnabledOff = useCallback((id: string) => setEnabled(id, false), [setEnabled]);
  const alarmsApi: AlarmsApi = useMemo(
    () => ({ ...alarms, toggleEnabledOff }),
    [alarms, toggleEnabledOff],
  );

  const value: AppState = {
    ...userStats,
    todayKey,
    streak: displayStreak,
    bestStreak: streakApi.best,
    missionsApi,
    alarmsApi,
    notificationsApi,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

/** Acessa o estado de progressão (XP/level/daily/feedback/streak) global. */
export function useAppStats(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppStats deve ser usado dentro de <AppStateProvider>.");
  }
  return ctx;
}

/** Acessa a API de missões global (mesma instância em todas as páginas). */
export function useAppMissions() {
  return useAppStats().missionsApi;
}

/** Acessa a API de alarmes global (mesma instância em página e scheduler). */
export function useAppAlarms() {
  return useAppStats().alarmsApi;
}

/** Acessa a API de notificações global (compartilhada com a sineta). */
export function useAppNotifications() {
  return useAppStats().notificationsApi;
}
