// v12 — ARTE PROVISÓRIA gerada por código (pixel a pixel), no lugar das artes que ainda faltam.
// Tudo o que este script gera deve ser substituído por arte desenhada — ver docs/arte-pendente.md.
// Paleta amostrada de cenario/tiles-marcozero.png (rocha 494d4f/373c40/53595b, pedregulho b7ae94/dfd2af,
// tijolo 899396/7f868f) para as peças combinarem com o tileset original.
// Uso: node tools/gen-provisional-art.mjs  → public/assets/original/provisorio/*.png
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets', 'original', 'provisorio')
fs.mkdirSync(OUT, { recursive: true })

/* ---------- PNG RGBA mínimo ---------- */
const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc = b => { let x = 0xffffffff; for (const v of b) x = CRC[(x ^ v) & 255] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0 }
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]) }
class Img {
  constructor(w, h) { this.w = w; this.h = h; this.d = Buffer.alloc(w * h * 4) }
  px(x, y, hex, a = 255) { if (x < 0 || y < 0 || x >= this.w || y >= this.h || !hex) return; const o = (y * this.w + x) * 4, v = parseInt(hex, 16); this.d[o] = v >> 16; this.d[o + 1] = (v >> 8) & 255; this.d[o + 2] = v & 255; this.d[o + 3] = a }
  rect(x, y, w, h, hex) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, hex) }
  get(x, y) { const o = (y * this.w + x) * 4; return this.d[o + 3] ? ((this.d[o] << 16) | (this.d[o + 1] << 8) | this.d[o + 2]).toString(16).padStart(6, '0') : null }
  save(name) {
    const raw = Buffer.alloc((this.w * 4 + 1) * this.h)
    for (let y = 0; y < this.h; y++) this.d.copy(raw, y * (this.w * 4 + 1) + 1, y * this.w * 4, (y + 1) * this.w * 4)
    const ih = Buffer.alloc(13); ih.writeUInt32BE(this.w, 0); ih.writeUInt32BE(this.h, 4); ih[8] = 8; ih[9] = 6
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]))
    console.log('  ' + name + '.png', this.w + '×' + this.h)
  }
}
let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280

/* ---------- 1. degraus de pedra lapidada (topo de cada degrau das escadarias), 3 variantes de borda ---------- */
function degrau(kind) {
  const g = new Img(32, 32)
  // corpo de rocha (continua a rocha do tileset por baixo do degrau)
  g.rect(0, 12, 32, 20, '494d4f')
  for (let x = 0; x < 32; x++) { const b = 24 + Math.round(Math.sin(x / 4) * 2); for (let y = b; y < 32; y++) g.px(x, y, '373c40') }
  for (let i = 0; i < 14; i++) g.px(Math.floor(rnd() * 32), 13 + Math.floor(rnd() * 18), '53595b')
  // laje: contorno, tampo claro, espelho (face) com junta e desgaste
  g.rect(0, 0, 32, 1, '000000')
  g.rect(0, 1, 32, 3, 'cfc6ad'); for (let x = 0; x < 32; x += 2) g.px(x + (x % 4 ? 1 : 0), 2, 'dfd2af')
  g.rect(0, 4, 32, 1, 'dfd2af')
  g.rect(0, 5, 32, 6, 'a39c88'); g.rect(0, 9, 32, 2, '8a8473')
  for (const jx of [15, 16]) g.rect(jx, 4, 1, 7, jx === 15 ? '5d574b' : 'b7ae94')
  for (const [x, y] of [[5, 6], [6, 7], [22, 6], [26, 8], [27, 8], [10, 9]]) g.px(x, y, '6f6a5c')
  g.rect(0, 11, 32, 1, '000000')
  if (kind === 'e' || kind === 'd') {                     // ponta do degrau: quina arredondada com contorno
    const e = kind === 'e', x0 = e ? 0 : 31, s = e ? 1 : -1
    for (let y = 0; y < 32; y++) g.px(x0, y, '000000')
    g.px(x0, 0, null); g.d[(0 * 32 + x0) * 4 + 3] = 0
    for (let y = 1; y < 11; y++) g.px(x0 + s, y, y < 4 ? 'efe6cc' : 'b7ae94')
    for (let y = 12; y < 32; y++) g.px(x0 + s, y, '5c6265')
  }
  return g
}
degrau('m').save('degrau'); degrau('e').save('degrau_e'); degrau('d').save('degrau_d')

