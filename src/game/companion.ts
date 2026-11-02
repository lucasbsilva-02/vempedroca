/* v8 — Inteligência do acompanhante (vale para Renata acompanhando o Pedroca e vice-versa).
   Antes: imitava o salto do herói com atraso e pulava "às cegas" ao ver um vão → caía em buracos.
   Agora o acompanhante PLANEJA: cada salto candidato é simulado com a MESMA física e colisão do jogo (moveX/moveY),
   e só é executado se aterrissa numa superfície segura mais perto do destino. Sem salto seguro, ele espera na borda.
   Persegue a última posição SEGURA do herói (no chão), nunca o herói no meio de um pulo sobre um vão.
   Recuperação: se ficar preso/para trás, reaparece FORA da câmera, atrás do herói, numa superfície segura, e entra correndo. */

export type CRect = { x: number; y: number; w: number; h: number }
export type CBody = CRect & { vx: number; vy: number; ground: boolean }
export interface CompanionWorld {
  tile: number; worldW: number
  /** abaixo desta altura o corpo caiu para fora do mundo (vala sem fundo). Galerias subterrâneas ficam acima dela. */
  deathY: number
  /** v9: entrar em x agora é perigoso? (faixa de pedestre com o verde para os carros) */
  hazard(x: number): boolean
  cellSolid(c: number, r: number): boolean
  oneway(c: number, r: number): boolean
  solids: CRect[]
  moveX(o: CBody, dx: number): void
  moveY(o: CBody, dy: number): void
  view(): { x0: number; x1: number }
}
type Land = { x: number; feet: number; frames: number } | null

/** física do acompanhante (igual à usada pelo motor) */
export const C_PHYS = { gUp: 0.55, gDown: 1, maxFall: 12, jump: -10.6, hop: -8.4, walk: 4.0, run: 5.6, acc: 0.5, airAcc: 0.3 }

export class CompanionAI {
  /** último ponto seguro (centro x, pés) do herói e do acompanhante */
  private heroSafe = { x: 0, feet: 0 }
  private side: 1 | -1 = 1; private sideT = 0
  private plan: { vx: number } | null = null
  private cool = 0; private blockT = 0; private stuckT = 0; private bestD = 1e9; private waitT = 0
  /** pedido de reposicionamento (o motor faz o fade); exposto para depuração/testes */
  stats = { jumps: 0, waits: 0, reposition: 0, edgeStops: 0 }
  constructor(private w: CompanionWorld) {}

  reset(heroX: number, heroFeet: number, face: 1 | -1) { this.heroSafe = { x: heroX, feet: heroFeet }; this.side = face; this.plan = null; this.cool = 20; this.blockT = 0; this.stuckT = 0; this.bestD = 1e9; this.waitT = 0 }

  /* ---------- consultas ao mapa ---------- */
  private supportAt(x: number, feet: number) {
    const t = this.w.tile, c = Math.floor(x / t), r = Math.floor((feet + 1) / t)
    if (Math.abs(feet - r * t) <= 1.5 && (this.w.cellSolid(c, r) || this.w.oneway(c, r))) return true
    return this.w.solids.some(s => x >= s.x && x <= s.x + s.w && Math.abs(s.y - feet) <= 1.5)
  }
  private dead(o: CBody) { return !o.ground && o.y > this.w.deathY }
  /** um passo de física idêntico ao do motor */
  private integrate(o: CBody) {
    o.vy = Math.min(C_PHYS.maxFall, o.vy + (o.vy < 0 ? C_PHYS.gUp : C_PHYS.gDown))
    this.w.moveX(o, o.vx); this.w.moveY(o, o.vy)
    o.x = Math.max(0, Math.min(this.w.worldW - o.w, o.x))
  }
  /** simula um salto (vy < 0) ou uma caminhada até sair da borda (vy = 0) mantendo vx constante;
   *  retorna onde aterrissa depois de ter estado no ar, ou null se cai no vão */
  simulate(K: CBody, vx: number, vy: number, maxFrames = 110): Land {
    const o: CBody = { x: K.x, y: K.y, w: K.w, h: K.h, vx, vy, ground: vy === 0 && K.ground }
    let air = false
    for (let f = 1; f <= maxFrames; f++) {
      o.vx = vx; this.integrate(o)
      if (this.dead(o)) return null
      if (!o.ground) air = true
      else if (vy === 0 && this.w.hazard(o.x + o.w / 2)) return null              // caminhar para dentro da faixa no verde = proibido
      else if (air) return { x: o.x + o.w / 2, feet: o.y + o.h, frames: f }
    }
    return air ? null : { x: o.x + o.w / 2, feet: o.y + o.h, frames: maxFrames }
  }

