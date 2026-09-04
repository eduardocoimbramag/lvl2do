# Auditoria de SVG e ícones — o que vale virar arte pixel

Documento para escolher **quais desenhos do lvl2do valem ser gerados como arte** e quais devem continuar como ícone de traço.

---

## 1. Resumo — o que é isto e como usar

### 1.1 Como usar

Este documento é uma **lista de compras**. Você lê, escolhe, gera a imagem no ChatGPT e marca a caixinha na Parte 9.

- A **Parte 2** ensina a regra para você decidir sozinho qualquer caso novo.
- A **Parte 3** diz o que **não** trocar — leia antes de gerar qualquer coisa, para não gastar trabalho à toa.
- As **Partes 4, 5 e 6** são a lista, organizada por aba do app.
- A **Parte 7** diz em que ordem gerar.
- A **Parte 8** diz o que pedir ao ChatGPT para tudo combinar entre si.

### 1.2 O tamanho real do trabalho

O app tem **105 ícones diferentes** da biblioteca lucide (ícones de traço prontos, tipo "linha fina") e **8 arquivos de SVG desenhado à mão**. Isso dá cerca de **250 usos de ícone** espalhados por 16 telas.

Mas você **não** vai trocar 105 ícones. A conta real:

| | Quantidade | O que fazer |
|---|---|---|
| Usos com 22px ou menos | ~218 | Ficam como estão |
| Usos com 24px ou mais | ~32 | São os candidatos |
| **Desenhos a gerar (lista completa deste documento)** | **42** | Cobrem 100% dos momentos que o usuário lembra |

Quebrado por lote:

| Lote | Desenhos |
|---|---|
| Marca (1 desenho vira 3 arquivos: favicon, ícone de app, imagem de link) | 1 |
| NPC Mestre da Guilda (página inicial) | 1 |
| Símbolos do sistema (cristal ×2, ouro, XP, chama acesa, chama apagada) | 6 |
| Estados vazios | 10 |
| Confirmação de e-mail (variação de um dos estados vazios) | 1 |
| Produtos da Loja | 12 |
| Categorias de missão (medalhões) | 3 |
| Classes de personagem (brasões) | 5 |
| Extras (baú, cavalete de story, círculo de runas) | 3 |
| **Total** | **42 desenhos / 44 arquivos** |

### 1.3 Os 5 primeiros

Se você fizer só cinco, faça estes. Eles cobrem a marca e as três telas mais visitadas.

| # | O quê | Onde | Por que é o primeiro |
|---|---|---|---|
| 1 | **A marca** (logo, favicon e ícone de app) | Topo de toda tela | É o desenho mais visto. E hoje **não existe favicon nenhum** no projeto — confira em `src/app/layout.tsx`: só tem título, descrição e palavras-chave. Quando alguém manda o link no WhatsApp ou salva o app na tela do celular, aparece um quadrado em branco. |
| 2 | **Mestre da Guilda (NPC)** | Página inicial, seção de perguntas | Aparece a **224px** — 5× maior que qualquer outro. O lugar já está reservado e o próprio código pede a arte por escrito. É a página que transforma visitante em cliente. |
| 3 | **Cristal de energia grande** | Loja, card de saldo (44px) | É a moeda do jogo. É o que o usuário está juntando. |
| 4 | **Chama da sequência (streak)** | Dashboard, card "Sequência" (34px) | Visto quase todo dia. É o símbolo emocional do produto. |
| 5 | **"Tudo concluído hoje"** | Dashboard, quando não há missão pendente | É a recompensa diária, e hoje é um check verde genérico. |

Logo depois desses cinco, o melhor salto por esforço é o **lote de 12 produtos da Loja** (muda a página inteira de uma vez) e o **estado vazio da aba Missões** (é a primeira coisa que um usuário novo vê).

### 1.4 Três problemas de identidade que já existem hoje

Não é questão de estilo, é de significado. Vale corrigir na mesma leva:

| Problema | Onde | Por que importa |
|---|---|---|
| **O raio é a marca E é o XP** — é o mesmo desenho, o mesmo traçado copiado | `Logo.tsx` e `AnimatedSvgIcon.tsx` | Sua logo não pode ser também uma unidade de recurso do jogo. |
| **Dois fogos diferentes para o mesmo streak** — um desenhado à mão no Dashboard, um da lucide no Perfil | `StreakCard.tsx` e `profile/page.tsx` | O usuário vê dois fogos e não sabe se é a mesma coisa. |
| **Quatro produtos da Loja mostram o produto errado** | Ver Parte 5 | Pulseira mostra relógio, garrafa térmica mostra copo de refrigerante, mousepad mostra mouse, pôster mostra moldura vazia. É promessa errada num produto que vai ser enviado pela casa do cliente. |

Colisões menores, para você não repetir a mesma forma em coisas diferentes: `Sparkles` é a categoria "Pessoal" **e** a classe Bruxa · `KeyRound` é senha **e** o "Chaveiro do Herói" da loja · `Target` é a aba Missões **e** a classe Arqueira · `Trophy` é "maior streak", "nível" e "level up".

### 1.5 Código morto — não gere arte para estes

Conferido no código: estes componentes existem, mas **não são usados em lugar nenhum**. Se você gerar arte para eles, a arte não vai aparecer para ninguém.

- `src/components/FeatureCard.tsx` — cartão de recurso da landing, com ícone de 22px. **Não é importado em nenhuma tela.**
- `src/components/PricingCard.tsx` — idem.
- `src/data/landingContent.ts` → lista `features[]` (6 ícones) e `sparkleIcon` — **não são renderizados**.
- `src/data/subscription.ts` → `PRO_BENEFITS` (6 ícones) — **não são renderizados**.
- `src/components/AnimatedSvgIcon.tsx:65` → `ChecklistMark` — SVG desenhado à mão que **nunca foi usado**.

---

## 2. A regra simples

> **Abaixo de 24 pixels na tela, continua ícone de traço. De 24 para cima, pode virar arte — e, se virar, aumente o espaço dele para 48–64px, senão o esforço não compensa.**

O motivo é aritmética: em 16 pixels de altura cabem 16 quadradinhos. Não dá para desenhar um dragão em 16 quadradinhos, dá para desenhar um risco. Pixel art só começa a "ler" a partir de uns 32 quadradinhos.

### As três perguntas

Antes de gerar qualquer arte, pergunte nesta ordem. Se a resposta parar você em qualquer uma, não gere.

1. **Aparece com 24px ou mais?** Se não, pare.
2. **Ele muda de cor sozinho?** (fica verde quando conclui, roxo quando é a aba ativa, cinza quando está desabilitado). Se muda, pare.
3. **É um botão de ação?** (fechar, salvar, apagar, voltar, play, pause). Se é, pare.

Sobrou depois das três? Vale gerar.

### A tabela por faixa de tamanho

| Tamanho na tela | O que fazer | Por quê |
|---|---|---|
| 11–18 px | **Não trocar** | Não cabe desenho. Vira mancha. |
| 20–26 px | **Trocar só se for símbolo do sistema** (moeda, streak, XP) | Dá para ler, mas só formas simples. |
| 28 px ou mais | **Trocar** | Cabe objeto, cena, personagem. |
| 44 px ou mais | **Prioridade máxima** | Aqui a arte vira memória da marca. |

### A exceção que resolve o problema dos pequenos

Você levantou, com razão, que arte gerada é uma imagem: não muda de cor sozinha, pesa mais e precisa de texto alternativo.

Só que **pixel art é a única arte que cabe dentro de um SVG sem perder nada**. Um desenho numa grade de 16×16 são literalmente 256 quadradinhos. Esses 256 quadradinhos viram 256 retângulos dentro de um arquivo SVG — arquivo minúsculo, escala para qualquer tamanho, e continua trocando de cor sozinho, exatamente como hoje.

