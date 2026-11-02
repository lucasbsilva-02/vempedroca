// v9 — Readaptação dos level designs existentes (Sonic: rotas/vertical + Super Mario Bros. 1: ritmo e leitura).
// Lê o conteúdo educativo ORIGINAL de tools/levels-v8/*.json (placas, NPCs, perguntas, falas, chefão — nada é
// reescrito) e monta um traçado novo para cada fase: rotas alternativas, trânsito com semáforo, galerias
// subterrâneas, bloqueios ligados a blocos obrigatórios e arena livre para o Ratão.
// Uso: node tools/build-levels.mjs   (grava src/data/<fase>.json)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(here, 'levels-v8'), OUT = path.join(here, '..', 'src', 'data')
const GR = 10
const PAD = 6 // v10: calçada de respiro antes e depois de cada rua
/** v14: placa temporária "em construção" nos vales subterrâneos — false remove todas de uma vez */
const OBRAS = true

/* ---------- construtor de mapa por colunas ---------- */
class Map {
  constructor(rows) { this.R = rows; this.cols = []; this.objs = []; this.later = [] }
  get x() { return this.cols.length }
  col(fn, n = 1) { for (let i = 0; i < n; i++) this.cols.push(Array.from({ length: this.R }, (_, r) => fn(r))); return this }
  /** calçada (superfície) — rocha embaixo quando a fase tem subsolo */
  flat(n) { return this.col(r => (r < GR ? '.' : r <= GR + 1 ? '#' : 'G'), n) }
  /** vala sem fundo (morte) */
  pit(n) { return this.col(() => '.', n) }
  /** rua rebaixada de 1 tile (asfalto na linha 11) + semáforo */
  /** v10: rua no MESMO nível da calçada ('=' na linha 10, chão contínuo) + calçadas de respiro antes/depois
   *  (zona segura de espera e trecho por onde os carros chegam e saem). Devolve a coluna onde a rua começa. */
  street(n, traffic, { before = PAD, after = PAD } = {}) {
    this.flat(before); const x = this.x
    this.col(r => (r < GR ? '.' : r === GR ? '=' : r === GR + 1 ? '#' : 'G'), n); this.obj({ type: 'traffic', x, y: 9, w: n, ...traffic })
    this.flat(after); return x
  }
  /** abre uma galeria: linhas 12..floor-1 vazias em [x0, x1], chão de rocha da linha floor para baixo */
  /** v13 — trecho subterrâneo no padrão do VemPedroca ORIGINAL (cena MVP/Main): a rua termina num corte acabado e,
   *  abaixo dela, abre-se um VALE A CÉU ABERTO (sem teto, sem paredes pretas). As laterais são o aterro de alvenaria
   *  (tile #25/#26 do tiles-marcozero, o mesmo do UndergroundBackground do original) descendo em ESCADA DIAGONAL de
   *  1 tile por linha — aqui sólida e caminhável, para visual e colisão coincidirem. Piso de rocha na linha 16, com
   *  plataformas de madeira com barra, banco e postes acesos (como no original). Subida espelhada.
   *  Devolve a coluna onde o piso do vale começa. */
  underground(n) {
    const slope = top => r => (r < top ? '.' : 'G')
    // v14: inclinação mais suave — 1 tile de descida a cada 2 colunas (antes, a cada coluna)
    for (let i = 0; i < 6; i++) this.col(slope(GR + 1 + i), 2)                  // aterro descendo: topos nas linhas 11..16
    const ix = this.x
    this.col(r => (r < 16 ? '.' : 'G'), n)                                      // piso do vale (linha 16)
    for (let i = 5; i >= 0; i--) this.col(slope(GR + 1 + i), 2)                 // aterro subindo
    this.obj({ type: 'decor', x: ix - 11, y: 9, asset: 'seta', scale: 1 })       // seta para baixo sobre o primeiro degrau
    if (OBRAS) this.obj({ type: 'sign', id: 'obras' + ix, x: ix + 1, y: 15, asset: 'placa_obras', quiet: true, title: 'Em construção', text: 'Opa! Desculpa pela bagunça! Essa parte ainda está em construção. Estamos trabalhando para deixar esse caminho bem melhor. Obrigado pela paciência!' })
    // postes acesos e um banco no piso do vale (decorativos, sem colisão)
    for (let k = 4; k < n - 1; k += 8) this.obj({ type: 'decor', x: ix + k, y: 15, asset: 'poste', lit: true })
    this.obj({ type: 'decor', x: ix + 5.5, y: 15, asset: 'banco' })
    return ix
  }
  /** v15 — rio de n colunas ('~' da superfície para baixo, sem fundo: cair é como cair numa vala) com plataformas
   *  móveis: canoa/tronco de 3 colunas indo e voltando de margem a margem (ou entre at e at+dx). Devolve a 1ª coluna. */
  river(n, movers = []) {
    const x = this.x; this.col(r => (r < GR ? '.' : '~'), n)
    for (const mv of movers) { const at = mv.at ?? 0; this.obj({ type: 'mover', x: x + at, y: 9, w: 3, dx: mv.dx ?? n - 3 - at, speed: mv.speed ?? 0.9, kind: mv.kind ?? 'canoa' }) }
    return x
  }
  /** v15 — barranco de h tiles (mais alto que o pulo) e w colunas, com cipó na coluna da esquerda (e, se pedir, na da
   *  direita). Sobe-se pelo cipó; desce-se pulando ou pelo outro cipó. Devolve a 1ª coluna do barranco. */
  cliff(h, w, { vineRight = false } = {}) {
    const vine = r => (r < GR - h ? '.' : r < GR ? 'H' : r <= GR + 1 ? '#' : 'G')
    this.col(vine, 1); const x = this.x
    this.col(r => (r < GR - h ? '.' : 'G'), w)
    if (vineRight) this.col(vine, 1)
    return x
  }
  set(c, r, ch) { this.later.push([c, r, ch]); return this }
  plat(c, r, n, ch = '-') { for (let i = 0; i < n; i++) this.later.push([c + i, r, ch]); return this }
  obj(o) { this.objs.push(o); return this }
  coins(list) { for (const [x, y] of list) this.obj({ type: 'collectible', x, y }); return this }
  tiles() { for (const [c, r, ch] of this.later) this.cols[c][r] = ch; this.later = []; return Array.from({ length: this.R }, (_, r) => this.cols.map(c => c[r]).join('')) }
}

