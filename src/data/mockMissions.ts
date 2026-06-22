import { Mission, XP_BY_DIFFICULTY } from "./types";

/**
 * Mock de missões — usado em /dashboard e /missions.
 * Sem persistência: alterações de status são apenas locais (useState).
 * FUTURO: substituir por dados vindos do banco (ex.: Prisma/Supabase).
 *
 * O campo `schedule` define quando a missão aparece:
 * - { type: "today" }     → nas colunas do dia atual.
 * - { type: "weekly" }    → recorre nos dias da semana indicados.
 * - { type: "dates" }     → ocorre em datas específicas (ISO "YYYY-MM-DD").
 */
export const mockMissions: Mission[] = [
  {
    id: "m1",
    title: "Estudar 1 capítulo de System Design",
    description: "Avançar no roadmap de arquitetura.",
    category: "Profissional",
    difficulty: "Média",
    shift: "Manhã",
    status: "done",
    xp: XP_BY_DIFFICULTY["Média"],
    schedule: { type: "today" },
  },
  {
    id: "m2",
    title: "Revisar pull requests do time",
    description: "Garantir qualidade antes do deploy.",
    category: "Profissional",
    difficulty: "Fácil",
    shift: "Tarde",
    status: "done",
    xp: XP_BY_DIFFICULTY["Fácil"],
    schedule: { type: "today" },
  },
  {
    id: "m3",
    title: "Treino de força — 45 min",
    description: "Foco em membros superiores.",
    category: "Saúde",
    difficulty: "Difícil",
    shift: "Manhã",
    status: "pending",
    xp: XP_BY_DIFFICULTY["Difícil"],
    // recorrente: segunda, quarta e sexta
    schedule: { type: "weekly", weekdays: [1, 3, 5] },
  },
  {
    id: "m4",
    title: "Organizar planilha de gastos do mês",
    category: "Pessoal",
    difficulty: "Média",
    shift: "Noite",
    status: "done",
    xp: XP_BY_DIFFICULTY["Média"],
    schedule: { type: "today" },
  },
  {
    id: "m5",
    title: "Ler 20 páginas de um livro",
    category: "Pessoal",
    difficulty: "Fácil",
    shift: "Noite",
    status: "done",
    xp: XP_BY_DIFFICULTY["Fácil"],
    // recorrente: todos os dias úteis
    schedule: { type: "weekly", weekdays: [1, 2, 3, 4, 5] },
  },
  {
    id: "m6",
    title: "Resolver 3 desafios de algoritmo",
    description: "Manter o ritmo para entrevistas.",
    category: "Profissional",
    difficulty: "Difícil",
    shift: "Tarde",
    status: "pending",
    xp: XP_BY_DIFFICULTY["Difícil"],
    schedule: { type: "today" },
  },
  {
    id: "m7",
    title: "Beber 2L de água",
    category: "Saúde",
    difficulty: "Fácil",
    shift: "Tarde",
    status: "pending",
    xp: XP_BY_DIFFICULTY["Fácil"],
    // recorrente: todos os dias da semana
    schedule: { type: "weekly", weekdays: [0, 1, 2, 3, 4, 5, 6] },
  },
  {
    id: "m8",
    title: "Atualizar portfólio com novo projeto",
    category: "Profissional",
    difficulty: "Média",
    shift: "Noite",
    status: "pending",
    xp: XP_BY_DIFFICULTY["Média"],
    schedule: { type: "today" },
  },
  {
    id: "m9",
    title: "Planejar metas da próxima semana",
    category: "Pessoal",
    difficulty: "Fácil",
    shift: "Manhã",
    status: "pending",
    xp: XP_BY_DIFFICULTY["Fácil"],
    // recorrente: todo domingo
    schedule: { type: "weekly", weekdays: [0] },
  },
  {
    id: "m10",
    title: "Consulta médica",
    description: "Check-up semestral.",
    category: "Saúde",
    difficulty: "Fácil",
    shift: "Manhã",
    status: "pending",
    xp: XP_BY_DIFFICULTY["Fácil"],
    // datas específicas (futuras)
    schedule: { type: "dates", dates: ["2026-06-15", "2026-06-29"] },
  },
  {
    id: "m11",
    title: "Entregar relatório do projeto",
    description: "Fechar a sprint e enviar ao cliente.",
    category: "Profissional",
    difficulty: "Difícil",
    shift: "Tarde",
    status: "pending",
    xp: XP_BY_DIFFICULTY["Difícil"],
    // data específica única
    schedule: { type: "dates", dates: ["2026-06-20"] },
  },
];
