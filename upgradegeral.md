# upgradegeral.md — plano de elevação do lvl2do

Síntese de cinco auditorias (direção de arte, movimento, game design, monetização,
concorrência) em um único plano de execução. Nada aqui propõe reconstruir o que já
existe — tudo é sobre **elevar** o que está no repositório hoje.

**Convenção de esforço:**
`P` = até 4h · `M` = 4–16h (1–2 dias) · `G` = mais de 16h (3+ dias)
**Impacto:** baixo / médio / alto — medido em *sensação do usuário* ou *receita*.

---

## 1. Resumo executivo — as 5 apostas que mais mudam o jogo

Em ordem. Se só der para fazer as três primeiras, faça as três primeiras.

### Aposta 1 — Abrir o produto (matar o paywall total e o portão de cristal)
**O que é:** `canAccessApp()` em `src/lib/access/accessRules.ts` retorna false sem
assinatura/cristal/dev, e `src/components/AccessGuard.tsx` joga tudo para `/paywall`.
Ou seja: ranking, stories, amigos e boss existem dentro de um estádio vazio. Além disso o
"cristal do dia" chama a RPC `consume_daily_crystal`, que **não existe em nenhum arquivo de
`supabase/`** — em produção falha silenciosamente.
**Por que importa:** o único fosso defensável do lvl2do é o grafo social em português
(amigos + ranking + stories). Paywall total destrói o fosso para proteger uma receita que
ainda não existe. E o portão diário de cristal é, mecanicamente, o sistema de Energy do
Duolingo — que queimou marca lá com 133M de MAU de colchão, e aqui não há colchão nenhum.
**Esforço:** M (12–16h: trocar gate por rota → gate por feature, remover a RPC fantasma do
caminho de acesso, ajustar `useAccessGate.ts`).
**Impacto:** alto (receita + rede).

### Aposta 2 — O primeiro XP acontece dentro do onboarding
**O que é:** hoje o "aha" (concluir missão → barra encher → personagem reagir) acontece
*depois do cartão de crédito*. `src/components/PreconfiguredMissions.tsx` já existe: use-o
para pré-criar 3 missões e **forçar a conclusão de uma ali mesmo**, com celebração em tela.
**Por que importa:** é simultaneamente a maior alavanca de ativação (métrica nº1) e o maior
ganho estético do produto. O usuário sai do onboarding tendo *sentido* o loop.
**Esforço:** M (8h para o ato de conclusão; G se fizer os três atos do §4.4).
**Impacto:** alto.

### Aposta 3 — Consertar a progressão: curva, teto suave, tesouro do boss
**O que é:** com a curva atual de `src/lib/xp-system.ts`, o usuário **médio leva 60 dias**
para ver a segunda arte do personagem e o usuário **perfeito leva 24**. O teto duro de 300
XP/dia faz cada missão extra valer **zero**. E `collect_boss_treasure` tem literalmente
`-- >>> RECOMPENSA ENTRA AQUI` sem nada dentro.
**Por que importa:** o melhor ativo do produto (pixel art) aparece 4 vezes em 100 níveis, e
o botão mais celebrativo do app não entrega nada.
**Esforço:** G (curva P/1 dia — nível é derivado de `totalXp`, **zero migração**; teto suave
M; tesouro G/2–3 dias).
**Impacto:** alto.

### Aposta 4 — A camada de luz: `inset` superior, `.num`, grain, WebP
**O que é:** quatro mudanças de CSS/classe que somam ~3h e mudam a categoria percebida do
produto. Detalhadas no §3.
**Por que importa:** o lvl2do não parece barato — parece *plano*. Uma sombra só, uma borda
só, números que tremem, e 13 MB de PNG em `public/bosses/`. Nenhuma dessas coisas é design;
são detalhes de acabamento que separam "projeto pessoal" de "produto pago".
**Esforço:** P (3–4h no total).
**Impacto:** alto.

### Aposta 5 — Escudo de streak + Modo Descanso + card compartilhável
**O que é:** três mecânicas pequenas de retenção/aquisição. Escudo distribuído **antes** da
necessidade e aplicado em silêncio (Duolingo). Modo Descanso declarado (Todoist Vacation
Mode). Card de marco 1080×1350 gerado no cliente e compartilhado via `navigator.share`.
**Por que importa:** o escudo é o item de maior razão impacto/esforço de todo o relatório de
concorrência. O card é o único canal de aquisição de custo zero que a pixel art destrava.
**Esforço:** escudo P (4h) · Modo Descanso P (3h) · card G (16h).
**Impacto:** alto.

---

## 2. O que o lvl2do já tem de raro

Antes de mudar qualquer coisa, o inventário do que **não** deve ser tocado — e do que está
subexplorado.

| Ativo | Estado hoje | Por que é raro |
|---|---|---|
| **Pixel art 16-bit autoral** | 1,4 MB de personagens, 13 MB de bosses/cenários | Habitica é feio, Todoist não tem arte, Notion não tem jogo. Arte de verdade é o que faz alguém clicar e printar. |
| **Grafo social em PT-BR** | amigos `nickname#TAG`, stories 24h, ranking, `src/lib/db/social.ts` | **Este é o fosso.** Arte é copiável em 3 meses; a rede dos seus amigos não é. Habitica tem party, mas ninguém no Brasil tem amigos lá. |
| **Boss battle atômico e anti-abuso** | `supabase/2026-boss-battles.sql`, cap por `capped_on` (dia do servidor) | Engenharia já pronta. Falta só o design da recompensa. |
| **UI moderna de SaaS + arte de jogo** | dark-first #050509, Sora + Manrope | A combinação é a assinatura. Habitica é fórum de 2014; Finch é kawaii puro. Ninguém está no meio. |
| **Elenco de classes inclusivo** | Guerreiro, Ladrão, **Arqueira, Bruxa**, Bardo | Finch fez US$ 30M+ ARR com 75% de público feminino 25–35. A arte de marketing deveria liderar com a Bruxa/Arqueira, não com o Guerreiro. |
| **Conclusão atômica no servidor** | `complete_mission_atomic` | Invariante correta e documentada: o estado local só muda com o RETORNO do servidor. Não quebre isso por otimismo de UI (ver §4.2). |
| **Áudio sintetizado sem asset** | `src/hooks/useAlarmSound.ts` | Web Audio já provado no repo. Som de conclusão custa 0 KB e nunca é bloqueado por autoplay (é sempre gesto do usuário). |
| **Nível derivado de XP** | `calculateLevelFromXp()` | Rebalancear a curva é mudança de código pura, sem migração. Isso é sorte de arquitetura — use. |
| **`prefers-reduced-motion` respeitado** | `src/app/globals.css` | Filosofia certa. Falta só estender ao framer-motion (§4.1). |

**A leitura desconfortável:** o maior desperdício do produto não é técnico nem econômico — é
que o melhor ativo (arte) está trancado atrás de uma curva que quase ninguém percorre, e o
segundo melhor (rede social) está trancado atrás de um paywall.

---

## 3. Visual premium

### 3.1 Camadas e materialidade — a mudança de maior retorno por hora

O diagnóstico exato em `src/app/globals.css`:

```css
.card-surface { @apply rounded-2xl border border-white/[0.06] bg-ink-card/80 shadow-card backdrop-blur-sm; }
/* shadow-card = 0 8px 30px -12px rgba(0,0,0,0.6) → UMA sombra, UM blur */
```

Três problemas: sombra única (sombra real tem contato + chave + ambiente), borda uniforme de
6% (na vida real a luz vem de cima), e zero hierarquia de elevação (card, modal, dropdown e
sidebar na mesma superfície).

**A linha mais importante deste documento:**

```css
.card-surface {
  box-shadow: var(--shadow-1), inset 0 1px 0 0 rgba(255,255,255,0.09);
  border: 1px solid rgba(255,255,255,0.055);
  border-top-color: rgba(255,255,255,0.10);   /* borda não-uniforme = objeto, não desenho */
  background: linear-gradient(180deg, #0B0B13 0%, #090911 100%);
}
```

Aplicada nos ~53 usos de `.card-surface` de uma vez.
**Esforço:** P (45min). **Impacto:** alto.

Escada de elevação (tokens em `globals.css`, `--surface-0..3` + `--shadow-1..3`), com
`.card-elevated` em modais (`ModalPortal.tsx`, `PaywallModal.tsx`, `NewMissionModal.tsx`) e
`.card-overlay` em dropdown/tooltip (`SchedulePopover.tsx`, `AccountMenu.tsx`).
**Esforço:** P (1h). **Impacto:** médio-alto.

**Decisão — tirar `backdrop-blur-sm` de todos os cards.** É glassmorphism 1.0 (datado em
2026) e custa uma camada de composição por card para borrar um gradiente estático; na tela
de missões são ~12 snapshots de backdrop por quadro. Blur fica **só** onde há conteúdo real
atrás: `Sidebar.tsx` (`backdrop-blur-xl`, correto), `AppTopbar.tsx`, modais e
`StoryViewer.tsx`. **Esforço:** P (15min). **Impacto:** médio (perf mobile) + alinha com a
tendência 2026 de vidro restrito a elementos focais.

**Grain** no `body::after` (SVG `feTurbulence` inline, `opacity .035`, `mix-blend-mode:
overlay`): resolve o banding dos três `radial-gradient` gigantes do fundo — banding é muito
visível em OLED — e dá textura de material. Bônus temático: grain é o irmão analógico do
pixel. **Esforço:** P (20min). **Impacto:** médio-alto.

**Borda com gradiente** (`.border-lux`, máscara `xor`) apenas nos cards-herói:
`LevelCard.tsx`, `RankingPodium.tsx`, paywall. **Regra de disciplina: no máximo 1 por tela.**
**Esforço:** P (30min). **Impacto:** médio.

**Spotlight no hover** (`--mx/--my` via `onMouseMove` + `::before` radial) na grade de
`/missions` e nos cards de `ClassSelectGrid.tsx`. É o efeito que mais faz alguém pensar
"isso é caro". **Esforço:** P (30min). **Impacto:** médio.

### 3.2 Tipografia

**Sora está sendo desperdiçada.** Há ~30 ocorrências de `font-display text-sm`/`text-xs`. A
personalidade da Sora só aparece a partir de ~18px; abaixo disso ela é apenas *pior de ler*
que a Manrope. **Regra:** Sora só em ≥18px, ou em caixa alta com tracking largo, ou em
numeral grande. Toca `PageHeader.tsx`, `StatCard.tsx`, `LevelCard.tsx`, `MissionCard.tsx`.
**Esforço:** M (1,5h de achar/substituir). **Impacto:** médio-alto.

**Números que tremem.** Só ~20 usos de `tabular-nums`, e faltando exatamente onde importa:
`{doneToday}/{missions.length}`, `stats.totalXp`, `{streak} dias`, `{xpCurrent}/{xpToNext}`,
HP do boss, `hits/5`, timer do foco. Número de largura proporcional que muda a cada segundo
é a assinatura visual de software amador.