/* ---------- utilitários de conteúdo ---------- */
const load = id => JSON.parse(fs.readFileSync(path.join(SRC, id + '.json'), 'utf8'))
const pick = (L, id) => { const o = L.objects.find(k => k.id === id); if (!o) throw new Error(L.id + ': falta ' + id); return o }
let uid = 0
const id = p => p + (++uid)
/* ======================================================================================
   v14 — Etapa 3: objetivos, ameaças e segredos (GDD 1.1, 2.2, 2.3, 3.3)
   ====================================================================================== */
/** artefato roubado pelo Ratão em cada fase (recuperado ao derrotá-lo) */
const ARTIFACTS = {
  'vila-palavras-1': { name: 'Sombrinha de frevo', text: 'O frevo nasceu no Recife e é Patrimônio Cultural Imaterial da Humanidade (UNESCO, 2012). A sombrinha colorida é o símbolo do passista.' },
  'vila-palavras-2': { name: 'Folheto de Leandro Gomes de Barros', text: 'Paraibano que viveu no Recife, Leandro Gomes de Barros foi um dos pioneiros da literatura de cordel impressa no Brasil.' },
  'vila-palavras-3': { name: 'Partitura de "Vassourinhas"', text: 'Composto em 1909 por Matias da Rocha e Joana Batista, "Vassourinhas" é um dos frevos mais famosos do Carnaval do Recife.' },
  'reino-numeros-1': { name: 'Planta da Ponte Maurício de Nassau', text: 'Inaugurada em 1643, no Recife holandês, é considerada a primeira grande ponte construída no Brasil.' },
  'reino-numeros-2': { name: 'Alfaia de maracatu', text: 'A alfaia é o grande tambor do maracatu de baque virado, tradição afro-pernambucana que marca o ritmo com padrões que se repetem.' },
  'floresta-descobertas-1': { name: 'Mapa das nascentes do Capibaribe', text: 'O Capibaribe nasce no Agreste pernambucano, na região de Poção, e atravessa o estado até chegar ao Recife, onde encontra o Beberibe e o mar.' },
  'floresta-descobertas-2': { name: 'Caderno de campo de Vasconcelos Sobrinho', text: 'O pernambucano João Vasconcelos Sobrinho (1908–1989) foi um dos pioneiros da ecologia e da defesa do meio ambiente no Brasil.' },
  'floresta-descobertas-3': { name: 'Fóssil da Chapada do Araripe', text: 'A Chapada do Araripe, na divisa de Pernambuco com o Ceará e o Piauí, guarda fósseis de peixes, plantas e pterossauros com mais de 100 milhões de anos.' },
  'reino-numeros-3': { name: 'Florim obsidional de 1645', text: 'Moeda cunhada no Recife durante o cerco aos holandeses. É considerada a primeira moeda fabricada no Brasil.' },
}
/** cordel escondido de cada fase (versos originais, em sextilha) */
const CORDEIS = {
  'vila-palavras-1': ['A Feira de São José', 'Na feira de São José\no povo chega cedinho,\ntem bolo de rolo e café,\ntapioca e queijo fresquinho.\nQuem lê o texto com calma\nnão se perde no caminho.'],
  'vila-palavras-2': ['O Mistério da Estante', 'Numa biblioteca antiga\num livro sumiu da estante;\na pista nunca é inimiga\nde quem lê de olhar constante.\nJuntar detalhe a detalhe\nfaz um detetive importante.'],
  'vila-palavras-3': ['Cada Texto Tem Seu Jeito', 'Convite chama pra festa,\nreceita ensina a fazer,\nnotícia conta o que resta\ndo que acabou de acontecer.\nCada texto tem seu jeito:\nbasta aprender a ler.'],
  'reino-numeros-1': ['A Ponte de Nassau', 'No Recife holandês,\nNassau mandou construir\numa ponte sobre o rio\npro povo poder ir e vir.\nFoi em mil seiscentos e quarenta e três:\nconta certa pra não cair!'],
  'reino-numeros-2': ['O Padrão do Maracatu', 'A alfaia do maracatu\nrepete batida e compasso:\ntum-tum-pá, tum-tum-pá,\nacompanhando o passo.\nAchar a regra que se repete\né desatar qualquer laço.'],
  'floresta-descobertas-1': ['O Caminho da Água', 'O sol esquenta o rio,\na água sobe ao céu;\nvira nuvem, vira frio,\nvira chuva feito véu.\nVolta pro chão e pro rio,\ngirando feito carrossel.'],
  'floresta-descobertas-2': ['A Teia do Mangue', 'No mangue a folha cai,\no caranguejo vem comer;\na garça desce e sai\ncom o caranguejo pra viver.\nO fungo devolve à lama\no que ajuda a crescer.'],
  'floresta-descobertas-3': ['A Receita da Ciência', 'Primeiro a gente observa,\ndepois pergunta o porquê;\na hipótese se conserva\naté o teste responder.\nRepete, anota e conclui:\nciência é aprender!'],
  'reino-numeros-3': ['As Moedas do Cerco', 'Em mil seiscentos e quarenta e cinco,\nno Recife holandês,\ncunharam moeda com afinco,\na primeira daqui de vez.\nMetade, um terço, um quarto:\nfração se aprende assim, freguês!'],
}
/** v16 — INIMIGOS DESLIGADOS (pedido do autor): capangas, ladrão, valentão, caranguejo, urubu e capangas-chefes não
 *  existem no jogo original e não têm arte própria; não entram nas fases. O motor (src/game/foes.ts) continua pronto:
 *  ENEMIES = true volta a posicioná-los quando houver personagens desenhados. */
const ENEMIES = false
/** v16 — tipos de inimigo por fase, na ordem em que aparecem (o ciclo se repete). Cada mundo apresenta um tipo novo:
 *  Recife Antigo: valentão e urubu; Fortaleza: ladrão que arremessa chinelos; mangue: caranguejo. */
const FOE_KINDS = {
  'vila-palavras-1': ['capanga', 'bully'], 'vila-palavras-2': ['capanga', 'urubu', 'bully'], 'vila-palavras-3': ['bully', 'capanga', 'urubu', 'capanga'],
  'reino-numeros-1': ['capanga', 'ladrao', 'capanga'], 'reino-numeros-2': ['ladrao', 'urubu', 'capanga', 'ladrao'], 'reino-numeros-3': ['ladrao', 'bully', 'urubu', 'capanga', 'ladrao'],
  'floresta-descobertas-1': ['caranguejo', 'capanga'], 'floresta-descobertas-2': ['caranguejo', 'ladrao', 'caranguejo'], 'floresta-descobertas-3': ['bully', 'caranguejo', 'ladrao', 'caranguejo'],
}
/** v16 — capanga-chefe da região (GDD: "capangas-chefes por região"), na última fase de cada mundo, antes da arena:
 *  trecho plano de 22 colunas com o Guarda-Pitomba avisando, o chefe no meio e um portão que só abre quando ele cai. */
