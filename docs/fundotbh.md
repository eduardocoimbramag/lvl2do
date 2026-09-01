# Cenários das arenas TBH — prompts para geração de imagem

Guia para gerar os 3 fundos das arenas de boss (widget TBH, aba **Missões**).
São 9 prompts: 3 cenários × 3 variações, para você comparar e escolher.

**Cada prompt é autocontido** — traz tamanho, proporção, enquadramento, luz,
estilo e exclusões. É colar um bloco inteiro no GPT Image e enviar, sem
precisar acrescentar nada.

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
cortada. É a restrição mais importante deste documento, e por isso todo prompt
abaixo já diz ao modelo onde não pode haver nada essencial.

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

## 2. Por que os números dos prompts são esses

Os prompts pedem **1536 × 1024 (3:2)**, **horizonte a 60% da altura** e **terço
inferior vazio**. Não é gosto, é geometria:

- **1536 × 1024** é o formato paisagem nativo do gpt-image-1.
- Com ele, o desktop corta **10,2% do topo e 10,2% da base** (o mobile corta só
  2%). Daí a instrução de manter o essencial longe dessas faixas.
- **Horizonte a 60%**: com 10% cortado em cima, isso vira ~62% da área visível —
  exatamente onde o chão precisa começar para os personagens (ancorados na base
  do card) parecerem pisando nele, e não flutuando.
- **Terço inferior plano e vazio**: é onde ficam as sombras elípticas sob os pés.
  Qualquer pedra ou degrau ali colide com elas e denuncia a montagem.

### Se você usar DALL·E 3 em vez do gpt-image-1

Troque a primeira linha do prompt para `1792 × 1024 pixels (7:4 aspect ratio)` e
a linha do corte para `about 4% at the top and 4% at the bottom, and about 5% on
each side`. O resto vale igual.

### Estilo: pixel art detalhado, não 8-bit chapado

Medi a arte que já está no projeto antes de escrever os prompts:

| | Medida |
|---|---|
| `public/characters/guerreirolv1.webp` | 800 × 800 px, grade nativa de pixel ~400 px (blocos de 2 px) |
| Cores distintas nas bordas de forma | **22.445** |
| `public/bosses/orcboss.png` | 1254 × 1254 px, mesma linguagem visual |

Vinte e dois mil tons não é 8-bit. A arte do jogo é **pixel art de RPG
detalhado** — grade de pixel visível, mas com sombreado rico, anti-aliasing nas
bordas e proporções semi-realistas. A referência certa é a era **16-bit
(Super Nintendo)**, não NES.

Por isso os prompts pedem *"16-bit era pixel art, Super Nintendo JRPG
background"* e **não** *"8-bit"*. Se pedissem 8-bit de verdade — blocos enormes,
paleta de 16 cores, sem sombreado — o cenário brigaria com os sprites em vez de
combinar.

### Quão grossa deve ser a grade de pixel

Os prompts pedem a arte "como se desenhada a ~256 × 170 px e ampliada". Esse
número vem de uma conta:

- O cenário aparece a **392 px de largura** no desktop.
- Com grade nativa de 256, cada pixel de arte vira ~1,5 px de tela: a textura de
  pixel art é **perceptível** sem virar bloco gigante.
- Se a grade fosse fina demais (400+, como a dos sprites), a pixelização
  simplesmente sumiria no tamanho real e a imagem viraria uma ilustração comum.

**Tensão que vale conhecer:** os sprites têm grade mais fina que a pedida para o
cenário, mas aparecem bem pequenos (personagem a 132 px, vindo de uma arte de
800 px). No tamanho real, a pixelização deles quase não se lê. Um cenário com
grade um pouco mais grossa é o que faz o conjunto *parecer* pixel art. Se na
prática ficar grosso demais, troque `256 by 170` por `384 by 256` no prompt.

Os prompts também pedem **dithering** nos céus e nas transições de luz — é a
marca registrada dos fundos 16-bit e o que evita degradê liso de ilustração.

### Idioma

