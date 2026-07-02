"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  canAccessApp,
  getAccessReason,
  hasCrystalsAvailable,
  type AccessData,
  type AccessReason,
} from "@/lib/access/accessRules";
import { startRevenueCatCheckout, type CheckoutResult } from "@/lib/payments/revenuecat";
import { getLocalDateKey } from "@/lib/xp-system";
import type { ProfileRow } from "@/types/database";

/** Chave da simulação de acesso em desenvolvimento. */
const DEV_ACCESS_KEY = "lvl2do.devAccess.v1";
/** Evento interno disparado quando a simulação muda (sincroniza instâncias). */
const DEV_ACCESS_EVENT = "lvl2do:devAccessChanged";

/** true fora de produção — habilita as ferramentas de simulação do paywall. */
export const IS_DEV = process.env.NODE_ENV !== "production";

/** Estrutura salva no localStorage de dev (simulação de acesso). */
interface DevAccessState {
  /** simula assinatura Pro ativa. */
  pro?: boolean;
  /** dia ("YYYY-MM-DD") em que um cristal liberou o acesso (simulado). */
  crystalDay?: string | null;
}

function loadDevAccess(): DevAccessState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DEV_ACCESS_KEY);
    return raw ? (JSON.parse(raw) as DevAccessState) : {};
  } catch {
    return {};
  }
}

function saveDevAccess(next: DevAccessState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEV_ACCESS_KEY, JSON.stringify(next));
  } catch {
    /* ignora */
  }
  // notifica TODAS as instâncias do hook (mesma aba) para reavaliarem o acesso.
  window.dispatchEvent(new CustomEvent(DEV_ACCESS_EVENT));
}

/** Lê os campos de assinatura do profile (podem não existir ainda). */
function subscriptionFromProfile(profile: ProfileRow | null): Pick<
  AccessData,
  "subscriptionStatus" | "subscriptionExpiresAt" | "plan" | "crystals" | "lastCrystalAccessDate"
> {
  return {
    subscriptionStatus: profile?.subscription_status ?? null,
    subscriptionExpiresAt: profile?.subscription_expires_at ?? null,
    plan: profile?.plan ?? null,
    crystals: profile?.crystals ?? 0,
    lastCrystalAccessDate: profile?.last_crystal_access_date ?? null,
  };
}

/**
 * Controla o estado de acesso/paywall no cliente.
 *
 * Fonte dos dados: o `profile` do AuthProvider (campos de assinatura, quando
 * existirem) + uma simulação SÓ de desenvolvimento no localStorage (assinatura
 * Pro e cristal-do-dia), para permitir testar o app interno enquanto o pagamento
 * real não existe. Em produção, a simulação é ignorada.
 */
export function useAccessGate() {
  const { profile, loading } = useAuth();

  // estado de dev (simulação) — hidratado no cliente
  const [dev, setDev] = useState<DevAccessState>({});
  const [devHydrated, setDevHydrated] = useState(false);

  useEffect(() => {
    if (!IS_DEV) {
      setDevHydrated(true);
      return;
    }
    setDev(loadDevAccess());
    setDevHydrated(true);

    // sincroniza esta instância com mudanças feitas em qualquer outra instância
    // do hook (evento interno) ou em outra aba (evento nativo `storage`).
    const sync = () => setDev(loadDevAccess());
    const onStorage = (e: StorageEvent) => {
      if (e.key === DEV_ACCESS_KEY) sync();
    };
    window.addEventListener(DEV_ACCESS_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(DEV_ACCESS_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // dados combinados para as regras puras
  const accessData: AccessData = useMemo(() => {
    const sub = subscriptionFromProfile(profile);
    if (!IS_DEV) return sub;
    // dev: assinatura simulada e/ou cristal-do-dia simulado sobrepõem o real
    const devBypass = !!dev.pro;
    const lastCrystalAccessDate = dev.crystalDay ?? sub.lastCrystalAccessDate;
    return { ...sub, devBypass, lastCrystalAccessDate };
  }, [profile, dev]);

  const hasAccess = useMemo(() => canAccessApp(accessData), [accessData]);
  const reason: AccessReason = useMemo(() => getAccessReason(accessData), [accessData]);
  const crystals = profile?.crystals ?? 0;
  const canUseCrystal = useMemo(
    () => !hasAccess && hasCrystalsAvailable(accessData),
    [hasAccess, accessData],
  );

  // loading = auth carregando OU (em dev) simulação ainda não hidratada
  const isLoading = loading || (IS_DEV && !devHydrated);

  /**
   * Libera o acesso de HOJE usando 1 cristal.
   *
   * TODO(backend): trocar por uma RPC atômica `consume_daily_crystal` que
   * debite 1 cristal e grave `last_crystal_access_date = hoje` no banco (com
   * checagem para não cobrar duas vezes no mesmo dia). Por enquanto, só simula
   * a liberação do dia no localStorage (NÃO muta cristais reais).
   */
  const useCrystalForToday = useCallback(() => {
    if (!IS_DEV) {
      // TODO: chamar RPC consume_daily_crystal e refreshProfile.
      console.warn("[useAccessGate] consumo de cristal ainda não implementado (backend).");
      return;
    }
    const today = getLocalDateKey(new Date());
    setDev((prev) => {
      const next = { ...prev, crystalDay: today };
      saveDevAccess(next);
      return next;
    });
  }, []);

  /**
   * Inicia o checkout de assinatura.
   *
   * TODO(RevenueCat): plugar o fluxo real. Hoje delega ao placeholder, que não
   * cobra nada e retorna estado controlado.
   */
  const startCheckout = useCallback(async (): Promise<CheckoutResult> => {
    return startRevenueCatCheckout();
  }, []);

  /** [DEV] Simula assinatura Pro ativa (para testar o app interno). */
  const simulateProAccess = useCallback(() => {
    if (!IS_DEV) return;
    setDev((prev) => {
      const next = { ...prev, pro: true };
      saveDevAccess(next);
      return next;
    });
  }, []);

  /** [DEV] Reseta a simulação de acesso. */
  const resetDevAccess = useCallback(() => {
    if (!IS_DEV) return;
    setDev({});
    saveDevAccess({});
  }, []);

  return {
    loading: isLoading,
    hasAccess,
    reason,
    crystals,
    canUseCrystal,
    useCrystalForToday,
    startCheckout,
    /** habilita a exibição das dev tools no paywall (nunca em produção). */
    isDev: IS_DEV,
    simulateProAccess,
    resetDevAccess,
  };
}
