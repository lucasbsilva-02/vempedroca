import Phaser from 'phaser'
import type { Level } from '../types'
import type { GameScene } from './GameScene'
import { SCALE } from './scale'

/* v8 — Linha de ônibus: chegada no início e embarque no final de TODAS as fases.
   Um único sistema, configurado por fase (nome da parada e adereços), integrado ao carregamento da fase:
   o motor acrescenta uma "zona de estação" de chão firme antes da primeira coluna e depois da última
   (o level design original não muda; só é deslocado PRE colunas para a direita).
   Arte original: cenario/onibus-animation1–4 (BRT articulado, frente para a direita) e cenario/parada_brt_vidroarrumado.
   A porta aberta (interior iluminado + folhas recolhidas) é desenhada por código sobre a porta dianteira original. */

/** colunas de chão acrescentadas antes (chegada) e depois (embarque) do mapa da fase */
export const PRE = 16, POST = 22
/** centro da parada, em colunas: na zona inicial e contado a partir do fim do mapa original */
const ARRIVE_COL = 9, DEPART_COL = 10.5

/* geometria do ônibus (quadro 128×128, escala 2, origem no centro da base do PNG) */
const BUS_S = SCALE.onibus1
const BUS_L = (7 - 64) * BUS_S, BUS_R = (123 - 64) * BUS_S          // extremos visíveis em relação ao x do contêiner
const DOOR = { x0: (106 - 64) * BUS_S, x1: (112 - 64) * BUS_S, y0: -(128 - 76) * BUS_S, y1: -(128 - 90) * BUS_S }
const DOOR_CX = (DOOR.x0 + DOOR.x1) / 2
const BUS_DY = (128 - 97) * BUS_S                                     // base das rodas → base do PNG
const FLOOR = -DOOR.y1 - BUS_DY                                       // altura do piso do ônibus acima da calçada (degrau)

type Prop = [key: string, dx: number, flip?: boolean]
export type StationSpec = { name: string; props: Prop[] }
/** Paradas reais do Recife por fase (chegada, partida). Fases novas sem entrada usam "Parada <título>". */
const STATIONS: Record<string, [string, string]> = {
  'vila-palavras-1': ['Mercado de São José', 'Cais de Santa Rita'],
  'vila-palavras-2': ['Rua da Aurora', 'Praça do Diário'],
  'vila-palavras-3': ['Conde da Boa Vista', 'Derby'],
  'reino-numeros-1': ['Cais da Alfândega', 'Ponte Duarte Coelho'],
  'reino-numeros-2': ['Boa Vista', 'Joana Bezerra'],
  'reino-numeros-3': ['Santo Antônio', 'Marco Zero'],
  'floresta-descobertas-1': ['Ponte da Torre', 'Jardim do Baobá'],
  'floresta-descobertas-2': ['Parque da Jaqueira', 'Casa Forte'],
  'floresta-descobertas-3': ['Apipucos', 'Várzea'],
}
/** conjuntos de adereços (decorativos, sem colisão) — alternados para as estações não ficarem idênticas */
const PROPS: Prop[][] = [
  [['banco', -214], ['lixeira', 206], ['mato2', 236]],
  [['semaforo_am', 214], ['banco', -220, true], ['mato4', -252]],
  [['poste', -226], ['lixeira', 214], ['canteiro', 240]],
  [['banco', 222], ['semaforo_am', -214], ['mato2', -246, true]],
]
export function stationsFor(level: Level): { arrive: StationSpec; depart: StationSpec } {
  const n = STATIONS[level.id], seed = level.order + level.worldId.length
  return {
    arrive: { name: n?.[0] ?? level.title, props: PROPS[seed % PROPS.length] },
    depart: { name: n?.[1] ?? level.title, props: PROPS[(seed + 1) % PROPS.length] },
  }
}
/** acrescenta as zonas de estação ao mapa e desloca objetos e falas */
export function withStations(level: Level): { rows: string[]; objects: Level['objects']; tips: NonNullable<Level['tips']>; arriveX: number; departX: number } {
  const T = 32, cols = level.tiles[0].length
  // superfície nas linhas 10–11; em fases com subsolo (18 linhas), rocha embaixo
  const pad = (n: number, r: number) => (r < 10 ? '.' : r <= 11 ? '#' : 'G').repeat(n)
  return {
    rows: level.tiles.map((row, r) => pad(PRE, r) + row + pad(POST, r)),
    objects: level.objects.map(o => ({ ...o, x: o.x + PRE })),
    tips: (level.tips ?? []).map(t => ({ ...t, x: t.x + PRE })),
    arriveX: ARRIVE_COL * T, departX: (PRE + cols + DEPART_COL) * T,
  }
}