/* ---------- 2. placa de descida (estilo placa de metrô: azul, pictograma de escada + seta) 32×48 ---------- */
{
  const g = new Img(32, 48)
  g.rect(15, 24, 2, 22, '3a3542'); g.rect(15, 24, 1, 22, '5a5563'); g.rect(12, 45, 8, 3, '2b2433'); g.rect(12, 45, 8, 1, '4a4052')
  g.rect(2, 1, 28, 24, '0b1a33'); g.rect(3, 2, 26, 22, '2f62b3'); g.rect(4, 3, 24, 1, '5f8fd8'); g.rect(4, 3, 1, 20, '5f8fd8')
  g.rect(3, 23, 26, 1, '1d3f7a')
  const W = 'f4f1e6'
  // seta para baixo à esquerda
  g.rect(8, 6, 3, 9, W); for (let i = 0; i < 4; i++) g.rect(6 + i, 15 + i, 7 - i * 2, 1, W)
  // escada descendo para a direita
  const steps = [[14, 7], [17, 10], [20, 13], [23, 16]]
  for (const [x, y] of steps) { g.rect(x, y, 4, 2, W); g.rect(x, y, 1, 5, W) }
  g.rect(14, 19, 13, 2, W)
  g.rect(14, 7, 1, 13, W)
  g.save('placa_descida')
}

/* ---------- 2b. placa temporária "em construção" (v14) 32×40: cavalete amarelo e preto com ícone de pá ---------- */
{
  const g = new Img(32, 40)
  g.rect(6, 22, 2, 18, '3a3542'); g.rect(24, 22, 2, 18, '3a3542')                                              // pés do cavalete
  g.rect(2, 4, 28, 19, '1b1325'); g.rect(3, 5, 26, 17, 'ffcc33')                                              // placa
  for (let x = -6; x < 30; x += 6) for (let j = 0; j < 4; j++) for (let k = 0; k < 3; k++) g.px(3 + x + j + k, 5 + j, x % 12 === 0 ? '1b1325' : null)
  g.rect(3, 5, 26, 1, 'ffe27a')
  // pá (cabo + lâmina) e montinho de terra
  g.rect(14, 10, 2, 7, '6b4423'); g.rect(12, 16, 6, 4, '8a8598'); g.rect(12, 16, 6, 1, 'c9d1cc')
  g.rect(6, 18, 6, 2, '7a5232'); g.rect(7, 17, 4, 1, '7a5232')
  g.rect(20, 11, 6, 6, 'ff6b2d'); g.rect(22, 9, 2, 2, 'ff6b2d'); g.rect(20, 13, 6, 1, 'f4f1e6')               // cone
  g.save('placa_obras')
}

