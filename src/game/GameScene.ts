import Phaser from 'phaser'
import type { Level, LevelObject } from '../types'
import { CHARS, POWER, otherChar, centerOffset, type CharId } from './characters'
import { Foes } from './foes'
import type { FoeHit, FoeKind } from './foes'
const FOE_NAME: Record<FoeKind, string> = { capanga: 'Capanga do Ratão', ladrao: 'Ladrão do Ratão', bully: 'Valentão do Ratão', caranguejo: 'Caranguejo', urubu: 'Urubu', chefe: 'Capanga-chefe' }
const FOE_HURT: Record<FoeKind, string> = {
  capanga: 'Ai! Um capanga do Ratão! Pule na cabeça dele.',
  ladrao: 'Ai! O ladrão do Ratão! Desvie dos chinelos e pule na cabeça dele.',
  bully: 'O valentão do Ratão deu uma investida! Pule por cima e pise nele quando ficar tonto.',
  caranguejo: 'Ui, a pinça! Pise no caranguejo só quando as pinças estiverem abaixadas.',
  urubu: 'O urubu deu um rasante! Pule na cabeça dele ou passe por baixo.',
  chefe: '',
}
import { Movers, type Mover } from './nature'
import { CameraFX } from './cameraFx'
import { SCALE, TREES, treeScale, treeFlip, BUILD_MID, BUILD_FAR, TREE_BG } from './scale'
import { ASSETS } from './assets'
import { CompanionAI } from './companion'
import { BusLine, withStations } from './busStop'
import { Traffic, type Crossing } from './traffic'
import { Gates, TS, fr, OPEN_MS } from './gates'

/* Motor de plataforma lateral 2D do Vem Pedroca.
   Estrutura inspirada em "Missões Lite: o jogo": resolução interna fixa (altura 360, largura 640 — 416 no celular em pé),
   mapa em grade de tiles, passo de física fixo de 60 Hz com coyote time, buffer e altura de pulo variável,
   câmera lateral que mira ~40% da largura com antecipação, parallax em camadas, sprites originais sem escala fracionária. */
export const TILE = 32
export const VH = 360
export const ROWS = 12
export const GR = 10 // linha do topo do chão
export const CAMY = ROWS * TILE - VH // câmera na superfície; v9: desce suavemente quando o herói entra no subsolo
const GROUND_Y = GR * TILE
const PW = 18, PH = 30 // hitbox do Pedroca (sprite útil: ~21×32)
const STEP = 1000 / 60
const BASE = '/assets/original/'
const D = { sky: 0, cloud: 1, far: 2, mid: 3, pit: 4, deco: 5, cave: 5.95, tiles: 6, tree: 6.2, plat: 6.4, obj: 7, boss: 8, car: 9, hero: 10, fx: 12 }
/* v8 — escala do Ratão. Forma original (tr1: 28 px visíveis) com a altura do Pedroca (idle: 32 px) ≈ 1,14×;
   chefão transformado: 2× (como na v7, ~76 px). O crescimento acontece só DEPOIS do último quadro da transformação. */
const visH = (k: string) => ASSETS[k][6] - ASSETS[k][4]
const BOSS_SMALL = visH('idle1') / visH('tr1'), BOSS_BIG = 2

type Rect = { x: number; y: number; w: number; h: number }
type Body = Rect & { vx: number; vy: number; ground: boolean; mover?: Mover | null }
type Block = { c: number; r: number; o: LevelObject; spr: Phaser.GameObjects.Image; bump: number; done: boolean; hint?: Phaser.GameObjects.Image }
type Ent = Rect & { o: LevelObject; spr: Phaser.GameObjects.Sprite; inside?: boolean; got?: boolean; hint?: Phaser.GameObjects.Image; seen?: boolean; baseY?: number }

export class GameScene extends Phaser.Scene {
  level!: Level; bus!: Phaser.Events.EventEmitter
  VW = 640
  locked = false; lives = 3; score = 0; collected = 0
  cam = 0; tick = 0
  P: Body & { coy: number; buf: number; jt: number; face: 1 | -1; inv: number } = { x: 0, y: 0, w: PW, h: PH, vx: 0, vy: 0, ground: false, coy: 0, buf: 0, jt: 0, face: 1, inv: 0 }
  inp = { L: false, R: false, J: false, jp: false, U: false, D: false }
  /** v15 — origem do último aperto de pulo: teclado (espaço/seta) ou botão de toque (no cipó, segurar PULAR sobe) */
  private jSrc: 'space' | 'up' | 'touch' = 'space'
  /** v15 — escalando um cipó; plataformas móveis (canoas/troncos); faixas de água animadas */
  climb = false; private movers!: Movers; private water: Phaser.GameObjects.TileSprite[] = []
  private held: Record<string, boolean> = {}
  private lead = 24; private acc = 0; private actPressed = false
  private cps: { x: number; on: boolean; spr: Phaser.GameObjects.Sprite; lamp: Phaser.GameObjects.Sprite }[] = []
  private respawn = { x: 0 }
  private rows: string[] = []; W = 0
  private blocks: Block[] = []; private ents: Ent[] = []; private solids: Rect[] = []
  /** v8: objetos/falas da fase já deslocados pela zona de estação inicial (ver busStop.ts) */
  private objs: LevelObject[] = []; private tips: NonNullable<Level['tips']> = []
  private hero!: Phaser.GameObjects.Image
  heroId: CharId = 'pedroca'
  private comp!: Phaser.GameObjects.Image
  fx!: CameraFX
  /** corpo próprio do acompanhante (estilo Tails): física própria, sem colisão com o herói */
  K: Body & { face: 1 | -1; alpha: number } = { x: 0, y: 0, w: 18, h: 30, vx: 0, vy: 0, ground: false, face: 1, alpha: 1 }
  private compMode: 'follow' | 'battle' | 'cutscene' = 'follow'
  private ai!: CompanionAI; private compFading = false
  /** v8: ônibus de chegada/partida */
  busLine!: BusLine; private stationX = { arrive: 0, depart: 0 }
  heroAlpha = 1; readonly depthBus = D.deco + 0.5
  private cutscene = false; private toStation = false; private bossBody: Rect | null = null; private bossS = 1
  /** v9: altura do mapa (12 ou 18 linhas), câmera vertical, colunas com galeria subterrânea, trânsito e bloqueios */
  private R = ROWS; camY = CAMY; private pitCol: boolean[] = []
  private traffic!: Traffic; private gates!: Gates; private arena: [number, number] | null = null
  private fg: Phaser.GameObjects.Image[] = []
  /** v14 — capangas, power-up (todas as moedas), cordel escondido e artefato da fase */
  private foes!: Foes; powered = false; private prevFeet = 0; private totalCoins = 0
  private cordelGot = false; artifactGot = false; private aura?: Phaser.Time.TimerEvent
  private punchKey: string | null = null; private punchWho: 'hero' | 'comp' | null = null
  private tipsSeen = new Set<number>(); private nearEnt: Ent | null = null; private actCool = 0
  private prompt!: Phaser.GameObjects.Text
  private attacking = false; bossIntro = false; private fightPose = false
  private boss?: Phaser.GameObjects.Sprite; private bossX = 0; private bossStarted = false; private bossDown = false
  private sky!: Phaser.GameObjects.Image
  private ac: AudioContext | null = null
  private onKeyDown = (e: KeyboardEvent) => this.keyDown(e)
  private onKeyUp = (e: KeyboardEvent) => this.keyUp(e)
  private onBlur = () => this.clearInput()
  constructor() { super('game') }

  init(d: { level: Level; bus: Phaser.Events.EventEmitter; hero?: CharId }) {
    this.heroId = d.hero ?? 'pedroca'; this.tipsSeen = new Set(); this.nearEnt = null; this.actCool = 0; this.punchKey = null; this.punchWho = null; this.attacking = false; this.compMode = 'follow'; this.bossIntro = false; this.fightPose = false
    this.level = d.level; this.bus = d.bus; this.locked = false; this.lives = 3; this.score = 0; this.collected = 0
    this.blocks = []; this.ents = []; this.solids = []; this.cps = []; this.bossStarted = false; this.bossDown = false; this.boss = undefined
    this.cutscene = false; this.toStation = false; this.bossBody = null; this.heroAlpha = 1; this.compFading = false
    const z = withStations(d.level)  // v8: zonas de estação antes e depois do mapa original
    this.rows = z.rows; this.objs = z.objects; this.tips = z.tips; this.stationX = { arrive: z.arriveX, depart: z.departX }
    this.W = this.rows[0].length * TILE; this.tick = 0; this.acc = 0; this.lead = 24
    this.R = this.rows.length; this.camY = CAMY; this.fg = []; this.water = []; this.climb = false
    // colunas com galeria: há ar abaixo da superfície e chão de rocha embaixo (vão sem fundo continua sendo vala)
    // valas sem fundo: nenhuma célula sólida da superfície para baixo (galerias e escadarias têm piso de rocha)
    this.pitCol = [...this.rows[0]].map((_, c) => { for (let r = GR; r < this.R; r++) if ('#G='.includes(this.rows[r][c])) return false; return true })
    const b = this.objs.find(o => o.type === 'boss'); this.arena = b ? [(b.x - 14) * TILE, (b.x + 6) * TILE] : null
  }

  preload() {
    for (const [k, v] of Object.entries(ASSETS)) this.load.image(k, encodeURI(BASE + v[0]))
    this.load.spritesheet(TS, BASE + 'cenario/tiles-marcozero.png', { frameWidth: TILE, frameHeight: TILE }) // v9: tileset original do subsolo
    this.load.on('loaderror', (f: { key: string }) => this.bus.emit('error', 'Asset não carregou: ' + f.key))
  }

