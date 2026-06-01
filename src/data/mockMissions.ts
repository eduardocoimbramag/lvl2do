import { Mission, XP_BY_DIFFICULTY } from "./types";

/**
 * Mock de missões — usado em /dashboard e /missions.
 * Sem persistência: alterações de status são apenas locais (useState).
 * FUTURO: substituir por dados vindos do banco (ex.: Prisma/Supabase).
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
  },
  {
    id: "m4",
    title: "Organizar planilha de gastos do mês",
    category: "Pessoal",
    difficulty: "Média",
    shift: "Noite",
    status: "done",
    xp: XP_BY_DIFFICULTY["Média"],
  },
  {
    id: "m5",
    title: "Ler 20 páginas de um livro",
    category: "Pessoal",
    difficulty: "Fácil",
    shift: "Noite",
    status: "done",
    xp: XP_BY_DIFFICULTY["Fácil"],
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
  },
  {
    id: "m7",
    title: "Beber 2L de água",
    category: "Saúde",
    difficulty: "Fácil",
    shift: "Tarde",
    status: "pending",
    xp: XP_BY_DIFFICULTY["Fácil"],
  },
  {
    id: "m8",
    title: "Atualizar portfólio com novo projeto",
    category: "Profissional",
    difficulty: "Média",
    shift: "Noite",
    status: "pending",
    xp: XP_BY_DIFFICULTY["Média"],
  },
  {
    id: "m9",
    title: "Planejar metas da próxima semana",
    category: "Pessoal",
    difficulty: "Fácil",
    shift: "Manhã",
    status: "pending",
    xp: XP_BY_DIFFICULTY["Fácil"],
  },
];