  /** encontra uma superfície segura (topo de chão/plataforma livre) perto de x, preferindo a altura dos pés indicada */
  safeSpot(x: number, feet: number, K: CRect, range = 6): { x: number; y: number } | null {
    const t = this.w.tile, rows = Math.ceil(this.w.deathY / t)
    const ok = (cx: number, r: number) => {
      const xl = cx - K.w / 2, c0 = Math.floor(xl / t), c1 = Math.floor((xl + K.w - 0.01) / t)
      if (xl < 0 || xl + K.w > this.w.worldW || this.w.hazard(cx) || this.w.hazard(xl) || this.w.hazard(xl + K.w)) return false
      for (let c = c0; c <= c1; c++) {
        if (!(this.w.cellSolid(c, r) || this.w.oneway(c, r))) return false // os dois pés apoiados (longe da borda)
        for (let k = 1; k <= 2; k++) if (this.w.cellSolid(c, r - k)) return false
      }
      const body = { x: xl, y: r * t - K.h, w: K.w, h: K.h }
      return !this.w.solids.some(s => body.x < s.x + s.w && body.x + body.w > s.x && body.y < s.y + s.h && body.y + body.h > s.y)
    }
    let best: { x: number; y: number; d: number } | null = null
    for (let i = 0; i <= range * 2; i++) {
      const cx = x + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (t / 2)
      for (let r = 1; r < rows; r++) if (ok(cx, r)) {
        const d = Math.abs(cx - x) + Math.abs(r * t - feet) * 1.5
        if (!best || d < best.d) best = { x: cx - K.w / 2, y: r * t - K.h, d }
      }
    }
    return best && { x: best.x, y: best.y }
  }

  /**
   * Um passo de 60 Hz. Ajusta K.vx/K.vy (a física é aplicada aqui mesmo, com a colisão do mapa).
   * Retorna 'reposition' quando o motor deve recolocar o acompanhante (fora da câmera ou com fade).
   */
  step(K: CBody, P: CBody & { face: 1 | -1 }): 'ok' | 'reposition' {
    const pc = P.x + P.w / 2
    if (P.ground) this.heroSafe = { x: pc, feet: P.y + P.h }
    else if (Math.abs(P.vx) > 0.5) {
      // herói no ar: mira onde ele vai aterrissar (se for chão seguro); se ele estiver caindo num vão, mantém o último ponto seguro
      const land = this.simulate(P, P.vx, P.vy, 80)
      // previsão só "para frente/para cima": um pulo sobre a boca de uma galeria não vira alvo lá embaixo
      if (land && land.feet <= this.heroSafe.feet + 40) this.heroSafe = { x: land.x, feet: land.feet }
    }
    // lado em que o acompanhante fica (atrás do herói); histerese para não cruzar a cada virada rápida
    const hdir: 1 | -1 = Math.abs(P.vx) > 0.4 ? (P.vx > 0 ? 1 : -1) : P.face
    if (hdir !== this.side) { if (++this.sideT > (Math.abs(P.vx) > 2 ? 14 : 34)) { this.side = hdir; this.sideT = 0 } } else this.sideT = 0
    const gap = 40 + Math.min(22, Math.abs(P.vx) * 6) // distância confortável: nem colado, nem sumido
    // destino: atrás da última posição segura do herói, recuado até haver chão de verdade
    const tf = this.heroSafe.feet
    let tx = this.heroSafe.x - this.side * gap
    for (let i = 0; i < 8 && !this.supportAt(tx, tf); i++) tx += this.side * 6
    const kc = K.x + K.w / 2, kf = K.y + K.h, dx = tx - kc, adx = Math.abs(dx)
    if (this.cool > 0) this.cool--

    if (!K.ground) {
      // no ar: mantém exatamente o vx previsto pela simulação (o salto aterrissa onde foi planejado)
      if (!this.plan) this.plan = { vx: K.vx }
      K.vx = this.plan.vx
    } else {
      if (this.plan) { this.plan = null; this.cool = Math.max(this.cool, 6) }
      // velocidade = velocidade do herói (quando ele anda no mesmo sentido) + correção proporcional da distância:
      // em corrida contínua o acompanhante fica na folga desejada em vez de ir ficando para trás
      const ff = P.ground && Math.sign(P.vx) === Math.sign(dx) ? P.vx : 0
      const lim = adx > 140 ? C_PHYS.run : C_PHYS.walk + 0.6
      const want = adx <= (K.vx === 0 ? 14 : 5) && Math.abs(ff) < 0.5 ? 0 : Math.max(-lim, Math.min(lim, ff + dx * 0.07 + Math.sign(dx) * 0.4))
      K.vx += Math.max(-C_PHYS.acc, Math.min(C_PHYS.acc, want - K.vx)); if (want === 0 && Math.abs(K.vx) < 0.15) K.vx = 0
      // segurança de borda: antes de pisar no vazio, simula a queda; se for para dentro de um vão, planeja o salto
      // ainda em movimento e, sem salto seguro, para na borda
      let atEdge = false, planned = false
      if (K.vx !== 0) {
        const lead = kc + Math.sign(K.vx) * (K.w / 2 + Math.abs(K.vx) * 5)
        // faixa de pedestre com o verde para os carros: espera na calçada (só entra com o boneco verde e tempo de sobra)
        if (this.w.hazard(lead) && !this.w.hazard(kc)) {
          const next = kc + Math.sign(K.vx) * (K.w / 2 + Math.abs(K.vx) + 2)
          if (this.w.hazard(next) || Math.abs(K.vx) < 1) { K.vx = 0; this.waitT++ } else K.vx = Math.sign(K.vx) * 1
        } else if (!this.supportAt(lead, kf) && !this.dropOk(this.simulate(K, Math.sign(K.vx) * Math.max(1.5, Math.abs(K.vx)), 0), tf)) {
          atEdge = true
          if (Math.sign(K.vx) === Math.sign(dx)) planned = this.planJump(K, tx, tf, false)
          if (!planned) {
            // ainda dá para correr até a borda? só para quando o próximo passo já seria a queda
            const next = kc + Math.sign(K.vx) * (K.w / 2 + Math.abs(K.vx) + 1)
            if (!this.supportAt(next, kf)) { K.vx = 0; this.stats.edgeStops++; this.waitT++ }
          }
        }
      }
      const x0 = K.x
      // planejamento de salto (paredes/obstáculos, plataforma mais alta, ou parado numa borda)
      const higher = tf < kf - 20 && adx < 220
      if (!planned && this.cool === 0 && ((atEdge && K.vx === 0) || this.blockT > 5 || higher)) this.planJump(K, tx, tf, atEdge || this.blockT > 5)
      this.integrate(K)
      this.blockT = K.ground && Math.abs(want) > 0.8 && Math.abs(K.x - x0) < 0.3 && !atEdge ? this.blockT + 1 : 0
      return this.watchdog(K, tx, tf)
    }
    this.integrate(K)
    return this.watchdog(K, tx, tf)
  }

