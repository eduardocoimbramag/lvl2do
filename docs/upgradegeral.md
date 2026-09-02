# upgradegeral.md — plano de elevação do lvl2do

**Versão 2 — revisada contra o código.** A versão 1 era um bom plano de produto e um mau plano de execução: subestimava esforço, supunha infraestrutura que não existe no repositório e continha contradições internas que se anulavam. Esta versão corrige isso. Onde a v1 estava errada, o erro está dito, não apagado.

**O que mudou do v1 para o v2, em sete linhas:**

1. Apareceu uma **Onda 0** de bloqueadores de segurança que precede tudo — inclusive um furo maior do que o "item zero" da v1: `profiles` é **gravável coluna a coluna pelo cliente**, o que torna XP, nível, streak e (quando existirem) as colunas de assinatura auto-atribuíveis.
2. O **cristal é aposentado**. Duas moedas era uma decisão que se contradizia em três lugares; uma moeda digital resolve tudo e custa um `update`.
3. O **tesouro do boss não paga XP** — o que desfaz a única matemática que a v1 tinha errado feio.
4. A **curva nova sobe o topo** (nível 100 = 160.980 XP), porque com teto suave o topo antigo virava seis meses.
5. Entraram os capítulos que não existiam: **aquisição, cadastro, e-mail, PWA, o usuário que volta, cobrança brasileira de verdade, cancelamento, downgrade, custos, LGPD e acessibilidade**.
6. As estimativas foram refeitas. Várias dobraram ou triplicaram. O roteiro passou de "90 dias, três ondas" para **"90 dias, Onda 0 + Onda 1 + metade da Onda 2"**, que é o que o histórico do repositório sustenta.
7. Crítica improcedente foi para a seção **Descartado**, no fim, em uma linha cada.

**Convenção de esforço** (horas de trabalho concentrado, não dias de calendário):
`P` = até 4h · `M` = 4–16h · `G` = 16–40h · `GG` = mais de 40h
**Impacto:** baixo / médio / alto — em *sensação do usuário* ou em *receita*.

**Convenção nova, e a mais importante deste documento:**
> 🚧 **DEPENDE DE INFRA QUE NÃO EXISTE.** Todo item marcado assim precisa de algo que hoje não está no repositório (coluna, tabela, serviço, service worker, agendador). O esforço declarado **não inclui** construir essa infra — o pré-requisito está sempre nomeado logo em seguida.

---

## 1. Resumo executivo

### 1.1 Onda 0 — os sete bloqueadores (≈10h somadas)

Isto não é uma onda de melhorias. É a lista do que precisa estar fechado **antes de qualquer mudança de schema, de curva, de economia ou de preço**. Nenhum item aqui é opcional e nenhum leva mais de três horas.

| # | Bloqueador | Evidência | Correção | Esforço |
|---|---|---|---|---|
| **0.1** | **`profiles` é gravável coluna a coluna pelo cliente.** `total_xp`, `level`, `current_streak`, `best_streak`, `crystals` — e, quando existirem, `plan` e `subscription_status`. Todo o anti-abuso das RPCs é contornável com um `PATCH`. | `supabase/schema.sql:54-56` e `fix-profiles.sql:55` — `for update using (auth.uid() = id)`, sem restrição de coluna | `revoke update on public.profiles from authenticated;` + `grant update (name, nickname, tag, avatar_url, character_class, character_skin) on public.profiles to authenticated;` (GRANT por coluna é a ferramenta certa; RLS não restringe coluna). Trigger de guarda como cinto e suspensório. | P (30min) |
| **0.2** | **O ranking anual é gravável em uma requisição.** `POST /rest/v1/xp_events {amount: 9999999}` → o trigger `apply_xp_event()` soma em `profiles.year_xp` sem clamp. E `xp_events_delete_own` deixa o cliente **apagar a própria auditoria**. | `2026-progress-streak.sql:43`, `2026-social.sql:47-60`, `reset-delete-policies.sql:13` | `drop policy "xp_events_insert_own"` + `drop policy "xp_events_delete_own"` + `revoke insert, delete on xp_events from authenticated`. A escrita real vem de `complete_mission_atomic` (security definer, ignora RLS). `logXpEvent` em `src/lib/db/xpEvents.ts:20` **não tem chamador** — é código morto. | P (15min) |
| **0.3** | **`missions.xp` vem do cliente.** `src/lib/db/missions.ts:43` insere `xp` livre; nada no banco amarra XP à dificuldade. Com o dano de boss por dificuldade (§5.6), isso vira dano forjado. | `schema.sql:84` + `missions_insert_own` | Trigger `before insert or update on missions`: `new.xp := case new.difficulty when 'Fácil' then 10 when 'Média' then 25 when 'Difícil' then 50 end`. | P (30min) |
| **0.4** | **O preço do resgate vem do cliente.** `redeem_product(p_cost)` confia no argumento. Camiseta de 450 por 0. | `2026-social.sql:125` + `store/page.tsx:39` | Tabela `store_products(id, cost, active)`; a RPC lê o preço de lá e ignora o argumento. Isso vale para o catálogo digital inteiro do §5.7 — se nascer com o padrão atual, nasce furado. | P (1h) |
| **0.5** | **Sem clamp de data em `complete_mission_atomic`.** `v_date := coalesce(p_completed_for_date, ...)` sem limite → N datas = N × 300 XP, e streak de 365 dias construído numa tarde. | `2026-mission-completions.sql:110` | `if v_date > v_real_day or v_date < v_real_day - 1 then raise exception 'invalid_date'; end if;` | P (30min) |
| **0.6** | **O deploy limpo está quebrado.** `fundodragao/fundocavaleiro/fundoorc.png` são referenciados em `src/data/bosses.ts:33,38,43` e **não estão versionados** (`git ls-files public/bosses` devolve só os três bosses). | `git status` | `git add` os três (depois de recomprimir — §3.5). | P (45min) |
| **0.7** | **Backup que existe e foi testado.** Mexer em curva, teto e economia sem restauração testada é apostar o produto. | — | `pg_dump` semanal fora do fornecedor + **uma restauração de verdade num projeto vazio**, antes do primeiro pagante. Backup não testado não é backup. | P (2h) |

**Item 0.8, ainda na Onda 0 mas de 3h:** `mission_completions.mission_id` é `on delete cascade` (`2026-mission-completions.sql:23`), diferente de `boss_hits`, que usa `set null` exatamente para não ser burlável. Apagar a missão apaga a conclusão, o `sum(credited_xp)` do orçamento volta a zero e o `total_xp` **não** é debitado → loop criar→concluir→apagar = XP infinito para qualquer data que não seja hoje/ontem. Some `mission_completions_delete_own` (`:67`), que dá DELETE direto ao cliente. Correção: FK para `set null`, `revoke delete` do cliente, e o "resetar conta" passa a ser RPC.

> **A leitura desconfortável da Onda 0:** a v1 dizia que "o anti-abuso já está sólido". Não está. O que está sólido é o *caminho feliz* — a RPC de conclusão é bem escrita, atômica e documentada. O problema é que o cliente não precisa passar por ela.

### 1.2 As cinco apostas

Em ordem. Se só der para fazer as três primeiras, faça as três primeiras — **depois da Onda 0.**

#### Aposta 1 — Abrir o produto (matar o paywall total e o portão de cristal)

**O que é:** `canAccessApp()` (`src/lib/access/accessRules.ts`) devolve false sem assinatura/cristal/dev, e `AccessGuard` (montado uma única vez em `src/app/(app)/layout.tsx:28`) joga tudo para `/paywall`. Ranking, stories, amigos e boss existem dentro de um estádio vazio. E o "cristal do dia" chama `consume_daily_crystal`, que **não existe em nenhum arquivo de `supabase/`** (`useAccessGate.ts:187`) — em produção, falha silenciosa.

**A correção de precificação que a v1 errou:** remover o `AccessGuard` é **1 hora**. O trabalho de verdade é o enforcement. Todo limite do plano grátis do §8.4 é hoje client-side, e o usuário fala direto com o PostgREST usando o JWT dele. "Histórico all-time", "3 bosses simultâneos", "quem viu meu story", "alarmes ilimitados", "cenários Pro" — nada disso se segura no cliente.

**Ordem correta, e é rígida:**
1. Colunas de assinatura no banco + webhook funcionando (§2.2) — 🚧 **hoje não existem**
2. Definir os limites do grátis (§8.4)
3. Enforcement em RLS/RPC lendo `profiles.subscription_status` (protegida pela correção 0.1)
4. **Só então** remover o guard

**Esforço:** M (6h) para remover · **G (16h+)** para o enforcement · e depende de §2.2 (M/6h).
**Impacto:** alto (receita + rede).
**Por que importa:** o único fosso defensável do lvl2do é o grafo social em português. Paywall total destrói o fosso para proteger uma receita que ainda não existe. E o portão diário de cristal é, mecanicamente, o Energy do Duolingo — que queimou marca lá com 133M de MAU de colchão, e aqui não há colchão nenhum.

#### Aposta 2 — O primeiro XP acontece dentro do onboarding

**O que é:** hoje o "aha" (concluir missão → barra encher → personagem reagir) acontece *depois do cartão de crédito*. `PreconfiguredMissions.tsx` já existe: pré-criar 3 missões e **forçar a conclusão de uma ali mesmo**, com celebração em tela.

🚧 **Depende da Aposta 1.** `src/app/onboarding/page.tsx:43` faz `router.replace(hasAccess ? "/dashboard" : "/paywall")`. Fazer o usuário completar a primeira missão e cair no paywall na tela seguinte é **pior** que o funil de hoje — você gasta o momento de maior boa vontade da relação inteira para entregar uma parede.

**Esforço:** M (10h para o Ato 3). **Impacto:** alto.

#### Aposta 3 — Consertar a progressão: curva, teto suave, tesouro do boss

**O que é:** com a curva atual (`src/lib/xp-system.ts:97-101`), o usuário médio leva 60 dias para ver a segunda arte e o perfeito leva 24. O teto duro de 300 XP/dia faz cada missão extra valer **zero**. E `collect_boss_treasure` tem literalmente `-- >>> RECOMPENSA ENTRA AQUI` sem nada dentro.

**A correção de estimativa que a v1 errou:** "zero migração" é **falso**. `profiles.level` é coluna materializada, escrita por `xp_level_from_total()` dentro da RPC (`:228`, `:324`), e a view `public_profiles` expõe `level` para o ranking. Trocar a curva exige TS e SQL redeployados **no mesmo instante**, mais `update profiles set level = xp_level_from_total(total_xp)` uma vez, mais uma tela de "sua jornada foi rebalanceada" — porque `useUserStats.ts:376` calcula `levelBefore` do estado local e a primeira conclusão pós-deploy dispararia um level-up fantasma de vários níveis. E não há runner de teste no `package.json`: o teste é manual.

**Esforço:** curva **M (12h)** · teto suave **G (28h)** 🚧 (exige coluna nova) · tesouro v1 **M (12h)**.
**Impacto:** alto.

#### Aposta 4 — A camada de luz: `inset` superior, `.num`, grain, densidade

Quatro mudanças de CSS/classe que somam ~4h e mudam a categoria percebida do produto (§3.1–3.4). O lvl2do não parece barato — parece *plano*. Uma sombra só, uma borda uniforme, números que tremem, espaçamento sem hierarquia.
**Esforço:** P (4h). **Impacto:** alto.

*(A v1 incluía "WebP nos bosses" aqui e chamava isso de "uma das maiores melhorias de qualidade percebida da lista inteira". Isso estava errado — ver §3.5.)*

#### Aposta 5 — Escudo de streak + Modo Descanso + o dia da quebra

Três mecânicas pequenas de retenção. Escudo distribuído **antes** da necessidade e aplicado em silêncio (Duolingo). Modo Descanso declarado (Todoist Vacation Mode). E — o que a v1 esqueceu — **a tela do dia seguinte à quebra**, que é onde o usuário decide se volta ou some.
**Esforço:** P (4h) + P (3h) + P (2h). **Impacto:** alto.

### 1.3 O ativo raro — o que não tocar

| Ativo | Estado | Por que é raro |
|---|---|---|
| **Grafo social em PT-BR** | amigos `nickname#TAG`, stories 24h, ranking, `src/lib/db/social.ts` | **Este é o fosso.** Arte é copiável em 3 meses; a rede dos seus amigos não é. Habitica tem party, mas ninguém no Brasil tem amigos lá. |
| **Pixel art 16-bit autoral** | 1,4 MB de personagens em WebP, 13 MB de bosses em PNG | Canal de aquisição e motivo do screenshot. **Não é o fosso** — é o que vende o clique. |
| **Boss battle atômico** | `2026-boss-battles.sql`, cap por `capped_on` (dia do servidor), FK `set null` deliberada | Engenharia correta e comentada. É o único subsistema do repo que já pensou em abuso. |
| **Conclusão atômica no servidor** | `complete_mission_atomic` | Invariante certa e documentada: o estado local só muda com o RETORNO do servidor. Não quebre por otimismo de UI (§4.2). |
| **Stories com anti-abuso real** | `2026-stories.sql` — ledger append-only, cota 10/24h, `image_path` derivado de (dono, id) por CHECK, bucket privado, GC escrito | O subsistema mais bem feito do repositório. Use-o como padrão de qualidade para o resto. |
| **UI moderna de SaaS + arte de jogo** | dark-first #050509, Sora + Manrope | A combinação é a assinatura. Habitica é fórum de 2014; Finch é kawaii puro. Ninguém está no meio. |
| **Elenco de classes inclusivo** | Guerreiro, Ladrão, **Arqueira, Bruxa**, Bardo | Finch fez US$ 30M+ ARR com 75% de público feminino 25–35. A arte de marketing deveria liderar com a Bruxa/Arqueira. |
| **Áudio sintetizado sem asset** | `src/hooks/useAlarmSound.ts` | Web Audio provado no repo. Som de conclusão custa 0 KB e nunca é bloqueado (é sempre gesto do usuário). |
| **`prefers-reduced-motion` respeitado** | `src/app/globals.css` | Filosofia certa. Falta estender ao framer-motion (§4.1). |

### 1.4 O ritmo real — a restrição que governa o roteiro

`git log`: **48 commits**, com um vão de **40 dias sem nenhum** (10/07 → 19/08). Isso não é crítica; é dado de planejamento. Somando os rótulos deste documento, o plano completo é **~500h**. A 15h/semana — que é o que o histórico sustenta para quem tem outra vida — são **33 semanas**, não 12.

**Consequência aceita:** os 90 dias comportam **Onda 0 + Onda 1 + a primeira metade da Onda 2**. A meta de saída foi refeita no §9 de acordo. Prometer as três ondas em 90 dias seria a única mentira grande deste documento.

---

## 2. Fundação — o que o produto finge ter e não tem

Este capítulo não existia na v1, e é o mais importante depois do §1.1. Cada item aqui é pré-requisito nomeado de algo que os outros capítulos vendem.

### 2.1 Segurança de dados

Coberto na Onda 0 (§1.1). Uma regra que fica valendo daqui para frente:

> **Toda grandeza que o jogo usa para decidir algo — XP, nível, streak, saldo, plano, dano — é escrita exclusivamente por função `security definer`, e a tabela nega escrita direta ao `authenticated`.** O cliente escreve identidade e conteúdo (nome, título da missão, foto); nunca resultado.

Vale como checklist para tudo que for construído depois: se um campo novo influencia recompensa, ele nasce sem `grant update`.

### 2.2 Assinatura: o servidor não sabe quem é Pro

`src/app/api/webhooks/revenuecat/route.ts:93` grava `plan`, `subscription_status` e `subscription_expires_at` em `profiles`. **Nenhum arquivo de `supabase/` cria essas colunas.** O comentário em `accessRules.ts:8` confirma: *"o banco ainda não tem as colunas de assinatura"*.

Consequências, todas ativas hoje:
- O webhook devolve 500 e o RevenueCat **retenta para sempre**. Nenhuma assinatura é persistida.
- O acesso funciona só pela consulta de entitlement no cliente. Fechou o app antes da consulta, sem acesso.
- **Todo o freemium do §8.4 é impossível**, porque nada no servidor sabe quem pagou.

**Correção:**
```sql
alter table public.profiles
  add column if not exists plan text,
  add column if not exists subscription_status text,
  add column if not exists subscription_expires_at timestamptz,
  add column if not exists rc_customer_id text;
-- e NENHUM grant update dessas colunas para authenticated (§1.1 item 0.1)
create index if not exists profiles_sub_idx on public.profiles (subscription_status);
```
Mais: helper `public.is_pro(uid uuid)` `stable security definer`, usada por toda policy e RPC que precise decidir plano. **Esforço:** M (6h, incluindo tratar `REFUND` e `EXPIRATION` corretamente — §8.6). **Impacto:** alto. **Pré-requisito da Aposta 1.**

### 2.3 Dados que vivem no navegador — e que o plano quer vender