```css
@layer utilities {
  .num { font-variant-numeric: tabular-nums slashed-zero; font-feature-settings:"tnum" 1,"zero" 1; letter-spacing:-0.012em; }
  .num-hero { @apply font-display font-bold num; }
}
```
**Esforço:** P (1h). **Impacto:** alto (é a Aposta 4).

**Escala modular** em `tailwind.config.ts` (razão 1.25, corpo a **15px** e não 14 — 14 é o
default de todo mundo), com **tracking negativo crescendo com o tamanho**: `-0.032em` em
44px. 44px com tracking 0 parece Word; com −0.032em parece Linear.
**Esforço:** M (4h com a varredura). **Impacto:** médio-alto.

Ganhos baratos: `text-balance` em h1/h2 (`PageHeader.tsx`), `text-pretty` em parágrafos,
`max-w-[62ch]` em texto corrido. **Decisão: `.eyebrow` deixa de ser pill roxo e vira texto**
(`uppercase`, tracking 0.14em, `text-brand-light/70`) — o pill fica reservado para badges de
estado (`CategoryBadge.tsx`), onde ele significa algo.

### 3.3 Cor

**O ativo escondido:** já existe um sistema de cor por categoria e ele está preso dentro de
um pill de 22px em `CategoryBadge.tsx` (Profissional→sky, Pessoal→pink, Saúde→emerald).

**A regra, decidida:**
> **Roxo = sistema. Cor da categoria = conteúdo do usuário. Âmbar = recompensa.**

Roxo fica em nav ativa, botão primário, barra de XP, anel de story, foco. Nunca em conteúdo.
Cor da categoria passa a tingir: coluna da `/missions`, vinheta da arena do boss, série do
`XpAreaChart.tsx`, e um **trilho de 2px na borda esquerda do `MissionCard.tsx`**
(`absolute left-0 inset-y-4 w-[2px] rounded-full`) — dá cor à grade *e* permite identificar
categoria sem ler o badge. **Esforço:** M (2h). **Impacto:** médio-alto.

**O âmbar que falta.** Hoje XP é roxo, nível é roxo, cristal é roxo, tesouro é roxo — não há
segundo acorde. Reserve `reward: #FBBF24 / #F59E0B` **exclusivamente** para: level-up,
coleta de tesouro, cristais, marco de streak (7/30/100) e 1º lugar do pódio. Escassez é o que
faz funcionar. **Esforço:** P (1h). **Impacto:** médio-alto.

**Semântica** (hoje `rose-400`/`amber-300` soltos pelo código): tokens `state.ok/warn/bad/info`
em `tailwind.config.ts`. E crie `--text-3: #64748B` para texto terciário em vez de diluir
`text-muted` com opacidade — `text-muted/70` (visto em `StoryComposer.tsx:214`) cai para
~3,8:1 de contraste, abaixo do mínimo.

**Nota de tendência 2026:** borda de 6% de branco é baixa demais para dark mode. Vá para
8–12% em repouso e 14–18% em hover/foco.

### 3.4 Densidade e ritmo

O sintoma: `gap-5` em quase toda página, `p-5`/`p-6` alternando sem critério, `mb-8` no
header e `mt-5` entre seções. Não há hierarquia de espaço — e isso separa premium de amador
mais do que cor ou sombra.

**A regra que muda tudo:** *espaço entre seções ≥ 1,5× o espaço dentro da seção.* Hoje é 1:1.
Trocar `mt-5` de seção por `mt-8` em dashboard, missions, progress e profile:
**P (20min), e a página inteira respira.**

| Papel | Valor | Tailwind |
|---|---|---|
| Dentro de um controle | 8 | `gap-2` |
| Rótulo → valor | 12 | `mt-3` |
| Título do card → conteúdo | 16 | `mt-4` |
| Padding de card (≥280px) | 24 | `p-6` |
| Entre cards de uma grade | 20 | `gap-5` |
| **Entre seções** | **32** | `mt-8` |
| Header → primeira seção | 40 | `mb-10` |

**Decisão de densidade por página:** Dashboard e Missions **densas** (é trabalho); Perfil,
Ranking, Foco e Onboarding **arejadas** (é recompensa/identidade) — `p-8` em Perfil/Ranking,
`p-10` no Foco. Hoje todas têm a mesma densidade, o que apaga a diferença de propósito.

Alinhamento óptico: `-ml-0.5` no ícone à esquerda em botões; `pl-2 pr-2.5` em badges com
ícone; **altura fixa vence padding** — `Button.tsx` já faz (`h-9/h-11/h-12`), os itens de
`Sidebar.tsx` não (`py-2.5` → `h-10`).

### 3.5 A assinatura: pixel art × SaaS

Este é o capítulo que diferencia o produto. E é o mais subexplorado.

**O erro mais caro do produto inteiro** está em `src/components/CharacterFrame.tsx`:

```tsx
<Image src={artSrc} fill className="relative object-cover" />
```

`object-cover` numa arte 800×800 com alfa **corta o personagem**. Sprite de RPG precisa de
chão e headroom. Correção: `object-contain object-bottom`.

E a arte é escalada com interpolação suave — você pagou por 16-bit e está exibindo 8-bit
borrado. Use `imageRendering: "pixelated"`, **mas com a ressalva técnica que decide o
tamanho**: `pixelated` é ótimo ao ampliar e traiçoeiro ao reduzir. Como a arte é 800px e o
frame exibe ~144–176px, use **divisores inteiros: 160px (800/5) ou 200px (800/4)**. Em 176px
com `pixelated` fica sujo; em 160px fica cristalino. Mesma lógica para bosses: 1254 é feio de
dividir — **reexporte os bosses em 1024×1024** e use 256/128/64.
**Esforço:** P (45min). **Impacto:** alto.

Promova a `groundShadow` que já existe dentro de `BossBattleCard.tsx` para componente
compartilhado — personagem sem sombra de contato **flutua**, e flutuar denuncia colagem.

**As sete jogadas, por retorno:**

| # | Jogada | O que é | Esforço | Impacto |
|---|---|---|---|---|
| 1 | **Cantos ornamentados** | 4 colchetes SVG nos cantos do `CharacterFrame`, grid de 3px, `shapeRendering="crispEdges"`. É *o* léxico de HUD de RPG sobre um card moderno — a tensão entre os dois vocabulários vira identidade. | M (2h) | alto |
| 2 | **Token `--px: 3px`** | 1 "pixel do jogo" = 3 CSS px. **Regra: o que é do mundo do jogo é múltiplo de `--px`, canto reto, `crispEdges`; o que é chrome de SaaS é arredondado e suave. Nunca no mesmo elemento.** Resolve 80% das decisões futuras sozinha. | P (30min) | alto (disciplina) |
| 3 | **`ProgressBar variant="hud"`** | Altura 12px, pontas retas, contorno preto 2px, highlight interno de 3px, entalhes a cada 10%. **`hud` para XP e HP do boss; a suave para métricas/%.** Duas barras = dois significados, aprendidos sem explicação. | M (6h) | alto |
| 4 | **Sigilos de classe 16×16** | 5 SVGs minúsculos (espada, adaga, arco, lua, alaúde) em `CharacterAvatar`, `RankingRow`, `StoryRing`, `FriendCard`, level-up, card compartilhável. O app inteiro passa a ser *do jogador*. | M (8h) | alto |
| 5 | **Ícones pixel de categoria** | `Briefcase`/`Sparkles`/`HeartPulse` do lucide são o elemento mais genérico do produto. Troque por 3 ícones pixel 16×16. **Divisão limpa: lucide para chrome funcional (sino, engrenagem, seta), pixel para domínio do jogo.** | M (8h) | médio-alto |
| 6 | **Atmosfera nos backdrops** | `CharacterBackdrop.tsx` é SVG bem feito e 100% estático. Tremular de tocha com keyframes **irregulares** (`0%:1, 12%:.86, 20%:1, 43%:.92, 55%:.78, 70%:1` em 2,7s — fogo não é senoidal), névoa à deriva na Floresta (28s alternate), parallax de 2–3px no `LevelCard`. ~40 linhas de CSS. | M (6h) | alto (ROI absurdo) |
| 7 | **Boss como estado vazio** | Coluna de categoria sem missão → o boss daquela categoria dessaturado e dormindo: *"O Orc dorme. Crie uma missão para atacar."* A arte já está paga. Transforma o pior momento da UI no melhor. | M (8h) | alto |

**Perf é direção de arte.** `public/bosses/` tem **13 MB** — `fundodragao.png` sozinho tem
2,7 MB, e há três desses. Uma tela que demora a pintar *parece barata*, por melhor que seja a
arte. Converta para WebP q82 (→ ~250 KB cada) e adicione ao `next.config.mjs` (que hoje só
tem `reactStrictMode`):

```js
images: { formats: ["image/avif", "image/webp"] }
```
**Esforço:** P (30min). **Impacto:** alto. É uma das maiores melhorias de qualidade percebida
da lista inteira, e mede-se em TTI — o critério de "premium" mais citado em 2026.

### 3.6 Vazio, carregamento e erro

**Matem o spinner.** `Loader2` aparece em 18 arquivos. Spinner é ausência de design: comunica
"não sei quanto falta" e não tem marca.

- **Padrão:** skeleton com o formato do card real (`bg-white/[0.045]` + `animate-shimmer`, que
  já está no `tailwind.config.ts`). Nunca skeleton genérico — o do `LevelCard` tem o quadrado
  do personagem à esquerda e três barras à direita.
- **A exceção com marca:** um **cristal pixel girando**, 8 frames, `steps(8)`. Vira o loader
  do produto.
- **Regra:** skeleton para lista/página; cristal para operação atômica (concluir missão,
  coletar tesouro).
**Esforço:** M (8h nas 4 páginas principais). **Impacto:** médio-alto.

**Vazio — uma fórmula, sempre.** Hoje é frase cinza solta ("Nenhum alarme ainda."). Fórmula:
ilustração pixel 96px → título Sora 19px → uma linha de 13px (≤62ch) → **um** botão.

| Local | Ilustração | Título | Ação |
|---|---|---|---|
| Missões da categoria | boss dormindo | "O Orc dorme" | Criar missão |
| Foco / histórico | ampulheta pixel | "Nenhuma jornada ainda" | Iniciar foco |
| Amigos | dois sigilos sem elo | "Sua guilda está vazia" | Adicionar amigo |
| Loja | baú fechado | "O mercador está a caminho" | — |
| Notificações | corvo pousado | "Nenhum recado do reino" | — |

**Erro:** escudo rachado pixel + *"Perdemos contato com o reino."* + "Tentar de novo", com o
detalhe técnico num `<details>` fechado. `BossBattleCard.tsx` já acerta isso — extraia para
um `<ErrorState>` compartilhado. **Nunca sacrifique clareza pela metáfora**: se o usuário
precisa agir (sessão expirada, pagamento), fale direto.

---

## 4. Movimento e interação

### 4.1 Correções que precisam vir antes de qualquer animação nova

