/* Catálogo central: qualquer JSON de fase em src/data/*.json (com tiles, objects e boss) entra automaticamente; mundos vêm de worlds.json. */
import type { Level, Progress } from './types'
import worldsJson from './data/worlds.json'
export type World = { id: string; order: number; name: string; discipline: string; blurb: string; color: string }
export const WORLDS: World[] = [...(worldsJson as World[])].sort((a, b) => a.order - b.order)
const mods = import.meta.glob('./data/*.json', { eager: true, import: 'default' }) as Record<string, unknown>
const isLevel = (x: unknown): x is Level => { const l = x as Level; return !!l && typeof l === 'object' && !Array.isArray(l) && typeof l.id === 'string' && Array.isArray(l.tiles) && Array.isArray(l.objects) && !!l.boss }
const wIdx = (l: Level) => Math.max(0, WORLDS.findIndex(w => w.id === l.worldId))
export const LEVELS: Level[] = Object.values(mods).filter(isLevel).sort((a, b) => wIdx(a) - wIdx(b) || a.order - b.order)
export const labelOf = (l: Level) => `${wIdx(l) + 1}-${l.order}`
export const levelsOf = (w: World) => LEVELS.filter(l => l.worldId === w.id)
export const nextOf = (l: Level) => LEVELS[LEVELS.indexOf(l) + 1]
/* regra: a 1ª fase começa liberada; concluir uma libera a seguinte (a 3ª libera o próximo mundo, pois a ordem é global) */
export const isUnlocked = (p: Progress, l: Level) => { const i = LEVELS.indexOf(l); return i <= 0 || !!p.levels[LEVELS[i - 1].id]?.done || !!p.levels[l.id]?.done }
export const continueLevel = (p: Progress): Level | undefined => LEVELS.find(l => isUnlocked(p, l) && !p.levels[l.id]?.done) ?? LEVELS.find(l => l.id === p.last) ?? LEVELS[0]