  /** descer de uma borda só se cair em chão seguro e não muito abaixo do herói (ex.: não entra na boca de uma galeria
   *  quando o herói segue pela superfície) */
  private dropOk(land: Land, tf: number) { return !!land && land.feet <= tf + 40 }
  private planJump(K: CBody, tx: number, tf: number, mustCross: boolean): boolean {
    const kc = K.x + K.w / 2, kf = K.y + K.h, cost = (x: number, f: number) => Math.abs(x - tx) + Math.abs(f - tf) * 1.5
    const base = cost(kc, kf), dirs = Math.abs(tx - kc) > 4 ? [Math.sign(tx - kc)] : [1, -1]
    let best: { vx: number; vy: number; c: number } | null = null
    for (const d of dirs) for (const s of [0, 1, 2, 2.8, 3.6, 4.4, 5.2]) for (const vy of [C_PHYS.jump, C_PHYS.hop]) {
      const land = this.simulate(K, d * s, vy)
      if (!land || (this.w.hazard(land.x) && !this.w.hazard(kc)) || (land.feet > tf + 40 && land.feet > kf)) continue
      const c = cost(land.x, land.feet) + s * 1.5 + (vy === C_PHYS.hop ? 0 : 3)
      if (!best || c < best.c) best = { vx: d * s, vy, c }
    }
    if (best && best.c < base - 14) {
      K.vx = best.vx; K.vy = best.vy; K.ground = false; this.plan = { vx: best.vx }; this.cool = 10; this.stats.jumps++; this.waitT = 0
      return true
    }
    // nenhum salto seguro agora: fica parado em segurança e reavalia daqui a pouco
    if (mustCross) { K.vx = 0; this.waitT++; this.stats.waits++ }
    this.cool = 12
    return false
  }

  private repCool = 0
  private watchdog(K: CBody, tx: number, tf: number): 'ok' | 'reposition' {
    if (this.repCool > 0) { this.repCool--; return 'ok' }
    const d = Math.abs(K.x + K.w / 2 - tx) + Math.abs(K.y + K.h - tf) * 0.5
    if (d > 150) { if (d < this.bestD - 8) { this.bestD = d; this.stuckT = 0 } else this.stuckT++ } else { this.bestD = d; this.stuckT = 0 }
    const v = this.w.view(), off = K.x + K.w < v.x0 - 8 || K.x > v.x1 + 8
    const rep = this.dead(K) || (off && (d > 300 || this.stuckT > 90)) || this.stuckT > 420
    if (rep) { this.repCool = 60; this.stats.reposition++ }
    return rep ? 'reposition' : 'ok'
  }

  /** ponto de reentrada: fora da câmera, do lado de trás do herói, numa superfície segura. null → usar ponto visível com fade */
  reentry(K: CRect, P: CBody): { x: number; y: number; hidden: boolean } {
    const v = this.w.view(), feet = this.heroSafe.feet, back = -this.side
    const offX = back < 0 ? v.x0 - 28 : v.x1 + 28
    if (offX > K.w && offX < this.w.worldW - K.w) {
      const s = this.safeSpot(offX, feet, K, 4)
      if (s && (s.x + K.w < v.x0 - 4 || s.x > v.x1 + 4)) return { ...s, hidden: true }
    }
    const s = this.safeSpot(this.heroSafe.x + back * 44, feet, K, 6) ?? { x: P.x, y: P.y + P.h - K.h }
    return { ...s, hidden: false }
  }
}
