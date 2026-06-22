"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LifeBuoy,
  Bug,
  Lightbulb,
  HelpCircle,
  Send,
  Trash2,
  CheckCircle2,
  Inbox,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { useTickets } from "@/hooks/useTickets";
import { TICKET_TYPES, type TicketType } from "@/data/types";
import { cn } from "@/lib/utils";

/** Ícone por tipo de ticket. */
const TYPE_ICON: Record<TicketType, LucideIcon> = {
  Problema: Bug,
  Sugestão: Lightbulb,
  Dúvida: HelpCircle,
};

const MONTHS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/** "2026-06-02" → "2 de jun de 2026". */
function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} de ${MONTHS[m - 1]} de ${y}`;
}

export default function SupportPage() {
  const { tickets, addTicket, toggleResolved, removeTicket } = useTickets();

  const [type, setType] = useState<TicketType>("Problema");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sent, setSent] = useState(false);

  const canSubmit = title.trim().length > 0 && description.trim().length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    addTicket({ type, title, description });
    // reseta o formulário e mostra confirmação breve
    setTitle("");
    setDescription("");
    setType("Problema");
    setSent(true);
    setTimeout(() => setSent(false), 2600);
  }

  return (
    <>
      <PageHeader
        title="Suporte"
        subtitle="Encontrou um problema ou tem uma sugestão? Deixe um ticket."
      />

      <div className="grid gap-5 lg:grid-cols-5">
        {/* formulário de novo ticket */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="card-surface p-6 lg:col-span-2"
        >
          <div className="mb-5 flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand-light">
              <LifeBuoy size={18} />
            </span>
            <h2 className="font-display text-base font-semibold text-soft">Novo ticket</h2>
          </div>

          <div className="space-y-5">
            {/* tipo */}
            <div>
              <label className="mb-1.5 block text-sm text-muted">Tipo</label>
              <div className="flex flex-wrap gap-2">
                {TICKET_TYPES.map((t) => {
                  const Icon = TYPE_ICON[t];
                  const active = type === t;
                  return (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setType(t)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                        active
                          ? "border-brand/50 bg-brand/15 text-brand-light"
                          : "border-white/10 bg-white/5 text-muted hover:text-soft",
                      )}
                    >
                      <Icon size={13} />
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* título */}
            <div>
              <label className="mb-1.5 block text-sm text-muted">Título</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: O XP não atualiza ao concluir missão"
                className="w-full rounded-xl border border-white/10 bg-ink px-4 py-2.5 text-sm text-soft placeholder:text-muted/60 focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>

            {/* descrição */}
            <div>
              <label className="mb-1.5 block text-sm text-muted">Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Descreva o problema, a sugestão ou a dúvida com o máximo de detalhes."
                className="w-full resize-y rounded-xl border border-white/10 bg-ink px-4 py-2.5 text-sm text-soft placeholder:text-muted/60 focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit}>
              <Send size={16} /> Enviar ticket
            </Button>

            <AnimatePresence>
              {sent && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="inline-flex items-center gap-2 rounded-xl border border-success/20 bg-success/5 px-3 py-2 text-xs text-success"
                >
                  <CheckCircle2 size={14} /> Ticket enviado! Obrigado pelo feedback.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* lista de tickets enviados */}
        <div className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display font-semibold text-soft">Seus tickets</h3>
            <span className="text-sm text-muted">
              {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
            </span>
          </div>

          {tickets.length === 0 ? (
            <div className="card-surface flex flex-col items-center gap-3 p-12 text-center">
              <Inbox className="text-muted" size={32} />
              <p className="text-sm text-muted">Você ainda não enviou nenhum ticket.</p>
              <p className="max-w-xs text-xs text-muted/70">
                Os tickets que você enviar aparecerão aqui, com tipo, data e status.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <AnimatePresence mode="popLayout">
                {tickets.map((t) => {
                  const Icon = TYPE_ICON[t.type];
                  const resolved = t.status === "Resolvido";
                  return (
                    <motion.div
                      key={t.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      className={cn(
                        "card-surface p-4",
                        resolved && "opacity-70",
                      )}
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand-light">
                            <Icon size={12} /> {t.type}
                          </span>
                          <span
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-xs font-medium",
                              resolved
                                ? "border-success/30 bg-success/10 text-success"
                                : "border-amber-400/20 bg-amber-400/5 text-amber-200/90",
                            )}
                          >
                            {t.status}
                          </span>
                          <span className="text-xs text-muted">{formatDate(t.createdAt)}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleResolved(t.id)}
                            aria-label={resolved ? "Reabrir ticket" : "Marcar como resolvido"}
                            title={resolved ? "Reabrir" : "Marcar como resolvido"}
                            className={cn(
                              "rounded-lg border p-1.5 transition-colors",
                              resolved
                                ? "border-success/40 bg-success/15 text-success"
                                : "border-white/10 bg-white/5 text-muted hover:border-success/40 hover:text-success",
                            )}
                          >
                            <CheckCircle2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeTicket(t.id)}
                            aria-label="Remover ticket"
                            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-muted transition-colors hover:border-rose-400/40 hover:text-rose-300"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <p
                        className={cn(
                          "text-sm font-semibold text-soft",
                          resolved && "line-through decoration-success/50",
                        )}
                      >
                        {t.title}
                      </p>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted">
                        {t.description}
                      </p>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