type Walker = { x: number; w: number; vx: number; face: 1 | -1 }

/** Estação: parada BRT + placa com o nome + adereços. Puramente decorativa (sem colisão). */
export class Station {
  readonly cx: number; readonly gy: number
  private hint?: Phaser.GameObjects.Image
  constructor(private s: GameScene, cx: number, gy: number, spec: StationSpec, depth: number) {
    this.cx = cx; this.gy = gy
    const ps = SCALE.parada
    s.put('parada', cx, gy, ps, false, depth + 0.2)
    for (const [k, dx0, flip] of spec.props) { const dx = dx0 * ps / 2; if (cx + dx < 16) continue; s.put(k, cx + dx, gy + (k.startsWith('semaforo') || k === 'poste' ? 6 : 0), s.scaleOf(k), !!flip, depth + (k.startsWith('semaforo') || k === 'poste' ? 1.5 : 0)) }
    const roof = gy - 28 * ps
    s.add.text(Math.round(cx), roof - 3, ('BRT • ' + spec.name).toUpperCase(), { fontFamily: '"Silkscreen", monospace', fontSize: '8px', color: '#ffe27a', backgroundColor: '#1b1325', padding: { x: 4, y: 2 } })
      .setOrigin(0.5, 1).setDepth(depth + 0.3).setResolution(2)
  }
  /** seta pulsando sobre a estação (objetivo final depois do chefão) */
  showGoal(on: boolean) {
    if (on && !this.hint) {
      this.hint = this.s.add.image(this.cx, this.gy - 74, 'seta').setOrigin(0.5, 1).setDepth(12)
      this.s.tweens.add({ targets: this.hint, y: this.gy - 68, duration: 420, yoyo: true, repeat: -1 })
    } else if (!on && this.hint) { this.hint.destroy(); this.hint = undefined }
  }
}

/** O ônibus: contêiner com o sprite animado original + a porta (aberta por código). */
class Bus {
  readonly c: Phaser.GameObjects.Container
  private door: Phaser.GameObjects.Graphics
  private open = 0
  constructor(private s: GameScene, x: number, gy: number, depth: number) {
    const spr = s.add.sprite(0, 0, 'onibus1').setOrigin(0.5, 1).setScale(BUS_S).play('bus')
    this.door = s.add.graphics()
    this.c = s.add.container(Math.round(x), gy + BUS_DY, [spr, this.door]).setDepth(depth)
  }
  get doorX() { return this.c.x + DOOR_CX }
  get left() { return this.c.x + BUS_L }
  get right() { return this.c.x + BUS_R }
  private drawDoor() {
    const g = this.door, w = DOOR.x1 - DOOR.x0, h = DOOR.y1 - DOOR.y0, o = Math.round((w / 2) * this.open)
    g.clear(); if (this.open <= 0) return
    const mx = DOOR.x0 + w / 2
    g.fillStyle(0xf2d48a).fillRect(mx - o, DOOR.y0, o * 2, h)               // interior iluminado
    g.fillStyle(0xd9a85c).fillRect(mx - o, DOOR.y1 - 4, o * 2, 4)           // piso / degrau
    g.fillStyle(0x333333).fillRect(DOOR.x0, DOOR.y0, Math.max(2, w / 2 - o), h).fillRect(DOOR.x1 - Math.max(2, w / 2 - o), DOOR.y0, Math.max(2, w / 2 - o), h) // folhas recolhidas
  }
  setDoor(open: boolean, ms = 220) {
    return new Promise<void>(res => this.s.tweens.addCounter({ from: this.open, to: open ? 1 : 0, duration: ms, onUpdate: t => { this.open = t.getValue() ?? 0; this.drawDoor() }, onComplete: () => res() }))
  }
  /** desloca até x (do contêiner) com a curva indicada: chegada desacelera, partida acelera */
  drive(x: number, ms: number, ease: string) {
    return new Promise<void>(res => this.s.tweens.add({ targets: this.c, x: Math.round(x), duration: ms, ease, onComplete: () => res() }))
  }
  destroy() { this.c.destroy() }
}

