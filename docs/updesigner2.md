# lvl2do — 100 Melhorias de Design (Visual) — Lote 2

> Segundo backlog **visual** para o lvl2do, com foco em **craft fino**: sistema de movimento, profundidade/material, gradientes, componentes (botões, formulários, modais), identidade de marca, sistema visual RPG e acessibilidade visual.
> **Não repete** [updesigner1.md](updesigner1.md) (1º lote visual) nem os lotes funcionais [1](upfuncionalidade1.md) / [2](upfuncionalidade2.md) / [3](upfuncionalidade3.md) / [4](upfuncionalidade4.md).

---

## 1. Movimento & Coreografia

1. **Biblioteca de curvas de easing nomeadas** ("entrance", "exit", "emphasis") padronizando todo o movimento.
2. **Padrões de stagger/orquestração** documentados (durações e delays consistentes entre listas e seções).
3. **Física de mola (spring) calibrada** para toques/arrastes (tensão e fricção padronizadas).
4. **Animações de reordenação (FLIP)** ao concluir/reordenar missões na lista.
5. **Efeito magnético/seguir-cursor** sutil em CTAs principais (desktop).
6. **Contadores animados (count-up)** em XP, nível e métricas ao entrarem na tela.

## 2. Transições de Página & Navegação

7. **Transições entre rotas** (fade/slide) via View Transitions API / AnimatePresence.
8. **Barra de progresso no topo** ao navegar (route loading bar).
9. **Shared element transition** (ex.: card de missão → tela de detalhe).
10. **"Pull to refresh" temático** no mobile.

## 3. Profundidade & Material

11. **Refinar o glassmorphism** (saturação de backdrop + borda de luz no topo dos cards translúcidos).
12. **Sombras em duas camadas** (ambiente suave + direcional curta) para profundidade realista.
13. **Sombras coloridas** sutis (tinta roxa) sob elementos de marca, em vez de preto puro.
14. **Sombras internas/insets** em inputs e trilhas para sensação de "encaixe".
15. **Bloom/halo de luz** nos elementos mais brilhantes (botão primário, nível atual).

## 4. Cor & Gradientes

16. **Mesh gradients** (gradientes em malha) nos fundos de seção, em vez de blobs simples.
17. **Acento dinâmico por classe**: a UI muda o tom de destaque conforme a classe escolhida.
18. **Tratamento duotone** nas artes/imagens para integrá-las à paleta da marca.
19. **Acabamento iridescente/holográfico** para itens "lendários" e conquistas raras.
20. **Gradientes cônicos** em anéis, medalhas e badges (progresso e raridade).
21. **Paletas sazonais opcionais** (eventos) aplicadas só aos acentos, sem quebrar a identidade.

## 5. Tipografia (craft)

22. **Números em fonte display** com peso forte (XP/nível) diferenciados do corpo.
23. **Títulos com contorno/stroke ou leve text-glow** para impacto "gamer".
24. **Headline cinética** (palavras entrando em sequência) nas chamadas principais.
25. **Grid de baseline** para alinhar verticalmente o texto entre colunas.
26. **Limite de comprimento de linha (~65ch)** nos blocos de leitura.
27. **Monoespaçada para estatísticas/tempos** (timers, IDs de missão, seeds).

## 6. Iconografia & Ilustração

28. **Conjunto de ícones próprio e consistente** (mesma grade, peso e cantos).
29. **Ícones em dual-tone** (dois tons da marca) para hierarquia.
30. **Variante de ícones em pixel-art** reforçando o tema RPG em pontos-chave.
31. **Brasões/sigilos por classe** (símbolo único) reutilizáveis na UI.
32. **Divisores e floreios ornamentais** entre seções, no estilo "interface de RPG".
33. **Molduras ornamentais** (pergaminho/runas) para destaques e modais épicos.

## 7. Layout & Composição

34. **Layout "bento grid"** para dashboard e seções de recursos (blocos de tamanhos variados).
35. **Grade de 8pt** rígida para espaçamentos e alinhamentos em todo o app.
36. **Divisores de seção com formas** (diagonal/curva/onda) em vez de linha reta.
37. **Composição assimétrica intencional** nas seções-herói para dinamismo.
38. **Snap de rolagem** entre seções/carrosséis para navegação mais "premium".

## 8. Botões & Controles

39. **Estados completos de botão**: hover, pressed, loading (spinner embutido), disabled, sucesso.
40. **Sheen/brilho** percorrendo o botão primário no hover.
41. **Espaçamento ícone+rótulo e área de toque** padronizados em todos os botões.
42. **Switch/toggle custom** com trilho em gradiente e animação do "knob".
43. **Sliders custom** (volume do foco, etc.) com trilha preenchida e thumb com glow.

## 9. Formulários & Inputs

44. **Foco de input com glow** da marca + borda animada (em vez do outline padrão).
45. **Estados de validação** (erro/sucesso) com cor, ícone e mensagem consistentes.
46. **Floating labels** (rótulo que sobe ao focar) nos campos de texto.
47. **Selects/dropdowns custom** alinhados ao tema escuro (não os nativos).
48. **Campo de busca padronizado** com ícone, atalho e botão de "limpar".

## 10. Modais, Sheets & Popovers

