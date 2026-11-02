import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { WORLDS, levelsOf, labelOf, isUnlocked } from './catalog'
import { cityOf, areaState, type Area } from './geo'
import { ASSETS } from './game/assets'
import { CHARS, centerOffset, type CharId } from './game/characters'
import type { Level, Progress } from './types'

/* Seletor 2.5D (v7) — "Recife em miniatura".
   Um plano inclinado (CSS 3D) funciona como maquete: terreno, rio Capibaribe, mar, praças e ruas são desenhados no chão (SVG);
   prédios, postes, árvores, marcos de fase e o personagem são "cartazes" em pé (billboards) que o navegador ordena em profundidade.
   Navegação inalterada: o personagem anda de praça em praça pela rua; entrar exige confirmação (F / Enter / Espaço ou botão). */

const A = '/assets/original/'
const SRC = (k: string) => A + ASSETS[k][0]
const keyOf = (path: string) => Object.keys(ASSETS).find(k => ASSETS[k][0] === path)
const TILT = 52, SPEED = 230, PLAZA = 78
/** o chão termina HZ unidades à frente da câmera: além disso aparece o céu (com a skyline), e os prédios altos ficam recortados contra ele */
const HZ = 560, GM = 1400

type NState = 'done' | 'open' | 'locked' | 'soon'
type N = { id: string; x: number; y: number; title: string; short: string; sub: string; state: NState; stars?: number; score?: number; level?: Level; area?: Area; color: string; landmark?: string }
type Pt = [number, number]
type Deco = [key: string, x: number, y: number, scale: number, flip?: boolean]

/** rua entre duas praças: curva suave; o personagem anda exatamente sobre estes pontos */
const edgePts = (a: N, b: N, i: number): Pt[] => Array.from({ length: 19 }, (_, k) => {
  const t = k / 18, dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, off = Math.sin(t * Math.PI) * 48 * (i % 2 ? 1 : -1)
  return [a.x + dx * t - (dy / L) * off, a.y + dy * t + (dx / L) * off]
})
const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n)
const LAMPS = ['aceso1', 'aceso2', 'aceso4', 'aceso5', 'aceso6', 'aceso7']

/* ---------- composição das duas maquetes ---------- */
const riverY = (x: number) => 875 + 26 * Math.sin(x / 230) + 12 * Math.sin(x / 97)
const COAST = 1890
const CITY = {
  w: 2100, h: 1300,
  parks: [[300, 1180, 230, 90], [760, 560, 170, 80], [1190, 1200, 260, 80], [1500, 520, 150, 70], [140, 640, 160, 120]] as [number, number, number, number][],
  decor: [
    ['mato1', 230, 1150, 2.4], ['mato3', 380, 1210, 2.4, true], ['mato4', 300, 1190, 2.6], ['banco', 700, 1120, 2.2], ['lixeira', 410, 1070, 1.4],
    ['mato1', 700, 560, 2.2], ['mato3', 820, 580, 2.2, true], ['banco', 1060, 640, 2.2],
    ['semaforo_am', 1220, 980, 2], ['fusca', 1480, 1110, 2.2], ['mato1', 1110, 1200, 2.4], ['mato3', 1260, 1215, 2.4], ['mato4', 1190, 1190, 2.6],
    ['mato1', 1460, 520, 2.2, true], ['mato4', 1540, 540, 2.6], ['banco', 1820, 760, 2.2], ['lixeira', 1600, 640, 1.4],
    ['mato1', 100, 620, 2.4], ['mato3', 190, 680, 2.4, true],
  ] as Deco[],
  lamps: [[420, 960], [700, 900], [830, 760], [1120, 760], [1250, 940], [1480, 860], [1600, 760]] as Pt[],
}
const WORLD_POS: Pt[] = [[560, 980], [1050, 790], [1540, 980]]
const WORLD = {
  w: 2100, h: 1300,
  facades: ['wamarelo', 'pred1', 'wvermelho', 'pred5', 'wazul', 'pred8', 'wverde', 'pred3', 'wlaranja', 'pred7'],
  parks: [[400, 1180, 260, 80], [1020, 1170, 300, 80], [1600, 1180, 240, 80]] as [number, number, number, number][],
  decor: [['banco', 760, 1080, 2.2], ['lixeira', 440, 1060, 1.4], ['mato1', 330, 1160, 2.4], ['mato3', 470, 1190, 2.4, true], ['mato4', 1000, 1150, 2.6], ['mato1', 1120, 1170, 2.4],
    ['banco', 1300, 1080, 2.2, true], ['mato3', 1560, 1170, 2.4], ['mato1', 1680, 1190, 2.4, true], ['fusca', 1820, 1090, 2.2]] as Deco[],
  lamps: [[300, 920], [800, 880], [1300, 880], [1800, 920]] as Pt[],
}