Verificado: `useAlarms.ts`, `useFocusHistory.ts`, `useNotifications.ts` e `useTickets.ts` têm **zero** referência a Supabase. São `localStorage` puro (`STORAGE_KEY = "lvl2do.alarms.v1"` etc.).

A v1 colocava "histórico completo de foco" e "alarmes recorrentes ilimitados" na tabela do que cobrar. **Você não pode cobrar por um dado que some ao trocar de celular ou limpar o cache.** Isso é reembolso e Reclame Aqui.

| Hook | Vira | Esforço | Trava |
|---|---|---|---|
| `useFocusHistory` | `focus_sessions(user_id, started_at, duration_s, completed)` + RLS | M (6h) | Bloqueia "histórico completo de foco" como item Pro |
| `useAlarms` | `alarms(user_id, label, time, weekdays, enabled)` + RLS | M (5h) | Bloqueia "alarmes ilimitados" como item Pro |
| `useNotifications` | `notifications(user_id, kind, payload, read_at)` — RLS: destinatário lê, **RPC escreve** | M (8h) | Bloqueia o "nudge do amigo" (§7.5) inteiro |
| `useTickets` | `tickets(user_id, subject, body, status)` + e-mail para o dev | M (6h) | Bloqueia qualquer SLA de suporte (§2.4) |

**Regra:** nada entra na tabela de "o que cobrar" enquanto viver no navegador.

### 2.4 Suporte é requisito de cobrança, não feature

`useTickets` grava no `localStorage` do próprio usuário — o chamado **nunca sai do navegador dele** — e `resetAccount.ts` apaga os tickets. Um pagante relatando erro de cobrança fala com uma parede.

**Mínimo viável, escolha um:**
- **1h:** trocar `/support` por um formulário externo (Tally, Crisp, ou um `mailto:` bem feito). Honesto e imediato.
- **M (6h):** tabela `tickets` + notificação por e-mail para você via Resend.

**E, obrigatório em ambos os casos:** um canal de suporte **fora do login** — `suporte@<domínio>` visível na landing e no rodapé. Metade dos chamados de qualquer produto é "não consigo entrar", e essa pessoa não alcança uma página dentro do app.

### 2.5 "Apague tudo com um clique" não é verdade

`src/lib/db/resetAccount.ts` apaga missões, completions, xp_events, redemptions, friendships e referrals, e **zera** o profile. **Não apaga:** o usuário do `auth`, `stories`, visualizações de story, `boss_hits`/`boss_battles`, os arquivos de foto no Storage, nem a linha de `profiles`.

Isso é **reset de progresso**, não exclusão de conta — e a v1 propunha usar isso como argumento de LGPD na landing. Não pode ir para a landing como está.

**Correção — separar duas coisas que hoje são uma:**
- **"Zerar progresso"** (o que existe hoje, renomeado) — e com uma trava nova: **zerar não pode devolver saldo, troféus, títulos ou ciclos de boss.** Hoje pode; isso é lavagem de economia. Registre `reset_count` no perfil.
- **"Excluir conta"** — RPC server-side com service role: apaga stories + objetos do Storage + `profiles` + `auth.admin.deleteUser`, com confirmação por senha e e-mail de confirmação. **Esforço:** M (10h). Só depois disso a promessa vai para a landing.

### 2.6 Backup, migrações e ambiente

- **Backup:** ver §1.1 item 0.7. Backup diário e PITR são recursos do plano pago do Supabase (confirme o preço atual antes de orçar — o valor muda). O dump semanal fora do fornecedor é o que protege contra suspensão de conta, que é o cenário que backup interno não cobre.
- **Migrações:** `supabase/2026-*.sql` são scripts aplicados à mão num projeto único. Um erro no `complete_mission_atomic` apaga XP de pagante e não há como voltar. **Adote `supabase/migrations/` numerado + um projeto de staging separado.** Esforço: M (8h para organizar o que existe + criar o staging).
- **Testes:** o `package.json` não tem sequer script de teste. Não escreva suíte de UI. Escreva testes **só onde mora dinheiro e XP**: conclusão, reversão, teto diário, streak, tesouro, resgate. Vitest + um cliente Supabase de staging. **Esforço:** M (12h). Isso é o que permite mexer na curva sem medo.

### 2.7 Agendamento — pg_cron sim, GitHub Actions não

A v1 propôs "GitHub Actions → Supabase Edge Function" como cron. Isso não se sustenta: não existe diretório `.github/` nem `supabase/functions/`; `schedule` no Actions atrasa rotineiramente 10–30 min em horários cheios; e **workflows agendados são desativados automaticamente após 60 dias sem atividade no repositório** — exatamente o padrão de um dev solo com vão de 40 dias.

**Decisão: use pg_cron.** Está disponível no Supabase em qualquer plano — o próprio `2026-stories.sql:453` já comenta isso ao descrever o GC de stories que hoje não roda. É um `select cron.schedule(...)` no SQL Editor.

| Job | Frequência | Para quê |
|---|---|---|
| GC de stories (linhas + objetos do Storage) | 1×/hora | O código já está escrito em `2026-stories.sql:423-453` e **não está agendado**. Sem ele, o Storage é uma conta que só cresce (§8.10). |
| "Streak em risco" | 21h diário | Requer e-mail (§2.8) ou push (§2.9) |
| Digest semanal | domingo 19h | §7.2 |
| Fechamento de ranking semanal | segunda 00h | §7.4 |

**Regra que continua valendo:** tudo que *pode* ser função pura de `(agora, âncora gravada)` avaliada preguiçosamente na leitura **deve** ser — cron é para o que precisa acontecer sem o usuário abrir o app. **Esforço:** P (2h para agendar o GC; o resto vem com cada feature).

### 2.8 E-mail transacional é pré-requisito de lançamento

Não há serviço de e-mail configurado. Confirmação de cadastro e recuperação de senha saem pelo **SMTP embutido do Supabase**, que é explicitamente para desenvolvimento: teto de poucos envios por hora, domínio compartilhado, entrega ruim.

Enquanto isso não mudar, **cada real gasto em aquisição está enchendo um balde furado no login.**

**Correção:** SMTP próprio (Resend, plano gratuito de 3.000/mês) com domínio verificado + SPF/DKIM/DMARC, configurado como SMTP do Supabase Auth **e** usado pelo app. **Esforço:** P (3h). **Impacto:** alto.

⚠️ **Armadilha:** introduzir um segundo remetente no mesmo domínio sem alinhar DKIM derruba a entrega do e-mail de reset de senha — o caminho mais crítico do produto. Um remetente, um domínio, um DKIM. Configure e **teste com Gmail, Outlook e um endereço corporativo** antes de considerar pronto.

### 2.9 PWA — nada disso existe

`public/` contém **só** `bosses/` e `characters/`. Não há `manifest.json`, ícones, `apple-touch-icon`, favicon nem service worker. `src/app/layout.tsx` tem `metadata` com title/description/keywords e nada mais.

Consequências:
- **O app é ininstalável.** Logo, Web Push no iOS é **impossível** — a v1 apoiou a estratégia inteira de push em "iOS 16.4+ *se instalado como PWA*" sem notar que a instalação não existe.
- Um link do lvl2do colado no WhatsApp aparece **sem imagem e sem nada**.
- Não há favicon: a aba do navegador mostra o ícone genérico.

**Ordem correta, e a v1 tinha isso invertido:**

| Passo | O que | Esforço |
|---|---|---|
| 1 | `favicon.ico` + `apple-touch-icon` + `metadataBase` + `openGraph`/`twitter` com imagem padrão 1200×630 + `robots.ts` + `sitemap.ts` | P (3h) |
| 2 | `app/manifest.ts` (nome, `display: standalone`, `theme_color: #050509`, ícones 192/512 + maskable) + splash iOS | P (3h) |
| 3 | Prompt de instalação disparado **depois do primeiro XP**, com instrução manual explícita no iOS ("Compartilhar → Adicionar à Tela de Início"), porque no Safari não existe `beforeinstallprompt` | P (4h) |
| 4 | Service worker + tabela `push_subscriptions` + envio via pg_cron | G (24h) 🚧 depende de 1–3 |

**Expectativa honesta sobre o passo 4:** mesmo tudo pronto, o alcance no iOS depende de o usuário ter instalado o app na tela de início — adoção realista de **um dígito percentual**. No Android e no Chrome desktop funciona bem. Trate push como bônus para Android; **o canal de retorno confiável no Brasil é e-mail e WhatsApp compartilhado por humano**, não push.

### 2.10 LGPD — o capítulo que tinha uma linha

Você trata dado pessoal de brasileiros, inclusive **foto de rosto** (stories) e **conteúdo escrito pelo usuário que frequentemente é dado de saúde** ("tomar o remédio", "sessão de terapia", "consulta"). Não há como cobrar assinatura sem isto.

| Item | O que precisa existir | Esforço |
|---|---|---|
| **Base legal e finalidade** | Um quadro na Política dizendo, por tratamento: identidade (execução de contrato), missões (execução), foto de story (consentimento), analytics (legítimo interesse, com opt-out), cobrança (execução + obrigação legal) | P (3h) |
| **Encarregado (DPO)** | Nome e e-mail de contato publicados. Pode ser você. É exigência de indicação, não de cargo. | P (15min) |
| **Direitos do titular** | Acesso, correção, portabilidade, eliminação, revogação — com prazo de resposta declarado (15 dias) e um canal que funcione (§2.4) | P (2h) |
| **Exportação de dados** | JSON/CSV com missões, conclusões, XP, streak, amigos. É direito de portabilidade **e** freio de churn: "você pode levar seus dados embora" é argumento de venda. | M (8h) |
| **Eliminação** | §2.5. A promessa não pode preceder a implementação. | M (10h) |
| **Retenção** | Story: arquivo apagado após 24h (§2.7). Conta excluída: 30 dias de tombstone e some. Log de cobrança: retido pelo prazo fiscal. | P (2h, com o GC agendado) |
| **Subprocessadores** | Lista pública e nominal: Supabase/AWS, Vercel, RevenueCat, Stripe (ou PSP nacional), Resend, PostHog. Com menção a transferência internacional. | P (1h) |
| **Incidentes** | Um parágrafo escrito de antemão: o que você faz nas primeiras 24h, quem avisa, como comunica a ANPD. Escrever isso calmo é 30 min; escrever no dia é impossível. | P (30min) |
| **Idade mínima** | Termos com idade mínima e coleta de data de nascimento no cadastro. **Menor de 12: bloquear** (consentimento específico de responsável, LGPD art. 14, é inviável para dev solo). **12–17: sem story público e fora do ranking global por padrão.** Consequência comercial: cobrança de menor gera estorno. | M (5h) |

**A declaração que precisa estar escrita e cumprida:**
> O conteúdo das suas missões não é vendido, compartilhado com terceiros nem usado para treinar nada.

**E a consequência operacional dela, que é técnica:** **nada de session recording no PostHog**, e nenhum evento de analytics carrega o texto da missão — só categoria, dificuldade e turno. Configure isso na primeira hora de instalação, não depois.

**Analytics e consentimento:** PostHog em **modo cookieless** com IP anonimizado + opt-out no perfil evita o banner e reduz a superfície. Se um dia houver remarketing ou cookie de terceiro, o banner passa a ser obrigatório.

### 2.11 Acessibilidade — o piso, não o teto

A v1 tinha três correções de foco/movimento. O público-alvo declarado inclui pessoas com TDAH; acessibilidade aqui não é conformidade, é o produto.

- **Alvo de toque ≥44px.** Vários botões de `MissionCard` e `Sidebar` estão abaixo.
- **Foco visível e navegável em modais:** trap de foco, `Esc` fecha, foco retorna ao gatilho. `ModalPortal.tsx` é o lugar único para resolver isso.
- **`aria-live="polite"` nos toasts de XP e level-up.** Sem isso, a conquista é literalmente invisível para leitor de tela — o app celebra e o usuário não fica sabendo.
- **`alt` descritivo na arte** ("Bruxa nível 25, versão dourada"), não `alt=""`.
- **Cor da categoria nunca como único diferenciador.** O trilho de 2px do §3.3 precisa vir sempre acompanhado de ícone ou rótulo — daltonismo protanopia/deuteranopia é ~8% dos homens.
- **Contraste auditado no tema inteiro**, não só no caso do `StoryComposer.tsx:214`. Regra: nunca dilua `text-muted` com opacidade; crie o token terciário.
- **Zoom 200% sem quebra de layout.**
- **O flash do §4.3 e do Ato 2 fica sob `prefers-reduced-motion`** e com toggle no perfil. Um flash único de área pequena não é gatilho fotossensível pelo critério do WCAG (que é três por segundo), mas é desconfortável para muita gente e a mitigação custa dez minutos.

**Esforço somado:** M (12h). **Impacto:** médio-alto, e alto no público declarado.

---

## 3. Visual premium

### 3.1 Camadas e materialidade — a mudança de maior retorno por hora

O diagnóstico em `src/app/globals.css`:

```css
.card-surface { @apply rounded-2xl border border-white/[0.06] bg-ink-card/80 shadow-card backdrop-blur-sm; }
/* shadow-card = 0 8px 30px -12px rgba(0,0,0,0.6) → UMA sombra, UM blur */
```

Três problemas: sombra única (sombra real tem contato + chave + ambiente), borda uniforme de 6% (na vida real a luz vem de cima), zero hierarquia de elevação (card, modal, dropdown e sidebar na mesma superfície).

**A linha mais importante deste documento:**

```css
.card-surface {
  box-shadow: var(--shadow-1), inset 0 1px 0 0 rgba(255,255,255,0.09);
  border: 1px solid rgba(255,255,255,0.055);
  border-top-color: rgba(255,255,255,0.10);   /* borda não-uniforme = objeto, não desenho */
  background: linear-gradient(180deg, #0B0B13 0%, #090911 100%);
}
```

Aplicada nos ~53 usos de `.card-surface` de uma vez. **Esforço:** P (45min). **Impacto:** alto.

**Escada de elevação:** tokens `--surface-0..3` + `--shadow-1..3` em `globals.css`, com `.card-elevated` em modais (`ModalPortal`, `PaywallModal`, `NewMissionModal`) e `.card-overlay` em dropdown/tooltip (`SchedulePopover`, `AccountMenu`). **Esforço:** P (1h).

**Decisão — tirar `backdrop-blur-sm` de todos os cards.** É glassmorphism 1.0 e custa uma camada de composição por card para borrar um gradiente estático; na tela de missões são ~12 snapshots de backdrop por quadro. Blur fica **só** onde há conteúdo real atrás: `Sidebar` (correto), `AppTopbar`, modais e `StoryViewer`. **Esforço:** P (15min). **Impacto:** médio (perf mobile).

**Grain** no `body::after` (SVG `feTurbulence` inline, `opacity .035`, `mix-blend-mode: overlay`): resolve o banding dos três `radial-gradient` gigantes do fundo — muito visível em OLED — e dá textura de material. Bônus temático: grain é o irmão analógico do pixel. **Esforço:** P (20min). **Impacto:** médio-alto.

**Borda com gradiente** (`.border-lux`, máscara `xor`) apenas nos cards-herói: `LevelCard`, `RankingPodium`, paywall. **Regra: no máximo 1 por tela.** **Esforço:** P (30min).

**Spotlight no hover** (`--mx/--my` via `onMouseMove` + `::before` radial) na grade de `/missions` e em `ClassSelectGrid`. É o efeito que mais faz alguém pensar "isso é caro". **Esforço:** P (30min). *(Só em `hover: hover` — em touch é peso morto.)*

### 3.2 Tipografia

**Sora está sendo desperdiçada.** Há ~30 ocorrências de `font-display text-sm`/`text-xs`. A personalidade da Sora só aparece a partir de ~18px; abaixo disso ela é apenas *pior de ler* que a Manrope. **Regra:** Sora só em ≥18px, ou caixa alta com tracking largo, ou numeral grande. Toca `PageHeader`, `StatCard`, `LevelCard`, `MissionCard`. **Esforço:** M (5h com a varredura).

**Números que tremem.** Só ~20 usos de `tabular-nums`, faltando exatamente onde importa: `{doneToday}/{missions.length}`, `stats.totalXp`, `{streak} dias`, `{xpCurrent}/{xpToNext}`, HP do boss, `hits/5`, timer do foco. Número de largura proporcional que muda a cada segundo é a assinatura visual de software amador.

```css
@layer utilities {
  .num { font-variant-numeric: tabular-nums slashed-zero; font-feature-settings:"tnum" 1,"zero" 1; letter-spacing:-0.012em; }
  .num-hero { @apply font-display font-bold num; }
}
```
**Esforço:** P (1h). **Impacto:** alto.

**Escala modular** em `tailwind.config.ts` (razão 1.25, corpo a **15px** e não 14), com **tracking negativo crescendo com o tamanho**: `-0.032em` em 44px. 44px com tracking 0 parece Word; com −0.032em parece Linear. **Esforço:** M (5h).

Ganhos baratos: `text-balance` em h1/h2, `text-pretty` em parágrafos, `max-w-[62ch]` em texto corrido. **Decisão: `.eyebrow` deixa de ser pill roxo e vira texto** (`uppercase`, tracking 0.14em, `text-brand-light/70`) — o pill fica reservado para badges de estado (`CategoryBadge`), onde significa algo.

