# lvl2do — 100 Melhorias de Design (Visual)

> Lista priorizável de **100 melhorias visuais** para elevar o lvl2do a um padrão premium e coeso.
> Foco em estética, hierarquia, profundidade, microinterações e consistência — **sem mudanças de produto/lógica**.
> Referências usam o design system atual (`tailwind.config.ts`, `globals.css`) e os componentes existentes.

---

## 1. Fundamentos & Design System

1. Criar uma escala de espaçamento semântica (`section`, `card`, `inline`) em vez de valores soltos, garantindo ritmo vertical consistente entre seções (`py-20 sm:py-28` padronizado).
2. Definir tokens de raio nomeados por uso (`radius-card`, `radius-pill`, `radius-chip`) para evitar mistura de `rounded-xl/2xl/3xl` ad-hoc.
3. Padronizar 3 níveis de elevação (`shadow-card`, `shadow-glow-sm`, `shadow-glow`) e documentar quando usar cada um — hoje há sobreposição de uso.
4. Criar uma classe utilitária `surface-1 / surface-2 / surface-3` para os fundos translúcidos (`bg-white/[0.02]`, `/[0.03]`, `/[0.06]`) usados repetidamente.
5. Unificar as bordas translúcidas em tokens (`border-hairline`, `border-hairline-strong`) — hoje variam entre `white/[0.06]` e `white/[0.08]`.
6. Padronizar a borda com gradiente (técnica `p-px + bg-gradient`) num componente `GradientBorder` reutilizável (já usado no FAQ e Pricing).
7. Criar tokens de "glow" (cor + blur) reutilizáveis para os orbes de fundo, evitando repetição de `blur-[100px]/[110px]/[120px]`.
8. Documentar o design system numa página interna `/styleguide` (somente dev) para visualizar cores, sombras, botões e cards num só lugar.

## 2. Tipografia

9. Definir uma escala tipográfica fixa (display-xl/lg/md, body-lg/md/sm) para acabar com tamanhos arbitrários espalhados (`text-[15px]`, etc.).
10. Aumentar levemente o `tracking` negativo nos títulos `font-display` grandes para um look mais "editorial/premium".
11. Aplicar `text-balance` nos títulos de seção e `text-pretty` nos parágrafos longos para quebras de linha mais elegantes.
12. Padronizar `leading-relaxed` em todos os parágrafos de corpo (`text-muted`) para melhorar legibilidade.
13. Criar um estilo consistente de "eyebrow/label" (uppercase + tracking) — hoje há variações entre seções.
14. Usar números tabulares (`tabular-nums`) em XP, níveis, streak e métricas para evitar "dança" de largura ao animar contadores.
15. Reduzir o uso de `text-soft/80` e `text-soft/90` para 1–2 níveis fixos de opacidade de texto, padronizando contraste.

## 3. Cor, Tema & Profundidade

16. Introduzir uma cor de acento secundária (azul/ciano) já presente no FAQ, oficializando-a no tema como `accent` para gradientes roxo→azul.
17. Criar variações de superfície por "altitude" (cards mais ao fundo = mais escuros) para reforçar profundidade na hierarquia.
18. Adicionar um leve `noise/grain` overlay (textura sutil) sobre o fundo escuro para reduzir banding nos gradientes.
19. Refinar o grid tecnológico do `AnimatedBackground` para aparecer também (mais sutil) nas seções internas, não só no topo.
20. Adicionar "vignette" sutil nas bordas da viewport para focar o olhar no centro do conteúdo.
21. Garantir gradientes de marca consistentes (mesmo ângulo 135°) em botões, badges e bordas — padronizar `bg-brand-gradient`.
22. Criar estados de cor por categoria de missão (Profissional/Pessoal/Saúde) com acentos próprios, reaproveitando o padrão de `accent` das classes.
23. Definir um modo de contraste alto (opcional) ajustando `muted` para um cinza mais claro em textos pequenos.

## 4. Hero

24. Adicionar profundidade em camadas no hero (parallax leve no `DashboardMockup` ao mover o mouse) para sensação 3D premium.
25. Animar o gradiente do título (`text-gradient`) com um shimmer lento e discreto na palavra "RPG".
26. Introduzir um brilho que "respira" atrás do mockup (pulse-glow já existe) sincronizado com a entrada do herói.
27. Adicionar um badge de prova social discreto ("Em desenvolvimento • iOS/Android") no lugar dos antigos selos removidos.
28. Melhorar o `DashboardMockup` com micro-animações contínuas (barra de XP que oscila levemente, check aparecendo em loop sutil).
29. Adicionar uma "seta scroll-down" minimalista animada no fim do hero para guiar o usuário à próxima seção.
30. Refinar o espaçamento responsivo do hero no mobile (título um pouco menor, CTAs full-width com mais respiro).

