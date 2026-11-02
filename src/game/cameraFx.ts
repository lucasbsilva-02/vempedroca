import Phaser from 'phaser'
/** Efeitos de câmera reutilizáveis: foco/zoom suave e tremor com decaimento.
 *  A câmera é recalculada TODO quadro a partir da posição-base (rolagem normal) + efeitos, então nada se acumula:
 *  quando o foco volta a 0 e o tremor termina, o resultado é exatamente a câmera normal. */
export class CameraFX {
  private f = 0; private zoom = 1; private fx = 0; private fy = 0; private cx = 0; private cy = 0
  private bx0 = 0; private by0 = 0; private bw = 1e9; private bh = 1e9
  /** limita o quadro visível ao mundo (evita mostrar o vazio fora do cenário quando há zoom) */
  setBounds(x: number, y: number, w: number, h: number) { this.bx0 = x; this.by0 = y; this.bw = w; this.bh = h }
  private amp = 0; private t0 = 0; private dur = 1; private tw?: Phaser.Tweens.Tween
  constructor(private s: Phaser.Scene) {}
  get reduced() { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches }
  get active() { return this.f > 0.001 }
  /** aproxima a câmera de (x,y) do mundo com o zoom indicado */
  focus(x: number, y: number, zoom: number, ms = 350) {
    if (this.f < 0.001) { this.cx = x; this.cy = y }
    this.fx = x; this.fy = y; this.zoom = this.reduced ? 1 + (zoom - 1) * 0.4 : zoom; this.ease(1, ms)
  }
  /** move só o alvo do foco (ex.: seguir o punho) sem reiniciar o zoom */
  pan(x: number, y: number) { this.fx = x; this.fy = y }
  setZoom(z: number) { this.zoom = this.reduced ? 1 + (z - 1) * 0.4 : z }
  release(ms = 450) { this.ease(0, ms) }
  private ease(to: number, ms: number) {
    this.tw?.stop(); this.tw = this.s.tweens.addCounter({ from: this.f, to, duration: ms, ease: 'Sine.easeInOut', onUpdate: t => { this.f = t.getValue() ?? this.f } })
  }
  /** tremor: não soma intensidades; um tremor mais forte substitui um mais fraco ainda em andamento */
  shake(amp: number, ms: number) {
    if (this.reduced) amp *= 0.3
    const now = this.s.time.now, left = this.amp * Math.max(0, 1 - (now - this.t0) / this.dur)
    if (amp >= left) { this.amp = amp; this.t0 = now; this.dur = ms }
  }
  apply(cam: Phaser.Cameras.Scene2D.Camera, baseX: number, baseY: number) {
    const w = cam.width, h = cam.height, f = this.f
    this.cx += (this.fx - this.cx) * 0.16; this.cy += (this.fy - this.cy) * 0.16
    const bx = baseX + w / 2, by = baseY + h / 2
    const z = f < 0.001 ? 1 : 1 + (this.zoom - 1) * f, hw = w / (2 * z), hh = h / (2 * z)
    const ccx = Phaser.Math.Clamp(bx + (this.cx - bx) * f, this.bx0 + hw, Math.max(this.bx0 + hw, this.bx0 + this.bw - hw))
    const ccy = Phaser.Math.Clamp(by + (this.cy - by) * f, this.by0 + hh, Math.max(this.by0 + hh, this.by0 + this.bh - hh))
    let sx = (f < 0.001 ? bx : ccx) - w / 2, sy = (f < 0.001 ? by : ccy) - h / 2
    const k = Math.max(0, 1 - (this.s.time.now - this.t0) / this.dur), a = this.amp * k * k
    if (a > 0.05) { sx += (Math.random() * 2 - 1) * a; sy += (Math.random() * 2 - 1) * a } else this.amp = 0
    cam.setZoom(z); cam.setScroll(Math.round(sx), Math.round(sy))
  }
}