/** cartaz em pé: ancorado pela base (pés) no ponto (x, y) do chão */
function Stand({ x, y, className = '', children }: { x: number; y: number; className?: string; children: ReactNode }) {
  return <div className={'bb ' + className} style={{ left: x, top: y }}>{children}</div>
}
/** sprite recortado na área visível (sem as margens transparentes do PNG), em escala inteira, pixelado */
function Sprite({ k, s = 1, flip = false, className = '' }: { k: string; s?: number; flip?: boolean; className?: string }) {
  const a = ASSETS[k]
  return <span className={'spr ' + className} style={{ width: (a[5] - a[3]) * s, height: (a[6] - a[4]) * s, backgroundImage: `url("${SRC(k)}")`, backgroundSize: `${a[1] * s}px ${a[2] * s}px`, backgroundPosition: `${-a[3] * s}px ${-a[4] * s}px`, transform: flip ? 'scaleX(-1)' : undefined }} />
}
/** marco da praça conforme o estado (concluída: bandeira de Pernambuco; disponível: placa com seta; bloqueada: cadeado; em breve: barreira) */
function Marker({ n, label }: { n: N; label: string }) {
  return (
    <div className={'mk ' + n.state} style={{ ['--wc' as string]: n.color }}>
      {n.state === 'done' && n.stars !== undefined && <span className="mk-stars">{stars(n.stars)}</span>}
      {n.state === 'done' && <img className="flag" src={A + 'ui/bandeira_pe.png'} alt="" />}
      {n.state === 'open' && <><img className="arrow" src={SRC('seta')} alt="" /><span className="plaque">{label}</span><span className="post" /></>}
      {n.state === 'locked' && <><span className="plaque lock"><i className="padlock" /></span><span className="post" /></>}
      {n.state === 'soon' && <Sprite k="roadblock" s={2} />}
    </div>
  )
}

