# Cenários das arenas TBH — prompts para geração de imagem

Guia para gerar os 3 fundos das arenas de boss (widget TBH, aba **Missões**).
São 9 prompts: 3 cenários × 3 variações, para você comparar e escolher.

> **Nada disto está implementado.** Hoje as arenas usam os cenários **vetoriais**
> (`src/components/CharacterBackdrop.tsx`). Estas imagens são para substituí-los
> *só nas arenas TBH* — os vetoriais continuam servindo a moldura do perfil e as
> miniaturas de stories.

---

## 1. Onde a imagem vai aparecer

Cada arena é um card com um "palco" de altura fixa, e a imagem preenche esse
palco inteiro (`object-cover`). As medidas reais, tiradas do código:

| Contexto | Largura do card | Altura do palco | Proporção |
|---|---|---|---|
| Desktop (`lg`, 3 colunas) | 392 px | 208 px | **1,88 : 1** |
| Mobile (390 px de tela) | 350 px | 224 px | **1,56 : 1** |

A proporção **muda** entre mobile e desktop, então parte da imagem sempre será
cortada. É a restrição mais importante deste documento: **componha para o corte**.

### Ocupação do palco (o que fica por cima da imagem)

```
┌──────────────────────────────────────────────┐
│ "Brasmor, o Dragão"        ← texto, topo     │  ← escurecido por um scrim
│                                              │
│                                              │
│   ░░░░░░░                      ▓▓▓▓▓▓▓▓▓     │  ← personagem (esq) e boss (dir)
│   ░ HERÓI ░                    ▓  BOSS  ▓    │     são PNGs SOBREPOSTOS
│   ░░░░░░░░                     ▓▓▓▓▓▓▓▓▓▓    │
│   ⚔ 3/5                           ♥ 98/100   │  ← indicadores, base
└──────────────────────────────────────────────┘
     4%→34%                        59%→97%
```

- **Personagem** ocupa de ~4% a ~34% da largura, colado na base.
- **Boss** ocupa de ~59% a ~97% da largura, colado na base.
- A **faixa central (~35%–58%)** é a única parte da imagem que fica sempre à
  vista. É onde o cenário deve contar a sua história.
- Os **cantos inferiores** levam os indicadores (espada/coração) em texto claro
  com sombra — precisam ser **escuros e calmos**, sem detalhe competindo.

---

## 2. Especificação técnica

### Proporção e tamanho

| Opção | Tamanho | Proporção | Margem de segurança necessária |
|---|---|---|---|
| **Recomendada** (gpt-image-1) | **1536 × 1024** | 3:2 (1,50) | **12% em cima e embaixo** |
| Alternativa (DALL·E 3) | 1792 × 1024 | 7:4 (1,75) | 6% em cima/embaixo + 7% nas laterais |

O 1536×1024 é o formato paisagem nativo do gpt-image-1. Com ele, o desktop
corta **10,2% do topo e 10,2% da base**; o mobile corta só 2%. Por isso a
margem de 12%: nada essencial pode viver nessas faixas.

O 1792×1024 fica mais perto da proporção do desktop e corta menos na vertical,
mas passa a cortar as laterais no mobile. Se o gerador oferecer, é ligeiramente
melhor — só troque a margem de segurança conforme a tabela.

### Linha do horizonte

**O horizonte deve ficar a ~60% da altura, medido do topo da imagem.**

Esse número não é estético, é geométrico: com 10% cortado em cima, os 60%
viram ~62% da área visível — que é exatamente onde o chão precisa começar para
os personagens (ancorados na base) parecerem pisando nele, e não flutuando.

**O terço inferior tem que ser chão plano e vazio.** Sem pedras grandes, sem
degraus, sem objetos no primeiro plano: qualquer coisa ali vai colidir com as
sombras elípticas sob os pés dos personagens e denunciar a montagem.

### Idioma dos prompts