Então, para os símbolos pequenos (cristal, ouro, raio de XP, chama), o caminho é:

1. Gerar no ChatGPT Image **numa grade real de 16×16 ou 24×24 blocos** — não uma imagem de 1024px "com cara de pixel".
2. Converter os blocos em retângulos de SVG (é um script simples, roda uma vez).
3. Resultado: identidade pixel **sem** perder cor dinâmica, sem peso extra, sem texto alternativo.

Para os itens grandes (estados vazios, produtos da loja, o NPC), aí sim vale imagem normal (WebP): eles aparecem uma vez por tela e não mudam de cor.

**Resumo da exceção:** item pequeno que muda de cor → SVG de blocos. Item grande e ilustrativo → imagem.

---

## 3. O que NÃO trocar (e por quê)

Esta parte vale tanto quanto a lista de trocas. São cerca de 80 dos 105 ícones.

### 3.1 Muito pequeno — o motivo campeão (218 usos)

Tudo que aparece com 22px ou menos. Em pixel art vira borrão.

| O quê | Onde | Tamanho |
|---|---|---|
| Selos de categoria (Profissional, Pessoal, Saúde) e de turno (Manhã, Tarde, Noite) | Todo card de missão, dezenas por tela | 13px |
| Cristal e moeda de ouro no topo da barra lateral | Todas as telas internas | 15px |
| Cristal no preço dos produtos e no modal de resgate | Loja | 15 e 18px |
| Raio de XP no card de nível | Dashboard | 15px |
| Ícones das 11 abas do menu e dos 5 da barra de baixo | Todas as telas internas | 18 e 20px |
| Ícone de estatística do `StatCard` | Perfil, Métricas, perfil de amigo | 18px |
| Coroa do 1º lugar | Ranking | 20px |
| Bandeiras de país, checks dentro de caixinhas, sinais de "+" | Vários | 11–15px |

### 3.2 Precisa mudar de cor sozinho

Numa imagem, a cor está queimada dentro do arquivo. Nestes casos **a cor é a informação**, então trocar quebra o significado:

- Selos de **categoria** (azul / rosa / verde) e de **turno** (âmbar / laranja / índigo).
- Ícones do menu lateral (cinza quando inativo, roxo quando ativo, com brilho no hover).
- Check de missão: verde quando concluída, cinza quando pendente, vermelho quando falhou.
- Ícones de ticket no Suporte (aberto vs. resolvido).
- Qualquer ícone cinza que clareia quando o mouse passa por cima.

### 3.3 O usuário precisa reconhecer na hora

São botões. Ninguém "aprecia a arte" de um botão, procura o botão. Símbolo universal ganha sempre.

| O quê | Quantos usos |
|---|---|
| `X` (fechar) e `Check` (confirmar) — os dois mais usados do app | 17 cada |
| Setas (`ArrowRight`, `ArrowLeft`, `ChevronDown/Left/Right`) | 20 |
| Lixeira, lápis, "+" | 16 |
| Olho / olho cortado (mostrar e esconder senha) | 2 |
| Play, Pause, Parar (Modo Foco) | 5 |
| Copiar, Buscar, Menu, Sair, Configurações, Enviar, Cadeado | vários |

No Modo Foco isso é grave: se o usuário hesitar meio segundo para achar o pause, a sessão de foco já foi.

### 3.4 Erros e avisos

`AlertCircle`, `AlertTriangle`, `Ban`, `ShieldAlert`. Erro tem que parecer erro do sistema, não do jogo. Arte simpática num erro passa a mensagem errada.

### 3.5 É animado ou é calculado pelo código

Arte é imagem parada. Estes se movem ou se redesenham sozinhos:

| O quê | Onde | Por quê |
|---|---|---|
| **`Loader2`** (o rodinha de carregando) — 18 usos, o 2º ícone mais usado do app | Todas as telas | Gira sem parar. Sem giro, o usuário acha que travou. |
| **`FocusRing`** — o anel de 240px do cronômetro | Modo Foco | Parece o candidato perfeito por ser enorme, **mas não é um desenho: é um arco que o código redesenha a cada segundo** conforme o tempo passa. Nenhuma imagem faz isso. |
| **`OrbitDecor`** — dois anéis girando | Página inicial, seção de planos | Animação, não desenho. |
| Barras de progresso e gráficos | Dashboard, Métricas | São desenhados a partir dos dados. |

### 3.6 Vive em tamanhos muito diferentes

**`CharacterBackdrop.tsx`** — os 3 cenários vetoriais (muralha, trono, floresta) que ficam atrás do personagem. Aparecem de **56px** (miniatura de story) a **176px** (perfil), em 9 lugares diferentes.

Em imagem, você precisaria de duas versões de cada (uma simples para o 56px, uma detalhada para o 176px) = 6 arquivos para 3 cenários, e ainda assim uma das pontas fica borrada ou pesada. O `docs/fundotbh.md` já diz isso: as imagens grandes são **só para as arenas**.

*(Existe um caminho: redesenhar os mesmos 3 cenários como blocos de pixel **dentro do SVG**. Continua vetor, continua leve, continua escalando — mas é trabalho de código, não de gerar imagem. Fica para depois.)*

### 3.7 Já é arte — não mexa

Personagens (`/public/characters`, 25 arquivos webp), bosses (`/public/bosses`) e os 3 cenários de arena que você acabou de gerar. Estão fora desta auditoria.

---

## 4. A lista, aba por aba

Legenda de tamanho: o número é **quanto o desenho ocupa na tela hoje**.

---

### 4.1 A MARCA — aparece em todas as telas

**Onde:** `src/components/Logo.tsx`. Cabeçalho da página inicial, barra lateral, topo do mobile, menu mobile, rodapé, e todas as telas de login/cadastro/senha.
**O que é hoje:** um raio branco de 18px dentro de um quadrado roxo de 32px. **É o mesmo raio do XP** — traçado idêntico, copiado.
**Tamanho:** 18px dentro de 32px (e é o que vai virar favicon de 16px).

| Sugestão | Descrição | Nota |
|---|---|---|
| 1. **O "2"** | O número 2 em blocos de pixel, branco com sombra roxa escura, ocupando o quadrado | Você já destaca o "2" em roxo no nome escrito ("lvl**2**do"). A marca vira o acento que já existe. |
| 2. **Seta de nível** | Três blocos empilhados em escada, com uma seta para cima | Diz o que o produto faz. Um raio não diz. |
| 3. **Cristal da marca** | O cristal roxo, chapado, com brilho branco no canto alto | Amarra a marca à moeda do jogo. |
| 4. **Emblema de guilda** | Um escudo com o "L" cunhado dentro | Bonito, mas genérico no mercado de RPG. |

**Recomendada: a 1 (o "2").** E aqui o motivo é prático, não estético: você precisa de um favicon (não existe nenhum) e de um ícone de app para iOS/Android. **Escolha a marca pelo pior tamanho em que ela vai viver, não pelo melhor** — um "2" sobrevive a 16×16 pixels na aba do navegador; uma escada de 3 blocos não sobrevive.

**Bônus:** trocar a logo pelo "2" libera o raio para ser só o XP, e resolve de graça a colisão da Parte 1.4.

**Arquivos a gerar a partir de 1 desenho:** favicon 32px · ícone de app 512px · imagem de compartilhamento de link 1200×630.

---

### 4.2 PÁGINA INICIAL (`/`)

#### 4.2.1 Mestre da Guilda — o maior item da auditoria

**Onde:** seção "Pergunte ao Mestre da Guilda" — `src/components/GuildMasterFAQ.tsx:211`.
**O que é hoje:** um ícone de varinha (`Wand2`) de 96px dentro de um círculo de 224px.
**Tamanho:** 224px — **o maior elemento gráfico do projeto inteiro**.