### 3.3 Cor

**O ativo escondido:** já existe um sistema de cor por categoria preso dentro de um pill de 22px em `CategoryBadge.tsx` (Profissional→sky, Pessoal→pink, Saúde→emerald).

**A regra, decidida:**
> **Roxo = sistema. Cor da categoria = conteúdo do usuário. Âmbar = recompensa.**

Roxo em nav ativa, botão primário, barra de XP, anel de story, foco. Nunca em conteúdo. Cor da categoria tinge: coluna da `/missions`, vinheta da arena do boss, série do `XpAreaChart`, e um **trilho de 2px na borda esquerda do `MissionCard`** — *sempre acompanhado do ícone da categoria* (§2.11). **Esforço:** M (5h).

**O âmbar que falta.** Hoje XP é roxo, nível é roxo, moeda é roxo, tesouro é roxo — não há segundo acorde. Reserve `reward: #FBBF24 / #F59E0B` **exclusivamente** para level-up, coleta de tesouro, moeda, marco de streak (7/30/100) e 1º lugar do pódio. Escassez é o que faz funcionar. **Esforço:** P (1h).

**Semântica:** tokens `state.ok/warn/bad/info` em `tailwind.config.ts` (hoje há `rose-400`/`amber-300` soltos). E crie `--text-3: #64748B` para texto terciário em vez de diluir `text-muted` com opacidade — `text-muted/70` (`StoryComposer.tsx:214`) cai para ~3,8:1, abaixo do mínimo.

**Nota de tendência:** borda de 6% de branco é baixa demais para dark mode. Vá para 8–12% em repouso, 14–18% em hover/foco.

### 3.4 Densidade e ritmo

Sintoma: `gap-5` em quase toda página, `p-5`/`p-6` alternando sem critério, `mb-8` no header e `mt-5` entre seções. Não há hierarquia de espaço — e isso separa premium de amador mais que cor ou sombra.

**A regra que muda tudo:** *espaço entre seções ≥ 1,5× o espaço dentro da seção.* Hoje é 1:1. Trocar `mt-5` de seção por `mt-8` em dashboard, missions, progress e profile: **P (20min), e a página inteira respira.**

| Papel | Valor | Tailwind |
|---|---|---|
| Dentro de um controle | 8 | `gap-2` |
| Rótulo → valor | 12 | `mt-3` |
| Título do card → conteúdo | 16 | `mt-4` |
| Padding de card (≥280px) | 24 | `p-6` |
| Entre cards de uma grade | 20 | `gap-5` |
| **Entre seções** | **32** | `mt-8` |
| Header → primeira seção | 40 | `mb-10` |

**Densidade por página:** Dashboard e Missions **densas** (é trabalho); Perfil, Ranking, Foco e Onboarding **arejadas** (é recompensa/identidade) — `p-8` em Perfil/Ranking, `p-10` no Foco. Hoje todas têm a mesma densidade, o que apaga a diferença de propósito.

Alinhamento óptico: `-ml-0.5` no ícone à esquerda em botões; `pl-2 pr-2.5` em badges com ícone; **altura fixa vence padding** — `Button.tsx` já faz (`h-9/h-11/h-12`), os itens de `Sidebar.tsx` não (`py-2.5` → `h-11`, que também resolve o alvo de toque do §2.11).

### 3.5 A assinatura: pixel art × SaaS

**O erro mais caro do produto inteiro** está em `src/components/CharacterFrame.tsx`:

```tsx
<Image src={artSrc} fill className="relative object-cover" />
```

`object-cover` numa arte 800×800 com alfa **corta o personagem**. Sprite de RPG precisa de chão e headroom. Correção: `object-contain object-bottom`.

E a arte é escalada com interpolação suave — você pagou por 16-bit e está exibindo 8-bit borrado. Use `imageRendering: "pixelated"`, **com a ressalva que decide o tamanho**: `pixelated` é ótimo ao ampliar e traiçoeiro ao reduzir. Como a arte é 800px e o frame exibe ~144–176px, use **divisores inteiros: 160px (800/5) ou 200px (800/4)**. Em 176px com `pixelated` fica sujo; em 160px fica cristalino. Mesma lógica para bosses: 1254 é feio de dividir — **reexporte os bosses em 1024×1024** e use 256/128/64. **Esforço:** P (45min). **Impacto:** alto.

Promova a `groundShadow` que já existe dentro de `BossBattleCard.tsx` para componente compartilhado — personagem sem sombra de contato **flutua**, e flutuar denuncia colagem.

**As sete jogadas, com esforço corrigido:**

| # | Jogada | O que é | Esforço | Tipo |
|---|---|---|---|---|
| 1 | **Cantos ornamentados** | 4 colchetes SVG nos cantos do `CharacterFrame`, grid de 3px, `shapeRendering="crispEdges"`. É *o* léxico de HUD de RPG sobre um card moderno — a tensão entre os dois vocabulários vira identidade. | P (2h) | código |
| 2 | **Token `--px: 3px`** | 1 "pixel do jogo" = 3 CSS px. **Regra: o que é do mundo do jogo é múltiplo de `--px`, canto reto, `crispEdges`; o que é chrome de SaaS é arredondado e suave. Nunca no mesmo elemento.** Resolve 80% das decisões futuras sozinha. | P (30min) | código |
| 3 | **`ProgressBar variant="hud"`** | Altura 12px, pontas retas, contorno preto 2px, highlight interno de 3px, entalhes a cada 10%. **`hud` para XP e HP do boss; a suave para métricas/%.** | M (6h) | código |
| 4 | **Sigilos de classe 16×16** | 5 SVGs (espada, adaga, arco, lua, alaúde) em `CharacterAvatar`, `RankingRow`, `StoryRing`, `FriendCard`, level-up, card compartilhável. | M (8h) | **arte + código** |
| 5 | **Ícones pixel de categoria** | 3 ícones 16×16 no lugar de `Briefcase`/`Sparkles`/`HeartPulse`. **Divisão limpa: lucide para chrome funcional, pixel para domínio do jogo.** | M (8h) | **arte + código** |
| 6 | **Atmosfera nos backdrops** | `CharacterBackdrop.tsx` é SVG bem feito e 100% estático. Tremular de tocha com keyframes **irregulares** (`0%:1, 12%:.86, 20%:1, 43%:.92, 55%:.78, 70%:1` em 2,7s — fogo não é senoidal), névoa à deriva na Floresta (28s alternate), parallax de 2–3px no `LevelCard`. | M (6h) | código |
| 7 | **Boss como estado vazio** | Coluna de categoria sem missão → o boss dessaturado e dormindo: *"O Orc dorme. Crie uma missão para atacar."* A arte já está paga. Transforma o pior momento da UI no melhor. | M (8h) | código |

**Total honesto do Tier A:** itens 1–7 + cor de categoria (5h) + skeletons (8h) + âmbar (1h) + spotlight (0,5h) = **~53h**, das quais **~16h são produção de arte** (itens 4 e 5). A v1 orçava isso como "~16h somadas" — errava por 3×.

> **Nota:** produzir 8 sprites de 16×16 **não** viola a regra "não produza arte nova antes de mostrar a que já existe" — essa regra é sobre arte de personagem 800×800 em tiers. Ícones minúsculos são outra classe de custo. Mas continuam sendo horas de ilustração, e horas de ilustração não são horas de código.

**Sobre perf — corrigindo a v1.** A v1 afirmava que os 13 MB de `public/bosses/` eram "uma das maiores melhorias de qualidade percebida da lista inteira". **Isso está errado.** As artes passam por `next/image` (`BossBattleCard.tsx:131`) e o padrão de `images.formats` no Next 15 já é `['image/webp']` — **o payload entregue já é WebP**. O que os 13 MB de fonte custam é tempo de transform na primeira requisição, cota de otimização de imagem na Vercel e peso de repositório. Recomprimir para WebP q82 (~250 KB cada) continua valendo os 30 minutos, e vai junto com o item 0.6 (versionar os três cenários). Mas é higiene, não transformação.

Adicionar `formats: ["image/avif", "image/webp"]` ao `next.config.mjs` ganha AVIF — um pouco menor, com custo de transform maior. Faça, mas não espere milagre.

### 3.6 Vazio, carregamento e erro

**Matem o spinner.** `Loader2` aparece em 18 arquivos. Spinner é ausência de design: comunica "não sei quanto falta" e não tem marca.

- **Padrão:** skeleton com o formato do card real (`bg-white/[0.045]` + `animate-shimmer`, que já está no `tailwind.config.ts`). Nunca skeleton genérico — o do `LevelCard` tem o quadrado do personagem à esquerda e três barras à direita.
- **A exceção com marca:** um **cristal pixel girando**, 8 frames, `steps(8)`. Vira o loader do produto.
- **Regra:** skeleton para lista/página; cristal para operação atômica (concluir missão, coletar tesouro).
**Esforço:** M (8h nas 4 páginas principais).

**Vazio — uma fórmula, sempre.** Hoje é frase cinza solta. Fórmula: ilustração pixel 96px → título Sora 19px → uma linha de 13px (≤62ch) → **um** botão.

| Local | Ilustração | Título | Ação |
|---|---|---|---|
| Missões da categoria | boss dormindo | "O Orc dorme" | Criar missão |
| Foco / histórico | ampulheta pixel | "Nenhuma jornada ainda" | Iniciar foco |
| Amigos | dois sigilos sem elo | "Sua guilda está vazia" | Adicionar amigo |
| Loja | baú fechado | "O mercador está a caminho" | — |
| Notificações | corvo pousado | "Nenhum recado do reino" | — |

**Erro:** escudo rachado pixel + *"Perdemos contato com o reino."* + "Tentar de novo", com o detalhe técnico num `<details>` fechado. `BossBattleCard` já acerta — extraia para `<ErrorState>`. **Nunca sacrifique clareza pela metáfora**: se o usuário precisa agir (sessão expirada, pagamento, sem conexão), fale direto.

---

## 4. Movimento e interação

### 4.1 Correções que precedem qualquer animação nova

| # | Problema | Onde | Correção | Esforço |
|---|---|---|---|---|
| 1 | **`transition-all` briga com o framer** | `.card-glow` (`duration-300`), `Button.tsx` (`duration-200`) | O browser re-interpola o `transform` que o framer escreve por rAF → press mole e `layout` do `MissionCard` arrastando na reordenação. Troque por `transition-colors`/`transition-[background,border]`. | P (30min) |
| 2 | **Reduced motion só cobre CSS** | `globals.css` zera animação CSS; framer continua rodando | `<MotionConfig reducedMotion="user">` em `src/app/layout.tsx`. | P (15min) |
| 3 | **Gesto principal inacessível por teclado** | botões do `MissionCard` sem `focus-visible` | `Button.tsx` e `StoryRing.tsx` já têm anel — padronize. | P (30min) |
| 4 | **`ProgressBar` anima `width`** | `ProgressBar.tsx` | Layout por quadro. Anime `transform: scaleX()` com `transform-origin: left`. E o shimmer roda `2s infinite` **para sempre** — brilho em loop significa "carregando", semanticamente errado numa barra parada. Dispare só na mudança de valor. | P (1h) |
| 5 | **`LevelUpToast.tsx` é código morto** | não é importado em lugar nenhum; o próprio arquivo se descreve como *"animação mockada exibida ao clicar no botão de demonstração"* | `git rm`. **A v1 chamava isso de "caminho duplicado de level-up" e orçava 1h — é 1 minuto.** | P (1min) |
| 6 | **Comentário obsoleto** | `StreakIndicator.tsx:20` diz que streak "ainda não está implementado" | `useStreak.ts` + `current_streak`/`best_streak` existem. Apagar. | P (5min) |
| 7 | **Toasts sem `aria-live`** | `XpToast.tsx` | `aria-live="polite"` + `role="status"`. Sem isso a conquista não existe para leitor de tela. | P (20min) |

**Se você só tiver uma tarde: itens 1–7 = ~2,5 horas**, e todo movimento posterior assenta melhor.

### 4.2 Momento-chave nº1 — concluir missão

**O achado que define o desenho:** `completeForDay` **recusa update otimista de propósito**, e isso está documentado no código ("o estado local só muda com o RETORNO do servidor"). A resposta certa **não** é tornar otimista — quebraria a invariante. É **separar aceite de recompensa**:

1. **Aceite (0ms, local, sem promessa):** o toque desenha o check e afunda o card ~2px. Não promete XP, então não há nada para reverter se o servidor recusar.
2. **Recompensa (com o `profile` do servidor):** aí sim toca a partitura — XP subindo, barra HUD enchendo, pip do boss caindo, e só então o toast.

**Esforço:** M (8h). **Impacto:** alto.

**Som.** `useAlarmSound.ts` já sintetiza áudio em Web Audio **sem arquivo nenhum** — o padrão está provado no repo, custa 0 KB, e a conclusão é sempre gesto do usuário (autoplay nunca bloqueia). Um "clique" de duas notas curtas, com toggle no `SettingsModal`, **desligado por padrão**. **Esforço:** P (3h).

**Tokens de movimento** em `src/lib/animations.ts`:

```
--dur-instant: 90ms    (feedback de toque)
--dur-fast:   160ms    (hover, cor)
--dur-base:   240ms    (entrada de card, layout)
--dur-slow:   420ms    (celebração)
--ease-out:   cubic-bezier(.16,1,.3,1)
--ease-inout: cubic-bezier(.65,0,.35,1)
mola de press: stiffness 420, damping 30, mass .8
```

### 4.3 Momento-chave nº2 — subir de nível

Hoje o level-up é um toast no canto: 40×40, troféu do lucide, texto de 14px e um emoji 🎉 que destoa de tudo. É a maior conquista do produto tratada como "arquivo salvo".

**Takeover de tela:**
1. Tela escurece para `rgba(5,5,9,0.88)` com blur 8px.
2. A arte **voa do `LevelCard` para o centro** via `layoutId`, escalando 3×.
3. Flash branco de 1 frame + estrela pixel de 8 pontas expandindo (scale 0→3, 500ms). **Sob `prefers-reduced-motion`, o flash não acontece** (§2.11).
4. O número do nível **rola** de 24 para 25, `.num-hero` em âmbar — tabular, não treme.
5. A barra HUD esvazia e reenche.
6. **Composição em 4:5, centralizada** — o print já sai enquadrado para Instagram.
7. Botão único: **"Compartilhar conquista"**.

**Decisão: celebração dramática só em marcos.** Nível comum = 900ms. **Tier de arte (10/25/50/100) = takeover com pixel-dissolve.** Se você celebra tudo, não celebra nada.

**Esforço corrigido: G (24h+).** A v1 orçava 16h. `layoutId` compartilhado entre um card que **desmonta** e um portal é o padrão mais frágil do framer-motion e vai consumir metade do tempo sozinho; some duas variantes (comum e tier) mais o caminho reduced-motion. Se estourar, entregue primeiro a versão **sem `layoutId`** (a arte simplesmente aparece no centro com scale+fade) — 8h, e 80% do efeito.

### 4.4 Onboarding em três atos

O `/onboarding` atual mostra tudo de uma vez: logo, campos de identidade, grade de 5 classes, confirmar. É competente e **inerte**.

- **Ato 1 (0–6s):** fundo preto, o sigilo do lvl2do se desenha (`stroke-dasharray`, 1,2s), uma linha em Sora 34px: *"Toda rotina é uma jornada."* Beat de 800ms. *"Escolha quem você será."* Sem card, sem borda.
- **Ato 2 (6–20s):** classe em tela cheia. Hover → a arte lv1 sobe do rodapé a 35% de opacidade e os orbes do fundo assumem a cor da classe. Seleção → a arte vai ao centro, flash de 1 frame. **Só então** o campo de nome aparece, *embaixo do personagem*, como se você batizasse a criatura. Hoje o nome vem antes da classe — ordem emocionalmente errada.
- **Ato 3 (20–30s):** `PreconfiguredMissions.tsx` com 3 missões. O usuário completa **uma ali mesmo**: barra HUD enche, `+10 XP` em âmbar sobe, o personagem dá um pulinho de 4 frames. **E o convite de amigo aparece aqui** — opcional, destacado, com preview do card no WhatsApp (§6.7).

**Esforço:** G (~28h os três atos; **Ato 3 sozinho: M/10h**). **Priorize o Ato 3** — é a Aposta 2. 🚧 **Depende da Aposta 1** (senão o Ato 3 termina no paywall).

---

## 5. Gamificação e progressão

### 5.1 Diagnóstico

**a) A latência da primeira recompensa é fatal.** Curva atual (`xp-system.ts:97-101` — 800/nível até 10, 1.200 até 50, 1.600 até 100):

