/* v13 — PROPORÇÕES CENTRALIZADAS, calibradas pelo VemPedroca original (Unity).
   Medição: cena MVP/Main do projeto exportado — altura visível do sprite ÷ pixels-per-unit × escala do transform,
   dividida pela altura do Pedroca na mesma cena (1,52 unidade). Aqui o Pedroca tem 32 px visíveis, então
   escala web = razão original × 32 ÷ altura visível do sprite (px). Detalhes: docs/proporcoes-v13.md.
   Visual e hitbox usam a mesma escala (obstáculos: bbox visível × escala). Nunca estica: escala uniforme. */
export const SCALE: Record<string, number> = {
  //            razão no original (× Pedroca) → altura resultante aqui
  lixeira: 0.63,   // 0,84–0,88× → 27 px (0,85×)
  roadblock: 1.4,  // 1,71× → 55 px (1,7×) — continua saltável (pulo: 112 px)
  mato4: 2,        // vaso de planta: 1,42× → 48 px (1,5×)
  mato2: 2,        // arbusto: 0,49–0,99× → 24 px (0,75×)
  canteiro: 2,     // 0,7–1,4× (mais comum 1,05×) → 34 px (1,06×)
  banco: 2,        // 0,7–1,05× → 34 px (1,06×)
  fusca: 3,        // 1,32–1,64× → 48 px (1,5×)
  placa: 1.6,      // 1,18× → 37 px (1,15×)
  poste: 0.6,      // poste/luminária 1,88–2,51× (acesa 3,13×) → 72 px (2,25×)
  aceso: 0.6,      // quadros acesos do mesmo poste
  semaforo: 1.33,  // 2,59× → 84 px (2,6×)
  semaforo_am: 1.33, semaforo_of: 1.33,
  npc: 1.3,        // Guarda-Pitomba 1,28× → 40 px (1,26×)
  warn: 0.5,
  // estação e ônibus: original 3,6× e 2,83×. Limitados a 3 (2,6× e 2,3×) porque a câmera daqui mostra 11 Pedrocas de
  // altura (a do original mostrava 17): a 4×, a parada ocuparia mais que a largura da tela
  parada: 3,
  onibus1: 3, onibus2: 3, onibus3: 3, onibus4: 3,
}
/** prédios do fundo: original 9–13× o Pedroca. Sobrados da camada intermediária 2,5 (305 px ≈ 9,5×);
 *  fachadas distantes 2 (≈ 7,4×) — um pouco menores para manter a sensação de profundidade do parallax */
export const BUILD_MID = 2.5, BUILD_FAR = 2
/** árvores (matoA1/matoA3, 31–32 px): no original 5,7–8,9× o Pedroca (algumas pequenas de 2–2,6×) */
export const TREES = new Set(['mato1', 'mato3'])
const hash = (n: number) => { let h = Math.floor(n * 977) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); return (h ^ (h >>> 12)) >>> 0 }
/** árvore do plano de jogo (atrás de personagens e objetos interativos): 6, 7 ou 8 (190–250 px ≈ 6–8×), escala inteira */
export const treeScale = (seed: number) => 6 + (hash(seed) % 3)
export const treeFlip = (seed: number) => (hash(seed + 7) & 1) === 1
/** árvores das fileiras de fundo (com parallax): 5–7× */
export const TREE_BG = [5, 6, 7]
/** carro do trânsito (mesmo sprite do fusca decorativo) */
export const CAR_SCALE = SCALE.fusca