/* ---------- 3. tocha de parede (3 quadros) 16×32 ---------- */
for (let f = 0; f < 3; f++) {
  const g = new Img(16, 32)
  g.rect(6, 20, 4, 8, '2b2433'); g.rect(6, 20, 4, 1, '4a4052'); g.px(7, 22, '8a8598'); g.px(7, 26, '8a8598')       // placa de ferro
  g.rect(7, 18, 2, 3, '3a3542')                                                                                     // braço
  g.rect(7, 10, 2, 9, '6b4423'); g.rect(7, 10, 1, 9, '8a5a2e')                                                     // cabo
  g.rect(5, 8, 6, 3, '4a3a2e'); g.rect(5, 8, 6, 1, '6b5640')                                                       // copo
  const flames = [
    ['......X.', '.....XX.', '....XYYX', '...XYZYX', '...XYZZYX', '..XYZZZYX', '..XYYZYYX', '...XYYYX'],
    ['.....X..', '....XX..', '....XYX.', '...XYZYX', '..XYZZYX.', '..XYZZZYX', '...XYZYX.', '...XYYYX.'],
    ['.......X', '......XX', '.....XYX', '....XYZX', '...XYZZYX', '..XYZZZYX', '..XYYZYX.', '...XYYX..'],
  ][f]
  const C = { X: 'ff6b2d', Y: 'ffb800', Z: 'fff3b0' }
  flames.forEach((row, y) => [...row].forEach((ch, x) => { if (C[ch]) g.px(x + 3, y, C[ch]) }))
  g.px(4 + f, 0, 'c23b22')
  g.save('tocha' + (f + 1))
}

/* ---------- 4. cano sob a laje 32×16 ---------- */
{
  const g = new Img(32, 16)
  g.rect(0, 3, 32, 1, '1e2023'); g.rect(0, 4, 32, 8, '6f7a74'); g.rect(0, 5, 32, 2, '9aa7a0'); g.rect(0, 10, 32, 1, '4f5853'); g.rect(0, 12, 32, 1, '1e2023')
  for (const x of [0, 29]) { g.rect(x, 2, 3, 12, '545e59'); g.rect(x, 2, 3, 1, '1e2023'); g.rect(x, 13, 3, 1, '1e2023'); g.px(x + 1, 4, 'c9d1cc'); g.px(x + 1, 11, 'c9d1cc') }
  for (const [x, y] of [[9, 8], [10, 9], [20, 7], [21, 8], [21, 9]]) g.px(x, y, '8a5a3a')
  g.px(10, 13, '8a5a3a'); g.px(10, 14, '6fb0c8')                                                                 // gota
  // suportes presos à laje
  for (const x of [14]) { g.rect(x, 0, 4, 3, '3a3542'); g.rect(x, 0, 4, 1, '1e2023') }
  g.save('cano')
}

/* ---------- 5. raízes penduradas da laje 32×24 ---------- */
{
  const g = new Img(32, 24)
  const root = (x, len, dir) => {
    let cx = x
    for (let y = 0; y < len; y++) {
      const w = y < len * 0.35 ? 2 : 1
      for (let k = 0; k < w; k++) g.px(cx + k, y, y < 2 ? '3f2816' : '5a3a22')
      if (w === 2) g.px(cx, y, '7a5232')
      if (y % 4 === 3) cx += dir
      if (y === Math.floor(len * 0.5)) for (let b = 1; b < 5; b++) g.px(cx - dir * b, y + b, '5a3a22')
    }
    g.px(cx, len, '3f2816')
  }
  root(5, 20, 1); root(13, 13, -1); root(19, 23, 1); root(26, 10, -1)
  g.save('raizes')
}