type Props = { progress: Progress; hero: CharId; cityId: string; initialArea: Area | null; onArea: (a: Area | null) => void; onPlay: (l: Level) => void; onBack: () => void; onList: () => void }
export default function Overworld({ progress, hero, cityId, initialArea, onArea, onPlay, onBack, onList }: Props) {
  const city = cityOf(cityId)!, areas = useMemo(() => city.areas ?? [], [city])
  const [area, setArea] = useState<Area | null>(initialArea)
  const lastArea = useRef<string | null>(initialArea?.id ?? null)
  const L = area ? WORLD : CITY

  const nodes = useMemo<N[]>(() => {
    if (!area) return areas.map(a => {
      const w = WORLDS.find(x => x.id === a.worldId)!, st = areaState(progress, a), ls = levelsOf(w)
      const state: NState = st.state === 'soon' ? 'soon' : st.state === 'done' ? 'done' : isUnlocked(progress, ls[0]) ? 'open' : 'locked'
      return { id: a.id, x: a.map[0], y: a.map[1], title: a.name, short: a.name, sub: `${w.name} · ${w.discipline} · ${st.done}/3 fases`, state, area: a, color: w.color, landmark: keyOf(a.asset) }
    })
    const w = WORLDS.find(x => x.id === area.worldId)!, ls = levelsOf(w)
    return [1, 2, 3].map((n, i) => {
      const l = ls.find(x => x.order === n), r = l && progress.levels[l.id]
      return { id: l?.id ?? `soon-${n}`, x: WORLD_POS[i][0], y: WORLD_POS[i][1], title: l ? `${labelOf(l)} ${l.title}` : `Fase ${n}`, short: l ? labelOf(l) : `${n}`,
        sub: l ? `${l.discipline} · ${l.grade} — ${l.objective}` : 'Em breve — ainda não implementado', state: !l ? 'soon' : r?.done ? 'done' : isUnlocked(progress, l) ? 'open' : 'locked',
        stars: r?.stars, score: r?.score, level: l, color: w.color } as N
    })
  }, [area, areas, progress])

  const pickStart = useCallback(() => {
    if (!area && lastArea.current) { const i = nodes.findIndex(n => n.id === lastArea.current); if (i >= 0) return i }
    const li = progress.last ? nodes.findIndex(n => n.id === progress.last) : -1; if (li >= 0) return li
    const o = nodes.findIndex(n => n.state === 'open'); return o >= 0 ? o : 0
  }, [area, nodes, progress.last])
  const start0 = useMemo(pickStart, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [cur, setCur] = useState(start0)
  const [pt, setPt] = useState({ x: nodes[start0].x, y: nodes[start0].y, face: 1 as 1 | -1, moving: false })
  const [cam, setCam] = useState({ x: nodes[start0].x, y: nodes[start0].y })
  const [fr, setFr] = useState(0), [msg, setMsg] = useState(''), [fade, setFade] = useState(false)
  const mv = useRef<{ pts: Pt[]; seg: number; to: number } | null>(null), pos = useRef({ x: pt.x, y: pt.y }), camR = useRef({ ...cam }), face = useRef<1 | -1>(1)
  const curN = nodes[cur] ?? nodes[0]
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const flash = useCallback((m: string) => { setMsg(m); window.setTimeout(() => setMsg(''), 2600) }, [])

  const switchView = useCallback((a: Area | null) => {
    setFade(true)
    window.setTimeout(() => { if (a) lastArea.current = a.id; setArea(a); onArea(a); setFade(false) }, 240)
  }, [onArea])
  /* ao trocar de visão (cidade ⇄ mundo): o personagem aparece na praça certa (na cidade, a da área de onde veio) */
  useEffect(() => {
    const k = pickStart(); setCur(k); mv.current = null
    pos.current = { x: nodes[k].x, y: nodes[k].y }; camR.current = { ...pos.current }
    setPt({ x: nodes[k].x, y: nodes[k].y, face: 1, moving: false }); setCam({ ...pos.current })
  }, [area]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = window.setInterval(() => setFr(f => f + 1), 110); return () => window.clearInterval(t) }, [])

  /* caminhada pela rua + câmera que acompanha com suavidade */
  useEffect(() => {
    let raf = 0, last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; const m = mv.current
      if (m) {
        let left = SPEED * dt, { x, y } = pos.current
        while (left > 0 && m.seg < m.pts.length) {
          const [tx, ty] = m.pts[m.seg], d = Math.hypot(tx - x, ty - y)
          if (Math.abs(tx - x) > 0.5) face.current = tx > x ? 1 : -1
          if (d <= left) { x = tx; y = ty; left -= d; m.seg++ } else { x += ((tx - x) / d) * left; y += ((ty - y) / d) * left; left = 0 }
        }
        pos.current = { x, y }
        if (m.seg >= m.pts.length) { mv.current = null; setCur(m.to); setPt({ x, y, face: face.current, moving: false }) } else setPt({ x, y, face: face.current, moving: true })
      }
      const c = camR.current, k = reduced ? 1 : 1 - Math.pow(0.002, dt), nx = c.x + (pos.current.x - c.x) * k, ny = c.y + (pos.current.y - c.y) * k
      if (Math.abs(nx - c.x) > 0.05 || Math.abs(ny - c.y) > 0.05) { camR.current = { x: nx, y: ny }; setCam({ x: nx, y: ny }) }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf)
  }, [reduced])

  const canGo = (to: number) => to < cur || nodes[to].state === 'done' || nodes[to].state === 'open' || nodes[cur].state === 'done'
  const go = useCallback((dx: number, dy: number) => {
    if (mv.current) return
    let best = -1, bd = 0.25
    for (const j of [cur - 1, cur + 1]) {
      if (j < 0 || j >= nodes.length) continue
      const vx = nodes[j].x - nodes[cur].x, vy = nodes[j].y - nodes[cur].y, Ln = Math.hypot(vx, vy) || 1, dot = (vx * dx + vy * dy) / Ln
      if (dot > bd) { bd = dot; best = j }
    }
    if (best < 0) return
    if (!canGo(best)) { flash(nodes[best].state === 'soon' ? `${nodes[best].title} chega em breve — ainda não tem fases.` : `Caminho bloqueado: conclua ${nodes[cur].title} primeiro.`); return }
    const lo = Math.min(cur, best), pts = edgePts(nodes[lo], nodes[lo + 1], lo); if (best < cur) pts.reverse()
    mv.current = { pts, seg: 1, to: best }; setMsg('')
  }, [cur, nodes, flash]) // eslint-disable-line react-hooks/exhaustive-deps
  const enter = useCallback(() => {
    if (mv.current) return
    const n = nodes[cur]
    if (n.state === 'soon') return flash('Em breve: esta parte ainda não foi implementada.')
    if (n.state === 'locked') return flash('Bloqueada: conclua a fase anterior.')
    if (n.area) switchView(n.area); else if (n.level) onPlay(n.level)
  }, [cur, nodes, flash, switchView, onPlay])
  const back = useCallback(() => { if (area) switchView(null); else onBack() }, [area, switchView, onBack])
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === 'arrowleft' || k === 'a') go(-1, 0); else if (k === 'arrowright' || k === 'd') go(1, 0); else if (k === 'arrowup' || k === 'w') go(0, -1); else if (k === 'arrowdown' || k === 's') go(0, 1)
      else if (k === 'f' || k === 'enter' || k === ' ') enter(); else if (k === 'escape' || k === 'backspace') back(); else return
      e.preventDefault()
    }
    window.addEventListener('keydown', kd); return () => window.removeEventListener('keydown', kd)
  }, [go, enter, back])

  /* ---------- chão (SVG) — memorizado: só muda com a visão e o progresso ---------- */
  const roads = useMemo(() => nodes.slice(0, -1).map((a, i) => ({ pts: edgePts(a, nodes[i + 1], i), open: nodes[i + 1].state === 'done' || nodes[i + 1].state === 'open' || a.state === 'done' && nodes[i + 1].state !== 'soon' })), [nodes])
  const ground = useMemo(() => {
    const M = GM, vb = `${-M} ${-M * 2} ${L.w + 2 * M} ${L.h + 3 * M}`, line = (p: Pt[]) => p.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ')
    const river: Pt[] = []; for (let x = -M; x <= COAST + 40; x += 20) river.push([x, riverY(x)])
    const bridges: { x: number; y: number; ang: number }[] = []
    if (!area) roads.forEach(r => { for (let i = 1; i < r.pts.length; i++) { const [x0, y0] = r.pts[i - 1], [x1, y1] = r.pts[i], s0 = y0 - riverY(x0), s1 = y1 - riverY(x1); if (s0 * s1 <= 0) { const t = s0 / (s0 - s1); bridges.push({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, ang: Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI }); break } } })
    const street: Pt[] = area ? [[-M, 960], [140, 965], ...roads.flatMap(r => r.pts), [1980, 965], [L.w + M, 960]] : []
    return (
      <svg className="ow-svg" style={{ left: 0, top: 0 }} width={L.w + 2 * M} height={L.h + 3 * M} viewBox={vb} aria-hidden>
        <defs>
          <pattern id="stone" width="64" height="64" patternUnits="userSpaceOnUse"><image href={A + 'ui/map_stone.png'} width="64" height="64" style={{ imageRendering: 'pixelated' }} /></pattern>
          <pattern id="grass" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#4f9a3a" /><rect x="3" y="5" width="3" height="3" fill="#62b14a" /><rect x="15" y="14" width="3" height="3" fill="#3f8430" /><rect x="10" y="2" width="2" height="2" fill="#74c158" /></pattern>
          <radialGradient id="plz"><stop offset="0" stopColor="#efe1bd" /><stop offset="1" stopColor="#d2bf92" /></radialGradient>
        </defs>
        <rect x={-M} y={-M * 2} width={L.w + 2 * M} height={L.h + 3 * M} fill="url(#stone)" />
        <rect x={-M} y={-M * 2} width={L.w + 2 * M} height={L.h + 3 * M} fill="#e9c98f" opacity=".38" />
        {L.parks.map(([x, y, rx, ry], i) => <g key={i}><ellipse cx={x} cy={y} rx={rx + 8} ry={ry + 8} fill="#2f6b26" /><ellipse cx={x} cy={y} rx={rx} ry={ry} fill="url(#grass)" /></g>)}
        {!area && <>
          <polygon points={`${COAST},-3000 ${COAST + 30},400 ${COAST - 10},760 ${COAST + 40},1100 ${COAST},4000 ${L.w + M * 3},4000 ${L.w + M * 3},-3000`} fill="#1d5fa8" />
          <polygon points={`${COAST},-3000 ${COAST + 30},400 ${COAST - 10},760 ${COAST + 40},1100 ${COAST},4000`} fill="none" stroke="#e8d9a8" strokeWidth="14" />
          <polyline points={line(river)} fill="none" stroke="#e8d9a8" strokeWidth="112" strokeLinejoin="round" />
          <polyline points={line(river)} fill="none" stroke="#1d5fa8" strokeWidth="96" strokeLinejoin="round" />
          <polyline className="shine" points={line(river)} fill="none" stroke="#7cc0ff" strokeWidth="5" strokeDasharray="22 46" />
          <polyline className="shine s2" points={line(river.map(([x, y]) => [x, y + 24] as Pt))} fill="none" stroke="#5aa6f0" strokeWidth="4" strokeDasharray="14 60" />
          {[220, 520, 820, 1120].map(y => <path key={y} className="wave" d={`M${COAST + 80},${y} q14,-10 28,0 t28,0 t28,0`} stroke="#7cc0ff" strokeWidth="5" fill="none" />)}
          {/* pier do Marco Zero */}
          <rect x={COAST - 30} y={640} width={150} height={44} fill="#b49a6a" stroke="#5b4630" strokeWidth="6" />
        </>}
        {area && <polyline points={line(street)} fill="none" stroke="#3b3b44" strokeWidth="88" strokeLinejoin="round" />}
        {area && <polyline points={line(street)} fill="none" stroke="#c9c2b4" strokeWidth="88" strokeDasharray="0" opacity=".0" />}
        {area && <polyline points={line(street.map(([x, y]) => [x, y - 150] as Pt))} fill="none" stroke="#c7b48a" strokeWidth="70" opacity=".55" />}
        {roads.map((r, i) => <g key={i} className={r.open ? 'road on' : 'road off'}>
          <polyline points={line(r.pts)} className="r-edge" /><polyline points={line(r.pts)} className="r-walk" /><polyline points={line(r.pts)} className="r-asph" /><polyline points={line(r.pts)} className="r-mid" />
        </g>)}
        {bridges.map((b, i) => <g key={i} transform={`translate(${b.x} ${b.y}) rotate(${b.ang})`}>
          <rect x="-78" y="-36" width="156" height="72" fill="#7a5a3a" /><rect x="-78" y="-30" width="156" height="60" fill="#55555f" />
          <rect x="-82" y="-40" width="164" height="8" fill="#e8e0cc" stroke="#2a1d10" strokeWidth="3" /><rect x="-82" y="32" width="164" height="8" fill="#e8e0cc" stroke="#2a1d10" strokeWidth="3" />
          {[-60, -30, 0, 30, 60].map(px => <g key={px}><rect x={px - 4} y="-46" width="8" height="12" fill="#2a1d10" /><rect x={px - 4} y="34" width="8" height="12" fill="#2a1d10" /></g>)}
        </g>)}
        {nodes.map((n, i) => <g key={n.id} className={'plaza ' + n.state + (i === cur ? ' cur' : '')} style={{ ['--wc' as string]: n.color }}>
          <circle cx={n.x} cy={n.y} r={PLAZA + 10} className="p-ring" /><circle cx={n.x} cy={n.y} r={PLAZA} fill="url(#plz)" stroke="#5b4630" strokeWidth="5" />
          {n.id === 'marco-zero'
            ? <g transform={`translate(${n.x} ${n.y})`} className="rosa">{[0, 45, 90, 135, 180, 225, 270, 315].map(a => <polygon key={a} points={a % 90 ? '0,-40 7,0 -7,0' : '0,-62 11,0 -11,0'} transform={`rotate(${a})`} fill={a % 90 ? '#b06a2a' : '#7a2a18'} />)}<circle r="12" fill="#e9c98f" stroke="#7a2a18" strokeWidth="4" /></g>
            : <><circle cx={n.x} cy={n.y} r={PLAZA - 22} fill="none" stroke="#b9a476" strokeWidth="4" strokeDasharray="10 8" /><circle cx={n.x} cy={n.y} r="14" fill="#b9a476" /></>}
          {i === cur && <circle cx={n.x} cy={n.y} r={PLAZA + 18} className="p-sel" />}
        </g>)}
      </svg>
    )
  }, [area, L, nodes, roads, cur])
  const horizon = cam.y - HZ, seen = (y: number) => y > horizon + 8

  const C = CHARS[hero], fkey = pt.moving ? C.run.key + ((fr % C.run.n) + 1) : C.idle.key + ((Math.floor(fr / 2) % C.idle.n) + 1), off = centerOffset(fkey)
  const lampKey = LAMPS[Math.floor(fr / 2) % LAMPS.length], bob = pt.moving && !reduced ? Math.abs(Math.sin(fr * 0.9)) * 4 : 0
  const crumbs = area ? `Pernambuco › ${city.name} › ${area.name}` : `Pernambuco › ${city.name}`
  const stateTxt: Record<NState, string> = { done: 'Concluída', open: 'Disponível', locked: 'Bloqueada', soon: 'Em breve' }
  const lmScale = (k: string) => Math.max(1, Math.round((230 / (ASSETS[k][6] - ASSETS[k][4])) * 2) / 2)
  return (
    <main className={'ow' + (fade ? ' fade' : '') + (area ? ' inworld' : '')}>
      {/* fundo: céu, sol, mar no horizonte e skyline do Recife assentada na linha do horizonte */}
      <div className="ow-sky" aria-hidden>
        <div className="sun" />
        {!area && <div className="horizon-sea" />}
        <div className="skyline" style={{ transform: `translateX(${-cam.x * 0.05}px)` }}>
          {['pred1', 'pred3', 'cinema', 'pred5', 'sinagoga', 'pred7', 'pred8', 'pred2', 'pred6', 'pred4'].filter(k => ASSETS[k]).map((k, i) => <Sprite key={k + i} k={k} s={1} className="sk" />)}
        </div>
      </div>
      {!reduced && <div className="ow-clouds" aria-hidden>{['nuvem1', 'nuvem5', 'nuvem6'].map((k, i) => <img key={k} src={SRC(k)} alt="" style={{ top: `${3 + i * 7}%`, animationDelay: `${-i * 27}s`, animationDuration: `${95 + i * 30}s` }} />)}</div>}
      <div className="ow-haze" aria-hidden />
      <div className="ow-view" aria-label={`Mapa de ${area ? area.name : city.name}`}>
        <div className="ow-plane" style={{ width: L.w, height: L.h, transform: `rotateX(${TILT}deg) translate(${-cam.x}px, ${-cam.y}px)` }}>
          <div className="land" style={{ left: -GM, top: horizon, width: L.w + 2 * GM, height: L.h + GM - horizon }}>
            <div style={{ position: 'absolute', left: 0, top: -GM * 2 - horizon }}>{ground}</div>
          </div>
          {/* fachadas da rua (visão de mundo) */}
          {area && WORLD.facades.filter(k => ASSETS[k]).map((k, i) => seen(760) && <Stand key={k + i} x={160 + i * 200} y={760 - (i % 2) * 18}><Sprite k={k} s={2} /></Stand>)}
          {area && (() => { const k = keyOf(area.asset); return k ? <Stand x={1900} y={800}><Sprite k={k} s={lmScale(k)} /></Stand> : null })()}
          {/* marcos de cada praça + prédio-símbolo (cidade) */}
          {nodes.map(n => seen(n.y) && <Stand key={'m' + n.id} x={n.x + PLAZA + 4} y={n.y + 22} className="mk-wrap"><Marker n={n} label={area ? n.short.split('-')[1] ?? n.short : String(nodes.indexOf(n) + 1)} /></Stand>)}
          {!area && nodes.map(n => n.landmark && seen(n.y - PLAZA - 34) && <Stand key={'l' + n.id} x={n.x - 10} y={n.y - PLAZA - 34} className={'lm ' + n.state}><Sprite k={n.landmark} s={lmScale(n.landmark)} /><span className="tag" style={{ ['--wc' as string]: n.color }}>{n.short}</span></Stand>)}
          {area && nodes.map(n => <Stand key={'t' + n.id} x={n.x} y={n.y + PLAZA + 34} className="ground-tag"><span className="tag" style={{ ['--wc' as string]: n.color }}>{n.short}</span></Stand>)}
          {L.decor.map(([k, x, y, s, f], i) => ASSETS[k] && seen(y) && <Stand key={k + i} x={x} y={y}><Sprite k={k} s={s} flip={f} /></Stand>)}
          {L.lamps.map(([x, y], i) => seen(y) && <Stand key={'p' + i} x={x} y={y}><Sprite k={lampKey} s={1} /></Stand>)}
          {/* o personagem escolhido, com sombra no chão */}
          <div className="hero-shadow" style={{ left: pt.x, top: pt.y }} />
          <Stand x={pt.x} y={pt.y + 4} className="hero">
            <img src={SRC(fkey)} alt={C.name} width={128} height={128} style={{ transform: `translate(${off * 2 * pt.face}px, ${-bob}px) scaleX(${pt.face})` }} />
          </Stand>
        </div>
      </div>
      {/* primeiro plano desfocado (profundidade) */}
      <div className="ow-fg" aria-hidden style={{ transform: `translateX(${-(cam.x % 2000) * 0.12}px)` }}><Sprite k="mato1" s={6} className="fg l" /><Sprite k="mato3" s={6} className="fg r" flip /></div>

      <header className="ow-top">
        <button className="btn alt" onClick={back}>◀ {area ? city.name : 'Pernambuco'}</button>
        <div className="ow-title"><p className="kicker">{crumbs}</p><h1>{area ? area.name : city.name}</h1></div>
        <button className="btn alt" onClick={onList}>Modo lista</button>
      </header>
      <section className={'ow-card ' + curN.state} aria-live="polite" style={{ ['--wc' as string]: curN.color }}>
        <p className="chip-state">{stateTxt[curN.state]}</p>
        <h2>{curN.title}</h2><p className="ow-sub">{curN.sub}</p>
        {curN.state === 'done' && curN.stars !== undefined && <p className="stars">{stars(curN.stars)} · melhor: {curN.score} pts</p>}
        <button className="btn" disabled={curN.state === 'soon' || curN.state === 'locked' || pt.moving} onClick={enter}>{coarse ? 'Entrar' : 'F — Entrar'}</button>
        {msg && <p className="ow-msg" role="status">{msg}</p>}
      </section>
      <ul className="ow-legend" aria-label="Legenda">
        <li className="done">Concluída</li><li className="open">Disponível</li><li className="locked">Bloqueada</li><li className="soon">Em breve</li>
      </ul>
      <div className="ow-pad" aria-label="Controles do mapa">
        <span /><button className="pb" onPointerDown={e => { e.preventDefault(); go(0, -1) }} aria-label="Cima">▲</button><span />
        <button className="pb" onPointerDown={e => { e.preventDefault(); go(-1, 0) }} aria-label="Esquerda">◀</button>
        <button className="pb" onPointerDown={e => { e.preventDefault(); go(0, 1) }} aria-label="Baixo">▼</button>
        <button className="pb" onPointerDown={e => { e.preventDefault(); go(1, 0) }} aria-label="Direita">▶</button>
      </div>
      <p className="ow-keys"><kbd>←↑↓→</kbd> andar · <kbd>F</kbd> entrar · <kbd>Esc</kbd> voltar</p>
    </main>
  )
}