/**
 * Roteiro das cutscenes. O motor chama step() a 60 Hz enquanto uma cena roda (no lugar da física normal),
 * e as etapas assíncronas usam o relógio da cena (pausar o jogo pausa a cutscene).
 */
export class BusLine {
  readonly arrive: Station; readonly depart: Station
  private walkers: { b: Walker; to: number; speed: number; done: () => void }[] = []
  private camGoal: number | null = null
  running: 'arrive' | 'depart' | null = null
  constructor(private s: GameScene, level: Level, arriveX: number, departX: number, gy: number, depth: number) {
    const st = stationsFor(level)
    this.arrive = new Station(s, arriveX, gy, st.arrive, depth)
    this.depart = new Station(s, departX, gy, st.depart, depth)
  }
  private wait(ms: number) { return new Promise<void>(r => this.s.time.delayedCall(ms, r)) }
  private walk(b: Walker, to: number, speed = 1.9) {
    return new Promise<void>(done => { this.walkers = this.walkers.filter(w => w.b !== b); this.walkers.push({ b, to, speed, done }) })
  }
  private fade(target: { alpha: number }, to: number, ms: number) { return new Promise<void>(r => this.s.tweens.add({ targets: target, alpha: to, duration: ms, onComplete: () => r() })) }
  /** passo fixo: caminhadas roteirizadas (com animação de corrida/idle do próprio personagem) e câmera */
  step() {
    for (const w of [...this.walkers]) {
      const c = w.b.x + w.b.w / 2, d = w.to - c
      if (Math.abs(d) <= w.speed) { w.b.x = w.to - w.b.w / 2; w.b.vx = 0; this.walkers.splice(this.walkers.indexOf(w), 1); w.done() }
      else { w.b.vx = Math.sign(d) * w.speed; w.b.x += w.b.vx; w.b.face = d > 0 ? 1 : -1 }
    }
    // câmera: mantém o enquadramento da estação e só acompanha o personagem quando ele se aproxima da borda
    if (this.camFollow) this.camGoal = this.clampCam(Math.max(this.camFollow.base, this.camFollow.b.x - this.s.VW * 0.72))
    if (this.camGoal !== null) this.s.cam += (this.camGoal - this.s.cam) * 0.06
  }
  private camFollow: { b: Walker; base: number } | null = null
  private clampCam(x: number) { return Phaser.Math.Clamp(x, 0, Math.max(0, this.s.W - this.s.VW)) }

  /** Chegada: estação → ônibus chega e para → porta abre → herói (e acompanhante) descem → porta fecha → ônibus parte → controle. */
  async playArrival(startX: number) {
    const s = this.s, P = s.P, K = s.K, st = this.arrive, gy = st.gy
    this.running = 'arrive'; s.beginCutscene()
    s.heroAlpha = 0; K.alpha = 0
    const door = st.cx + 34
    s.cam = this.clampCam(st.cx - s.VW / 2); this.camGoal = s.cam
    s.fx.focus(st.cx, gy - 40, 1.15, 10)
    s.bus.emit('toast', 'Próxima parada: ' + stationsFor(s.level).arrive.name)
    await this.wait(700)
    const bus = new Bus(s, s.cam - BUS_R - 40 - DOOR_CX, gy, s.depthBus)
    s.sfx('toc')
    await bus.drive(door - DOOR_CX, 2100, 'Cubic.easeOut')               // aproxima e desacelera até a parada
    await this.wait(250); s.sfx('item'); await bus.setDoor(true)
    // desembarque do herói: aparece no vão da porta (no piso do ônibus), desce o degrau e caminha para a plataforma
    await this.alight(P, door, gy, v => { s.heroAlpha = v })
    s.fx.release(900)
    const heroWalk = this.walk(P, startX, 1.9)
    this.camFollow = { b: P, base: s.cam }
    await this.wait(380)
    await this.alight(K, door, gy, v => { K.alpha = v })
    const compWalk = this.walk(K, startX - 44, 1.9)
    await this.wait(300); await bus.setDoor(false); s.sfx('toc')
    await this.wait(200)
    const leave = bus.drive(s.cam + s.VW + 60 - BUS_L, 1900, 'Quad.easeIn').then(() => bus.destroy())
    await Promise.all([heroWalk, compWalk, leave])
    P.face = 1; K.face = 1; this.camFollow = null; this.camGoal = null; this.running = null
    s.endCutscene()
  }