Os prompts estão **em inglês** de propósito — os modelos de imagem são bem mais
consistentes com termos de composição (*"lower third"*, *"horizon line"*,
*"eye level"*) em inglês. Cole como está.

---

## 3. Cenário 1 — Dragão (área **Profissional**)
*Ponte medieval de castelo, montanhas ao fundo, período da tarde.*

### Variação 1A — Ponte larga com portaria do castelo

```
Generate a landscape image, 1536 x 1024 pixels, 3:2 aspect ratio.

PURPOSE: a background plate for a game UI panel. Two pixel-art character sprites — a hero on
the left and a boss on the right — will be composited on top of this image later, standing on
the ground. The image itself must contain no characters of any kind.

SCENE: a wide medieval stone bridge, seen straight on at eye level. Low crenellated stone
parapets run along both sides of the bridge. On the left, a large castle gatehouse with a
rounded tower recedes into the distance. Layered blue-grey mountains fill the background
under a late afternoon sky with soft clouds.

COMPOSITION (strict):
- Eye-level camera, straight-on view, no tilt, not aerial and not low angle.
- Horizon line at 60 percent of the image height, measured from the top.
- The entire lower third of the image must be flat, level, empty stone roadway: a clean
  unobstructed ground plane with no rocks, no rubble, no steps, no plants and no
  foreground objects whatsoever.
- The image will be cropped in use by about 10 percent at the top and 10 percent at the
  bottom, so keep every important element well away from those edges.
- Place the most interesting part of the scene in the middle of the frame, between 35 and
  58 percent of the width. The left and right thirds will be covered by character sprites,
  so keep them simple.

LIGHT AND COLOR: warm golden afternoon sunlight raking in from the left, cool blue shadows,
gentle atmospheric haze on the mountains rendered with dithering. Muted and desaturated
overall, low contrast in the centre of the frame. The four corners and the entire bottom
edge must be clearly darker, because white text will be overlaid there.

STYLE: 16-bit era pixel art, in the style of a Super Nintendo JRPG background. Drawn as if
at roughly 256 by 170 pixels and then scaled up, so the square pixels are clearly visible.
Hard-edged pixels with crisp boundaries, no blur, no soft focus, no photographic depth of
field. Limited colour palette with ordered dithering for the sky gradients and for shading.
Detailed and richly shaded within the pixel constraints — a high-quality modern pixel-art
RPG background, not a simple flat 8-bit console screen.

EXCLUDE: no people, no characters, no creatures, no animals, no text, no letters, no
numbers, no logos, no watermark, no user interface elements, no frames and no borders.
Not smooth vector art, not a photograph, not a 3D render, not a soft digital painting —
the square pixel grid must be visible throughout.
```

### Variação 1B — Ponte sobre desfiladeiro, céu de fim de tarde

```
Generate a landscape image, 1536 x 1024 pixels, 3:2 aspect ratio.

PURPOSE: a background plate for a game UI panel. Two pixel-art character sprites — a hero on
the left and a boss on the right — will be composited on top of this image later, standing on
the ground. The image itself must contain no characters of any kind.

SCENE: a medieval stone bridge crossing a deep mountain gorge, viewed at eye level. Two
slender stone towers with pointed roofs flank the far end of the bridge, small in the
distance. Behind them, receding ridges of blue and violet mountains fade into haze under a
warm amber and rose late afternoon sky with long horizontal clouds.

COMPOSITION (strict):
- Eye-level camera, straight-on view, no tilt, not aerial and not low angle.
- Horizon line at 60 percent of the image height, measured from the top.
- The entire lower third of the image must be the flat, level, empty bridge deck: a clean
  unobstructed ground plane with no rocks, no rubble, no steps and no foreground objects
  whatsoever.
- The image will be cropped in use by about 10 percent at the top and 10 percent at the
  bottom, so keep every important element well away from those edges.
- Place the most interesting part of the scene in the middle of the frame, between 35 and
  58 percent of the width. The left and right thirds will be covered by character sprites,
  so keep them simple.

LIGHT AND COLOR: soft directional late afternoon sunlight from the right, deep cool shadows,
layered atmospheric depth on the distant ridges, the sky gradient built with visible
dithering bands. Desaturated cinematic palette, low contrast in the centre of the frame.
The four corners and the entire bottom edge must be clearly darker, because white text
will be overlaid there.

STYLE: 16-bit era pixel art, in the style of a Super Nintendo JRPG background. Drawn as if
at roughly 256 by 170 pixels and then scaled up, so the square pixels are clearly visible.
Hard-edged pixels with crisp boundaries, no blur, no soft focus, no photographic depth of
field. Limited colour palette with ordered dithering for the sky gradients and for shading.
Detailed and richly shaded within the pixel constraints — a high-quality modern pixel-art
RPG background, not a simple flat 8-bit console screen.

EXCLUDE: no people, no characters, no creatures, no animals, no text, no letters, no
numbers, no logos, no watermark, no user interface elements, no frames and no borders.
Not smooth vector art, not a photograph, not a 3D render, not a soft digital painting —
the square pixel grid must be visible throughout.
```

