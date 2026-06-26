"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Gift, Clock, Users, Watch, Shirt } from "lucide-react";
import { CrystalIcon, CapIcon } from "./RewardIcons";
import { useAuth } from "./AuthProvider";
import { getReferralSummary, type ReferralSummary } from "@/lib/db/social";
import {
  MILESTONES,
  SEASON_MAX,
  CRYSTALS_PER_REFERRAL,
  getCurrentSeason,
  type RewardToken,
} from "@/data/referral";
import { cn } from "@/lib/utils";

const ITEM_ICON: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  bracelet: Watch,
  shirt: Shirt,
  cap: CapIcon,
  mystery: Gift,
};

/**
 * Bloco compacto de indicações exibido no Perfil (entre os stats e o
 * desempenho por categoria): convite, cristais e metas da temporada.
 * Dados reais: código/cristais do profile + contagem de indicações.
 */
export function ReferralSection() {
  const { profile } = useAuth();
  const [summary, setSummary] = useState<ReferralSummary>({ total: 0, pending: 0, thisSeason: 0 });

  useEffect(() => {
    if (!profile) return;
    let active = true;
    getReferralSummary()
      .then((s) => {
        if (active) setSummary(s);
      })
      .catch((e) => console.error("Erro ao carregar indicações:", e));
    return () => {
      active = false;
    };
  }, [profile]);

  const code = profile?.referral_code ?? null;
  const inviteUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://lvl2do.app";
    return code ? `${origin}/register?ref=${code}` : "";
  }, [code]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <InviteCard inviteUrl={inviteUrl} total={summary.total} pending={summary.pending} />
      <CrystalsCard crystals={profile?.crystals ?? 0} />
      <SeasonCard referralsThisSeason={summary.thisSeason} className="sm:col-span-2 lg:col-span-2" />
    </motion.div>
  );
}

/* ----------------------------- Convite ----------------------------------- */

function InviteCard({
  inviteUrl,
  total,
  pending,
}: {
  inviteUrl: string;
  total: number;
  pending: number;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* silencioso */
    }
  }

  return (
    <div className="card-surface flex flex-col p-4">
      <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
        <Gift size={13} className="text-brand-light" /> Convide e ganhe
      </p>

      <div className="mt-2.5 flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate rounded-lg border border-white/10 bg-ink px-2.5 py-1.5 text-xs text-soft">
          {inviteUrl || "Gerando link…"}
        </span>
        <button
          type="button"
          onClick={copy}
          disabled={!inviteUrl}
          aria-label="Copiar link de convite"
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-50",
            copied
              ? "bg-success/15 text-success"
              : "bg-brand/15 text-brand-light hover:bg-brand/25",
          )}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>

      <p className="mt-auto pt-2.5 text-[11px] text-muted">
        <span className="font-semibold text-soft">{total}</span> convidados
        {" · "}
        <span className="font-semibold text-soft">{pending}</span> aguardando
      </p>
    </div>
  );
}

/* ----------------------------- Cristais ---------------------------------- */

function CrystalsCard({ crystals }: { crystals: number }) {
  return (
    <div className="card-surface flex flex-col justify-center p-4">
      <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
        <CrystalIcon size={13} /> Cristais de energia
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <CrystalIcon size={26} />
        <span className="font-display text-2xl font-bold tabular-nums text-soft">
          {crystals.toLocaleString("pt-BR")}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted">+{CRYSTALS_PER_REFERRAL} por indicação confirmada</p>
    </div>
  );
}

/* -------------------------- Metas da temporada --------------------------- */

function SeasonCard({
  referralsThisSeason,
  className,
}: {
  referralsThisSeason: number;
  className?: string;
}) {
  const season = getCurrentSeason();
  const pct = Math.min(100, (referralsThisSeason / SEASON_MAX) * 100);

  return (
    <div className={cn("card-surface flex flex-col p-4", className)}>
      {/* cabeçalho compacto */}
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
          <Gift size={13} className="text-brand-light" /> Metas · Temporada {season.number}
        </p>
        <div className="flex items-center gap-3 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            <Clock size={11} className="text-amber-400" />
            <span className="font-semibold tabular-nums text-soft">{season.daysLeft}</span>d
          </span>
          <span className="inline-flex items-center gap-1">
            <Users size={11} className="text-brand-light" />
            <span className="font-semibold tabular-nums text-soft">{referralsThisSeason}</span>
          </span>
        </div>
      </div>

      {/* barra com pins de recompensa sobre cada checkpoint */}
      <div className="relative mb-5 mt-11 h-2 rounded-full bg-white/10">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-brand-gradient"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />

        {MILESTONES.map((m) => {
          const unlocked = referralsThisSeason >= m.target;
          const align = m.target <= 10 ? "left" : m.target >= 100 ? "right" : "center";
          return (
            <div key={m.target} className="absolute top-0 h-2" style={{ left: `${m.target}%` }}>
              {/* pin de recompensa (acima) */}
              <RewardPin
                rewards={m.rewards}
                unlocked={unlocked}
                align={align as "left" | "center" | "right"}
              />

              {/* nó no trilho */}
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2",
                  unlocked ? "border-brand bg-brand" : "border-white/25 bg-ink-card",
                )}
              />

              {/* número do checkpoint (abaixo) */}
              <span className="absolute left-0 top-[14px] -translate-x-1/2 text-[10px] font-semibold tabular-nums text-muted">
                {m.target}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Pin minimalista de recompensa, ancorado acima do checkpoint. */
function RewardPin({
  rewards,
  unlocked,
  align,
}: {
  rewards: RewardToken[];
  unlocked: boolean;
  align: "left" | "center" | "right";
}) {
  const primary = rewards[0];
  const Icon = primary.kind === "crystal" ? CrystalIcon : ITEM_ICON[primary.key] ?? Gift;
  const label = rewards
    .map((t) => (t.kind === "crystal" ? `${t.amount}× cristais` : t.label))
    .join(" + ");

  return (
    <div className="group/pin absolute bottom-[14px] left-0 -translate-x-1/2">
      <button
        type="button"
        aria-label={label}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg border transition-colors",
          unlocked
            ? "border-brand/50 bg-brand/15 text-brand-light shadow-glow-sm"
            : "border-white/10 bg-ink-card text-muted hover:border-brand/30 hover:text-brand-light",
        )}
      >
        <Icon size={14} />
      </button>

      {/* ponteiro apontando para o nó */}
      <span
        className={cn(
          "absolute -bottom-[3px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 border-b border-r",
          unlocked ? "border-brand/50 bg-brand/15" : "border-white/10 bg-ink-card",
        )}
      />

      {/* tooltip */}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-[34px] z-10 whitespace-nowrap rounded-md border border-white/10 bg-ink-card px-2 py-1 text-[10px] text-soft opacity-0 shadow-glow-sm transition-opacity duration-150 group-hover/pin:opacity-100 group-focus-within/pin:opacity-100",
          align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2",
        )}
      >
        {label}
      </span>
    </div>
  );
}