/* ---------- 6. parede de galeria (3 variantes) 32×32 ---------- */
for (let v = 0; v < 3; v++) {
  const g = new Img(32, 32)
  g.rect(0, 0, 32, 32, '241f2d')
  const blocks = [[0, 0, 15, 15], [16, 0, 16, 15], [-8, 16, 15, 16], [8, 16, 15, 16], [24, 16, 15, 16]]
  for (const [x, y, w, h] of blocks) {
    for (let j = 1; j < h; j++) for (let i = 1; i < w; i++) g.px(x + i, y + j, '3a3445')
    for (let i = 1; i < w; i++) g.px(x + i, y + 1, '4a4357')
    for (let j = 1; j < h; j++) g.px(x + 1, y + j, '433d50')
    for (let i = 1; i < w; i++) g.px(x + i, y + h - 1, '2e2938')
  }
  for (let i = 0; i < 10; i++) g.px(Math.floor(rnd() * 32), Math.floor(rnd() * 32), '332d3e')
  if (v === 1) for (const [x, y] of [[3, 14], [4, 14], [4, 13], [5, 14], [20, 30], [21, 30], [21, 29], [27, 14], [28, 14]]) g.px(x, y, '3f5a3a')   // musgo
  if (v === 2) for (const [x, y] of [[21, 4], [22, 5], [22, 6], [23, 7], [24, 7], [24, 8], [10, 20], [11, 21], [11, 22]]) g.px(x, y, '1a1622')       // rachaduras
  g.save('galeria' + (v + 1))
}
/* ---------- v14 — capanga do Ratão (inimigo): rato de boné vermelho e óculos escuros, 32×32, 4 quadros + amassado ---------- */
function capanga(f, squash = false) {
  const g = new Img(32, 32), O = '1e1a24', B = '8a8598', L = 'b3aec2', D = '5f5a6e', P = 'e89aa8'
  if (squash) {                                                              // derrotado: achatado, olhos em X
    g.rect(5, 25, 22, 7, O); g.rect(6, 26, 20, 5, B); g.rect(6, 26, 20, 1, L); g.rect(8, 23, 16, 3, 'c23b22')
    for (const [x, y] of [[11, 28], [13, 28], [12, 29], [11, 30], [13, 30], [19, 28], [21, 28], [20, 29], [19, 30], [21, 30]]) g.px(x, y, O)
    return g
  }
  const bob = f % 2, step = [0, 1, 0, -1][f]
  // cauda
  for (let i = 0; i < 7; i++) g.px(3 + i, 20 - Math.round(Math.sin((i + f) / 2) * 2) + bob, P)
  // corpo (moletom escuro) e cabeça
  g.rect(9, 15 + bob, 14, 11, O); g.rect(10, 16 + bob, 12, 9, '3a3542'); g.rect(10, 16 + bob, 12, 1, '4a4052')
  g.rect(13, 5 + bob, 13, 11, O); g.rect(14, 6 + bob, 11, 9, B); g.rect(14, 6 + bob, 11, 1, L)
  g.rect(24, 10 + bob, 4, 4, O); g.rect(25, 11 + bob, 2, 2, P)               // focinho
  g.rect(14, 3 + bob, 4, 4, O); g.rect(15, 4 + bob, 2, 2, P)                 // orelha
  g.rect(12, 4 + bob, 15, 3, '1b1325'); g.rect(13, 4 + bob, 13, 2, 'c23b22'); g.rect(22, 6 + bob, 7, 1, 'c23b22') // boné
  g.rect(18, 9 + bob, 7, 2, '000000'); g.px(19, 9 + bob, '6f7a88')           // óculos escuros
  g.rect(18, 13 + bob, 5, 1, D)                                               // boca
  // pernas (passo)
  g.rect(11 + step, 26, 3, 5, O); g.rect(18 - step, 26, 3, 5, O); g.rect(10 + step, 30, 5, 2, '000000'); g.rect(17 - step, 30, 5, 2, '000000')
  g.rect(22, 18 + bob, 3, 4, B)                                               // mão
  return g
}
for (let f = 0; f < 4; f++) capanga(f).save('capanga' + (f + 1))
capanga(0, true).save('capanga_x')

/* ---------- v14 — folheto de cordel (coletável secreto) 20×24, capa em xilogravura ---------- */
{
  const g = new Img(20, 24)
  g.rect(1, 1, 18, 22, '1b1325'); g.rect(2, 2, 16, 20, 'efe2bf'); g.rect(2, 2, 16, 2, 'c23b22')
  // xilogravura: sol, sertanejo de chapéu, chão
  g.rect(4, 6, 12, 11, '2b2433'); g.rect(12, 7, 3, 3, 'efe2bf'); g.rect(6, 9, 4, 2, 'efe2bf'); g.rect(7, 11, 2, 4, 'efe2bf'); g.rect(4, 15, 12, 2, 'efe2bf')
  g.rect(4, 18, 12, 1, '6f6a5c'); g.rect(4, 20, 8, 1, '6f6a5c')
  g.rect(18, 3, 1, 19, 'b7ae94')
  g.save('cordel')
}