### Variação 1C — Ponte com estandartes, picos nevados

```
Generate a landscape image, 1536 x 1024 pixels, 3:2 aspect ratio.

PURPOSE: a background plate for a game UI panel. Two pixel-art character sprites — a hero on
the left and a boss on the right — will be composited on top of this image later, standing on
the ground. The image itself must contain no characters of any kind.

SCENE: a broad medieval castle bridge at eye level. Tall banner poles with faded cloth
pennants line the far edges of the bridge, kept low and to the sides. In the background, a
castle silhouette on the left and distant snow-capped peaks under a hazy late afternoon sky.

COMPOSITION (strict):
- Eye-level camera, straight-on view, no tilt, not aerial and not low angle.
- Horizon line at 60 percent of the image height, measured from the top.
- The entire lower third of the image must be flat, level, empty paved roadway: a clean
  unobstructed ground plane with no rocks, no debris, no steps and no foreground objects
  whatsoever.
- The image will be cropped in use by about 10 percent at the top and 10 percent at the
  bottom, so keep every important element well away from those edges.
- Place the most interesting part of the scene in the middle of the frame, between 35 and
  58 percent of the width. The left and right thirds will be covered by character sprites,
  so keep them simple.

LIGHT AND COLOR: dusty warm sunlight glancing from the upper left against cool blue shadow,
strong atmospheric perspective with the far peaks lightened by dithered haze. Restrained
muted colour, low contrast in the centre of the frame. The four corners and the entire
bottom edge must be clearly darker, because white text will be overlaid there.

STYLE: 16-bit era pixel art, in the style of a Super Nintendo JRPG background. Drawn as if
at roughly 256 by 170 pixels and then scaled up, so the square pixels are clearly visible.
Hard-edged pixels with crisp boundaries, no blur, no soft focus, no photographic depth of
field. Limited colour palette with ordered dithering for the sky gradients and for shading.
Detailed and richly shaded within the pixel constraints — a high-quality modern pixel-art
RPG background, not a simple flat 8-bit console screen.

EXCLUDE: no people, no characters, no creatures, no animals, no text, no letters, no
numbers, no logos, no watermark, no user interface elements, no frames and no borders.
Not smooth vector art, not a photograph, not a 3D render, not a soft digital painting —
the square pixel grid must be visible throughout.
```

---

## 4. Cenário 2 — Cavaleiro (área **Pessoal**)
*Sala com o trono do rei.*

> **Atenção nos três**: o trono precisa ficar **centralizado e ao fundo**, na
> faixa livre entre o herói e o boss. Se ele for para os lados, some atrás de um
> sprite. Todos os prompts abaixo já pedem isso explicitamente.

### Variação 2A — Salão amplo com vitrais