O código já pede a arte, escrito por você mesmo nas linhas 205–212:

```
PLACEHOLDER DO NPC — SUBSTITUA POR ARTE PIXEL ART DEFINITIVA
Troque este bloco por: <Image src="/npc/mestre-guilda.webp" ... />
```

A animação de flutuar e o brilho já estão prontos, esperando.

| Sugestão | Descrição |
|---|---|
| 1. **Mestre humano** | Velho barbudo de túnica roxa e capuz, atrás de um balcão de taverna, com um livro de registros aberto e uma caneca ao lado. Meio corpo, olhando para frente. |
| 2. **Coruja de óculos** | Coruja grande empoleirada num pergaminho enrolado, com uma pena atrás da "orelha". |
| 3. **Cristal com olhos** | Cristal grande flutuando com dois olhos brilhando dentro e fragmentos girando ao redor. |

**Recomendada: a 2 (coruja).** Um mascote que você reusa em 20 lugares (estados vazios, erro 404, e-mails, ícone do app, adesivos da loja) vale mais que um retrato bonito que só serve numa tela. E a coruja resolve de graça a pergunta "quem é essa pessoa?" quando o app crescer — não tem idade, gênero nem etnia para escolher.

#### 4.2.2 O resto da página inicial

| Item | Onde | Hoje | Tamanho | Veredito |
|---|---|---|---|---|
| Selos "Problema" e "Nosso sistema" | `ProblemSolution.tsx:43` e `:126` | `Frown` e `Swords` | 24px | **Amarelo.** Passa do corte por 0px. Só vale se a seção inteira virar arte (antes/depois). Um ícone de arte no meio de traços fica estranho. |
| Chips das 5 classes | `ClassShowcase.tsx:113` | `Sword`, `VenetianMask`, `Target`, `Sparkles`, `Music` | 16px | **Não trocar aqui** (pequeno demais), mas ver Parte 6.2 — hoje um ícone de traço fica **por cima** da arte pixel de 800×800. É a mistura dos dois estilos no mesmo card. |
| Cartões de recurso | `FeatureCard.tsx` | 6 ícones | 22px | **Não gerar. É código morto** — o componente não é usado em tela nenhuma (ver 1.5). |
| Mockup do dashboard, setas, checks | vários | vários | 11–18px | Não trocar. |

---

### 4.3 DASHBOARD (`/dashboard`)

#### 4.3.1 Chama da sequência (streak)

**Onde:** card "Sequência" — `src/components/StreakCard.tsx:30`.
**O que é hoje:** `StreakFlame`, SVG desenhado à mão, chama roxa com degradê, que pulsa.
**Tamanho:** 34px (e o card tem espaço de sobra para 56px).
**Problema atual:** **fogo roxo não lê como fogo, lê como magia.**

| Sugestão | Descrição |
|---|---|
| 1. **Chama quente** | Chama de 3 tons quentes (amarelo no núcleo, laranja no meio, vermelho na borda) com contorno roxo escuro. O contorno roxo é o que amarra na marca sem tirar a leitura de "fogo". |
| 2. **Tocha medieval** | Cabo de madeira, pano enrolado, chama em cima. Encaixa no mundo das arenas de boss. |
| 3. **Fogueira de acampamento** | Duas toras cruzadas com fogo em cima. |

**Recomendada: a 3 (fogueira)** — porque é a única que ganha **estados de graça**: apagada (sequência 0), brasa (1–2 dias), fogo médio (3–6), fogueira alta (7+), fogueira com faíscas (30+). Com 5 desenhos você transforma um ícone parado numa recompensa que cresce.
**Se quiser o mínimo agora:** faça a 1, mais a **versão apagada em cinza** para quando a sequência for zero. Só o contraste entre as duas já comunica sozinho. São 2 desenhos.

**Custo escondido:** hoje ela pulsa por código. Com arte parada você perde o pulso, a menos que gere 3 quadros e alterne por CSS.
**De quebra:** troque também o `Flame` da lucide no **Perfil** ("Streak atual" e "Maior streak") pelo mesmo desenho — hoje são dois fogos diferentes para o mesmo conceito. E aí dá para tirar o emoji de fogo solto no texto do card.

#### 4.3.2 "Tudo concluído hoje" — este NÃO é um estado vazio

**Onde:** `src/app/(app)/dashboard/page.tsx:148`.
**O que é hoje:** `CheckCircle2` verde, com o texto "Nenhuma missão pendente por hoje. Bom trabalho!".
**Tamanho:** 32px (cabe 96px sem mexer no layout).

É o mais importante dos estados vazios e o mais fácil de errar: **não é vazio, é vitória.** Tem que ser o único desenho quente, claro e comemorativo do conjunto.

| Sugestão | Descrição |
|---|---|
| 1. **Herói vitorioso** | Silhueta do aventureiro com a espada erguida, em cima de uma pilha de pergaminhos concluídos. |
| 2. **Bandeira no topo** | Bandeira roxa cravada no cume de um morro, com o sol se pondo atrás. |
| 3. **Baú aberto** | Baú de madeira aberto com luz dourada saindo e um selo de "dia limpo". |

**Recomendada: a 1, se ela mostrar a classe do jogador.** O usuário escolheu Guerreiro/Bruxa/Bardo — ver **o seu próprio personagem** comemorando é muito mais forte que uma bandeira genérica. Custa 5 desenhos em vez de 1, mas é o melhor investimento da lista. Se quiser um só, faça a 2.

#### 4.3.3 Raio de XP

**Onde:** card de nível — `src/components/LevelCard.tsx:117`. **Tamanho:** 15px.
Está abaixo do corte, mas é um símbolo do sistema, então entra pela exceção da Parte 2 (SVG de blocos).

| Sugestão | Descrição |
|---|---|
| 1. **Raio pixelado** | O mesmo conceito, em blocos, com 3 tons (branco no núcleo, lilás no meio, roxo escuro no contorno). |
| 2. **Estrela de 4 pontas** | O "brilho" clássico de RPG japonês, lilás com miolo branco. |
| 3. **Orbe de experiência** | Esfera roxa com rastro. **Cuidado: é um círculo, colidiria com a moeda de ouro** na barra lateral. |

**Recomendada: a 1, mas só se você mudar a logo** (item 4.1). Hoje raio = marca **e** raio = XP. Uma das duas tem que ceder, e é mais fácil a logo mudar — logo tem que ser única, recurso tem que ser genérico. Se você quiser manter o raio na logo, o XP vai para a **2 (estrela)**.

---

### 4.4 MISSÕES (`/missions`)

#### 4.4.1 Coluna de categoria sem missões

**Onde:** `src/app/(app)/missions/page.tsx:158`. **Hoje:** `ClipboardList`, com "Nenhuma missão aqui ainda". **Tamanho:** 26px.
É o estado vazio mais visto por usuário novo.

| Sugestão | Descrição |
|---|---|
| 1. **Quadro da taverna** | Tábua de madeira pregada na parede, com um prego solitário e um pedacinho de papel rasgado ainda preso. |
| 2. **Pergaminho em branco** | Pergaminho desenrolado sem nada escrito, com pena e tinteiro ao lado. |
| 3. **Espada fincada** | Espada cravada no chão de terra, descansando, sem dono por perto. |

**Recomendada: a 1.** Todo jogador entende na hora que "é aqui que as missões aparecem". A 2 é bonita, mas o pergaminho vai reaparecer no calendário — e você não quer dois pergaminhos.

#### 4.4.2 Calendário de missões — dois estados irmãos

**Onde:** `src/components/FutureMissions.tsx:243` e `:253`.
**Hoje:** `CalendarOff` 24px ("Nenhuma missão agendada para este dia") e `CalendarClock` 26px ("Selecione um dia no calendário").