| # | Problema | Onde | Correção | Esforço |
|---|---|---|---|---|
| 1 | **`transition-all` briga com o framer** | `.card-glow` (`duration-300`), `Button.tsx` (`duration-200`) | O browser re-interpola o `transform` que o framer escreve por rAF → press mole e `layout` do `MissionCard` arrastando na reordenação. Troque por `transition-colors`/`transition-[background,border]`. | P (30min) |
| 2 | **Reduced motion só cobre CSS** | `globals.css` zera animação CSS; framer continua rodando | `<MotionConfig reducedMotion="user">` em `src/app/layout.tsx`. Resolve 80% em 15 min. | P (15min) |
| 3 | **Gesto principal inacessível por teclado** | botões do `MissionCard.tsx` sem `focus-visible` | `Button.tsx` e `StoryRing.tsx` já têm anel — padronize. | P (30min) |
| 4 | **`ProgressBar` anima `width`** | `ProgressBar.tsx` | Layout por quadro. Anime `transform: scaleX()` com `transform-origin: left`. E o shimmer roda `2s infinite` **para sempre** — brilho em loop significa "carregando", o que é semanticamente errado numa barra parada. Dispare o shimmer só na mudança de valor. | P (1h) |
| 5 | **Caminho duplicado de level-up** | `LevelUpToast.tsx` é um mock duplicado de `XpToast.tsx` | Um caminho só. | P (1h) |
| 6 | **Comentário obsoleto** | `StreakIndicator.tsx:20` diz que streak "ainda não está implementado" | `useStreak.ts` + `current_streak`/`best_streak` existem. Apagar. | P (5min) |

**Se você só tiver uma tarde: itens 1, 2, 3, 4 e 5 = ~4 horas**, e todo movimento posterior
assenta melhor.

### 4.2 Momento-chave nº1 — concluir missão

**O achado que define o desenho:** `completeForDay` **recusa update otimista de propósito**, e
isso está documentado no código ("o estado local só muda com o RETORNO do servidor"). A
resposta certa **não** é tornar otimista — quebraria a invariante. É **separar aceite de
recompensa**:

1. **Aceite (0ms, local, sem promessa):** o toque desenha o check e afunda o card ~2px. Não
   promete XP, então não há nada para reverter se o servidor recusar.
2. **Recompensa (com o `profile` do servidor):** aí sim toca a partitura — XP subindo,
   barra HUD enchendo, pip do boss caindo, e só então o toast.

Isso é o núcleo do sistema e é o que faz a conclusão parecer sólida em vez de nervosa.
**Esforço:** M (6h). **Impacto:** alto.

**Som.** `src/hooks/useAlarmSound.ts` já sintetiza áudio em Web Audio **sem arquivo nenhum** —
o padrão está provado no repo, custa 0 KB de asset, e a conclusão é sempre gesto do usuário
(autoplay nunca bloqueia). Um "clique" de duas notas curtas na conclusão, com toggle no
`SettingsModal.tsx`, desligado por padrão. **Esforço:** P (3h). **Impacto:** médio-alto.

**Tokens de movimento** (para parar de escolher número por número), em `src/lib/animations.ts`:

```
--dur-instant: 90ms    (feedback de toque)
--dur-fast:   160ms    (hover, cor)
--dur-base:   240ms    (entrada de card, layout)
--dur-slow:   420ms    (celebração)
--ease-out:   cubic-bezier(.16,1,.3,1)     — padrão de saída
--ease-inout: cubic-bezier(.65,0,.35,1)
mola de press: stiffness 420, damping 30, mass .8
```

### 4.3 Momento-chave nº2 — subir de nível

Hoje o level-up é um **toast no canto**: 40×40, troféu do lucide, texto de 14px e um emoji 🎉
que destoa de todo o resto. É a maior conquista do produto tratada como "arquivo salvo".

**Nível 1 — takeover de tela (M/G, ~16h, impacto alto):**
1. Tela escurece para `rgba(5,5,9,0.88)` com blur 8px.
2. A arte **voa do `LevelCard` para o centro** via `layoutId` do framer-motion, escalando 3×.
3. Flash branco de 1 frame + estrela pixel de 8 pontas expandindo (scale 0→3, 500ms).
4. O número do nível **rola** de 24 para 25, `.num-hero` em âmbar — tabular, então não treme.
5. A barra HUD esvazia e reenche.
6. **Composição em 4:5, centralizada** — o print de tela já sai enquadrado para Instagram.
7. Botão único: **"Compartilhar conquista"**.

**Decisão: celebração dramática só em marcos.** Nível comum = celebração curta (900ms).
**Tier de arte (10/25/50/100) = takeover com pixel-dissolve** na troca de skin. A Duolingo
mediu **+1,7% de retenção** com *uma* animação nova no dia 7. Se você celebra tudo, não
celebra nada.

### 4.4 Onboarding em três atos

O `/onboarding` atual mostra tudo de uma vez: logo, campos de identidade, grade de 5 classes,
confirmar. É competente e **inerte**.

- **Ato 1 (0–6s):** fundo preto, o sigilo do lvl2do se desenha (`stroke-dasharray`, 1,2s), uma
  linha em Sora 34px: *"Toda rotina é uma jornada."* Beat de 800ms. *"Escolha quem você será."*
  Sem card, sem borda. Silêncio visual antes do impacto.
- **Ato 2 (6–20s):** classe em tela cheia. Hover → a arte lv1 sobe do rodapé a 35% de opacidade
  e os orbes do fundo assumem a cor da classe. Seleção → a arte vai ao centro via `layoutId`,
  flash branco de 1 frame. **Só então** o campo de nome aparece, *embaixo do personagem*, como
  se você estivesse batizando a criatura. Hoje o nome vem antes da classe — ordem
  emocionalmente errada.
- **Ato 3 (20–30s):** `PreconfiguredMissions.tsx` com 3 missões. O usuário completa **uma ali
  mesmo**: barra HUD enche, `+10 XP` em âmbar sobe, o personagem dá um pulinho de 4 frames.

**Esforço:** G (~24h os três atos; **Ato 3 sozinho: M/8h**). **Impacto:** alto.
**Priorize o Ato 3** — é a Aposta 2.

---

## 5. Gamificação

### 5.1 Diagnóstico — o que está frágil

**a) A latência da primeira recompensa é fatal.** Curva atual de `xp-system.ts`
(800/nível até 10, 1.200 até 50, 1.600 até 100):

| Marco | XP total | Casual (60/dia) | Médio (120/dia) | Máximo (300/dia) |
|---|---:|---:|---:|---:|
| Nv 2 | 800 | 14 d | 7 d | 3 d |
| **Nv 10** (arte) | 7.200 | **120 d** | **60 d** | **24 d** |
| **Nv 25** (arte) | 25.200 | 420 d | 210 d | 84 d |
| **Nv 50** (arte) | 55.200 | 920 d | 460 d | 184 d |

O jogador *perfeito* espera 24 dias pela primeira arte nova. O casual nunca chega ao 25.

**b) Nível não entrega nada.** 96 dos 100 primeiros níveis são um número que muda e uma barra
que zera. A moeda central da progressão tem recompensa em 4% dos casos.

**c) O teto de 300 pune quem você mais quer reter.** Seis missões difíceis e acabou o dia.
Quem termina às 11h faz o resto do dia por **zero**. E não protege contra nada — criar missão
é grátis e instantâneo.

**d) A perda por inatividade é máquina de churn.** Você já intuiu isso
(`INACTIVITY_LOSS_ENABLED = false`). **Decisão: mantenha desligada, permanentemente.** Uma
semana de férias = −1.400 XP = mais de um nível apagado. Aversão à perda funciona quando
recuperar é barato (streak); quando destrói patrimônio, o usuário não volta correndo — some.

**e) Não existe meta de médio prazo.** Existe o dia (missão) e o "daqui a 3 meses" (tier de
arte). O vão entre 24h e 84 dias está vazio — e toda a literatura de retenção mora nesse vão.

**f) O streak é decorativo.** `computeNextStreak` produz dois inteiros que a UI desenha. Não
multiplica, não protege, não desbloqueia. É o gancho de retenção mais barato do mercado,
desperdiçado. E quebra de forma binária: um dia de gripe zera 90 dias.

**g) A classe é só uma skin.** Cinco classes, comportamento idêntico. Escolha que não é
escolha — e você pagou arte por ela.

**h) Incentivo invertido no boss.** O boss leva **2 de dano por conclusão,
independente da dificuldade**. Isso ensina o usuário a criar missões Fáceis.
**Decisão: dano por dificuldade — Fácil 1 / Média 2 / Difícil 4**, mantendo o cap de 5
golpes/dia. Esforço: P (1h). Conserta o incentivo e usa a diferenciação que já existe.

### 5.2 Segurança primeiro — o exploit aberto

**Item zero de toda esta seção.** Em `supabase/2026-mission-completions.sql`:

```sql
v_date date := coalesce(p_completed_for_date, (now() at time zone 'America/Sao_Paulo')::date);
```

Nada limita `v_date`, e o orçamento é apurado **por data**. Logo: **N datas distintas = N ×
300 XP**, em uma requisição por data. Pior: `v_is_today := v_old_daily_date is null or v_date
>= v_old_daily_date` trata data futura como "hoje", e a lógica de streak (`v_prev = v_date -
1`) permite **construir um streak de 365 dias em uma tarde**. O boss está protegido (cap por
`capped_on`, dia real do servidor); XP e streak não estão.

```sql
if v_date > v_real_day or v_date < v_real_day - 1 then raise exception 'invalid_date'; end if;
```
**Esforço:** P (30min). **Impacto:** alto. **Nada de ranking, economia ou monetização
significa coisa alguma antes disso.**

Três verificações que vão junto:
- **Orçamento de "ontem" dobra o teto.** `yesterdayXp` é um segundo orçamento de 300 — quem
  marca retroativamente todo dia ganha 600/dia legitimamente, pela UI. **Decisão: o orçamento
  de ontem cai para 150.**
- **Fuso do cliente.** `getLocalDateKey(new Date())` usa a data do dispositivo; adiantar o
  relógio cria orçamento novo. O clamp resolve, desde que a decisão final de data seja sempre
  do servidor.
- **Exclusão de missão.** `boss_hits` usa `ON DELETE SET NULL` justamente para que apagar a
  missão não apague o hit. **Confirme que `mission_completions` e `xp_events` têm a mesma
  proteção** — se apagar devolve orçamento sem tirar XP, o loop criar→concluir→apagar é XP
  infinito.
- **Ranking ordena por tempo do servidor** (`created_at`), nunca por `completed_for_date`.

### 5.3 A curva nova

Nível é derivado de `totalXp` → rebalancear é mudança de código pura, **zero migração**, e
todo mundo sobe no deploy (sentido como presente). **Regra de segurança: só torne a curva mais
fácil**; se um dia precisar endurecer, use `level = max(calculado, level_gravado)`.

