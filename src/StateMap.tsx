import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CITIES, GROUPS, MAP, OPTIONAL, ROUTES, SEALS, FINAL, areaState, areaStatus, cityOf, cityState, prevOf, rewardOf, sealsOf, type Area, type City, type CityState, type Dir, type GroupId } from './geo'
import { WORLDS, levelsOf, labelOf } from './catalog'
import type { Progress } from './types'

/* Mapa de Pernambuco v0.2 (aprovado em conceito por Aline Cristina / Gestão em 05/11/2026; decisões de 13/11/2026).
   Portado do protótipo aprovado (MAPA_PERNAMBUCO/v0.2/mapa-v0.2.html). Navegação: visão geral → Arco → cidade → área.
   - Visão geral: as 5 mesorregiões; o trecho escolhido fica nítido e colorido e o resto apagado (A6.1).
   - Sertão e São Francisco abrem a PRÓPRIA região, em cinza, com "Indisponível" (A6.2).
   - Arco 1: seleção por PONTOS (A2). O ponto é a âncora: mostra a região principal e os municípios agregados (A3).
   - Recife: 4 áreas no mesmo estilo simplificado (A1).
   Tudo é desenhado num canvas de 640×360 (resolução nativa do mapa) e ampliado sem suavização; 2× = 1280×720 (I-05/R-01).
   As imagens são arte PROVISÓRIA; a arte final (AST-MAP-001…004) deve manter as posições dos pontos e das regiões.
   Máscaras de clique: ov-idx (pixel ÷ 40 = mesorregião), arco1-idx (pixel = City.region), recife-idx (pixel ÷ 60 = área). */

export type MapView = 'overview' | GroupId | 'recife'
const [W, H] = MAP.native
type RGB = [number, number, number]
const INK: RGB = [29, 22, 17], WHITE: RGB = [255, 255, 255], GOLD: RGB = [242, 193, 78], BLUE: RGB = [47, 111, 224], RED: RGB = [214, 64, 52], AREA_ON: RGB = [240, 158, 120]
const ROUTE_RGB: RGB = [154, 70, 48]
const FILES = { ov_arco1: 'ov-arco1', ov_sertao: 'ov-sertao', ov_saofrancisco: 'ov-saofrancisco', ovidx: 'ov-idx', arco: 'arco1', tidx: 'arco1-idx', rg_sertao: 'rg-sertao', rg_saofrancisco: 'rg-saofrancisco', rec: 'recife', aidx: 'recife-idx' } as const
type Data = Record<keyof typeof FILES, Uint8ClampedArray>
/** mesorregião (1 Grande Recife, 2 Zona da Mata, 3 Agreste, 4 Sertão, 5 São Francisco) → trecho do jogo */
const GROUP_OF: Record<number, GroupId> = {}
for (const g of Object.keys(GROUPS) as GroupId[]) for (const m of GROUPS[g].mesorregioes) GROUP_OF[m] = g
const GROUP_IDS = Object.keys(GROUPS) as GroupId[]
const FLAG = ['kkk.................', 'kkkkkkkkkkkkkkkkkkkk', 'kkkrrrrrrrrrrrrrrrrk', 'kkkrrrrrrrrrrrrrrrk.', 'kkkrryyrrrrrryyrrk..', 'kkkrryyrrrrrryyrk...', 'kkkrrrrrrrrrrrrk....', 'kkkrryyrrrrrryyrk...', 'kkkrryyrrrrrryyrrk..', 'kkkrrrrrrrrrrrrrrrk.', 'kkkrrrrrrrrrrrrrrrrk', 'kkkkkkkkkkkkkkkkkkkk',
  ...Array(12).fill('kkk.................'), 'kkkkkkkkk...........', 'kkkkkkkkk...........']
const LOCK = ['.kkk.', 'k...k', 'kkkkk', 'kYqYk', 'kqYqk', 'kkkkk']
const HINT: Record<MapView, string> = { overview: 'Clique numa região do estado', arco1: 'Clique num ponto · Esc volta', recife: 'Clique numa área · Esc volta', sertao: 'Região indisponível · clique para voltar', saofrancisco: 'Região indisponível · clique para voltar' }
const ST_TXT: Record<CityState, string> = { done: 'CONCLUÍDA', available: 'DISPONÍVEL', locked: 'BLOQUEADA' }
const AREA_TXT = { done: 'CONCLUÍDA', open: 'DISPONÍVEL', locked: 'BLOQUEADA', soon: 'EM BREVE' }