| Sugestão | Descrição |
|---|---|
| 1. **Almanaque, dois estados** | A mesma folha de calendário de pergaminho nos dois. No "dia vazio", uma pena descansando e a folha em branco. No "selecione um dia", um dedo pixelado apontando e um dia destacado. |
| 2. **Mapa de viagem** | Uma estrada num mapa. Sem marcador cravado / com um marcador pairando. |
| 3. **Relógio de sol** | Pedra sem sombra (nublado) / pedra com sombra apontando um horário. |

**Recomendada: a 1.** Estes dois aparecem na **mesma tela** em momentos diferentes. Se forem desenhos de mundos diferentes, fica bagunçado. Regra: mesmo objeto, muda só o que está em cima. **São 2 desenhos.**

#### 4.4.3 Baú do tesouro (arena de boss)

**Onde:** `src/components/BossBattleCard.tsx:31` e `:491` — botão "Coletar tesouro e resetar boss". Só aparece **quando o boss cai**.
**Hoje:** `TreasureChestIcon`, SVG à mão. **Tamanho:** 22px, dentro do botão.

| Sugestão | Descrição |
|---|---|
| 1. **Baú aberto** | Baú de madeira e ferro já aberto, com moedas e um cristal saindo, luz dourada. |
| 2. **Baú com fechadura de caveira** | Fechado, fechadura em forma de caveira (o boss derrotado). Vira animação de 2 quadros ao clicar. |
| 3. **Saco de espólio** | Bolsa de tecido amarrada, moedas transbordando. |

**Recomendada: a 1 se o Kit Lendário da loja NÃO for baú; a 3 se o Kit for baú.** Não pode haver dois baús no mesmo produto significando coisas diferentes (ver 5.12).
**Duas ressalvas:** (a) só vale se você tirar o baú de dentro do botão e colocar **acima** dele, a 40–48px — hoje ele está 2px abaixo do corte; (b) hoje esse ícone herda a cor do botão de propósito. Arte parada não herda. Faça este em **SVG de blocos** e o problema some.

---

### 4.5 MODO FOCO (`/focus`)

#### 4.5.1 Histórico vazio

**Onde:** `src/components/FocusHistory.tsx:66`. **Hoje:** `Brain`, "Nenhuma sessão ainda". **Tamanho:** 26px.

| Sugestão | Descrição |
|---|---|
| 1. **Ampulheta parada** | Ampulheta de madeira com toda a areia embaixo, imóvel. |
| 2. **Vela apagada** | Vela nova, pavio ainda branco, ao lado de um livro fechado. |
| 3. **Relógio de bolso parado** | Engrenagens antigas, ponteiros travados. |

**Recomendada: a 1.** A ampulheta é o símbolo do tempo do próprio Modo Foco, e você pode **reusar ela cheia e escorrendo** dentro do cronômetro (item abaixo). Um desenho, dois usos, e o usuário conecta os dois sozinho.

#### 4.5.2 O anel do cronômetro — não trocar, mas dá para decorar

**Onde:** `src/app/(app)/focus/page.tsx:128` → `FocusRing.tsx`. **Tamanho:** 240px na tela.

**Não transforme o anel em imagem.** Ele é geometria calculada — o arco se preenche conforme o tempo passa. Virar imagem quebraria a função. Mas dá para dar identidade **em volta**:

| Sugestão | Descrição |
|---|---|
| 1. **Círculo de runas** | Um anel de runas atrás do anel de progresso, acendendo uma a uma conforme o tempo passa. Arte parada, efeito de movimento feito por CSS. |
| 2. **Cristal na ponta** | Manter o anel e colocar um cristalzinho correndo pela borda, na ponta do arco. |
| 3. **Ampulheta ao fundo** | A ampulheta do item 4.5.1, agora cheia e escorrendo, bem apagada atrás do número. |

**Recomendada: a 1** — é a que mais transforma a tela e não toca em nada que funciona hoje. A 3 é o complemento barato (é o mesmo desenho do estado vazio, reusado).

---

### 4.6 ALARMES (`/alarms`)

**Onde:** `src/app/(app)/alarms/page.tsx:37` (bloco "Em breve") e `:116` (estado vazio, atrás da chave de funcionalidade).
**Hoje:** `AlarmClock` nos dois. **Tamanho:** 26px, dentro de quadrado roxo de 56px.

| Sugestão | Descrição |
|---|---|
| 1. **Galo de vila** | Galo empoleirado num poste de madeira, cantando. O despertador medieval. |
| 2. **Relógio de vela** | Vela alta com marcas de hora entalhadas e uma agulha espetada — o alarme real da Idade Média, a agulha cai numa bandeja quando a cera derrete. |
| 3. **Ampulheta com sino** | Ampulheta acoplada a um sininho. |

**Recomendada: a 1.** É a única que se reconhece instantaneamente, tem humor, e mantém a separação limpa: **sino = notificação, galo = alarme, ampulheta = foco.** Três conceitos, três objetos, zero confusão.
**Um desenho serve os dois lugares.**

---

### 4.7 AMIGOS (`/friends`)

#### 4.7.1 Sem amigos

**Onde:** `src/app/(app)/friends/page.tsx:95`. **Hoje:** `Users` roxo, "Você ainda não tem amigos". **Tamanho:** 32px.

| Sugestão | Descrição |
|---|---|
| 1. **Mesa da guilda** | Mesa redonda de madeira com 4 cadeiras, só uma ocupada por uma silhueta pequena de aventureiro. As cadeiras vazias **são** a mensagem. |
| 2. **Brinde solitário** | Duas canecas de taverna: uma cheia e em pé, a outra caída e vazia. |
| 3. **Estandarte enrolado** | A bandeira da guilda ainda enrolada no mastro, não hasteada. |

**Recomendada: a 1.** Mostra literalmente o lugar vago, e reforça a palavra "guilda", que a sua loja já usa em dois produtos (Ecobag da Guilda, Boné da Guilda). Identidade é repetir a mesma ideia em lugares diferentes.

#### 4.7.2 Busca de amigo sem resultado

**Onde:** `src/components/AddFriendModal.tsx:173`. **Hoje:** `UserX`, "Nenhum jogador encontrado". **Tamanho:** 28px.

| Sugestão | Descrição |
|---|---|
| 1. **Cartaz "procura-se"** | Cartaz pregado numa tábua, com a moldura do retrato vazia e um ponto de interrogação no lugar do rosto. |
| 2. **Lupa sobre mapa** | Lupa de latão em cima de um mapa antigo, sem nenhum ponto marcado. |
| 3. **Pegadas que somem** | Duas pegadas no chão de terra que vão sumindo até nada. |

**Recomendada: a 1.** É a única que diz "procurei uma **pessoa** e não achei" — que é exatamente a mensagem. A lupa diz só "procurei".

#### 4.7.3 Compositor de story (área de foto vazia)

**Onde:** `src/components/StoryComposer.tsx:183`. **Hoje:** `ImagePlus`, "Toque para tirar ou escolher uma foto". **Tamanho:** 28px.

| Sugestão | Descrição |
|---|---|
| 1. **Moldura de retrato** | Moldura pixel vazia com um "+" no meio. |
| 2. **Cavalete de pintor** | Cavalete com tela em branco e um pincel. |

**Recomendada: a 2.** Story é a coisa mais expressiva do app; moldura vazia é fria.

---

### 4.8 SUPORTE (`/support`)

**Onde:** `src/app/(app)/support/page.tsx:164`. **Hoje:** `Inbox` cinza, "Você ainda não enviou nenhum ticket". **Tamanho:** 32px.

| Sugestão | Descrição |
|---|---|
| 1. **Pombo-correio** | Pombo pousado em cima de uma caixa de correio de madeira, sem carta na pata, olhando de lado. |
| 2. **Sino de balcão** | Sino de estalagem com um pergaminho lacrado ao lado, ninguém tocou. |
| 3. **Garrafa com mensagem** | Garrafa tampada na areia, mensagem ainda dentro, não enviada. |

