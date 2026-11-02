import Phaser from 'phaser'
import type { LevelObject } from '../types'

/* v14 — Capangas do Ratão (GDD 2.2: "inimigos podem atacar diretamente o personagem"; chefões de região têm o
   "estilo ratão"). Andam de um lado para o outro dentro de uma faixa de patrulha, viram em paredes e bordas.
   - Pular na cabeça (caindo) derrota o capanga e dá um quique.
   - Encostar de lado tira 1 vida (mesmo dano/invencibilidade de um carro), a menos que o herói esteja transformado
     (power-up "Pedroca Ratão"), quando o capanga é derrotado no contato.
   - Não interagem com o acompanhante.
   v16 — Etapa 5, inimigos variados (GDD: "ladrões que arremessam objetos, bullies, animais"):
   - ladrao: para, mira e arremessa chinelos em arco quando o herói está à frente; o chinelo tira 1 vida.
   - bully (valentão): ao ver o herói no mesmo nível, avisa e dá uma investida rápida; depois fica tonto.
   - caranguejo (mangue): alterna pinças abaixadas (pode pisar) e erguidas (pisar machuca).
   - urubu: voa em ondas sobre a faixa de patrulha; pisar derruba, encostar machuca.
   - chefe (capanga-chefe da região): 3 pisões; anda, arremessa e investe; fica tonto depois da investida; derrotado,
     abre o portão ligado a ele (gate.requires = id do chefe). Não volta quando o herói renasce.
   Arte provisória: provisorio/capanga*, ladrao*, chinelo, bully*, caranguejo*, urubu* (docs/arte-pendente.md). */

export type FoeKind = 'capanga' | 'ladrao' | 'bully' | 'caranguejo' | 'urubu' | 'chefe'
export type FoeObject = LevelObject & { range?: number; speed?: number; kind?: FoeKind; name?: string; tint?: number }
type Body = { x: number; y: number; w: number; h: number; vy: number }
type State = 'walk' | 'aim' | 'warn' | 'charge' | 'dizzy' | 'hit'
export type Foe = {
  o: FoeObject; kind: FoeKind; x: number; y: number; w: number; h: number; dir: 1 | -1; speed: number; min: number; max: number
  alive: boolean; spr: Phaser.GameObjects.Sprite; state: State; t: number; cool: number; hp: number; claws: boolean; awake: boolean; y0: number; run: number
}
type Shot = { x: number; y: number; vx: number; vy: number; life: number; spr: Phaser.GameObjects.Image }
export type FoeHit = { foe: Foe; kind: 'stomp' | 'hurt' | 'smash' | 'chefe-hit' | 'chefe-down' | 'shot' | 'wake'; x?: number }