49. **Modais com backdrop blur** + entrada em scale/fade consistentes.
50. **Bottom sheets no mobile** com "alça" de arraste e snap points.
51. **Popovers** (ex.: SchedulePopover) com bico/seta e sombra coerentes.
52. **Botão de fechar e área de toque** padronizados em todos os overlays.
53. **Rolagem interna** com cabeçalho/rodapé fixos e fade nas bordas em modais altos.

## 11. Marca & Identidade

54. **Favicon e ícone de app** refinados (mark da marca) em múltiplos tamanhos.
55. **Splash screen / tela de abertura** com a logo animada.
56. **Imagens de compartilhamento (OG/Twitter)** para cada rota principal.
57. **Páginas 404 e 500 temáticas** ("você se perdeu na masmorra").
58. **Padrão/textura de marca** (pixels/runas) para fundos e e-mails.

## 12. Arte & Direção de Imagem

59. **Tratamento padrão das artes de personagem** (sombra projetada + glow + corte consistente).
60. **Carregamento com blur-up** (placeholder borrado → imagem nítida).
61. **Máscaras/clip-paths temáticos** para recortar artes (hexágono/escudo).
62. **Blobs/SVGs decorativos** consistentes como elementos de fundo reutilizáveis.
63. **Direção de arte por seção** (paleta/iluminação coerente entre blocos).

## 13. Sistema Visual RPG

64. **Sistema de cores de raridade** (comum cinza → lendário dourado/holográfico) aplicado a itens e conquistas.
65. **Card de tooltip de item** com borda na cor da raridade e atributos.
66. **Estilo "diário de missões" (quest log)** com visual de pergaminho/painel rúnico.
67. **Visual da árvore de talentos/skills** (nós, conexões, estados bloqueado/ativo).
68. **Grade de inventário** com slots, raridade e itens equipados destacados.
69. **Ícones de buff/debuff e overlays de cooldown** padronizados.
70. **Números flutuantes de XP** que sobem ao concluir (linguagem visual de feedback).

## 14. Avatares, Badges & Status

71. **Avatares** com anel de nível, ponto de status e fallback com iniciais.
72. **Pilhas de avatares** (grupos/guilda) com sobreposição e contador "+N".
73. **Sistema único de chips/pills** com variantes (tamanho, tom, com/sem ícone).
74. **Insígnias de rank/divisão** (ligas) com formas e "metais" distintos.
75. **Contadores de notificação** (badge numérico) consistentes nos ícones.

## 15. Listas, Tabelas & Dados

76. **Estados de linha** (hover, selecionada, divisores sutis) em listas longas.
77. **Sparklines** (mini-gráficos) embutidos nos cards de métrica.
78. **Estilo coerente de barras e radiais** (cores/cantos/grid) com o tema.
79. **Paleta de data-viz** acessível e consistente para categorias.
80. **Cabeçalhos fixos (sticky)** e zebra sutil em tabelas/listas densas.

## 16. Carregamento & Percebido

81. **Variantes de skeleton por tela** (missão, perfil, métricas) com direção de shimmer coerente.
82. **Imagens progressivas (LQIP)** com placeholder na cor dominante.
83. **UI otimista visual**: a ação aparece concluída antes da confirmação do servidor.
84. **Spinners/indicadores de progresso próprios** da marca (não os genéricos).

## 17. Responsivo & Mobile

85. **Respeitar safe areas** (notch/Dynamic Island) e gestos da barra inferior.
86. **Otimizar a "zona do polegar"** (ações principais ao alcance no mobile).
87. **Escala tipográfica e densidade próprias do mobile** (não só reduzir o desktop).
88. **Modais → bottom sheets** no mobile por padrão.
89. **Layouts dedicados para tablet/landscape** (aproveitar a largura, não esticar).

## 18. Tema Escuro & Conforto Visual

90. **Evitar preto puro** nos fundos (tons levemente azulados) para suavizar o contraste.
91. **Opção "OLED true black"** para economia de bateria e estética.
92. **Atenuar artes muito brilhantes no escuro** (overlay sutil) para conforto.
93. **Modo de baixa luz/quente** (reduz azul) para uso noturno.

## 19. Acessibilidade Visual

94. **Cor nunca como único indicador**: adicionar ícone/rótulo aos estados de status.
95. **Gráficos seguros para daltonismo** (padrões/texturas além da cor).
96. **Áreas de toque mínimas de 44×44px** em todos os controles.
97. **Foco visualmente distinto do hover** (não confundir teclado e mouse).
98. **Modo de transparência reduzida** (trocar blur por superfícies sólidas).

## 20. Detalhes Finais & Microcraft

99. **Seleção de texto, caret e scrollbar na cor da marca**, com underline de link animado.
100. **Cantos "squircle"** e consistência de raio aninhado (raio externo > interno) em todos os elementos.

---

## Sugestão de priorização

- **Sistemas base (fazer primeiro):** 1, 3, 28, 35, 64.
- **Polish de componentes (impacto diário):** 39, 44, 49, 71, 76.
- **Flair RPG (diferenciação):** 19, 30, 31, 66, 70.
- **Acabamento & acessibilidade:** 94, 96, 97, 100.

> Recomendação: priorize os **sistemas base** (movimento, profundidade, ícones, grade, raridade) antes do polish pontual — eles tornam todas as outras melhorias mais rápidas e consistentes. Combine com o 1º lote visual para um "design pass" completo.