```
Generate a landscape image, 1536 x 1024 pixels, 3:2 aspect ratio.

PURPOSE: a background plate for a game UI panel. Two pixel-art character sprites — a hero on
the left and a boss on the right — will be composited on top of this image later, standing on
the ground. The image itself must contain no characters of any kind.

SCENE: the interior of a grand medieval throne hall, seen straight on at eye level.
Centred in the background stands an empty ornate wooden throne on a low dais, small and
distant. Tall stone columns line both side walls and recede into shadow, with narrow
stained glass windows casting soft coloured light.

COMPOSITION (strict):
- Eye-level camera, straight-on view, no tilt, not aerial and not low angle.
- Horizon line at 60 percent of the image height, measured from the top.
- The entire lower third of the image must be flat, level, empty polished stone floor: a
  clean unobstructed ground plane with no furniture, no steps, no rugs and no foreground
  objects whatsoever.
- The image will be cropped in use by about 10 percent at the top and 10 percent at the
  bottom, so keep every important element well away from those edges.
- The throne must sit centred, between 35 and 58 percent of the width. The left and right
  thirds will be covered by character sprites, so keep them simple and dark.

LIGHT AND COLOR: warm candlelight pooling at the centre, deep shadows toward the edges, the
light falloff rendered with dithering rather than smooth gradients. Dark muted palette of
deep stone grey and violet, low contrast in the centre of the frame. The four corners and
the entire bottom edge must be clearly darker, because white text will be overlaid there.

STYLE: 16-bit era pixel art, in the style of a Super Nintendo JRPG background. Drawn as if
at roughly 256 by 170 pixels and then scaled up, so the square pixels are clearly visible.
Hard-edged pixels with crisp boundaries, no blur, no soft focus, no photographic depth of
field. Limited colour palette with ordered dithering for the sky gradients and for shading.
Detailed and richly shaded within the pixel constraints — a high-quality modern pixel-art
RPG background, not a simple flat 8-bit console screen.

EXCLUDE: no people, no characters, no creatures, no animals, no text, no letters, no
numbers, no logos, no watermark, no user interface elements, no frames and no borders.
Not smooth vector art, not a photograph, not a 3D render, not a soft digital painting —
the square pixel grid must be visible throughout.
```

### Variação 2B — Tapete vermelho e braseiros

```
Generate a landscape image, 1536 x 1024 pixels, 3:2 aspect ratio.

PURPOSE: a background plate for a game UI panel. Two pixel-art character sprites — a hero on
the left and a boss on the right — will be composited on top of this image later, standing on
the ground. The image itself must contain no characters of any kind.

SCENE: the interior of a medieval royal throne room at eye level, symmetrical composition.
A faded red carpet runner leads straight back from the viewer toward an empty carved stone
throne on a raised platform at the far end, centred and distant. Gothic pointed arches line
both side walls, with low iron braziers glowing warmly beside them.

COMPOSITION (strict):
- Eye-level camera, straight-on view, no tilt, not aerial and not low angle.
- Horizon line at 60 percent of the image height, measured from the top.
- The entire lower third of the image must be flat, level, empty stone floor with the flat
  carpet lying on it: a clean unobstructed ground plane with nothing standing on it, no
  steps and no foreground objects whatsoever.
- The image will be cropped in use by about 10 percent at the top and 10 percent at the
  bottom, so keep every important element well away from those edges.
- The throne must sit centred, between 35 and 58 percent of the width. The left and right
  thirds will be covered by character sprites, so keep them simple and dark.

LIGHT AND COLOR: warm ember light from the braziers, smoky atmosphere, deep purple and
charcoal shadows, glow falloff built from dithered bands. Dark, moody and desaturated, low
contrast in the centre of the frame. The four corners and the entire bottom edge must fall
into darkness, because white text will be overlaid there.

STYLE: 16-bit era pixel art, in the style of a Super Nintendo JRPG background. Drawn as if
at roughly 256 by 170 pixels and then scaled up, so the square pixels are clearly visible.
Hard-edged pixels with crisp boundaries, no blur, no soft focus, no photographic depth of
field. Limited colour palette with ordered dithering for the sky gradients and for shading.
Detailed and richly shaded within the pixel constraints — a high-quality modern pixel-art
RPG background, not a simple flat 8-bit console screen.

EXCLUDE: no people, no characters, no creatures, no animals, no text, no letters, no
numbers, no logos, no watermark, no user interface elements, no frames and no borders.
Not smooth vector art, not a photograph, not a 3D render, not a soft digital painting —
the square pixel grid must be visible throughout.
```