| Marco | XP total | Casual (60/dia) | Médio (120/dia) | Máximo (300/dia) |
|---|---:|---:|---:|---:|
| Nv 2 | 800 | 14 d | 7 d | 3 d |
| **Nv 10** (arte) | 7.200 | **120 d** | **60 d** | **24 d** |
| **Nv 25** (arte) | 25.200 | 420 d | 210 d | 84 d |
| **Nv 50** (arte) | 55.200 | 920 d | 460 d | 184 d |
| Nv 100 (arte) | 135.200 | — | 1.127 d | 451 d |

O jogador *perfeito* espera 24 dias pela primeira arte nova. O casual nunca chega ao 25.

**b) Nível não entrega nada.** 96 dos 100 primeiros níveis são um número que muda e uma barra que zera.

**c) O teto de 300 pune quem você mais quer reter.** Seis missões difíceis e acabou o dia. Quem termina às 11h faz o resto do dia por **zero**. E não protege contra nada — criar missão é grátis e instantâneo.

**d) A perda por inatividade é máquina de churn.** Você já intuiu (`INACTIVITY_LOSS_ENABLED = false`). **Decisão: fica desligada, permanentemente.** Uma semana de férias = −1.400 XP = mais de um nível apagado. Aversão à perda funciona quando recuperar é barato (streak); quando destrói patrimônio, o usuário não volta correndo — some.

**e) Não existe meta de médio prazo.** Existe o dia (missão) e o "daqui a 3 meses" (tier de arte). O vão entre 24h e 84 dias está vazio — e toda a literatura de retenção mora nesse vão.

**f) O streak é decorativo.** `computeNextStreak` produz dois inteiros que a UI desenha. Não multiplica, não protege, não desbloqueia. **E não tem condição de manutenção escrita em lugar nenhum** — hoje qualquer conclusão do dia serve, mas isso é acidente, não decisão.

**g) A classe é só uma skin.** Cinco classes, comportamento idêntico. Escolha que não é escolha — e você pagou arte por ela.

**h) Incentivo invertido no boss.** O boss leva 2 de dano por conclusão, independente da dificuldade. Isso ensina o usuário a criar missões Fáceis. Corrigido no §5.6.

### 5.2 A curva nova

**Correção de estimativa e de números em relação à v1.** A v1 dizia "zero migração, P (1 dia)". Não é nenhum dos dois.

**Migração real, em ordem, no mesmo deploy:**
1. `xp-system.ts` (`getXpRequiredForNextLevel`) e `xp_level_from_total()` (SQL) atualizados **simultaneamente** — se um for antes do outro, o nível do ranking diverge do nível da tela.
2. `update profiles set level = xp_level_from_total(total_xp);` — sem isso, quem não concluir missão fica com o nível antigo na view `public_profiles`.
3. `alter table profiles add column curve_version int not null default 2;` — e o cliente, ao ver `curve_version` maior que a sua constante local, mostra **uma vez** a tela *"Sua jornada foi rebalanceada — você subiu 3 níveis"* e **suprime a animação de level-up nessa transição**. Sem isso, `useUserStats.ts:376` calcula `levelBefore` do estado local e dispara um level-up fantasma de vários níveis na primeira conclusão — no mesmo trimestre em que level-up vira takeover de tela cheia.
4. Teste manual em staging com três perfis semeados (nv 3, nv 24, nv 61).

**Regra de segurança que continua valendo:** só torne a curva mais **fácil**. Se um dia precisar endurecer, use `level = greatest(calculado, level_gravado)`.

| Faixa | Custo/nível | Acumulado |
|---|---:|---:|
| 1–4 | 120 | 480 (Nv 5) |
| 5–9 | 300 | 1.980 (Nv 10) |
| 10–24 | 600 | 10.980 (Nv 25) |
| 25–49 | 1.200 | 40.980 (Nv 50) |
| **50–99** | **2.400** | **160.980 (Nv 100)** |
| 100+ | 3.000 | — |

| Marco | XP | Casual (60/dia) | Médio (120/dia) | Máximo (450/dia) |
|---|---:|---:|---:|---:|
| Nv 2 | 120 | 2 d | **1 d** | **1 d** |
| Nv 5 | 480 | 8 d | 4 d | 2 d |
| **Nv 10** (arte) | 1.980 | 33 d | **17 d** | 5 d |
| **Nv 25** (arte) | 10.980 | 183 d | **92 d** | 25 d |
| **Nv 50** (arte) | 40.980 | 683 d | 342 d | 91 d |
| **Nv 100** (arte) | 160.980 | — | 1.342 d | **358 d** |

**Por que 2.400 e não 1.600 na faixa 50–99, corrigindo a v1:** a v1 propunha 115.980 XP para o nível 100 *e* teto suave de 450 *e* multiplicador ×1,5 — o que dava 172 dias no máximo teórico. O nível 100 deixava de ser prestígio e virava seis meses. Com 160.980 e teto absoluto de 450 (o multiplicador saiu do XP — ver §5.4), o máximo teórico absoluto é **358 dias jogando perfeito todo santo dia**, e o realista passa de dois anos. O topo continua sendo topo, e as faixas de baixo continuam entregando a arte cedo — que era o problema real.

**Esforço:** M (12h). **Impacto:** alto.

**Tiers de arte intermediários sem custo de arte** (M/10h, impacto alto): variantes cromáticas via `filter` sobre o WebP em `CharacterFrame.tsx` — Nv 5 **Sombria** (dessaturada, fria), Nv 15 **Dourada** (âmbar + brilho), Nv 35 **Espectral** (ciano + glow), Nv 75 **Rubra**. Custo de arte: zero. Percepção: "ganhei uma skin". Some o sistema de **moldura/aura** em SVG/CSS.

### 5.3 Teto suave

Substitua o corte seco em `calculateEarnedXpToday` (e no espelho SQL) por retornos decrescentes:

| XP bruto no dia | Taxa | Creditado acumulado |
|---|---:|---:|
| 0–300 | 100% | 300 |
| 301–600 | 30% | 390 |
| 601+ | 10% | teto absoluto **450** |

O dia monstruoso vale 450 em vez de 300 (+50%), o farm continua contido (3.000 bruto ainda dá 450), e — o principal — **nenhuma missão vale mais zero**. Zero é a única recompensa que ensina o usuário a parar.

🚧 **A infra que falta, e que a v1 não viu.** A tabela de faixas precisa do **XP bruto do dia**. `profiles.daily_xp` guarda o **creditado**, e o `v_used` do SQL é `sum(credited_xp)` reforçado por `greatest(v_used, daily_xp)`. Com taxa progressiva, esse `greatest()` mistura duas grandezas e passa a **errar silenciosamente**.

**Pré-requisito:**
```sql
alter table public.profiles
  add column if not exists daily_gross_xp integer not null default 0,
  add column if not exists daily_gross_xp_date date;
-- backfill:
-- update profiles p set daily_gross_xp = (
--   select coalesce(sum(original_xp),0) from mission_completions
--   where user_id = p.id and completed_for_date = p.daily_xp_date and reverted_at is null)
-- , daily_gross_xp_date = p.daily_xp_date;
```
Mais reescrever a apuração em `complete_mission_atomic` **e** `revert_mission_atomic` **e** o espelho em `xp-system.ts`, em lockstep, com teste dos dois caminhos.

**Esforço corrigido: G (28h).** A v1 dizia M (2 dias). **Impacto:** alto.

**Decisão sobre o orçamento de "ontem":** `yesterdayXp` é um segundo orçamento de 300 — quem marca retroativamente todo dia ganha 600/dia legitimamente, pela UI. **Cai para 150**, com a mesma tabela de faixas proporcionalmente reduzida.

### 5.4 O streak: condição, proteção e o dia da quebra

**Primeiro, a decisão que faltava — a condição de manutenção:**
> **≥1 missão concluída no dia, qualquer dificuldade, qualquer categoria.**

Simples vence justo. Toda variante mais "justa" ("uma difícil", "duas") transforma o dia ruim em dia perdido, que é exatamente o que o escudo existe para evitar.

**Onde o multiplicador de streak foi parar — corrigindo a v1.** A v1 propunha multiplicar **XP** por streak e, no mesmo documento, prometia que nada altera posição no ranking. As duas coisas não convivem: multiplicar XP por streak transforma o ranking de XP em ranking de streak, e faz do fosso um placar de outra coisa.

**Decisão: o multiplicador de streak incide sobre Moedas (§5.6), nunca sobre XP.** Teto de XP é igual para todos; recompensa cosmética escala com constância. 🚧 Depende da moeda existir — vai para a Onda 3.

**Três peças de proteção, todas baratas:**

1. **Escudo de streak (Poção de Descanso).** **Ganho no jogo, não comprado — distribuído ANTES da necessidade e aplicado em silêncio.** Essa é a arquitetura exata do Duolingo e é o que faz funcionar: ganha ao completar 5 missões num dia, ao subir de nível, ao derrotar boss. Máximo 2 estocados (5 para assinante). Consumo **automático** — punir quem esqueceu de usar o item que evita a punição é sadismo de design. **Esforço:** P (4h: coluna `streak_shields int` + checagem em `src/lib/streak.ts`).
2. **Janela de recuperação.** *"Você perdeu ontem. Complete 3 missões até 23h59 e devolvemos seu streak de 47 dias."* **Esforço:** M (8h).
3. **Modo Descanso / Férias.** Congela o streak por até 14 dias, declarado com antecedência, 1×/ano. O Todoist, ferramenta séria, tem Vacation Mode. É o pressuposto de que a vida do usuário existe fora do seu app. **Esforço:** P (3h).

**4. A tela do dia da quebra — que a v1 esqueceu, e é onde o usuário decide se volta.**

Regras de copy e de comportamento, escritas:
- **Nunca punitiva.** Não "você perdeu tudo". Sim: *"Sua sequência recomeça hoje. Seus 47 dias continuam sendo seu recorde."*
- **O recorde aparece na mesma tela, preservado e em destaque.** O patrimônio nunca some.
- **A janela de recuperação é oferecida ali**, não escondida num menu.
- **O multiplicador cai em degrau, nunca a pique** (×1,5 → ×1,25 → ×1,1), para que a queda não pareça confisco.
- **No streak de dupla, a falha do amigo nunca aparece como culpa.** Só *"vocês recomeçam juntos"*. Nunca *"Rafael quebrou a sequência de vocês"*.

**Esforço:** P (2h). **Impacto:** alto — é a tela mais barata de fazer e a mais cara de errar.

### 5.5 O boss: dano por dificuldade e a recompensa

**Decisão corrigida — dano 1/2/3, com teto de dano diário, não teto de golpes.**

A v1 decidiu dano **1/2/4** mantendo o cap de 5 golpes/dia. Isso destruía a própria matemática de segurança dela: com dano 4 e 5 golpes, são 20 HP/dia → boss em **5 dias**; 3 arenas em paralelo → 3 tesouros a cada 5 dias. O piso de "10 dias reais por boss", que era a justificativa inteira de o tesouro poder pagar XP, evaporava.

**A correção certa não é abrir mão da diferenciação. É trocar o eixo do cap:**

| Dificuldade | Dano |
|---|---:|
| Fácil | 1 |
| Média | 2 |
| Difícil | 3 |

**Cap: 10 de dano por boss por dia do servidor** (substitui o cap de 5 golpes). Boss de 100 HP → **mínimo absoluto de 10 dias reais**, exatamente como antes. A dificuldade passa a importar (4 missões difíceis batem o teto do dia em vez de 5 fáceis: menos cliques, mesmo resultado), e o incentivo a criar missões fáceis morre.

🚧 **Custo real, que a v1 orçava como "P (1h)":** `boss_hits.damage` tem `check (damage between 1 and 2)` (`2026-boss-battles.sql:72`) — é ALTER de constraint com retrofit, mais reescrita do cap (que hoje conta linhas, e passa a somar `damage`), mais o trigger, mais o cliente. **P/M (3h).** E depende de 0.3 (`missions.xp`/dificuldade forjável).

**DECISÃO — a recompensa do tesouro. E ela não paga XP.**

A v1 dava ao baú a opção "Poder: 200 XP fora do teto", justificada por uma conta que a própria v1 quebrou. Mas há uma razão mais forte que a aritmética: **o teto suave (§5.3) já é a válvula de escape do teto diário.** O tesouro não precisa ser uma segunda. E XP fora do teto é a única coisa no jogo que, se escapar, contamina o ranking — que é o fosso.

**Tesouro v1 — entregável na Onda 2, sem depender de nada que não existe:**

Sempre, em toda vitória:
- **+1 no troféu permanente da categoria** ("Dragões abatidos: 3"), visível no perfil e para amigos;
- **um título + selo pixel 16×16** ao lado do nome no ranking, no anel de story e no card de amigo: *Matador de Dragões*, *Quebra-Elmos*, *Domador de Orcs* (progressivos: 1ª / 5ª / 25ª vitória);
- **1 Poção de Descanso** (escudo de streak), que já existe pelo §5.4.

**Por que o título é a parte que mais importa:** custo de produção = uma string e um sprite minúsculo; custo de balanceamento econômico = **zero**; efeito social = máximo, porque é uma coisa que se vê no ranking dos outros e dá vontade de ter. E cada título é mais um motivo para gerar o Cartão de Conquista (§7.1).

**Esforço v1:** M (12h — o SQL entra exatamente onde está `-- >>> RECOMPENSA ENTRA AQUI`, mais a tabela de títulos, mais o modal).

**Tesouro v2 — baú de escolha 1-de-3, na Onda 3.** 🚧 **Depende das Moedas de Guilda (§5.6) e do pool de cosméticos.** A v1 colocava o baú de três opções na Onda 2 e a moeda na Onda 3 — duas das três opções não existiriam. Ordem corrigida: **moeda antes do baú.**

| Opção | Conteúdo |
|---|---|
| **Riqueza** | 250 Moedas + 1 Poção |
| **Glória** | 1 cosmético do pool da categoria (moldura/aura/título) + 80 Moedas |
| **Astúcia** | 3 rerolls de quest + 150 Moedas |

**Story auto-gerado: parado, e por quê.** A v1 prometia "um item de Story auto-gerado alimenta o social de graça". O schema não permite barato: `stories.image_path` é `not null`, `unique`, com CHECK que exige `image_path = user_id || '/' || id || '.jpg'` (`2026-stories.sql:138`), bucket privado, e o trigger `stories_before_insert` impõe cota de 10/24h. Um story de sistema exige **gerar a imagem, subir no bucket com a chave derivada e abrir exceção na cota** — mais um dia inteiro sozinho, para uma feature de segunda ordem. **Parado até depois do Cartão de Conquista**, que resolve o mesmo problema melhor e serve para fora do app.

**Como escala sem inflacionar — escale o boss, não a recompensa:**

| Ciclo | HP | Dias mín. | Rank | Recompensa |
|---:|---:|---:|---|---|
| 1 | 100 | 10 | Filhote | 100% |
| 2 | 120 | 12 | Jovem | 100% |
| 3 | 140 | 14 | Adulto | 100% + cosmético garantido |
| 4 | 160 | 16 | Ancião | 100% |
| 5+ | 200 (teto) | 20 | Lendário | cosmético vira 40% de chance (senão +120 Moedas) |

Uma coluna `cycles_defeated integer not null default 0` + `max_hp` calculado resolvem.

### 5.6 DECISÃO — a economia: uma moeda, não duas

**A v1 decidiu duas moedas e se contradisse em três lugares:** dava "Pro +30 cristais/mês" enquanto o §10 dela proibia qualquer torneira de cristal; vendia cenário de fundo como perk de Pro **e** como item de 2.500 moedas; e mantinha o cristal lastreado numa loja física que ela mesma descontinuava.

**Diagnóstico do cristal hoje:** fonte única (`CRYSTALS_PER_REFERRAL = 15`), sumidouros = loja física (80–900) e 1 cristal = 1 dia de acesso. Para a camiseta de 450 são **30 indicações**. Para o usuário mediano o saldo é 0 e sempre será 0 — moeda morta na chegada, e moeda morta na UI é pior que nenhuma moeda: ensina que os números do jogo são decorativos.

**Depois das outras decisões deste documento, o cristal fica sem nada:**
- deixa de ser chave de acesso (Aposta 1);
- deixa de ser prêmio de indicação (a indicação vira 1 mês de Pro — §8.4);
- deixa de ter loja física (§8.9).

**Decisão: aposentar o cristal. Uma moeda só — Moedas de Guilda, 100% digital, sem COGS.**

**A migração é barata e essa é a parte boa:** `profiles.crystals` **vira** o saldo de Moedas. Um `update public.profiles set crystals = crystals * 100;` mais a troca de nome e ícone na UI. Sem coluna nova, sem tabela nova, sem segunda economia para manter. Aviso de 30 dias, resgates pendentes honrados, e-mail explicando (§8.9).

**Por que isso é melhor que duas moedas para dev solo:** duas moedas é duas tabelas de preço, duas torneiras para balancear, duas UIs, dois textos de FAQ e um conversor entre elas — e a segunda moeda só existia para proteger uma loja física que não vai existir.

