# v13 — Referência: VemPedroca original (Unity) × versão web

## Como a referência foi analisada
- **Executável** `Downloads\VemPedroca-main (1)\VemPedroca-main\VemPedroca.exe`: executado em janela (sem alterar nenhum arquivo) e jogado do início até o vale subterrâneo. Capturas em `docs/referencia-original/` (reduzidas a 1280×720).
- **Dados da cena** (identificado, não inferido): os dados do build ficam empacotados em `data.unity3d`. Por isso usei o projeto exportado deste mesmo jogo (`PEDROCA/VemPedroca-projeto-reconstruido/ExportedProject`, mesmo `productName`/`companyName` do build). Ele traz a cena `Scenes/MVP/Main.unity` em texto. Dela li:
  - transforms (posição e escala) de 135 objetos com sprite;
  - *pixels per unit* de cada sprite;
  - os 3 tilemaps: `UndergroundBackground` (9.356 tiles), `UndergroundCollision` (251) e `RuasCollision` (4.836);
  - a câmera ortográfica de tamanho 13 (26 unidades de altura).
- **Escala:** altura visível do sprite ÷ PPU × escala do transform, dividida pela altura do Pedroca na mesma cena (1,52 unidade). O mapa dos tilemaps foi renderizado a partir dos dados: `docs/referencia-original/4-mapa-tilemaps-original.png`.

## Como o original constrói o subsolo (identificado nos dados e na tela)
- **Ruas:** são lajes grossas de tijolo (`RuasCollision`), com moldura de pedra em todos os lados (peças 8–10 × 14–16 do `tiles-marcozero`). Os prédios ficam sobre essas lajes, e as lajes terminam em cortes acabados, às vezes com vãos entre blocos.
- **Embaixo das ruas não há túnel fechado:** há um **vale aberto**. O fundo é o próprio céu: não há teto, paredes pretas nem fundo pintado.
- **Laterais do vale:** são o `UndergroundBackground`, um aterro de **alvenaria musgosa** (tiles #25/#26 = colunas 35–36, linha 6), com borda em **escada diagonal de 1 tile por linha**. É só fundo, sem colisão. No jogo ele aparece bem escuro por causa da iluminação 2D.
- **Caminho:** desce por **plataformas de madeira com barra** em degraus e chega a **lajes de rocha** com pedregulho no topo (`UndergroundCollision`, peças 9 partes 1–3 × 5–8). Lá embaixo há banco e **postes acesos** (Light2D).
- **Grade:** 1 unidade por tile, sprites de 32 px com 31 PPU, ou seja, 1 px de sobreposição entre tiles.

## Comparação
| Elemento | Versão original | Versão web antes (v12) | Ajuste aplicado (v13) |
|---|---|---|---|
| Construção do subsolo | Vale aberto sob lajes de rua; fundo = céu | Galeria fechada sob laje, parede de tijolo/“galeria” pintada | Vale aberto: rua termina num corte acabado, vale a céu aberto, sem fundo pintado |
| Transição de terreno | Aterro em escada diagonal 1×1 (fundo) + plataformas em degraus | Escadaria de 5 degraus 2×1 com degraus de pedra provisórios | Aterro em escada diagonal 1×1 **sólida e caminhável** (visual = colisão) |
| Paredes/laterais | Alvenaria musgosa #25/#26 | Rocha cinza 9 partes + parede de galeria | Alvenaria musgosa #25/#26 + crosta de pedregulho recortada das peças de borda em toda face exposta |
| Piso inferior | Lajes de rocha com pedregulho, banco, postes acesos | Rocha + lajes finas + tochas/cano/raízes provisórios | Piso de alvenaria com crosta de pedregulho, **plataformas de madeira com barra**, banco e postes acesos com brilho |
| Prédios | 9–13× o Pedroca, sobre lajes de tijolo | Camada próxima 7,6×, distante 3,7×; base “flutuando” sobre o vale | Próxima 2,5 (≈9,5×), distante 2 (≈7,4×), sobre **lajes de tijolo com moldura** nas fases com vale |
| Árvores | 5,7–8,9× (algumas 2–2,6×) | 3–5× | Percurso 6–8×; fundo 5–7×; nenhuma árvore de fundo visível sobre o vale |
| Arbustos (vaso matoA4) | 1,42× | 0,6× | 1,5× |
| Arbusto baixo (matoA2) | 0,5–1,0× | 0,75× | 0,75× (mantido) |
| Banco | 0,7–1,05× | 0,53× | 1,06× |
| Canteiro | 0,7–1,4× (1,05× típico) | 0,43× | 1,06× |
| Lixeira | 0,84–0,88× | 0,66× | 0,85× |
| Placa | 1,18× | 0,72× | 1,15× |
| Poste/luminária | 1,88–2,51× (aceso 3,13×) | 3,75× | 2,25× |
| Semáforo | 2,59× | 1,97× | 2,6× |
| Fusca (decoração e trânsito) | 1,32–1,64× | 0,85× | 1,5× |
| Barreira PARE | 1,71× | 0,85× | 1,7× (continua saltável) |
| Guarda-Pitomba | 1,28× | 0,97× | 1,26× |
| Ônibus / parada BRT | 2,83× / 3,6× | 1,56× / 1,75× | 2,3× / 2,6× (limitado: a 4× a parada não caberia na tela) |
| Plataformas | 0,97× (madeira com barra) | grade de 32 px | mantidas na grade (colisão por tile) |

## Diferença de câmera (não alterada)
O original mostra cerca de **17 Pedrocas** na altura da tela; a versão web mostra **11** (360 px ÷ 32 px). Com as proporções do original, os prédios ocupam quase toda a altura e saem pelo topo da tela, como também acontecia lá. Aproximar a câmera do original exigiria mudar a resolução interna (`VH`), a altura das fases e a interface. Fica como recomendação, não como mudança.

## Onde ajustar
- **Escalas:** todas em `src/game/scale.ts`, com a razão do original comentada ao lado de cada valor. Ali estão `SCALE`, `BUILD_MID`, `BUILD_FAR`, `treeScale`, `TREE_BG` e `CAR_SCALE`.
- **Subsolo:** `Map.underground(n)` em `tools/build-levels.mjs`, reutilizável por qualquer fase nova. A renderização fica em `GameScene.buildTerrain` (alvenaria + crosta) e em `GameScene.foundation` (laje dos prédios).