### Variação 2C — Salão íntimo com tochas

```
Generate a landscape image, 1536 x 1024 pixels, 3:2 aspect ratio.

PURPOSE: a background plate for a game UI panel. Two pixel-art character sprites — a hero on
the left and a boss on the right — will be composited on top of this image later, standing on
the ground. The image itself must contain no characters of any kind.

SCENE: a modest medieval throne chamber seen at eye level. Centred in the background, an
empty high-backed throne of dark wood and gold stands against a stone wall hung with a
faded tapestry. Wall-mounted torches on both side walls cast warm pools of light, leaving
the corners in deep shadow.

COMPOSITION (strict):
- Eye-level camera, straight-on view, no tilt, not aerial and not low angle.
- Horizon line at 60 percent of the image height, measured from the top.
- The entire lower third of the image must be flat, level, empty polished dark marble floor
  with faint reflections: a clean unobstructed ground plane with no furniture, no steps and
  no foreground objects whatsoever.
- The image will be cropped in use by about 10 percent at the top and 10 percent at the
  bottom, so keep every important element well away from those edges.
- The throne must sit centred, between 35 and 58 percent of the width. The left and right
  thirds will be covered by character sprites, so keep them simple and dark.

LIGHT AND COLOR: warm amber torchlight against cold blue-grey stone, gentle haze, light pools
shaded with dithering. Intimate, dark and desaturated, low contrast in the centre of the
frame. The four corners and the entire bottom edge must be clearly darker, because white
text will be overlaid there.

STYLE: 16-bit era pixel art, in the style of a Super Nintendo JRPG background. Drawn as if
at roughly 256 by 170 pixels and then scaled up, so the square pixels are clearly visible.
Hard-edged pixels with crisp boundaries, no blur, no soft focus, no photographic depth of
field. Limited colour palette with ordered dithering for the sky gradients and for shading.
Detailed and richly shaded within the pixel constraints — a high-quality modern pixel-art
RPG background, not a simple flat 8-bit console screen.

EXCLUDE: no people, no characters, no creatures, no animals, no text, no letters, no
numbers, no logos, no watermark, no user interface elements, no frames and no borders.
Not smooth vector art, not a photograph, not a 3D render, not a soft digital painting —
the square pixel grid must be visible throughout.
```

---

## 5. Cenário 3 — Orc (área **Saúde**)
*Campo de neve.*

> **Este é o mais arriscado**: neve é clara, e os indicadores em texto branco
> ficam por cima dela. Os três prompts pedem explicitamente fim de tarde ou
> crepúsculo e a neve escurecida na base. **Não troque por "sunny snow field"**,
> ou o `⚔ 3/5` some.

### Variação 3A — Planície aberta com pinheiros

```
Generate a landscape image, 1536 x 1024 pixels, 3:2 aspect ratio.

PURPOSE: a background plate for a game UI panel. Two pixel-art character sprites — a hero on
the left and a boss on the right — will be composited on top of this image later, standing on
the ground. The image itself must contain no characters of any kind.

SCENE: an open snow field at eye level under an overcast late afternoon sky. A dark
treeline of snow-laden pine trees runs across the middle distance, and pale blue-grey
mountains rise faintly behind it through the haze.

COMPOSITION (strict):
- Eye-level camera, straight-on view, no tilt, not aerial and not low angle.
- Horizon line at 60 percent of the image height, measured from the top.
- The entire lower third of the image must be smooth, flat, untouched snow: a clean level
  ground plane with no rocks, no drifts, no footprints and no foreground objects whatsoever.
- The image will be cropped in use by about 10 percent at the top and 10 percent at the
  bottom, so keep every important element well away from those edges.
- Place the most interesting part of the scene in the middle of the frame, between 35 and
  58 percent of the width. The left and right thirds will be covered by character sprites,
  so keep them simple.

LIGHT AND COLOR: soft diffused overcast light with no harsh highlights, gentle falling mist,
sky and haze built from dithered bands. Cold desaturated palette of blue-grey, slate and
muted white, low contrast in the centre of the frame. Important: the snow must be
deliberately dimmed and shadowed toward the bottom edge and the four corners — it must not
be bright white there, because white text will be overlaid on those areas.

STYLE: 16-bit era pixel art, in the style of a Super Nintendo JRPG background. Drawn as if
at roughly 256 by 170 pixels and then scaled up, so the square pixels are clearly visible.
Hard-edged pixels with crisp boundaries, no blur, no soft focus, no photographic depth of
field. Limited colour palette with ordered dithering for the sky gradients and for shading.
Detailed and richly shaded within the pixel constraints — a high-quality modern pixel-art
RPG background, not a simple flat 8-bit console screen.

EXCLUDE: no people, no characters, no creatures, no animals, no text, no letters, no
numbers, no logos, no watermark, no user interface elements, no frames and no borders.
Not smooth vector art, not a photograph, not a 3D render, not a soft digital painting —
the square pixel grid must be visible throughout.
```