**Torneiras** (Moedas): missão concluída 10 (teto 150/dia) · dia limpo +30 · 3 quests diárias 20/30/50 · **multiplicador de streak (×1,0 / ×1,1 / ×1,25 / ×1,5)** · sessão de foco 25min = 15 (teto 60/dia) · subir de nível 50 × min(6, ⌈nível/10⌉) · tesouro 80–250 · contrato semanal 400.
Total: **~250–350/dia engajado**, ~80–120/dia casual.

**Sumidouros** — e aqui é onde a maioria dos jogos erra:

| Item | Preço | Tipo |
|---|---:|---|
| Reroll de quest diária | 100 | **recorrente** |
| Poção de Descanso extra | 300, máx. 2 | **recorrente** |
| "Enfurecer" boss (dobra HP e dobra o tesouro) | 500 | **recorrente** |
| Moldura / aura | 800–2.000 | permanente |
| Título no ranking | 1.200 | permanente |
| Variante cromática de skin | 3.000 | permanente |

**Cenários de fundo NÃO estão nesta lista.** Cenário é perk de assinatura (grátis: 1; Pro: todos + um novo por mês). Um item não pode ser sumidouro de economia e perk de plano ao mesmo tempo — a v1 vendia o mesmo cenário duas vezes. **A linha divisória, decidida: Pro vende cenário e o cosmético mensal exclusivo; Moedas vendem moldura, aura, título e variante cromática.**

**Regra de calibragem:** o item mais barato com significado deve ser alcançável pelo casual em ≤3 dias (≤240 moedas), e o mais aspiracional pelo engajado em 30–45 dias (~9.000).
**Risco real:** sem os três sumidouros **recorrentes** e ~2 itens novos/mês, todo saldo vira infinito em 6 meses e a loja morre. Deflação (preço alto demais) é o risco maior no início — é literalmente o que acontece hoje.

🚧 **Pré-requisito absoluto:** o catálogo lê preço do banco (item 0.4). Se a loja digital nascer com `redeem_product(p_cost)`, ela nasce com o mesmo furo da física.

**Esforço:** G (32h: torneiras + saldo + catálogo server-side + o componente de decoração do §5.7). **Impacto:** alto.

**A jogada do Habitica que continua valendo:** assinante ganha **um teto mensal de Moedas bônus que cresce +2 por mês de assinatura contínua**, até um limite. Cria custo de saída acumulado dentro da economia, sem ser pay-to-win: cancelar não é perder um benefício, é perder 12 meses de escada. **Esforço:** M (10h).

### 5.7 Sistemas novos — veredito revisado

| # | Sistema | Veredito | Esforço |
|---|---|---|---|
| 1 | **Conquistas** | **Fazer — mas 8, não 40, e todas server-side.** A v1 pedia ~40 com cálculo no cliente: são 40 regras duplicadas (cliente + RPC), e cada mecânica nova obriga a revisitar as 40. Comece com 8 derivadas do que você já grava (`mission_completions`, `boss_hits`, streak), num RPC idempotente. Cresça de 4 em 4 quando alguma delas provar que é vista. | M (14h) |
| 2 | **Quests diárias** | **Fazer, mas não como função pura.** A v1 propunha `hash(user_id ‖ data)` — uma função pura não conhece o estado do usuário e vai pedir "conclua 2 missões de Saúde" a quem não tem nenhuma missão de Saúde, numa fração grande dos dias. **Correção: materialize a quest do dia num RPC idempotente no primeiro request, sorteando de um pool filtrado pelas categorias e turnos usados nos últimos 14 dias.** Continua sem cron. | G (28h) |
| 3 | **Multiplicador de streak (sobre Moedas)** | **Fazer**, junto com a moeda. | M (8h) |
| 4 | **Baú por turno** (Manhã/Tarde/Noite) | **Fazer, com uma trava:** os três baús são **colecionáveis a qualquer hora do dia**, não expiram por turno. Assim a mecânica premia quem distribui o trabalho sem obrigar três aberturas do app (§5.8, invariante 3). | P (4h) |
| 5 | **Árvore de talentos por classe** | **v2.** Só funciona se afetar a **economia**, nunca "combate": Guerreiro +10% Moedas em Saúde; Arqueira +2 de dano/dia num boss; Ladrão +1 reroll/dia; Bruxa converte 1 Difícil em +1 de dano; Bardo +15% Moedas quando um amigo fecha o contrato semanal. **Zero arte nova**, e finalmente diferencia as 5 classes. Respec sempre grátis. | G (36h) |
| 6 | **Party (2–5 amigos, meta semanal)** | **Fazer no lugar de guildas.** Sem chat (sem moderação), só meta compartilhada + status. **Regra: a party só SOMA, nunca subtrai.** | G (32h) |
| 7 | **Boss comunitário do mês** | **v2.** HP dimensionado pelos ativos do mês anterior; fechamento preguiçoso no primeiro request após o fim. Risco: com base pequena o boss não morre e o evento vira fracasso público — **calibre o HP por baixo**. | G (32h) |
| 8 | **Temporadas / passe** | **Não agora, e provavelmente nunca.** Ver §5.9. | — |
| 9 | **Duelos entre amigos** | **Só sobre foco.** Duelo de "missões concluídas" é trivialmente trapaceável; minutos de foco cronometrados é o único sinal semi-verificável. Desafio assíncrono de 7 dias, sem punição para o perdedor. | G (28h) |
| 10 | **Eventos sazonais** | Ver §5.9 — conflito de contrato de conteúdo. | — |
| 11 | **Pets/montarias** | **Opcional.** O valor está no **sumidouro recorrente** (ração), não no pet. Se fizer: **um** pet, 3 estágios, ovo dropado do tesouro. | G (28h + arte) |
| 12 | **Equipamentos com atributos** | **Não fazer.** "+5 de Força" não significa nada sem combate. | — |
| 13 | **Guildas/clãs** | **Não fazer.** Chat = moderação, denúncia, LGPD. E guilda vazia é pior que nenhuma. | — |

**Sobre o catálogo cosmético — a manutenção que a v1 não contou.** Cada moldura/aura/título precisa aparecer em `CharacterFrame`, `CharacterAvatar`, `RankingRow`, `StoryRing`, `FriendCard`, cartão compartilhável e loja: **7 pontos de renderização por item.** 15–20 itens = 140 pontos de manutenção para uma pessoa.

**Correção: um único `<Decoration>` dirigido por dado.** Um componente, uma tabela de definição (`{id, tipo, camada, css/svg}`), e os 7 lugares consomem o mesmo componente. **Comece com 5 itens.** Adicionar o sexto passa a custar minutos, não um dia.

### 5.8 Os limites — onde traçar a linha

Seis invariantes. A nº3 foi reescrita porque a v1 se contradizia com duas features que ela mesma aprovava.

1. **A recompensa nunca depende do número de missões acima de um piso baixo.** A partir de ~6 missões/dia, ganhar mais é marginal. O teto suave preserva isso.
2. **O jogo nunca pune a vida real.** Sem decaimento de XP, com escudo automático e Modo Férias.
3. **Nada expira sem o usuário ter tido o dia inteiro para pegar.** *(A v1 dizia "nenhuma mecânica exige abrir o app mais de duas vezes por dia" e no mesmo texto aprovava baú por turno e expedição de 8h "para criar um segundo motivo de reabrir o app".)* A regra corrigida permite os três baús de turno — colecionáveis a qualquer hora — e **mata a expedição de 8h**, que era timer de coleta com outro nome. Sem energia que regenera, sem "volte em 4h", sem janela que fecha antes da meia-noite.
4. **O ranking é sempre relativo e sempre recuperável.** Semanal como padrão, com botão de sair do global sem perder nada. **Sem ligas com rebaixamento**: funciona para idioma (a tarefa é a mesma para todos), mas em app de tarefas quem tem filho e dois empregos sempre perde — vira punição por circunstância.
5. **"Modo Sóbrio" no perfil** (P, 4h): esconde toasts de XP, ranking e boss, deixando missões e foco. Prova ao cético que a ferramenta funciona sem o jogo, e dá a quem está numa semana pesada um jeito de baixar o volume em vez de abandonar.
6. **A métrica de verdade é taxa de conclusão do planejado, não XP acumulado.** `useMetrics.ts` já calcula quase tudo. Se o XP médio sobe e a conclusão cai, a gamificação virou ruído. É o seu detector de incêndio.

> **A linha, em uma frase:** a camada de jogo pode decidir *como o usuário se sente* sobre o trabalho que fez, mas nunca *qual trabalho ele faz*. No instante em que alguém escolhe uma tarefa por causa do XP, você perdeu.

### 5.9 Conteúdo recorrente — escolha uma coisa e assuma

A v1 recusava "temporadas/passe" pelo **contrato de conteúdo para sempre** e, no mesmo texto, aprovava **3 eventos sazonais/ano + 1 cosmético mensal de assinante** = 15 entregas/ano, para sempre, feitas pela mesma pessoa. Isso é o mesmo contrato com outro nome.

**Decisão: o único compromisso de conteúdo recorrente é o cosmético mensal do assinante — 12 entregas/ano, cada uma sendo uma moldura CSS ou uma variante cromática por `filter`, com custo de horas, não de ilustração.** É o perk que mais retém no Habitica e é o mínimo que uma assinatura precisa entregar continuamente.

**Eventos sazonais: no máximo 1/ano** (Ano Novo, que é quando app de produtividade tem pico), reciclando boss com paleta trocada. **Passe/temporada: não.** Se um dia o cosmético mensal virar rotina confortável por 6 meses seguidos, reavalie.

### 5.10 Personagem que reage ao dia

Hoje o personagem muda em 1/10/25/50/100 — isso é **progressão**, não **vínculo**. O vínculo do Finch (US$ 30M+ ARR, bootstrapped) vem de **reação de curto prazo**: 2–3 poses por skin ligadas ao estado do dia — cansado quando você não completou nada, empolgado quando bateu o dia, pose diferente por turno.

É o reframe que o Finch prova: em vez de "preciso melhorar minha rotina", o app diz "seu personagem está te esperando". A tarefa ganha um rosto e fica menor.

**Esforço:** G (16h de código + **produção de arte real**: 5 classes × 5 tiers × 2 poses = 50 sprites novos se feito à risca). **Versão barata que entrega 70%:** 2 poses só para o tier atual do usuário, mais transformações CSS (inclinação, `filter` dessaturado, bounce) para os demais estados. G (20h). Faça a versão barata.

---

## 6. Aquisição, ativação e ciclo de vida

Este capítulo praticamente não existia na v1, que tinha três mecanismos de aquisição (card, perfil público, indicação) e uma proibição (mídia paga). Isso é um plano de *retenção viral* para uma base que ainda não existe.

### 6.1 A landing precisa provar o loop, não descrevê-lo

Correções pontuais primeiro:
- **`src/app/page.tsx:56` — "Ver demonstração" aponta para `/dashboard`** → `AccessGuard` → `/paywall`. O visitante que clicou em "quero ver antes de pagar" recebe exatamente a tela de pagar. É o pior clique possível do funil, e é o segundo CTA do hero. **P (1h).**
- **`src/data/landingContent.ts:110` anuncia "R$ 14,90/mês"** e `:115` anuncia "R$ 8,32/mês no plano anual — R$ 99,90/ano", enquanto `src/lib/payments/revenuecat.ts` só implementa `findMonthlyPackage()`. **O plano de maior LTV está anunciado e não pode ser comprado.** M (6h).

**E o que a landing precisa provar, que a v1 não dizia:**

| Peça | Por quê | Esforço |
|---|---|---|
| **Vídeo/GIF de 8s no hero**: concluir missão → barra enchendo → level-up | Screenshot estático não prova o loop, e o loop *é* o produto. Grave a própria tela. | P (4h) |
| **"Ver demonstração" → modo demo somente-leitura**, com conta semeada (nível 23, streak 40, boss pela metade, 6 amigos falsos com nomes genéricos) — ou, se for caro, para o vídeo | Ninguém compra uma cidade vazia. A demo precisa mostrar um jogador em curso, não um app zerado. | M (10h para a demo; P para o vídeo) |
| **Tabela Grátis × Pro**, com a mesma copy do paywall contextual | Se a tabela e o paywall dizem coisas diferentes, o usuário desconfia dos dois. | P (2h) |
| **FAQ com as 5 objeções reais** | "É só mais um app de tarefas?" · "E se eu não gosto de jogo?" → Modo Sóbrio · "Posso cancelar?" · "O que acontece com meus dados?" · "É uma pessoa só?" (responda "sim, e por isso o suporte responde") | P (3h) |
| **`/precos` própria e indexável** | É a segunda página mais buscada de qualquer SaaS e hoje não existe. | P (3h) |
| **O rosto do desenvolvedor** | "Feito por uma pessoa, no Brasil" converte mais que fingir ser empresa. | P (1h) |

**Headline:** venda o resultado, não a mecânica.
> **"O app de tarefas que você não abandona na segunda semana."**

com o subtítulo explicando o como: *"Suas tarefas viram missões, seu progresso vira um personagem — e seus amigos estão vendo."*

### 6.2 SEO e OG — 2 horas que valem meses

Verificado: `src/app/layout.tsx` tem `metadata` com title/description/keywords e **nada mais** — sem `metadataBase`, sem `openGraph`, sem `twitter`, sem `robots`. E `public/` não tem favicon nem OG image.

**Hoje, um link do lvl2do colado no WhatsApp aparece sem imagem e sem nada.** Isso desliga o canal de compartilhamento antes de ele começar.

**P (3h)** — coberto no §2.9 passo 1. Depois disso, o que dá para indexar (e a lista é curta e honesta):

| Superfície | Indexar? |
|---|---|
| Landing + `/precos` | **Sim**, é o alvo principal |
| `/u/nickname` | **Sim, mas opt-in** (§7.3) |
| Conteúdo (blog/guias) | **Sim**, é o único canal de SEO com volume |
| Ranking público | **Não** — ver Descartado |
| `/login`, `/register`, `/paywall`, `/(app)/*` | **`noindex`** |

**Termos concretos em PT-BR para o conteúdo**, que é onde o Habitica não tem absolutamente nada em português: *"app de tarefas gamificado"*, *"alternativa ao Habitica em português"*, *"produtividade para TDAH"*, *"como criar rotina de estudos"*, *"app de hábitos com personagem"*. Um artigo bom por mês, escrito por quem construiu o produto, é conteúdo que ninguém consegue copiar rápido.

### 6.3 Cadastro — as duas telas que a v1 pulou

A v1 otimizava o onboarding em três atos e ignorava as duas telas anteriores. É onde funis brasileiros perdem 20–40% antes do primeiro clique.

- **Google OAuth no Supabase.** É provavelmente **a maior conversão por hora do funil inteiro**: tira senha, tira confirmação de e-mail, tira "esqueci a senha" do caminho crítico. **Esforço:** P (3h). Faça na Onda 1.
- **Confirmação de e-mail obrigatória: decida explicitamente.** **Recomendação: não exigir antes de usar o app.** Deixe entrar, confirme depois, e bloqueie só o que envolve social (adicionar amigo, postar story) e pagamento. Custo de spam: baixo. Custo de exigir: um funil que morre na caixa de entrada de um e-mail que hoje sai por SMTP de desenvolvimento (§2.8).
- **"Não recebi o e-mail"** com botão de reenvio visível e contador. É o chamado de suporte nº1 de todo produto.

### 6.4 A sequência da primeira semana — o "dia 2 ao 7" que faltava

A v1 tinha o minuto 1 (Ato 3) e o dia 90 (métricas), e nada no meio. 🚧 **Depende do §2.8 (e-mail) e do §2.7 (pg_cron).**

| Quando | Gatilho | Assunto | Conteúdo |
|---|---|---|---|
| **D0** | cadastro | "Sua Bruxa está pronta" | A arte que ele escolheu, o nível 1, e um link direto para a primeira missão |
| **D2** | não voltou | "Seu personagem está esperando" | A arte com a pose cansada (§5.10), o streak em 0, um botão |
| **D3** | streak = 3 | "Três dias" | O primeiro marco, o card compartilhável já pronto |
| **D5** | tem 0 amigos | "Você joga sozinho" | Preview do que muda com um amigo + link de convite |
| **D7** | qualquer | "Sua primeira semana" | Recap: missões, XP, streak, o boss pela metade. É o §7.2 aplicado onde mais paga. |

**Esforço:** M (12h, com o e-mail já configurado). **Impacto:** alto — é a mesma infraestrutura do §7.2 usada uma semana antes.

### 6.5 Canais — o plano que não existia

Três mecanismos virais não são um plano de aquisição. O produto precisa de gente entrando por fora.