function chiefZone(m, { id, name, tint, text }) {
  if (!ENEMIES) return m.x
  const x = m.x; m.flat(22)
  m.obj({ type: 'npc', id: 'npc-' + id, x: x + 1, y: 9, title: 'Guarda-Pitomba: cuidado!', text })
  m.obj({ type: 'enemy', id, kind: 'chefe', x: x + 11, y: 9, range: 7, name, tint })
  m.obj({ type: 'gate', id: 'g-' + id, kind: 'wall', x: x + 19, y: 9, w: 2, requires: id, label: 'chefe' })
  m.flat(3)
  return x
}
/** quantos capangas por fase: a dificuldade sobe dentro de cada mundo */
const FOES = { 'floresta-descobertas-1': 2, 'floresta-descobertas-2': 3, 'floresta-descobertas-3': 4, 'vila-palavras-1': 2, 'vila-palavras-2': 3, 'vila-palavras-3': 4, 'reino-numeros-1': 3, 'reino-numeros-2': 4, 'reino-numeros-3': 5 }
/** posiciona capangas em trechos planos e livres (calçada ou piso de vale), longe de ruas, bloqueios, valas,
 *  objetos de leitura, do início e da arena; espaçamento mínimo de 16 colunas */
function placeFoes(L, objs, n) {
  if (!ENEMIES) return []
  const T = L.tiles, W = T[0].length, boss = objs.find(o => o.type === 'boss'), start = objs.find(o => o.type === 'start')
  const chief = objs.find(o => o.kind === 'chefe')
  const near = (types, c, d) => objs.some(o => types.includes(o.type) && Math.abs(o.x - c) <= d && (o.type !== 'question' || o.y >= 7))
  const street = c => { for (let k = c - 5; k <= c + 5; k++) if (T[10][k] === '=') return true; return false }
  // nada de capanga perto de vala: o recuo do dano (ou o pulo para desviar) não pode jogar o herói no buraco
  const pitCol = k => { for (let r = 10; r < T.length; r++) if ('#G='.includes(T[r][k])) return false; return true }
  const nearPit = c => { for (let k = c - 6; k <= c + 6; k++) if (k >= 0 && k < W && pitCol(k)) return true; return false }
  const flatAt = (c, gr) => { for (let k = c - 2; k <= c + 2; k++) if (!(T[gr][k] === '#' || T[gr][k] === 'G') || T[gr - 1][k] !== '.' || T[gr - 2][k] !== '.') return false; return true }
  const cands = []
  for (let c = start.x + 20; c < boss.x - 20; c++) {
    if (chief && c > chief.x - 16 && c < chief.x + 14) continue
    if (street(c) || nearPit(c) || near(['sign', 'npc', 'checkpoint', 'question', 'gate', 'traffic', 'cordel'], c, 3) || objs.some(o => o.type === 'gate' && c >= o.x - 4 && c <= o.x + (o.w ?? 2) + 4)) continue
    if (flatAt(c, 10)) cands.push([c, 9])
    else if (T.length > 12 && flatAt(c, 16)) cands.push([c, 15])
  }
  const out = []; let last = -99
  const step = 14
  for (const [c, y] of cands) { if (out.length >= n) break; if (c - last >= step) { { const kinds = FOE_KINDS[L.id] ?? ['capanga']; out.push({ id: 'cap' + (out.length + 1), type: 'enemy', kind: kinds[out.length % kinds.length], x: c, y, range: 3 }) }; last = c } }
  return out
}
function finish(L, m, { tipsX, required, decor = [], gateNpcs = [], cordel }) {
  // objetos de conteúdo original: só a posição muda; perguntas obrigatórias ganham a marca e um título claro
  const objs = m.objs.map(o => {
    const base = o.ref ? { ...pick(L, o.ref), x: o.x, y: o.y } : { id: o.id ?? id(o.type), ...o }
    delete base.ref
    if (base.type === 'question' && required.includes(base.id)) { base.required = true; base.title = 'Bloco obrigatório' }
    if (base.type === 'question' && !required.includes(base.id)) { delete base.required; base.title = 'Bloco de pergunta (opcional)' }
    return base
  })
  for (const d of decor) objs.push({ id: id('d'), type: 'decor', x: d[1], y: d[2] ?? 9, asset: d[0], ...(d[3] ?? {}) })
  for (const n of gateNpcs) objs.push({ id: id('npcg'), type: 'npc', x: n.x, y: n.y ?? 9, title: n.title, text: n.text })
  const tips = L.tips.map((t, i) => ({ ...t, x: tipsX[i] ?? t.x }))
  if (cordel && CORDEIS[L.id]) objs.push({ id: 'cordel1', type: 'cordel', x: cordel[0], y: cordel[1], title: CORDEIS[L.id][0], text: CORDEIS[L.id][1] })
  const tiles = m.tiles()
  objs.push(...placeFoes({ id: L.id, tiles }, objs, FOES[L.id] ?? 0))
  const out = { ...L, tiles, objects: objs, tips, artifact: ARTIFACTS[L.id] }
  check(out)
  fs.writeFileSync(path.join(OUT, L.id + '.json'), JSON.stringify(out, null, 1) + '\n')
  return out
}