## 5. Problema × Nosso Sistema

31. Adicionar um divisor visual "VS" ou seta entre os cards Problema e Nosso Sistema para reforçar o contraste antes/depois.
32. No card "Problema", dessaturar de fato a arte/itens (filtro grayscale leve) para contrastar com o brilho do card de solução.
33. Animar a "lista que some" do card Problema com opacidade que decai progressivamente em loop sutil (sensação de abandono).
34. Sincronizar a varredura das setas sequenciais (BYD) com um leve glow que percorre a borda do card de solução.
35. Adicionar microcópia/labels nas etapas (ex.: "Passo 1, 2, 3") com numeração estilizada `font-display` semitransparente.

## 6. ClassShowcase (Classes)

36. Adicionar reflexo/sombra projetada sob cada card de classe no marquee para "assentar" os personagens.
37. Aplicar um leve tilt 3D (perspective) nos cards ao passar o mouse, com a arte saltando do card.
38. Inserir o ícone/acento da classe com glow na cor correspondente ao hover (rosa/esmeralda/azul/fúcsia/âmbar).
39. Criar uma máscara de fade superior/inferior além das laterais para o marquee respirar melhor nas bordas.
40. Adicionar um indicador "arraste para explorar" sutil (cursor grab) reforçando a interação prometida.
41. Variar a velocidade das duas fileiras (uma um pouco mais lenta) para um parallax horizontal mais rico.

## 7. Planos (ProShowcase)

42. Adicionar um "selo de destaque" premium (ex.: faixa diagonal ou badge "Mais popular") no card único de plano.
43. Animar a entrada das features com stagger + ícone de check desenhando o traço (`pathLength`).
44. Diferenciar visualmente os dois CTAs com um micro-rótulo ("Recomendado") acima do botão primário.
45. Adicionar comparação visual mensal vs anual (ex.: badge "−44%" ou barra de economia) ao lado do plano anual.
46. Dar à arte do personagem (Bruxa lv100) um halo/partículas mágicas sutis para reforçar o "tudo desbloqueado".

## 8. FAQ — Mestre da Guilda

47. Substituir o placeholder do NPC por moldura "retrato de guilda" (borda ornamentada + leve scanline) enquanto a arte real não chega.
48. Adicionar um indicador de "digitando..." (três pontos) antes do balão revelar a resposta, reforçando o NPC.
49. Tocar um som sutil opcional (toggle) ao trocar de pergunta, no estilo "blip" de RPG.
50. Realçar a opção de diálogo ativa com um chevron animado (desliza levemente) além do glow já existente.
51. Adicionar partículas de "magia" reagindo ao clique na pergunta (burst discreto na cor da marca).

## 9. Header & Navegação

52. Tornar o header translúcido com `backdrop-blur` progressivo conforme o scroll (já há base — refinar a transição).
53. Adicionar um indicador de seção ativa (underline/dot animado) nos links âncora conforme o usuário rola.
54. Animar o `LogoMark` com um micro pulse de glow ao carregar a página.
55. Adicionar um link "FAQ" ao `landingNav` (hoje a seção existe mas não está no menu).
56. Refinar o menu mobile (`MobileMenu`) com stagger nos itens e um leve scale na entrada do drawer.

## 10. Footer

57. Adicionar um CTA compacto no topo do footer ("Pronto para evoluir?") para fechar a página com ação.
58. Inserir ícones de redes sociais minimalistas (placeholder) alinhados ao crédito do estúdio.
59. Animar o brilho da linha superior do footer (gradiente que percorre) de forma muito sutil.
60. Dar hover premium ao chip "SWN STUDIO" (leve scale + glow) antecipando a logo real.

## 11. App Shell (Sidebar / Topbar / Bottom Nav)

61. Adicionar indicador de rota ativa com "pill" deslizante animada (layoutId do Framer Motion) na `Sidebar`.
62. Incluir avatar do personagem + nível em miniatura no topo da `Sidebar`, reforçando a identidade de jogo.
63. Animar a `BottomNav` (mobile) com um realce/elevação do item ativo e leve bounce ao trocar de aba.
64. Padronizar ícones ativos vs inativos (preenchimento/cor) com transição suave entre estados.
65. Adicionar um leve glow na borda da `AppTopbar` quando há notificações não lidas.

## 12. Dashboard