| Canal | Por que este produto | Cadência | Meta de corte |
|---|---|---|---|
| **Vídeo curto (TikTok / Reels / Shorts)** | **É o canal principal.** O produto é literalmente pixel art que evolui — o formato "meu personagem em 30 dias" é feito sob medida. Timelapse de level-up, boss morrendo, os 5 tiers de uma classe lado a lado. | 3–4 vídeos/semana | Se em 6 semanas nenhum vídeo passar de 20k views, mude o formato, não o canal |
| **Build in public** (X / Threads / LinkedIn) | Dev solo brasileiro construindo um jogo-produtividade é uma narrativa que já funciona. E gera os primeiros 100 usuários, que são os mais difíceis. | 2–3 posts/semana | 50 cadastros em 8 semanas |
| **Nichos que já vivem de streak** | Concurseiros, ENEM/medicina, academia, comunidade TDAH. Estas pessoas já entendem "sequência de dias" sem você explicar. | 5–10 criadores pequenos, Vitalício grátis em troca de post honesto | 50 cadastros por criador |
| **Comunidades** (Reddit BR, Discords de estudo, Telegram de concurso) | Custo zero, alta densidade. **Regra: entre como membro semanas antes de divulgar** — divulgação a frio queima o canal permanentemente. | 1 comunidade nova/mês | 30 cadastros |
| **Sazonalidade** | Janeiro (resoluções), fevereiro/março (volta às aulas), agosto/setembro (pré-ENEM). São os três picos de busca por "app de hábitos" no Brasil. | 3 campanhas/ano | — |

**Regra de operação: 1 experimento de canal por semana, matando o que não trouxer 50 cadastros em 6 semanas.** E **nada de mídia paga antes de CAC orgânico conhecido.**

### 6.6 Cold start social — derrubar o paywall não enche o estádio

A v1 acertou que o fosso é o grafo social e que o paywall o destrói. Mas derrubar o paywall só troca **estádio vazio pago** por **estádio vazio grátis**. Nada no plano dizia como o *primeiro* usuário encontra alguém.

- **Lance por coorte, não por usuário solto.** Uma turma, um grupo de amigos, um Discord por vez. Vinte pessoas que se conhecem retêm melhor que duzentas que não.
- **Convite como passo opcional-mas-destacado do Ato 3**, com preview do card no WhatsApp. Não obrigatório — obrigatório mata o funil.
- **"Amigos sugeridos" a partir de quem entrou pelo mesmo link de indicação.** Barato e resolve metade do problema.
- **Regra de UI enquanto a rede for pequena: o ranking padrão é SEMANAL GLOBAL, não "Amigos".** Ranking de amigos com zero amigos é uma tela vazia para 100% dos novos. Quando a mediana de amigos por usuário passar de 2, inverta. *(Isso contradiz a invariante 4 da v1, que pedia "padrão em Amigos" — a invariante estava certa para um produto maduro e errada para um produto vazio.)*
- **Descubra o número mágico.** Hipótese: retenção D7 de quem tem ≥1 amigo é substancialmente maior que a de quem tem 0. **Meça isso antes de qualquer outra coisa social** — é a prova ou a refutação de toda a tese do fosso, e o corte custa cinco minutos no PostHog (§8.11).

### 6.7 O usuário que volta depois de três meses

A coorte mais barata de recuperar e a mais fácil de perder na primeira tela. Não aparecia na v1.

**O que ele encontra hoje:** um muro de missões recorrentes atrasadas, streak zerado, nenhum contexto.

**As regras, escritas:**
1. **Nunca mostrar backlog.** O retorno abre em **"Semana nova"**, com as recorrentes pausadas e 3 missões fáceis pré-criadas.
2. **O patrimônio é o argumento e vem na primeira linha:** *"Nível 23, 1.480 XP e sua Bruxa Dourada continuam seus."* Não "você perdeu sua sequência".
3. **Um escudo de brinde no retorno.** Custo zero, sinaliza que o app não está bravo.
4. **"O que mudou desde que você saiu"** — changelog de 20s dentro do app, com as duas ou três coisas visuais mais bonitas.
5. **Sequência win-back em D7 / D30 / D90**, com o card do personagem como imagem do e-mail.
6. **Assinante expirado tem oferta separada** — reativação com desconto, e **nunca** a mesma mensagem de quem nunca pagou. Não punir quem já pagou uma vez.

**Esforço:** M (12h). **Impacto:** alto, e cresce com o tempo.

### 6.8 Offline — a decisão que faltava

Concluir missão é RPC no servidor com a invariante "estado local só muda com retorno do servidor" (correta). **Consequência prática que ninguém escreveu: no metrô, o usuário não consegue completar nada** — num app cujo produto é hábito diário.

**Decisão: (b) agora, (a) depois.**
- **(b) Agora:** mensagem honesta de "sem conexão" com estado de reconexão e retentativa automática, e **cache do service worker para a arte** (§2.9), para o app abrir instantâneo. **P (4h)** depois do SW.
- **(a) Depois:** fila offline com liquidação idempotente ao reconectar — `client_op_id` único por tentativa, RPC que ignora repetição. Só vale a pena quando houver push e instalação de PWA reais. **G.**

---

## 7. Social, viral e moderação

Hoje stories e ranking são **fechados** — só circulam entre quem já pagou. Viralidade dentro de um jardim murado é zero por definição. Isso muda com a Aposta 1; o resto desta seção é o que construir em cima.

### 7.1 O Cartão de Conquista (1080×1350)

O artefato que a pessoa posta. Disparado em três momentos: **subir de tier**, **derrotar boss**, **marco de streak (7/30/100)**.

Composição, de trás para frente: cenário escolhido sangrado e escurecido 35% com grain → personagem centralizado `object-bottom` com sombra de contato e luz de recorte roxa → topo com sigilo lvl2do + `nickname#TAG` → manchete em Sora 700, 72px, tracking −0.032em (**"NÍVEL 25"** / **"DRAGÃO DERROTADO"** / **"30 DIAS SEGUIDOS"**) → faixa de HUD (XP total · streak · classe, em `.num`, com a barra de entalhes) → moldura com cantos ornamentados → rodapé com o domínio em pixel.

**Esforço corrigido: G (28h).** A v1 orçava 16h. O que ela não contou:
- as fontes precisam ir **embutidas em base64** (Sora + Manrope, subset) — SVG serializado não herda `@font-face` do documento;
- a arte do personagem também vai como data URI (WebP com alfa);
- `foreignObject` tem comportamento divergente no Safari — use `<text>` puro, com quebra de linha calculada à mão;
- `navigator.share({files})` **não existe no desktop** — fallback de download obrigatório;
- mais o caminho de redução de movimento e o estado de "gerando".

**Alternativa que vale considerar:** **`ImageResponse` do `next/og`**, nativo no Next 15. Roda no servidor, resolve fonte e imagem sem gambiarra, e serve para o recap semanal e para as OG images de perfil — que precisam existir *sem o usuário abrir o app*. Custo similar, resultado mais confiável. **Recomendação: faça a versão `next/og` primeiro e a client-side só se a latência incomodar.**

**Por que importa:** é o único canal de aquisição com CAC zero, e é literalmente o motivo pelo qual você fez pixel art. Sem isso, a arte é custo, não canal.

**Prioridade: o Cartão vem ANTES do perfil público.** O card não depende de nada; `/u/nickname` depende de decidir privacidade e abrir acesso anônimo à view (§7.3).

### 7.2 Recap semanal

Domingo 19h: card pronto para Stories com personagem, nível, streak, XP da semana, boss derrotado. `useMetrics.ts` já calcula tudo — falta empacotar e plugar no sistema de Stories existente. É um "Wrapped semanal", conteúdo social recorrente e gratuito. 🚧 Depende de pg_cron (§2.7) para o envio por e-mail; a versão in-app é preguiçosa e não depende de nada.
**Esforço:** M (14h). **Impacto:** alto.

### 7.3 Perfil público `/u/nickname` — com opt-in

Renderizado no servidor, com OG image dinâmica: personagem, nível, streak, títulos, selos. Todo link colado no WhatsApp vira cartão visual. Botão: "Criar meu personagem".

🚧 **O que a v1 orçava como "M (1–2 dias)" e não é:**
- `public_profiles` hoje tem `grant select ... to authenticated` (`2026-social.sql:42`). Perfil público exige `grant select to anon` — o que expõe **todos** os perfis a qualquer um, inclusive os de menores (§2.10).
- Portanto: coluna `profile_public boolean not null default false`, view separada filtrada por ela, **opt-out visível e opt-in por padrão para menores de 18**.
- Mais: blocklist de nickname (§7.6) — você vai hospedar apelidos com URL própria.

**Esforço:** G (20h). **Impacto:** alto (aquisição).

### 7.4 Ritmo social: semana antes de tudo

O ranking hoje é "Todos os tempos / Anual" — um usuário novo **nunca aparece nele**, então o ranking desmotiva 99% da base em vez de motivar.

**Decisão: ranking semanal vira a aba padrão** (anual/all-time viram secundárias), e **global antes de amigos** enquanto a rede for pequena (§6.6). Ranking que reseta é ranking em que todo mundo pode ganhar. 🚧 Precisa de `week_xp`/`week_xp_week` no perfil, mantidos pela mesma RPC — a arquitetura de `year_xp` já mostra o padrão (mas **sem** o trigger sobre insert do cliente, que é o furo 0.2). **Esforço:** M (14h).

Mais duas peças baratas:
- **Contrato semanal:** meta única de segunda a domingo ("1.200 XP" ou "18 missões, ao menos 3 de cada categoria"), recompensa cheia em Moedas + baú. **M (10h).**
- **Streak de dupla com amigo.** Você já tem `nickname#TAG`. **M (14h).** Regra do §5.4: a falha do amigo nunca aparece como culpa.

### 7.5 O nudge vem do amigo, não do app

*"Seu amigo Rafael está com o streak de 47 dias em risco"* move mais gente que qualquer recompensa.

🚧 **A v1 dizia que "`useNotifications.ts` + `NotificationsBell.tsx` já existem".** Existem como **sino local**: `useNotifications` é `localStorage` puro, e **nenhum usuário consegue escrever uma notificação para outro**. O item mais forte da seção social depende de infraestrutura que não existe.

**Pré-requisito:** tabela `notifications` com RLS (destinatário lê; **só RPC escreve**) + gatilho no servidor. **M (8h)** — está no §2.3. Só depois disso o nudge é **M (8h)**.

### 7.6 Moderação — o kit mínimo, e o dever que não acaba

A v1 orçava "botão de denúncia + remoção manual" em P (4h). **4h é o botão.** A obrigação é permanente e diária: foto de pessoa real, menor de idade, remoção no Storage, retenção do objeto denunciado como prova, fila de triagem, resposta ao denunciante. E o §7.3 aumenta a exposição ao tornar perfis públicos.

**A decisão que precisa ser tomada de olhos abertos:**
> Ou stories com foto continuam existindo e você aceita um **dever operacional diário, para sempre**, ou stories viram só texto + personagem (que aliás é mais bonito e mais alinhado ao produto).

**Recomendação: mantenha a foto, porque é o que faz o social funcionar — mas construa o kit inteiro antes de abrir o produto**, não depois:

| Peça | Por quê | Esforço |
|---|---|---|
| **Denunciar** story/usuário | Mínimo legal | P (3h) |
| **Bloquear** usuário (não só denunciar) | É o que impede assédio de virar caso. Denúncia resolve depois; bloqueio resolve agora. | M (6h) |
| Validação server-side do upload (tipo, tamanho, dimensão) | O bucket já é privado com chave derivada — falta o resto | P (3h) |
| **Blocklist de palavrão e impersonação em `nickname#TAG`** | Você vai hospedar apelidos com URL própria (§7.3) | P (4h) |
| Fila de denúncias legível em 1 minuto (uma view + uma página) | Se a triagem for chata, ela não acontece | M (6h) |
| Retenção do objeto denunciado por 90 dias | Prova, e obrigação em pedido judicial | P (2h) |
| **Política de conteúdo publicada** | Sem ela, remover é arbitrário | P (2h) |

**Total: M/G (26h).** É o preço de ter um produto social. Não há versão de 4 horas.

---

## 8. Monetização e o Brasil real

### 8.1 As cinco travas de faturamento

1. **Não existe camada grátis** — `canAccessApp()` + `AccessGuard` (Aposta 1).
2. **"Ver demonstração" leva ao paywall** (`page.tsx:56`) — §6.1.
3. **O plano anual é anunciado e não existe** (`landingContent.ts:115` vs. `revenuecat.ts`) — §6.1.
4. **O "cristal do dia" está morto em produção** — `consume_daily_crystal` não existe em `supabase/`.
5. **Zero telemetria.** Nenhum PostHog/gtag/Plausible em `src`. **Item zero de tudo neste capítulo.**

**Trava 6, que a v1 não listou e é a maior: o servidor não sabe quem pagou** (§2.2). O webhook falha em silêncio desde sempre.

*(Sobre `@clerk/nextjs`: não é importado em nenhum arquivo de `src` — é dependência morta mais um `middleware.example.ts` esquecido. `npm rm` é 1 minuto. A v1 chamava isso de "dois sistemas de auth em produção", o que era exagero.)*

### 8.2 Posicionamento

**Para quem:** brasileiro de 18–32 anos com relação difícil com rotina (procrastinação, TDAH declarado ou suspeito), fluente em linguagem de jogo — mantém streak no Duolingo, entende "boss". Não é o executivo do Todoist: é quem já tentou app de tarefas e abandonou porque lista não dá dopamina.

| Concorrente | Preço BR | Ameaça |
|---|---|---|
| **Habitica** | **Grátis** | **A maior.** RPG + tarefas + party, open source, 12 anos, milhões de registrados. |
| Finch | ~R$ 40/mês | Polido, emocional, mobile-first. Ganha em acolhimento. |
| Duolingo | ~R$ 32/mês | Não compete, mas ensinou seu usuário o que é streak. |
| Todoist | ~R$ 24/mês | Ganha em utilidade pura. Perde em emoção. |
| Forest | assinatura | Só foco. Concorre com `/focus`. |

**Habitica faz o núcleo do que você faz e é grátis.** Para cobrar contra um gratuito de 12 anos, ganhe onde ele é ruim: feio, confuso, em inglês, onboarding hostil, social datado, e sobrecarga cognitiva justamente para o público TDAH. **Esse é o seu espaço.**

**Sobre o diferencial defensável, com honestidade: não é o pixel art.** Arte é copiável em 3 meses por qualquer concorrente com verba. O pixel art vende o clique e o screenshot — é canal, não fosso. **O fosso é o grafo social em português.** Consequência: toda decisão que reduz a população da rede destrói seu único fosso para proteger uma receita que ainda não existe.

### 8.3 DECISÃO — planos, preços e o aumento que precisa ser dito

**AVENTUREIRO — grátis, para sempre, sem cartão.** Missões ilimitadas, XP, nível, streak, personagem até o tier 25, **1 boss ativo** (escolhe a categoria), amigos ilimitados, ranking completo, 1 story/dia, foco 25min padrão, 2 alarmes, histórico de 14 dias.

**PRO MENSAL — R$ 16,90/mês**
**PRO ANUAL — R$ 119,90/ano** (R$ 9,99/mês) · *fundador R$ 99,90 para os 500 primeiros*
**LENDÁRIO (vitalício) — R$ 297, limitado a 300 unidades**

Justificativas, uma linha cada:
- **R$ 16,90 e não R$ 14,90:** você precisa de espaço para descontar; a R$ 14,90 o anual de R$ 99,90 já é só 44% off e não sobra margem para promoção sazonal. Continua abaixo do Spotify e muito abaixo do Super Duolingo — a régua mental brasileira.
- ⚠️ **Isto é um AUMENTO sobre um preço já publicado.** `landingContent.ts:110` diz R$ 14,90 hoje. Tratar isso como decisão de comunicação, não só de planilha: **quem se cadastrou antes da mudança tem R$ 14,90 travado para sempre** (grandfathering), a landing muda no **mesmo dia** da decisão, e o e-mail de aviso vai antes. Com poucos ou nenhum assinante hoje, o custo é ~zero e o gesto é real.
- **Grandfathering vira argumento de venda, e a v1 não usava:** *"o preço que você assina hoje é o seu para sempre"*. É a melhor razão para comprar hoje em vez de mês que vem.
- **O anual é o produto principal, não o mensal.** Retenção 12m de anual é muito superior à do mensal. **Meta: 60% dos pagantes no anual.** Descontar o anual não é perda de receita, é seguro contra churn.
- **Vitalício R$ 297 ≈ 2,5 anos de anual:** para dev solo, é caixa hoje. Limite em 300 unidades (teto ~R$ 89k) e posicione como "Sócio Fundador" com badge exclusivo — **o badge é o que vende, não a economia.** Ver a cláusula obrigatória em §8.8.
- **Trial: troque cartão por freemium.** **14 dias de Pro concedidos automaticamente no cadastro, sem cartão.** Trials longos convertem substancialmente melhor que os de ≤4 dias, e a LatAm converte tarde. No dia 15 o usuário desce para o grátis **sentindo a falta** — e esse downgrade sentido converte melhor que trial com cartão.

**Aritmética que define o horizonte:** R$ 5.000 de MRR a ticket médio ~R$ 12 = ~420 assinantes = ~10.000 usuários grátis a 4% de conversão. Para 90 dias, a meta honesta é bem menor — ver §9.

### 8.4 O que cobrar, o que nunca cobrar, e onde o limite mora