### Variação 3B — Vale nevado com nevasca leve

```
Generate a landscape image, 1536 x 1024 pixels, 3:2 aspect ratio.

PURPOSE: a background plate for a game UI panel. Two pixel-art character sprites — a hero on
the left and a boss on the right — will be composited on top of this image later, standing on
the ground. The image itself must contain no characters of any kind.

SCENE: a snowy mountain valley seen at eye level during light snowfall. Weathered dark rock
formations sit low along both sides in the middle distance, and a dense dark forest with
fading ridgelines occupies the background, softened by snowfall and haze.

COMPOSITION (strict):
- Eye-level camera, straight-on view, no tilt, not aerial and not low angle.
- Horizon line at 60 percent of the image height, measured from the top.
- The entire lower third of the image must be flat wind-smoothed snow: a clean level ground
  plane with no boulders, no drifts and no foreground obstacles whatsoever. Keep the rock
  formations in the middle distance, never in the foreground.
- The image will be cropped in use by about 10 percent at the top and 10 percent at the
  bottom, so keep every important element well away from those edges.
- Place the most interesting part of the scene in the middle of the frame, between 35 and
  58 percent of the width. The left and right thirds will be covered by character sprites,
  so keep them simple.

LIGHT AND COLOR: dim silver light, deep blue shadows, layered atmospheric depth with the far
ridges lightened by dithered haze. Cold muted palette, low overall contrast. Important: the
snow must be clearly darker at the bottom edge and in the four corners — it must not be
bright white there, because white text will be overlaid on those areas.

STYLE: 16-bit era pixel art, in the style of a Super Nintendo JRPG background. Drawn as if
at roughly 256 by 170 pixels and then scaled up, so the square pixels are clearly visible.
Hard-edged pixels with crisp boundaries, no blur, no soft focus, no photographic depth of
field. Limited colour palette with ordered dithering for the sky gradients and for shading.
Detailed and richly shaded within the pixel constraints — a high-quality modern pixel-art
RPG background, not a simple flat 8-bit console screen.

EXCLUDE: no people, no characters, no creatures, no animals, no text, no letters, no
numbers, no logos, no watermark, no user interface elements, no frames and no borders.
Not smooth vector art, not a photograph, not a 3D render, not a soft digital painting —
the square pixel grid must be visible throughout.
```

### Variação 3C — Planície ao crepúsculo