/* ---------- verificações estáticas (falham o build da fase) ---------- */
function check(L) {
  const R = L.tiles.length, W = L.tiles[0].length, err = []
  if (L.tiles.some(t => t.length !== W)) err.push('linhas de tamanhos diferentes')
  const boss = L.objects.find(o => o.type === 'boss')
  const a0 = boss.x - 14, a1 = boss.x + 6
  for (let c = a0; c < Math.min(W, a1); c++) {
    if (L.tiles[GR][c] !== '#' || L.tiles[GR - 1][c] !== '.') err.push('arena com relevo na coluna ' + c)
    for (let r = 0; r < GR; r++) if (L.tiles[r][c] !== '.') err.push('arena com plataforma na coluna ' + c)
  }
  for (const o of L.objects) {
    if (['decor', 'obstacle', 'sign', 'question', 'collectible', 'traffic', 'gate', 'checkpoint'].includes(o.type) && o.x >= a0 && o.x < a1) err.push(`${o.type} ${o.id} dentro da arena`)
    if (['sign', 'npc', 'checkpoint', 'start'].includes(o.type)) {
      const below = L.tiles[o.y + 1]?.[o.x]
      if (below !== '#' && below !== 'G' && below !== '=') err.push(`${o.type} ${o.id} sem chão embaixo (x=${o.x})`)
    }
  }
  // espaçamento: elementos interativos/de leitura com no mínimo 3 colunas entre si
  const inter = L.objects.filter(o => ['sign', 'npc', 'checkpoint', 'question'].includes(o.type)).sort((a, b) => a.x - b.x)
  for (let i = 1; i < inter.length; i++) if (inter[i].x - inter[i - 1].x < 3 && inter[i].y === inter[i - 1].y) err.push(`${inter[i - 1].id} e ${inter[i].id} colados`)
  // v10: ruas são chão contínuo; nada interativo no leito; sem vala, bloqueio ou boca de galeria a menos de 5 colunas
  const isStreet = c => L.tiles[GR][c] === '='
  for (const t of L.objects.filter(o => o.type === 'traffic')) {
    for (let c = t.x; c < t.x + t.w; c++) if (L.tiles[GR][c] !== '=' || L.tiles[GR + 1][c] !== '#') err.push('rua ' + t.id + ' sem chão contínuo na coluna ' + c)
    for (let c = t.x - 5; c < t.x + t.w + 5; c++) {
      if (c < 0 || c >= W || isStreet(c)) continue
      if (L.tiles[GR][c] === '.') err.push('vala/boca de galeria colada na rua ' + t.id + ' (coluna ' + c + ')')
    }
    for (const g of L.objects.filter(o => o.type === 'gate')) if (g.x + (g.w ?? 2) > t.x - 6 && g.x < t.x + t.w + 6) err.push('bloqueio ' + g.id + ' colado na rua ' + t.id)
  }
  for (const o of L.objects) if (['sign', 'npc', 'checkpoint', 'question', 'start'].includes(o.type) && o.y >= 7 && isStreet(Math.floor(o.x))) err.push(o.type + ' ' + o.id + ' no leito da rua')
  // cada gate tem um bloco obrigatório ANTES dele
  for (const g of L.objects.filter(o => o.type === 'gate')) {
    const q = L.objects.find(o => o.id === g.requires)
    if (q && q.kind === 'chefe') { if (q.x >= g.x) err.push(`chefe ${q.id} depois do gate ${g.id}`); continue }
    if (!q || !q.required) err.push(`gate ${g.id} sem bloco obrigatório`)
    else if (q.x >= g.x) err.push(`bloco ${q.id} depois do gate ${g.id}`)
  }
  if (err.length) throw new Error(L.id + ':\n  ' + err.join('\n  '))
}

const ARENA = 20 // colunas planas e vazias; o chefão fica a 14 colunas da entrada
function arena(m) { const x = m.x; m.flat(ARENA); m.obj({ type: 'boss', x: x + 14, y: 9 }); return x }

/* ======================================================================================
   1-1  A Feira de Dona Marta — apresenta o SEMÁFORO (tutorial: ciclo longo, carros lentos, explicação do
   acompanhante) e o primeiro BLOQUEIO (ponte levadiça + bloco obrigatório). A segunda rua tem a passarela
   (rota alta com moedas, sem esperar o sinal) como alternativa ao térreo.
   ====================================================================================== */
{
  const L = load('vila-palavras-1'), m = new Map(12)
  m.flat(22).obj({ type: 'start', x: 3, y: 9 }).obj({ ref: 'sign1', x: 8, y: 9 }).obj({ ref: 'npc1', x: 15, y: 9 })
  let b = m.x; m.pit(3).coins([[b, 7], [b + 1, 6], [b + 2, 7]])           // primeiro vão, fácil
  b = m.x; m.flat(9).obj({ type: 'checkpoint', id: 'cp1', x: b + 5, y: 9 })
  m.street(8, { id: 'tr1', tutorial: true, cycle: { green: 6, yellow: 1.5, red: 6.5 }, lanes: [{ dir: 1, every: 3.4, speed: 2.4 }] })
  b = m.x; m.flat(18)
  const q1x = b + 8
  m.obj({ ref: 'q1', x: q1x, y: 7 }).plat(b + 3, 7, 2).plat(b + 13, 7, 2).coins([[b + 3, 6], [b + 4, 6], [b + 13, 6], [b + 14, 6]])
  const npcG = b + 15
  b = m.x; m.pit(6).obj({ type: 'gate', id: 'g1', kind: 'bridge', x: b, y: 9, w: 6, requires: 'q1' })
  b = m.x; m.flat(10).obj({ type: 'checkpoint', id: 'cp2', x: b + 3, y: 9 }).obj({ ref: 'sign2', x: b + 8, y: 9 })
  const st = m.street(8, { id: 'tr2', cycle: { green: 5, yellow: 1.5, red: 5 }, lanes: [{ dir: 1, every: 2.8 }] })
  m.plat(st - 3, 7, 2).plat(st, 5, 2).plat(st + 3, 5, 2).plat(st + 6, 7, 2).coins([[st, 4], [st + 1, 4], [st + 3, 4], [st + 4, 4]]) // passarela
  b = m.x; m.flat(20)
  const tA = b + 6, tB = b + 12
  b = m.x; m.pit(3).coins([[b, 7], [b + 1, 6], [b + 2, 7]])
  b = m.x; m.flat(9).obj({ type: 'checkpoint', id: 'cp3', x: b + 4, y: 9 })
  const a = arena(m)
  finish(L, m, {
    required: ['q1'], tipsX: [4, q1x - 5, a + 1], cordel: [st + 2, 3],                     // no alto da passarela
    decor: [['banco', 11.5], ['mato1', 19], ['canteiro', 27.5], ['mato3', st - 7], ['lixeira', tA - 3.5], ['mato1', tA], ['mato3', tB], ['banco', a - 3.5]],
    gateNpcs: [{ x: npcG, title: 'Guarda-Pitomba na ponte', text: 'Esta ponte levadiça só baixa quando alguém responde o bloco laranja que ficou lá atrás, depois do semáforo. Lembra do texto da feira? Volte lá, pule embaixo do bloco e responda!' }],
  })
}

