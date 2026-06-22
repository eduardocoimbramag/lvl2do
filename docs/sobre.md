# lvl2do — Descrição do Produto

## O que é o lvl2do?

**lvl2do** é um SaaS de produtividade gamificado que transforma tarefas do dia a dia em missões de RPG. A premissa central é simples: toda vez que você conclui uma tarefa, você ganha XP, sobe de nível e evolui o seu personagem — exatamente como em um jogo. A ideia é tornar a rotina mais engajante, dar ao usuário uma sensação de progressão real e transformar disciplina em algo divertido.

O produto é voltado para pessoas que têm dificuldade de manter consistência em suas rotinas — seja no trabalho, nos estudos ou na saúde — e que se identificam com a estética e a linguagem dos videogames.

---

## Problema que resolve

A maioria dos apps de produtividade é funcional, mas frio. Você cria tarefas, marca como feito, e... nada acontece. Não há recompensa, não há progresso visível, não há motivo emocional para voltar amanhã.

O **lvl2do** resolve isso introduzindo uma camada de jogo sobre a rotina: cada tarefa concluída tem peso (XP por dificuldade), cada nível conquistado muda visualmente o seu personagem, e o streak diário cria um compromisso emocional com a consistência.

---

## Proposta de Valor

- **Produtividade com propósito:** missões organizadas por categoria (Profissional, Pessoal, Saúde) e turno (Manhã, Tarde, Noite).
- **Progressão visível:** sistema de XP e níveis que evolui o personagem — arte do personagem muda a cada faixa (lv1, 10, 25, 50, 100).
- **Identidade do jogador:** o usuário escolhe uma classe de personagem (Guerreiro, Ladrão, Arqueira, Bruxa ou Bardo), cada uma com sua estética e tagline.
- **Foco e disciplina:** modo Focus com temporizador Pomodoro integrado para sessões de trabalho concentrado.
- **Alarmes inteligentes:** sistema de alarmes para missões, com som configurável e notificações nativas.
- **Acompanhamento de evolução:** gráfico de XP semanal, streak, taxa de conclusão e histórico de missões.
- **Suporte ao usuário:** sistema de tickets para reportar problemas, enviar sugestões e tirar dúvidas — diretamente dentro do app.

---

## Público-alvo

- Jovens adultos (18–35 anos) que se identificam com games e cultura pop.
- Pessoas que já usaram apps de to-do e abandonaram por falta de motivação.
- Estudantes, freelancers e profissionais que precisam de estrutura na rotina mas querem algo além de uma lista simples.

---

## Funcionalidades principais (MVP atual)

| Área | O que existe hoje |
|---|---|
| **Missões** | Criar, concluir e excluir missões com categoria, dificuldade, turno e agendamento (hoje, semanal ou datas específicas) |
| **XP & Nível** | Ganho automático de XP ao concluir missões (10/25/50 XP por dificuldade), cálculo de nível em tempo real |
| **Personagem** | Seleção de classe no onboarding, avatar que evolui visualmente por faixa de nível, carrossel de skins |
| **Focus Mode** | Timer estilo Pomodoro com sessões configuráveis, animação de anel de foco e indicador de sessão ativa |
| **Alarmes** | Criação de alarmes com hora, som e dias da semana, disparo com notificação |
| **Dashboard** | Resumo do dia: missões do turno atual, XP diário, streak, nível e próximas missões |
| **Progress** | Gráfico de XP por semana, calendário mensal de atividade, métricas por período (dia/semana/mês) |
| **Perfil** | Visualização de classe, nível, XP acumulado, streak e troca de classe/outfit |
| **Suporte** | Abertura e acompanhamento de tickets (problema, sugestão, dúvida) |
| **Notificações** | Central de notificações no app (level up, missões, alertas) |

---

## Sistema de XP e Níveis

```
Fácil   →  10 XP
Média   →  25 XP
Difícil →  50 XP
```

O nível do personagem é calculado com base no XP total acumulado. A cada faixa de nível (1, 10, 25, 50, 100), a arte do personagem evolui para uma versão mais poderosa — visualmente recompensando a consistência do usuário.

---

## Classes de Personagem

| Classe | Tagline |
|---|---|
| Guerreiro | Força e disciplina |
| Ladrão | Agilidade e astúcia |
| Arqueira | Precisão e foco |
| Bruxa | Magia e intuição |
| Bardo | Carisma e inspiração |

Cada classe tem acento de cor próprio e arte exclusiva que evolui por nível.

---

## Stack Técnica

- **Next.js 15** (App Router) + **React 19**
- **TypeScript**
- **Tailwind CSS** — design tokens da marca definidos em `tailwind.config.ts`
- **Framer Motion** — animações de transição e feedback
- **Lucide React** — ícones
- **Recharts** — gráfico de XP semanal
- **Clerk** — autenticação (integrado: login, registro, proteção de rotas via middleware)
- Arquitetura baseada em hooks (`useMissions`, `useUserStats`, `useFocusTimer`, `useAlarms`, etc.)

---

## Modelo de Negócio

O lvl2do opera no modelo **freemium**:

- **Plano Gratuito:** acesso às funcionalidades core (missões, XP, níveis, focus, alarmes básicos).
- **Plano Pro:** funcionalidades avançadas como relatórios detalhados, análises inteligentes de produtividade, temas visuais exclusivos e skins premium.

---

## Próximos passos

1. Integrar banco de dados (Prisma + PostgreSQL ou Supabase) para persistência real de missões, XP e usuários.
2. Calcular streak real no servidor a partir do histórico de conclusões.
3. Implementar o plano Pro com billing (Stripe).
4. Análises inteligentes por categoria e período.
5. Testes automatizados (unit + E2E).
6. Telemetria e analytics de uso.

---

*Documento gerado em junho de 2026 — estado atual: front-end completo com autenticação Clerk ativa, dados em mock aguardando persistência real.*