**Recomendada: a 1.** O pombo rende **uma família inteira**: pombo parado (nenhum ticket), pombo voando com carta (ticket enviado), pombo chegando (ticket respondido). Três estados, um personagem.
**Cuidado:** não use sino aqui. Sino já é notificação (4.9).

---

### 4.9 NOTIFICAÇÕES (sininho — aparece em todas as telas internas)

**Onde:** `src/components/NotificationsBell.tsx:127`. **Hoje:** `BellOff`, "Nenhuma notificação ainda". **Tamanho:** 26px.

| Sugestão | Descrição |
|---|---|
| 1. **Sino com teia** | Sino de bronze pendurado, parado, com uma teia de aranha ligando o badalo à borda. |
| 2. **Corvo dormindo** | Corvo mensageiro cochilando em cima do sino. |
| 3. **Sino caído** | Sino tombado no chão, corda solta ao lado. |

**Recomendada: a 1.** É pequena o bastante para ler dentro do popover estreito (cabe uns 64px), e a teia é o tipo de detalhe que as pessoas comentam.

---

### 4.10 LOJA (`/store`) — o cristal grande

*(Os 12 produtos estão na Parte 5.)*

**Onde:** `src/app/(app)/store/page.tsx:73` — card de saldo, com o cristal flutuando e brilho roxo. Também em `ReferralSection.tsx:135` (Perfil), a 26px.
**Hoje:** `CrystalIcon`, SVG à mão — losango roxo vazado com linhas finas por dentro. Bonito, mas é traço de app, não gema de jogo.
**Tamanho:** **44px** — é o maior SVG próprio do app.

| Sugestão | Descrição |
|---|---|
| 1. **Gema lapidada** | Hexágono facetado com 3 tons de roxo (claro em cima à esquerda, médio no meio, escuro embaixo à direita) e um brilho branco de 2 pixels no canto alto. A gema clássica de RPG. |
| 2. **Cristal bruto** | Estilhaço vertical pontudo, irregular, com uma lasca menor flutuando ao lado. |
| 3. **Cristal com base** | Cristal cravado numa pedrinha escura, com raios de luz saindo em cruz. |

**Recomendada: a 1.** É a única que continua legível a 15px — e 15px é onde ele mais aparece (barra lateral, sempre visível). As outras duas ficam ótimas a 44px e viram sujeira a 15px.

**IMPORTANTE — gere duas versões deste:**
- **Versão ícone** (simplificada) para os 13–18px: barra lateral, preço dos produtos, modal de resgate.
- **Versão herói** (mais detalhada, com brilho) para os 44px da Loja e os 26px do Perfil.

É o único item do projeto que vive nos dois extremos. E **não troque o componente inteiro de uma vez**: crie um componente novo para a versão grande, e deixe o SVG atual servindo os pequenos até você converter.

---

### 4.11 PERFIL (`/profile`)

| Item | Onde | Hoje | Tamanho | Veredito |
|---|---|---|---|---|
| Cristal do card de indicações | `ReferralSection.tsx:135` | `CrystalIcon` | 26px | **Verde** — usa a mesma arte do 4.10. |
| "Streak atual" e "Maior streak" | `profile/page.tsx:176-186` | `Flame` e `Trophy` da lucide | 18px | **Trocar pela mesma chama do Dashboard** (não gerar arte nova — é para acabar com os dois fogos diferentes). |
| Cenários atrás do personagem | `CharacterBackdrop.tsx` | 3 cenários vetoriais | 56 a 176px | **Não trocar por imagem** (ver 3.6). |
| Trocar classe / roupa / fundo | `profile/page.tsx:138-153` | `Repeat`, `Shirt`, `Image` | 16px | Não trocar. |

---

### 4.12 BARRA LATERAL E TOPO (todas as telas internas)

| Item | Onde | Hoje | Tamanho | Veredito |
|---|---|---|---|---|
| Cristal do saldo | `CurrencyBalance.tsx:78` | `CrystalIcon` | 15px | Versão ícone do 4.10, em SVG de blocos. |
| **Moeda de ouro** | `CurrencyBalance.tsx:83` | `GoldCoinIcon`, SVG à mão (círculo âmbar com "L") | 15px | **Amarelo** — ver abaixo. |
| 11 ícones de navegação | `navigation.ts:34-50` | lucide | 18px | Não trocar. |
| Rodinha de carregando | 18 lugares | `Loader2` | 14–28px | Não trocar por imagem — ver 4.14. |

**Moeda de ouro — por que é amarelo:** você acabou de criá-la e ela **não aparece grande em lugar nenhum** (único uso, 15px). Gerar arte detalhada agora é arte parada na gaveta. Só vale **depois** de existir uma tela de saldo de ouro grande, como já existe para o cristal na Loja.

Quando chegar a hora:

| Sugestão | Descrição |
|---|---|
| 1. **Moeda cunhada** | Moeda de frente, borda serrilhada, "L" em relevo, brilho diagonal de 2 pixels atravessando. |
| 2. **Pilha de moedas** | Três moedas empilhadas em leve perspectiva. |
| 3. **Moeda girando** | Elipse mostrando a espessura, como no Mario — depois vira animação de 4 quadros. |

**Recomendada: a 1 agora, a 3 depois.** A 1 mantém o "L" e a leitura instantânea a 15px. Quando você quiser um momento de recompensa ("você ganhou ouro"), a 3 vira animação com quase nenhum trabalho extra.

**Regra das silhuetas:** na barra lateral, cristal e moeda aparecem lado a lado a 15px, onde só a **forma** e a **cor** se leem. Reserve: **losango = cristal · círculo = ouro · estrela/raio = XP · chama = streak · quadrado = concluído.** Nunca repita.

---

### 4.13 CADASTRO E SENHA (`/register`, `/forgot-password`)

**Onde:** `register/page.tsx:95` e `forgot-password/page.tsx:96`. **Hoje:** `MailCheck`, "verifique seu e-mail". **Tamanho:** 26px em quadrado roxo de 56px.

Passa do corte, mas o usuário vê **uma vez na vida**. Prioridade baixa — e por isso a melhor jogada é **reusar**:

| Sugestão | Descrição |
|---|---|
| 1. **Pombo voando** | O pombo do Suporte (4.8), agora decolando com uma carta lacrada na pata. |
| 2. **Carta lacrada** | Envelope com selo de cera roxo e um check verde carimbado por cima. |

**Recomendada: a 1**, exatamente por ser o par do 4.8. Dois pombos custam menos esforço que um pombo e um envelope — e criam repetição, que é o que cria identidade. **1 desenho serve os 2 lugares.**

O resto dessas telas (`KeyRound` 20px, `Lock`, `Mail`, `Eye`, `AlertCircle`) **não troca**.

---

### 4.14 A RODINHA DE CARREGANDO (18 lugares)

**Onde:** Amigos, Ranking, Onboarding, Paywall, modais, stories, guardas de acesso. **Hoje:** `Loader2`. **Tamanho:** 14 a 28px.

Isto **não é arte gerada** — é a maior oportunidade de identidade por esforço do projeto, porque aparece 18 vezes e não custa nenhum arquivo:

| Sugestão | Descrição |
|---|---|
| 1. **Oito quadradinhos girando** | Oito blocos em volta de um centro, acendendo em sequência. O loading clássico de RPG 16-bit, feito em CSS puro com passos travados. |
| 2. **Ampulheta virando** | 4 quadros de uma ampulheta girando (amarra com o Modo Foco). |

**Recomendada: a 1.** Continua leve, continua herdando a cor, e faz todo carregamento do app "parecer jogo" sem gerar um arquivo sequer.

---