```
Generate a landscape image, 1536 x 1024 pixels, 3:2 aspect ratio.

PURPOSE: a background plate for a game UI panel. Two pixel-art character sprites — a hero on
the left and a boss on the right — will be composited on top of this image later, standing on
the ground. The image itself must contain no characters of any kind.

SCENE: a wide snow plain at dusk, seen at eye level. A few bare dark birch trunks stand
sparsely in the middle distance toward the edges, and low rolling snow hills fade into the
background. The twilight sky above carries deep indigo with faint cold violet light near
the horizon.

COMPOSITION (strict):
- Eye-level camera, straight-on view, no tilt, not aerial and not low angle.
- Horizon line at 60 percent of the image height, measured from the top.
- The entire lower third of the image must be flat unbroken snow: a clean level ground
  plane with no drifts, no rocks, no tree trunks and no foreground objects whatsoever.
- The image will be cropped in use by about 10 percent at the top and 10 percent at the
  bottom, so keep every important element well away from those edges.
- Place the most interesting part of the scene in the middle of the frame, between 35 and
  58 percent of the width. The left and right thirds will be covered by character sprites,
  so keep them simple.

LIGHT AND COLOR: very desaturated cold palette of dim blue and grey, with a soft glow only near
the horizon built from dithered bands. Important: render the snow dark and shadowed rather
than bright white, and let the four corners and the entire bottom edge fall into deep
shadow, because white text will be overlaid on those areas.

STYLE: 16-bit era pixel art, in the style of a Super Nintendo JRPG background. Drawn as if
at roughly 256 by 170 pixels and then scaled up, so the square pixels are clearly visible.
Hard-edged pixels with crisp boundaries, no blur, no soft focus, no photographic depth of
field. Limited colour palette with ordered dithering for the sky gradients and for shading.
Detailed and richly shaded within the pixel constraints — a high-quality modern pixel-art
RPG background, not a simple flat 8-bit console screen.

EXCLUDE: no people, no characters, no creatures, no animals, no text, no letters, no
numbers, no logos, no watermark, no user interface elements, no frames and no borders.
Not smooth vector art, not a photograph, not a 3D render, not a soft digital painting —
the square pixel grid must be visible throughout.
```

---

## 6. Checklist para escolher entre as variações

Ao comparar as imagens geradas, verifique nesta ordem — as três primeiras são
eliminatórias:

- [ ] **O terço inferior é chão plano e vazio?** Qualquer pedra, degrau ou
      objeto ali inviabiliza a imagem.
- [ ] **O horizonte está por volta de 60% da altura?** Muito alto e os
      personagens parecem colados numa parede; muito baixo e parecem flutuando.
- [ ] **Os cantos de baixo estão escuros?** É onde ficam o `♥ 98/100` e o `⚔ 3/5`
      em texto branco.
- [ ] **É pixel art de verdade?** A grade de pixels quadrados tem que ser
      visível. Se saiu ilustração lisa ou com desfoque fotográfico, descarte.
- [ ] Não há nenhuma figura, silhueta humana ou criatura na cena.
- [ ] Não há texto, marca d'água nem moldura.
- [ ] O centro (35%–58% da largura) tem o elemento mais interessante da cena —
      é a parte que nunca fica coberta.
- [ ] As três escolhidas parecem do **mesmo jogo** quando vistas lado a lado —
      e, principalmente, do mesmo jogo que os sprites do herói e do boss.
- [ ] A grade de pixel do cenário é parecida entre as três (uma mais grossa que
      as outras quebra a unidade).
- [ ] Nenhuma área clara demais atrás de onde o boss ou o herói ficam.

**Teste final, o que mais vale:** abra a imagem, reduza para 392×208 e olhe. É
esse o tamanho real no desktop. Detalhe fino simplesmente some.

---

## 7. Depois de escolher

Convenção de nomes, para casar com `src/data/bosses.ts`:

```
public/arenas/dragon-arena.webp     → Profissional
public/arenas/knight-arena.webp     → Pessoal
public/arenas/orc-arena.webp        → Saúde
```

Antes de commitar, **converta para WebP**. Os PNGs dos bosses têm 2,1 MB cada —
não repita isso com os cenários; três fundos pesados na mesma página custam caro
no mobile.

Ao redimensionar pixel art, **use divisões inteiras e vizinho-mais-próximo**
(`nearest neighbor`), nunca interpolação suave: 1536 → 768 (÷2) preserva a grade;
1536 → 1000 a destrói, e o resultado fica embaçado justamente onde o charme está.
768 px de largura já é quase o dobro dos 392 px de exibição no desktop.

Quando você tiver as três, é só me mandar: o ponto de plugue é o
`CharacterBackdrop` dentro do `BossBattleCard`, e a troca não afeta o perfil nem
os stories.
