// Esquema versionado de fases (schema: 1) — ver docs/schema.md
export type Question = { id: string; type: 'multiple_choice'; prompt: string; options: string[]; correctIndex: number; explanation: string; hint?: string }
export type ObjType = 'start' | 'checkpoint' | 'collectible' | 'sign' | 'npc' | 'question' | 'enemy' | 'boss' | 'obstacle' | 'decor' | 'traffic' | 'gate' | 'cordel' | 'mover'
export type LevelObject = {
  id: string; type: ObjType; x: number; y: number; title?: string; text?: string; question?: Question
  asset?: string; scale?: number; flip?: boolean // obstacle/decor: chave de ASSETS (src/game/assets.ts)
  required?: boolean // question: obrigatória (libera um gate)
  lit?: boolean // decor 'poste': aceso, com brilho (v13)
  range?: number; speed?: number // enemy: faixa de patrulha (colunas para cada lado) e velocidade (v14)
  quiet?: boolean // sign: sem seta de leitura (placas discretas, ex.: "em construção")
  // v9 — traffic: rua rebaixada de w colunas a partir de x (ver src/game/traffic.ts); gate: bloqueio que abre com o bloco 'requires'
  w?: number; tutorial?: boolean; cycle?: { green: number; yellow: number; red: number; offset?: number }; lanes?: { dir: 1 | -1; every?: number; speed?: number }[]
  kind?: 'bridge' | 'wall' | 'canoa' | 'tronco' | 'capanga' | 'ladrao' | 'bully' | 'caranguejo' | 'urubu' | 'chefe'; requires?: string; name?: string; tint?: number; dx?: number; dy?: number
}
export type Tip = { x: number; pedroca: string; renata: string } // x em colunas; fala de quem acompanha (se o jogador é a Renata, fala o Pedroca)
export type Level = {
  schema: 1; id: string; worldId: string; title: string; order: number
  discipline: string; grade: string; difficulty: 1 | 2 | 3; competency: string; objective: string
  bncc: { code: string; description: string; validated: boolean }
  narrative: string; theme: { character: string; sky: string; bg?: string; biome?: 'cidade' | 'mata'; far?: string[]; mid?: string[]; tint?: number; midTint?: number; skyTint?: number } // far/mid: chaves de ASSETS; tints 0xRRGGBB (como número)
  tiles: string[] // 12 linhas (ou 18 com subsolo). '#' chão, '-' plataforma atravessável por baixo, '.' vazio,
  // v9: '=' asfalto da rua (linha 11), 'G' rocha/chão do subsolo (tileset tiles-marcozero), '_' plataforma fina do subsolo
  objects: LevelObject[]
  tips?: Tip[]
  boss: { name: string; intro: string; requiredCorrect: number; questions: Question[]; final?: boolean; ending?: string }
  /** v14 — artefato do museu que o Ratão roubou nesta fase (GDD 1.1); recuperado ao derrotá-lo */
  artifact?: { name: string; text: string }
}
export type Progress = { levels: Record<string, { done: boolean; stars: number; score: number; cordel?: boolean; artifact?: boolean }>; last?: string }