**Regra inegociável:** nada que o Pro compra pode gerar XP, acelerar nível, dar dano extra no boss ou melhorar posição no ranking. No momento em que o ranking for comprável, ele morre como mecânica — e ele é o fosso.

| Cobre | Por que vende | 🚧 Pré-requisito |
|---|---|---|
| **Cenários de fundo** (`characterBackgrounds.ts`) — grátis 1, Pro todos + 1 novo/mês | cosmético puro, arte já existe | — |
| **Skins exclusivas Pro** (variantes *paralelas*, fora da trilha de nível) | vaidade sem punição | arte |
| **Histórico e métricas** — grátis 14 dias, Pro all-time + export CSV | quem paga é quem já tem 3 meses de dados | RLS por data + `is_pro()` |
| **Quem viu meu story** | curiosidade social é o gatilho de compra mais forte que existe | RPC checando plano |
| **Os 3 bosses simultâneos** (grátis: 1) | escala natural, não é vantagem sobre terceiros | RPC de ativação |
| **Alarmes recorrentes ilimitados** (grátis: 2) | poder de organização, não de pontuação | 🚧 **`alarms` ainda é localStorage** (§2.3) |
| **Foco: durações customizadas + histórico completo** | concorre com o Forest | 🚧 **`focus_sessions` ainda é localStorage** (§2.3) |
| **Moldura de story, badge no ranking, título destacado** | status visível = o melhor anúncio que existe | — |
| **Cosmético mensal exclusivo de assinante** | é o perk que mais retém no Habitica (§5.9) | — |
| **Teto de Moedas bônus crescente por mês de assinatura** | custo de saída dentro da economia | 🚧 moeda (§5.6) |
| **5 escudos de streak em vez de 2** | conveniência, não vantagem competitiva | — |

**Nunca cobre:** número de missões (limitar tarefa é limitar o valor central — e o Habitica não limita), XP/nível/streak, participação no ranking, **número de amigos** (limitar amigos é sabotar a própria viralidade), conclusão/reversão de missão, o boss básico.

**Sobre as skins de nível:** mantenha as de tier 1/10/25 **conquistáveis no grátis**. Trancar atrás de dinheiro algo que o usuário suou 3 meses para merecer gera raiva, não receita. **Pro dá skins paralelas, nunca confisca as merecidas.**

> **A regra de enforcement, e ela não é negociável:** todo limite de plano mora em **RLS ou dentro da RPC**, lendo `profiles.subscription_status` no servidor. O cliente **só desenha o cadeado**. Com a anon key no navegador, todo limite client-side é contornável em 30 segundos — e freemium client-side não é freemium, é honra.
> **Esforço:** P/M por limite; **G (16h+)** para os seis do quadro. 🚧 Depende de §2.2 (colunas) e de 0.1 (a coluna precisa ser inescrevível pelo cliente).

### 8.5 Cobrar no Brasil — a decisão que a v1 deixou a um nível de abstração alto demais

A v1 decidiu "PIX no anual e vitalício" e parou. Isso esconde três coisas caras.

**a) Quem recebe.** RevenueCat Web Billing processa via **Stripe**. Se a entidade da conta não for brasileira, a cobrança aparece como **internacional** para o cliente: IOF, taxa de recusa mais alta, "compra em dólar" no extrato. Isso sozinho pode custar mais conversão do que toda a §3.
**Decisão a tomar antes de qualquer preço:** conta Stripe **BR** (com CNPJ) ou gateway nacional (Mercado Pago / Asaas / Pagar.me).

**b) Parcelamento — o que a v1 não citou e converte mais que desconto.** É o padrão brasileiro. Anual em 3–12× e Vitalício em até 12× transformam R$ 297 em "R$ 24,75 por mês", que é a única forma de o Vitalício vender em volume. Gateway nacional faz; Stripe internacional não.

**c) PIX é um segundo stack de pagamento, não uma configuração.** `@revenuecat/purchases-js` é Web Billing e não faz PIX. Isso significa: outro provedor, **outro webhook**, reconciliação de entitlement entre dois provedores, caminho próprio para conceder o Vitalício, e o cenário mais perigoso do produto — **estado de assinatura divergente entre dois sistemas**.

**Esforço corrigido: GG (60–80h).** A v1 orçava M. **Recomendação de ordem: não faça PIX no trimestre.** Faça o anual funcionar no que já existe, meça a taxa de recusa de cartão por dois meses, e só então decida se a dor justifica o segundo stack. Se justificar, considere **abandonar o RevenueCat e ir direto no gateway nacional** em vez de manter os dois.

**d) MEI/CNPJ e nota fiscal.** Cobrar assinatura recorrente de brasileiros exige CNPJ (MEI ou ME), emissão de nota e ISS. **Abra o MEI antes do primeiro cliente pagante** — é barato, rápido, e é o contratante que precisa constar nos Termos. **O gateway não emite a nota por você.**

### 8.6 Cancelamento, reembolso e dunning — e três bugs no webhook

A v1 prometia "cancelamento em 2 cliques" e não dizia o que acontece depois.

**O que precisa estar escrito:**
1. **CDC art. 49 — 7 dias de arrependimento** em compra online, com devolução integral. Vale para mensal, anual **e Vitalício**. Precisa estar nos Termos e ser honrado sem discussão.
2. **Política além disso:** pró-rata no anual até 30 dias, discricionário depois. É mais barato que chargeback, sempre.
3. **Cancelamento em 2 cliques dentro do app**, dito na landing. Fricção de cancelamento gera chargeback e Reclame Aqui, o que é fatal para produto pequeno.

**Três problemas no `src/app/api/webhooks/revenuecat/route.ts`:**
- **`REFUND` não é tratado.** Um usuário reembolsado mantém o acesso.
- **`plan: "pro"` é gravado mesmo em `EXPIRATION`.** O campo `plan` deixa de significar qualquer coisa; só `subscription_status` carrega verdade. Ou grave `plan: null` no expiro, ou pare de usar `plan` para decidir e use só `status` + `expires_at`.
- **`BILLING_ISSUE` vira `grace` e ninguém avisa o usuário.** Não há e-mail nem tela dizendo que o cartão falhou — e falha de cobrança é tipicamente 20–30% do churn no Brasil. **Dunning:** e-mail no dia da falha, banner no app no dia 2, e-mail no dia 5, downgrade no dia 7. **P (3h)** com o e-mail já pronto.

### 8.7 Downgrade — a regra que evita a raiva

Com freemium, todo assinante que cai para o grátis encontra um estado indefinido: histórico >14 dias, 2º e 3º boss, cenários comprados, escudos estocados. Não decidir isso é decidir mal.

**A regra, escrita — e mostrada ANTES de cancelar, porque é a melhor copy da tela de cancelamento:**
- **Cosmético conquistado ou comprado é para sempre.** Moldura, título, selo, skin — nada é confiscado.
- **Dado nunca é apagado, só fica oculto** — e volta inteiro se reassinar. "Seus 8 meses de histórico continuam aqui, guardados."
- **Bosses extras congelam** com o HP onde está; não perdem progresso.
- **Escudos estocados acima de 2 ficam guardados**, não são queimados.
- **Cenários de Pro voltam ao padrão**, mas a escolha é lembrada.

> Nada que o usuário conquistou com trabalho é confiscado. Só o que é conveniência de assinatura pausa.

### 8.8 O Vitalício precisa de cláusula de continuidade

Dev solo vendendo "vitalício" cria obrigação indefinida. Se o produto fechar em 18 meses, são 300 pessoas com razão — e nenhuma defesa.

**Nos Termos, escrito antes de vender a primeira unidade:**
- **O que "vitalício" significa:** acesso completo pela **vida útil do serviço**, não pela vida do comprador.
- **Compromisso mínimo declarado:** ex. "o serviço será mantido por no mínimo 24 meses a partir da compra".
- **Plano de saída:** exportação de dados garantida em qualquer cenário (§2.10). Opcional e forte: crédito ou reembolso pró-rata se o serviço encerrar antes do prazo mínimo.

Dizer isso não reduz vendas. **Dizer isso é o que faz alguém confiar R$ 297 num app de uma pessoa.**

### 8.9 Migração da economia — ninguém pode se sentir passado para trás

Duas mudanças deste documento mexem em coisa que o usuário considera dele.

**a) A loja física acaba e o cristal vira Moeda.**
- Aviso de **30 dias**, no app e por e-mail.
- **Todos os resgates pendentes são honrados**, mesmo que dê prejuízo. É o custo de reputação mais barato que existe.
- **Conversão anunciada e generosa:** 1 cristal = 100 Moedas, com o saldo já convertido visível antes da mudança.
- E-mail explicando o porquê, em primeira pessoa. *"Eu não consigo despachar camisetas e construir o app ao mesmo tempo. Escolhi o app."*

**b) A curva de XP muda e todo mundo sobe de nível no deploy.**
Sem a tela de "sua jornada foi rebalanceada" (§5.2), isso parece bug e gera ticket. Com ela, parece presente. É a mesma mudança, com resultado emocional oposto.

**O que fica do físico:** **um único prêmio raro**, e **não como SKU na loja** — a v1 mantinha "pôster, 1.500 moedas, 10/mês, print-on-demand, 45 dias", o que ainda traz CPF, endereço, nota, fornecedor e fila de suporte. **Decisão corrigida:** um prêmio despachado à mão **5×/ano**, para o top do ranking anual ou vencedores de eventos, anunciado como gesto e não como catálogo. Custo previsível, logística de cinco envios, e o efeito de marca é o mesmo ou maior.

### 8.10 O que custa servir 10.000 usuários grátis

A v1 decidiu freemium com meta de 10.000 usuários grátis e nunca calculou o que custa. Números aproximados — **confirme os preços atuais antes de comprometer**:

| Item | Custo mensal | Nota |
|---|---:|---|
| Supabase Pro | ~US$ 25 | O plano gratuito **pausa por inatividade** e tem tetos de DB/Storage/MAU que o freemium do §8.3 estoura |
| Vercel Pro | ~US$ 20 | Uso comercial não é permitido no Hobby |
| RevenueCat | US$ 0 até um piso de receita | depois, % sobre o faturado |
| Resend | US$ 0 até 3.000 e-mails/mês | a sequência do §6.4 cabe por um bom tempo |
| PostHog | US$ 0 até 1M eventos/mês | cabe folgado |
| Domínio | ~R$ 4 | — |
| **Piso** | **~US$ 47 ≈ R$ 260/mês** | |

**Break-even:** ~**18 assinantes mensais** ou ~**30 assinantes anuais** (líquido de taxas). Esse é o número que importa nos primeiros 90 dias — não os R$ 5.000 de MRR.

**Custo marginal do usuário grátis:** próximo de zero em compute; **não** em Storage. Conta que precisa estar na cabeça:
> 1.000 usuários × 1 story/dia × ~300 KB = **300 MB/dia = 9 GB/mês, cumulativo.**

**Política de retenção de mídia, obrigatória:** story de 24h tem o **arquivo apagado** quando expira. O GC já está escrito em `2026-stories.sql:423-453` e **não está agendado** (§2.7). Agendar é 30 minutos e é a diferença entre um custo estável e uma conta que só cresce.

### 8.11 Métricas — e como decidir com elas

**Instale PostHog na primeira semana**, em modo cookieless, com `identify` (id, plano, nível, classe, dias desde o cadastro — **nunca** texto de missão, §2.10). Sem `identify`, nada abaixo é consultável.

**Eventos mínimos (10):** `signup`, `onboarding_class`, `onboarding_first_complete`, `first_mission_created`, `first_mission_completed`, `friend_added`, `paywall_view`, `checkout_start`, `purchase`, `day2_return`.

| # | Métrica | Definição | Meta 90 dias |
|---|---|---|---|
| 1 | **Ativação 24h** | % de cadastros que completam ≥1 missão em 24h | **≥ 60%** |
| 2 | **Retenção D7 comportamental** | % que completam missão em ≥3 dias distintos nos 7 primeiros | **≥ 25%** |
| 3 | **Stickiness (WAU/MAU)** | ≥1 missão na semana / no mês | **≥ 40%** |
| 4 | **Conversão grátis→pago (D30)** | % com assinatura ativa em 30 dias | **3–5%** |
| 5 | **Churn mensal de pagantes** | cancelamentos + falhas / ativos no início do mês | **< 10%/mês** |

**Coorte, não agregado — o que a v1 não tinha.** Unidade = **semana de cadastro**. Curva D1/D7/D30 por coorte. E três cortes que decidem o roadmap inteiro:

1. **Retenção com vs. sem ≥1 amigo** — é a prova ou a refutação da tese do fosso social. Se a diferença for pequena, metade do §7 muda de prioridade.
2. **Com vs. sem missão concluída no onboarding** — valida a Aposta 2.
3. **Por classe escolhida** — se uma classe retém muito melhor, isso é direção de marketing de graça.

**Defina "ativo" como ≥1 missão concluída, nunca login.** E ignore número de cadastros — é vaidade.

**Teste A/B: não neste trimestre.** Com ~2.000 cadastros não há poder estatístico para testar conversão; um "teste" nesse volume produz ruído com aparência de decisão. Use **mudanças sequenciais lidas por coorte semanal** + **feature flags** (PostHog, grátis) para poder reverter em minutos. Quando houver volume, vale testar: momento do paywall, âncora de preço, assunto e horário do e-mail. **Exceção permanente: preço nunca em A/B visível** — clientes conversam entre si, e descobrir que o vizinho paga menos é dano de marca.

---

## 9. Roteiro

**Premissa declarada:** ~15h/semana, que é o que o histórico do repositório sustenta (§1.4). Os totais são horas de trabalho, e a coluna de calendário assume esse ritmo.

### Onda 0 — Bloqueadores (≈10h · 1 semana)
*Nenhuma feature. Nada abaixo pode começar antes disto.*

| Item | Esforço |
|---|---|
| `revoke update` + `grant update` por coluna em `profiles` | P (30min) |
| `drop policy` insert/delete de `xp_events` + `revoke` + `git rm` do `logXpEvent` morto | P (15min) |
| Trigger que amarra `missions.xp` à dificuldade | P (30min) |
| Preço de resgate lido do banco (`store_products`) | P (1h) |
| Clamp de data no `complete_mission_atomic` | P (30min) |
| Versionar `public/bosses/fundo*.png` (recomprimidos) | P (45min) |
| Colunas de assinatura + `is_pro()` + webhook tratando `REFUND`/`EXPIRATION` | M (6h) |
| `mission_completions` FK → `set null` + `revoke delete` + reset via RPC | P (3h) |
| `pg_dump` semanal + **restauração testada** | P (2h) |
| Agendar o GC de stories no pg_cron (já escrito, nunca ligado) | P (30min) |

### Onda 1 — Ver, medir e parar de vazar (≈56h · 4 semanas)
*Ainda quase nenhuma feature. É a onda que torna todas as outras mensuráveis.*

| Item | Esforço |
|---|---|
| **PostHog cookieless + `identify` + 10 eventos** ← *antes da curva, sempre* | P (6h) |
| **Resend + SPF/DKIM/DMARC + SMTP do Supabase Auth** | P (3h) |
| **Google OAuth** | P (3h) |
| `metadataBase` + OG/twitter + favicon + `apple-touch-icon` + `robots.ts` + `sitemap.ts` | P (3h) |
| Landing: consertar "Ver demonstração", vídeo de 8s no hero, copy de preço nova | M (6h) |
| **Package anual no RevenueCat** + comunicação do aumento + grandfathering | M (6h) |
| Passe visual: `inset`+borda, `.num`, grain, `object-contain`+`pixelated`, tirar blur, `mt-8`, `MotionConfig`, matar `transition-all`, `focus-visible`, `aria-live`, `git rm LevelUpToast` | M (8h) |
| **Curva nova** + `curve_version` + tela de rebalanceamento + `update profiles` | M (12h) |
| **Escudo de streak + Modo Descanso + a tela do dia da quebra** | M (9h) |
| **Dano de boss 1/2/3 + cap de dano diário** (ALTER de constraint) | P (3h) |
| `npm rm @clerk/*` + `middleware.example.ts` | P (5min) |

**Resultado:** produto seguro, funil medido, e-mail que chega, cadastro com um clique, link que aparece no WhatsApp, progressão que entrega recompensa no dia 1, streak que perdoa, anual comprável.

### Onda 2 — Abrir e ativar (≈208h · 14 semanas)
*Aqui é onde os 90 dias acabam, na metade desta onda.*