Os prompts abaixo estão **em inglês** de propósito — os modelos de imagem
respondem de forma mais consistente e previsível em inglês, especialmente em
termos de composição ("lower third", "horizon line", "eye level"). Cole como
está.

---

## 3. Regras que valem para os 9 prompts

Já estão embutidas em cada prompt (são autocontidos, cole um por vez), mas vale
saber o porquê:

| Regra | Motivo |
|---|---|
| **Sem personagens, criaturas ou pessoas** | O herói e o boss são PNGs separados por cima. Qualquer figura na arte vira um terceiro personagem fantasma. |
| **Sem texto, logo, moldura ou interface** | Vira ruído sob o nome do boss e os indicadores. |
| **Chão plano e vazio no terço inferior** | Onde os personagens pisam. |
| **Bordas e cantos inferiores mais escuros** | Legibilidade do texto branco, e ajuda os sprites a "descolarem" do fundo. |
| **Cores dessaturadas, sem alto contraste no centro** | Os sprites precisam ganhar a atenção. Fundo estridente compete com eles. |
| **Ponto de vista na altura dos olhos** | Câmera baixa ou aérea quebra a ilusão de que os personagens estão no chão. |
| **Mesmo estilo nos três** | As 3 arenas aparecem lado a lado. Estilos diferentes destroem a unidade. |

O estilo pedido é o mesmo nos nove: **pintura digital estilizada de fundo de
jogo** — o que costuma casar bem com arte de personagem em PNG.

---

## 4. Cenário 1 — Dragão (área **Profissional**)
*Ponte medieval de castelo, montanhas ao fundo, período da tarde.*

### Variação 1A — Ponte larga com portaria do castelo

```
Stylized digital painting, fantasy game background art, no characters and no creatures.
A wide medieval stone bridge seen at eye level, its flat empty stone roadway filling the
entire lower third of the image as a clean flat ground plane with no obstacles, no rubble
and no foreground objects. Low crenellated parapets run along both sides of the bridge.
On the left, a large castle gatehouse with a rounded tower recedes into the distance.
Layered blue-grey mountains fill the background under a late afternoon sky with warm
golden light raking from the left and soft clouds. Horizon line placed at 60 percent of
the image height. Muted desaturated palette, cool shadows against warm afternoon light,
gentle atmospheric haze on the mountains. Corners and lower edges noticeably darker,
soft natural vignette. Painterly brushwork, cohesive and calm, low contrast in the middle
of the frame. No text, no logos, no watermark, no user interface, no borders, no people.
```

### Variação 1B — Ponte sobre desfiladeiro, céu de fim de tarde

```
Stylized digital painting, fantasy game background art, no characters and no creatures.
A medieval stone bridge crossing a deep mountain gorge, viewed at eye level. The flat
empty bridge deck occupies the entire lower third as a clean unobstructed ground plane
with no rubble and no foreground objects. Two slender stone towers with pointed roofs
flank the far end of the bridge, small in the distance. Behind them, receding ridges of
blue and violet mountains fade into haze under a warm amber and rose late afternoon sky
with long horizontal clouds. Horizon line at 60 percent of the image height. Desaturated
cinematic palette, soft directional sunlight from the right, deep cool shadows. The
corners and the bottom edges fade noticeably darker in a soft vignette. Painterly game
art, calm and uncluttered in the centre of the frame. No text, no logos, no watermark,
no user interface, no people.
```

### Variação 1C — Ponte com estandartes, picos nevados

```
Stylized digital painting, fantasy game background art, no characters and no creatures.
A broad medieval castle bridge at eye level, its flat empty paved roadway forming a clean
uncluttered ground plane across the entire lower third, free of debris and foreground
objects. Tall banner poles with faded cloth pennants line the far edges of the bridge,
kept low and to the sides. In the background, a castle silhouette on the left and distant
snow-capped peaks under a hazy late afternoon sky, warm sunlight glancing from the upper
left. Horizon line at 60 percent of the image height. Restrained muted colour, dusty
warm light against cool blue shadow, heavy atmospheric perspective. Darker corners and
darker lower edges, soft vignette. Painterly stylised brushwork, quiet composition with
open space in the middle. No text, no logos, no watermark, no user interface, no people.
```

