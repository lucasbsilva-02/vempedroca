import Phaser from 'phaser'
import type { LevelObject } from '../types'
import { ASSETS } from './assets'

/* v9 — Bloqueios educativos. Um bloqueio ('gate') só abre depois que o bloco "?" OBRIGATÓRIO ligado a ele
   (gate.requires = id do bloco, com question.required = true) é respondido corretamente.
   - 'bridge': ponte levadiça sobre um vão de 6+ colunas (largo demais para pular). Fechada fica erguida na margem
     de lá; ao abrir, baixa e vira chão firme.
   - 'wall': muralha de pedra (tileset tiles-marcozero) de 5 tiles de altura (mais alta que o pulo). Ao abrir, afunda.
   Os dois mostram o selo "?" do bloco que os libera. O estado aberto fica na cena (quedas, checkpoints e câmera não
   fecham de novo). Perto de um bloqueio pendente o acompanhante avisa (falas que variam) e uma seta na borda da tela
   aponta de volta para o bloco. */

export type GateObject = LevelObject & { kind?: 'bridge' | 'wall'; w?: number; requires?: string; label?: string }
export type Gate = { o: GateObject; kind: 'bridge' | 'wall'; c0: number; w: number; req: string; open: boolean; ready: boolean; view: Phaser.GameObjects.Container; hintT: number; hints: number }
export type GateFx = { sfx: (k: string) => void; shake: (amp: number, ms: number) => void }
/** duração total da animação de abertura (antecipação + movimento + impacto), para a câmera esperar */
export const OPEN_MS = 4000

const T = 32
export const TS = 'mz' // spritesheet do tileset original tiles-marcozero (32×32, 40 colunas)
export const fr = (c: number, r: number) => r * 40 + c

const LINES: Record<'pedroca' | 'renata', { first: string; again: string[] }> = {
  renata: {
    first: 'Olha, tem que voltar! A gente não vai conseguir passar sem resolver aquele bloco ? que ficou pra trás.',
    again: ['O bloco ? obrigatório tá lá atrás, ó! Segue a seta.', 'Sem responder o bloco, isso aqui não abre…', 'Bora voltar? A seta mostra o caminho.'],
  },
  pedroca: {
    first: 'Ei, segura aí! Sem responder o bloco ? lá atrás, não tem como passar, visse?',
    again: ['O bloco obrigatório ficou pra trás, visse? Vai pela seta.', 'Tá fechado ainda. Primeiro o bloco ?, depois a gente passa!', 'Volta lá no bloco ? que eu espero aqui.'],
  },
}