| Faixa | Custo/nível | Acumulado |
|---|---:|---:|
| 1–4 | 120 | 480 (Nv 5) |
| 5–9 | 300 | 1.980 (Nv 10) |
| 10–24 | 600 | 10.980 (Nv 25) |
| 25–49 | 1.000 | 35.980 (Nv 50) |
| 50–99 | 1.600 | 115.980 (Nv 100) |
| 100+ | 2.400 | — |

Resultado: nível 2 **no primeiro dia**, nível 5 em 4 dias, **tier de arte 10 em 17 dias**
(era 60), 25 em 92 dias (era 210). O nível 100 continua levando mais de um ano — o prestígio
sobrevive. **Esforço:** P (1 dia contando teste). **Impacto:** alto.

**Tiers de arte intermediários sem custo de arte** (M, 2 dias, impacto alto): variantes
cromáticas via `filter` sobre o PNG em `CharacterFrame.tsx` — Nv 5 **Sombria** (dessaturada,
fria), Nv 15 **Dourada** (âmbar + brilho), Nv 35 **Espectral** (ciano + glow), Nv 75 **Rubra**.
Custo de arte: zero. Percepção: "ganhei uma skin". Some o sistema de **moldura/aura** (o
`CharacterFrame` já existe): 15–20 molduras em SVG/CSS é meio dia e vira o catálogo inteiro da
loja digital.

### 5.4 Teto suave + multiplicador de streak

Substitua o corte seco em `calculateEarnedXpToday` (e no espelho SQL) por retornos
decrescentes:

| XP bruto no dia | Taxa | Creditado acumulado |
|---|---:|---:|
| 0–300 | 100% | 300 |
| 301–600 | 30% | 390 |
| 601+ | 10% | teto absoluto **450** |

O dia monstruoso vale 450 em vez de 300 (+50%), o farm continua contido (3.000 bruto ainda dá
450), e — o principal — **nenhuma missão vale mais zero**. Zero é a única recompensa que
ensina o usuário a parar. Fragmentar continua não compensando, porque a taxa cai.

Em cima disso, o **multiplicador de streak**, que finalmente dá função mecânica ao streak:

| Streak | Multiplicador | Teto do dia |
|---|---:|---:|
| 0–6 | ×1,00 | 300 |
| 7–29 | ×1,10 | 330 |
| 30–99 | ×1,25 | 375 |
| 100+ | ×1,50 | 450 |

Multiplicador e teto sobem juntos — senão o multiplicador é ilusório. Teto absoluto combinado:
675. **Esforço:** M (2 dias). **Impacto:** alto.

### 5.5 Proteção de streak — obrigatório

Três peças, e as três são baratas:

1. **Escudo de streak (Poção de Descanso).** **Decisão: ganho no jogo, não comprado — e
   distribuído ANTES da necessidade, aplicado em silêncio.** Essa é a arquitetura exata do
   Duolingo e é o que faz funcionar: ganha ao completar 5 missões num dia, ao subir de nível,
   ao derrotar boss. Máximo 2 estocados (5 para assinante). Consumo **automático** — punir
   quem esqueceu de usar o item que evita a punição é sadismo de design.
   **Esforço:** P (4h: coluna `streak_shields int` + checagem em `src/lib/streak.ts`).
   **Impacto:** alto.