/* ======================================================================================
   1-2  O Mistério da Biblioteca — SEMÁFOROS EM SEQUÊNCIA (duas ruas com ilha no meio, mãos opostas),
   PORTÃO de pedra ligado ao bloco do bilhete e PORÃO SECRETO (galeria subterrânea com as "pistas no chão"
   e a pergunta opcional q2). A superfície sobre o porão tem uma rota alta com moedas.
   ====================================================================================== */
{
  const L = load('vila-palavras-2'), m = new Map(18)
  m.flat(16).obj({ type: 'start', x: 3, y: 9 }).obj({ ref: 'sign1', x: 7, y: 9 }).obj({ ref: 'npc1', x: 12, y: 9 })
  let b = m.x; m.pit(3).coins([[b, 7], [b + 1, 6], [b + 2, 7]])
  b = m.x; m.flat(12)
  const q1x = b + 4
  m.obj({ ref: 'q1', x: q1x, y: 7 }).obj({ type: 'checkpoint', id: 'cp1', x: b + 9, y: 9 })
  m.street(8, { id: 'tr1', cycle: { green: 5, yellow: 1.5, red: 5 }, lanes: [{ dir: 1, every: 2.8 }] }, { after: 0 })
  m.flat(6)                                                              // ilha: zona segura entre as duas ruas
  m.street(8, { id: 'tr2', cycle: { green: 5, yellow: 1.5, red: 5, offset: 4 }, lanes: [{ dir: -1, every: 3 }] }, { before: 0 })
  b = m.x; m.flat(14).obj({ ref: 'sign2', x: b + 3, y: 9 })
  const npcG = b + 7, gx = b + 11
  m.obj({ type: 'gate', id: 'g1', kind: 'wall', x: gx, y: 9, w: 2, requires: 'q1' })
  b = m.x; m.flat(11).obj({ type: 'checkpoint', id: 'cp2', x: b + 1, y: 9 })
  m.obj({ type: 'sign', id: 'desce1', x: b + 6, y: 9, asset: 'placa_descida', title: 'Atenção: descida à frente!', text: 'A escada leva ao porão da biblioteca. O caminho continua por baixo da rua e sai por outra escada, mais adiante. Lá embaixo tem pistas guardadas!' })
  const c0 = m.underground(18)                                           // porão da biblioteca
  m.plat(c0 + 3, 14, 3, '-').plat(c0 + 11, 14, 3, '-')
  m.obj({ ref: 'q2', x: c0 + 8, y: 12 })
  m.coins([[c0 + 1, 15], [c0 + 3, 13], [c0 + 4, 13], [c0 + 5, 13], [c0 + 7, 15], [c0 + 9, 15], [c0 + 11, 13], [c0 + 12, 13], [c0 + 13, 13]])
  b = m.x; m.flat(16).obj({ ref: 'sign3', x: b + 5, y: 9 }).obj({ type: 'checkpoint', id: 'cp3', x: b + 11, y: 9 })
  const a = arena(m)
  finish(L, m, {
    required: ['q1'], tipsX: [4, q1x - 4, a + 1], cordel: [c0 + 16, 15],                  // canto do porão
    decor: [['mato3', 10], ['banco', q1x + 2.5], ['mato1', gx - 9], ['lixeira', gx + 4], ['mato3', b + 2], ['banco', b + 8.5]],
    gateNpcs: [{ x: npcG, title: 'Guarda-Pitomba no portão', text: 'O portão de pedra da biblioteca está trancado. Ele só abre para quem responde o bloco laranja, antes dos semáforos: a que horas Dona Lúcia trancou a biblioteca? Releia o bilhete e volte lá!' }],
  })
}

/* ======================================================================================
   1-3  O Desafio das Palavras — TESTE do trânsito: avenida de mão dupla (7 colunas), rua em obra com a
   barreira de PARE logo depois da travessia, ponte levadiça obrigatória e, no fim, rua de ciclo curto
   com uma rota alta pelos toldos que guarda a pergunta bônus (q3).
   ====================================================================================== */
{
  const L = load('vila-palavras-3'), m = new Map(12)
  m.flat(20).obj({ type: 'start', x: 3, y: 9 }).obj({ ref: 'sign1', x: 7, y: 9 }).obj({ ref: 'npc1', x: 12, y: 9 }).obj({ ref: 'q1', x: 17, y: 7 })
  let b = m.x; m.pit(3).coins([[b, 7], [b + 1, 6], [b + 2, 7]])
  b = m.x; m.flat(9).obj({ type: 'checkpoint', id: 'cp1', x: b + 5, y: 9 })
  m.street(10, { id: 'tr1', cycle: { green: 4.5, yellow: 1.2, red: 5 }, lanes: [{ dir: 1, every: 2.6 }, { dir: -1, every: 3.1 }] })
  b = m.x; m.flat(14).obj({ ref: 'sign2', x: b + 3, y: 9 })
  const q2x = b + 8; m.obj({ ref: 'q2', x: q2x, y: 7 })
  m.street(8, { id: 'tr2', cycle: { green: 4, yellow: 1, red: 4.5, offset: 2 }, lanes: [{ dir: 1, every: 2.4 }] })
  b = m.x; m.flat(9).obj({ type: 'obstacle', id: 'pare1', x: b + 1, y: 9, asset: 'roadblock' })   // obra: barreira de PARE
  const warnX = b + 3.5, npcG = b + 6
  b = m.x; m.pit(6).obj({ type: 'gate', id: 'g1', kind: 'bridge', x: b, y: 9, w: 6, requires: 'q2' })
  b = m.x; m.flat(14).obj({ ref: 'npc2', x: b + 3, y: 9 }).obj({ type: 'checkpoint', id: 'cp2', x: b + 9, y: 9 })
  const st = m.street(8, { id: 'tr3', cycle: { green: 3.5, yellow: 1, red: 4 }, lanes: [{ dir: -1, every: 2.2 }] })
  m.plat(st - 3, 7, 2).plat(st, 5, 2).plat(st + 3, 4, 2).plat(st + 7, 6, 2)
  m.obj({ ref: 'q3', x: st + 3, y: 1 }).coins([[st, 4], [st + 1, 4], [st + 7, 5], [st + 8, 5]])
  b = m.x; m.flat(16).obj({ ref: 'sign3', x: b + 6, y: 9 }).obj({ type: 'checkpoint', id: 'cp3', x: b + 12, y: 9 })
  chiefZone(m, { id: 'chefe1', name: 'Capanga-chefe Pichador', tint: 0xffa8a8, text: 'Cuidado! O Capanga-chefe Pichador do Ratão anda riscando as palavras dos muros do Recife Antigo e trancou o portão. Quando ele correr na sua direção, pule por cima; tonto, ele fica fácil: pise na cabeça dele 3 vezes!' })
  const a = arena(m)
  finish(L, m, {
    required: ['q2'], tipsX: [4, q2x - 4, a + 1], cordel: [st + 9, 4],                     // depois dos toldos altos
    decor: [['mato1', 10], ['banco', 25.5], ['mato3', q2x + 3], ['warn', warnX, 9, { scale: 0.5 }], ['mato1', st - 7], ['lixeira', b + 2.5], ['mato3', b + 9]],
    gateNpcs: [{ x: npcG, title: 'Guarda-Pitomba na ponte', text: 'Ponte erguida! Ela só baixa quando você responder o bloco laranja que ficou antes da rua em obra: o que significa a palavra "inaugurou" no Papel 3?' }],
  })
}