function loadPx(name: string): Promise<Uint8ClampedArray> {
  return new Promise((ok, no) => {
    const im = new Image()
    im.onload = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d')!; x.drawImage(im, 0, 0); ok(x.getImageData(0, 0, W, H).data) }
    im.onerror = () => no(new Error(name)); im.src = MAP.assets + name + '.png'
  })
}
const px = (o: Uint8ClampedArray, x: number, y: number, c: RGB) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const q = (y * W + x) * 4; o[q] = c[0]; o[q + 1] = c[1]; o[q + 2] = c[2] }
type Box = [number, number, number, number]
function bboxOf(mask: Uint8ClampedArray, val: number, div: number): Box {
  let x0 = W, y0 = H, x1 = 0, y1 = 0
  for (let p = 0; p < W * H; p++) if (Math.round(mask[p * 4] / div) === val) { const x = p % W, y = (p / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  return [x0 - 3, y0 - 3, x1 + 3, y1 + 3]
}
/** contorno de uma região da máscara: r1 = pixels encostados por fora, r2 = a 2 px */
function ringOf(mask: Uint8ClampedArray, val: number, div: number, [x0, y0, x1, y1]: Box) {
  const r1: number[] = [], r2: number[] = []
  for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
    const p = y * W + x; if (Math.round(mask[p * 4] / div) === val) continue
    let d = 9
    for (let dy = -2; dy <= 2 && d > 1; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; if (Math.round(mask[(yy * W + xx) * 4] / div) === val) d = Math.min(d, Math.max(Math.abs(dx), Math.abs(dy))) }
    if (d === 1) r1.push(p); else if (d === 2) r2.push(p)
  }
  return { r1, r2 }
}

type Props = { progress: Progress; initialView?: MapView; onArea: (a: Area) => void; onBack: () => void }
export default function StateMap({ progress, initialView = 'overview', onArea, onBack }: Props) {
  const cv = useRef<HTMLCanvasElement>(null)
  const [D, setD] = useState<Data | null>(null), [err, setErr] = useState('')
  const [view, setView] = useState<MapView>(initialView), [grp, setGrp] = useState<GroupId>('arco1')
  const [sel, setSel] = useState<string | null>(null), [hov, setHov] = useState<string | null>(null)
  const [aSel, setASel] = useState<number | null>(null), [aHov, setAHov] = useState<number | null>(null)
  const [tick, setTick] = useState(0), [msg, setMsg] = useState('')
  const recife = cityOf('REC')!, areas = recife.areas ?? []
  const states = useMemo(() => Object.fromEntries(CITIES.map(c => [c.code, cityState(progress, c)])) as Record<string, CityState>, [progress])
  const aStates = useMemo(() => areas.map(a => areaStatus(progress, a)), [areas, progress])
  const BB = useMemo(() => (D ? Object.fromEntries(CITIES.map(c => [c.code, bboxOf(D.tidx, c.region, 1)])) as Record<string, Box> : {}), [D])
  const aBB = useMemo(() => (D ? areas.map((_, i) => bboxOf(D.aidx, i + 1, 60)) : []), [D, areas])
  const ring = useMemo(() => (D && sel ? ringOf(D.tidx, cityOf(sel)!.region, 1, BB[sel]) : null), [D, sel, BB])
  const aRing = useMemo(() => (D && aSel ? ringOf(D.aidx, aSel, 60, aBB[aSel - 1]) : null), [D, aSel, aBB])
  const hRing = useMemo(() => (D && aHov && aHov !== aSel ? ringOf(D.aidx, aHov, 60, aBB[aHov - 1]) : null), [D, aHov, aSel, aBB])

  useEffect(() => {
    let live = true; const keys = Object.keys(FILES) as (keyof typeof FILES)[]
    Promise.all(keys.map(k => loadPx(FILES[k]))).then(a => { if (live) setD(Object.fromEntries(keys.map((k, i) => [k, a[i]])) as Data) }).catch(e => { if (live) setErr(`Não foi possível carregar o mapa (${e.message}).`) })
    return () => { live = false }
  }, [])
  useEffect(() => { cv.current?.focus() }, [D])
  useEffect(() => {
    if (!((view === 'arco1' && sel) || (view === 'recife' && aSel))) return
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = window.setInterval(() => setTick(k => (k + 1) % 4), 160); return () => window.clearInterval(t)
  }, [view, sel, aSel])

  /* ---------- desenho ---------- */
  useEffect(() => {
    const c = cv.current; if (!c || !D) return
    const ctx = c.getContext('2d')!, img = ctx.createImageData(W, H), o = img.data
    const paint = (ps: number[], col: RGB) => { for (const p of ps) { const q = p * 4; o[q] = col[0]; o[q + 1] = col[1]; o[q + 2] = col[2] } }
    const dashed = (ps: number[], a: RGB, b: RGB) => { for (const p of ps) { const q = p * 4, col = ((((p % W) + ((p / W) | 0) + tick) >> 1) % 2 === 0) ? a : b; o[q] = col[0]; o[q + 1] = col[1]; o[q + 2] = col[2] } }
    if (view === 'overview') o.set(D[('ov_' + grp) as keyof Data])
    else if (view === 'sertao' || view === 'saofrancisco') o.set(D[('rg_' + view) as keyof Data])
    else if (view === 'recife') {
      o.set(D.rec)
      /* a arte provisória traz só a Área 1 colorida; as outras áreas já liberadas no jogo ganham a mesma cor de "disponível" */
      aStates.forEach((st, i) => { if (i === 0 || (st !== 'open' && st !== 'done')) return; const [x0, y0, x1, y1] = aBB[i]
        for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) { const q = (y * W + x) * 4
          if (Math.round(D.aidx[q] / 60) !== i + 1) continue
          const r = o[q], g = o[q + 1], b = o[q + 2]; if (r < 60 || Math.max(r, g, b) - Math.min(r, g, b) > 60) continue   // mantém contorno, água e marcadores
          o[q] = (r + AREA_ON[0]) >> 1; o[q + 1] = (g + AREA_ON[1]) >> 1; o[q + 2] = (b + AREA_ON[2]) >> 1 } })
      if (hRing) paint(hRing.r1, WHITE)
      if (aRing) { paint(aRing.r2, INK); dashed(aRing.r1, WHITE, ROUTE_RGB) }
    } else {
      o.set(D.arco)
      const lit = (code: string | null) => { if (!code) return; const k = cityOf(code)!.region, [x0, y0, x1, y1] = BB[code]
        for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) { const q = (y * W + x) * 4; if (D.tidx[q] === k) { o[q] = o[q] * .6 + 102; o[q + 1] = o[q + 1] * .6 + 102; o[q + 2] = o[q + 2] * .6 + 102 } } }
      lit(hov); if (sel !== hov) lit(sel)
      if (ring) dashed(ring.r1, WHITE, INK)
      /* pontos azuis do mesmo tamanho; cadeado ao lado dos bloqueados; a bandeirinha das concluídas é desenhada por último, por cima */
      const R = 10
      for (const pass of [0, 1]) for (const ct of CITIES) {
        const st = states[ct.code], [x, y] = ct.point, isSel = ct.code === sel, isHov = ct.code === hov, pulse = isSel && tick % 2 === 0 ? 1 : 0, asFlag = st === 'done'
        if (asFlag !== (pass === 1)) continue
        for (let dy = -R - 4; dy <= R + 4; dy++) for (let dx = -R - 4; dx <= R + 4; dx++) { const d2 = dx * dx + dy * dy
          if ((isSel || isHov) && (R + 1) ** 2 < d2 && d2 <= (R + 3 + pulse) ** 2) px(o, x + dx, y + dy, WHITE)
          else if (asFlag) continue
          else if (R * R < d2 && d2 <= (R + 1) ** 2) px(o, x + dx, y + dy, INK)
          else if (d2 <= R * R) px(o, x + dx, y + dy, BLUE) }
        if (asFlag) { const cm: Record<string, RGB> = { k: INK, r: RED, y: [255, 224, 120] }; FLAG.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') px(o, x - 7 + i, y - 15 + j, cm[ch]) })) }
        if (st === 'locked') { const cm: Record<string, RGB> = { k: INK, Y: GOLD, q: [185, 131, 42] }; LOCK.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') px(o, x + R + 4 + i, y - 1 + j, cm[ch]) })) }
      }
    }
    ctx.putImageData(img, 0, 0)
  }, [D, view, grp, sel, hov, aSel, aHov, tick, states, aStates, BB, aBB, ring, aRing, hRing])

  /* ---------- navegação ---------- */
  const go = useCallback((v: MapView) => { setView(v); setSel(null); setHov(null); setASel(null); setAHov(null); setMsg('') }, [])
  const back = useCallback(() => { if (view === 'recife') go('arco1'); else if (view === 'overview') onBack(); else { setGrp(view); go('overview') } }, [view, go, onBack])
  const pick = (code: string | null) => { setSel(code); setMsg('') }
  const enter = () => {
    const c = sel && cityOf(sel); if (!c || states[c.code] === 'locked') return
    if (c.areas) go('recife'); else setMsg('O mapa local desta cidade ainda não foi desenhado. Em breve!')
  }
  const enterArea = () => { if (aSel && (aStates[aSel - 1] === 'open' || aStates[aSel - 1] === 'done')) onArea(areas[aSel - 1]) }
  const at = (e: { clientX: number; clientY: number }): [number, number] => { const r = cv.current!.getBoundingClientRect(); return [Math.max(0, Math.min(W - 1, Math.floor((e.clientX - r.left) / r.width * W))), Math.max(0, Math.min(H - 1, Math.floor((e.clientY - r.top) / r.height * H)))] }
  const groupAt = (x: number, y: number) => (D ? GROUP_OF[Math.round(D.ovidx[(y * W + x) * 4] / 40)] ?? null : null)
  const areaAt = (x: number, y: number) => (D ? Math.round(D.aidx[(y * W + x) * 4] / 60) || null : null)
  const nearest = (x: number, y: number) => { let best: string | null = null, bd = 18 * 18; for (const c of CITIES) { const d = (c.point[0] - x) ** 2 + (c.point[1] - y) ** 2; if (d < bd) { bd = d; best = c.code } } return best }
  const onMove = (e: React.MouseEvent) => {
    if (!D) return; const [x, y] = at(e), el = cv.current!
    if (view === 'overview') { const g = groupAt(x, y); el.style.cursor = g ? 'pointer' : 'default'; if (g && g !== grp) setGrp(g) }
    else if (view === 'arco1') { const id = nearest(x, y); el.style.cursor = id ? 'pointer' : 'default'; if (id !== hov) setHov(id) }
    else if (view === 'recife') { const a = areaAt(x, y); el.style.cursor = a ? 'pointer' : 'default'; if (a !== aHov) setAHov(a) }
    else el.style.cursor = 'pointer'
  }
  const onClick = (e: React.MouseEvent) => {
    if (!D) return; const [x, y] = at(e)
    /* clicar numa região abre A PRÓPRIA região (o Sertão abre o Sertão, mesmo bloqueado). No toque não há "passar o mouse":
       o 1º toque destaca o trecho e o 2º entra. */
    if (view === 'overview') { const g = groupAt(x, y); if (!g) return; if (g !== grp) setGrp(g); else go(g) }
    else if (view === 'sertao' || view === 'saofrancisco') back()
    else if (view === 'arco1') { const id = nearest(x, y); if (id && id === sel) enter(); else pick(id) }
    else if (view === 'recife') { const a = areaAt(x, y); if (a && a === aSel) enterArea(); else setASel(a) }
  }
  const onKey = (e: React.KeyboardEvent) => {
    const dir = ({ ArrowUp: 'cima', ArrowDown: 'baixo', ArrowLeft: 'esquerda', ArrowRight: 'direita' } as Record<string, Dir>)[e.key]
    if (e.key === 'Escape') { e.preventDefault(); back(); return }
    if (view === 'overview') {
      if (dir) { e.preventDefault(); const i = GROUP_IDS.indexOf(grp), n = dir === 'esquerda' || dir === 'baixo' ? 1 : -1; setGrp(GROUP_IDS[(i + n + GROUP_IDS.length) % GROUP_IDS.length]) }  // arco1 fica a leste; sertão e São Francisco a oeste
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(grp) }
    } else if (view === 'arco1') {
      if (dir) { e.preventDefault(); const n = sel ? cityOf(sel)!.neighbors[dir] : 'REC'; if (n) pick(n) }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enter() }
    } else if (view === 'recife') {
      if (dir) { e.preventDefault(); const n = areas.length, d = dir === 'direita' || dir === 'baixo' ? 1 : -1; setASel(a => (a ? ((a - 1 + d + n) % n) + 1 : 1)) }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enterArea() }
    } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); back() }
  }

  /* ---------- cartão de informação ---------- */
  const city: City | null = view === 'arco1' && sel ? cityOf(sel)! : null
  const seals = sealsOf(progress).length
  let card: JSX.Element
  if (view === 'overview') { const g = GROUPS[grp]
    card = <><p className="kicker">Estado inteiro</p><h3>{g.name}</h3><p>{g.blurb}</p>
      <div className="pe-row"><span className={'pe-pill ' + (g.available ? 'available' : 'locked')}>{g.available ? 'DISPONÍVEL' : 'INDISPONÍVEL'}</span></div>
      <div className="pe-acts"><button className={'btn' + (g.available ? '' : ' alt')} onClick={() => go(grp)}>{g.available ? 'Entrar no Arco 1' : 'Ver região'}</button></div></>
  } else if (view === 'sertao' || view === 'saofrancisco') {
    card = <><p className="kicker">Região</p><h3>{GROUPS[view].name}</h3><p>Esta região faz parte de um próximo trecho da aventura.</p>
      <div className="pe-row"><span className="pe-pill locked">INDISPONÍVEL</span></div>
      <div className="pe-acts"><button className="btn alt" onClick={back}>◀ Estado inteiro</button></div></>
  } else if (view === 'recife') { const a = aSel ? areas[aSel - 1] : null, st = aSel ? aStates[aSel - 1] : null, w = a && WORLDS.find(x => x.id === a.worldId), ls = w ? levelsOf(w) : []
    card = <><p className="kicker">Recife · escolha uma área</p>
      {!a || !st ? <><h3>Recife</h3><p>Quatro áreas. Clique numa área do mapa para ver as fases.</p></>
        : <><h3>Área {aSel} · {a.name}</h3><div className="pe-row"><span className={'pe-pill ' + st}>{AREA_TXT[st]}</span>{st !== 'soon' && <span>{areaState(progress, a).done}/3 fases</span>}</div>
          <p>{st === 'soon' ? 'Em breve: esta área ainda não tem fases.' : st === 'locked' ? 'Conclua a área anterior para liberar.' : `${w!.name} · ${w!.discipline}. ${a.blurb}`}</p>
          {st !== 'soon' && <ul className="pe-phases">{ls.map(l => <li key={l.id}>{labelOf(l)} · {l.title}{progress.levels[l.id]?.done ? ' ✓' : ''}</li>)}</ul>}</>}
      <div className="pe-acts">{a && <button className="btn" disabled={st !== 'open' && st !== 'done'} onClick={enterArea}>Entrar na área</button>}<button className="btn alt" onClick={back}>◀ Pernambuco</button></div></>
  } else if (!city) {
    card = <><p className="kicker">Arco 1 · escolha um ponto</p><h3>Escolha uma cidade</h3>
      <p>Clique num ponto azul. Os pontos com cadeado ao lado ainda estão bloqueados. Cidades concluídas aparecem com uma bandeirinha no lugar do ponto.</p>
      <div className="pe-row"><span>Selos de rota: {seals}/{SEALS.length}</span></div>
      <div className="pe-acts"><button className="btn alt" onClick={back}>◀ Estado inteiro</button></div></>
  } else { const st = states[city.code]
    const why = st !== 'locked' ? '' : city.code === FINAL ? ` Bloqueada: precisa dos selos de ${SEALS.map(s => cityOf(s)!.name).join(', ').replace(/, ([^,]*)$/, ' e $1')} (${seals}/${SEALS.length}).` : ` Bloqueada: conclua ${prevOf(city.code).map(x => cityOf(x)!.name).join(' ou ')}.`
    card = <><p className="kicker">Arco 1 · escolha um ponto</p><h3>{city.title}</h3>{city.inclui && <p className="inclui">{city.inclui}</p>}
      <div className="pe-row">{city.routes.map(r => <span key={r} className={'pe-chip ' + r}>ROTA {ROUTES[r].name.toUpperCase()}</span>)}{OPTIONAL.includes(city.code) && <span className="pe-pill soon">PARADA OPCIONAL</span>}</div>
      <p>{city.blurb}{why}</p>
      <div className="pe-row"><span className={'pe-pill ' + st}>{ST_TXT[st]}</span><span>{st === 'done' ? `Você ganhou: ${rewardOf(city)}` : `Ao concluir: ${rewardOf(city)}`}</span></div>
      {msg && <p role="status">{msg}</p>}
      <div className="pe-acts"><button className="btn" disabled={st === 'locked'} onClick={enter}>Entrar</button><button className="btn alt" onClick={back}>◀ Estado inteiro</button></div></>
  }

  return (
    <main className="statemap">
      <header className="map-top"><button className="btn alt" onClick={back}>◀ Voltar</button><h1>PERNAMBUCO</h1></header>
      <div className="pe">
        <canvas ref={cv} width={W} height={H} tabIndex={0} aria-label="Mapa de Pernambuco: escolha uma região, depois um ponto de cidade e uma área" onMouseMove={onMove} onMouseLeave={() => { setHov(null); setAHov(null) }} onClick={onClick} onKeyDown={onKey} />
        <p className="pe-hint">{err || (D ? HINT[view] : 'Carregando…')}</p>
      </div>
      <section className="info" aria-live="polite">{card}</section>
    </main>)
}
