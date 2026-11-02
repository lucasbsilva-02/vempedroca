/* Personagens jogáveis. Cada um usa SOMENTE os quadros do próprio personagem (Renata == Rebeca nos arquivos originais). */
import { ASSETS } from './assets'
export type CharId = 'pedroca' | 'renata'
type Set = { key: string; n: number }
export type CharDef = { id: CharId; name: string; idle: Set; run: Set; jump: Set; jumpFrames: [number, number, number]; portrait: string }
const jf = (n: number): [number, number, number] => [Math.round(n * 0.3), Math.round(n * 0.45), Math.round(n * 0.7)]
export const CHARS: Record<CharId, CharDef> = {
  pedroca: { id: 'pedroca', name: 'Pedroca', idle: { key: 'idle', n: 7 }, run: { key: 'run', n: 12 }, jump: { key: 'jump', n: 13 }, jumpFrames: jf(13), portrait: 'personagens/pedrocaportrait.png' },
  renata: { id: 'renata', name: 'Renata', idle: { key: 'ren_idle', n: 16 }, run: { key: 'ren_run', n: 12 }, jump: { key: 'ren_jump', n: 11 }, jumpFrames: jf(11), portrait: 'personagens/ren_idle1.png' },
}
/** v14 — power-up do GDD (2.1): "transformações ativadas ao adquirir todas as moedas da fase". Pedroca Ratão usa a arte
 *  original completa (NEW-pedroca-RATAO idle/jumping + Pedroca-ratao-running); da Renata só existe o pulo (NEW-renata-RATA). */
export const POWER: Record<CharId, CharDef> = {
  pedroca: { ...CHARS.pedroca, idle: { key: 'ratao_idle', n: 7 }, run: { key: 'ratao_run', n: 12 }, jump: { key: 'ratao_jump', n: 13 }, jumpFrames: jf(13) },
  renata: { ...CHARS.renata, jump: { key: 'renrata_jump', n: 11 }, jumpFrames: jf(11) },
}
export const otherChar = (id: CharId): CharId => (id === 'pedroca' ? 'renata' : 'pedroca')
/** deslocamento horizontal que põe o centro OPACO do quadro no centro da hitbox (origem 0.5) */
export const centerOffset = (key: string) => { const a = ASSETS[key]; return Math.round(a[1] / 2 - (a[3] + a[5]) / 2) }
export const loadChar = (): CharId => { try { return localStorage.getItem('vp:char') === 'renata' ? 'renata' : 'pedroca' } catch { return 'pedroca' } }
export const saveChar = (c: CharId) => { try { localStorage.setItem('vp:char', c) } catch { /* ignora */ } }