/* ---------- v14 — relicário de artefato do museu 24×24 (o que o Ratão roubou) ---------- */
{
  const g = new Img(24, 24)
  g.rect(3, 10, 18, 12, '1b1325'); g.rect(4, 11, 16, 10, 'b8862f'); g.rect(4, 11, 16, 2, 'e6b84f'); g.rect(4, 19, 16, 2, '7a5a1f')
  g.rect(10, 14, 4, 4, '1b1325'); g.rect(11, 15, 2, 2, 'ffe27a')                    // fecho
  g.rect(5, 4, 14, 7, '1b1325'); g.rect(6, 5, 12, 5, 'e6b84f'); g.rect(6, 5, 12, 1, 'fff3b0') // tampa
  for (const [x, y] of [[2, 3], [21, 4], [1, 12], [22, 15], [12, 1]]) g.px(x, y, 'fff3b0')       // brilho
  g.save('artefato')
}
/* ---------- v16 — Etapa 5: inimigos variados (GDD 2.2: ladrões que arremessam objetos, bullies, animais) ---------- */
const BB = {}                                                                   // caixas úteis para src/game/assets.ts
const keep = (g, name) => { let x0 = g.w, y0 = g.h, x1 = 0, y1 = 0; for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.d[(y * g.w + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1) } BB[name] = ['provisorio/' + name + '.png', g.w, g.h, x0, y0, x1, y1]; g.save(name) }
const X_EYES = (g, pts) => { for (const [x, y] of pts) for (const [a, b] of [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]]) g.px(x + a, y + b, '1e1a24') }

/* ladrão do Ratão: rato de camisa listrada, máscara preta e saco de chinelos; anda (4), arremessa (t), derrotado (x) */
function ladrao(f, pose = 'walk') {
  const g = new Img(32, 32), O = '1e1a24', B = '9a8f84', L = 'c4b8aa', P = 'e89aa8'
  if (pose === 'x') { g.rect(5, 25, 22, 7, O); g.rect(6, 26, 20, 5, 'efe2bf'); for (let x = 6; x < 26; x += 4) g.rect(x, 26, 2, 5, '1b1325'); X_EYES(g, [[10, 27], [19, 27]]); return g }
  const bob = pose === 'walk' ? f % 2 : 0, step = pose === 'walk' ? [0, 1, 0, -1][f] : 0
  g.rect(2, 12 + bob, 9, 10, O); g.rect(3, 13 + bob, 7, 8, '7a5a3a'); g.rect(4, 13 + bob, 5, 1, '9a7a52')        // saco nas costas
  g.rect(9, 15 + bob, 14, 11, O); for (let y = 16; y < 25; y++) g.rect(10, y + bob, 12, 1, y % 2 ? 'efe2bf' : '1b1325')  // camisa listrada
  g.rect(13, 5 + bob, 13, 11, O); g.rect(14, 6 + bob, 11, 9, B); g.rect(14, 6 + bob, 11, 1, L)
  g.rect(24, 10 + bob, 4, 4, O); g.rect(25, 11 + bob, 2, 2, P); g.rect(14, 3 + bob, 4, 4, O); g.rect(15, 4 + bob, 2, 2, P)
  g.rect(14, 8 + bob, 12, 3, '000000'); g.px(20, 9 + bob, 'ffffff'); g.px(23, 9 + bob, 'ffffff')                 // máscara de ladrão
  g.rect(18, 13 + bob, 5, 1, '5f5a6e')
  g.rect(11 + step, 26, 3, 5, O); g.rect(18 - step, 26, 3, 5, O); g.rect(10 + step, 30, 5, 2, '000000'); g.rect(17 - step, 30, 5, 2, '000000')
  if (pose === 't') { g.rect(22, 9, 3, 8, B); g.rect(21, 4, 6, 4, 'e0a21f'); g.rect(22, 5, 4, 2, 'f4c84a') }      // braço erguido com chinelo
  else g.rect(22, 18 + bob, 3, 4, B)
  return g
}
for (let f = 0; f < 4; f++) keep(ladrao(f), 'ladrao' + (f + 1))
keep(ladrao(0, 't'), 'ladrao_t'); keep(ladrao(0, 'x'), 'ladrao_x')
{ const g = new Img(14, 8); g.rect(0, 2, 14, 5, '1b1325'); g.rect(1, 3, 12, 3, 'e0a21f'); g.rect(1, 3, 12, 1, 'f4c84a'); g.rect(6, 0, 2, 4, '2b6fb3'); g.rect(4, 1, 6, 1, '2b6fb3'); keep(g, 'chinelo') }