### 4.15 RANKING (`/ranking`) — amarelo

**Onde:** `RankingPodium.tsx:48` — coroa âmbar sobre o 1º lugar. **Tamanho:** 20px.
Está abaixo do corte, mas é o topo do ranking. **Só vale se você aumentar para 28–32px.** Se aumentar: coroa pixel de 3 tons de dourado com brilho no canto alto. E aproveite para dar medalha ao 2º e 3º — hoje eles não têm ícone nenhum, são só anéis coloridos.

---

## 5. A LOJA — os 12 produtos

**Onde:** `src/app/(app)/store/page.tsx` → `ProductCard.tsx:56` (ícone de **26px** dentro de um quadrado de 56px) e `RedeemModal.tsx:89` (ícone de **30px** dentro de um quadrado de 64px). Os dados estão em `src/data/store.ts`.

Este é o **maior lote em quantidade** e o com o **problema mais grave hoje**. Quatro dos doze ícones mostram literalmente o produto errado:

| Produto real | Ícone hoje | O que o ícone mostra |
|---|---|---|
| Pulseira de silicone | `Watch` | Um **relógio de pulso** |
| Garrafa térmica de inox 500ml | `CupSoda` | Um **copo de refrigerante com canudo** |
| Mousepad XL 80×30cm | `Mouse` | Um **mouse** |
| Pôster A2 | `Frame` | Uma **moldura vazia** |

E o produto mais irônico da lista: "Cartela com 12 adesivos **pixel art**" — desenhado com ícone de traço. É a contradição mais visível do app.

**Por que este lote vale muito:** são 12 cards lado a lado. Trocar os 12 muda a página inteira de uma vez. É o maior retorno por arte gerada, depois da marca.

### 5.0 Escolha a direção ANTES de gerar

Há dois caminhos. Escolha um — misturar quebra a grade.

| Caminho | Como é | Problema |
|---|---|---|
| **A — Item de inventário** | Cada produto como item de RPG, em perspectiva 3/4, dentro de um slot de inventário com borda de raridade | O cliente não vê o que vai receber |
| **B — Catálogo pixel** | Cada produto como ele é de verdade (a caneca é uma caneca de cerâmica, a camiseta é uma camiseta), em pixel art, de frente, com a estampa da marca visível | Parece loja comum |

**Recomendado: o B, com a moldura do A.** Ou seja: o produto real desenhado, dentro do quadrado de 56px que o card já tem, **com a borda colorida pela raridade**. E a raridade você já tem de graça — está no preço:

| Faixa de custo | Raridade | Cor da borda |
|---|---|---|
| 80–200 cristais | Comum | Cinza |
| 220–340 | Raro | Azul |
| 400–500 | Épico | Roxo (a cor da marca) |
| 900 (Kit) | Lendário | Dourado com brilho |

Isso transforma uma grade de 12 produtos numa grade de **coisas que dá vontade de colecionar**, sem escrever uma linha de texto nova.

### 5.1 a 5.12 — produto por produto

| # | Produto (custo) | Hoje | Sugestão 1 | Sugestão 2 | Recomendada |
|---|---|---|---|---|---|
| 1 | **Pacote de Adesivos** (80) | `Sticker` | Cartela aberta em leque mostrando 3 mini-adesivos (cristal, chama, espada) | Um adesivo único descolando do canto, com sombra por baixo | **1** — a descrição diz "cartela com 12", a arte tem que mostrar quantidade |
| 2 | **Chaveiro do Herói** (120) | `KeyRound` | Argola de metal com o brasão da classe pendurado | Chave de ferro de masmorra com etiqueta de couro | **1** — o valor do produto é "da SUA classe". E resolve a colisão com o ícone de senha |
| 3 | **Caneca lvl2do** (180) | `Coffee` | Caneca de cerâmica escura em 3/4, logo roxo na lateral, vapor subindo | Caneco de taverna em madeira e estanho, com espuma | **1** — a 2 é mais divertida, mas o produto real é cerâmica de 325ml; a arte não pode prometer outra coisa |
| 4 | **Ecobag da Guilda** (200) | `ShoppingBag` | Sacola de algodão pendurada num gancho, brasão da guilda estampado grande | Bolsa de couro de aventureiro com fivela | **1** — o sabor de RPG entra pela **estampa**, não pelo formato |
| 5 | **Pulseira de Aventureiro** (220) | `Watch` (**errado**) | Pulseira de silicone roxa, círculo aberto em leve 3/4, texto da marca em relevo | Bracelete de couro com rebites | **1** — a 2 é mais bonita, mas é outro produto |
| 6 | **Planner de Missões** (260) | `NotebookPen` | Caderno fechado com elástico, capa estampada, marcador saindo | Livro de quests **aberto**, com linhas escritas e caixinhas marcadas | **2** — mostra para que serve. Cuide para não parecer o pergaminho dos estados vazios: caderno tem capa reta e lombada |
| 7 | **Mousepad XL** (320) | `Mouse` (**errado**) | Mousepad estendido em perspectiva, com um mouse pequeno em cima, mostrando a estampa | Mousepad enrolado, estampa aparecendo na ponta | **1** — o argumento de venda é o tamanho (80×30), e só o tapete inteiro mostra isso |
| 8 | **Boné da Guilda** (340) | `CapIcon` (SVG à mão) | Boné de perfil, aba curvada, bordado do logo na frente | Boné de frente, simétrico | **1** — de perfil a silhueta grita "boné"; de frente vira um arco genérico |
| 9 | **Garrafa Térmica** (400) | `CupSoda` (**errado**) | Squeeze de inox com tampa de rosca, logo gravado, **brilho vertical** na lateral | Cantil de couro e metal, com correia | **1** — e não esqueça o brilho vertical: é ele que faz o pixel art ler como metal |
| 10 | **Camiseta lvl2do** (450) | `Shirt` | Camiseta preta esticada de frente, estampa inteira visível, dobras nos ombros | Camiseta em cabide, em 3/4 | **1** — padrão de catálogo que todo mundo já sabe ler, e mostra a estampa inteira |
| 11 | **Pôster do Personagem** (500) | `Frame` (**errado**) | Pôster pregado na parede com 4 tachinhas, levemente torto, com a arte do personagem dentro | Pôster meio enrolado, mostrando um pedaço da arte | **1** — enrolado esconde justamente o produto. É o único item em que **a arte que você já tem** pode aparecer dentro do ícone |
| 12 | **Kit Lendário** (900) | `Package` | Baú aberto dourado, com camiseta, boné, caneca e adesivos saindo, luz e faíscas | Os 4 itens em pilha, sem caixa, com um selo "LENDÁRIO" carimbado | **1** — é o item mais caro e o único que merece efeito de raridade máxima. **Mas:** se o Kit for baú, o botão "Coletar tesouro" (4.4.3) **não** pode ser baú também — ou os dois precisam ser bem diferentes (o do kit é dourado e aberto; o do tesouro é de madeira e ferro) |

**Regra do lote:** os 12 no **mesmo enquadramento** — objeto centralizado, mesma ocupação do quadro, mesma luz vindo do mesmo lado. Senão a grade fica desalinhada e parece remendo.

---

## 6. Os conjuntos — categorias e classes

Estes dois grupos precisam ser coerentes **entre si**, não só bonitos sozinhos.

### 6.1 As 3 categorias de missão

**Onde:** `src/components/CategoryBadge.tsx:15-17` — Profissional (`Briefcase`), Pessoal (`Sparkles`), Saúde (`HeartPulse`). **Tamanho no selo: 13px.**

**No selo de 13px: não trocar.** É metade do mínimo, vira mancha colorida. Ponto final.

Mas há uma oportunidade grande que está bem na sua frente: **as categorias já têm bosses.** Profissional = Brasmor, o Dragão. Pessoal = Aldric, o Cavaleiro. Saúde = Gromak, o Orc. Essa ligação existe no código e o usuário **não vê em lugar nenhum** fora da arena.