| # | Item | Esforço | Depende de |
|---|---|---|---|
| 1 | Migrar `alarms` + `focus_sessions` + `notifications` + `tickets` para Supabase | G (25h) | Onda 0 |
| 2 | **Enforcement de plano em RLS/RPC** para os 6 limites do §8.4 | G (16h) | #1, Onda 0 |
| 3 | **Remover o `AccessGuard`** e trocar por gates de feature | M (6h) | **#2** |
| 4 | **Onboarding Ato 3** (primeira conclusão em <90s) + convite de amigo | M (10h) | **#3** |
| 5 | Aceite ≠ recompensa + som Web Audio + `ProgressBar variant="hud"` | M (14h) | — |
| 6 | **Teto suave** (`daily_gross_xp` + backfill + lockstep TS/SQL) | G (28h) | Onda 0 |
| 7 | **Tesouro do boss v1** (troféu + título + selo + poção) — **sem XP, sem moeda** | M (12h) | **#6** |
| 8 | **Cartão de Conquista** via `next/og` | G (28h) | — |
| 9 | Ranking semanal como padrão (global) + contrato semanal | G (24h) | — |
| 10 | Exclusão de conta de verdade + exportação de dados + suporte que sai do navegador | G (24h) | #1 |
| 11 | Termos + Política LGPD completa + `/precos` + política de conteúdo | M (12h) | — |
| 12 | **Kit de moderação completo** (denúncia, bloqueio, fila, blocklist, retenção) | G (26h) | **antes de #3** |
| 13 | Sequência de e-mail D0–D7 | M (12h) | Onda 1 |
| 14 | Manifest + ícones + prompt de instalação PWA | P (6h) | Onda 1 |
| 15 | Direção de arte Tier A — **metade de código** | M (14h) | — |
| 16 | Direção de arte Tier A — **metade de arte** (sigilos, ícones) | G (30h) | — |
| 17 | Recrutar 20 beta testers com Vitalício em troca de depoimento com rosto | — | #3 |

⚠️ **Duas ordens que a v1 invertia e que estão corrigidas acima:** #6 vem antes de #7 (o tesouro não pode injetar recompensa num teto que você ainda não redesenhou), e #12 vem antes de #3 (não abra um produto social sem o kit de moderação pronto).

### Onda 3 — Economia, hábito e recorrência (≈200h+ · trimestre seguinte)

1. **Moedas de Guilda** completas: conversão do saldo de cristais, torneiras, catálogo server-side, `<Decoration>` dirigido por dado com **5 itens**. **G (32h).**
2. **Tesouro v2** — baú 1-de-3. **M (10h).** 🚧 depende de 1.
3. **Multiplicador de streak sobre Moedas.** **M (8h).** 🚧 depende de 1.
4. **8 conquistas server-side** (não 40). **M (14h).**
5. **Quests diárias materializadas** por RPC idempotente com pool filtrado + reroll pago + baú por turno. **G (28h).**
6. **Perfil público `/u/nickname` com opt-in.** **G (20h).**
7. **Party de 2–5 amigos (só soma) + streak de dupla + nudge do amigo.** **G (32h).** 🚧 depende de `notifications`.
8. **Recap semanal** por e-mail via pg_cron. **M (14h).**
9. **O usuário que volta** — "Semana nova", win-back D7/D30/D90, oferta separada para assinante expirado. **M (12h).**
10. **Paywall contextual** nos três momentos de desejo. **M (10h).**
11. **Lançamento do Vitalício "Sócio Fundador"**, com a cláusula do §8.8 escrita. **M (8h).**
12. **Personagem que reage ao dia** (versão barata). **G (20h).**
13. Service worker + push (Android e desktop; iOS como bônus). **G (24h).**
14. Onboarding Atos 1 e 2. **G (18h).**

### O que os 90 dias realmente comportam

**Onda 0 + Onda 1 + itens 1–8, 11, 12 e 14 da Onda 2** ≈ 66h + 160h ≈ **226h ≈ 15 semanas a 15h/semana.** Já estoura um pouco; se a semana render 20h, fecha.

**Meta de saída dos 90 dias, refeita:**
- Produto **aberto** (freemium com enforcement real) e **medido** (PostHog com coortes)
- **500–900 cadastros** — não 2.000, a menos que um canal de vídeo pegue
- Ativação 24h **≥ 55%**, D7 comportamental **≥ 20%**
- **Break-even coberto:** ~30 assinantes anuais ou equivalente (~R$ 300 de MRR)
- E a resposta para a pergunta que decide o ano seguinte: **quem tem amigo retém mais?**

**Meta de R$ 1.000–1.500 de MRR: fica para os 180 dias.** Prometer isso em 90 era o único número da v1 que dependia de as três ondas caberem no trimestre — e elas não cabem.

---

## 10. O que NÃO fazer

**Armadilhas de produto**
- **Não reative `INACTIVITY_LOSS_ENABLED`.** Uma semana de férias apagando um nível inteiro é máquina de churn.
- **Não faça ligas com rebaixamento.** Em app de tarefas, quem tem filho e dois empregos sempre perde: punição por circunstância.
- **Não faça dano coletivo na party.** Ser punido pela falha do amigo gera culpa e abandono em cadeia. **Só somar.**
- **Não penalize retroativamente.** (O Karma do Todoist perde ponto por atraso de 5+ dias, e é a parte mais odiada do sistema.)
- **Não crie mecânica que expire antes da meia-noite.** Timer de coleta, "volte em 4h", energia que regenera, expedição de 8h — tudo isso é extração de atenção, e você vende o oposto.
- **Não deixe o tesouro do boss pagar XP.** XP fora do teto é a única recompensa capaz de contaminar o ranking, que é o fosso.
- **Não venda o mesmo item duas vezes.** Um cosmético é perk de assinatura **ou** sumidouro de economia. Nunca os dois.
- **Não multiplique XP por streak.** Vira ranking de streak. Multiplique Moedas.

**Over-engineering**
- **Guildas/clãs.** Exigem chat (moderação, denúncia, LGPD, matchmaking) e sofrem do problema da guilda vazia com base pequena. A Party entrega 80% do valor por 25% do custo.
- **Equipamentos com atributos.** "+5 de Força" não significa nada sem combate.
- **Pets em escala** (5 pets × 5 tiers). Se fizer, **um** pet, 3 estágios, e o valor está na ração, não no bicho.
- **Temporadas/passe.** Contrato de conteúdo recorrente para sempre, e você já assinou um (§5.9).
- **40 conquistas com cálculo no cliente.** São 40 regras duplicadas que toda mecânica nova obriga a revisitar. Oito, server-side.
- **20 cosméticos sem componente único.** 7 pontos de renderização por item × 20 itens = 140 pontos de manutenção para uma pessoa.
- **Reescrever o sistema de conclusão para ser otimista.** A invariante está certa e documentada. Separe aceite de recompensa.
- **App nativo.** PWA cobre Chrome, Android e iOS instalado. Não abra essa frente.
- **PIX neste trimestre.** É um segundo stack de pagamento (§8.5), e o item com maior chance de corromper estado de assinatura.
- **GitHub Actions como cron.** Atrasa 10–30 min e desliga sozinho após 60 dias sem commits (§2.7). Use pg_cron.
- **Web Push antes do manifest.** Sem instalação de PWA, push no iOS é impossível — e sem iOS o canal cobre metade do público brasileiro.

**Ideias tentadoras que não pagam**
- **Mais arte de personagem antes de mostrar a que já existe.** Você tem 4 tiers em 100 níveis. Variante cromática por `filter` e molduras CSS entregam "skin nova" com custo zero de ilustração.
- **Bento grid no dashboard.** Funciona em landing; em dashboard denso o padrão assimétrico briga com o escaneamento uniforme.
- **Mais gráficos.** A tendência é o contrário: chrome silencioso, tabelas boas, gráfico como resumo.
- **Glassmorphism em tudo.** Vidro só em modal, sheet e elemento flutuante.
- **`pixelated` em tamanho arbitrário.** 800/5 = 160px fica cristalino; 176px fica sujo. Divisores inteiros ou nada.
- **Compra única como modelo.** O Forest, o caso mais famoso de que funciona, migrou para assinatura. O Vitalício aqui é evento de caixa limitado, não modelo.
- **Mídia paga antes de CAC orgânico conhecido.**
- **Catálogo de produtos físicos.** É passivo, não ativo (§8.9).
- **Teste A/B de conversão com 2.000 cadastros.** É ruído com aparência de decisão.
- **Prometer suporte 24h.** Diga "respondo em até 48h úteis" e cumpra. Status/changelog público resolve mais que SLA agressivo.

**Sobre o dev sumir por duas semanas**
Vender anual e vitalício de um produto de uma pessoa exige dizer o que acontece quando essa pessoa some. **Página de status/changelog pública, SLA honesto de 48h úteis, e um aviso de férias antecipado.** Isso não afasta cliente — a alternativa (silêncio) afasta.

---

## Apêndice A — Lições da concorrência

| Produto | Lição | O que fazer no lvl2do |
|---|---|---|
| **Habitica** (grátis, base enorme) | Assinante compra moeda premium com moeda de jogo, com **teto que cresce por mês de assinatura contínua** — cancelar é perder a escada. | Teto de Moedas bônus crescente. **M, alto.** |
| **Habitica** | Cosmético mensal exclusivo de assinante, **sem stats**. | O único contrato de conteúdo recorrente que você assina (§5.9). |
| **Habitica** | Dano coletivo (você toma dano pela falha do amigo) gera culpa e abandono em cadeia. | Party que **só soma**. |
| **Habitica** | Sobrecarga cognitiva e UI de fórum afastam justamente o público TDAH. E remover Guilds/Tavern queimou 10 anos de comunidade. | Não adicione stats/equipamento. E **nunca remova feature social**. |
| **Finch** (bootstrapped, público majoritariamente feminino 25–35) | O vínculo não vem da progressão de longo prazo, vem da **reação de curto prazo**: você faz pelo bichinho. | Personagem com poses ligadas ao estado do dia (§5.10). |
| **Finch** | Soft paywall: ferramentas inteiras grátis, o pago vende roupinha e som. | Aposta 1 + §8.4. |
| **Finch** | A arte de marketing deve liderar com Bruxa/Arqueira, não com o Guerreiro. | **P, médio.** |
| **Duolingo** | Streak Freeze é **distribuído antes da necessidade e aplicado em silêncio** — essa arquitetura é o que faz funcionar. | Escudo ganho no jogo, consumo automático. **P, alto — o melhor custo/benefício do documento.** |
| **Duolingo** | Earn Back: janela curta para restaurar o streak quebrado. | Janela de recuperação de 24h (§5.4). |
| **Duolingo** | Friend Streaks movem retenção de forma mensurável, e o nudge chega **como do amigo, não do app**. | Streak de dupla + nudge. 🚧 depende de `notifications`. |
| **Duolingo** | **Uma única animação nova** em momento certo move retenção. Card de milestone multiplica share orgânico. | Celebração só em marcos (§4.3) + Cartão (§7.1). |
| **Duolingo** | Baús Early Bird / Night Owl forçam duas sessões sem push. | Baú por turno — **mas sem expirar por turno** (§5.8, invariante 3). |
| **Duolingo (o erro)** | Trocar corações por Energy: o paywall virou o ritmo de uso. Conversão subiu, marca queimou — trade que só fecha com colchão gigante de MAU. | **Seu portão de cristal é esse padrão, sem colchão nenhum.** Aposta 1. |
| **Forest** | O caso mais famoso de "compra única funciona" migrou para assinatura. | Compra única não é modelo; o Vitalício é evento de caixa. |
| **Forest** | Árvores reais com **teto por conta**, pagas do faturamento: gesto raro, custo previsível. | Um prêmio despachado à mão 5×/ano (§8.9), não um SKU. |
| **Forest** | "Sua floresta" mostra o acúmulo visual do trabalho feito. | Cenário pixel que se **povoa** com as sessões de foco — mais forte que qualquer chart. **M.** |
| **Todoist Karma** | Vacation Mode e Days Off numa ferramenta séria; e o Karma pode ser **desligado por inteiro**. | Modo Descanso (§5.4) + Modo Sóbrio (§5.8). **P, alto.** |
| **Todoist Karma (a crítica)** | "Recompensa conclusão independentemente da importância." | Mitigado pelas 3 dificuldades + dano de boss 1/2/3. |
| **Notion** | Sem gamificação nativa; a comunidade constrói XP na mão com templates. | Existe demanda real e não atendida por jogo dentro de ferramenta séria. |
| **Benchmarks de assinatura** | Hard paywall converte muito mais no curto prazo, mas a **retenção de assinante em 1 ano é praticamente idêntica**, e a LatAm converte tarde (semana 6+). | Freemium é a escolha certa **para um produto social**: troca-se conversão por população, e população *é* o produto. |
| **Benchmarks** | LatAm tem alta mediana de crescimento de MRR, e preço localizado converte muito mais que default em USD. | Preço em BRL, âncora abaixo do Super Duolingo, **parcelamento** (§8.5). |
| **Tendências de UI** | Dark-first é padrão; **vidro só em elementos focais**; chrome silencioso; performance tratada como design. | §3. E: **a pixel art deve ser o único elemento "alto" da tela** — se os cards também brilham e blurram, a arte compete com o cromo. |

---

## Apêndice B — Se você só tiver uma tarde, ou uma semana

**Uma tarde (≈4h) — e agora ela é sobre segurança, não sobre luz:**
1. `revoke update` + `grant update` por coluna em `profiles` (30min) — fecha o furo que anula todo o resto
2. `drop policy` insert/delete de `xp_events` + `revoke` (15min) — fecha o ranking anual
3. Clamp de data no `complete_mission_atomic` (30min)
4. Trigger que amarra `missions.xp` à dificuldade (30min)
5. `git add public/bosses/fundo*.png` (5min) — o deploy limpo está quebrado
6. `inset 0 1px 0 rgba(255,255,255,.09)` + borda não-uniforme no `.card-surface` (45min)
7. `.num` em todos os contadores (1h)
8. `object-contain object-bottom` + frame em 160px no `CharacterFrame` (45min)

Quatro horas e meia. O produto fica **seguro**, o deploy volta a funcionar, os números param de tremer, o personagem para de ser cortado, e a tela ganha luz vindo de um lugar só.

**Uma semana (≈15h):** as oito acima + `<MotionConfig reducedMotion="user">` + matar `transition-all` + `git rm LevelUpToast.tsx` + preço de resgate no servidor + colunas de assinatura com o webhook funcionando + `pg_dump` com restauração testada + agendar o GC de stories.

**Duas semanas (≈30h):** o acima + PostHog + Resend com DKIM + Google OAuth + OG/favicon/robots. É o menor conjunto que faz o lvl2do sair de "protótipo bonito" para "produto que dá para lançar e medir".

---

## Descartado

Crítica que foi avaliada e **não** incorporada, com o motivo em uma linha.

- **"Ranking público indexável para SEO"** — valor de busca perto de zero para uma lista de apelidos, e custo alto de moderação, LGPD de menores e blocklist; `/u/nickname` com opt-in entrega o mesmo canal sem o passivo.
- **"O flash branco de 1 frame é risco fotossensível"** — o critério do WCAG é três flashes por segundo; um flash único de área pequena não é gatilho. A mitigação (`prefers-reduced-motion` + toggle) foi adotada mesmo assim porque custa dez minutos, mas não pelo motivo alegado.
- **"Sigilos e ícones pixel violam a regra de não produzir arte nova"** — a regra é sobre arte de personagem 800×800 em tiers, não sobre 8 sprites de 16×16; o que foi aceito é que essas horas são de ilustração e precisam ser orçadas como tal.
- **"Extrair todas as strings para um módulo de i18n desde já"** — trabalho especulativo sem segundo idioma no horizonte de 12 meses; **aceito só o pedaço procedente:** guardar o fuso do usuário no perfil em vez de fixar `America/Sao_Paulo` no SQL, porque brasileiro morando fora já quebra hoje.
- **"Registrar a marca no INPI agora"** — custo e anos de processo antes da primeira receita; **aceito o que é urgente e barato:** registrar o domínio e reservar os handles (@lvl2do no Instagram/TikTok/X/YouTube) esta semana, INPI quando houver faturamento recorrente.
- **"Banner de consentimento de cookies"** — PostHog em modo cookieless com IP anonimizado e opt-out no perfil dispensa o banner; ele volta a ser obrigatório no dia em que existir cookie de terceiro ou remarketing.
- **"TWA na Play Store em ~1 dia"** — a ideia é boa (é o único canal de descoberta que a web pura perde), mas 1 dia ignora chave de assinatura, conta de desenvolvedor, asset links, ficha de loja, política de privacidade e revisão; realista é **M/G**, e fica para depois do PWA.
- **"Nunca faça A/B"** — o absoluto não se sustenta; o que vale é "não neste trimestre, por falta de poder estatístico", com a exceção permanente de preço.
- **"O story de 24h precisa de política de retenção de mídia"** — procedente no efeito, impreciso na causa: a política **já está escrita** em `2026-stories.sql:423-453`; o que falta é agendá-la (§2.7), o que é 30 minutos, não um projeto.
- **"Duas moedas com o cristal lastreado no físico"** (proposta da própria v1) — descartada por contradizer três outras decisões do mesmo documento; substituída por uma moeda só (§5.6).
- **"Expedição de 8h do personagem"** (proposta da própria v1) — descartada por ser timer de coleta com nome bonito, violando a invariante que o próprio documento defende.
- **"~10 assinantes anuais pagam a conta"** — a conta correta é ~30 anuais ou ~18 mensais (§8.10); o número foi corrigido, não descartado.