/* valentão (bully) do Ratão: rato largo de regata roxa; anda (4), investida (c), tonto (z), derrotado (x) */
function bully(f, pose = 'walk') {
  const g = new Img(32, 32), O = '1e1a24', B = '7f7a8c', L = 'a7a2b6', P = 'e89aa8', S = '6b3fa0'
  if (pose === 'x') { g.rect(3, 24, 26, 8, O); g.rect(4, 25, 24, 6, S); X_EYES(g, [[10, 26], [19, 26]]); return g }
  const bob = pose === 'walk' ? f % 2 : 0, step = pose === 'walk' ? [0, 1, 0, -1][f] : pose === 'c' ? 2 : 0, lean = pose === 'c' ? 2 : 0
  g.rect(6 + lean, 13 + bob, 20, 13, O); g.rect(7 + lean, 14 + bob, 18, 11, S); g.rect(7 + lean, 14 + bob, 18, 1, '8a5ac4')  // regata
  g.rect(2 + lean, 15 + bob, 5, 7, O); g.rect(3 + lean, 16 + bob, 3, 5, B); g.rect(24 + lean, 15 + bob, 6, 7, O); g.rect(25 + lean, 16 + bob, 4, 5, B) // braços fortes
  g.rect(12 + lean, 3 + bob, 14, 12, O); g.rect(13 + lean, 4 + bob, 12, 10, B); g.rect(13 + lean, 4 + bob, 12, 1, L)
  g.rect(24 + lean, 8 + bob, 5, 5, O); g.rect(25 + lean, 9 + bob, 3, 3, P); g.rect(13 + lean, 1 + bob, 4, 4, O); g.rect(14 + lean, 2 + bob, 2, 2, P)
  if (pose === 'z') { g.rect(17, 6, 3, 3, 'ffffff'); g.px(18, 7, O); g.rect(21, 6, 3, 3, 'ffffff'); g.px(22, 8, O); for (const [x, y] of [[11, 0], [20, 0], [27, 1]]) g.rect(x, y, 2, 2, 'ffe27a') }  // tonto: olhos girando e estrelinhas
  else { g.rect(17 + lean, 7 + bob, 8, 1, O); g.rect(18 + lean, 8 + bob, 2, 2, O); g.rect(22 + lean, 8 + bob, 2, 2, O) }  // sobrancelha brava
  g.rect(18 + lean, 12 + bob, 5, 1, '5f5a6e')
  g.rect(9 + step, 26, 4, 5, O); g.rect(19 - step, 26, 4, 5, O); g.rect(8 + step, 30, 6, 2, '000000'); g.rect(18 - step, 30, 6, 2, '000000')
  return g
}
for (let f = 0; f < 4; f++) keep(bully(f), 'bully' + (f + 1))
keep(bully(0, 'c'), 'bully_c'); keep(bully(0, 'z'), 'bully_z'); keep(bully(0, 'x'), 'bully_x')