const T = 32
const SIZE: Record<FoeKind, [number, number]> = { capanga: [20, 22], ladrao: [20, 24], bully: [24, 24], caranguejo: [26, 16], urubu: [24, 14], chefe: [34, 40] }
const WALK: Record<FoeKind, string> = { capanga: 'capanga', ladrao: 'ladrao', bully: 'bully', caranguejo: 'caranguejo', urubu: 'urubu', chefe: 'capanga' }
const DEAD: Record<FoeKind, string> = { capanga: 'capanga_x', ladrao: 'ladrao_x', bully: 'bully_x', caranguejo: 'caranguejo_x', urubu: 'urubu_x', chefe: 'capanga_x' }
const CHEFE_S = 1.8, GRAV = 0.25
export class Foes {
  readonly list: Foe[] = []
  private shots: Shot[] = []
  constructor(private s: Phaser.Scene, objs: LevelObject[], private solid: (c: number, r: number) => boolean, private depth: number) {
    const anim = (key: string, frames: string[], rate: number) => { if (!s.anims.exists(key)) s.anims.create({ key, frames: frames.map(k => ({ key: k })), frameRate: rate, repeat: -1 }) }
    anim('capanga', [1, 2, 3, 4].map(i => 'capanga' + i), 8); anim('ladrao', [1, 2, 3, 4].map(i => 'ladrao' + i), 7)
    anim('bully', [1, 2, 3, 4].map(i => 'bully' + i), 7); anim('caranguejo', ['caranguejo1', 'caranguejo2'], 6)
    anim('caranguejo_u', ['caranguejo_u1', 'caranguejo_u2'], 6); anim('urubu', ['urubu1', 'urubu2'], 5)
    for (const o of objs) if (o.type === 'enemy') {
      const f = o as FoeObject, kind = f.kind ?? 'capanga', [W, H] = SIZE[kind], cx = o.x * T + T / 2, feet = (o.y + 1) * T
      const range = (f.range ?? 4) * T, y = kind === 'urubu' ? feet - 3 * T - H : feet - H
      const spr = s.add.sprite(cx, feet, WALK[kind] + '1').setOrigin(0.5, 1).setDepth(depth).play({ key: WALK[kind], startFrame: Math.floor(Math.random() * 2) })
      if (kind === 'chefe') spr.setScale(CHEFE_S).setTint(f.tint ?? 0xffb0b0)
      this.list.push({ o: f, kind, x: cx - W / 2, y, w: W, h: H, dir: Math.random() < 0.5 ? 1 : -1, speed: f.speed ?? (kind === 'caranguejo' ? 0.9 : kind === 'urubu' ? 1.1 : kind === 'chefe' ? 0.8 : 0.6),
        min: cx - range, max: cx + range, alive: true, spr, state: 'walk', t: Math.floor(Math.random() * 120), cool: 60, hp: kind === 'chefe' ? 3 : 1, claws: false, awake: false, y0: y, run: 0 })
    }
  }
  private ahead(f: Foe, nx: number) {
    const front = f.dir > 0 ? nx + f.w : nx, row = Math.floor((f.y + f.h - 2) / T), below = Math.floor((f.y + f.h + 2) / T)
    return { wall: this.solid(Math.floor(front / T), row), edge: !this.solid(Math.floor((front + f.dir * 2) / T), below) }
  }
  /** anda dentro da faixa; vira em parede, borda ou na ponta da faixa (só quando está indo para fora dela) */
  private patrol(f: Foe, speed: number, free = false) {           // free: investida, ignora a faixa (para só em parede/borda)
    const nx = f.x + f.dir * speed, { wall, edge } = f.kind === 'urubu' ? { wall: false, edge: false } : this.ahead(f, nx)
    const out = !free && ((f.dir < 0 && nx < f.min - f.w / 2) || (f.dir > 0 && nx + f.w > f.max + f.w / 2))
    if (wall || edge || out) { f.dir = (f.dir * -1) as 1 | -1; return false }
    f.x = nx; return true
  }
  private face(f: Foe, P: Body) { f.dir = P.x + P.w / 2 > f.x + f.w / 2 ? 1 : -1 }
  private throwAt(f: Foe, P: Body) {
    const hx = f.x + f.w / 2 + f.dir * 8, hy = f.y + 4, dx = P.x + P.w / 2 - hx, dy = P.y + P.h / 2 - hy
    const vx = Phaser.Math.Clamp(dx / 55, -3.6, 3.6) || f.dir * 2, t = Math.max(12, Math.abs(dx / vx))
    const vy = Phaser.Math.Clamp((dy - 0.5 * GRAV * t * t) / t, -7.5, -2)
    this.shots.push({ x: hx, y: hy, vx, vy, life: 150, spr: this.s.add.image(hx, hy, 'chinelo').setDepth(this.depth + 0.2) })
  }
  /** passo de 60 Hz. P: corpo do herói (com vy), prevFeet: base dos pés no quadro anterior */
  step(P: Body, prevFeet: number, powered: boolean, inv: boolean): FoeHit | null {
    let hit: FoeHit | null = null
    const pcx = P.x + P.w / 2, pfeet = P.y + P.h
    for (const f of this.list) {
      if (!f.alive) continue
      f.t++; if (f.cool > 0) f.cool--
      const fcx = f.x + f.w / 2, dx = pcx - fcx, inFront = Math.sign(dx) === f.dir, level = Math.abs(pfeet - (f.y + f.h)) < 28
      switch (f.kind) {
        case 'capanga': this.patrol(f, f.speed); break
        case 'urubu':
          if (f.state === 'charge') {                                                    // rasante: desce até a altura do herói e volta
            const k = Math.sin((++f.run / 80) * Math.PI), low = (f.o.y + 1) * T - f.h - 6
            this.patrol(f, 2, true); f.y = f.y0 + (low - f.y0) * k
            if (f.run >= 80) { f.state = 'walk'; f.cool = 160; f.y = f.y0 }
          } else if (f.cool === 0 && inFront && Math.abs(dx) < 5 * T && Math.abs(dx) > 2 * T) { f.state = 'charge'; f.run = 0 }
          else { this.patrol(f, f.speed); f.y = f.y0 + Math.sin(f.t / 28) * 14 }
          break
        case 'caranguejo': {
          const up = f.t % 200 >= 120                                                   // 2 s abaixadas, 1,3 s erguidas
          if (up !== f.claws) { f.claws = up; f.spr.play(up ? 'caranguejo_u' : 'caranguejo') }
          this.patrol(f, up ? f.speed * 0.4 : f.speed); break
        }
        case 'ladrao':
          if (f.state === 'aim') { if (--f.run <= 0) { this.throwAt(f, P); f.state = 'walk'; f.cool = 140; f.spr.play('ladrao') } }
          else if (f.cool === 0 && Math.abs(dx) < 7 * T && Math.abs(dx) > T && pfeet > f.y - 3 * T && pfeet < f.y + f.h + 2 * T) {
            this.face(f, P); f.state = 'aim'; f.run = 32; f.spr.stop(); f.spr.setTexture('ladrao_t')
          } else this.patrol(f, f.speed)
          break
        case 'bully': case 'chefe': {
          const boss = f.kind === 'chefe', walkKey = boss ? 'capanga' : 'bully'
          if (boss && !f.awake) { if (Math.abs(dx) < 9 * T) { f.awake = true; hit = hit ?? { foe: f, kind: 'wake' } } else break }
          if (f.state === 'hit') { if (--f.run <= 0) { f.state = 'walk'; f.spr.setAlpha(1).play(walkKey); f.cool = 40 } else f.spr.setAlpha(f.run % 8 < 4 ? 0.4 : 1); break }
          if (f.state === 'warn') {
            f.spr.x += (f.run % 4 < 2 ? 1 : -1)
            if (--f.run <= 0) { f.state = 'charge'; f.run = 0; if (!boss) f.spr.setTexture('bully_c') }
            break
          }
          if (f.state === 'charge') {
            const sp = boss ? 3.6 + (3 - f.hp) * 0.5 : 3.4, moved = this.patrol(f, sp, true)
            if (!moved || ++f.run > (boss ? 70 : 60)) { f.state = 'dizzy'; f.run = boss ? 90 : 70; f.spr.stop(); if (boss) f.spr.setAngle(f.dir * 8); else f.spr.setTexture('bully_z') }
            break
          }
          if (f.state === 'dizzy') { if (--f.run <= 0) { f.state = 'walk'; f.cool = boss ? 70 : 60; f.spr.setAngle(0).play(walkKey) } break }
          // andando: o chefe vai na direção do herói e arremessa; o valentão patrulha até ver o herói no mesmo nível
          if (boss) {
            this.face(f, P); this.patrol(f, f.speed)
            if (f.cool === 0 && f.t % 2 === 0) {
              if (Math.abs(dx) < 6 * T && level) { f.state = 'warn'; f.run = 30; f.spr.stop() }
              else { this.throwAt(f, P); f.cool = 80 }
            }
          } else if (f.cool === 0 && inFront && level && Math.abs(dx) < 6 * T) { f.state = 'warn'; f.run = 24; f.spr.stop() }
          else this.patrol(f, f.speed)
          break
        }
      }
      if (f.state !== 'warn') f.spr.setPosition(Math.round(f.x + f.w / 2), Math.round(f.y + f.h))
      f.spr.setFlipX(f.dir < 0)
      if (hit && hit.kind !== 'wake') continue
      const over = P.x < f.x + f.w && P.x + P.w > f.x && P.y < f.y + f.h && P.y + P.h > f.y
      if (!over || f.state === 'hit') continue
      const stomp = P.vy > 0.5 && prevFeet <= f.y + 8
      if (f.kind === 'chefe') {
        if (stomp || powered) { f.hp--; hit = { foe: f, kind: f.hp <= 0 ? 'chefe-down' : 'chefe-hit' } }
        else if (!inv) hit = { foe: f, kind: 'hurt' }
        continue
      }
      if (stomp && !(f.kind === 'caranguejo' && f.claws && !powered)) hit = { foe: f, kind: 'stomp' }  // caiu na cabeça
      else if (powered) hit = { foe: f, kind: 'smash' }                                               // transformado: derruba no contato
      else if (!inv) hit = { foe: f, kind: 'hurt' }
    }
    // chinelos em voo
    for (const sh of this.shots) {
      sh.vy += GRAV; sh.x += sh.vx; sh.y += sh.vy; sh.life--; sh.spr.setPosition(Math.round(sh.x), Math.round(sh.y)).setAngle(sh.spr.angle + sh.vx * 6)
      if (this.solid(Math.floor(sh.x / T), Math.floor(sh.y / T))) sh.life = 0
      if (!hit && !inv && sh.life > 0 && sh.x > P.x - 3 && sh.x < P.x + P.w + 3 && sh.y > P.y - 2 && sh.y < P.y + P.h) { sh.life = 0; hit = { foe: this.list[0], kind: 'shot', x: sh.x } }
      if (sh.life <= 0) sh.spr.destroy()
    }
    this.shots = this.shots.filter(s => s.life > 0)
    if (hit) {
      const f = hit.foe
      if (hit.kind === 'stomp' || hit.kind === 'smash') this.defeat(f, hit.kind === 'smash' ? (pcx < f.x + f.w / 2 ? 1 : -1) : 0)
      else if (hit.kind === 'chefe-hit') { f.state = 'hit'; f.run = 60; f.spr.setAngle(0).stop(); f.speed *= 1.15; this.clearShots() }
      else if (hit.kind === 'chefe-down') { this.defeat(f, 0); this.clearShots() }
    }
    return hit
  }
  private clearShots() { for (const sh of this.shots) sh.spr.destroy(); this.shots = [] }
  private defeat(f: Foe, fling: number) {
    f.alive = false; f.spr.stop(); f.spr.setAngle(0).setAlpha(1)
    if (fling === 0) {                                                                   // amassado
      f.spr.setTexture(DEAD[f.kind])
      if (f.kind === 'urubu') this.s.tweens.add({ targets: f.spr, y: (f.o.y + 1) * T, duration: 400, ease: 'Quad.easeIn' })
      this.s.tweens.add({ targets: f.spr, alpha: 0, delay: f.kind === 'chefe' ? 1200 : 500, duration: 300, onComplete: () => f.spr.setVisible(false) })
    } else {                                                                             // arremessado pelo power-up
      this.s.tweens.add({ targets: f.spr, x: f.spr.x + fling * 90, y: f.spr.y - 60, angle: fling * 360, alpha: 0, duration: 600, ease: 'Quad.easeOut', onComplete: () => f.spr.setVisible(false) })
    }
  }
  /** respawn do herói / recomeço: inimigos voltam (o capanga-chefe derrotado não volta; vivo, recupera a vida) */
  reset() {
    this.clearShots()
    for (const f of this.list) {
      if (f.kind === 'chefe' && !f.alive) continue
      const cx = f.o.x * T + T / 2; f.alive = true; f.x = cx - f.w / 2; f.y = f.y0; f.state = 'walk'; f.cool = 60; f.claws = false; f.awake = false
      if (f.kind === 'chefe') { f.hp = 3; f.speed = f.o.speed ?? 0.8 }
      this.s.tweens.killTweensOf(f.spr); f.spr.setVisible(true).setAlpha(1).setAngle(0).play(WALK[f.kind])
    }
  }
}
