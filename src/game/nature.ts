import Phaser from 'phaser'
import type { LevelObject } from '../types'

/* v15 — Etapa 4 (Rio Capibaribe / Floresta das Descobertas): plataformas móveis sobre o rio.
   Canoas e troncos ('mover') vão e voltam entre dois pontos (dx/dy em colunas/linhas, velocidade em px/quadro).
   A face de cima é atravessável por baixo (como as plataformas '-') e CARREGA quem está em cima: herói e acompanhante.
   O rio ('~' no mapa) não tem chão: cair na água é como cair numa vala (volta ao checkpoint). */

export type MoverObject = LevelObject & { dx?: number; dy?: number; speed?: number; kind?: 'canoa' | 'tronco' }
export type Mover = { x: number; y: number; w: number; vx: number; vy: number; x0: number; x1: number; y0: number; y1: number; t: number; period: number; spr: Phaser.GameObjects.Image }
type Body = { x: number; y: number; w: number; h: number; vx: number; vy: number; ground: boolean; mover?: Mover | null }

const T = 32
export class Movers {
  readonly list: Mover[] = []
  constructor(s: Phaser.Scene, objs: LevelObject[], depth: number) {
    for (const o of objs) if (o.type === 'mover') {
      const m = o as MoverObject, kind = m.kind ?? 'canoa', w = (m.w ?? 3) * T
      const x0 = m.x * T, y0 = (m.y + 1) * T                           // topo na linha da margem: embarca e desembarca andando
      const x1 = x0 + (m.dx ?? 0) * T, y1 = y0 + (m.dy ?? 0) * T
      const dist = Math.hypot(x1 - x0, y1 - y0), speed = m.speed ?? 1
      const spr = s.add.image(x0, y0 - 2, kind).setOrigin(0, 0).setDepth(depth).setDisplaySize(w, 16)
      this.list.push({ x: x0, y: y0, w, vx: 0, vy: 0, x0, x1, y0, y1, t: 0, period: Math.max(60, Math.round((dist / speed) * 2)), spr })
    }
  }
  /** move todas as plataformas (vai e volta com suavização nas pontas) e carrega quem estava em cima */
  step(bodies: Body[]) {
    for (const m of this.list) {
      m.t = (m.t + 1) % m.period
      const k = (1 - Math.cos((m.t / m.period) * Math.PI * 2)) / 2      // 0 → 1 → 0
      const nx = m.x0 + (m.x1 - m.x0) * k, ny = m.y0 + (m.y1 - m.y0) * k
      m.vx = nx - m.x; m.vy = ny - m.y; m.x = nx; m.y = ny
      m.spr.setPosition(Math.round(m.x), Math.round(m.y) - 2)
      // pequeno balanço na água
      m.spr.setAngle(Math.sin(m.t / 18) * 1.2)
    }
    for (const b of bodies) {
      const m = b.mover
      if (!m) continue
      if (b.x + b.w > m.x && b.x < m.x + m.w) { b.x += m.vx; b.y = m.y - b.h } else b.mover = null
    }
  }
  /** pouso numa plataforma (chamado depois do movimento vertical) — só de cima para baixo */
  land(b: Body, prevBottom: number) {
    if (b.vy < 0) return false
    for (const m of this.list) {
      if (b.x + b.w > m.x + 2 && b.x < m.x + m.w - 2 && prevBottom <= m.y + 1.5 && b.y + b.h >= m.y) {
        b.y = m.y - b.h; b.vy = 0; b.ground = true; b.mover = m; return true
      }
    }
    return false
  }
}