  private async alight(b: Walker & { y: number; h: number; vy: number; ground: boolean }, door: number, gy: number, setAlpha: (v: number) => void) {
    b.x = door - b.w / 2; b.y = gy - FLOOR - b.h; b.vx = 0; b.vy = 0; b.ground = true; b.face = 1
    const a = { alpha: 0 }
    await new Promise<void>(r => this.s.tweens.add({ targets: a, alpha: 1, duration: 160, onUpdate: () => setAlpha(a.alpha), onComplete: () => r() }))
    await this.wait(120)
    const y0 = b.y, hop = { t: 0 }
    b.ground = false
    await new Promise<void>(r => this.s.tweens.add({ targets: hop, t: 1, duration: 260, onUpdate: () => { b.x = door - b.w / 2 + hop.t * 10; b.y = y0 + FLOOR * hop.t - Math.sin(hop.t * Math.PI) * 6; b.vy = hop.t < 0.5 ? -3 : 3 }, onComplete: () => r() }))
    b.y = gy - b.h; b.vy = 0; b.ground = true
  }

  /** Embarque: herói entra na estação → ônibus chega e para → porta abre → acompanhante e herói embarcam → porta fecha → partida → fase concluída. */
  async playDeparture(onDone: () => void) {
    const s = this.s, P = s.P, K = s.K, st = this.depart, gy = st.gy
    this.running = 'depart'; s.beginCutscene(); this.depart.showGoal(false)
    const spot = st.cx - 20, door = st.cx + 30
    s.bus.emit('toast', 'Parada ' + stationsFor(s.level).depart.name + ' — hora de pegar o ônibus!')
    this.camGoal = this.clampCam(st.cx - s.VW / 2)
    s.fx.focus(st.cx, gy - 40, 1.12, 900)
    K.vy = 0; K.y = Math.min(K.y, gy - K.h)
    if (!K.ground || Math.abs(K.y + K.h - gy) > 1) { K.y = gy - K.h; K.ground = true }
    await Promise.all([this.walk(P, spot, 1.9), this.walk(K, spot - 40, 2.3)])
    P.face = -1; K.face = -1                                             // olham para o lado de onde vem o ônibus
    await this.wait(350)
    const bus = new Bus(s, s.cam - BUS_R - 60 - DOOR_CX, gy, s.depthBus)
    s.sfx('toc')
    await bus.drive(door - DOOR_CX, 2200, 'Cubic.easeOut')
    await this.wait(250); s.sfx('item'); await bus.setDoor(true)
    await this.board(K, door, gy, v => { K.alpha = v })                // acompanhante embarca primeiro…
    await this.wait(150)
    await this.board(P, door, gy, v => { s.heroAlpha = v })            // …e o herói por último
    await this.wait(250); await bus.setDoor(false); s.sfx('toc')
    await this.wait(250)
    s.fx.release(1400); this.camGoal = this.clampCam(s.W)               // a câmera acompanha um pouco a partida
    await bus.drive(s.W + 80 - BUS_L, 2300, 'Quad.easeIn')
    bus.destroy(); this.camGoal = null; this.running = null
    s.cameras.main.fadeOut(450, 20, 0, 29)
    await this.wait(480)
    onDone()                                                             // só aqui a fase é concluída (progresso salvo)
  }

  private async board(b: Walker & { y: number; h: number; vy: number; ground: boolean }, door: number, gy: number, setAlpha: (v: number) => void) {
    await this.walk(b, door - 8, 1.6)
    b.face = 1
    const x0 = b.x, hop = { t: 0 }
    b.ground = false
    await new Promise<void>(r => this.s.tweens.add({ targets: hop, t: 1, duration: 240, onUpdate: () => { b.x = x0 + hop.t * 8; b.y = gy - b.h - FLOOR * hop.t - Math.sin(hop.t * Math.PI) * 6; b.vy = hop.t < 0.5 ? -3 : 3 }, onComplete: () => r() }))
    b.ground = true; b.vy = 0
    const a = { alpha: 1 }
    await new Promise<void>(r => this.s.tweens.add({ targets: a, alpha: 0, duration: 180, onUpdate: () => setAlpha(a.alpha), onComplete: () => r() }))
  }
}
