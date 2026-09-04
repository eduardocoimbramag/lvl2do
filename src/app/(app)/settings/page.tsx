"use client";

import { useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ShieldAlert, Trash2, Loader2, AlertTriangle, Ban, Play, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/components/AuthProvider";
import { isDevUser } from "@/lib/devAccess";
import { resetMyAccount } from "@/lib/db/resetAccount";
import { useAttackAnimationPref } from "@/hooks/useAttackAnimationPref";
import { useAppStats } from "@/hooks/AppStateProvider";
import { useCharacterSkin } from "@/hooks/useCharacterSkin";
import { SKIN_TIERS } from "@/data/characterClasses";
import { cn } from "@/lib/utils";

/**
 * Configurações da conta.
 *
 * Era um modal aberto pelo menu do usuário; virou página para ganhar o que a
 * navegação lateral dá de graça — estado ativo, link direto e o botão voltar
 * do navegador funcionando como em qualquer outra aba.
 *
 * No fim, exibe a "Área de ADM" (ferramentas de dev) SOMENTE para e-mails
 * autorizados (ver isDevUser) — incluindo o reset da conta para testes.
 */
export default function SettingsPage() {
  const { user } = useAuth();
  const dev = isDevUser(user?.email);

  return (
    <>
      <PageHeader title="Configurações" subtitle="Preferências da sua conta." />

      <div className="max-w-2xl space-y-5">
        <section className="card-surface p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Conta</h2>
          <p className="text-sm text-soft">{user?.email ?? "—"}</p>
          <p className="mt-0.5 text-xs text-muted">
            Gerencie seu personagem e seus dados na aba{" "}
            <span className="text-brand-light">Perfil</span>.
          </p>
        </section>

        <PreferencesSection />

        {dev && <AdminArea />}
      </div>
    </>
  );
}

/** Preferências locais — valem só neste dispositivo. */
function PreferencesSection() {
  const { disabled, hydrated, setDisabled } = useAttackAnimationPref();
  // useReducedMotion devolve boolean | null (null no SSR); null é "não".
  const sistemaDesligou = useReducedMotion() === true;
  const off = disabled || sistemaDesligou;

  return (
    <section className="card-surface p-5">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        Preferências
      </h2>

      <p className="text-sm font-medium text-soft">Animação de ataque</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Ao concluir uma missão na aba <span className="text-soft">Missões</span>, a tela rola até
        as arenas, seu personagem caminha até o chefe, desfere o golpe e volta. Desativada, a
        vida do chefe apenas atualiza — sem caminhada e sem rolagem da tela.
      </p>

      {/* Botão e não interruptor: o rótulo É a ação, então não existe a
          ambiguidade "marcado = desligado" nem estado a anunciar à parte. */}
      <button
        type="button"
        disabled={!hydrated || sistemaDesligou}
        onClick={() => setDisabled(!disabled)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-soft transition-colors hover:border-brand/40 hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {off ? <Play size={14} /> : <Ban size={14} />}
        {off ? "Ativar animação de ataque" : "Desativar animação de ataque"}
      </button>

      {sistemaDesligou && (
        <p className="mt-2 text-xs text-muted">
          Desativada pelo seu sistema (&ldquo;reduzir movimento&rdquo;). Reative nas
          configurações do aparelho para poder ligá-la aqui.
        </p>
      )}
    </section>
  );
}

/** Ferramentas de administração/dev (pré-visualização de level up + reset de conta). */
function AdminArea() {
  // fluxo de confirmação: idle → confirming → resetting
  const [phase, setPhase] = useState<"idle" | "confirming" | "resetting">("idle");
  const [resetOnboarding, setResetOnboarding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { simulateLevelUp, stats } = useAppStats();
  const { isAuto } = useCharacterSkin();
  const [withNewSkin, setWithNewSkin] = useState(false);
  const nextTier = SKIN_TIERS.find((t) => t > stats.level) ?? stats.level + 1;
  // com a roupa fixada num tier antigo, resolveImage devolve a MESMA imagem
  // nos dois níveis: a opção não entregaria nada e não pode ser oferecida.
  const skinOptionAvailable = isAuto;

  async function handleReset() {
    setPhase("resetting");
    setError(null);
    try {
      await resetMyAccount({ resetOnboarding });
      // recarrega do zero (re-hidrata tudo do banco/localStorage limpo)
      window.location.href = resetOnboarding ? "/onboarding" : "/dashboard";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao resetar.");
      setPhase("idle");
    }
  }

  return (
    <section>
      <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-rose-300">
        <ShieldAlert size={13} /> Área de ADM
      </h2>
      {/* Pré-visualização da animação de level up — ferramenta inofensiva, por
          isso fica FORA da caixa vermelha de ações destrutivas.
          Usa o overlay único montado no layout, então a simulação atravessa
          exatamente o caminho de produção: mesmo mount point, mesmo contexto de
          empilhamento, mesmo portão de exibição. */}
      <div className="mb-3 rounded-2xl border border-brand/25 bg-brand/[0.06] p-5">
        <div className="flex items-start gap-2.5">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-brand-light" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-soft">Simular level up</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Abre a animação de subida de nível para conferência visual. Não credita XP, não
              altera seu nível e não grava nada no banco.
            </p>
          </div>
        </div>

        <label
          className={cn(
            "mt-3 flex items-center gap-2 text-xs text-muted",
            skinOptionAvailable ? "cursor-pointer" : "cursor-not-allowed opacity-50",
          )}
        >
          <input
            type="checkbox"
            checked={withNewSkin && skinOptionAvailable}
            disabled={!skinOptionAvailable}
            onChange={(e) => setWithNewSkin(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-white/20 bg-ink accent-brand"
          />
          Simular também a troca de aparência (Nível {nextTier})
        </label>
        {!skinOptionAvailable && (
          <p className="mt-1 text-xs text-muted/70">
            Indisponível: sua roupa está fixada num nível anterior, então a arte não muda.
          </p>
        )}

        <button
          type="button"
          onClick={() => simulateLevelUp(withNewSkin && skinOptionAvailable)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-xs font-medium text-brand-light transition-colors hover:bg-brand/20"
        >
          <Sparkles size={14} /> Ver animação
        </button>
      </div>

      <div className="rounded-2xl border border-rose-400/30 bg-rose-400/[0.06] p-5">
        <div className="flex items-start gap-2.5">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-300" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-soft">Resetar conta (dev)</p>
            <p className="mt-1 text-xs text-muted">
              Zera XP, nível, streak, missões, métricas, alarmes, notificações e tickets — como
              uma conta recém-criada. Ação <span className="text-rose-300">irreversível</span>.
            </p>
          </div>
        </div>

        {/* opção: voltar ao onboarding (limpa classe/skin) */}
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={resetOnboarding}
            onChange={(e) => setResetOnboarding(e.target.checked)}
            disabled={phase === "resetting"}
            className="h-3.5 w-3.5 rounded border-white/20 bg-ink accent-brand"
          />
          Também limpar classe/roupa (volta à escolha de classe)
        </label>

        {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}

        <div className="mt-3">
          {phase === "idle" && (
            <button
              type="button"
              onClick={() => setPhase("confirming")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-400/20"
            >
              <Trash2 size={14} /> Resetar minha conta
            </button>
          )}

          {phase === "confirming" && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-soft">Tem certeza? Não dá para desfazer.</span>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/50 bg-rose-400/20 px-3 py-1.5 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-400/30"
              >
                <Trash2 size={13} /> Sim, apagar tudo
              </button>
              <button
                type="button"
                onClick={() => setPhase("idle")}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted transition-colors hover:text-soft"
              >
                Cancelar
              </button>
            </div>
          )}

          {phase === "resetting" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              <Loader2 size={14} className="animate-spin" /> Resetando…
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
