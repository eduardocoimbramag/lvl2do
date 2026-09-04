"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { emitBossHit } from "@/lib/bossEvents";
import { useAuth } from "@/components/AuthProvider";
import { updateMyProfile } from "@/lib/db/profiles";
import { daysBetweenDateKeys, DAILY_XP_LIMIT } from "@/lib/xp-system";
import { SKIN_TIERS } from "@/data/characterClasses";
import type { StatsFeedback } from "./useUserStats";
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

/**
 * Celebração de subida de nível — estado PRÓPRIO, copiado do feedback.
 *
 * Não é uma view do `feedback`: o toast auto-dispensa o feedback em 3,2 s e o
 * overlay só pode fechar no "Confirmar". Copiar é o que desacopla os dois
 * ciclos de vida.
 */
export type LevelUpCelebration = {
  /** nível de PARTIDA — base da arte antiga e do cálculo do delta. */
  fromLevel: number;
  /** nível ALCANÇADO. */
  level: number;
  /** XP creditado no evento (0 em simulação/recuperação). */
  xp: number;
  wasCapped: boolean;
  reachedDailyLimit: boolean;
  /** dano ao chefe no mesmo evento — decide se esperamos a coreografia. */
  bossDamage: number;
  /** "simulation" = botão de ADM; "recovered" = nível subiu com o app fechado. */
  source: "mission" | "simulation" | "recovered";
};

/** Marca, por usuário e por aparelho, o último nível já comemorado. */
const CELEBRATED_KEY = "lvl2do.levelUp.celebrated.v1";
function readCelebrated(userId: string): number | null {
  try {
    const v = window.localStorage.getItem(`${CELEBRATED_KEY}:${userId}`);
    const n = v == null ? NaN : Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
function writeCelebrated(userId: string, level: number) {
  try {
    window.localStorage.setItem(`${CELEBRATED_KEY}:${userId}`, String(level));
  } catch {
    /* storage bloqueado: a sessão atual ainda funciona, só não sobrevive a reload */
  }
}

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
  /** feedback filtrado: NUNCA contém subida de nível (essa vai para o overlay). */
  toastFeedback: StatsFeedback | null;
  levelUp: LevelUpCelebration | null;
  dismissLevelUp: () => void;
  /** só a Área de ADM chama — pré-visualização, zero efeito no XP. */
  simulateLevelUp: (withNewSkin?: boolean) => void;
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

  /* --------------------- celebração de subida de nível -------------------- */

  const [levelUp, setLevelUp] = useState<LevelUpCelebration | null>(null);
  /** dano do MESMO evento que gerou o feedback — define o atraso de entrada. */
  const lastBossDamage = useRef(0);
  const recovered = useRef(false);

  const rawFeedback = userStats.feedback;
  const dismissFeedback = userStats.dismissFeedback;
  const currentLevel = userStats.stats.level;

  /**
   * Feedback que o TOAST enxerga. Filtro em tempo de RENDER, não em efeito:
   * num efeito o toast já teria renderizado "Level Up! 🎉" uma vez e o
   * AnimatePresence tocaria entrada + saída — o piscar que o overlay existe
   * para evitar.
   */
  const toastFeedback: StatsFeedback | null =
    rawFeedback && rawFeedback.kind === "gain" && rawFeedback.levelDelta > 0 ? null : rawFeedback;

  /**
   * Roteia o level up para o overlay e limpa o feedback bruto.
   *
   * `kind === "gain"` de propósito: uma REVERSÃO pode devolver delta positivo
   * quando o estado local estava atrasado em relação ao servidor — desfazer
   * missão não é motivo para tela de comemoração. E `kind === "loss"`
   * (queda de nível por inatividade) continua inteiramente no XpToast.
   */
  useEffect(() => {
    if (!rawFeedback || rawFeedback.kind !== "gain" || rawFeedback.levelDelta <= 0) return;
    const { level, levelDelta, xp, wasCapped, reachedDailyLimit } = rawFeedback;
    setLevelUp((cur) =>
      // Já havia celebração REAL no ar (dois ganhos em sequência): mantém o
      // nível de PARTIDA original e soma o XP, em vez de sobrescrever.
      cur && cur.source !== "simulation"
        ? {
            ...cur,
            level,
            xp: cur.xp + xp,
            wasCapped: cur.wasCapped || !!wasCapped,
            reachedDailyLimit: !!reachedDailyLimit,
          }
        : {
            fromLevel: level - levelDelta,
            level,
            xp,
            wasCapped: !!wasCapped,
            reachedDailyLimit: !!reachedDailyLimit,
            bossDamage: lastBossDamage.current,
            source: "mission",
          },
    );
    dismissFeedback();
  }, [rawFeedback, dismissFeedback]);

  /**
   * RECUPERAÇÃO. A celebração é a recompensa central do produto e sobe uma vez
   * a cada 3+ dias — não pode se perder num reload, num crash ou por ter sido
   * ganha em outro aparelho. Na primeira vez que vemos um usuário, gravamos o
   * nível em silêncio (senão todo mundo comemoraria no próximo login).
   */
  useEffect(() => {
    if (!seedReady || !userId || recovered.current) return;
    recovered.current = true; // refs sobrevivem ao duplo-mount do StrictMode
    const seen = readCelebrated(userId);
    if (seen == null || currentLevel <= seen) {
      writeCelebrated(userId, currentLevel);
      return;
    }
    setLevelUp({
      fromLevel: seen,
      level: currentLevel,
      xp: 0,
      wasCapped: false,
      reachedDailyLimit: false,
      bossDamage: 0,
      source: "recovered",
    });
  }, [seedReady, userId, currentLevel]);

  const dismissLevelUp = useCallback(() => {
    // simulação NUNCA grava: marcar o nível N+1 como comemorado suprimiria a
    // celebração de verdade quando ela chegasse.
    if (levelUp && userId && levelUp.source !== "simulation") {
      writeCelebrated(userId, levelUp.level);
    }
    setLevelUp(null);
  }, [levelUp, userId]);

  /**
   * Pré-visualização da animação (Área de ADM). NÃO credita XP, NÃO escreve no
   * banco, NÃO mexe em `stats`, NÃO chama showFeedback — só liga o overlay.
   */
  const simulateLevelUp = useCallback(
    (withNewSkin = false) => {
      const target = withNewSkin
        ? (SKIN_TIERS.find((t) => t > currentLevel) ?? currentLevel + 1)
        : currentLevel + 1;
      setLevelUp({
        fromLevel: currentLevel,
        level: target,
        xp: 0,
        wasCapped: false,
        reachedDailyLimit: false,
        bossDamage: 0,
        source: "simulation",
      });
    },
    [currentLevel],
  );

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
        // guardado ANTES do showFeedback: o efeito que roteia o level up lê
        // este ref para saber se precisa esperar a coreografia do chefe.
        lastBossDamage.current = bossDamage ?? 0;
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
    toastFeedback,
    levelUp,
    dismissLevelUp,
    simulateLevelUp,
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
