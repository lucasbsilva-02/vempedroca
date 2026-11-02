# Auditoria de escala (v6)
Referência: herói ≈ 30 px de altura visível ≈ 1,7 m (~17,6 px/m). Cada ajuste vale para o visual **e** para a hitbox (bbox visível × escala), medidos separadamente em `src/game/scale.ts`.
| Objeto | Visível (antes) | Escala | Visível (depois) | Altura relativa ao herói |
|---|---|---|---|---|
| lixeira | 29×43 | 0.5 | 14×22 | 1.43× → 0.72× |
| roadblock | 48×39 | 0.7 | 34×27 | 1.3× → 0.91× |
| mato1 | 24×32 | 0.7 | 17×22 | 1.07× → 0.75× |
| mato3 | 22×32 | 0.7 | 15×22 | 1.07× → 0.75× |
| mato4 | 12×24 | 0.8 | 10×19 | 0.8× → 0.64× |
| canteiro | 25×17 | 0.8 | 20×14 | 0.57× → 0.45× |
| fusca | 31×16 | 1.7 | 53×27 | 0.53× → 0.91× |

Mantidos por já estarem proporcionais: banco, semáforo, poste (≈4× o herói), placa, prédios (fundo/meio com parallax).
Pendente: bloco "?" (32×32 = tile; visual do tamanho do herói, decisão de design mantida) e plataformas (andaime), que seguem a grade de 32 px.

# Revisão de escala (v8)
Referência: Pedroca idle = 32 px visíveis; Renata idle = 28 px.

| Objeto | Visível (sprite) | Antes | Agora | Altura relativa ao Pedroca | Colisão |
|---|---|---|---|---|---|
| árvore `mato1`/`mato3` (plano de jogo) | 22–24×32 | 0.7 (22 px) | 3 ou 4 por posição, espelhamento alternado (96–128 px) | 0,7× → 3–4× | não |
| árvore da fileira intermediária (parallax 0,85, tinta clara) | 22–24×32 | — | 3, 4 ou 5 (96–160 px) | 3–5× | não |
| árvore entre sobrados (camada `mid`, parallax 0,6) | 22–24×32 | — | 4 (128 px) | 4× | não |
| arbusto `mato2` em primeiro plano (parallax 1,25) | 15×12 | — | 3 (36 px), topo abaixo da linha da calçada na tela | — | não |
| parada BRT `parada` | 171×28 | 1 (menor que o herói) | 2 (342×56 px ≈ 3,2 m) | 1,75× | não |
| ônibus BRT `onibus1–4` | 116×25 | 1 | 2 (232×50 px ≈ 13 m de comprimento) | 1,56× | não |
| Ratão forma original `tr1` | 19×28 | 2 (56 px, já tamanho de chefão) | 32/28 ≈ 1,14 (32 px) | 1× | — |
| Ratão chefão `boss2–12` | 33×38 | 2 | 2 (66×76 px), crescimento só após `tr15` | 2,4× | 66×76 enquanto de pé |

Escalas inteiras nas árvores mantêm o pixel art sem distorção (proporção original preservada; só o espelhamento horizontal varia).
Todas as árvores ficam ATRÁS do terreno, das plataformas, dos blocos "?", dos objetos interativos e dos personagens (profundidade `deco − 0,3` ou camadas de fundo), então não escondem caminho nem interação. A vegetação de primeiro plano fica abaixo da faixa da calçada na tela (pés, vãos e plataformas continuam visíveis).

# Vegetação (v9)
- Quantidade: fileira de fundo em grupos de 1–3 com 320–740 px entre grupos (antes uma árvore a cada 150–360 px); entre sobrados 35% de chance (antes 70%).
- Ancoragem: árvores com parallax ficavam até 17 px abaixo da linha do chão (câmera em y=24 com fator de rolagem). Agora a base coincide com o chão na câmera da superfície (`GameScene.baseY`). Árvores do percurso: base 3 px abaixo do topo da calçada, na frente da laje e atrás de plataformas, blocos e personagens.
- Exclusões: janela de câmera da arena do chefão e posições em que a árvore apareceria atrás de blocos, bloqueios, placas, NPCs, semáforos e checkpoints.