66. Criar uma "hero card" de saudação personalizada ("Bom dia, Guerreiro") com arte da classe ao fundo.
67. Unificar os cards de stats (Level/Streak/XP) num grid com alturas iguais e ícones consistentes.
68. Adicionar barra de progresso de nível com marcação de "próxima recompensa/skin" desbloqueável.
69. Animar a entrada dos cards do dashboard com stagger e um micro-zoom (`scaleIn`).
70. Destacar visualmente as missões do turno atual (Manhã/Tarde/Noite) com acento e ícone de período.

## 13. Missões

71. Refinar o `MissionCard` com estados visuais claros: pendente, concluída (check animado + risco), falhada (esmaecida).
72. Adicionar feedback de XP "voando" do card para a barra de nível ao concluir (animação de partícula).
73. Padronizar os `CategoryBadge`/`Difficulty` com cores e ícones consistentes e legíveis.
74. Melhorar o `NewMissionModal` com preview ao vivo do XP a ganhar e do badge de categoria/dificuldade.
75. Adicionar checkbox custom estilo "selo de missão" (não o checkbox padrão) com animação de selagem.

## 14. Modo Focus / Pomodoro

76. Refinar o `FocusRing` com gradiente cônico animado e brilho que intensifica conforme o tempo passa.
77. Adicionar estado visual de "em foco" (escurecer o restante da UI / modo imersivo) com transição suave.
78. Mostrar partículas/pulsos sutis ao concluir um ciclo Pomodoro, reforçando a recompensa.
79. Padronizar os botões de controle (play/pause/reset) com ícones consistentes e hover premium.

## 15. Alarmes

80. Refinar o `AlarmCard` com horário em tipografia grande (`tabular-nums`) e toggle premium (switch animado).
81. Adicionar visualização dos dias da semana ativos como "pílulas" destacadas vs apagadas.
82. Melhorar o `SoundPicker` com indicação visual de onda sonora ao pré-ouvir o som.

## 16. Progresso / Métricas / Gráficos

83. Estilizar o `XpAreaChart` com gradiente de preenchimento da marca, grid sutil e tooltip custom (dark/glow).
84. Adicionar animação de "desenho" da linha/área do gráfico ao entrar na viewport.
85. Padronizar o `MonthCalendar` com heatmap de atividade (intensidade por XP/missões do dia).
86. Refinar o `PeriodToggle`/`MetricsPeriodToggle` com indicador deslizante animado (segmented control premium).
87. Adicionar "cards de insight" (ex.: melhor dia, categoria mais forte) com ícones e microcópia.

## 17. Perfil / Personagem / Skins

88. Dar ao `SkinCarousel` molduras por tier com cor/ornamento crescente (comum → lendário) e bloqueio visual claro.
89. Adicionar efeito de "desbloqueio" (flash + partículas) ao alcançar o nível de uma nova skin.
90. Exibir a evolução do personagem numa timeline visual (lv1 → lv100) no perfil.
91. Refinar o `ChangeClassModal`/`ChangeOutfitModal` com preview grande, acento da classe e transição entre opções.

## 18. Gamificação & Feedback Visual

92. Padronizar o `XpToast`/`GlobalXpToast` com ícone de raio animado e contador que sobe (`tabular-nums`).
93. Tornar o `LevelUpToast` um momento "épico": flash de luz, partículas e som opcional, com confete pixel-art.
94. Criar um componente de "streak em chamas" que cresce visualmente conforme os dias (intensidade do fogo).
95. Adicionar microfeedback tátil-visual (leve shake/scale) em ações concluídas para reforço positivo.

## 19. Estados: Vazio, Loading, Erro

96. Criar empty states ilustrados e temáticos ("Nenhuma missão hoje — o herói descansa") em vez de texto seco.
97. Adicionar skeletons com shimmer (já há keyframe `shimmer`) para listas de missões, métricas e perfil.
98. Padronizar estados de erro/sucesso com toasts consistentes (cor, ícone, glow) e animação de entrada/saída.

## 20. Detalhes Premium & Acessibilidade Visual

99. Padronizar foco de teclado visível e bonito (`focus-visible:ring` com `ring-offset`) em todos os interativos, e respeitar `prefers-reduced-motion` em todas as animações.
100. Passar um "polish pass" final de pixel-perfect: alinhamentos ópticos, consistência de ícones (mesmo `stroke-width`), contraste mínimo AA em textos pequenos e harmonização dos raios/sombras entre todas as telas.

---

## Sugestão de priorização

- **Quick wins (alto impacto, baixo esforço):** 11, 14, 21, 25, 29, 43, 50, 53, 61, 86, 92.
- **Identidade de jogo (diferenciação):** 22, 36–41, 47–51, 66, 71–75, 88–94.
- **Acabamento premium (passe final):** 17–20, 99, 100.

> Recomendação: tratar como backlog de design. Cada item pode virar um PR pequeno e isolado, mantendo o padrão visual atual do projeto.