  /* ---------- helpers de desenho ---------- */
  /** Coloca um sprite original com a base opaca (bbox) apoiada em y e o centro opaco em cx. */
  scaleOf(key: string) { return SCALE[key] ?? 1 }
  put(key: string, cx: number, groundY: number, scale = 1, flip = false, depth = D.deco): Phaser.GameObjects.Image {
    const a = ASSETS[key], bcx = (a[3] + a[5]) / 2
    const img = this.add.image(Math.round(cx + (a[1] / 2 - bcx) * scale * (flip ? -1 : 1)), Math.round(groundY + (a[2] - a[6]) * scale), key)
    return img.setOrigin(0.5, 1).setScale(scale).setFlipX(flip).setDepth(depth)
  }
  private canvasTex(key: string, w: number, h: number, draw: (x: CanvasRenderingContext2D) => void) {
    if (this.textures.exists(key)) return
    const t = this.textures.createCanvas(key, w, h)!, x = t.getContext(); x.imageSmoothingEnabled = false; draw(x); t.refresh()
  }
  private makeTextures() {
    const rnd = (() => { let s = 11; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280 } })()
    // Chão de rua do Recife (calçada de pedra + meio-fio + asfalto). Não há tile de rua nos assets originais; paleta quente dos prédios.
    this.canvasTex('ground_top', TILE, TILE, x => {
      x.fillStyle = '#3a3040'; x.fillRect(0, 0, 32, 32)
      x.fillStyle = '#1b1325'; x.fillRect(0, 0, 32, 2)
      x.fillStyle = '#d9c7a4'; x.fillRect(0, 2, 32, 8)
      x.fillStyle = '#efe0bf'; x.fillRect(0, 2, 32, 2)
      x.fillStyle = '#b09a74'; x.fillRect(0, 9, 32, 1); x.fillRect(7, 4, 1, 5); x.fillRect(23, 4, 1, 5); x.fillRect(15, 2, 1, 2)
      x.fillStyle = '#8c7a63'; x.fillRect(0, 10, 32, 4)
      x.fillStyle = '#6d5d4c'; x.fillRect(0, 13, 32, 1)
      x.fillStyle = '#463b4d'; x.fillRect(0, 14, 32, 18)
      x.fillStyle = '#3a3040'; for (let i = 0; i < 18; i++) x.fillRect(Math.floor(rnd() * 32), 15 + Math.floor(rnd() * 16), 2, 1)
    })
    this.canvasTex('ground', TILE, TILE, x => {
      x.fillStyle = '#463b4d'; x.fillRect(0, 0, 32, 32)
      x.fillStyle = '#3a3040'; for (let i = 0; i < 20; i++) x.fillRect(Math.floor(rnd() * 31), Math.floor(rnd() * 31), 2, 1)
      x.fillStyle = '#54485c'; for (let i = 0; i < 10; i++) x.fillRect(Math.floor(rnd() * 31), Math.floor(rnd() * 31), 1, 1)
    })
    const qb = (key: string, body: string, hi: string, lo: string, glyph: boolean) => this.canvasTex(key, TILE, TILE, x => {
      x.fillStyle = '#000'; x.fillRect(0, 0, 32, 32)
      x.fillStyle = body; x.fillRect(2, 2, 28, 28)
      x.fillStyle = hi; x.fillRect(2, 2, 28, 2); x.fillRect(2, 2, 2, 28)
      x.fillStyle = lo; x.fillRect(2, 28, 28, 2); x.fillRect(28, 2, 2, 28)
      x.fillStyle = '#000'; for (const [a, b] of [[5, 5], [25, 5], [5, 25], [25, 25]]) x.fillRect(a, b, 2, 2)
      if (glyph) {
        const g = ['.XXXX.', 'XX..XX', '....XX', '...XX.', '..XX..', '......', '..XX..']
        x.fillStyle = '#3a2200'; g.forEach((row, yy) => { for (let i = 0; i < 6; i++) if (row[i] === 'X') x.fillRect(10 + i * 2, 8 + yy * 2, 2, 2) })
      } else { x.fillStyle = lo; x.fillRect(11, 11, 10, 10); x.fillStyle = hi; x.fillRect(12, 12, 8, 1) }
    })
    this.canvasTex('hazard', 16, 6, x => {
      x.fillStyle = '#ffb800'; x.fillRect(0, 0, 16, 6); x.fillStyle = '#000'
      for (let i = -6; i < 24; i += 8) for (let j = 0; j < 6; j++) x.fillRect(i + j, j, 4, 1)
    })
    qb('qblock', '#ffb800', '#ffe27a', '#b97a00', true)
    qb('qused', '#8a7a6a', '#a99a88', '#5e5246', false)
    qb('qreq', '#ff7a2f', '#ffc18a', '#a8400f', true) // v9: bloco OBRIGATÓRIO (libera um bloqueio): laranja, com seta
    // v15 (PROVISÓRIO): chão de mata — grama no topo e terra; água do rio; cipó; canoa e tronco
    this.canvasTex('grass_top', TILE, TILE, x => {
      x.fillStyle = '#3b2a20'; x.fillRect(0, 0, 32, 32); x.fillStyle = '#1b1325'; x.fillRect(0, 0, 32, 2)
      x.fillStyle = '#4f8a3a'; x.fillRect(0, 2, 32, 7); x.fillStyle = '#6fb04c'; x.fillRect(0, 2, 32, 2)
      x.fillStyle = '#2f5e26'; for (let i = 0; i < 12; i++) x.fillRect(Math.floor(rnd() * 31), 6 + Math.floor(rnd() * 3), 1, 3)
      x.fillStyle = '#8fd06a'; for (let i = 0; i < 8; i++) x.fillRect(Math.floor(rnd() * 31), 1, 1, 2)
      x.fillStyle = '#5a3f2c'; x.fillRect(0, 9, 32, 4); x.fillStyle = '#4a3324'; for (let i = 0; i < 14; i++) x.fillRect(Math.floor(rnd() * 31), 13 + Math.floor(rnd() * 18), 2, 1)
    })
    this.canvasTex('mud', TILE, TILE, x => {
      x.fillStyle = '#3b2a20'; x.fillRect(0, 0, 32, 32); x.fillStyle = '#4a3324'; for (let i = 0; i < 18; i++) x.fillRect(Math.floor(rnd() * 31), Math.floor(rnd() * 31), 2, 1)
      x.fillStyle = '#2c1f17'; for (let i = 0; i < 8; i++) x.fillRect(Math.floor(rnd() * 31), Math.floor(rnd() * 31), 1, 1)
    })
    this.canvasTex('agua', 64, 26, x => {
      x.fillStyle = '#2a6f9e'; x.fillRect(0, 0, 64, 26); x.fillStyle = '#1f557d'; x.fillRect(0, 12, 64, 14)
      x.fillStyle = '#7fc3e8'; for (let i = 0; i < 64; i += 16) { x.fillRect(i, 2, 8, 1); x.fillRect(i + 8, 7, 6, 1) }
      x.fillStyle = '#4b97c7'; for (let i = 4; i < 64; i += 16) x.fillRect(i, 15, 7, 1)
    })
    this.canvasTex('cipo', TILE, TILE, x => {
      x.fillStyle = '#2f5e26'; x.fillRect(14, 0, 4, 32); x.fillStyle = '#4f8a3a'; x.fillRect(15, 0, 2, 32)
      x.fillStyle = '#6fb04c'; for (const [a, b] of [[8, 4], [18, 11], [9, 19], [19, 26]]) { x.fillRect(a, b, 5, 3); x.fillRect(a + 1, b - 1, 3, 1) }
      x.fillStyle = '#1b3a18'; x.fillRect(14, 0, 1, 32)
    })
    const boat = (key: string, body: string, hi: string, lo: string, log: boolean) => this.canvasTex(key, 96, 16, x => {
      x.fillStyle = '#1b1325'; x.fillRect(log ? 0 : 4, 2, log ? 96 : 88, 13)
      x.fillStyle = body; x.fillRect(log ? 1 : 5, 3, log ? 94 : 86, 11); x.fillStyle = hi; x.fillRect(log ? 1 : 5, 3, log ? 94 : 86, 2); x.fillStyle = lo; x.fillRect(log ? 1 : 5, 11, log ? 94 : 86, 3)
      if (log) { x.fillStyle = '#c9a26a'; x.fillRect(0, 4, 4, 8); x.fillRect(92, 4, 4, 8); x.fillStyle = lo; for (let i = 10; i < 90; i += 14) x.fillRect(i, 6, 6, 1) }
      else { x.fillStyle = '#1b1325'; x.fillRect(0, 0, 6, 6); x.fillRect(90, 0, 6, 6); x.fillStyle = body; x.fillRect(1, 1, 4, 4); x.fillRect(91, 1, 4, 4); x.fillStyle = '#c23b22'; x.fillRect(5, 8, 86, 2) }
    })
    boat('canoa', '#8a5a2e', '#b57a43', '#5e3b1c', false); boat('tronco', '#6b4423', '#8a5a2e', '#4a2e16', true)
    // v10: leito da rua no nível da calçada (topo de asfalto com a mesma borda escura do chão, sem degrau)
    this.canvasTex('asphalt', TILE, TILE, x => {
      x.fillStyle = '#3a3040'; x.fillRect(0, 0, 32, 32); x.fillStyle = '#1b1325'; x.fillRect(0, 0, 32, 2)
      x.fillStyle = '#4a4052'; x.fillRect(0, 2, 32, 12); x.fillStyle = '#56495e'; x.fillRect(0, 2, 32, 1)
      x.fillStyle = '#3e3446'; for (let i = 0; i < 10; i++) x.fillRect(Math.floor(rnd() * 31), 4 + Math.floor(rnd() * 9), 2, 1)
      x.fillStyle = '#463b4d'; x.fillRect(0, 14, 32, 18)
    })
  }

  /* ---------- criação ---------- */
  create() {
    this.makeTextures()
    const mk = (key: string, prefix: string, n: number | number[], rate: number, repeat = -1) => {
      if (this.anims.exists(key)) return
      const list = Array.isArray(n) ? n : Array.from({ length: n }, (_, i) => i + 1)
      this.anims.create({ key, frames: list.map(i => ({ key: prefix + i })), frameRate: rate, repeat })
    }
    mk('boss', 'boss', Array.from({ length: 11 }, (_, i) => i + 2), 8); mk('faint', 'faint', 6, 7, 0)
    const fistSets: [string, string][] = [['murro', 'murro'], ['murro_v', 'murro_v'], ['murro_a', 'murro_a'], ['murro_r', 'murro_r']]
    for (const [k, pre] of fistSets) { let n = 0; while (ASSETS[pre + (n + 1)]) n++; if (n) mk('f_' + k, pre, n, 16, 0) }
    mk('dust', 'dust', 14, 24, 0)
    mk('npc', 'npc', 4, 4); mk('coin', 'coin', [2, 3, 4], 6); mk('lamp', 'aceso', [1, 2, 4, 5, 6, 7, 8], 8); mk('bus', 'onibus', 4, 4)

    this.cameras.main.setBackgroundColor('#14001d')
    this.sky = this.add.image(0, 0, 'ceu').setOrigin(0, 0).setScrollFactor(0).setDepth(D.sky).setFlipY(true).setDisplaySize(this.VW, VH)
    if (this.level.theme.skyTint) this.sky.setTint(this.level.theme.skyTint)
    this.buildBackground()
    this.buildTerrain()
    this.buildObjects()
    // v9: trânsito (semáforos, faixa e carros) e bloqueios educativos
    this.traffic = new Traffic(this, this.objs, GROUND_Y, D.obj, D.car)
    this.gates = new Gates(this, this.objs, GROUND_Y, D.plat)
    this.foes = new Foes(this, this.objs, (c, r) => this.cellSolid(c, r), D.obj + 0.5)
    this.movers = new Movers(this, this.objs, D.plat)
    this.totalCoins = this.objs.filter(o => o.type === 'collectible').length; this.powered = false; this.cordelGot = false; this.artifactGot = false

    const oc = CHARS[otherChar(this.heroId)]
    this.comp = this.add.image(0, 0, oc.idle.key + '1').setOrigin(0.5, 1).setDepth(D.hero - 1)
    this.hero = this.add.image(0, 0, CHARS[this.heroId].idle.key + '1').setOrigin(0.5, 1).setDepth(D.hero)
    this.prompt = this.add.text(0, 0, '', { fontFamily: '"Silkscreen", monospace', fontSize: '8px', color: '#ffb800', backgroundColor: '#14001d', padding: { x: 4, y: 2 } }).setOrigin(0.5, 1).setDepth(D.fx).setVisible(false)
    this.fx = new CameraFX(this); this.fx.setBounds(0, 0, this.W, this.R * TILE)
    this.ai = new CompanionAI({
      tile: TILE, deathY: this.R * TILE, worldW: this.W, solids: this.solids,
      hazard: x => this.traffic.unsafe(x),
      cellSolid: (c, r) => this.cellSolid(c, r), oneway: (c, r) => this.oneway(c, r),
      moveX: (o, dx) => this.moveX(o, dx), moveY: (o, dy) => this.moveY(o, dy),
      view: () => ({ x0: this.cam, x1: this.cam + this.VW }),
    })
    this.respawnAt(this.respawn.x)
    this.cameras.main.setRoundPixels(true)
    if (this.scale.width !== this.VW) this.scale.resize(this.VW, VH)
    window.addEventListener('keydown', this.onKeyDown); window.addEventListener('keyup', this.onKeyUp); window.addEventListener('blur', this.onBlur)
    this.events.once('shutdown', () => { window.removeEventListener('keydown', this.onKeyDown); window.removeEventListener('keyup', this.onKeyUp); window.removeEventListener('blur', this.onBlur) })
    this.hud()
    // v8: toda fase começa com o ônibus chegando à estação (?nobus pula, para testes)
    this.busLine = new BusLine(this, this.level, this.stationX.arrive, this.stationX.depart, GROUND_Y, D.deco)
    if (!location.search.includes('nobus')) void this.busLine.playArrival(this.respawn.x + PW / 2)
  }

  /* ---------- v8: cutscenes (ônibus) ---------- */
  /** entra em modo cena: sem controle do jogador, acompanhante sem IA, faixas de cinema na interface */
  beginCutscene() {
    this.cutscene = true; this.locked = true; this.clearInput(); this.compMode = 'cutscene'; this.setNear(null)
    Object.assign(this.P, { vx: 0, vy: 0, ground: true, inv: 0 }); this.P.y = GROUND_Y - PH
    this.tweens.killTweensOf(this.K); this.K.vx = 0; this.K.vy = 0
    this.bus.emit('intro', true)
  }
  endCutscene() {
    this.cutscene = false; this.compMode = 'follow'; this.heroAlpha = 1; this.K.alpha = 1
    this.ai.reset(this.P.x + PW / 2, this.P.y + PH, this.P.face)
    this.bus.emit('intro', false); this.locked = false; this.acc = 0; this.actPressed = false; this.actCool = 12
  }
  /** depois do chefão: o jogador volta a andar e precisa chegar à estação final */
  private afterBoss() {
    this.fightPose = false; this.compMode = 'follow'; this.toStation = true
    if (this.level.artifact && !this.artifactGot) {
      // v14 — o artefato roubado (GDD 1.1) sai do Ratão derrotado, sobe e voa até o herói
      const a = this.add.image(this.bossVisCx, this.bossGy - 40, 'artefato').setDepth(D.fx).setScale(1.5)
      this.spark(a.x, a.y, 12, [0xffe27a, 0xffffff], 30, 500)
      this.tweens.add({ targets: a, y: a.y - 40, duration: 500, ease: 'Quad.easeOut', onComplete: () => {
        this.tweens.add({ targets: a, x: this.P.x + PW / 2, y: this.P.y + 4, scale: 0.6, duration: 600, ease: 'Quad.easeIn', onComplete: () => {
          a.destroy(); this.artifactGot = true; this.sfx('win'); this.addScore(100)
          this.bus.emit('artifact', this.level.artifact); this.bus.emit('toast', 'Artefato recuperado: ' + this.level.artifact!.name + '!')
        } })
      } })
    }
    this.ai.reset(this.P.x + PW / 2, this.P.y + PH, this.P.face)
    this.busLine.depart.showGoal(true)
    this.bus.emit('goal', 'station'); this.bus.emit('toast', 'Agora siga até a estação de ônibus! →')
    this.locked = false; this.acc = 0; this.actPressed = false; this.actCool = 12
  }

  private buildBackground() {
    let s = 5; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
    if (this.level.theme.biome === 'mata') return this.buildForest(rnd)
    // nuvens (camada mais lenta, deriva sozinha)
    const clouds = ['nuvem1', 'nuvem5', 'nuvem6', 'nuvem7', 'nuvem1', 'nuvem6']
    clouds.forEach((k, i) => {
      const c = this.add.image(i * 330 + rnd() * 90, 40 + rnd() * 90, k).setOrigin(0, 0).setScrollFactor(0.08).setDepth(D.cloud).setAlpha(0.92).setScale(i % 2 ? 1 : 1.5)
      this.tweens.add({ targets: c, x: c.x + 60, duration: 24000 + i * 3000, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
    })
    // camada distante: fachadas desfocadas do Recife antigo, 1x, devagar
    const th = this.level.theme, far = th.far ?? ['pred1', 'pred7', 'pred3', 'pred8', 'pred5', 'sinagoga', 'pred6', 'pred2', 'cinema', 'pred8', 'pred1']
    let x = -40, i = 0
    while (x < this.W * 0.3 + this.VW + 400) {
      const k = far[i++ % far.length], a = ASSETS[k], w = a[1]
      this.put(k, x + (w / 2) * BUILD_FAR, GROUND_Y, BUILD_FAR, false, D.far).setScrollFactor(0.3).setTint(th.tint ?? 0x9d9cc2)
      this.foundation(x + (w / 2 - (a[5] - a[3]) / 2) * BUILD_FAR, (a[5] - a[3]) * BUILD_FAR, 0.3, D.far, th.tint ?? 0x9d9cc2)
      x += ((a[5] - a[3]) + 6 + rnd() * 26) * BUILD_FAR
    }
    // camada intermediária: sobrados de filtro quente, 2x, fachada contínua atrás da calçada
    const mid = th.mid ?? ['wamarelo', 'wvermelho', 'wverde', 'wazul', 'wlaranja', 'wazulesc', 'wverdeclaro']
    x = -80; i = 2
    while (x < this.W * 0.6 + this.VW + 500) {
      const k = mid[i++ % mid.length], a = ASSETS[k]
      const bw = (a[5] - a[3]) * BUILD_MID
      this.put(k, x + bw / 2, GROUND_Y, BUILD_MID, false, D.mid).setScrollFactor(0.6).setTint(th.midTint ?? 0x9a92b4)
      this.foundation(x, bw, 0.6, D.mid, th.midTint ?? 0x9a92b4)
      // v8: árvores entre os sobrados (mesma camada e filtro), quando sobra espaço na calçada do fundo
      const gapW = 18 + rnd() * 70, tx = x + bw + gapW / 2
      if (gapW > 52 && rnd() < 0.35 && this.treeOk(tx, 0.6)) this.put(rnd() < 0.5 ? 'mato1' : 'mato3', tx, this.baseY(0.6), 6, rnd() < 0.5, D.mid).setScrollFactor(0.6).setTint(th.midTint ?? 0x9a92b4)
      x += bw + gapW
    }
    // v8: fileira de árvores do plano intermediário próximo (entre os sobrados e a calçada jogável). Sem colisão;
    // atrás do terreno, das plataformas e dos objetos, então nunca esconde o caminho. Tamanho 3–5× (96–160 px).
    const nearTint = th.midTint ? Phaser.Display.Color.IntegerToColor(th.midTint).lighten(18).color : 0xc4bdd6
    // v9: menos árvores e em grupos (bosque de 2–3 árvores alternado com trechos abertos), base exatamente na
    // linha do chão vista pela câmera (compensa o parallax vertical) e nenhuma na janela da arena do chefão
    x = 120 + rnd() * 200
    while (x < this.W * 0.85 + this.VW + 200) {
      const n = rnd() < 0.45 ? 1 : rnd() < 0.7 ? 2 : 3
      for (let k = 0; k < n; k++) {
        const tx = x + k * (110 + rnd() * 50), sc = TREE_BG[Math.floor(rnd() * TREE_BG.length)]
        if (!this.treeOk(tx, 0.85)) continue
        this.put(rnd() < 0.55 ? 'mato1' : 'mato3', tx, this.baseY(0.85), sc, rnd() < 0.5, D.mid + 0.5).setScrollFactor(0.85).setTint(nearTint)
        // v10: arbustos na base de parte das árvores (mesma camada, mesmo chão), formando pequenos canteiros
        if (rnd() < 0.55) this.put('mato2', tx + (rnd() < 0.5 ? -1 : 1) * (16 + rnd() * 14), this.baseY(0.85), 2, rnd() < 0.5, D.mid + 0.51).setScrollFactor(0.85).setTint(nearTint)
      }
      x += (n - 1) * 130 + 380 + rnd() * 460
    }
    // v10: removida a vegetação de primeiro plano abaixo da calçada (parecia enterrada); os arbustos agora ficam
    // apoiados no chão, junto das árvores (fileira de fundo acima e árvores do percurso em buildObjects)
  }

  /** v15 — fundo da mata ciliar do Capibaribe: nuvens, duas fileiras de árvores com parallax (no lugar dos prédios)
   *  e árvores próximas, todas apoiadas na linha do chão e fora da janela da arena (ARTE PROVISÓRIA: só há 2 espécies) */
  private buildForest(rnd: () => number) {
    const th = this.level.theme
    ;['nuvem1', 'nuvem5', 'nuvem6', 'nuvem7', 'nuvem1', 'nuvem6'].forEach((k, i) => {
      const c = this.add.image(i * 330 + rnd() * 90, 30 + rnd() * 80, k).setOrigin(0, 0).setScrollFactor(0.08).setDepth(D.cloud).setAlpha(0.9).setScale(i % 2 ? 1 : 1.5)
      this.tweens.add({ targets: c, x: c.x + 60, duration: 24000 + i * 3000, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
    })
    const layer = (sf: number, depth: number, scales: number[], gap: [number, number], tint: number) => {
      let x = -60
      while (x < this.W * sf + this.VW + 300) {
        const sc = scales[Math.floor(rnd() * scales.length)]
        this.put(rnd() < 0.5 ? 'mato1' : 'mato3', x, this.baseY(sf), sc, rnd() < 0.5, depth).setScrollFactor(sf).setTint(tint)
        x += gap[0] + rnd() * gap[1]
      }
    }
    layer(0.3, D.far, [7, 8, 9], [70, 60], th.tint ?? 0x5d7f8a)
    layer(0.6, D.mid, [8, 9, 10], [110, 90], th.midTint ?? 0x7fa07a)
    const nearTint = th.midTint ? Phaser.Display.Color.IntegerToColor(th.midTint).lighten(18).color : 0xa8c8a0
    let x = 120 + rnd() * 200
    while (x < this.W * 0.85 + this.VW + 200) {
      const sc = TREE_BG[Math.floor(rnd() * TREE_BG.length)]
      if (this.treeOk(x, 0.85)) { this.put(rnd() < 0.55 ? 'mato1' : 'mato3', x, this.baseY(0.85), sc, rnd() < 0.5, D.mid + 0.5).setScrollFactor(0.85).setTint(nearTint)
        if (rnd() < 0.6) this.put('mato2', x + (rnd() < 0.5 ? -1 : 1) * (16 + rnd() * 14), this.baseY(0.85), 2, rnd() < 0.5, D.mid + 0.51).setScrollFactor(0.85).setTint(nearTint) }
      x += 180 + rnd() * 260
    }
  }
  /** v13 — como no original, os prédios ficam sobre uma laje grossa de tijolo com moldura de pedra (tiles-marcozero
   *  8–10 × 14–15). Só nas fases com vale subterrâneo, onde a câmera desce e a base do prédio ficaria flutuando. */
  private foundation(x: number, w: number, sf: number, depth: number, tint: number) {
    if (this.R <= ROWS || w < 40) return
    const y = GROUND_Y, h = 340, x0 = Math.round(x), ww = Math.round(w)
    const add = (ax: number, ay: number, aw: number, ah: number, f: number) => this.add.tileSprite(ax, ay, aw, ah, TS, f).setOrigin(0, 0).setScrollFactor(sf).setDepth(depth - 0.01).setTint(tint)
    add(x0 + 8, y, ww - 16, TILE, fr(9, 14)); add(x0 + 8, y + TILE, ww - 16, h - TILE, fr(9, 15))
    add(x0, y, 8, TILE, fr(8, 14)).setTilePosition(0, 0); add(x0, y + TILE, 8, h - TILE, fr(8, 15))
    add(x0 + ww - 8, y, 8, TILE, fr(10, 14)).setTilePosition(24, 0); add(x0 + ww - 8, y + TILE, 8, h - TILE, fr(10, 15)).setTilePosition(24, 0)
  }
  /** y em que a base de um sprite com parallax vertical (fator sf) coincide com a linha do chão na câmera da superfície */
  private baseY(sf: number) { return Math.round(GROUND_Y - CAMY * (1 - sf)) }
  /** árvore de fundo (fator sf) ficaria visível na tela durante a luta contra o chefão? */
  private treeOk(x: number, sf: number) {
    // v11: no ponto em que a árvore aparece na tela (com o herói por perto), o chão da rua tem de ser firme —
    // nada de árvore de fundo "pousada" na boca de uma escadaria, numa vala ou numa ponte
    const wx = (x - this.VW * 0.4 * (1 - sf)) / sf
    for (let c = Math.floor((wx - 48) / TILE); c <= Math.floor((wx + 48) / TILE); c++) if (!'#='.includes(this.rows[GR]?.[c] ?? '#')) return false
    // v13: perto de um vale subterrâneo a câmera desce e a base da árvore de fundo ficaria no ar — não planta ali
    if (this.R > ROWS) for (let c = Math.floor((wx - this.VW * 0.7) / TILE); c <= Math.floor((wx + this.VW * 0.7) / TILE); c++) if (this.rows[GR]?.[c] === '.' && !this.pitCol[c]) return false
    // pontos de interação/leitura: com o herói perto (câmera ≈ objeto − 40% da tela), a árvore de fundo não pode cair atrás deles
    for (const o of this.objs) if (['question', 'gate', 'sign', 'npc', 'traffic', 'checkpoint'].includes(o.type)) {
      const ox = o.x * TILE + 16, cam = Math.max(0, ox - this.VW * 0.4), at = ox - cam * (1 - sf)
      if (Math.abs(x - at) < 110) return false
    }
    if (!this.arena) return true
    const c0 = this.arena[0] - this.VW * 0.6, c1 = this.arena[1] - this.VW * 0.3   // câmera durante a luta
    return !(x + 80 > sf * c0 && x - 80 < sf * c1 + this.VW)
  }

  private buildTerrain() {
    const r = this.rows, cols = r[0].length, R = this.R
    const at = (c: number, y: number) => r[y]?.[c] ?? (c < 0 || c >= cols ? '#' : '.')
    const solidCh = (ch: string) => ch === '#' || ch === 'G' || ch === '='
    // v13 — subsolo no padrão do VemPedroca original: vale a céu aberto (sem fundo pintado: o céu aparece), aterro de
    // alvenaria musgosa (#25/#26 do tiles-marcozero, o tile do UndergroundBackground original) e, em toda face exposta
    // do terreno, a crosta de pedregulho recortada das peças de borda do mesmo tileset (topo, laterais e base).
    const crust = (tx: number, ty: number, up: boolean, dn: boolean, lf: boolean, rt: boolean) => {
      const x = tx * TILE, y = ty * TILE, add = (f: number, cx: number, cy: number, cw: number, ch: number) => this.add.image(x, y, TS, f).setOrigin(0, 0).setDepth(D.tiles + 0.02).setCrop(cx, cy, cw, ch)
      if (up) add(fr(2, 5), 0, 0, 32, 8)
      if (dn) add(fr(2, 8), 0, 24, 32, 8)
      if (lf) add(fr(1, 6), 0, up ? 6 : 0, 8, up ? 26 : 32)
      if (rt) add(fr(3, 6), 24, up ? 6 : 0, 8, up ? 26 : 32)
    }
    for (let ty = 0; ty < R; ty++) for (let tx = 0; tx < cols; tx++) {
      const ch = r[ty][tx]
      if (ch === '#') {
        const mata = this.level.theme.biome === 'mata', topCell = !(r[ty - 1]?.[tx] === '#' || r[ty - 1]?.[tx] === '=')
        this.add.image(tx * TILE, ty * TILE, topCell ? (mata ? 'grass_top' : 'ground_top') : (mata ? 'mud' : 'ground')).setOrigin(0, 0).setDepth(D.tiles)
        // v13: onde a rua termina sobre o vale, o corte da laje ganha acabamento (crosta lateral/inferior), como no original
        if (R > ROWS && ty >= GR) crust(tx, ty, false, ty + 1 < R && !solidCh(at(tx, ty + 1)), !solidCh(at(tx - 1, ty)) && !this.pitCol[tx - 1], !solidCh(at(tx + 1, ty)) && !this.pitCol[tx + 1])
      } else if (ch === '=') this.add.image(tx * TILE, ty * TILE, 'asphalt').setOrigin(0, 0).setDepth(D.tiles) // v10: leito da rua, no mesmo nível da calçada
      else if (ch === 'G') {
        // v13: aterro / piso do vale = alvenaria musgosa do original (#25/#26), alternada por posição, + crosta de pedregulho
        const up = !solidCh(at(tx, ty - 1)), dn = !solidCh(at(tx, ty + 1)) && ty + 1 < R, lf = !solidCh(at(tx - 1, ty)), rt = !solidCh(at(tx + 1, ty))
        if (this.level.theme.biome === 'mata') { this.add.image(tx * TILE, ty * TILE, up ? 'grass_top' : 'mud').setOrigin(0, 0).setDepth(D.tiles); continue }   // v15: barranco de terra
        this.add.image(tx * TILE, ty * TILE, TS, ((tx * 5 + ty * 3) % 7) < 2 ? fr(35, 6) : fr(36, 6)).setOrigin(0, 0).setDepth(D.tiles)
        crust(tx, ty, up, dn, lf, rt)
      }
    }
    // valas (vãos sem fundo): fundo escuro até o fim do mundo + faixa de aviso nas bordas. Rua rebaixada e boca de galeria NÃO são vala.
    // v15: cipós e rio (faixas de água animadas; o fundo do rio é escuro até o fim do mundo)
    for (let ty = 0; ty < R; ty++) for (let tx = 0; tx < cols; tx++) if (r[ty][tx] === 'H') this.add.image(tx * TILE, ty * TILE, 'cipo').setOrigin(0, 0).setDepth(D.tree + 0.05)
    for (let tx = 0; tx < cols; tx++) if (r[GR][tx] === '~' && r[GR][tx - 1] !== '~') {
      let e = tx; while (e + 1 < cols && r[GR][e + 1] === '~') e++
      const w = (e - tx + 1) * TILE
      this.add.rectangle(tx * TILE, GROUND_Y + 20, w, R * TILE - GROUND_Y + VH, 0x123a55).setOrigin(0, 0).setDepth(D.pit)
      this.water.push(this.add.tileSprite(tx * TILE, GROUND_Y + 6, w, 26, 'agua').setOrigin(0, 0).setDepth(D.plat + 0.1).setAlpha(0.92))
    }
    const pitCol = (c: number) => { if (r[GR][c] === '~') return false; for (let y = GR; y < R; y++) if (solidCh(at(c, y))) return false; return true }
    for (let tx = 0; tx < cols; tx++) {
      if (pitCol(tx) && (tx === 0 || !pitCol(tx - 1))) {
        let e = tx; while (e + 1 < cols && pitCol(e + 1)) e++
        this.add.rectangle(tx * TILE, GROUND_Y, (e - tx + 1) * TILE, R * TILE - GROUND_Y + VH, 0x0f0817).setOrigin(0, 0).setDepth(D.pit)
        this.add.tileSprite(tx * TILE, GROUND_Y, (e - tx + 1) * TILE, 6, 'hazard').setOrigin(0, 0).setDepth(D.pit)
      }
    }
    // plataformas atravessáveis: '-' arte original "plataforma-com-barra" (64 px = 2 colunas); '_' laje fina do subsolo (tileset)
    const a = ASSETS.platb
    for (let ty = 0; ty < R; ty++) {
      let tx = 0
      while (tx < cols) {
        const ch = r[ty][tx]
        if (ch !== '-' && ch !== '_') { tx++; continue }
        let n = 0; while (tx + n < cols && r[ty][tx + n] === ch) n++
        if (ch === '_') {
          for (let k = 0; k < n; k++) this.add.image((tx + k) * TILE, ty * TILE, TS, fr(k === 0 ? 10 : k === n - 1 ? 14 : 12, 5)).setOrigin(0, 0).setDepth(D.plat)
        } else for (let k = 0; k < n; k += 2) {
          // trecho ímpar: a última peça recua 1 coluna (sobrepõe a anterior); bloco solitário usa só a metade esquerda da arte
          const start = n === 1 ? tx : k + 2 <= n ? tx + k : tx + n - 2
          const img = this.add.image(start * TILE + TILE, ty * TILE - a[4], 'platb').setOrigin(0.5, 0).setDepth(D.plat)
          if (n === 1) img.setCrop(0, 0, TILE, a[2])
        }
        tx += n
      }
    }
  }

  private buildObjects() {
    const pos = (o: LevelObject) => ({ cx: o.x * TILE + TILE / 2, gy: (o.y + 1) * TILE })
    for (const o of this.objs) {
      const { cx, gy } = pos(o)
      if (o.type === 'start') this.respawn = { x: o.x * TILE + TILE / 2 - PW / 2 }
      else if (this.inArena(cx) && (o.type === 'decor' || o.type === 'obstacle' || o.type === 'sign' || o.type === 'question' || o.type === 'collectible')) {
        // v9: a arena do chefão é só para o combate — nada de cenário, placas, blocos ou moedas dentro dela
        continue
      } else if (o.type === 'decor' && o.asset && TREES.has(o.asset)) {
        // v9: árvore do plano de jogo — 3–4× (96–128 px), plantada na calçada (base 3 px abaixo do topo do chão, à frente
        // da laje e atrás de plataformas, blocos, objetos e personagens), sem colisão
        this.put(o.asset, cx, gy + 3, o.scale ?? treeScale(o.x), o.flip ?? treeFlip(o.x), D.tree)
        // v10: arbusto (matoA2, decorativo, sem colisão) plantado ao pé da árvore, à frente do tronco
        const side = treeFlip(o.x + 3) ? 1 : -1
        this.put('mato2', cx + side * 26, gy + 1, 2, side > 0, D.tree + 0.01)
        if (treeScale(o.x + 5) >= 7) this.put('mato2', cx - side * 30, gy + 1, 2, side < 0, D.tree + 0.01)
      } else if (o.type === 'decor' && o.asset === 'poste' && o.lit) {
        // v13: poste aceso (quadros "aceso" originais) com brilho quente, como os postes com Light2D do subsolo original
        const a = ASSETS.poste, ls = SCALE.poste
        this.put('poste', cx, gy + 4, ls, false, D.deco)
        const lamp = this.add.sprite(Math.round(cx + (a[1] / 2 - (a[3] + a[5]) / 2) * ls), Math.round(gy + 4 + (a[2] - a[6]) * ls), 'aceso1').setOrigin(0.5, 1).setScale(ls).setDepth(D.deco + 0.01)
        lamp.play('lamp')
        if (!this.textures.exists('glow')) { const t = this.textures.createCanvas('glow', 96, 96)!, x = t.getContext(), gr = x.createRadialGradient(48, 48, 2, 48, 48, 48); gr.addColorStop(0, 'rgba(255,214,140,0.5)'); gr.addColorStop(0.5, 'rgba(255,180,90,0.16)'); gr.addColorStop(1, 'rgba(255,160,70,0)'); x.fillStyle = gr; x.fillRect(0, 0, 96, 96); t.refresh() }
        const top = gy + 4 - Math.round((a[6] - a[4]) * ls) + 10
        const glow = this.add.image(Math.round(cx), top, 'glow').setScale(1.6).setDepth(D.deco + 0.02).setBlendMode(Phaser.BlendModes.ADD)
        this.tweens.add({ targets: glow, alpha: 0.75, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
      } else if (o.type === 'decor' && o.asset) {
        const img = this.put(o.asset, cx, gy, o.scale ?? SCALE[o.asset] ?? 1, !!o.flip, D.deco)
        if (o.asset.startsWith('onibus')) (img as unknown as Phaser.GameObjects.Sprite).play('bus')
      } else if (o.type === 'obstacle' && o.asset) {
        const sc = SCALE[o.asset] ?? 1, a = ASSETS[o.asset], bw = Math.round((a[5] - a[3]) * sc), bh = Math.round((a[6] - a[4]) * sc), mx = (o.x + 1) * TILE // centraliza em 2 colunas
        this.put(o.asset, mx, gy, sc, false, D.obj)
        this.solids.push({ x: Math.round(mx - bw / 2), y: gy - bh, w: bw, h: bh })
      } else if (o.type === 'sign') {
        const key = o.asset && ASSETS[o.asset] ? o.asset : 'placa', a = ASSETS[key], ps = key === 'placa' ? SCALE.placa : 1
        const spr = this.put(key, cx, gy, ps, false, D.obj) as unknown as Phaser.GameObjects.Sprite
        // área de interação acima da arte e da seta (o rótulo "F — Interagir" aparece no topo dela, sem encostar na seta)
        const vh = Math.round((a[6] - a[4]) * ps), hh = Math.max(56, vh + 46)
        this.ents.push({ o, spr, x: cx - 26, y: gy - hh, w: 52, h: hh, hint: o.quiet ? undefined : this.arrow(cx, gy - vh - 4) })
      } else if (o.type === 'npc') {
        const a = ASSETS.npc, ns = SCALE.npc, spr = this.add.sprite(Math.round(cx + (a[1] / 2 - (a[3] + a[5]) / 2) * ns), Math.round(gy + (a[2] - a[6]) * ns), 'npc1').setOrigin(0.5, 1).setScale(ns).setDepth(D.obj)
        spr.play('npc')
        this.ents.push({ o, spr, x: cx - 30, y: gy - 64, w: 60, h: 64, hint: this.arrow(cx, gy - 38) })
      } else if (o.type === 'cordel') {
        // v14 — cordel escondido (GDD 3.3): um por fase, em lugar secreto
        const spr = this.add.sprite(cx, o.y * TILE + TILE / 2, 'cordel').setDepth(D.obj).setScale(1.2)
        const glow = this.add.circle(cx, o.y * TILE + TILE / 2, 16, 0xffe27a, 0.18).setDepth(D.obj - 0.01)
        this.tweens.add({ targets: glow, alpha: 0.05, scale: 1.3, duration: 700, yoyo: true, repeat: -1 })
        this.ents.push({ o, spr, x: cx - 12, y: o.y * TILE + 4, w: 24, h: 28, baseY: spr.y })
      } else if (o.type === 'collectible') {
        const spr = this.add.sprite(cx, o.y * TILE + TILE / 2, 'coin2').setDepth(D.obj).play('coin')
        this.ents.push({ o, spr, x: cx - 10, y: o.y * TILE + TILE / 2 - 10, w: 20, h: 20, baseY: spr.y })
      } else if (o.type === 'checkpoint') {
        const a = ASSETS.poste
        const ls = SCALE.poste, spr = this.put('poste', cx, gy + 4, ls, false, D.obj) as unknown as Phaser.GameObjects.Sprite
        const lamp = this.add.sprite(Math.round(cx + (a[1] / 2 - (a[3] + a[5]) / 2) * ls), Math.round(gy + 4 + (a[2] - a[6]) * ls), 'aceso1').setOrigin(0.5, 1).setScale(ls).setDepth(D.obj).setVisible(false)
        lamp.play('lamp'); this.cps.push({ x: o.x * TILE + TILE / 2 - PW / 2, on: false, spr, lamp })
      } else if (o.type === 'question') {
        // v9: bloco obrigatório (libera um bloqueio) é laranja e tem seta ACIMA dele, fora da arte; bloco opcional não tem seta
        const req = !!o.required
        const spr = this.add.image(o.x * TILE, o.y * TILE, req ? 'qreq' : 'qblock').setOrigin(0, 0).setDepth(D.plat)
        this.blocks.push({ c: o.x, r: o.y, o, spr, bump: 0, done: false, hint: req ? this.arrow(o.x * TILE + 16, o.y * TILE - 4) : undefined })
      } else if (o.type === 'boss') {
        this.bossX = cx
        const a = ASSETS.boss2
        const spr = this.add.sprite(Math.round(cx + (a[1] / 2 - (a[3] + a[5]) / 2) * BOSS_BIG), Math.round(gy + (a[2] - a[6]) * BOSS_BIG), 'boss2').setOrigin(0.5, 1).setDepth(D.boss).setFlipX(true)
        this.boss = spr; this.bossHome = { x: spr.x, y: spr.y }; this.bossGy = gy; this.bossVisCx = spr.x - ((a[3] + a[5]) / 2 - 32) * BOSS_BIG
        // v8: forma original (humana) com a altura visível do Pedroca; só cresce depois da transformação
        this.bossS = BOSS_SMALL; spr.setScale(this.bossS)
        this.bossFrame('tr1')
      }
    }
  }
  /** seta (seta-baixo original) apontando para baixo com a PONTA visível em y (desconta a margem transparente do PNG:
   *  bbox 28–50 de 64 px). Oscila só para cima, então nunca invade o objeto indicado. */
  private arrow(x: number, tipY: number) {
    const a = ASSETS.seta, y = tipY + (a[2] - a[6])
    const img = this.add.image(Math.round(x + (a[1] / 2 - (a[3] + a[5]) / 2)), y, 'seta').setOrigin(0.5, 1).setDepth(D.fx).setAlpha(0.95)
    this.tweens.add({ targets: img, y: y - 6, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    return img
  }
  private inArena(x: number) { return !!this.arena && x > this.arena[0] && x < this.arena[1] }

  /* ---------- API usada pela interface ---------- */
  hud() { this.bus.emit('hud', { lives: this.lives, score: this.score, coins: this.collected }) }
  lock() { this.locked = true; this.clearInput() }
  /** pausa real: congela relógio, tweens e animações da cena (a introdução do chefão não avança escondida atrás do painel) */
  freeze() { this.lock(); this.time.paused = true; this.tweens.pauseAll(); this.anims.pauseAll() }
  thaw() { this.time.paused = false; this.tweens.resumeAll(); this.anims.resumeAll(); this.unlock() }
  unlock() { if (this.bossIntro || this.cutscene || this.peek) return; this.locked = false; this.acc = 0; this.actPressed = false; this.actCool = 12 }
  /** botão de interação por toque */
  interact() { if (!this.locked && this.nearEnt) this.actPressed = true }
  addScore(n: number) { this.score += n; this.hud() }
  markAnswered(id: string) {
    const b = this.blocks.find(k => k.o.id === id); if (!b || b.done) return
    b.done = true; b.spr.setTexture('qused'); b.hint?.destroy(); b.hint = undefined
    this.openGatesFor(id)
  }
  /** v9: bloco obrigatório (v16: ou capanga-chefe) → abre o bloqueio ligado a ele (uma vez só) e mostra a passagem */
  private openGatesFor(id: string) {
    for (const g of this.gates.byReq(id)) {
      if (g.open) continue
      this.gates.open(g, { sfx: k => this.sfx(k), shake: (a, ms) => this.fx.shake(a, ms) })
      const gx = (g.c0 + g.w / 2) * TILE
      this.bus.emit('toast', g.kind === 'bridge' ? 'A ponte está baixando… espere ela assentar!' : 'O portão de pedra está se abrindo…')
      if (Math.abs(gx - (this.P.x + PW / 2)) > this.VW * 0.45) {
        this.peek = true; this.fx.focus(gx, GROUND_Y - 40, 1, 500)
        this.time.delayedCall(OPEN_MS, () => { this.fx.release(500); this.time.delayedCall(450, () => { this.peek = false; this.unlock() }) })
      }
    }
  }
  private peek = false
  markRead(id: string) { const e = this.ents.find(k => k.o.id === id); if (e?.hint) { e.hint.destroy(); e.hint = undefined } }
  press(k: 'L' | 'R' | 'J', down: boolean) { if (this.locked && down) return; if (k === 'J' && down && !this.inp.J) { this.inp.jp = true; this.jSrc = 'touch' } this.inp[k] = down }
  clearInput() { this.inp.L = this.inp.R = this.inp.J = this.inp.jp = this.inp.U = this.inp.D = false }
  setViewWidth(vw: number) {
    if (vw === this.VW) return
    if (!this.sky) { this.VW = vw; return }
    this.VW = vw; this.scale.resize(vw, VH); this.sky.setDisplaySize(vw, VH)
    this.cam = Phaser.Math.Clamp(this.cam, 0, Math.max(0, this.W - vw))
  }
  restart() {
    this.lives = 3; this.score = 0; this.collected = 0; this.powerDown(); this.foes.reset(); this.cordelGot = false
    this.ents.forEach(e => { if (e.o.type === 'collectible' || e.o.type === 'cordel') { e.got = false; e.spr.setVisible(true) } })
    this.cps.forEach(c => { c.on = false; c.lamp.setVisible(false); c.spr.setVisible(true) })
    this.respawn = { x: (this.objs.find(o => o.type === 'start')!.x) * TILE + TILE / 2 - PW / 2 }
    this.bossStarted = false; this.bossIntro = false; this.fightPose = false; this.tipsSeen = new Set(); this.attacking = false; this.punchKey = null; this.punchWho = null; this.compMode = 'follow'; this.respawnAt(this.respawn.x); this.hud(); this.unlock()
  }

  /* ---------- entrada ---------- */
  private keyDown(e: KeyboardEvent) {
    if (this.locked) return
    const c = e.code
    if (c === 'Escape' || c === 'KeyP') { e.preventDefault(); this.bus.emit('pause'); return }
    if (c === 'KeyF' || c === 'KeyE' || c === 'Enter') { if (!e.repeat) this.actPressed = true; return }
    if (c === 'ArrowDown' || c === 'KeyS') { e.preventDefault(); this.inp.D = true; return }
    if (c === 'ArrowUp' || c === 'KeyW') { e.preventDefault(); this.inp.U = true; if (e.repeat || this.climb || this.onVine()) return; this.press('J', true); this.jSrc = 'up'; return }
    const k = c === 'ArrowLeft' || c === 'KeyA' ? 'L' : c === 'ArrowRight' || c === 'KeyD' ? 'R' : c === 'Space' || c === 'KeyZ' ? 'J' : null
    if (!k) return
    e.preventDefault()
    if (e.repeat) return
    this.press(k, true); if (k === 'J') this.jSrc = 'space'
  }
  /* ---------- v15: escalar cipós (GDD 1.2: "pular, correr e escalar") ---------- */
  private vineCell(x: number, y: number) { return this.rows[Math.floor(y / TILE)]?.[Math.floor(x / TILE)] === 'H' }
  private onVine() { const P = this.P, cx = P.x + PW / 2; return this.vineCell(cx, P.y + 4) || this.vineCell(cx, P.y + PH - 4) }
  /** ↑/W (ou segurar PULAR no toque) agarra e sobe, ↓/S desce, ←/→ desliza para os lados, Espaço salta do cipó.
   *  No topo, um impulso leva o herói para cima da borda. Devolve true quando o passo já foi tratado. */
  private climbStep(): boolean {
    const P = this.P, I = this.inp, up = I.U || (I.J && this.jSrc === 'touch'), down = I.D
    if (!this.climb) {
      if (!this.onVine() || !(up || (down && !P.ground))) return false
      this.climb = true; P.vx = 0; P.vy = 0; P.mover = null; I.jp = false; P.buf = 0
    }
    if (!this.onVine()) { this.climb = false; return false }
    if (I.jp && this.jSrc === 'space') {                                    // salta do cipó
      I.jp = false; this.climb = false; P.vy = -9; P.vx = P.face * 2.4; this.sfx('pulo'); return false
    }
    I.jp = false
    P.vx = I.R && !I.L ? 1.4 : I.L && !I.R ? -1.4 : 0; if (P.vx) P.face = P.vx > 0 ? 1 : -1
    P.vy = up ? -2.2 : down ? 2.2 : 0; P.coy = 0
    if (up) {                                                                // chegou ao topo: sobe na borda (sem depender de segurar ↑)
      const c = Math.floor((P.x + PW / 2) / TILE); let r = Math.floor((P.y + PH - 1) / TILE)
      while (this.rows[r - 1]?.[c] === 'H') r--
      const top = r * TILE
      if (P.y + PH <= top + 8) {                                             // antes de o pé sair do cipó (onVine usa pé − 4)
        const side = this.cellSolid(c + 1, r) ? 1 : this.cellSolid(c - 1, r) ? -1 : 0
        this.climb = false; P.y = top - PH; P.vy = -3; P.vx = side * 2.2; if (side) P.face = side; P.ground = false
        return true
      }
    }
    this.moveX(P, P.vx); this.moveY(P, P.vy)
    if (down && P.ground) this.climb = false                                                         // desceu até o chão
    else P.ground = false
    return true
  }
  private keyUp(e: KeyboardEvent) {
    const c = e.code
    if (c === 'ArrowDown' || c === 'KeyS') this.inp.D = false
    if (c === 'ArrowUp' || c === 'KeyW') this.inp.U = false
    const k = c === 'ArrowLeft' || c === 'KeyA' ? 'L' : c === 'ArrowRight' || c === 'KeyD' ? 'R' : c === 'Space' || c === 'ArrowUp' || c === 'KeyW' || c === 'KeyZ' ? 'J' : null
    if (k) this.inp[k] = false
  }

  /* ---------- física ---------- */
  private cellSolid(c: number, r: number) {
    if (c < 0 || c >= this.rows[0].length) return true
    if (r < 0) return false
    const ch = this.rows[r]?.[c]
    if (ch === '#' || ch === 'G' || ch === '=') return true
    if (this.gates?.isSolid(c, r)) return true
    return this.blocks.some(b => b.c === c && b.r === r)
  }
  private oneway(c: number, r: number) { const ch = this.rows[r]?.[c]; return ch === '-' || ch === '_' }
  private ov(a: Rect, b: Rect) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y }
  private moveX(o: Body, dx: number) {
    o.x += dx
    const r0 = Math.floor(o.y / TILE), r1 = Math.floor((o.y + o.h - 0.01) / TILE)
    if (dx > 0) { const c = Math.floor((o.x + o.w - 0.01) / TILE); for (let r = r0; r <= r1; r++) if (this.cellSolid(c, r)) { o.x = c * TILE - o.w; o.vx = 0; break } }
    else if (dx < 0) { const c = Math.floor(o.x / TILE); for (let r = r0; r <= r1; r++) if (this.cellSolid(c, r)) { o.x = (c + 1) * TILE; o.vx = 0; break } }
    for (const s of this.solids) if (this.ov(o, s)) { if (dx > 0) o.x = s.x - o.w; else if (dx < 0) o.x = s.x + s.w; o.vx = 0 }
  }
  private moveY(o: Body, dy: number) {
    const prevBottom = o.y + o.h
    o.y += dy; o.ground = false; if (dy < 0) o.mover = null
    const c0 = Math.floor(o.x / TILE), c1 = Math.floor((o.x + o.w - 0.01) / TILE)
    if (dy > 0) {
      const r = Math.floor((o.y + o.h - 0.01) / TILE)
      for (let c = c0; c <= c1; c++) {
        if (this.cellSolid(c, r) || (this.oneway(c, r) && prevBottom <= r * TILE + 0.01)) { o.y = r * TILE - o.h; o.vy = 0; o.ground = true; break }
      }
    } else if (dy < 0) {
      const r = Math.floor(o.y / TILE); let best: number | null = null; const mid = o.x + o.w / 2
      for (let c = c0; c <= c1; c++) if (this.cellSolid(c, r)) if (best === null || Math.abs((c + 0.5) * TILE - mid) < Math.abs((best + 0.5) * TILE - mid)) best = c
      if (best !== null) { o.y = (r + 1) * TILE; o.vy = 0; if (o === this.P) this.headBump(best, r) }
    }
    for (const s of this.solids) if (this.ov(o, s)) {
      if (dy > 0) { o.y = s.y - o.h; o.vy = 0; o.ground = true } else if (dy < 0) { o.y = s.y + s.h; o.vy = 0 }
    }
    if (dy > 0 && !o.ground && this.movers) this.movers.land(o, prevBottom)
  }
  private headBump(c: number, r: number) {
    const b = this.blocks.find(k => k.c === c && k.r === r)
    if (!b) { this.sfx('toc'); return }
    b.bump = 8
    if (b.done) { this.sfx('toc'); return }
    this.sfx('toc'); this.lock(); this.bus.emit('question', b.o)
  }

  /** Um passo fixo de 60 Hz. Exposto para testes determinísticos. */
  step() {
    const P = this.P; this.tick++
    this.movers.step([P, this.K])
    this.prevFeet = P.y + PH
    const climbed = this.climbStep()
    const { L, R } = this.inp
    const accel = P.ground ? 0.7 : 0.5, maxv = this.powered ? 4.6 : 3.8
    let wasGround = P.ground, vyBefore = P.vy
    if (!climbed) {
    if (L && !R) { P.vx -= accel; P.face = -1 } else if (R && !L) { P.vx += accel; P.face = 1 }
    else { P.vx *= P.ground ? 0.7 : 0.94; if (Math.abs(P.vx) < 0.1) P.vx = 0 }
    P.vx = Phaser.Math.Clamp(P.vx, -maxv, maxv)
    if (this.inp.jp) { P.buf = 9; this.inp.jp = false }
    if (P.ground) P.coy = 8; else if (P.coy > 0) P.coy--
    if (P.buf > 0) {
      if (P.coy > 0) { P.vy = this.powered ? -11.4 : -10.8; P.jt = 8; P.coy = 0; P.buf = 0; P.ground = false; P.mover = null; this.sfx('pulo'); this.puff(P.x + PW / 2, P.y + PH) } else P.buf--
    }
    const hold = this.inp.J || P.jt > 0
    if (P.jt > 0) P.jt--
    wasGround = P.ground; vyBefore = P.vy
    P.vy = Math.min(12, P.vy + (P.vy < 0 && hold ? 0.5 : 1))
    if (!hold && P.vy < -4.4) P.vy = -4.4
    this.moveX(P, P.vx); this.moveY(P, P.vy)
    }
    if (!wasGround && P.ground && vyBefore > 4) this.puff(P.x + PW / 2, P.y + PH)
    P.x = Phaser.Math.Clamp(P.x, 0, this.W - PW)
    if (P.inv > 0) P.inv--
    this.blocks.forEach(b => { if (b.bump > 0) b.bump-- })
    if (P.y > this.R * TILE + 24) { this.fall(); return }
    this.updateEnts()
    this.lead += (P.face * 24 - this.lead) * 0.06
    const target = Phaser.Math.Clamp(P.x + PW / 2 - this.VW * 0.4 + this.lead, 0, Math.max(0, this.W - this.VW))
    this.cam += (target - this.cam) * 0.12
    // v9: câmera vertical — desce só quando o herói está numa galeria (coluna com fundo de rocha); numa vala, fica na superfície
    const feet = P.y + PH, inCave = feet > GROUND_Y + 40 && !this.pitCol[Math.floor((P.x + PW / 2) / TILE)]
    const ty = inCave ? Phaser.Math.Clamp(feet - VH * 0.66, CAMY, this.R * TILE - VH) : CAMY
    this.camY += (ty - this.camY) * 0.1; if (Math.abs(ty - this.camY) < 0.3) this.camY = ty
    this.stepCompanion()
    this.stepWorld()
  }

  /* ---------- v9: trânsito e bloqueios educativos ---------- */
  private stepWorld() {
    const P = this.P, comp = otherChar(this.heroId)
    const hit = this.traffic.step(P, this.cam, this.VW)
    if (hit && P.inv === 0) this.hitByCar(hit)
    const fh = this.foes.step(P, this.prevFeet, this.powered, P.inv > 0)
    if (fh) this.foeHit(fh)
    // tutorial do primeiro semáforo: o acompanhante explica antes da primeira travessia
    for (const c of this.traffic.list) if (c.tutorial && !c.tutorialShown && P.x + PW > c.x0 - 7 * TILE && P.x < c.x0) {
      c.tutorialShown = true
      this.bus.emit('tip', { who: CHARS[comp].name, text: comp === 'renata'
        ? 'Olha o semáforo! Com o verde pros carros a gente espera na calçada. Quando o boneco ficar verde, bora atravessar na faixa!'
        : 'Segura, visse? Carro passando é na calçada que se espera. Boneco verde aceso: aí é nossa vez de atravessar!' })
    }
    this.gates.step(P.x + PW / 2, comp, CHARS[comp].name, id => {
      const b = this.blocks.find(k => k.o.id === id); return b ? { x: b.c * TILE + 16, y: b.r * TILE + 16, done: b.done } : null
    }, { x0: this.cam, w: this.VW, y0: this.camY }, (who, text) => this.bus.emit('tip', { who, text }))
  }
  /** v16 — resposta a cada tipo de inimigo (Etapa 5) */
  private foeHit(fh: FoeHit) {
    const P = this.P, f = fh.foe, cx = P.x + PW / 2, name = f.o.name ?? 'Capanga-chefe'
    const away = ((fh.x ?? f.x + f.w / 2) < cx ? 1 : -1) as 1 | -1
    switch (fh.kind) {
      case 'stomp':
        P.vy = this.inp.J ? -9.5 : -7; P.ground = false; this.addScore(30); this.sfx('toc'); this.puff(cx, P.y + PH)
        this.bus.emit('toast', FOE_NAME[f.kind] + ' derrotado! +30'); break
      case 'smash': this.addScore(30); this.sfx('ai'); this.fx.shake(2, 120); break
      case 'hurt': this.hurt(f.kind === 'chefe' ? name + ' te pegou! Espere a investida acabar: tonto, ele fica fácil de pisar.' : FOE_HURT[f.kind], away); break
      case 'shot': this.hurt('Chinelada! Pule por cima ou recue até o chinelo cair.', away); break
      case 'wake':
        this.bus.emit('toast', name + ' bloqueia o caminho! Pise na cabeça dele 3 vezes.'); this.sfx('ai'); this.fx.shake(3, 300)
        this.bus.emit('tip', { who: CHARS[otherChar(this.heroId)].name, text: 'É o capanga-chefe desta região! Quando ele der a investida, desvie pulando; depois ele fica tonto: aí é pular na cabeça!' })
        break
      case 'chefe-hit':
        P.vy = -10; P.vx = away * 2.5; P.ground = false; P.inv = Math.max(P.inv, 40); this.addScore(50); this.sfx('toc'); this.fx.shake(4, 200); this.puff(cx, P.y + PH)
        this.bus.emit('toast', `${name}: ${f.hp} ${f.hp === 1 ? 'pisão' : 'pisões'} para derrotar!`); break
      case 'chefe-down':
        P.vy = -10; P.ground = false; this.addScore(200); this.sfx('win'); this.fx.shake(6, 400); this.burst(f.x + f.w / 2, f.y + f.h / 2)
        this.bus.emit('toast', name + ' derrotado! +200 — o portão está abrindo.'); this.openGatesFor(f.o.id); break
    }
  }
  /** v14 — dano por contato (capanga): perde 1 vida, recua e fica invencível; perde o power-up */
  private hurt(msg: string, dir: 1 | -1) {
    const P = this.P
    this.lives--; this.sfx('ai'); this.fx.shake(4, 220); this.powerDown()
    if (this.lives <= 0) { this.lives = 3; this.bus.emit('toast', 'Sem vidas! Você volta ao checkpoint com vidas renovadas.'); this.respawnAt(this.respawn.x, true); this.hud(); return }
    this.bus.emit('toast', msg)
    Object.assign(P, { vx: dir * 3.5, vy: -5, ground: false, inv: 90 })
    this.hud()
  }
  /** v14 — power-up "Pedroca Ratão" (GDD): ao pegar TODAS as moedas da fase. Corre e pula mais e derruba capangas no
   *  contato; dura até levar dano ou cair. Não protege de carros (a travessia continua sendo o desafio do trânsito). */
  private powerUp() {
    if (this.powered) return
    this.powered = true; this.sfx('win'); this.fx.shake(3, 300)
    const name = this.heroId === 'pedroca' ? 'PEDROCA RATÃO' : 'RENATA RATA'
    this.bus.emit('toast', name + '! Todas as moedas: corre mais e pula mais.')
    this.spark(this.P.x + PW / 2, this.P.y + PH / 2, 16, [0xffe27a, 0xff6bd5, 0xffffff], 40, 500)
    this.aura = this.time.addEvent({ delay: 140, loop: true, callback: () => { if (this.powered) this.spark(this.P.x + PW / 2 + (Math.random() - 0.5) * 14, this.P.y + 6 + Math.random() * 20, 1, [0xffe27a, 0xff6bd5], 10, 360) } })
    this.bus.emit('power', true)
  }
  private powerDown() {
    if (!this.powered) return
    this.powered = false; this.aura?.remove(); this.aura = undefined; this.hero.clearTint(); this.bus.emit('power', false)
  }
  /** atingido por um carro ao atravessar com o verde para os carros: perde 1 vida e volta à calçada de onde veio */
  private hitByCar(c: Crossing) {
    const P = this.P, fromLeft = P.x + PW / 2 < (c.x0 + c.x1) / 2
    this.lives--; this.sfx('ai'); this.fx.shake(5, 260); this.powerDown()
    if (this.lives <= 0) { this.lives = 3; this.bus.emit('toast', 'Sem vidas! Você volta ao checkpoint com vidas renovadas.'); this.respawnAt(this.respawn.x, true); this.hud(); return }
    this.bus.emit('toast', 'Cuidado! Com o verde para os carros, espere na calçada.')
    Object.assign(P, { x: fromLeft ? c.x0 - 30 - PW : c.x1 + 12, y: GROUND_Y - PH, vx: 0, vy: -4, ground: false, inv: 90 })
    this.hud()
  }

  private updateEnts() {
    const P = this.P; let best: Ent | null = null, bestD = 1e9
    for (const e of this.ents) {
      const t = e.o.type
      if (t === 'collectible') {
        if (e.got) continue
        e.spr.y = (e.baseY ?? 0) + Math.round(Math.sin(this.tick / 12) * 2)
        if (this.ov(P, e)) { e.got = true; e.spr.setVisible(false); this.collected++; this.addScore(10); this.sfx('item'); this.bus.emit('toast', '+10 pesos de prata'); if (this.collected >= this.totalCoins) this.powerUp() }
      } else if (t === 'cordel') {
        if (e.got) continue
        e.spr.y = (e.baseY ?? 0) + Math.round(Math.sin(this.tick / 14) * 3)
        if (this.ov(P, e)) {
          e.got = true; this.cordelGot = true; e.spr.setVisible(false); this.addScore(100); this.sfx('win')
          this.spark(e.x + 10, e.y + 10, 14, [0xefe2bf, 0xffe27a, 0xc23b22], 34, 500)
          this.lock(); this.bus.emit('cordel', e.o); return
        }
      } else if (t === 'sign' || t === 'npc') {
        if (t === 'npc') e.spr.setFlipX(P.x + PW / 2 > e.x + e.w / 2 ? false : true)
        const dx = Math.abs(P.x + PW / 2 - (e.x + e.w / 2)), dy = Math.abs(P.y + PH - (e.y + e.h))
        if (dx < 26 + e.w / 2 && dy < 48 && (!best || dx < bestD)) { best = e; bestD = dx }
      }
    }
    this.setNear(best)
    if (this.actCool > 0) { this.actCool--; this.actPressed = false }
    if (best && this.actPressed) { this.actPressed = false; this.setNear(null); this.lock(); this.sfx('toc'); this.bus.emit('interact', best.o); return }
    this.actPressed = false
    this.tips.forEach((tp, i) => { if (!this.tipsSeen.has(i) && P.x / TILE >= tp.x) { this.tipsSeen.add(i); this.bus.emit('tip', { who: CHARS[otherChar(this.heroId)].name, text: tp[otherChar(this.heroId)] }) } })
    this.cps.forEach(c => {
      if (!c.on && Math.abs(P.x + PW / 2 - (c.x + PW / 2)) < 12) {
        c.on = true; this.respawn = { x: c.x }; c.spr.setVisible(false); c.lamp.setVisible(true); this.sfx('item'); this.bus.emit('toast', 'Checkpoint salvo!')
      }
    })
    if (this.boss && !this.bossStarted && !this.bossDown && P.x > this.bossX - 7 * TILE && P.ground && P.vy >= 0) {
      this.bossStarted = true; this.beginBossIntro()
    }
    // v8: a fase só termina na estação final (depois do chefão), com o embarque
    if (this.toStation && P.ground && P.x + PW / 2 >= this.busLine.depart.cx - 120) {
      this.toStation = false; this.bus.emit('goal', null)
      void this.busLine.playDeparture(() => this.bus.emit('complete'))
    }
  }

  private setNear(e: Ent | null) {
    if (e !== this.nearEnt) { this.nearEnt = e; this.bus.emit('near', !!e) }
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
    if (e && !this.locked) this.prompt.setText(coarse ? 'Interagir' : 'F — Interagir').setPosition(Math.round(e.x + e.w / 2), Math.round(e.y - 8)).setVisible(true); else this.prompt.setVisible(false)
  }

  /* ---------- chefão: posicionamento por quadro, efeitos e sequência do Murro de Cultura ---------- */
  private bossVisCx = 0; private bossGy = 0; private bossHome = { x: 0, y: 0 }
  /** posiciona um quadro do chefão alinhando o CORPO (centro da bbox) e a BASE ao chão, independentemente do tamanho do PNG */
  private bossFrame(key: string, dx = 0, dy = 0) {
    const a = ASSETS[key], b = this.boss!, s = this.bossS
    b.setTexture(key); b.setScale(s); b.setPosition(Math.round(this.bossVisCx + ((a[3] + a[5]) / 2 - 32) * s + dx), Math.round(this.bossGy + (64 - a[6]) * s + dy))
  }
  /** v8: crescimento controlado depois da transformação — ancorado no centro do corpo e na BASE (pés no chão o tempo todo) */
  private growBoss(ms: number) {
    const g = { s: this.bossS }
    this.tweens.add({ targets: g, s: BOSS_BIG, duration: ms, ease: 'Back.easeOut', onUpdate: () => {
      this.bossS = Math.max(BOSS_SMALL, g.s); this.bossFrame('tr15')
    }, onComplete: () => { this.bossS = BOSS_BIG; this.bossFrame('tr15'); this.setBossBody(true) } })
  }
  /** hitbox física do chefão gigante = bbox visível do idle × 2 (enquanto ele está de pé); removida na derrota */
  private setBossBody(on: boolean) {
    if (this.bossBody) { this.solids.splice(this.solids.indexOf(this.bossBody), 1); this.bossBody = null }
    if (!on) return
    const a = ASSETS.boss2, w = Math.round((a[5] - a[3]) * BOSS_BIG), h = Math.round((a[6] - a[4]) * BOSS_BIG)
    this.bossBody = { x: Math.round(this.bossVisCx - w / 2), y: this.bossGy - h, w, h }; this.solids.push(this.bossBody)
  }
  /** v7 — Introdução: Ratão em forma original → transformação ORIGINAL completa (ratoboss-transformation 1–15) → pausa dramática → quiz.
   *  Só começa com o herói em solo firme. O herói e o Pedroca acompanhante assumem a pose de luta original. */
  private beginBossIntro() {
    const P = this.P, T = this.time, fx = this.fx
    this.bossIntro = true; this.compMode = 'battle'; P.vx = 0; this.fightPose = true; this.locked = true; this.clearInput()
    this.bus.emit('intro', true); this.bus.emit('toast', `${this.level.boss.name} apareceu!`)
    // acompanhante vai para a posição de luta (atrás do herói, no mesmo chão). Longe/no ar: reaparece ali com fade; perto: caminha até lá
    const K = this.K, row = Math.floor((P.y + PH + 1) / TILE), okAt = (x: number) => { const c = Math.floor((x + K.w / 2) / TILE); return this.cellSolid(c, row) || this.oneway(c, row) }
    let slot = P.x + PW / 2 - 40 - K.w / 2; if (!okAt(slot)) slot = P.x + PW / 2 - 18 - K.w / 2
    if (Math.abs(K.x - slot) > 150 || !K.ground || Math.abs(K.y + K.h - (P.y + PH)) > 2) { this.placeCompanion(slot); K.y = P.y + PH - K.h; K.ground = true }
    else this.tweens.add({ targets: K, x: slot, duration: 450, ease: 'Sine.easeInOut' })
    K.vx = 0; K.vy = 0; K.face = 1
    fx.focus((P.x + PW / 2 + this.bossVisCx) / 2, this.bossGy - 34, 1.3, 650)
    // tempos por quadro: começa devagar (o jogador reconhece a forma original), acelera no meio, segura o resultado final
    const dur = [1100, 160, 150, 140, 140, 140, 140, 150, 160, 130, 130, 130, 170, 200, 260]
    let t = 450
    dur.forEach((d, i) => {
      T.delayedCall(t, () => {
        const k = i + 1; this.bossFrame('tr' + k)
        if (k >= 9 && k <= 12) this.spark(this.bossVisCx, this.bossGy - 34, 4, [0xffffff, 0xffd23f], 30, 300)
        if (k === 13) { this.burst(this.bossVisCx, this.bossGy - 40); fx.shake(4, 220); this.sfx('ai') }
        if (k === 15) { fx.shake(6, 320); this.sfx('toc') }
      })
      t += d
    })
    // v8: transformação concluída no tamanho normal → só então cresce até a dimensão de chefão (pés fixos no chão)
    T.delayedCall(t + 120, () => { this.growBoss(700); fx.shake(5, 700); this.sfx('ai'); fx.focus((P.x + PW / 2 + this.bossVisCx) / 2, this.bossGy - 50, 1.2, 700) })
    T.delayedCall(t + 900, () => { this.bossIdle(); this.sfx('win') })          // já gigante: entra o idle do chefão
    T.delayedCall(t + 1700, () => fx.release(500))                              // pausa dramática
    T.delayedCall(t + 2300, () => { this.bossIntro = false; this.bus.emit('intro', false); this.bus.emit('boss') })
  }

  private bossIdle() { const b = this.boss!; this.bossS = BOSS_BIG; b.clearTint(); b.setCrop(); b.setScale(BOSS_BIG); b.setPosition(this.bossHome.x, this.bossHome.y); b.play('boss') }
  private spark(x: number, y: number, n: number, colors: number[], spread: number, ms: number) {
    for (let i = 0; i < n; i++) {
      const r = this.add.rectangle(x, y, 3, 3, colors[i % colors.length]).setDepth(D.fx), ang = Math.random() * Math.PI * 2, d = spread * (0.5 + Math.random() * 0.7)
      this.tweens.add({ targets: r, x: x + Math.cos(ang) * d, y: y + Math.sin(ang) * d, alpha: 0, duration: ms, ease: 'Quad.easeOut', onComplete: () => r.destroy() })
    }
  }
  private burst(x: number, y: number) {
    const g = this.add.graphics().setDepth(D.fx).setPosition(x, y)
    g.fillStyle(0xffffff).fillRect(-3, -14, 6, 28).fillRect(-14, -3, 28, 6).fillStyle(0xffd23f).fillRect(-9, -9, 5, 5).fillRect(4, -9, 5, 5).fillRect(-9, 4, 5, 5).fillRect(4, 4, 5, 5)
    g.setScale(0.5); this.tweens.add({ targets: g, scale: 2.4, alpha: 0, duration: 320, ease: 'Quad.easeOut', onComplete: () => g.destroy() })
    this.spark(x, y, 12, [0xffffff, 0xffd23f, 0xff6b6b], 46, 380)
  }
  /** poeira em pixel art (partículas originais: particle/1particle e 1particle-car) */
  private dustBurst(x: number, y: number) {
    for (const dir of [-1, 1]) {
      const p = this.add.sprite(x + dir * 14, y - 4, 'puff1').setOrigin(0.5, 1).setScale(2).setDepth(D.fx).setFlipX(dir < 0)
      this.tweens.add({ targets: p, x: x + dir * 54, y: y - 10, alpha: 0, scale: 2.6, duration: 650, ease: 'Quad.easeOut', onComplete: () => p.destroy() })
      const d = this.add.sprite(x + dir * 8, y - 2, 'dust1').setOrigin(0.5, 1).setScale(2).setDepth(D.fx); d.play('dust'); d.once('animationcomplete', () => d.destroy())
      this.tweens.add({ targets: d, x: x + dir * 30, duration: 520, ease: 'Quad.easeOut' })
    }
    this.spark(x, y - 4, 8, [0xd9c9a3, 0xb8a98a, 0xffffff], 34, 520)
  }
  private charge(ax: number, ay: number) {
    const fx0 = ax + 20, fy0 = ay - 16
    for (let i = 0; i < 9; i++) {
      const ang = (i / 9) * Math.PI * 2, r = this.add.rectangle(fx0 + Math.cos(ang) * 34, fy0 + Math.sin(ang) * 34, 3, 3, i % 2 ? 0xffd23f : 0xffffff).setDepth(D.fx)
      this.tweens.add({ targets: r, x: fx0, y: fy0, alpha: 0.2, duration: 330, ease: 'Quad.easeIn', onComplete: () => r.destroy() })
    }
  }
  /** Sequência: foco no Pedroca → preparação → soco → Murro de Cultura (grande e mais lento) → impacto com hit stop → dano → retorno. */
  attackBoss(variant = 0): Promise<void> {
    if (!this.boss || this.attacking || this.bossDown || this.bossIntro) return Promise.resolve()
    this.attacking = true
    const who: 'hero' | 'comp' = this.heroId === 'pedroca' ? 'hero' : 'comp', boss = this.boss, T = this.time, fx = this.fx
    const kind = ['murro', 'murro_v', 'murro_a', 'murro_r'][variant % 4]
    return new Promise<void>(resolve => {
      const impact = (ay: number, fist: Phaser.GameObjects.Sprite) => {
        const ix = fist.x + 10, iy = fist.y; fist.destroy(); this.sfx('ai')
        boss.anims.stop(); this.bossFrame('faint2', 0, 0); boss.setTintFill(0xffffff); this.burst(ix, iy)
        fx.focus(this.bossVisCx - 10, ay - 30, 1.55, 120)
        T.delayedCall(110, () => {                                    // hit stop: ~110 ms de congelamento antes da reação
          fx.shake(5, 260); this.sfx('toc'); boss.clearTint()
          const recoil = { v: 0 }; this.tweens.add({ targets: recoil, v: 1, duration: 480, ease: 'Sine.easeOut', onUpdate: () => { this.bossFrame(recoil.v < 0.33 ? 'faint2' : recoil.v < 0.66 ? 'faint3' : 'faint4', Math.round(16 * (1 - recoil.v)), 0) } })
          T.delayedCall(560, () => { this.bossIdle(); fx.release(480) })
          T.delayedCall(980, () => { this.attacking = false; resolve() })
        })
      }
      const strike = (ax: number, ay: number) => {
        const fy = ay - 17, fist = this.add.sprite(ax + 26, fy, kind + '1').setOrigin(0.5).setScale(2.4).setDepth(D.fx)
        fist.play('f_' + kind); this.sfx('item'); fx.setZoom(1.35)
        const trail = T.addEvent({ delay: 55, loop: true, callback: () => { const gh = this.add.image(fist.x - 6, fist.y, fist.texture.key, fist.frame.name).setScale(2.4).setAlpha(0.4).setDepth(D.fx - 1); this.tweens.add({ targets: gh, alpha: 0, scaleX: 1.9, duration: 280, onComplete: () => gh.destroy() }) } })
        this.tweens.add({ targets: fist, x: this.bossVisCx - 36, duration: 1050, ease: 'Sine.easeOut', onUpdate: () => fx.pan(fist.x + 50, fy - 6), onComplete: () => { trail.remove(); impact(ay, fist) } })
      }
      const begin = () => {
        const b = who === 'hero' ? this.P : this.K, ax = b.x + b.w / 2, ay = b.y + b.h
        this.punchWho = who; fx.focus(ax + 56, ay - 28, 1.6, 420)
        const seq: [string, number][] = [['pg1', 160], ['pg2', 190], ['pr2', 170], ['pr3', 300], ['pr4', 90], ['pr5', 90], ['pr6', 90], ['pr7', 110]]
        let t = 0
        seq.forEach(([k, ms], i) => { T.delayedCall(t, () => { this.punchKey = k; if (i === 1) this.charge(ax, ay); if (i === 3) strike(ax, ay) }); t += ms })
        T.delayedCall(t, () => { this.punchKey = null; this.punchWho = null })
      }
      if (who === 'comp') { const tx = this.P.x + this.P.w + 12; this.tweens.add({ targets: this.K, x: tx, duration: 300, ease: 'Sine.easeInOut', onComplete: begin }) } else begin()
    })
  }
  /** Derrota: susto → pequena elevação → cai de costas → costas no chão (mãos afundam levemente) → poeira + tremor pesado. */
  /** v8: a derrota NÃO conclui a fase — devolve o controle e o objetivo passa a ser a estação final (busStop.ts) */
  defeatBoss(onDown?: () => void) {
    const done = () => { onDown?.(); this.afterBoss() }
    const b = this.boss; this.bossDown = true; this.sfx('win'); this.setBossBody(false)
    if (!b) { this.time.delayedCall(600, done); return }
    b.anims.stop(); b.clearTint(); this.fx.focus(this.bossVisCx, this.bossGy - 28, 1.3, 320)
    let landed = false; const tl = { t: 0 }
    const dyAt = (t: number) => t < 140 ? 0 : t < 280 ? -8 : t < 430 ? -16 : t < 580 ? -10 : t < 720 ? -10 + 12 * ((t - 580) / 140) ** 2 : t < 810 ? 16 - 10 * Math.sin(((t - 720) / 90) * Math.PI) : 16
    this.tweens.addCounter({ from: 0, to: 1500, duration: 1500, onUpdate: tw => {
      const t = tw.getValue() ?? 0, k = t < 140 ? 1 : t < 280 ? 2 : t < 430 ? 3 : t < 580 ? 4 : t < 720 ? 5 : 6; tl.t = t
      this.bossFrame('faint' + k, 0, Math.round(dyAt(t)))
      if (k === 6) { b.setCrop(0, 0, 64, 58); if (!landed) { landed = true; this.dustBurst(this.bossVisCx, this.bossGy); this.fx.shake(9, 360); this.sfx('toc') } } else b.setCrop()
      if (t > 1000 && this.fx.active && t < 1010) this.fx.release(500)
    }, onComplete: () => { done() } })
  }

  /* ---------- acompanhante (referência: Tails em Sonic 2) ----------
     Corpo próprio, mesma física/colisão do mapa (moveX/moveY), SEM colisão com o herói e sem acionar blocos/interações.
     v8: a decisão de movimento e de salto fica em companion.ts (planeja saltos por simulação, evita vãos, espera em
     segurança e se recupera fora da câmera). Aqui ficam só os modos (seguir / luta / cena) e a recolocação com fade. */
  /** recoloca o acompanhante numa superfície SEGURA perto de x (nunca dentro de vão ou obstáculo); fade só se visível */
  private placeCompanion(x: number, hidden = false) {
    const K = this.K, P = this.P
    const s = this.ai.safeSpot(x + K.w / 2, P.ground ? P.y + P.h : GROUND_Y, K) ?? { x: P.x, y: P.y + P.h - K.h }
    this.tweens.killTweensOf(K)
    Object.assign(K, { x: s.x, y: s.y, vx: 0, vy: 0, ground: true, face: P.face, alpha: hidden ? 1 : 0 })
    if (!hidden) this.tweens.add({ targets: K, alpha: 1, duration: 280 })
    this.ai.reset(P.x + PW / 2, P.ground ? P.y + PH : GROUND_Y, P.face)
  }
  private stepCompanion() {
    const K = this.K, P = this.P
    if (this.compMode === 'cutscene') return                     // posições roteirizadas por busStop.ts
    if (this.compMode === 'battle') {
      K.vx *= 0.7; if (Math.abs(K.vx) < 0.1) K.vx = 0
      K.vy = Math.min(12, K.vy + (K.vy < 0 ? 0.55 : 1)); this.moveX(K, K.vx); this.moveY(K, K.vy); return
    }
    if (this.compFading) { K.vy = Math.min(12, K.vy + 1); this.moveX(K, K.vx); this.moveY(K, K.vy); return }
    if (this.ai.step(K, P) === 'reposition') {
      const r = this.ai.reentry(K, P)
      const visible = K.x + K.w > this.cam && K.x < this.cam + this.VW && K.y < this.camY + VH
      if (visible) {
        // ainda na tela (preso): some com fade antes de reaparecer, nunca "pula" diante do jogador
        this.compFading = true
        this.tweens.add({ targets: K, alpha: 0, duration: 260, onComplete: () => { this.compFading = false; Object.assign(K, { x: r.x, y: r.y, vx: 0, vy: 0, ground: true }); if (!r.hidden) this.tweens.add({ targets: K, alpha: 1, duration: 280 }); else K.alpha = 1; this.ai.reset(P.x + PW / 2, P.y + PH, P.face) } })
      } else {
        Object.assign(K, { x: r.x, y: r.y, vx: 0, vy: 0, ground: true, alpha: r.hidden ? 1 : 0 })
        if (!r.hidden) this.tweens.add({ targets: K, alpha: 1, duration: 280 })
        this.ai.reset(P.x + PW / 2, P.ground ? P.y + PH : GROUND_Y, P.face)
      }
    }
  }

  private fall() {
    this.lives--; this.sfx('ai'); this.powerDown()
    if (this.lives <= 0) { this.lives = 3; this.bus.emit('toast', 'Sem vidas! Você volta ao checkpoint com vidas renovadas.') }
    else this.bus.emit('toast', 'Cuidado com as valas! Você volta ao checkpoint.')
    this.respawnAt(this.respawn.x, true); this.hud()
  }
  private dbg?: Phaser.GameObjects.Graphics
  /** ?hitboxes — vermelho: sólidos; amarelo: jogador; ciano: interativos; verde: linha do chão; ponto branco: âncora (base do bbox) dos sprites */
  private drawDebug() {
    const g = (this.dbg ??= this.add.graphics().setDepth(99)); g.clear()
    g.lineStyle(1, 0xff0000).strokeRectShape(new Phaser.Geom.Rectangle(0, 0, 0, 0))
    for (const r of this.solids) g.lineStyle(1, 0xff3030).strokeRect(r.x + 0.5, r.y + 0.5, r.w, r.h)
    this.rows.forEach((row, ty) => [...row].forEach((ch, tx) => { if (ch === '-') g.lineStyle(1, 0xff9900).strokeRect(tx * TILE + 0.5, ty * TILE + 0.5, TILE, 6) }))
    g.lineStyle(1, 0xffee00).strokeRect(this.P.x + 0.5, this.P.y + 0.5, this.P.w, this.P.h)
    for (const c of this.traffic.list) for (const r of c.debug.rects) g.lineStyle(1, c.state().dangerous ? 0xff3030 : 0x30ff60).strokeRect(r.x + 0.5, r.y + 0.5, r.w, r.h)  // carros: vermelho = causa dano
    for (const e of this.ents) { g.lineStyle(1, 0x00e5ff).strokeRect(e.x + 0.5, e.y + 0.5, e.w, e.h); g.fillStyle(0xffffff).fillRect(e.spr.x - 1, e.spr.y - 1, 3, 3) }
    g.lineStyle(1, 0x00ff66).lineBetween(this.cameras.main.scrollX, GROUND_Y + 0.5, this.cameras.main.scrollX + this.VW, GROUND_Y + 0.5)
  }
  private respawnAt(x: number, inv = false) {
    const P = this.P
    Object.assign(P, { x, y: GROUND_Y - PH - 1, vx: 0, vy: 0, ground: false, coy: 0, buf: 0, jt: 0, face: 1, inv: inv ? 60 : 0 })
    this.lead = 24
    if (this.fx) this.placeCompanion(x - 34)
    this.cam = Phaser.Math.Clamp(x + PW / 2 - this.VW * 0.4, 0, Math.max(0, this.W - this.VW))
  }

  private puff(x: number, y: number) {
    for (let i = 0; i < 4; i++) {
      const p = this.add.rectangle(x, y - 2, 3, 3, 0xefe0bf).setDepth(D.fx)
      this.tweens.add({ targets: p, x: x + (i - 1.5) * 9, y: y - 4 - (i % 2) * 3, alpha: 0, duration: 260, onComplete: () => p.destroy() })
    }
  }

  /* ---------- som (bipes em código; só depois da primeira interação) ---------- */
  muted = false
  sfx(k: string) {
    if (this.muted) return
    try {
      if (!this.ac) { const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!C) return; this.ac = new C() }
      const m: Record<string, [number, number, number]> = { pulo: [520, 780, 0.09], toc: [180, 140, 0.06], ai: [220, 70, 0.25], item: [880, 1320, 0.12], win: [520, 1040, 0.4] }
      const [f0, f1, d] = m[k] ?? m.toc, ac = this.ac, o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime
      o.type = 'square'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d)
      g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.02)
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + 0.03)
    } catch { /* sem áudio: segue o jogo */ }
  }

  /* ---------- laço ---------- */
  update(_t: number, delta: number) {
    if (this.cutscene) {
      // cutscene: passo fixo próprio (caminhadas roteirizadas + câmera); congela junto com a pausa
      if (!this.time.paused) { this.acc += Math.min(100, delta); while (this.acc >= STEP) { this.busLine.step(); this.tick++; this.acc -= STEP } }
    } else if (!this.locked) {
      this.acc += Math.min(100, delta)
      while (this.acc >= STEP && !this.locked) { this.step(); this.acc -= STEP }
    }
    this.render()
  }

  render() {
    const P = this.P, cam = this.cameras.main
    this.fx.apply(cam, Math.round(this.cam), Math.round(this.camY))
    for (const w of this.water) w.tilePositionX = (this.tick * 0.4) % 64
    // a vegetação de primeiro plano pertence à rua: some suavemente quando a câmera desce para uma galeria
    const fgA = Phaser.Math.Clamp(1 - (this.camY - CAMY) / 50, 0, 1); for (const f of this.fg) f.setAlpha(fgA)
    const C = this.powered ? POWER[this.heroId] : CHARS[this.heroId], O = CHARS[otherChar(this.heroId)]
    const pick = (c: typeof C, moving: boolean, air: boolean, vy: number) => air ? c.jump.key + (vy < -2 ? c.jumpFrames[0] : vy < 2 ? c.jumpFrames[1] : c.jumpFrames[2]) : moving ? c.run.key + (Math.floor(this.tick / 3) % c.run.n + 1) : c.idle.key + (Math.floor(this.tick / 8) % c.idle.n + 1)
    let key = pick(C, Math.abs(P.vx) > 0.6, !P.ground, P.vy), face = P.face
    if (this.climb) key = C.jump.key + (Math.abs(P.vy) > 0.5 ? C.jumpFrames[Math.floor(this.tick / 8) % 2] : C.jumpFrames[0])   // ARTE PROVISÓRIA: sem quadros de escalar
    let off = centerOffset(key)
    if (this.fightPose && this.heroId === 'pedroca' && !this.punchKey && P.ground) { key = 'pg' + (Math.floor(this.time.now / 300) % 2 + 1); face = 1; off = centerOffset(C.idle.key + '1') }  // pose de luta original
    if (this.punchWho === 'hero' && this.punchKey) { key = this.punchKey; face = 1; off = centerOffset(C.idle.key + '1') }  // ancora no CORPO, não no braço esticado
    this.hero.setTexture(key).setFlipX(face < 0)
    // power-up da Renata: só o pulo tem arte própria (renrata_jump); no chão, brilho dourado pulsante
    if (this.powered && this.heroId === 'renata' && P.ground) this.hero.setTint(Math.floor(this.tick / 6) % 2 ? 0xfff0b0 : 0xffd9f2); else if (this.powered || this.hero.isTinted) this.hero.clearTint()
    this.hero.setPosition(Math.round(P.x + PW / 2 + (face > 0 ? off : -off)), Math.round(P.y + PH))
    // acompanhante: corpo próprio (this.K), animação conforme o estado físico dele
    const K = this.K, kmoving = Math.abs(K.vx) > 0.6
    let ckey = pick(O, kmoving, !K.ground, K.vy), coff = centerOffset(ckey)
    if (Math.abs(K.vx) > 0.3) K.face = K.vx > 0 ? 1 : -1; else if (this.compMode === 'follow') K.face = P.face
    let cface = K.face
    if (this.fightPose && this.heroId === 'renata' && !this.punchKey && K.ground) { ckey = 'pg' + (Math.floor(this.time.now / 300 + 1) % 2 + 1); cface = 1; coff = centerOffset(O.idle.key + '1') }  // Pedroca acompanhante em pose de luta
    if (this.punchWho === 'comp' && this.punchKey) { ckey = this.punchKey; cface = 1; coff = centerOffset(O.idle.key + '1') }
    this.comp.setTexture(ckey).setFlipX(cface < 0).setAlpha(K.alpha).setPosition(Math.round(K.x + K.w / 2 + (cface > 0 ? coff : -coff)), Math.round(K.y + K.h))
    if (location.search.includes('hitboxes')) this.drawDebug()
    this.hero.setVisible(P.inv === 0 || Math.floor(this.tick / 4) % 2 === 0).setAlpha(this.heroAlpha)
    for (const b of this.blocks) b.spr.y = b.r * TILE - Math.round(Math.sin((b.bump / 8) * Math.PI) * 5)
  }
}