/* ======================================================================================
   2-1  A Ponte das Operações — "A ponte caiu!": o bloqueio É a ponte da obra (bloco das tábuas).
   Revisão fácil do semáforo e bifurcação: andaimes altos com a pergunta bônus (q2) ou térreo com dois vãos.
   ====================================================================================== */
{
  const L = load('reino-numeros-1'), m = new Map(12)
  m.flat(18).obj({ type: 'start', x: 3, y: 9 }).obj({ ref: 'sign1', x: 7, y: 9 }).obj({ ref: 'npc1', x: 12, y: 9 })
  let b = m.x; m.pit(3).coins([[b, 7], [b + 1, 6], [b + 2, 7]])
  b = m.x; m.flat(9).obj({ type: 'checkpoint', id: 'cp1', x: b + 5, y: 9 })
  m.street(8, { id: 'tr1', cycle: { green: 5, yellow: 1.5, red: 6 }, lanes: [{ dir: 1, every: 3 }] })
  b = m.x; m.flat(16)
  const q1x = b + 5, npcG = b + 12
  m.obj({ ref: 'q1', x: q1x, y: 7 })
  b = m.x; m.pit(6).obj({ type: 'gate', id: 'g1', kind: 'bridge', x: b, y: 9, w: 6, requires: 'q1' })
  b = m.x; m.flat(10).obj({ type: 'checkpoint', id: 'cp2', x: b + 2, y: 9 }).obj({ ref: 'sign2', x: b + 6, y: 9 })
  const s0 = m.x                                                         // bifurcação
  m.pit(3).flat(5).pit(3)
  m.plat(s0 - 1, 7, 2).plat(s0 + 2, 5, 2).plat(s0 + 6, 4, 2).plat(s0 + 10, 6, 2)
  m.obj({ ref: 'q2', x: s0 + 6, y: 1 }).coins([[s0 + 2, 4], [s0 + 3, 4], [s0 + 10, 5], [s0 + 11, 5], [s0 + 1, 8], [s0 + 9, 8]])
  b = m.x; m.flat(14).obj({ type: 'checkpoint', id: 'cp3', x: b + 9, y: 9 })
  const a = arena(m)
  finish(L, m, {
    required: ['q1'], tipsX: [4, q1x - 4, a + 1], cordel: [s0 + 8, 2],                     // nos andaimes altos
    decor: [['banco', 10.5], ['mato3', 23], ['mato1', q1x + 4], ['lixeira', s0 - 6], ['mato3', b + 3], ['banco', b + 6.5]],
    gateNpcs: [{ x: npcG, title: 'Engenheira Pitomba na obra', text: 'A ponte fica erguida até a gente saber quantas tábuas comprar! Responda o bloco laranja que fica antes daqui: 4 trechos, 15 tábuas em cada um. Acertou? A ponte baixa.' }],
  })
}

/* ======================================================================================
   2-2  O Labirinto dos Padrões — PORTÕES 1 e 3 que abrem com os padrões, semáforos em sequência
   ("onda verde": dois sinais na mesma mão com defasagem) e LABIRINTO SUBTERRÂNEO opcional (Portão 2).
   ====================================================================================== */
{
  const L = load('reino-numeros-2'), m = new Map(18)
  m.flat(26).obj({ type: 'start', x: 3, y: 9 }).obj({ ref: 'sign1', x: 7, y: 9 }).obj({ ref: 'npc1', x: 12, y: 9 }).obj({ ref: 'q1', x: 17, y: 7 })
  m.obj({ type: 'gate', id: 'g1', kind: 'wall', x: 22, y: 9, w: 2, requires: 'q1' })
  let b = m.x; m.flat(8).obj({ type: 'checkpoint', id: 'cp1', x: b + 3, y: 9 })
  m.street(8, { id: 'tr1', cycle: { green: 4, yellow: 1.2, red: 4.5 }, lanes: [{ dir: 1, every: 2.6 }] }, { after: 0 })
  m.flat(6)                                                              // calçada entre os dois sinais (zona segura)
  m.street(8, { id: 'tr2', cycle: { green: 4, yellow: 1.2, red: 4.5, offset: 2.5 }, lanes: [{ dir: 1, every: 2.6 }] }, { before: 0 })
  b = m.x; m.flat(13).obj({ ref: 'sign2', x: b + 3, y: 9 })
  m.obj({ type: 'sign', id: 'desce1', x: b + 8, y: 9, asset: 'placa_descida', title: 'Acesso subterrâneo', text: 'O caminho do labirinto continua por baixo da rua. Desça a escada, pule as colunas de pedra e procure a saída do outro lado.' })
  const c0 = m.underground(26)                                           // labirinto subterrâneo
  for (const d of [3, 9, 21]) m.set(c0 + d, 15, 'G').set(c0 + d, 14, 'G')   // colunas de rocha
  m.set(c0 + 15, 15, 'G').set(c0 + 15, 14, 'G')                         // v11: 2 tiles (3 deixava 2 px de folga sob a laje)
  m.plat(c0 + 12, 13, 2, '-').plat(c0 + 17, 14, 2, '-')
  m.obj({ ref: 'q2', x: c0 + 18, y: 12 })
  m.coins([[c0 + 1, 15], [c0 + 6, 15], [c0 + 9, 13], [c0 + 12, 12], [c0 + 13, 12], [c0 + 15, 12], [c0 + 23, 15], [c0 + 25, 15]])
  b = m.x; m.flat(18).obj({ type: 'checkpoint', id: 'cp2', x: b + 1, y: 9 })
  const q3x = b + 6; m.obj({ ref: 'q3', x: q3x, y: 7 })
  const npcG = b + 10
  m.obj({ type: 'gate', id: 'g2', kind: 'wall', x: b + 14, y: 9, w: 2, requires: 'q3' })
  b = m.x; m.flat(9).obj({ type: 'checkpoint', id: 'cp3', x: b + 4, y: 9 })
  const a = arena(m)
  finish(L, m, {
    required: ['q1', 'q3'], tipsX: [4, 14, a + 1], cordel: [c0 + 21, 12],                 // em cima de uma coluna do labirinto
    decor: [['mato1', 9], ['banco', 27.5], ['mato3', c0 - 15], ['lixeira', q3x + 2], ['mato1', b + 1]],
    gateNpcs: [{ x: npcG, title: 'Guarda-Pitomba no Portão 3', text: 'O Portão 3 segue a regra das figuras (triângulo, círculo, quadrado...). Ele só abre quando o bloco laranja aqui antes for respondido: qual figura vem depois?' }],
  })
}