Sugestões **só para lugares grandes** (cabeçalho de arena, card "Desempenho por categoria" no Perfil, aba Métricas):

| Sugestão | Descrição |
|---|---|
| 1. **Brasões heráldicos** | Três escudos. Profissional = bigorna/torre sobre azul. Pessoal = coração/estrela sobre rosa. Saúde = folha/frasco de poção sobre verde. Mantém as cores que já existem no código. |
| 2. **Cabeças dos bosses em medalhão** | Cabeça do dragão, elmo do cavaleiro, cabeça do orc, cada uma num medalhão redondo. |
| 3. **Objetos** | Pena e tinteiro / lira / poção vermelha. |

**Recomendada: a 2 para tamanhos grandes, e manter lucide nos selos de 13px.** A 2 é **quase de graça** — a arte já existe, é só recortar a cabeça do boss — e faz o usuário entender sozinho por que a missão profissional dá dano no dragão. Isso é design de sistema, não decoração.

### 6.2 As 5 classes de personagem

**Onde:** `src/data/characterClasses.ts:26-30` — Guerreiro (`Sword`), Ladrão (`VenetianMask`), Arqueira (`Target`), Bruxa (`Sparkles`), Bardo (`Music`). Aparecem no chip do card de classe (16px, **por cima da arte pixel de 800×800**) e como **reserva quando a imagem do personagem não carrega**.

Colisões a corrigir: **Bruxa usa `Sparkles`, que também é a categoria "Pessoal"**; **Arqueira usa `Target`, que também é o ícone da aba Missões**.

| Sugestão | Descrição |
|---|---|
| 1. **Brasão por classe** | Escudo com a arma de cada uma: espada e escudo cruzados (Guerreiro), adaga e capuz (Ladrão), arco com flecha encaixada (Arqueira), chapéu pontudo com estrela (Bruxa), alaúde (Bardo). |
| 2. **Busto do personagem** | Recorte do rosto/tronco da arte de 800×800 que já existe, dentro de um círculo. Custo de geração: zero. |
| 3. **Só a arma** | A arma de cada classe sozinha, dentro de um slot quadrado de inventário. |

**Recomendadas: as duas, para papéis diferentes.**
- Onde há espaço e a imagem carrega (seleção de classe, ranking, perfil de amigo) → **a 2**, porque é a arte real do jogo e não custa nada gerar.
- Para o papel de **reserva** (a imagem não carregou) → **a 1, obrigatoriamente**. Um recorte da imagem não serve de reserva: se a imagem falhou, o recorte falha junto. A reserva tem que ser um arquivo separado e leve.
- Para lugares pequenos ou de uma cor só → **a 1**, porque brasão sobrevive ao encolhimento e retrato não.

---

## 7. Ordem sugerida de produção

Ordenado por **retorno pelo esforço**, não por facilidade.

| # | Lote | Qtd. | Por que nesta posição |
|---|---|---|---|
| 1 | **Marca**: logo novo + favicon + ícone de app | 1 desenho, 3 arquivos | Nada mais faz sentido antes de a marca estar decidida. E o favicon simplesmente não existe hoje. |
| 2 | **Mestre da Guilda (NPC)** | 1 | Já tem o lugar reservado no código pedindo a arte. Maior tamanho do projeto, na página que vende. |
| 3 | **Símbolos do sistema**: cristal (2 versões), ouro, XP, chama acesa e apagada | 6 | Aparecem em todas as telas o tempo todo. Faça em SVG de blocos, não em imagem. |
| 4 | **Estados vazios** | 10 | É onde o usuário fica **parado olhando** (não tem nada para clicar). Maior ganho de personalidade. Todo usuário novo vê 4 deles na primeira semana. |
| 5 | **Produtos da Loja** | 12 | Corrige 4 erros reais de produto e muda a página inteira de uma vez. |
| 6 | **Categorias em medalhão** (cabeças dos bosses) | 3 | Recorte da arte que já existe. Quase de graça, e ensina a ligação categoria ↔ arena. |
| 7 | **Classes (brasão de reserva)** | 5 | Corrige a colisão do `Sparkles` e cobre a falha de carregamento da imagem. |
| 8 | **Confirmação de e-mail** (pombo voando) | 1 | Variação barata de um desenho que você já vai ter. |
| 9 | **Acabamento**: baú, cavalete de story, círculo de runas do foco | 3 | Faça quando o resto estiver de pé. |
| — | **Sem gerar arquivo:** rodinha de carregando em CSS | 0 | Pode fazer a qualquer momento, é só código. |

---

## 8. Cuidados na hora de gerar

### 8.1 O ponto mais importante: 16-bit, não 8-bit

O `docs/fundotbh.md` mostra que a sua arte é **16-bit (era Super Nintendo)**, não 8-bit (NES) — os personagens têm milhares de cores nas bordas. Se você pedir "8bit" de verdade nos ícones, eles vão **brigar** com os personagens e com os bosses.

**Peça "16-bit era pixel art"**, igual você já faz nos cenários das arenas. Só use 8-bit chapado de propósito se você decidir que a interface é um estilo separado da arena — o que é uma escolha válida, mas tem que ser **escolha**, não acidente.

### 8.2 As 8 regras do conjunto

Se cada desenho for gerado sozinho, você vai ter 42 desenhos bonitos que não conversam entre si. Fixe estas regras **antes** de gerar o primeiro:

1. **Grade.** Símbolos do sistema (moedas, XP, streak): **16×16 ou 24×24 blocos reais**. Estados vazios e produtos: **48×48 ou 64×64**. NPC: **96×96**. Sempre gere na grade real e amplie depois — nunca peça "estilo pixel" numa imagem de 1024px, o resultado é pixel art falso e não dá para converter em SVG.
2. **Paleta fechada.** No máximo 4 tons por objeto + 1 contorno. Base: `#050509` (fundo), `#0D0D16` (card), `#8B5CF6` / `#A855F7` / `#C084FC` (roxo), `#F8FAFC` (claro), `#94A3B8` (cinza), `#22C55E` (verde). Ouro: âmbar. Fogo: amarelo/laranja/vermelho.
3. **Contorno.** Todo objeto com contorno escuro de **1 bloco**, na cor `#0D0D16` ou mais escuro. É isso que faz tudo parecer do mesmo jogo — mais que qualquer outra decisão.
4. **Luz sempre do mesmo canto:** alto à esquerda. Brilho claro em cima à esquerda, sombra embaixo à direita. Nos 42 desenhos.
5. **Nada de degradê liso.** Onde precisar de transição, use **dithering** (o xadrez de pixels alternados) — é a assinatura da era 16-bit, e é o que o `fundotbh.md` já pede para os cenários.
6. **Fundo transparente** em tudo, sem exceção. Os cards do app já têm fundo próprio.
7. **Uma silhueta, um significado.** Antes de gerar, olhe a lista de silhuetas já usadas (4.12).
8. **Gere em lotes, com o mesmo prompt-base.** Desenhos feitos em sessões diferentes do ChatGPT não saem da mesma família: muda o tamanho do pixel, a espessura do contorno, a direção da luz. Você já fez isso certo no `fundotbh.md` — use o mesmo método.

### 8.3 O que custa trocar SVG por imagem (leia antes de reclamar depois)

**1. Peso do arquivo.** Um SVG hoje pesa 0,5 a 2 KB — é texto, vem junto com a página. Uma imagem do ChatGPT sai em 1024×1024 e passa de 1 MB. Referência do seu próprio projeto: `fundodragao.png` tem **2,6 MB** e `dragonboss.png` tem **2,1 MB** — a pasta `/bosses` inteira passa de **13 MB**. Isso é aceitável para 3 cenários enormes que carregam uma vez; seria desastroso para 30 ícones espalhados. **Antes de usar, redimensione para o tamanho real de tela (×2) e salve como WebP.** Um ícone de 128×128 em WebP fica em 3–15 KB, o que é perfeitamente ok.