export class Gates {
  readonly list: Gate[] = []
  private solid = new Set<string>()
  private edge: Phaser.GameObjects.Image; private bob = 0
  constructor(private s: Phaser.Scene, objs: LevelObject[], private gy: number, private depth: number) {
    for (const o of objs) if (o.type === 'gate') {
      const g = o as GateObject, kind = g.kind ?? 'bridge', w = g.w ?? (kind === 'bridge' ? 6 : 2)
      const gate: Gate = { o: g, kind, c0: g.x, w, req: g.requires ?? '', open: false, ready: false, view: this.build(kind, g.x, w, g.label === 'chefe' ? 'capanga1' : 'qreq'), hintT: 0, hints: 0 }
      this.list.push(gate); this.apply(gate)
    }
    // seta de orientação presa à tela (aponta para a esquerda, na altura do bloco pendente)
    this.edge = s.add.image(14, 120, 'seta').setScrollFactor(0).setAngle(90).setDepth(30).setVisible(false)
  }
  isSolid(c: number, r: number) { return this.solid.has(c + ',' + r) }
  /** células sólidas conforme o estado: muralha fechada = sólida; ponte aberta = tabuleiro sólido */
  private apply(g: Gate) {
    for (let c = g.c0; c < g.c0 + g.w; c++) {
      // a colisão só muda quando a estrutura TERMINA de se mover (ready): nada de andar sobre ponte ainda erguida
      if (g.kind === 'wall') for (let r = 5; r <= 9; r++) { if (g.ready) this.solid.delete(c + ',' + r); else this.solid.add(c + ',' + r) }
      else { if (g.ready) this.solid.add(c + ',' + 10); else this.solid.delete(c + ',' + 10) }
    }
  }
  private build(kind: 'bridge' | 'wall', c0: number, w: number, seal = 'qreq') {   // v16: portão do capanga-chefe tem o selo do capanga
    const s = this.s, x0 = c0 * T
    if (kind === 'wall') {
      // blocos de pedra emoldurados do tileset original (9 partes: colunas 8–10, linhas 14–16), 2 de largura × 5 de altura
      const c = s.add.container(x0, this.gy).setDepth(this.depth)
      for (let r = 0; r < 5; r++) for (let k = 0; k < w; k++) {
        const col = k === 0 ? 8 : k === w - 1 ? 10 : 9, row = r === 0 ? 14 : r === 4 ? 16 : 15
        c.add(s.add.image(k * T, -(5 - r) * T, TS, fr(col, row)).setOrigin(0, 0))
      }
      c.add(s.add.image((w * T) / 2, -2.5 * T, seal).setScale(0.75))          // selo do bloco obrigatório
      const mask = s.make.graphics({}, false).fillStyle(0xffffff).fillRect(x0 - 4, 0, w * T + 8, this.gy)
      c.setMask(mask.createGeometryMask())
      return c
    }
    // ponte: tabuleiro com corrimão (arte original plataforma-com-barra), articulada na margem direita
    const a = ASSETS.platb, hinge = (c0 + w) * T, c = s.add.container(hinge, this.gy).setDepth(this.depth)
    for (let k = 0; k < Math.ceil(w / 2); k++) c.add(s.add.image(-k * 64 - 32, -a[4], 'platb').setOrigin(0.5, 0))
    c.add(s.add.image(-w * T + 18, 4, seal).setScale(0.6))
    c.setAngle(90)                                                              // erguida (fechada)
    s.add.rectangle(hinge + 2, this.gy, 6, 40, 0x3a2a1a).setOrigin(0.5, 1).setDepth(this.depth + 0.1)   // poste da articulação
    return c
  }
  /** poeira em pixel art (quadradinhos que se espalham e somem) */
  private dust(x: number, y: number, n: number, spread = 26) {
    for (let i = 0; i < n; i++) {
      const r = this.s.add.rectangle(x + (Math.random() - 0.5) * spread, y - Math.random() * 4, 3, 3, i % 3 ? 0xd9c9a3 : 0xb8a98a).setDepth(this.depth + 1)
      this.s.tweens.add({ targets: r, x: r.x + (Math.random() - 0.5) * 36, y: r.y - 6 - Math.random() * 14, alpha: 0, duration: 500 + Math.random() * 400, ease: 'Quad.easeOut', onComplete: () => r.destroy() })
    }
  }
  /** v10 — abre com sequência física: ATIVAÇÃO → ANTECIPAÇÃO (treme) → MOVIMENTO gradual → IMPACTO (tremor + poeira)
   *  → LIBERAÇÃO (só então a colisão muda). Ponte: treme erguida, baixa acelerando como uma ponte levadiça e quica.
   *  Muralha: vibra e solta pó do topo, afunda devagar trepidando e termina num baque. */
  open(g: Gate, fx: GateFx) {
    if (g.open) return
    g.open = true                                                               // falas e seta param; a passagem ainda NÃO existe
    const s = this.s, v = g.view, x0 = g.c0 * T, x1 = (g.c0 + g.w) * T
    fx.sfx('win')
    const jitter = (ms: number, amp: number, prop: 'angle' | 'x', base: number, onDone: () => void) => {
      const t = { k: 0 }
      s.tweens.add({ targets: t, k: 1, duration: ms, onUpdate: () => { v[prop] = base + (Math.random() * 2 - 1) * amp * (prop === 'angle' ? 1 : 1) }, onComplete: () => { v[prop] = base; onDone() } })
    }
    const finish = () => { g.ready = true; this.apply(g); fx.sfx('toc') }
    if (g.kind === 'bridge') {
      // antecipação: a ponte erguida treme e range
      fx.sfx('toc'); s.time.delayedCall(450, () => fx.sfx('toc'))
      jitter(1000, 1.6, 'angle', 90, () => {
        // movimento: baixa de 90° a 0° acelerando (gravidade), 1,9 s
        s.tweens.add({ targets: v, angle: 0, duration: 1900, ease: 'Quad.easeIn', onComplete: () => {
          // impacto: tremor, poeira na margem de lá e um pequeno quique
          fx.shake(5, 320); this.dust(x0 + 8, this.gy, 14, 40); this.dust((x0 + x1) / 2, this.gy, 8, 60)
          s.tweens.add({ targets: v, angle: 3, duration: 140, yoyo: true, ease: 'Sine.easeOut', onComplete: () => { v.angle = 0; s.time.delayedCall(300, finish) } })
        } })
      })
    } else {
      // antecipação: a muralha vibra e solta pó do topo
      const bx = v.x
      fx.sfx('toc'); this.dust((x0 + x1) / 2, this.gy - 5 * T, 8, 50)
      jitter(1000, 1.5, 'x', bx, () => {
        // movimento: afunda devagar, trepidando, soltando poeira na base
        const dustEv = s.time.addEvent({ delay: 180, loop: true, callback: () => this.dust((x0 + x1) / 2, this.gy, 3, g.w * T) })
        const t = { y: v.y }
        s.tweens.add({ targets: t, y: this.gy + 5 * T + 8, duration: 2400, ease: 'Sine.easeInOut', onUpdate: () => { v.y = t.y; v.x = bx + (Math.random() < 0.5 ? -1 : 1) }, onComplete: () => {
          dustEv.remove(); v.x = bx; v.setVisible(false)
          fx.shake(4, 260); this.dust((x0 + x1) / 2, this.gy, 16, g.w * T + 20)
          s.time.delayedCall(250, finish)
        } })
      })
    }
  }
  byReq(id: string) { return this.list.filter(g => g.req === id) }
  pendingFor(x: number) { return this.list.find(g => !g.open && x < g.c0 * T + 8) }
  /** passo de 60 Hz: falas do acompanhante e seta de orientação. blockX/blockY: posição do bloco que libera o bloqueio */
  step(heroX: number, compId: 'pedroca' | 'renata', compName: string, blockOf: (id: string) => { x: number; y: number; done: boolean } | null,
    view: { x0: number; w: number; y0: number }, say: (who: string, text: string) => void) {
    let guide: { x: number; y: number } | null = null
    for (const g of this.list) {
      if (g.open) continue
      const b = blockOf(g.req); if (!b || b.done) continue
      if (g.hintT > 0) g.hintT--
      const face = g.c0 * T
      // encostou no bloqueio (até 3 tiles antes) sem ter respondido: aviso curto, sem repetir a mesma fala toda vez
      if (heroX > face - 3 * T && heroX < face + 8 && g.hintT === 0) {
        const L = LINES[compId], text = g.hints === 0 ? L.first : L.again[(g.hints - 1) % L.again.length]
        say(compName, text); g.hints++; g.hintT = 60 * 7
      }
      // depois do primeiro aviso, a seta orienta até o bloco enquanto ele estiver fora da tela
      if (g.hints > 0 && heroX > b.x - 2 * T && heroX < face + 8) guide = b
    }
    const off = guide && (guide.x < view.x0 + 8 || guide.x > view.x0 + view.w - 8)
    this.edge.setVisible(!!off)
    if (guide && off) {
      const left = guide.x < view.x0, b = Math.round(Math.abs(Math.sin(++this.bob / 9)) * 6)
      this.edge.setAngle(left ? 90 : -90).setPosition(left ? 16 + b : view.w - 16 - b, Phaser.Math.Clamp(guide.y - view.y0, 40, 300))
    }
  }
}
