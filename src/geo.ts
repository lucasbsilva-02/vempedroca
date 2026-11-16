import geo from './data/geo.json'
import { WORLDS, levelsOf, isUnlocked } from './catalog'
import type { Progress } from './types'
export type Area = { id: string; name: string; worldId: string; asset: string; blurb: string; map: [number, number] }
export type RouteId = 'N' | 'C' | 'S'
export type Dir = 'cima' | 'baixo' | 'esquerda' | 'direita'
/** cidade do mapa v0.2: `code` é a sigla usada nas rotas; `point` é o ponto âncora em px no mapa 640×360; `region` é o valor do pixel em arco1-idx.png.
 *  `title`/`inclui` vêm da decisão A3: região principal + municípios agregados (ex.: "Região de Toritama" · "Inclui Toritama, Vertentes…") */
export type City = { id: string; code: string; name: string; title: string; inclui: string; routes: RouteId[]; point: [number, number]; region: number; neighbors: Record<Dir, string | null>; blurb: string; areas?: Area[] }
export type GroupId = 'arco1' | 'sertao' | 'saofrancisco'
export type Group = { name: string; blurb: string; available: boolean; mesorregioes: number[] }
export const MAP = geo.map as { version: string; native: [number, number]; scale: number; assets: string }
export const GROUPS = geo.groups as Record<GroupId, Group>
export const ROUTES = geo.routes as Record<RouteId, { name: string; road: string; cities: string[] }>
/** I-01: só estas cidades dão selo de rota; as demais dão "carimbo da cidade", sem efeito no desbloqueio */
export const SEALS = geo.seals as string[]
export const FINAL = geo.final as string
/** I-02: paradas opcionais (não entram em nenhuma regra de desbloqueio) */
export const OPTIONAL = geo.optional as string[]
export const CITIES = geo.cities as City[]
export const cityOf = (id: string) => CITIES.find(c => c.id === id || c.code === id)
/** estado de uma área: 'soon' (sem fases ainda), 'locked', 'open' ou 'done' — vem dos dados (mundo educativo ligado à área) */
export function areaState(p: Progress, a: Area): { state: 'soon' | 'open' | 'done'; done: number; total: number } {
  const w = WORLDS.find(x => x.id === a.worldId), ls = w ? levelsOf(w) : []
  const done = ls.filter(l => p.levels[l.id]?.done).length
  return { state: !ls.length ? 'soon' : done >= 3 ? 'done' : 'open', done, total: 3 }
}
/** como areaState, mas separa 'locked' (a 1ª fase da área ainda não foi liberada pela regra de fases do catálogo) */
export function areaStatus(p: Progress, a: Area): 'soon' | 'locked' | 'open' | 'done' {
  const w = WORLDS.find(x => x.id === a.worldId), ls = w ? levelsOf(w) : [], st = areaState(p, a).state
  return st === 'open' && !isUnlocked(p, ls[0]) ? 'locked' : st
}

/* ---------- v0.2: regras de progressão entre cidades (decisões I-01 e I-02 de 13/11/2026) ----------
   Recife abre as 3 rotas; cada cidade abre a seguinte da sua rota; Caruaru exige os 3 selos; Bezerros é opcional.
   Uma cidade com áreas (hoje só o Recife) está concluída quando todas as fases que existem nela foram concluídas;
   as outras ainda não têm fases e usam `progress.cities` (campo opcional: o progresso salvo antigo continua válido). */
export type CityState = 'done' | 'available' | 'locked'
export function cityDone(p: Progress, c: City): boolean {
  if (!c.areas) return !!p.cities?.[c.code]?.done
  const ls = c.areas.flatMap(a => { const w = WORLDS.find(x => x.id === a.worldId); return w ? levelsOf(w) : [] })
  return ls.length > 0 && ls.every(l => p.levels[l.id]?.done)
}
const isDone = (p: Progress, code: string) => { const c = cityOf(code); return !!c && cityDone(p, c) }
/** cidades imediatamente anteriores a esta, uma por rota em que ela aparece */
export const prevOf = (code: string) => Object.values(ROUTES).flatMap(r => { const i = r.cities.indexOf(code); return i > 0 ? [r.cities[i - 1]] : [] })
export const sealsOf = (p: Progress) => SEALS.filter(s => isDone(p, s))
export function cityState(p: Progress, c: City): CityState {
  if (cityDone(p, c)) return 'done'
  if (prevOf(c.code).length === 0) return 'available'                                   // Recife: ponto de partida
  if (c.code === FINAL) return sealsOf(p).length === SEALS.length ? 'available' : 'locked'
  return prevOf(c.code).some(x => isDone(p, x)) ? 'available' : 'locked'
}
/** o que a cidade concluída entrega: selo de rota (conta para Caruaru) ou carimbo da cidade (só registro) */
export const rewardOf = (c: City) => SEALS.includes(c.code) ? `Selo da Rota ${ROUTES[c.routes[0]].name}` : 'Carimbo da cidade'