/* caranguejo-uçá do mangue: anda de lado; pinças abaixadas (pode pisar) ou erguidas (perigo); 32×24 */
function caranguejo(f, up) {
  const g = new Img(32, 24), O = '1e1a24', C = 'c4572e', L = 'e07a45', D = '8f3a1c'
  if (f === 'x') { g.rect(5, 17, 22, 7, O); g.rect(6, 18, 20, 5, C); X_EYES(g, [[11, 18], [18, 18]]); return g }
  const k = f % 2
  for (let i = 0; i < 3; i++) { g.rect(4 + i * 3 - k, 18 + i % 2, 2, 5, O); g.rect(24 - i * 3 + k, 18 + (i + 1) % 2, 2, 5, O) }  // patas
  g.rect(6, 10, 20, 10, O); g.rect(7, 11, 18, 8, C); g.rect(7, 11, 18, 2, L); g.rect(9, 17, 14, 2, D)                         // casco
  g.rect(11, 5, 3, 6, O); g.rect(18, 5, 3, 6, O); g.rect(11, 4, 3, 3, 'ffffff'); g.rect(18, 4, 3, 3, 'ffffff'); g.px(12, 5, O); g.px(19, 5, O)   // olhos
  if (up) { for (const x of [0, 25]) { g.rect(x + 2, 4, 3, 8, O); g.rect(x, 0, 7, 5, O); g.rect(x + 1, 1, 5, 3, L); g.px(x + 3, 2, O) } }      // pinças erguidas
  else { for (const x of [0, 25]) { g.rect(x, 13, 7, 6, O); g.rect(x + 1, 14, 5, 4, L); g.px(x + 3, 15, O) } }
  return g
}
for (let f = 0; f < 2; f++) { keep(caranguejo(f, false), 'caranguejo' + (f + 1)); keep(caranguejo(f, true), 'caranguejo_u' + (f + 1)) }
keep(caranguejo('x'), 'caranguejo_x')

/* urubu: voa em ondas (2 quadros de asa) e derrotado; 32×24 */
function urubu(f) {
  const g = new Img(32, 24), O = '1e1a24', B = '2b2433', L = '4a4052', H = 'b8544a'
  if (f === 'x') { g.rect(6, 16, 20, 7, O); g.rect(7, 17, 18, 5, B); g.rect(22, 14, 6, 5, O); g.rect(23, 15, 4, 3, H); X_EYES(g, [[23, 15]]); return g }
  g.rect(8, 10, 16, 8, O); g.rect(9, 11, 14, 6, B); g.rect(9, 11, 14, 1, L)                                // corpo
  g.rect(22, 7, 7, 6, O); g.rect(23, 8, 5, 4, H); g.px(26, 9, O); g.rect(28, 10, 3, 2, 'd8c8a8')          // cabeça pelada e bico
  g.rect(3, 12, 6, 3, O); g.rect(4, 13, 4, 1, L)                                                            // cauda
  if (f === 0) { g.rect(8, 1, 14, 10, O); g.rect(9, 2, 12, 8, B); for (let x = 9; x < 21; x += 3) g.rect(x, 1, 2, 2, L) }   // asas para cima
  else { g.rect(7, 16, 16, 7, O); g.rect(8, 17, 14, 5, B); for (let x = 8; x < 22; x += 3) g.rect(x, 21, 2, 2, L) }       // asas para baixo
  g.rect(13, 18, 2, 3, 'd8c8a8'); g.rect(17, 18, 2, 3, 'd8c8a8')
  return g
}
keep(urubu(0), 'urubu1'); keep(urubu(1), 'urubu2'); keep(urubu('x'), 'urubu_x')

fs.writeFileSync(path.join(OUT, '..', '..', '..', '..', 'tools', 'provisorio-v16.json'), JSON.stringify(BB, null, 1))

console.log('arte provisória gerada em', OUT)