---

## 5. Cenário 2 — Cavaleiro (área **Pessoal**)
*Sala com o trono do rei.*

> **Atenção nos três**: o trono precisa ficar **no centro e ao fundo**, na faixa
> livre entre o herói e o boss. Se ele for para os lados, some atrás de um sprite.

### Variação 2A — Salão amplo com vitrais

```
Stylized digital painting, fantasy game background art, no characters and no creatures.
The interior of a grand medieval throne hall seen straight on at eye level. A polished
flat stone floor fills the entire lower third as a clean empty ground plane with no
furniture, no steps and no objects in the foreground. Centred in the background stands an
empty ornate wooden throne on a low dais, small and distant. Tall stone columns line both
sides and recede into shadow, with narrow stained glass windows casting soft coloured
light. Horizon line, where the floor meets the far wall, at 60 percent of the image
height. Dark muted palette of deep stone grey and violet, warm candlelight pooling at the
centre, deep shadows toward the edges. Corners and lower edges markedly darker, strong
soft vignette. Painterly game art, solemn and uncluttered. No text, no logos, no
watermark, no user interface, no people.
```

### Variação 2B — Tapete vermelho e braseiros

```
Stylized digital painting, fantasy game background art, no characters and no creatures.
Interior of a medieval royal throne room at eye level, symmetrical composition. A flat
stone floor with a faded red carpet runner leads straight back from the viewer and fills
the entire lower third as a clean flat ground plane with nothing standing on it. At the
far end, centred and distant, an empty carved stone throne sits on a raised platform.
Gothic pointed arches line both side walls, with low iron braziers glowing warmly beside
them. Horizon line at 60 percent of the image height. Dark, moody, desaturated palette,
deep purple and charcoal shadows with warm ember light, smoky atmosphere. Corners and the
bottom edges fall into darkness, soft vignette. Painterly stylised game background,
restrained detail, open space at mid frame. No text, no logos, no watermark, no user
interface, no people.
```

### Variação 2C — Salão íntimo com tochas

```
Stylized digital painting, fantasy game background art, no characters and no creatures.
A modest medieval throne chamber seen at eye level. Polished dark marble floor with faint
reflections fills the entire lower third as a clean unobstructed ground plane, empty of
objects. Centred in the background, an empty high-backed throne of dark wood and gold
stands against a stone wall hung with a faded tapestry. Wall-mounted torches on both sides
cast warm pools of light, leaving the corners in deep shadow. Horizon line at 60 percent
of the image height. Intimate, dark and desaturated, warm amber highlights against cold
blue-grey stone, gentle haze. Noticeably darker corners and lower edges, soft vignette.
Painterly game art, calm and simple, minimal detail in the centre. No text, no logos, no
watermark, no user interface, no people.
```

---

## 6. Cenário 3 — Orc (área **Saúde**)
*Campo de neve.*

> **Este é o mais arriscado**: neve é clara, e os indicadores em texto branco
> ficam por cima. Todos os três prompts pedem explicitamente céu de fim de
> tarde/crepúsculo e base escurecida — não peça "sunny snow field", ou o texto
> desaparece.

### Variação 3A — Planície aberta com pinheiros

```
Stylized digital painting, fantasy game background art, no characters and no creatures.
An open snow field at eye level under an overcast late afternoon sky. Smooth flat untouched
snow fills the entire lower third as a clean level ground plane, with no rocks, no drifts
and no objects in the foreground. A dark treeline of snow-laden pine trees runs across the
middle distance, and pale blue-grey mountains rise faintly behind it through the haze.
Horizon line at 60 percent of the image height. Cold desaturated palette of blue-grey,
slate and muted white, soft diffused light with no harsh highlights, gentle falling mist.
The snow is deliberately dimmed and shadowed toward the bottom edge and the corners, strong
soft vignette keeping the lower area dark. Painterly stylised brushwork, quiet and empty.
No text, no logos, no watermark, no user interface, no people.
```

