import geo from './data/geo.json'
import { WORLDS, levelsOf } from './catalog'
import type { Progress } from './types'
export type Area = { id: string; name: string; worldId: string; asset: string; blurb: string; map: [number, number] }
export type City = { id: string; name: string; available: boolean; lon: number; lat: number; blurb?: string; areas?: Area[]; dy?: number }
export const CITIES = geo.cities as City[]
export const cityOf = (id: string) => CITIES.find(c => c.id === id)
/** estado de uma área: 'soon' (sem fases ainda), 'locked', 'open' ou 'done' — vem dos dados (mundo educativo ligado à área) */
export function areaState(p: Progress, a: Area): { state: 'soon' | 'open' | 'done'; done: number; total: number } {
  const w = WORLDS.find(x => x.id === a.worldId), ls = w ? levelsOf(w) : []
  const done = ls.filter(l => p.levels[l.id]?.done).length
  return { state: !ls.length ? 'soon' : done >= 3 ? 'done' : 'open', done, total: 3 }
}