/* ======================================================================================
   2-3  A Fortaleza das Frações — MURALHA da fortaleza (bloco dos baús), avenida de mão dupla seguida de
   obra (PARE), MASMORRA subterrânea opcional com a pergunta da torta e rota alta final com a pergunta bônus.
   ====================================================================================== */
{
  const L = load('reino-numeros-3'), m = new Map(18)
  m.flat(26).obj({ type: 'start', x: 3, y: 9 }).obj({ ref: 'sign1', x: 7, y: 9 }).obj({ ref: 'npc1', x: 12, y: 9 }).obj({ ref: 'q1', x: 19, y: 7 })
  let b = m.x; m.pit(3).coins([[b, 7], [b + 1, 6], [b + 2, 7]])
  b = m.x; m.flat(8).obj({ type: 'checkpoint', id: 'cp1', x: b + 4, y: 9 })
  m.street(10, { id: 'tr1', cycle: { green: 4, yellow: 1.2, red: 5 }, lanes: [{ dir: 1, every: 2.6 }, { dir: -1, every: 3.2 }] })
  b = m.x; m.flat(16).obj({ type: 'obstacle', id: 'pare1', x: b + 2, y: 9, asset: 'roadblock' }).obj({ ref: 'sign2', x: b + 7, y: 9 })
  const warnX = b + 4.5, npcG = b + 10
  m.obj({ type: 'gate', id: 'g1', kind: 'wall', x: b + 13, y: 9, w: 2, requires: 'q1' })
  b = m.x; m.flat(15).obj({ type: 'checkpoint', id: 'cp2', x: b + 2, y: 9 }).obj({ ref: 'npc2', x: b + 6, y: 9 })
  m.obj({ type: 'sign', id: 'desce1', x: b + 10, y: 9, asset: 'placa_descida', title: 'Descida para a masmorra', text: 'Prepare-se para descer! A Fortaleza continua pela masmorra, por baixo da rua. A saída é uma escada no fim do corredor.' })
  const c0 = m.underground(20)                                           // masmorra
  m.plat(c0 + 3, 14, 3, '-').plat(c0 + 8, 14, 3, '-').plat(c0 + 13, 14, 3, '-')
  m.obj({ ref: 'q2', x: c0 + 9, y: 12 })
  m.coins([[c0 + 1, 15], [c0 + 4, 13], [c0 + 5, 13], [c0 + 13, 13], [c0 + 14, 13], [c0 + 17, 15], [c0 + 18, 15]])
  b = m.x; m.flat(5)
  const s0 = m.x; m.pit(3); m.flat(14)
  m.plat(s0 - 3, 7, 2).plat(s0, 5, 2).plat(s0 + 4, 7, 2)
  m.obj({ ref: 'q3', x: s0, y: 1 }).coins([[s0, 4], [s0 + 1, 4], [s0, 8], [s0 + 1, 8]])
  m.obj({ ref: 'sign3', x: s0 + 7, y: 9 }).obj({ type: 'checkpoint', id: 'cp3', x: s0 + 12, y: 9 })
  chiefZone(m, { id: 'chefe1', name: 'Capanga-chefe Cobrador', tint: 0xffe08a, text: 'Cuidado! O Capanga-chefe Cobrador guarda a saída da Fortaleza e arremessa chinelos. Desvie, espere a investida e, quando ele ficar tonto, pise na cabeça dele 3 vezes!' })
  const a = arena(m)
  finish(L, m, {
    required: ['q1'], tipsX: [4, 16, a + 1], cordel: [s0 + 5, 5],                          // na rota alta final
    decor: [['mato3', 10], ['banco', 30.5], ['warn', warnX, 9, { scale: 0.5 }], ['mato1', c0 - 22], ['lixeira', b + 2], ['mato3', s0 + 10]],
    gateNpcs: [{ x: npcG, title: 'Guarda-Pitomba na muralha', text: 'A muralha da Fortaleza só abre para quem sabe que fração dos baús já foi aberta. O bloco laranja ficou lá atrás, antes da avenida!' }],
  })
}
/* ======================================================================================
   MUNDO 3 — Rio Capibaribe / Floresta das Descobertas (Ciências). Mecânicas novas da região (GDD 3.2):
   rio com canoas e troncos móveis e barrancos com cipós para ESCALAR. Introdução gradual: 3-1 apresenta o rio
   (tronco lento, depois canoa, depois duas plataformas), 3-2 apresenta os cipós, 3-3 combina tudo.
   ====================================================================================== */
{
  const L = load('floresta-descobertas-1'), m = new Map(12)
  m.flat(22).obj({ type: 'start', x: 3, y: 9 }).obj({ ref: 'sign1', x: 7, y: 9 }).obj({ ref: 'npc1', x: 13, y: 9 })
  m.river(6, [{ kind: 'tronco', speed: 0.6 }])                                // tutorial: tronco lento, rio estreito
  let b = m.x; m.flat(14).obj({ type: 'checkpoint', id: 'cp1', x: b + 2, y: 9 })
  const q1x = b + 8; m.obj({ ref: 'q1', x: q1x, y: 7 })
  const r2 = m.river(7, [{ kind: 'canoa', speed: 0.9 }]); m.plat(r2 + 2, 7, 2)   // plataforma alta sobre o rio (cordel)
  b = m.x; m.flat(12).obj({ ref: 'sign2', x: b + 3, y: 9 })
  const npcG = b + 6; m.obj({ type: 'gate', id: 'g1', kind: 'wall', x: b + 9, y: 9, w: 2, requires: 'q1' })
  m.flat(16)                                                                  // trilha da mata
  b = m.x; m.flat(12).obj({ type: 'checkpoint', id: 'cp2', x: b + 2, y: 9 }).obj({ ref: 'q2', x: b + 7, y: 7 })
  m.river(9, [{ kind: 'canoa', speed: 0.9, at: 0, dx: 2 }, { kind: 'tronco', speed: 0.8, at: 4, dx: 2 }])  // duas plataformas
  b = m.x; m.flat(12).obj({ ref: 'sign3', x: b + 3, y: 9 }).obj({ type: 'checkpoint', id: 'cp3', x: b + 8, y: 9 })
  m.flat(16)                                                                  // trilha da mata
  const a = arena(m)
  finish(L, m, {
    required: ['q1'], tipsX: [4, q1x - 4, a + 1], cordel: [r2 + 3, 5],
    decor: [['mato1', 10], ['mato2', q1x + 3], ['mato3', b + 1]],
    gateNpcs: [{ x: npcG, title: 'Guarda-Pitomba no portão', text: 'O portão de pedra do cais só abre para quem responde o bloco laranja que ficou antes do rio: como se chama a água virando vapor?' }],
  })
}
{
  const L = load('floresta-descobertas-2'), m = new Map(12)
  m.flat(18).obj({ type: 'start', x: 3, y: 9 }).obj({ ref: 'sign1', x: 7, y: 9 }).obj({ ref: 'npc1', x: 12, y: 9 })
  const c1 = m.cliff(4, 6)                                                    // tutorial do cipó
  m.coins([[c1 + 1, 5], [c1 + 2, 5], [c1 + 3, 5]])
  let b = m.x; m.flat(14).obj({ type: 'checkpoint', id: 'cp1', x: b + 3, y: 9 })
  const q1x = b + 9; m.obj({ ref: 'q1', x: q1x, y: 7 })
  m.flat(16)                                                                  // trilha da mata
  m.river(7, [{ kind: 'canoa', speed: 0.9 }])
  b = m.x; m.flat(12).obj({ ref: 'sign2', x: b + 3, y: 9 })
  const npcG = b + 6; m.obj({ type: 'gate', id: 'g1', kind: 'wall', x: b + 9, y: 9, w: 2, requires: 'q1' })
  m.flat(16)                                                                  // trilha da mata
  b = m.x; m.flat(8).obj({ type: 'checkpoint', id: 'cp2', x: b + 3, y: 9 })
  const c2 = m.cliff(4, 8, { vineRight: true })                               // barranco largo, cipó dos dois lados
  m.obj({ ref: 'q2', x: c2 + 3, y: 3 })
  b = m.x; m.flat(12).obj({ ref: 'sign3', x: b + 3, y: 9 }).obj({ type: 'checkpoint', id: 'cp3', x: b + 8, y: 9 })
  m.flat(16)                                                                  // trilha da mata
  const a = arena(m)
  finish(L, m, {
    required: ['q1'], tipsX: [4, q1x - 4, a + 1], cordel: [c2 + 7, 5],
    decor: [['mato3', 9], ['mato2', q1x + 3], ['mato1', b + 1]],
    gateNpcs: [{ x: npcG, title: 'Guarda-Pitomba no portão do mangue', text: 'Este portão só abre para quem responde o bloco laranja lá atrás: quem produz o próprio alimento com a luz do sol?' }],
  })
}
{
  const L = load('floresta-descobertas-3'), m = new Map(12)
  m.flat(20).obj({ type: 'start', x: 3, y: 9 }).obj({ ref: 'sign1', x: 7, y: 9 }).obj({ ref: 'npc1', x: 12, y: 9 })
  m.river(7, [{ kind: 'canoa', speed: 1 }])
  let b = m.x; m.flat(12).obj({ type: 'checkpoint', id: 'cp1', x: b + 2, y: 9 })
  const q1x = b + 7; m.obj({ ref: 'q1', x: q1x, y: 7 })
  m.flat(16)                                                                  // trilha da mata
  m.cliff(4, 5)
  m.flat(6)
  const r2 = m.river(10, [{ kind: 'tronco', speed: 0.9, at: 0, dx: 2 }, { kind: 'tronco', speed: 1.1, at: 5, dx: 2 }]); m.plat(r2 + 4, 7, 2)
  b = m.x; m.flat(12).obj({ ref: 'sign2', x: b + 3, y: 9 })
  const npcG = b + 6; m.obj({ type: 'gate', id: 'g1', kind: 'wall', x: b + 9, y: 9, w: 2, requires: 'q1' })
  m.flat(16)                                                                  // trilha da mata
  b = m.x; m.flat(10).obj({ type: 'checkpoint', id: 'cp2', x: b + 2, y: 9 }).obj({ ref: 'q2', x: b + 7, y: 7 })
  m.flat(16)                                                                  // trilha da mata
  m.cliff(4, 6, { vineRight: true })
  b = m.x; m.flat(12).obj({ ref: 'sign3', x: b + 3, y: 9 }).obj({ type: 'checkpoint', id: 'cp3', x: b + 8, y: 9 })
  m.flat(16)                                                                  // trilha da mata
  chiefZone(m, { id: 'chefe1', name: 'Capanga-chefe Lenhador', tint: 0xb0e8a0, text: 'Cuidado! O Capanga-chefe Lenhador quer derrubar a mata da beira do rio e fechou o caminho do laboratório. Pule a investida e pise na cabeça dele 3 vezes quando ele ficar tonto!' })
  const a = arena(m)
  finish(L, m, {
    required: ['q1'], tipsX: [4, q1x - 4, a + 1], cordel: [r2 + 5, 5],
    decor: [['mato1', 9], ['mato2', q1x + 3], ['mato3', b + 1]],
    gateNpcs: [{ x: npcG, title: 'Guarda-Pitomba no laboratório', text: 'O portão do laboratório só abre para quem responde o bloco laranja: o que é uma hipótese?' }],
  })
}
console.log('fases geradas em', OUT)

