import Phaser from 'phaser'
import type { LevelObject } from '../types'
import { ASSETS } from './assets'
import { CAR_SCALE, SCALE } from './scale'

/* v11 — Trânsito no MESMO chão do personagem. O leito da rua ('=' na linha 10) é chão contínuo; os carros andam
   SOMENTE sobre ele, na linha dos pés do Pedroca e da Renata: entram por uma borda do asfalto (rua transversal) e saem
   pela outra. A calçada é segura porque o carro nunca passa por ela — não há zona mágica nem parede invisível.
   Um estado único por cruzamento (state()) comanda semáforo, avanço dos carros e dano: verde/amarelo = carros
   circulam e qualquer contato com carro em movimento atinge o jogador (detecção varrida entre quadros, com a bbox
   visível do carro); vermelho = carros param antes da linha de retenção e não causam dano. */

export type TrafficObject = LevelObject & {
  w?: number
  cycle?: { green: number; yellow: number; red: number; offset?: number } // segundos
  lanes?: { dir: 1 | -1; every?: number; speed?: number }[]
  tutorial?: boolean
}
type Phase = 'green' | 'yellow' | 'red'
type Car = { x: number; v: number; spr: Phaser.GameObjects.Image; past: boolean; out?: boolean }
type Lane = { dir: 1 | -1; every: number; speed: number; t: number; cars: Car[]; bottom: number; depth: number }
type Body = { x: number; y: number; w: number; h: number }

const T = 32
/** a base dos postes entra 6 px na faixa clara da calçada (o topo do tile tem 2 px de borda escura): parecem fincados, não flutuando */
const SINK = 6
const CAR = 'fusca', CAR_S = CAR_SCALE
const carW = Math.round((ASSETS[CAR][5] - ASSETS[CAR][3]) * CAR_S), carH = Math.round((ASSETS[CAR][6] - ASSETS[CAR][4]) * CAR_S)
const TINTS = [0xffffff, 0xffd27a, 0xff9f8f, 0xb4f0a6, 0xd8c4ff]

/** cria as texturas derivadas do semáforo original (as luzes vermelha e verde acesas a partir das apagadas)
 *  com o mesmo critério do amarelo aceso original (7c8033→cdd454, 939658→f3f991), e o boneco de pedestre */
export function makeTrafficTextures(s: Phaser.Scene) {
  const lit = (key: string, map: Record<string, number[]>) => {
    if (s.textures.exists(key)) return
    const src = s.textures.get('semaforo_of').getSourceImage() as HTMLImageElement
    const t = s.textures.createCanvas(key, src.width, src.height)!, c = t.getContext()
    c.drawImage(src, 0, 0); const d = c.getImageData(0, 0, src.width, src.height)
    for (let i = 0; i < d.data.length; i += 4) {
      const h = ((d.data[i] << 16) | (d.data[i + 1] << 8) | d.data[i + 2]).toString(16).padStart(6, '0'), m = map[h]
      if (m && d.data[i + 3] > 0) { d.data[i] = m[0]; d.data[i + 1] = m[1]; d.data[i + 2] = m[2] }
    }
    c.putImageData(d, 0, 0); t.refresh()
  }
  lit('sem_red', { '772e2e': [0xe8, 0x43, 0x3a], '8e4638': [0xff, 0xa0, 0x8c] })
  lit('sem_green', { '3b8033': [0x4f, 0xe0, 0x61], '568850': [0xb9, 0xff, 0xb0] })
  // semáforo de pedestre (provisório por código: não existe nos arquivos) — boneco parado (vermelho) e andando (verde)
  const ped = (key: string, col: string, walk: boolean) => {
    if (s.textures.exists(key)) return
    const t = s.textures.createCanvas(key, 10, 14)!, x = t.getContext()
    x.fillStyle = '#2b2b2b'; x.fillRect(0, 0, 10, 14); x.fillStyle = '#353535'; x.fillRect(1, 1, 8, 12)
    x.fillStyle = col; x.fillRect(4, 2, 2, 2)                                  // cabeça
    x.fillRect(4, 4, 2, 4)                                                     // corpo
    if (walk) { x.fillRect(3, 5, 1, 2); x.fillRect(6, 4, 1, 2); x.fillRect(3, 8, 1, 3); x.fillRect(6, 8, 1, 2); x.fillRect(7, 10, 1, 1) }
    else { x.fillRect(3, 4, 1, 3); x.fillRect(6, 4, 1, 3); x.fillRect(4, 8, 1, 4); x.fillRect(5, 8, 1, 4) }
    t.refresh()
  }
  ped('ped_stop', '#ff4c2d', false); ped('ped_walk', '#5df07a', true)
}

