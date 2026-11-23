# Design system do Vem Pedroca (interface)

Fonte da direção de arte: **Pitch oficial do Vem Pedroca** (16 páginas). Cores amostradas das páginas e do logotipo, fontes lidas do próprio PDF. Nada de identidade nova: a interface só traz para o jogo o que já está na marca.

Arquivos:

- `src/ui/theme.css`: tokens e componentes base (botões, painéis, etiquetas, decoração).
- `src/ui/Brand.tsx`: elementos gráficos (faixas, blocos, ondas, arcos, trilhas, título em blocos), ícones em pixel e estrelas.
- `src/styles.css`: as telas, usando só os tokens.

## Regras rápidas

1. **Fora da fase, papel branco; na fase, moldura escura.** O cenário em pixel precisa de fundo neutro para se destacar; o HUD e os painéis por cima seguem a marca.
2. **Cor nunca sozinha.** Todo estado tem palavra ou ícone junto (✓ concluída, cadeado bloqueada, "Quase!" com ✗, letra + cor nas alternativas).
3. **Contorno preto de 3 px e cantos retos (4 px).** Cantos redondos só nos balões de fala.
4. **Sombra dura deslocada, sem desfoque.** Ela indica o que é clicável (botões, alternativas) e "assina" os painéis. Sem brilho, vidro ou gradiente decorativo.
5. **Um par de blocos vermelho + verde no canto inferior direito de todo painel**, como no pitch.
6. **Personagens só com arte oficial:** ilustrações do pitch em `public/assets/marca/` (extraídas do PDF, sem retoque) e sprites/retratos em `public/assets/original/`.

## Cores (`--vp-*`)

| Token | Valor | Onde aparece no pitch | Uso na interface |
|---|---|---|---|
| `coral` | `#ff5757` | títulos | títulos grandes (≥ 24 px bold); contraste 3:1, nunca em texto pequeno |
| `red` | `#ce1e24` | "V" do logo, blocos | botão principal (texto branco 5,6:1), bloco "Fase" da vitória |
| `blue` | `#4aa3df` | subtítulos, fundo da página de contato | fundo da vitória, anel do retrato |
| `blue-d` | `#1b62a3` | — (escurecido) | subtítulos sobre branco (5,9:1) |
| `cyan` | `#0cc0df` | faixa diagonal | faixas, foco do teclado |
| `yellow` | `#f8d44a` | faixa e blocos | botão de destaque, etiquetas, pausa |
| `amber` | `#fcba12` | "m" do logo | bloco ?, mundo 1 |
| `green` | `#22b61e` | bloco "Pedroca" do logo | ícones, bloco do canto |
| `green-d` | `#12780f` | — (escurecido) | botão de confirmar/continuar (texto branco 5,4:1) |
| `purple` | `#7a4fc4` | onda da camiseta | power-up, ondas |
| `ink` | `#14181e` | texto e contornos | texto, contornos, fundo da fase |
| `cream` | `#fff6d6` / `trail #fdf1c4` | trilhas do fundo | fundo de dica, trilhas |

As cores dos 4 mundos (`src/data/worlds.json`) passaram a usar a marca: âmbar, verde, ciano e coral.

## Tipografia

| Papel | Fonte | Detalhe |
|---|---|---|
| Títulos | **League Spartan** 800–900 (do pitch) | caixa alta |
| Subtítulos | League Spartan 800, azul | caixa alta, menores |
| Textos, perguntas, diálogos | **Montserrat** 500–700 (do pitch) | caixa normal; pergunta 19 px bold |
| Números do HUD e contadores | **Silkscreen** (já usada no jogo) | só números e rótulos curtos |

Saiu a Titillium Web. Caixa alta só em títulos, botões e etiquetas, nunca em texto de leitura.

## Componentes

| Componente | Classe | Variações |
|---|---|---|
| Botão | `.btn` | principal vermelho · `.alt` papel · `.go` verde (continuar/confirmar) · `.hot` amarelo (JOGAR) · `.sm` · `.xl`. Estados: hover sobe 1 px; apertado afunda e perde a sombra; foco com anel ciano; desabilitado hachurado e sem sombra |
| Painel | `.panel` | `.talk.npc` (balão) · `.talk.sign` · `.quiz` · `.boss` · `.pausebox` · `.warn` · `.cordelbox` (papel de folheto, moldura dupla) · `.winbox` (tela cheia) |
| Etiqueta | `.kicker` / `.vp-tag` | cor por `--tag`; levemente torta, como as letras do logo |
| Título em blocos | `<BlockTitle>` / `.win-title` | palavras em blocos coloridos, como o logo |
| Alternativa | `.opt` | letra num quadrado colorido; `.sel` contorno azul; `.wrong` ✗; `.right` ✓ |
| Retorno | `.fb` | `.bad` ✗ "Quase!" · `.good` lupa "Acertou! Por quê?" · `.hint` lâmpada "Dica" (os três ícones do pitch: controle, lupa, lâmpada) |
| Decoração | `<Stripes>` `<Blocks>` `<Waves>` `<Arcs>` `<Trails>` | uma ou duas por tela, nos cantos; nunca atrás de texto |
| Ícones | `<Icon name>` | grade 12×12 em pixel com contorno preto (coração, bloco ?, estrela, lâmpada, lupa, cadeado, bandeira, pausa, som…) |

## HUD

Uma faixa única, sem cartões:

- **Esquerda:** retrato do personagem, número da fase e nome.
- **Meio:** os contadores (corações, peso de prata do jogo, bloco ?, pontos, cordel) separados por linha fina.
- **Direita:** objetivo do momento (chefão, "vá até a estação", power-up) e o botão de pausa.

Embaixo do HUD, as ondas da camiseta.

No celular deitado, o HUD encolhe para 30 px e esconde o nome da fase.

## Telas cobertas

Tela inicial; seleção de personagem; mapa de Pernambuco (visão geral, Arco 1, Recife); Recife 2.5D; modo lista; HUD; aviso curto (checkpoint, vidas); erro; fala do acompanhante; placa; NPC; pergunta e chefão (alternativas, erro, acerto, dica); "Acertou!" durante o golpe; pausa; confirmação de saída; cordel encontrado; vitória; controles de teclado e de toque; aviso de girar o celular.

O jogo não tem tela de derrota, de configurações, de créditos nem de carregamento. Perder as vidas mostra um aviso curto e volta ao checkpoint. Essas telas não foram inventadas.

Capturas em `docs/capturas-ui/`.