### Variação 3B — Vale nevado com nevasca leve

```
Stylized digital painting, fantasy game background art, no characters and no creatures.
A snowy mountain valley seen at eye level during light snowfall. Flat wind-smoothed snow
covers the entire lower third as a clean empty ground plane with no boulders and no
foreground obstacles. Weathered dark rock formations sit low along both sides in the middle
distance, and a dense dark forest and fading ridgelines occupy the background, softened by
snowfall and haze. Horizon line at 60 percent of the image height. Cold muted palette,
deep blue shadows and dim silver light, heavy atmospheric depth, low overall contrast.
The bottom of the frame and all corners are clearly darker, strong soft vignette. Painterly
game background art, sparse and atmospheric. No text, no logos, no watermark, no user
interface, no people.
```

### Variação 3C — Planície ao crepúsculo

```
Stylized digital painting, fantasy game background art, no characters and no creatures.
A wide snow plain at dusk, seen at eye level. Flat unbroken snow forms a clean empty ground
plane across the entire lower third, with no drifts, rocks or foreground objects. A few
bare dark birch trunks stand sparsely in the middle distance toward the edges, and low
rolling snow hills fade into the background. The twilight sky above carries deep indigo and
faint cold violet light near the horizon. Horizon line at 60 percent of the image height.
Very desaturated cold palette, dim blue and grey, the snow rendered dark and shadowed rather
than bright white, soft glow only near the horizon. Corners and the entire bottom edge fall
into deep shadow, strong soft vignette. Painterly stylised game art, minimal and still.
No text, no logos, no watermark, no user interface, no people.
```

---

## 7. Checklist para escolher entre as variações

Ao comparar as imagens geradas, verifique nesta ordem — as três primeiras são
eliminatórias:

- [ ] **O terço inferior é chão plano e vazio?** Qualquer pedra, degrau ou
      objeto ali inviabiliza a imagem.
- [ ] **O horizonte está por volta de 60% da altura?** Muito alto e os
      personagens parecem colados numa parede; muito baixo e parecem flutuando.
- [ ] **Os cantos de baixo estão escuros?** É onde ficam o `♥ 98/100` e o `⚔ 3/5`
      em texto branco.
- [ ] Não há nenhuma figura, silhueta humana ou criatura na cena.
- [ ] Não há texto, marca d'água nem moldura.
- [ ] O centro (35%–58% da largura) tem o elemento mais interessante da cena —
      é a parte que nunca fica coberta.
- [ ] As três escolhidas parecem do **mesmo jogo** quando vistas lado a lado.
- [ ] Nenhuma área clara demais atrás de onde o boss ou o herói ficam.

**Teste final, o que mais vale:** abra a imagem, reduza para 392×208 e olhe. É
esse o tamanho real no desktop. Detalhe fino simplesmente some.

---

## 8. Depois de escolher

Convenção de nomes, para casar com `src/data/bosses.ts`:

```
public/arenas/dragon-arena.webp     → Profissional
public/arenas/knight-arena.webp     → Pessoal
public/arenas/orc-arena.webp        → Saúde
```

Antes de commitar, **converta para WebP e redimensione para 1536 px de largura**
(ou 1024, que já é 2,6× o tamanho de exibição no desktop). Os PNGs dos bosses
têm 2,1 MB cada — não repita isso com os cenários; três fundos pesados na mesma
página custam caro no mobile.

Quando você tiver as três, é só me mandar: o ponto de plugue é o
`CharacterBackdrop` dentro do `BossBattleCard`, e a troca não afeta o perfil nem
os stories.