/** Estado único de um cruzamento, lido por TODOS os carros dele, pelo semáforo, pela colisão e pelo acompanhante. */
export type CrossState = { light: Phase; carsGo: boolean; dangerous: boolean; clearing: boolean; walk: boolean }

export class Crossing {
  readonly x0: number; readonly x1: number          // leito da rua (px): o ÚNICO lugar por onde os carros andam
  private gy: number; private f = 0; private cyc: [number, number, number]
  private lanes: Lane[] = []
  private lights: Phaser.GameObjects.Image[] = []; private peds: Phaser.GameObjects.Image[] = []
  /** o JOGADOR entrou na rua com o sinal fechado para os carros: os carros que ainda não cruzaram a linha esperam
   *  até ele sair, mesmo que o sinal abra no meio da travessia (o acompanhante não liga essa proteção) */
  protect = false
  /** quadros de tolerância que restam depois que o sinal abriu com o jogador ainda na rua (1,5 s) */
  private graceT = 0
  private pPrev: Body | null = null
  /** recorte do leito da rua: os carros só são desenhados sobre o asfalto */
  private mask!: Phaser.Display.Masks.GeometryMask
  /** depuração/testes: contatos detectados e retângulos dos carros no último passo */
  readonly debug = { contacts: 0, rects: [] as Body[] }
  tutorialShown = false
  readonly tutorial: boolean
  constructor(private s: Phaser.Scene, o: TrafficObject, gy: number, depthObj: number, depthCars: number) {
    const w = o.w ?? 6
    this.x0 = o.x * T; this.x1 = (o.x + w) * T; this.gy = gy; this.tutorial = !!o.tutorial
    const c = o.cycle ?? { green: 5, yellow: 1.5, red: 5 }
    this.cyc = [c.green * 60, c.yellow * 60, c.red * 60]; this.f = Math.round((c.offset ?? 0) * 60)
    this.mask = s.make.graphics({}, false).fillStyle(0xffffff).fillRect(this.x0, gy - 120, this.x1 - this.x0, 140).createGeometryMask()
    const lanes = o.lanes ?? [{ dir: 1 }]
    lanes.forEach((l, i) => this.lanes.push({ dir: l.dir, every: Math.round((l.every ?? 2.6) * 60), speed: l.speed ?? 2.8, t: 20 + i * 50, cars: [], bottom: gy + 2 - (i ? 3 : 0), depth: depthCars - (i ? 0.1 : 0) }))
    // faixa de pedestre entre as linhas de retenção e as linhas de retenção pintadas no asfalto
    const g = s.add.graphics().setDepth(depthObj - 0.5)
    const zl = Math.min(...this.lanes.map(l => (l.dir > 0 ? this.stopX(l) + 4 : this.x0 + 4))), zr = Math.max(...this.lanes.map(l => (l.dir < 0 ? this.stopX(l) - 4 : this.x1 - 4)))
    for (let x = zl + 4; x < zr - 6; x += 12) g.fillStyle(0xf2f2f2).fillRect(x, gy + 3, 7, 6)
    for (const l of this.lanes) g.fillStyle(0xffffff).fillRect(this.stopX(l) + (l.dir > 0 ? 1 : -3), gy + 2, 2, 9)
    // semáforo para os carros na calçada, junto ao meio-fio de onde eles vêm (atrás dele é a área de espera)
    const sides = new Set(this.lanes.map(l => l.dir))
    for (const d of sides) {
      const lx = d > 0 ? this.x0 - 16 : this.x1 + 16, a = ASSETS.semaforo_of
      this.lights.push(s.add.image(Math.round(lx + (a[1] / 2 - (a[3] + a[5]) / 2) * SCALE.semaforo), gy + SINK + (a[2] - a[6]) * SCALE.semaforo, 'sem_green').setOrigin(0.5, 1).setScale(SCALE.semaforo).setDepth(depthObj).setFlipX(d < 0))
    }
    for (const px of [this.x0 - 30, this.x1 + 30]) {
      s.add.rectangle(px, gy + SINK, 3, 46 + SINK, 0x333333).setOrigin(0.5, 1).setDepth(depthObj)
      this.peds.push(s.add.image(px, gy - 44, 'ped_stop').setOrigin(0.5, 1).setScale(1.6).setDepth(depthObj))
    }
    this.refresh()
  }
  get period() { return this.cyc[0] + this.cyc[1] + this.cyc[2] }
  phase(): Phase { const t = this.f % this.period; return t < this.cyc[0] ? 'green' : t < this.cyc[0] + this.cyc[1] ? 'yellow' : 'red' }
  /** quadros restantes da fase atual */
  left() { const t = this.f % this.period; return t < this.cyc[0] ? this.cyc[0] - t : t < this.cyc[0] + this.cyc[1] ? this.cyc[0] + this.cyc[1] - t : this.period - t }
  /** fonte única de estado: cor do semáforo, se os carros podem avançar e se um carro em movimento causa dano */
  state(): CrossState {
    const light = this.phase()
    // carro que já passou da linha e ainda está cruzando: termina a travessia mesmo no vermelho, e continua sólido
    // algum carro ainda se movendo no asfalto (terminando de cruzar ou freando até a linha)?
    const clearing = this.lanes.some(l => l.cars.some(c => c.v > 0.05 && !c.out))
    const walk = light === 'red' && !clearing                         // boneco verde só quando todos os carros pararam
    return { light, carsGo: light !== 'red' && !this.protect, dangerous: clearing || (light !== 'red' && !this.protect), clearing, walk }
  }
  /** linha de retenção: logo depois da área de chegada (cabe um carro inteiro sobre o asfalto antes dela) */
  private stopX(l: Lane) { return l.dir > 0 ? this.x0 + carW + 14 : this.x1 - carW - 14 }
  private refresh() {
    const p = this.phase()
    for (const l of this.lights) l.setTexture(p === 'green' ? 'sem_green' : p === 'yellow' ? 'semaforo_am' : 'sem_red')
    const walk = this.state().walk, blink = p === 'yellow' && Math.floor(this.f / 12) % 2 === 0
    for (const pd of this.peds) pd.setTexture(walk ? 'ped_walk' : 'ped_stop').setVisible(!blink)
  }
  /** corpo sobre o leito da rua (no chão ou num pulo baixo) */
  inDip(b: Body) { return b.y + b.h > this.gy - 40 && b.x + b.w > this.x0 && b.x < this.x1 }
  near(x: number, margin: number) { return x > this.x0 - margin && x < this.x1 + margin }
  /** para o acompanhante: entrar na rua agora é perigoso? (só entra com o vermelho para os carros e tempo de sobra) */
  unsafe(x: number) {
    if (x < this.x0 - 2 || x > this.x1 + 2) return false
    if (this.protect) return false
    const st = this.state(); return !(st.walk && this.left() > 100)
  }
  /** passo de 60 Hz; devolve true se houve contato real entre o jogador e um carro em movimento com o sinal aberto */
  step(P: Body, cam: number, VW: number): boolean {
    this.f++
    this.refresh()
    const pIn = this.inDip(P)
    if (!pIn) { this.protect = false; this.graceT = 0 }
    else if (!this.protect && this.state().walk) { this.protect = true; this.graceT = 90 }
    // a proteção não é eterna: depois que o sinal abre, sobram 1,5 s para terminar a travessia; quem fica parado na rua
    // depois disso volta a estar na trajetória dos carros
    if (this.protect && this.phase() !== 'red' && --this.graceT <= 0) this.protect = false
    const st = this.state()
    // retângulo varrido do jogador (posição anterior ∪ atual): nada escapa entre dois quadros
    // (um teleporte — respawn, empurrão do impacto — não conta como deslocamento: varre só a posição atual)
    const pp = this.pPrev && Math.abs(this.pPrev.x - P.x) < 24 && Math.abs(this.pPrev.y - P.y) < 24 ? this.pPrev : P, px0 = Math.min(pp.x, P.x), px1 = Math.max(pp.x, P.x) + P.w, py0 = Math.min(pp.y, P.y), py1 = Math.max(pp.y, P.y) + P.h
    this.pPrev = { x: P.x, y: P.y, w: P.w, h: P.h }
    const active = this.x1 > cam - 96 && this.x0 < cam + VW + 96
    let hit = false; this.debug.rects = []
    for (const l of this.lanes) {
      if (active && --l.t <= 0) { l.t = l.every + Math.floor(Math.random() * 40); this.spawn(l, P) }
      const stop = this.stopX(l)
      l.cars.sort((a, b) => (b.x - a.x) * l.dir)
      l.cars.forEach((c, i) => {
        const front = c.x + l.dir * carW / 2, dist = (stop - front) * l.dir
        if (!c.past && dist < -1) c.past = true
        let want = l.speed
        if (!c.past) {
          const hold = !st.carsGo || (st.light === 'yellow' && dist > 26)
          if (hold) want = Math.min(want, dist <= 0.5 ? 0 : Math.sqrt(2 * 0.12 * dist))
        }
        const ahead = l.cars[i - 1]
        if (ahead) { const gap = (ahead.x - c.x) * l.dir - carW - 12; want = Math.min(want, Math.max(0, gap * 0.25)) }
        c.v += Math.max(-0.25, Math.min(0.08, want - c.v)); if (want === 0 && c.v < 0.05) c.v = 0
        const xPrev = c.x
        c.x += c.v * l.dir; c.spr.x = Math.round(c.x)
        // v13: entra e sai pela borda do asfalto como quem vem de uma rua transversal — a máscara recorta o carro no
        // limite da rua, então ele aparece aos poucos (nunca "surge" inteiro) e nunca é desenhado sobre a calçada
        if (l.dir > 0 ? c.x - carW / 2 >= this.x1 : c.x + carW / 2 <= this.x0) c.out = true
        // corpo físico = bbox VISÍVEL do sprite, varrido entre a posição anterior e a atual, recortado ao asfalto
        const rx0 = Math.max(this.x0, Math.min(xPrev, c.x) - carW / 2 + 3), rx1 = Math.min(this.x1, Math.max(xPrev, c.x) + carW / 2 - 3)
        const r = { x: rx0, y: l.bottom - carH + 3, w: Math.max(0, rx1 - rx0), h: carH - 3 }
        this.debug.rects.push(r)
        // regra física única: carro EM MOVIMENTO atinge quem estiver no caminho; carro parado não causa dano
        const moving = c.v > 0.05 || Math.abs(c.x - xPrev) > 0.05
        if (moving && r.w > 0 && px0 < r.x + r.w && px1 > r.x && py0 < r.y + r.h && py1 > r.y) { hit = true; this.debug.contacts++ }
      })
      l.cars = l.cars.filter(c => { if (c.out) c.spr.destroy(); return !c.out })
    }
    return hit
  }
  private spawn(l: Lane, _P: Body) {
    const x = l.dir > 0 ? this.x0 - carW / 2 : this.x1 + carW / 2                  // começa fora do asfalto (rua transversal)
    if (this.phase() !== 'green' || this.protect) return                           // carro novo só entra no verde
    if (l.cars.some(c => Math.abs(c.x - x) < carW + 16)) return
    const a = ASSETS[CAR]
    const spr = this.s.add.image(x, l.bottom + (a[2] - a[6]) * CAR_S, CAR).setOrigin(0.5, 1).setScale(CAR_S).setDepth(l.depth)
      .setFlipX(l.dir < 0).setTint(TINTS[Math.floor(Math.random() * TINTS.length)]).setMask(this.mask)
    l.cars.push({ x, v: l.speed, spr, past: false })
  }
}

export class Traffic {
  readonly list: Crossing[] = []
  constructor(s: Phaser.Scene, objs: LevelObject[], gy: number, depthObj: number, depthCars: number) {
    makeTrafficTextures(s)
    for (const o of objs) if (o.type === 'traffic') this.list.push(new Crossing(s, o as TrafficObject, gy, depthObj, depthCars))
  }
  /** o ponto x é perigoso para o acompanhante entrar agora? */
  unsafe(x: number) { return this.list.some(c => c.unsafe(x)) }
  step(P: Body, cam: number, VW: number): Crossing | null {
    let hit: Crossing | null = null
    for (const c of this.list) if (c.step(P, cam, VW)) hit = c
    return hit
  }
}