2. **Janela de recuperação** ("Você perdeu ontem. Complete 3 missões até 23h59 e devolvemos
   seu streak de 47 dias"). Nada gera mais reengajamento. **Esforço:** M (6h). **Impacto:** alto.
3. **Modo Descanso / Férias** — congela o streak por até 14 dias, declarado com antecedência,
   1×/ano. O Todoist, uma ferramenta séria, tem Vacation Mode e Days Off. É o pressuposto de
   que a vida do usuário existe fora do seu app — e é o que impede que viagem, doença ou luto
   virem churn permanente. **Esforço:** P (3h). **Impacto:** alto.

### 5.6 DECISÃO — a recompensa do boss

Contexto: `boss_battles` tem 100 HP, 2 de dano por conclusão, cap de 5 hits/dia por boss
ancorado no dia do servidor. Logo **mínimo absoluto de 10 dias reais por boss**, com 3 arenas
em paralelo. O anti-abuso já está sólido; falta o design.

**Decisão: baú com escolha de 1 entre 3, mais uma recompensa de prestígio concedida sempre.**

| Opção | Conteúdo |
|---|---|
| **Poder** | 200 XP **fora do teto diário** |
| **Riqueza** | 250 Moedas de Guilda + 1 Poção de Descanso |
| **Glória** | 1 cosmético do pool da categoria (moldura/aura/título) + 80 moedas |

**Sempre concede, independente da escolha:**
- +1 no troféu permanente da categoria ("Dragões abatidos: 3"), visível no perfil e para amigos;
- um **título + selo pixel 16×16** ao lado do nome no ranking, no anel de story e no card de
  amigo: *Matador de Dragões*, *Quebra-Elmos*, *Domador de Orcs* (progressivos: 1ª/5ª/25ª
  vitória);
- um item de Story auto-gerado ("Derrotou o Dragão pela 3ª vez") — alimenta o social de graça.

**Por que XP é seguro aqui, apesar do teto:** o cap de 5 hits/dia torna a torneira
matematicamente incontornável — no melhor caso absoluto são 3 tesouros a cada 10 dias, ou
**+75 XP/dia equivalente no cenário mais absurdo** e ~+20 no realista. Inflacionar é
impossível. O tesouro é a *válvula de escape* legítima do teto diário.

**Por que o título é a parte que mais importa:** custo de produção = uma string e um sprite
minúsculo; custo de balanceamento econômico = zero; efeito social = máximo, porque é uma coisa
que se vê no ranking dos outros e dá vontade de ter. E cada título é mais um motivo para
gerar o Cartão de Conquista (§6).

**Regra dura: o tesouro NUNCA paga cristal.** Cristal tem custo real (§5.7).

**Como escala sem inflacionar — escale o boss, não a recompensa:**

| Ciclo | HP | Dias mín. | Rank | Recompensa |
|---:|---:|---:|---|---|
| 1 | 100 | 10 | Filhote | 100% |
| 2 | 120 | 12 | Jovem | 100% |
| 3 | 140 | 14 | Adulto | 100% + cosmético garantido |
| 4 | 160 | 16 | Ancião | 100% |
| 5+ | 200 (teto) | 20 | Lendário | cosmético vira 40% de chance (senão +120 moedas) |

A recompensa por *evento* fica constante; por *dia* cai de 20 XP/dia para 10. Deflação
embutida, e o usuário sente que o inimigo ficou mais forte por causa dele. Uma coluna
`cycles_defeated integer not null default 0` + `max_hp` calculado resolvem.

**Camada opcional, depois (M):** em vez de pop-up imediato, o personagem sai numa **expedição
de 8h** e volta com o tesouro (mecânica do Finch). Sem cron: grava `expedition_ends_at` e
resolve na leitura. Cria um segundo motivo de reabrir o app no mesmo dia sem push agressivo.

**Esforço total do tesouro:** G (2–3 dias: SQL do reward no ponto onde já está o
`-- >>> RECOMPENSA ENTRA AQUI`, pool de cosméticos, modal de escolha). **Impacto:** alto.
É o melhor retorno por hora do documento, porque a infra está pronta e o botão já promete algo.

### 5.7 DECISÃO — a economia de cristais

**O diagnóstico é pior do que "frágil".** Fonte única: `CRYSTALS_PER_REFERRAL = 15`, pago só
quando o indicado mantém assinatura por 15 dias. Sumidouros: loja física (80–900 cristais) e
**1 cristal = 1 dia de acesso** (`hasCrystalAccessToday` em `accessRules.ts`).

- Para comprar a camiseta de 450 cristais são **30 indicações pagantes**. Isso não é economia,
  é rifa. Para o usuário mediano o saldo é 0 e sempre será 0 — a moeda está morta na chegada, e
  moeda morta na UI é pior que nenhuma moeda: ensina que os números do jogo são decorativos.
- O cristal é **lastreado em mercadoria física**. Inflação aqui sai do seu bolso, com frete.
- O cristal é **também chave de acesso**. Cada cristal distribuído = um dia de app grátis =
  assinatura canibalizada. Se você criar uma torneira de 1 cristal/dia por streak, acabou de
  tornar a assinatura opcional para todo usuário engajado. **É o risco econômico mais grave do
  produto e é invisível na UI.**

**Decisão: duas moedas, e o cristal deixa de ser chave de acesso.**

**Moeda 1 — Cristais de Energia** (hard, escassa, lastreada). Torneiras estritamente limitadas
no tempo real, que é o único recurso inforjável:

| Fonte | Valor | Frequência |
|---|---:|---|
| Indicação confirmada (já existe) | 15 | por indicado pagante |
| Marcos de indicação (já existe) | 15–30 | por temporada |
| Conquistas lendárias (novo, *uma vez na vida*) | 5–50 | ~10 conquistas |
| Top 3 do ranking de temporada (novo) | 30/20/10 | 2×/ano |

Teto vitalício de conquistas: ~180 cristais. Sugestão: streak 30 = 10, streak 100 = 25, streak
365 = 50, Nv 25 = 10, Nv 50 = 20, Nv 100 = 40, 10 bosses = 15, 1 ano de conta = 25.
**Válvula de mão única:** cristal converte **para baixo** em moedas (1 = 100). Moeda nunca
sobe para cristal.

**Moeda 2 — Moedas de Guilda** (soft, generosa, 100% digital). É onde o jogo acontece;
inflação é inofensiva porque todos os sumidouros têm custo marginal zero.

Torneiras: missão concluída 10 (teto 15/dia) · dia limpo +30 · 3 quests diárias 20/30/50 ·
bônus de streak 5 × min(5, ⌊streak/7⌋) · sessão de foco 25min = 15 (teto 60/dia) · subir de
nível 50 × min(6, ⌈nível/10⌉) · tesouro 80–250 · contrato semanal 400.
Total: **~250–350/dia engajado**, ~80–120/dia casual.

Sumidouros — e aqui é onde a maioria dos jogos erra:

| Item | Preço | Tipo |
|---|---:|---|
| Reroll de quest diária | 100 | **recorrente** |
| Poção de Descanso extra | 300, máx. 2 | **recorrente** |
| "Enfurecer" boss (dobra HP e dobra o tesouro) | 500 | **recorrente** |
| Moldura/aura | 800–2.000 | permanente |
| Título no ranking | 1.200 | permanente |
| Cenário novo (`characterBackgrounds.ts`) | 2.500 | permanente |
| Variante cromática de skin | 3.000 | permanente |

**Regra de calibragem:** o item mais barato com significado deve ser alcançável pelo casual em
≤3 dias (≤240 moedas), e o mais aspiracional pelo engajado em 30–45 dias (~9.000). Sem isso
você reproduz o problema atual do cristal numa moeda nova.
**Risco real:** sem sumidouros **recorrentes** (os três marcados) e ~2 itens novos/mês, todo
saldo vira infinito em 6 meses e a loja morre. Deflação (preço alto demais) é o risco maior no
início — é literalmente o que acontece hoje com o cristal.

**Esforço:** G (4–5 dias: torneiras + saldo + 15 molduras CSS). **Impacto:** alto.

**A jogada do Habitica que vale copiar:** assinante ganha o direito de **converter Moedas de
Guilda em Cristais**, teto começando em 20/mês e subindo **+2 por mês de assinatura contínua**
até 50. Cria custo de saída acumulado dentro da economia, sem ser pay-to-win: cancelar não é
perder um benefício, é perder 12 meses de escada. **Esforço:** M (8h + tabela de meses).
**Impacto:** alto (retenção de assinante).

### 5.8 Sistemas novos — veredito

| # | Sistema | Valor | Esforço | Veredito |
|---|---|---|---|---|
| 1 | **Conquistas/troféus (~40)** | muito alto | G (3–5 d) | **Fazer primeiro.** Derivadas de dados que você já grava (`xp_events`, `mission_completions`, `boss_hits`, streak). Preenche o vão entre tiers de arte e é a única torneira sã de cristal. Calcule no cliente; só as que pagam cristal precisam de tabela + RPC idempotente. |
| 2 | **Quests diárias do sistema** | muito alto | G (4–6 d) | **Fazer.** Resolve o "porquê de abrir de manhã". **Truque para dev solo: gere de forma determinística por `hash(user_id ‖ data)`** — a quest do dia vira função pura, nada precisa rodar à meia-noite. Mantenha 3/dia, sempre completáveis com o trabalho real. |
| 3 | **Multiplicador de streak** | alto | M (2–3 d) | **Fazer** (§5.4). |
| 4 | **Baú por turno** (Manhã/Tarde/Noite) | alto | P (4h) | **Fazer.** Você já tem os 3 turnos — completar missão em cada turno rende baú. É o Early Bird/Night Owl do Duolingo, resolvido preguiçosamente, sem cron. |
| 5 | **Árvore de talentos por classe** | alto | G (6–9 d) | **Fazer na v2.** Só funciona se os talentos afetarem a **economia**, nunca combate: Guerreiro +10% XP em Saúde; Arqueira +2 hits/dia num boss; Ladrão +1 reroll/dia; Bruxa converte 1 missão Difícil em 2 hits; Bardo +15% moedas quando um amigo fecha o contrato semanal. **Zero arte nova** e finalmente diferencia as 5 classes. Respec sempre grátis. |
| 6 | **Party (2–5 amigos, meta semanal)** | alto | G (5–7 d) | **Fazer no lugar de guildas.** Sem chat (sem moderação), só meta compartilhada + status. **Regra: a party só SOMA, nunca subtrai** — o erro do Habitica é punir você pela falha do amigo, o que gera culpa e abandono coletivo. |
| 7 | **Boss comunitário do mês** | alto | G (5–8 d) | **v2.** HP dimensionado pelos ativos do mês anterior; dano por trigger em `mission_completions`; fechamento preguiçoso no primeiro request após o fim. Risco: com base pequena o boss não morre e o evento vira fracasso público — **calibre o HP por baixo**. |
| 8 | **Temporadas / passe** | alto | G (8–12 d) | **v2/v3.** O risco não é técnico, é **conteúdo recorrente para sempre**. Só assine esse contrato depois que 1, 2 e 3 estiverem estáveis. Reaproveite a estrutura de temporada de `src/data/referral.ts`. |
| 9 | **Duelos entre amigos** | médio-alto | G (5–8 d) | **Fazer, mas só sobre foco.** Duelo de "missões concluídas" é trivialmente trapaceável. Minutos de foco cronometrados é o único sinal semi-verificável que existe. Formato: desafio assíncrono de 7 dias, sem punição para o perdedor. |
| 10 | **Eventos sazonais** | médio | M/G (3–5 d cada) | **3/ano** (Festa Junina, Halloween, Ano Novo), reciclando bosses com paleta trocada + 1 cosmético exclusivo. Barato se reciclar arte; caro se produzir do zero. |
| 11 | **Pets/montarias** | médio | G (6–8 d + arte) | **Opcional.** O valor está no **sumidouro recorrente** (ração), não no pet. Se fizer: **um** pet, 3 estágios, ovo dropado do tesouro. Não faça 5 pets × 5 tiers. |
| 12 | **Equipamentos com atributos** | **negativo** | muito alto | **Não fazer.** "+5 de Força" não significa nada sem combate. Moldura/aura entrega a mesma customização por 5% do custo. |
| 13 | **Guildas/clãs** | médio | G (12–20 d) | **Não fazer.** Chat = moderação, denúncia, LGPD. E com base pequena a guilda vazia é pior que nenhuma. A Party entrega 80% do valor por 25% do custo. |

### 5.9 Personagem que reage ao dia

Hoje o personagem muda em 1/10/25/50/100 — isso é **progressão**, não **vínculo**. O vínculo do
Finch (US$ 30M+ ARR, bootstrapped) vem de **reação de curto prazo**: 2–3 poses por skin ligadas
ao estado do dia — cansado quando você não completou nada, empolgado quando bateu o dia, pose
diferente por turno. **Esforço:** M (8–12h + arte). **Impacto:** alto.
É o reframe que o Finch prova: em vez de "preciso melhorar minha rotina", o app diz "seu
personagem está te esperando". A tarefa ganha um rosto e fica menor.

### 5.10 Os limites — onde traçar a linha

O modo de falha do gênero é conhecido: o app deixa de ajudar a fazer as coisas e passa a
otimizar os números do app. Seis invariantes que eu gravaria:

1. **A recompensa nunca depende do número de missões acima de um piso baixo.** A partir de ~6
   missões/dia ganhar mais deve ser marginal. (O teto atual já protege isso por acidente; o
   teto suave preserva a proteção.)
2. **O jogo nunca pune a vida real.** Sem decaimento de XP, com escudo automático e Modo Férias.
3. **Nenhuma mecânica exige abrir o app mais de duas vezes por dia.** Sem timer de coleta, sem
   "volte em 4h", sem energia que regenera. Isso é extração de atenção — o oposto do que você
   vende.
4. **O ranking é sempre opcional e sempre relativo.** Semanal (recuperável), padrão em "Amigos",
   com botão de sair do global sem perder nada. **Sem ligas com rebaixamento**: funciona para
   idioma (a tarefa é a mesma para todos), mas em app de tarefas quem tem filho e dois empregos
   sempre perde — vira punição por circunstância.
5. **"Modo sóbrio" no perfil** (P, 4h): esconde toasts de XP, ranking e boss, deixando missões e
   foco. Duas funções: prova ao cético que a ferramenta funciona sem o jogo, e dá a quem está
   numa semana pesada um jeito de baixar o volume em vez de abandonar. O Todoist deixa desligar
   o Karma inteiro — e o Todoist é a ferramenta séria da comparação.
6. **A métrica de verdade é taxa de conclusão do planejado, não XP acumulado.**
   `src/hooks/useMetrics.ts` já calcula quase tudo. Se o XP médio sobe e a conclusão cai, a
   gamificação virou ruído. É o seu detector de incêndio.

> **A linha, em uma frase:** a camada de jogo pode decidir *como o usuário se sente* sobre o
> trabalho que fez, mas nunca pode decidir *qual trabalho ele faz*. No instante em que alguém
> escolhe uma tarefa por causa do XP, você perdeu.

---

## 6. Social e viral

Hoje stories e ranking são **fechados** — só circulam entre quem já pagou. Viralidade dentro de
um jardim murado é zero por definição. Isso muda com a Aposta 1; o resto desta seção é o que
construir em cima.

### 6.1 O Cartão de Conquista (1080×1350)

O artefato que a pessoa posta. Disparado em três momentos: **subir de tier**, **derrotar boss**,
**marco de streak (7/30/100)**.

Composição, de trás para frente: cenário escolhido pelo usuário sangrado e escurecido 35% com
grain → personagem centralizado `object-bottom` com sombra de contato e luz de recorte roxa por
trás → topo com sigilo lvl2do + `nickname#TAG` → manchete em Sora 700, 72px, tracking −0.032em
(**"NÍVEL 25"** / **"DRAGÃO DERROTADO"** / **"30 DIAS SEGUIDOS"**) → faixa de HUD (XP total ·
streak · classe, em `.num`, com a barra de entalhes) → moldura com cantos ornamentados → rodapé
`lvl2do.com` em pixel.

**Implementação sem dependência nova e sem backend:** monte em SVG com
`<image href="data:image/webp;base64,...">`, serialize com `XMLSerializer`, desenhe num
`<canvas>` 1080×1350, `toBlob()`, e ofereça `navigator.share({ files: [file] })` — funciona em
Safari e Chrome mobile, que é onde as pessoas de fato postam. Fallback: download.
Alternativa server-side: **`ImageResponse` do `next/og`**, já nativo no Next 15 — melhor para o
recap semanal e para OG images de perfil público, porque roda sem o usuário abrir o app.

**Por que importa:** a Duolingo mede **5–10× mais compartilhamento orgânico** com card de
milestone. É o único canal de aquisição com CAC zero, e é literalmente o motivo pelo qual você
fez pixel art. Sem isso, a arte é custo, não canal.
**Esforço:** G (16h). **Impacto:** alto.

### 6.2 Recap semanal

Domingo 19h: card pronto para Stories com personagem, nível, streak, XP da semana, boss
derrotado e `lvl2do.com/u/nickname`. `src/hooks/useMetrics.ts` já calcula tudo — falta empacotar
e plugar no sistema de **Stories que já existe** (`StoryComposer.tsx`, `src/lib/db/stories.ts`).
É um "Wrapped semanal", conteúdo social recorrente e gratuito.
**Esforço:** M (1–2 dias). **Impacto:** alto.

### 6.3 Perfil público `/u/nickname`

Renderizado no servidor, indexável, com OG image dinâmica: personagem, nível, streak, títulos,
selos. Todo link colado no WhatsApp vira cartão visual. Botão: "Criar meu personagem". Isso te
dá SEO — hoje inexistente, porque o app é client-side.
**Esforço:** M (1–2 dias). **Impacto:** alto (aquisição).

Junto: **ranking público semanal** (top 50, só nickname + classe + nível) em página indexável.
Cria competição visível e serve de prova de que o app tem gente — que é exatamente o que falta
para alguém confiar.

### 6.4 Ritmo social: semana antes de tudo

O ranking hoje é "Todos os tempos / Anual" — um usuário novo **nunca aparece nele**, então o
ranking desmotiva 99% da base em vez de motivar.
**Decisão: ranking semanal vira a aba padrão** (anual/all-time viram secundárias). Ranking que
reseta é ranking em que todo mundo pode ganhar. **Esforço:** M (6h). **Impacto:** alto.

Mais três peças baratas:
- **Contrato semanal**: meta única de segunda a domingo ("1.200 XP" ou "18 missões, ao menos 3
  de cada categoria"), recompensa cheia em moedas + baú. **Esforço:** M. **Impacto:** alto.
- **Streak de dupla com amigo** (o Duolingo mede **+22%** de propensão a completar a tarefa
  diária de quem tem ao menos uma). Você já tem `nickname#TAG`. **Esforço:** M (1–2 dias).
- **O nudge vem do amigo, não do app**: "Seu amigo Rafael está com o streak de 47 dias em
  risco" move mais gente do que qualquer recompensa. `useNotifications.ts` +
  `NotificationsBell.tsx` já existem. **Esforço:** M. **Impacto:** alto.

### 6.5 Moderação — não opcional

Stories com foto sem botão de denúncia e remoção é passivo legal e risco reputacional. Botão de
denúncia + remoção manual + idade mínima nos termos. **Esforço:** P (4h). **Impacto:** alto
(risco evitado). A estética pixel art atrai adolescentes; dado de criança tem regra específica
na LGPD e cobrança de menor gera estorno.

---

## 7. Monetização

### 7.1 Cinco coisas que travam faturamento hoje

1. **Não existe camada grátis** — `canAccessApp()` + `AccessGuard.tsx` (Aposta 1).
2. **O botão "Ver demonstração" da landing leva ao paywall.** `src/app/page.tsx` aponta para
   `/dashboard` → `AccessGuard` → `/paywall`. O visitante que clicou em "quero ver antes de
   pagar" recebe exatamente a tela de pagar. É o pior clique possível do funil, e é o segundo
   CTA do hero. **Esforço:** P. **Impacto:** alto.
3. **Você anuncia um plano anual que não pode ser comprado.** `src/data/landingContent.ts:115`
   vende "R$ 8,32/mês no anual — R$ 99,90/ano", mas `src/lib/payments/revenuecat.ts` só
   implementa `findMonthlyPackage()` (`$rc_monthly` / `lvl2do_pro_monthly`). O plano de maior
   LTV está anunciado e inexistente. **Esforço:** P/M. **Impacto:** alto.
4. **O "cristal do dia" está morto em produção** — `consume_daily_crystal` não existe em
   `supabase/`. Em dev cai em localStorage; em produção o usuário fica sem acesso e sem
   mensagem.
5. **Zero telemetria.** Nenhum PostHog/gtag/Plausible em `src`. Você não consegue medir nada do
   funil. **Este é o item zero de tudo neste capítulo.**

Bônus de dívida técnica comercial: `@clerk/nextjs` **e** `@supabase/ssr` coexistem no
`package.json`. Dois sistemas de auth em produto de dev solo é superfície de bug em cima do
login — que é o gargalo de toda receita. Remova o que não usa.

### 7.2 Posicionamento

**Para quem:** brasileiro de 18–32 anos com relação difícil com rotina (procrastinação, TDAH
declarado ou suspeito), fluente em linguagem de jogo — mantém streak no Duolingo, entende
"boss". Não é o executivo do Todoist: é quem já tentou app de tarefas e abandonou porque lista
de tarefas não dá dopamina.

**Contra quem você compete de verdade:**

| Concorrente | Preço BR | Ameaça |
|---|---|---|
| **Habitica** | **Grátis** | **A maior.** RPG + tarefas + party, open source, 12 anos, ~4M de registrados. |
| Finch | ~R$ 40/mês | Polido, emocional, mobile-first. Ganha em acolhimento. |
| Duolingo | R$ 31,90/mês (Super) | Não compete, mas ensinou seu usuário o que é streak. É o benchmark de mecânica. |
| Todoist | ~R$ 24/mês | Ganha em utilidade pura. Perde em emoção. |
| Forest | assinatura (o "único" virou legado) | Só foco. Concorre com `/focus`. |

O ponto desconfortável: **Habitica faz o núcleo do que você faz e é grátis.** Para cobrar contra
um gratuito de 12 anos, você precisa ganhar onde ele é ruim: Habitica é feio, confuso, em
inglês, com onboarding hostil, social datado (removeram Guilds e Tavern em 2023 e a comunidade
não perdoou) e reclamações consistentes de sobrecarga cognitiva justamente do público TDAH.
**Esse é o seu espaço.**

**Promessa em uma frase:**
> *"Suas tarefas viram missões, seu progresso vira um personagem — e seus amigos estão vendo."*

Versão mais comercial para a landing: **"O app de tarefas que você não abandona na segunda
semana."** Venda o resultado (constância), não a mecânica (XP).

**Sobre o diferencial defensável, com honestidade:** **não é o pixel art.** Arte é copiável em
3 meses por qualquer concorrente com verba. O pixel art vende o clique e o screenshot — é canal
de aquisição, não fosso. **O fosso é o grafo social em português.** Consequência prática: toda
decisão que reduz a população da rede está destruindo seu único fosso para proteger uma receita
que ainda não existe.

### 7.3 DECISÃO — planos e preços

**AVENTUREIRO — grátis, para sempre, sem cartão.** Missões ilimitadas, XP, nível, streak,
personagem até o tier 25, **1 boss ativo** (escolhe a categoria), amigos ilimitados, ranking
completo, 1 story/dia, foco 25min padrão, 2 alarmes, histórico de 14 dias.

**PRO MENSAL — R$ 16,90/mês**
**PRO ANUAL — R$ 119,90/ano** (R$ 9,99/mês) · *preço de fundador R$ 99,90 para os 500 primeiros*
**LENDÁRIO (vitalício) — R$ 297, limitado a 300 unidades**

Justificativas, uma linha cada:
- **R$ 16,90 e não R$ 14,90:** você precisa de espaço para descontar; a R$ 14,90 o anual de
  R$ 99,90 já é só 44% off e não sobra margem para promoção sazonal. Continua abaixo do Spotify
  (R$ 21,90) e muito abaixo do Super Duolingo (R$ 31,90) — a régua mental brasileira.
- **O anual é o produto principal, não o mensal:** retenção 12m de anual ~44–47% contra ~17% do
  mensal. **Meta: 60% dos pagantes no anual.** Descontar o anual não é perda de receita, é
  seguro contra churn.
- **Vitalício R$ 297 ≈ 2,5 anos de anual:** para dev solo, é caixa hoje. Limite em 300 unidades
  (teto ~R$ 89k) para não hipotecar receita futura, e posicione como "Sócio Fundador" com badge
  exclusivo no perfil — **o badge é o que vende, não a economia**.
- **PIX é o desbloqueio brasileiro que está faltando.** Anual e Vitalício são cobranças **únicas**
  — cabem em PIX perfeitamente (Stripe BR, cobrança única). Cartão recorrente no Brasil tem falha
  de cobrança alta (falhas são ~31% dos cancelamentos no Google Play). **Provavelmente vale mais
  conversão do que qualquer mudança de UI deste trimestre.** **Esforço:** M. **Impacto:** alto.
- **Trial: troque cartão por freemium.** Pedir cartão a um estranho antes dele completar uma
  única missão, num produto de dev solo desconhecido, tem entrada baixíssima. **Decisão: 14 dias
  de Pro concedidos automaticamente no cadastro, sem cartão** — trials de 17+ dias convertem
  42,5% contra 25,5% dos de ≤4 dias, e a LatAm converte tarde (proporção maior de conversões na
  semana 6+). No dia 15 o usuário desce para o grátis **sentindo a falta**; esse downgrade
  sentido converte melhor que trial com cartão.
- **Aritmética que define o horizonte:** R$ 5.000 de MRR a ticket médio ~R$ 12 = ~420 assinantes
  = ~10.000 usuários grátis a 4% de conversão. Para 90 dias, a meta honesta é **R$ 1.000 de MRR
  (~85 assinantes, ~2.000 cadastros)**. Contexto: ~20% dos apps novos chegam a US$ 1.000 de
  receita em 2 anos; ~5% passam de US$ 10.000.

### 7.4 O que cobrar — e o que nunca cobrar

**Regra inegociável:** nada que o Pro compra pode gerar XP, acelerar nível, dar dano extra no
boss ou melhorar posição no ranking. No momento em que o ranking for comprável, ele morre como
mecânica — e ele é o fosso. Um app de produtividade pay-to-win é uma contradição: o produto é a
disciplina do usuário. O Habitica é explícito sobre isso e está certo.

| Cobre | Por que vende | Esforço |
|---|---|---|
| **Cenários de fundo** (`characterBackgrounds.ts`) — grátis 1, Pro todos | cosmético puro, arte já existe | P |
| **Skins exclusivas Pro** (variantes *paralelas*, fora da trilha de nível) | vaidade sem punição | M (arte) |
| **Histórico e métricas** — grátis 14 dias, Pro all-time + export CSV | quem paga é quem já tem 3 meses de dados | P (dados já em `useMetrics`) |
| **Quem viu meu story** | curiosidade social é o gatilho de compra mais forte que você tem | P (já rastreia visualizações) |
| **Os 3 bosses simultâneos** (grátis: 1) | escala natural, não é vantagem sobre terceiros | P |
| **Alarmes/agendamentos recorrentes ilimitados** | poder de organização, não de pontuação | P |
| **Foco: durações customizadas + histórico completo** | concorre com o Forest | P |
| **Moldura de story, badge no ranking, título destacado** | status visível = o melhor anúncio que existe, exibido pelo próprio cliente | P |
| **Cosmético mensal exclusivo de assinante** | encaixa direto em "Trocar roupa"/"Trocar fundo"; é o perk que mais retém no Habitica | M |
| **Cristais mensais (Pro: +30/mês) e conversão moeda→cristal com teto crescente** | dá função à moeda e cria custo de saída | M |
| **5 escudos de streak em vez de 2** | conveniência, não vantagem competitiva | P |

**Nunca cobre:** número de missões (limitar tarefa é limitar o valor central — e o Habitica não
limita), XP/nível/streak, participação no ranking, **número de amigos** (limitar amigos é
sabotar a própria viralidade), conclusão/reversão de missão, o boss básico.

**Sobre as skins de nível:** mantenha as de tier 1/10/25 **conquistáveis no grátis**. Trancar
atrás de dinheiro algo que o usuário suou 3 meses para merecer gera raiva, não receita. **Pro dá
skins paralelas, nunca confisca as merecidas.**

### 7.5 Funil — onde vaza

| Etapa | Vazamento | Correção |
|---|---|---|
| **Aquisição** | sem analytics, sem SEO (app client-side), sem perfil público indexável, sem imagem compartilhável | §6.1–6.3 |
| **Ativação** | **o buraco fatal:** landing → registro → onboarding → dashboard → **paywall**. O "aha" acontece depois do cartão | Aposta 2: primeiro XP em <90s, **e o paywall não aparece no dia 1, em hipótese nenhuma** |
| **Retenção** | sem lembrete, sem resgate de streak | §5.5 + push (abaixo) |
| **Receita** | anual inexistente, sem PIX, paywall é parede e não convite | §7.3 + paywall contextual |
| **Indicação** | +15 cristais que não compram nada alcançável, condicionado a 15 dias de assinatura do indicado | **Decisão: trocar por "1 mês de Pro grátis para os dois"** — custo marginal zero, valor percebido R$ 16,90, e o indicado já entra experimentando o topo. Mantenha a trava dos 15 dias apenas onde ela paga cristal, porque é ela que faz a auto-indicação custar mais caro que o prêmio. |

**Paywall contextual, não parede:** o Pro aparece no momento de desejo — tentar abrir o 2º boss,
ver quem viu o story, abrir histórico além de 14 dias. `PaywallModal.tsx` já existe; é questão de
onde chamá-lo.

### 7.6 Notificações — você tem mais opções do que pensa

Sem push, você não tem o gancho de retorno que Duolingo e Finch têm. Isso é desvantagem
estrutural real, e há três saídas que **cabem no seu stack**:

- **Cron grátis:** GitHub Actions agendado batendo numa Supabase Edge Function é cron real, sem
  pg_cron. Destrava lembrete, "streak em risco às 21h", digest semanal e fechamento de temporada.
  **Esforço:** P/M. **Impacto:** alto.
- **Web Push:** funciona em Chrome desktop, Android e **iOS 16.4+ se instalado como PWA**.
  Service worker + tabela `push_subscriptions`. **Esforço:** G (~3 dias). **Impacto:** alto.
- **E-mail:** Resend, plano gratuito de 3.000/mês, ~30 min de setup. Suficiente para digest
  semanal e win-back ("seu personagem está esperando, o boss está pela metade").

### 7.7 Prova social e confiança

Você está pedindo cartão num app desconhecido feito por uma pessoa. O que falta:
**6–10 depoimentos reais com rosto e @** (consiga dando Vitalício grátis a 20 beta testers em
troca de depoimento público) · **contador de prova social** no hero, só quando for verdade e não
vergonhoso (>500) · **Termos + Política de Privacidade com LGPD explícita** — você já tem
`src/lib/db/resetAccount.ts`, transforme em argumento ("apague tudo com um clique, na hora") ·
**página `/precos` separada e honesta** · **cancelamento em 2 cliques dentro do app**, dito na
landing (fricção de cancelamento gera chargeback e Reclame Aqui, o que é fatal para produto
pequeno) · **suporte com SLA declarado** em `/support` · **o rosto do desenvolvedor**: "feito por
uma pessoa, no Brasil" converte mais que fingir ser empresa.

### 7.8 As 5 métricas — e a decisão sobre a loja física

Nenhuma é mensurável hoje. **Instale PostHog (grátis até 1M eventos/mês) na primeira semana** com
8 eventos: `signup`, `onboarding_class`, `first_mission_created`, `first_mission_completed`,
`paywall_view`, `checkout_start`, `purchase`, `day2_return`. Sem isso, tudo abaixo é ficção.

| # | Métrica | Definição | Meta 90 dias |
|---|---|---|---|
| 1 | **Ativação 24h** | % de cadastros que completam ≥1 missão em 24h | **≥ 60%** |
| 2 | **Retenção D7 comportamental** | % que completam missão em ≥3 dias distintos nos 7 primeiros | **≥ 25%** |
| 3 | **Stickiness (WAU/MAU)** | ≥1 missão na semana / no mês | **≥ 40%** (abaixo de 35% não é hábito) |
| 4 | **Conversão grátis→pago (D30)** | % com assinatura ativa em 30 dias | **3–5%** |
| 5 | **Churn mensal de pagantes** | cancelamentos + falhas / ativos no início do mês | **< 10%/mês** |

Métrica de vaidade a ignorar: número de cadastros. Métrica de vigilância: **falha de cobrança** —
no Brasil costuma ser 20–30% do churn involuntário e se resolve com retentativa e e-mail, não com
produto. Sinal preditivo forte: quem faz menos de 3 sessões nos primeiros 14 dias churna a 3–4× a
taxa de quem estabelece hábito semanal — **a briga inteira acontece nos primeiros 14 dias.**

**DECISÃO — a loja de produtos físicos, como está, é descontinuada.** Camiseta R$ 35 + embalagem
R$ 5 + frete R$ 25 = **R$ 65 por resgate de 450 cristais**, mais nota fiscal, endereço (dado
sensível/LGPD), extravio dos Correios, troca de tamanho e o seu tempo virando operador de
e-commerce. Para receita de quatro dígitos, é destruição de foco — e hoje é passivo, não ativo,
porque promete um catálogo que ninguém alcança.
**O que fica:** `src/app/(app)/store/page.tsx` vira loja de **recompensas digitais** (cenários,
molduras, títulos, meses de Pro) — zero logística, margem 100% — **mais um único item físico raro
e caro** (pôster do personagem, 1.500 cristais), print-on-demand, limite de 10/mês, entrega
avisada em até 45 dias. Ele existe para ser cobiçado e fotografado, não para ser vendido em
volume. É o mesmo desenho do Forest, que limita a 5 árvores por conta e paga do próprio
faturamento: **gesto raro e memorável, custo previsível**.

**Riscos que ficam registrados:** dependência de fornecedor (Supabase é banco, auth e storage
inteiros — **backup automatizado do Postgres desde o primeiro cliente pagante**, perder dados de
assinante é o fim) · RevenueCat 5% + Stripe ~4% ≈ 9% da receita, aceitável agora, renegocie acima
de R$ 10k MRR · fraude de indicação (contas falsas — `supabase/2026-social.sql:182` credita +15
direto no perfil do indicador).

---

## 8. Aprendizados da concorrência

| Produto | Lição | O que fazer no lvl2do |
|---|---|---|
| **Habitica** (grátis, ~4M) | Assinante compra moeda premium com moeda de jogo, com **teto que cresce +2/mês de assinatura contínua** — cancelar é perder a escada, não só o benefício. | Assinante converte Moedas de Guilda → Cristais, teto 20 subindo até 50. **M, alto.** |
| **Habitica** | Cosmético mensal exclusivo de assinante, **sem stats**. | Item misterioso mensal encaixado em "Trocar roupa"/"Trocar fundo". **M, médio-alto.** |
| **Habitica** | O dano coletivo (você toma dano pela falha do amigo) gera culpa e abandono em cadeia. | Party que **só soma, nunca subtrai**. **Decisão registrada.** |
| **Habitica** | Sobrecarga cognitiva e UI de fórum afastam justamente o público TDAH. E remover Guilds/Tavern em 2023 queimou 10 anos de comunidade. | Não adicione stats/equipamento/atributos. E **nunca remova feature social** — stories é o diferencial. |
| **Finch** (US$ 30–40M ARR, bootstrapped, 75% mulheres 25–35) | O vínculo não vem da progressão de longo prazo, vem da **reação de curto prazo**: você faz pelo bichinho. | Personagem com 2–3 poses ligadas ao estado do dia (§5.9). **M, alto.** |
| **Finch** | "Adventure de 8h": o pet sai e volta com histórias — segundo motivo de reabrir o app sem push. | Tesouro do boss como **expedição de 8h**, resolvida na leitura (`expedition_ends_at`). **M.** |
| **Finch** | Soft paywall: ferramentas inteiras grátis, Plus vende roupinha e som. US$ 30M+ assim. | Aposta 1 + §7.4. |
| **Finch** | Público majoritariamente feminino num app de autocuidado gamificado. | A arte de marketing deve liderar com Bruxa/Arqueira, não com o Guerreiro. **P, médio.** |
| **Duolingo** (52,7M DAU, 12,2M pagantes, conversão 9,2%) | Streak Freeze é **distribuído antes da necessidade e aplicado em silêncio** — essa arquitetura é o que faz funcionar. | Escudo de streak ganho no jogo, consumo automático. **P, alto — o item nº1 de custo/benefício.** |
| **Duolingo** | Earn Back: janela curta para restaurar o streak quebrado. | Janela de recuperação de 24h. **M, alto.** |
| **Duolingo** | Friend Streaks: quem tem ao menos uma é **+22%** propenso a completar a tarefa diária. E o nudge chega **como do amigo, não do app**. | Streak de dupla + notificação do amigo. **M, alto.** |
| **Duolingo** | **Uma única animação nova** (a fênix do dia 7) moveu retenção em **+1,7%**. Card de milestone: **5–10× share orgânico**. | Celebração dramática só em marcos (§4.3) + Cartão de Conquista (§6.1). |
| **Duolingo** | Baús Early Bird / Night Owl forçam duas sessões sem push. | Baú por turno — você já tem Manhã/Tarde/Noite. **P, médio-alto.** |
| **Duolingo (o erro)** | Trocar corações por Energy (2025): assinante tem energia ilimitada, ou seja, o paywall virou o ritmo de uso. Conversão subiu, marca queimou — trade que só fecha com 133M de MAU de colchão. | **Seu portão de cristal é exatamente esse padrão, sem colchão nenhum.** Aposta 1. |
| **Duolingo** | Ligas com promoção/rebaixamento. | **Não portar.** Em app de tarefas, quem tem filho e dois empregos sempre perde: punição por circunstância. |
| **Forest** (60M+ downloads) | O caso mais famoso de "compra única funciona" **migrou para assinatura**; o Pro vitalício é legado. | Compra única não é o caminho em 2026 — o Vitalício aqui é evento de caixa limitado, não modelo. |
| **Forest** | 2,1M de árvores reais, **teto de 5 por conta**, pagas do faturamento: gesto raro, custo previsível, marketing com propósito. | Um único item físico raro (§7.8) e/ou conversão de cristais em doação real com teto por conta. **P.** |
| **Forest** | "Sua floresta" mostra o acúmulo visual do trabalho feito. | Cenário em pixel art que se **povoa** com as sessões de foco — mais forte que qualquer chart do recharts. **M, médio-alto.** |
| **Todoist Karma** | Vacation Mode e Days Off numa ferramenta séria; e o Karma pode ser **desligado por inteiro**. | Modo Descanso (§5.5) + Modo Sóbrio (§5.10). **P, alto.** |
| **Todoist Karma (a crítica)** | "Recompensa conclusão independentemente da importância — o caminho mais rápido é completar muitas tarefas pequenas". | Já mitigado pelas 3 dificuldades; complete com **dano de boss por dificuldade** (1/2/4). **P.** |
| **Todoist (o erro)** | Tirar Karma por tarefa 5+ dias atrasada é a parte mais odiada. | **Não penalize retroativamente.** Nunca. |
| **Notion** | Sem gamificação nativa; a comunidade constrói XP na mão com templates. | Existe demanda real e não atendida por jogo dentro de ferramenta séria. É o seu mercado. |
| **Benchmarks (RevenueCat 2026)** | Hard paywall converte 10,7% (D35) contra 2,1% do freemium — mas a **retenção de assinante em 1 ano é praticamente idêntica (27% vs 28%)**, e a LatAm converte na **semana 6+**. | Freemium é a escolha certa **para um produto social**: você troca conversão por população, e população *é* o produto. E trial de 7 dias com paywall duro perde exatamente o usuário brasileiro. |
| **Benchmarks** | LatAm tem a **maior mediana de crescimento de MRR do mundo (17,2%)**, e preço localizado converte muito mais que default em USD. | Preço em BRL, âncora abaixo do Super Duolingo, PIX no anual. |
| **Tendências UI 2026** | Dark-first é padrão (você já está); **glassmorphism 2.0 = vidro só em elementos focais**; chrome silencioso; performance tratada como design. | Tirar blur dos 53 cards, subir borda para 8–12%, WebP nos bosses (§3). E: **a pixel art deve ser o único elemento "alto" da tela** — se os cards também brilham e blurram, a arte compete com o cromo. |

---

## 9. Roteiro sugerido

### Onda 1 — Semanas 1–2: parar de vazar e passar a enxergar
*Nenhuma feature nova. ~40h.*

| Item | Onde | Esforço |
|---|---|---|
| **Clamp de data em `complete_mission_atomic`** | `supabase/2026-mission-completions.sql` | P (30min) |
| Orçamento de "ontem" para 150 + auditar delete de missão/`xp_events` | `xp-system.ts`, SQL | P (2h) |
| **PostHog com 8 eventos** | app inteiro | P (4h) |
| `inset 0 1px 0` + borda não-uniforme + tokens de elevação | `globals.css` | P (2h) |
| `.num` em todos os contadores | ~15 componentes | P (1h) |
| Grain no `body::after` | `globals.css` | P (20min) |
| `object-contain object-bottom` + `pixelated` + frame em 160/200px | `CharacterFrame.tsx` | P (45min) |
| WebP nos bosses + `formats` no `next.config.mjs` | `public/bosses/` | P (30min) |
| Tirar `backdrop-blur-sm` dos cards | `globals.css` | P (15min) |
| `mt-5` → `mt-8` entre seções | 4 páginas | P (20min) |
| `<MotionConfig reducedMotion="user">` + matar `transition-all` + `focus-visible` no `MissionCard` | `layout.tsx`, `Button.tsx`, `MissionCard.tsx` | P (1,5h) |
| **Rebalancear a curva de XP** | `xp-system.ts` | P (1 dia) |
| **Dano de boss por dificuldade (1/2/4)** | `useBossBattles.ts` + SQL | P (1h) |
| **Escudo de streak** (ganho, automático, máx. 2) | `streak.ts` + coluna | P (4h) |
| **Modo Descanso** | perfil + `streak.ts` | P (3h) |
| Consertar "Ver demonstração" da landing | `src/app/page.tsx` | P (1h) |
| **Package anual no RevenueCat** + corrigir a promessa da landing | `revenuecat.ts`, `landingContent.ts` | M (6h) |

**Resultado ao fim da semana 2:** exploit fechado, funil medido, produto visivelmente mais caro,
progressão que entrega recompensa no dia 1, streak que perdoa, anual comprável.

### Onda 2 — Mês 1–2: abrir, ativar e distribuir
*~2 meses de trabalho parcial.*

1. **Derrubar o paywall total** — gate por *feature*, não por rota; remover
   `consume_daily_crystal` do caminho de acesso. `accessRules.ts`, `AccessGuard.tsx`,
   `useAccessGate.ts`. **M/G.**
2. **Onboarding Ato 3** — 3 missões pré-criadas + primeira conclusão celebrada em <90s.
   `PreconfiguredMissions.tsx`. **M.**
3. **Aceite ≠ recompensa** na conclusão + som Web Audio + `ProgressBar variant="hud"`. **M/G.**
4. **Tesouro do boss** — escolha 1-de-3 + título + selo + story auto-gerado. **G.**
5. **Teto suave + multiplicador de streak.** **M.**
6. **Level-up de tela cheia** com `layoutId`, enquadrado 4:5, só em marcos. **G.**
7. **Cartão de Conquista 1080×1350** + `navigator.share`. **G.**
8. **Perfil público `/u/nickname`** com OG image via `next/og` + ranking público semanal. **M/G.**
9. **Ranking semanal como aba padrão** + contrato semanal + recap de domingo nas Stories. **G.**
10. **Indicação reformulada:** 1 mês de Pro para os dois. Loja convertida para digital com 1 item
    físico raro. **M.**
11. **Termos + LGPD + `/precos` + e-mail de suporte + denúncia em stories.** **M.**
12. **PIX no anual e no vitalício** + backup automático do Postgres. **M.**
13. Direção de arte Tier A: cantos ornamentados, `--px`, cor de categoria propagada, skeletons no
    lugar de `Loader2`, `<EmptyState>` com boss dormindo, ícones pixel, sigilos de classe,
    tocha/névoa/parallax, âmbar de recompensa, spotlight no hover. **~16h somadas.**
14. Recrutar 20 beta testers com Vitalício grátis em troca de depoimento público com rosto.

### Onda 3 — Trimestre: economia, hábito e recorrência
1. **Moedas de Guilda** completas (torneiras, saldo, 15 molduras CSS, sumidouros recorrentes). **G.**
2. **Conquistas/troféus (~40)**, com as lendárias pagando cristal. **G.**
3. **Quests diárias determinísticas** por `hash(user_id ‖ data)` + reroll pago + baú por turno. **G.**
4. **Web Push (PWA) + cron via GitHub Actions + Resend** para streak em risco e digest semanal. **G.**
5. **Party de 2–5 amigos com meta semanal** (só soma) + streak de dupla + nudge do amigo. **G.**
6. **Lançamento do Vitalício "Sócio Fundador"** R$ 297 × 300, com badge — evento de caixa do
   trimestre. **M.**
7. **Paywall contextual** nos três momentos de desejo (2º boss, quem viu o story, histórico). **M.**
8. **Conversão moeda→cristal com teto crescente por mês de assinatura** + cosmético mensal de
   assinante. **M.**
9. **Personagem que reage ao dia** (2–3 poses por skin). **M/G.**
10. Onboarding Atos 1 e 2 completos. **M/G.**
11. **Árvore de talentos econômica por classe.** **G.** (só depois que 1–3 estiverem estáveis)
12. Leitura das 5 métricas e decisão de preço para o trimestre seguinte. **Só depois de ter CAC
    orgânico conhecido, considere mídia paga.**

**Meta de saída dos 90 dias:** ~2.000 cadastros, ativação 24h ≥60%, D7 ≥25%,
**R$ 1.000–1.500 de MRR** mais o caixa do Vitalício.

---

## 10. O que NÃO fazer

**Armadilhas de produto**
- **Não reative `INACTIVITY_LOSS_ENABLED`.** Uma semana de férias apagando um nível inteiro é
  máquina de churn. Aversão à perda só funciona quando recuperar é barato.
- **Não faça ligas com rebaixamento.** Funciona para idioma; em app de tarefas vira punição por
  circunstância de vida.
- **Não faça dano coletivo na party.** O erro do Habitica: ser punido pela falha do amigo gera
  culpa e abandono em cadeia. **Só somar.**
- **Não penalize retroativamente** (o Karma do Todoist perde ponto por atraso de 5+ dias, e é a
  parte mais odiada do sistema).
- **Não crie mecânica que exija abrir o app mais de duas vezes por dia.** Timer de coleta,
  "volte em 4h", energia que regenera — tudo isso é extração de atenção, e você vende o oposto.
- **Não deixe nenhuma torneira diária de cristal existir** enquanto cristal comprar merch. É o
  risco econômico mais grave do produto, e ele é invisível na UI.
- **Não faça o tesouro do boss pagar cristal.** Cristal tem COGS.

**Over-engineering**
- **Guildas/clãs.** 12–20 dias, exige chat (moderação, denúncia, LGPD, matchmaking) e sofre do
  problema da guilda vazia com base pequena. **A Party entrega 80% do valor por 25% do custo.**
- **Equipamentos com atributos.** "+5 de Força" não significa nada sem combate, e cosmético de
  verdade seria 5 classes × N peças de pixel art — projeto de arte, não de código. Moldura/aura
  entrega a mesma customização por 5% do custo.
- **Pets em escala** (5 pets × 5 tiers). Se fizer, **um** pet, 3 estágios, ovo dropado do tesouro
  — e o valor está na ração (sumidouro recorrente), não no bicho.
- **Temporadas/passe agora.** O risco não é técnico, é o **contrato de conteúdo recorrente para
  sempre**. Só assine depois que conquistas, quests e streak estiverem estáveis.
- **Reescrever o sistema de conclusão para ser otimista.** A invariante "o estado local só muda
  com o retorno do servidor" está certa e documentada. Separe aceite de recompensa, não quebre a
  invariante.
- **App nativo.** PWA + Web Push cobre Chrome, Android e iOS 16.4+ instalado. Não abra essa
  frente.
- **pg_cron / worker.** Tudo periódico deve ser **função pura de (agora, âncora gravada)**,
  avaliada preguiçosamente na leitura, com um RPC idempotente de liquidação disparado pelo
  primeiro request após a fronteira. Onde precisar de empurrão real: GitHub Actions + Edge
  Function.

**Ideias tentadoras que não pagam**
- **Mais arte de personagem antes de mostrar a que já existe.** Você tem 4 tiers em 100 níveis.
  Variante cromática por `filter` e molduras CSS entregam "skin nova" com custo zero de arte —
  faça isso primeiro.
- **Bento grid no dashboard.** Funciona em landing e feature showcase; em dashboard denso o
  padrão assimétrico briga com o escaneamento uniforme. Use no marketing e talvez em `/progress`.
- **Mais gráficos.** A tendência 2026 é o contrário: chrome silencioso, tabelas boas, gráfico
  como resumo. O Plausible roda um produto inteiro com um gráfico + listas ranqueadas.
- **Glassmorphism em tudo.** É 2021. Vidro só em modal, sheet e elemento flutuante.
- **`pixelated` em tamanho arbitrário.** Nearest-neighbor ao **reduzir** cria aliasing. 800/5 =
  160px fica cristalino; 176px fica sujo. Escolha divisores inteiros ou não use.
- **Compra única como modelo.** O Forest, o caso mais famoso de que funciona, migrou para
  assinatura e aposentou o Pro vitalício para novos usuários.
- **Mídia paga antes de CAC orgânico conhecido.** É queima de dinheiro.
- **Catálogo de 12 produtos físicos.** Hoje isso é passivo (promessa não cumprível), não ativo.
- **Dois sistemas de auth.** `@clerk/nextjs` e `@supabase/ssr` no mesmo `package.json` é
  superfície de bug em cima do login — e login é o gargalo de toda a receita.

---

## Apêndice — se você só tiver uma tarde (4h)

1. Clamp de data no `complete_mission_atomic` (30min) — fecha o exploit.
2. `inset 0 1px 0 rgba(255,255,255,.09)` + borda não-uniforme no `.card-surface` (45min).
3. `.num` em todos os contadores (1h).
4. `object-contain object-bottom` + frame em 160px no `CharacterFrame` (45min).
5. `<MotionConfig reducedMotion="user">` + matar `transition-all` (45min).

Quatro horas. O produto fica seguro, os números param de tremer, o personagem para de ser
cortado, e a tela inteira ganha luz vindo de um lugar só.

**E se você só tiver uma semana:** as cinco acima + a curva de XP nova + o escudo de streak + o
Ato 3 do onboarding. É o menor conjunto de mudanças que faz o lvl2do mudar de categoria.