**2. Não muda de cor sozinho.** O SVG de hoje herda a cor de quem está em volta — é por isso que o mesmo cristal fica roxo aqui e branco ali sem você fazer nada. Numa imagem, a cor está queimada dentro. Consequência prática: se um dia você trocar o roxo da marca, **toda a arte precisa ser gerada de novo.** Feche a paleta antes de gerar 42 arquivos.

**3. Precisa de versão para tela de alta densidade.** Celular novo e Mac têm tela com o dobro ou o triplo de pontos. Uma imagem de 64px numa tela dessas fica borrada. Regra: **gere grande e reduza por número inteiro** — para mostrar a 64px, entregue 128px ou 256px. Nunca reduza por 1,5× ou 2,3×: o quadradinho quebra e perde a forma. E na hora de reduzir, use o modo "vizinho mais próximo" (*nearest neighbor*), nunca o padrão suave — o padrão borra a borda dura, que é justamente o que faz parecer pixel art.

**4. Texto alternativo.** Hoje esses SVGs são marcados como "ignorar" para leitor de tela, e o leitor lê só o texto ao lado — o certo. Ao virar imagem, **você tem que passar `alt=""` explicitamente** nos casos decorativos. Se esquecer, o leitor de tela lê o nome do arquivo em voz alta ("cristal-energia-v2-final.webp").

**5. Se a imagem não carregar.** O SVG está escrito dentro do código: sempre aparece. Uma imagem é um download separado — internet ruim, cache limpo ou nome errado deixam um **buraco vazio** no lugar. Solução barata: pinte o quadrado de fundo com o roxo transparente que já existe, assim a falha vira um quadrado roxo em vez de um vazio.

---

## 9. Checklist — marque conforme for gerando

### Lote 1 — Marca (1 desenho, 3 arquivos)
- [ ] Logo novo (o "2" em pixel)
- [ ] Exportar favicon 32px
- [ ] Exportar ícone de app 512px
- [ ] Exportar imagem de compartilhamento 1200×630

### Lote 2 — NPC (1)
- [ ] Mestre da Guilda (coruja de óculos) — 96×96 blocos

### Lote 3 — Símbolos do sistema (6) — fazer em SVG de blocos
- [ ] Cristal, versão ícone (para 13–18px)
- [ ] Cristal, versão herói (para 44px, com brilho)
- [ ] Moeda de ouro (moeda cunhada com "L") — *só quando existir uma tela de ouro grande*
- [ ] Raio de XP (ou estrela de 4 pontas, se a logo continuar sendo raio)
- [ ] Chama do streak, acesa
- [ ] Chama do streak, apagada (sequência 0)
- [ ] *(opcional)* Fogueira em 5 estágios: apagada / brasa / média / alta / com faíscas

### Lote 4 — Estados vazios (10)
- [ ] Missões vazias — quadro da taverna
- [ ] Dashboard "tudo concluído" — herói vitorioso (**quente e claro, único do grupo**)
- [ ] Amigos vazio — mesa da guilda com cadeiras vazias
- [ ] Suporte sem tickets — pombo pousado
- [ ] Notificações vazias — sino com teia de aranha
- [ ] Busca de amigo sem resultado — cartaz "procura-se"
- [ ] Calendário, dia sem missão — almanaque com folha em branco
- [ ] Calendário, nenhum dia escolhido — almanaque com dedo apontando
- [ ] Foco sem histórico — ampulheta parada
- [ ] Alarmes (serve nos 2 lugares) — galo de vila

### Lote 5 — Loja (12)
- [ ] Definir a moldura de raridade (cinza / azul / roxo / dourado)
- [ ] Adesivos — cartela em leque
- [ ] Chaveiro — argola com brasão da classe
- [ ] Caneca — cerâmica em 3/4 com logo
- [ ] Ecobag — sacola no gancho com brasão
- [ ] Pulseira — silicone roxo em 3/4 *(corrige o relógio)*
- [ ] Planner — livro de quests aberto
- [ ] Mousepad — tapete em perspectiva com mouse em cima *(corrige o mouse)*
- [ ] Boné — de perfil, com bordado
- [ ] Garrafa térmica — inox com brilho vertical *(corrige o copo de refri)*
- [ ] Camiseta — esticada de frente com estampa
- [ ] Pôster — pregado com tachinhas, arte do personagem dentro *(corrige a moldura vazia)*
- [ ] Kit Lendário — baú dourado aberto com os 4 itens

### Lote 6 — Categorias (3)
- [ ] Medalhão do dragão (Profissional)
- [ ] Medalhão do cavaleiro (Pessoal)
- [ ] Medalhão do orc (Saúde)

### Lote 7 — Classes, brasão de reserva (5)
- [ ] Guerreiro — espada e escudo cruzados
- [ ] Ladrão — adaga e capuz
- [ ] Arqueira — arco com flecha encaixada
- [ ] Bruxa — chapéu pontudo com estrela *(tira a colisão com "Pessoal")*
- [ ] Bardo — alaúde

### Lote 8 — Acabamento (4)
- [ ] Pombo voando com carta (cadastro + esqueci a senha)
- [ ] Baú do tesouro (arena de boss) — **checar se não repete o Kit Lendário**
- [ ] Cavalete de pintor (compositor de story)
- [ ] Círculo de runas (fundo do cronômetro de foco)

### Sem gerar arquivo (só código)
- [ ] Rodinha de carregando: 8 quadradinhos girando, em CSS
- [ ] Trocar o `Flame` do Perfil pela chama do Dashboard
- [ ] Trocar o `Gem` do modal de paywall pelo cristal próprio
- [ ] Tirar os emojis soltos (2 de festa nos avisos de nível, 1 de fogo no card de sequência)
- [ ] Apagar o código morto: `FeatureCard`, `PricingCard`, `ChecklistMark`, `features[]`, `sparkleIcon`, `PRO_BENEFITS`

---

### Arquivos que esta auditoria cobre

- `src/components/Logo.tsx` — LogoMark
- `src/components/RewardIcons.tsx` — CrystalIcon, GoldCoinIcon, CapIcon
- `src/components/AnimatedSvgIcon.tsx` — XpBolt, StreakFlame, ChecklistMark (morto), OrbitDecor
- `src/components/GuildMasterFAQ.tsx` — **placeholder do NPC, linhas 205–212**
- `src/components/BossBattleCard.tsx` — TreasureChestIcon (linha 31)
- `src/components/FocusRing.tsx` — não trocar
- `src/components/CharacterBackdrop.tsx` — não trocar por imagem
- `src/data/store.ts` + `ProductCard.tsx` + `RedeemModal.tsx` — os 12 produtos
- `src/data/characterClasses.ts` — as 5 classes
- `src/components/CategoryBadge.tsx` — as 3 categorias
- `src/components/StreakCard.tsx`, `LevelCard.tsx`, `CurrencyBalance.tsx`, `ReferralSection.tsx` — usos dos símbolos
- Estados vazios: `missions/page.tsx:158` · `dashboard/page.tsx:148` · `friends/page.tsx:95` · `support/page.tsx:164` · `alarms/page.tsx:37` e `:116` · `AddFriendModal.tsx:173` · `FocusHistory.tsx:66` · `NotificationsBell.tsx:127` · `FutureMissions.tsx:243` e `:253` · `StoryComposer.tsx:183` · `register/page.tsx:95` · `forgot-password/page.tsx:96`
- `src/app/layout.tsx` — onde entram favicon e ícone de app (hoje não existem)
- Referência de estilo: `docs/fundotbh.md`
