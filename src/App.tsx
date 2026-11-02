import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import type { Level, LevelObject, Progress } from './types'
import { GameScene, VH } from './game/GameScene'
import Quiz from './Quiz'
import { loadProgress, saveProgress, loadSound, saveSound } from './progress'
import WorldMap from './WorldMap'
import CharSelect from './CharSelect'
import StateMap from './StateMap'
import Overworld from './Overworld'
import type { Area } from './geo'
import { CHARS, otherChar, loadChar, type CharId } from './game/characters'
import { LEVELS, labelOf, isUnlocked, nextOf } from './catalog'
import { ASSETS } from './game/assets'

const A = '/assets/original/'
type Modal =
  | { kind: 'info'; o: LevelObject } | { kind: 'q'; o: LevelObject } | { kind: 'boss' } | { kind: 'pause' } | { kind: 'leave' }
  | { kind: 'win'; stars: number; score: number; cordel: boolean; artifact: boolean } | { kind: 'cordel'; o: LevelObject } | null

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const isTouch = () => { try { return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window } catch { return false } }

function Play({ level, label, hero, onExit, onWin, onRestart, onNext }: { level: Level; label: string; hero: CharId; onExit: () => void; onWin: (stars: number, score: number, extra: { cordel: boolean; artifact: boolean }) => void; onRestart: () => void; onNext?: () => void }) {
  const stage = useRef<HTMLDivElement>(null), host = useRef<HTMLDivElement>(null), scene = useRef<GameScene | null>(null)
  const [hud, setHud] = useState({ lives: 3, score: 0, coins: 0 })
  const [modal, setModal] = useState<Modal>(null), [toast, setToast] = useState(''), [err, setErr] = useState('')
  const [snd, setSnd] = useState(loadSound), [answered, setAnswered] = useState(0), [boss, setBoss] = useState(false), [intro, setIntro] = useState(false), [touch] = useState(isTouch), [goal, setGoal] = useState(false), winRef = useRef<() => void>(() => {})
  const [cordel, setCordel] = useState(false), [power, setPower] = useState(false), cordelRef = useRef(false)
  cordelRef.current = cordel
  const hasCordel = level.objects.some(o => o.type === 'cordel')
  const [tip, setTip] = useState<{ who: string; text: string } | null>(null), [near, setNear] = useState(false), bossHits = useRef(0), tipT = useRef<number>(0)
  const firstTry = useRef(0), done = useRef<Set<string>>(new Set()), toastT = useRef<number>(0)
  const nBlocks = level.objects.filter(o => o.type === 'question').length, nCoins = level.objects.filter(o => o.type === 'collectible').length

  useEffect(() => {
    const bus = new Phaser.Events.EventEmitter()
    bus.on('hud', setHud)
    bus.on('toast', (t: string) => { setToast(t); window.clearTimeout(toastT.current); toastT.current = window.setTimeout(() => setToast(''), 2000) })
    bus.on('interact', (o: LevelObject) => setModal({ kind: 'info', o }))
    bus.on('question', (o: LevelObject) => setModal({ kind: 'q', o }))
    bus.on('boss', () => { setBoss(true); setModal({ kind: 'boss' }) })
    bus.on('pause', () => { scene.current?.freeze(); setModal({ kind: 'pause' }) })
    bus.on('intro', (v: boolean) => setIntro(v))
    bus.on('goal', (g: string | null) => setGoal(!!g))
    bus.on('cordel', (o: LevelObject) => { setCordel(true); setModal({ kind: 'cordel', o }) })
    bus.on('power', (v: boolean) => setPower(v))
    bus.on('complete', () => winRef.current())  // v8: só depois do embarque e da partida do ônibus
    bus.on('error', setErr)
    bus.on('near', setNear)
    bus.on('tip', (t: { who: string; text: string }) => { setTip(t); window.clearTimeout(tipT.current); tipT.current = window.setTimeout(() => setTip(null), 5200) })
    const game = new Phaser.Game({
      type: Phaser.AUTO, parent: host.current!, backgroundColor: '#14001d', pixelArt: true, roundPixels: true, width: 640, height: VH,
      scale: { mode: Phaser.Scale.NONE }, render: { antialias: false }, scene: [],
    })
    const s = new GameScene(); s.muted = !loadSound(); game.scene.add('game', s, true, { level, bus, hero }); scene.current = s
    if (location.search.includes('debug')) (window as unknown as { __scene: GameScene }).__scene = s

    /* resolução interna fixa 360 de altura; largura se adapta (como no HTML de referência), ampliação inteira quando ≥ 2x */
    const fit = () => {
      const st = stage.current, cv = game.canvas
      if (!st || !cv) return
      const w = st.clientWidth - 4, h = st.clientHeight - 4
      if (w <= 0 || h <= 0) return
      const vw = clamp(Math.round(VH * w / h / 2) * 2, 384, 640)
      s.setViewWidth(vw)
      let k = Math.min(w / vw, h / VH); if (k >= 2 && k - Math.floor(k) < 0.4) k = Math.floor(k)
      cv.style.width = Math.floor(vw * k) + 'px'; cv.style.height = Math.floor(VH * k) + 'px'
    }
    const ro = new ResizeObserver(fit); ro.observe(stage.current!)
    game.events.once('ready', fit); fit(); const t = window.setInterval(fit, 400)
    return () => { window.clearInterval(t); window.clearTimeout(tipT.current); ro.disconnect(); game.destroy(true) }
  }, [level, hero])

  const close = () => { const m = modal; setModal(null); if (m?.kind === 'info') scene.current?.markRead(m.o.id); if (m?.kind === 'pause') scene.current?.thaw(); else scene.current?.unlock() }
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && (modal?.kind === 'pause' || modal?.kind === 'info')) { e.preventDefault(); close() } }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  })

  /* botões de toque: ◀ ▶ formam uma zona só (deslizar o polegar troca de lado); PULAR é separado */
  const dirId = useRef<number | null>(null), jumpId = useRef<number | null>(null), dir = useRef<HTMLDivElement>(null)
  const setDir = (x: number) => {
    const r = dir.current!.getBoundingClientRect(), left = x < r.left + r.width / 2
    scene.current?.press('L', left); scene.current?.press('R', !left)
  }
  const dirProps = {
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); dirId.current = e.pointerId; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setDir(e.clientX) },
    onPointerMove: (e: React.PointerEvent) => { if (e.pointerId === dirId.current) setDir(e.clientX) },
    onPointerUp: (e: React.PointerEvent) => { if (e.pointerId === dirId.current) { dirId.current = null; scene.current?.press('L', false); scene.current?.press('R', false) } },
    onPointerCancel: (e: React.PointerEvent) => { if (e.pointerId === dirId.current) { dirId.current = null; scene.current?.press('L', false); scene.current?.press('R', false) } },
  }
  const jumpProps = {
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); jumpId.current = e.pointerId; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); scene.current?.press('J', true) },
    onPointerUp: (e: React.PointerEvent) => { if (e.pointerId === jumpId.current) { jumpId.current = null; scene.current?.press('J', false) } },
    onPointerCancel: (e: React.PointerEvent) => { if (e.pointerId === jumpId.current) { jumpId.current = null; scene.current?.press('J', false) } },
  }

  const win = () => {
    const s = scene.current!, nQ = level.boss.questions.length + nBlocks
    const stars = 1 + (firstTry.current >= Math.ceil(nQ * 0.6) ? 1 : 0) + (s.collected >= nCoins ? 1 : 0)
    const extra = { cordel: cordelRef.current, artifact: s.artifactGot }
    onWin(stars, s.score, extra); setModal({ kind: 'win', stars, score: s.score, ...extra })
  }
  winRef.current = win
  const open = modal !== null

  return (
    <div className={'game' + (touch ? ' touch' : '')}>
      <header className="hud">
        <span className="chip">{label}</span>
        <span className="chip lives" title="Vidas">♥ {hud.lives}</span>
        <span className="chip" title="Pesos de prata">● {hud.coins}/{nCoins}</span>
        <span className="chip" title="Blocos ? respondidos">? {answered}/{nBlocks}</span>
        <span className="chip pts">{hud.score} PTS</span>
        {boss && !goal && <span className="chip boss">{level.boss.name.toUpperCase()}</span>}
        {goal && <span className="chip goal" title="Objetivo: chegar à estação de ônibus">→ ESTAÇÃO</span>}
        {hasCordel && <span className={'chip' + (cordel ? ' cordel' : '')} title="Cordel escondido desta fase">{cordel ? '✦ CORDEL' : '✧ CORDEL ?'}</span>}
        {power && <span className="chip power" title="Power-up: todas as moedas">{hero === 'pedroca' ? 'PEDROCA RATÃO' : 'RENATA RATA'}</span>}
        <button className="pause" type="button" disabled={!!modal} title={modal ? 'Feche o painel aberto para pausar' : 'Pausar (Esc)'} onClick={() => { if (modal) return; scene.current?.freeze(); setModal({ kind: 'pause' }) }}>II PAUSA</button>
      </header>
      <div className={'stage' + (intro ? ' cine' : '')} ref={stage}>
        <div className="cv" ref={host} />
        {toast && !open && <div className="banner">{toast}</div>}
        {tip && !open && <div className="tip" role="status"><img src={otherChar(hero) === 'renata' ? '/assets/original/ui/ren_portrait.png' : '/assets/original/ui/ped_portrait.png'} alt="" /><div><b>{tip.who}</b><p>{tip.text}</p></div></div>}
        {err && <div className="banner err">{err}</div>}
        {open && <div className="scrim">
          {modal?.kind === 'info' && <div className="panel" role="dialog"><div className="who">
            <img src={A + (modal.o.type === 'npc' ? 'personagens/guarda-pitombaportrait1.png' : (modal.o.asset && ASSETS[modal.o.asset] ? ASSETS[modal.o.asset][0] : 'plataformas_objetos/placa.png'))} alt="" />
            <div><p className="kicker">{modal.o.type === 'npc' ? 'Guarda-Pitomba' : 'Placa'}</p><h2>{modal.o.title}</h2></div></div>
            <p>{modal.o.text}</p><div className="acts"><button className="btn" onClick={close} autoFocus>Continuar</button></div></div>}
          {modal?.kind === 'q' && modal.o.question && <Quiz title={modal.o.title ?? 'Bloco ?'} questions={[modal.o.question]} need={1}
            onDone={r => { done.current.add(modal.o.id); firstTry.current += r.firstTry; setAnswered(done.current.size); scene.current?.markAnswered(modal.o.id); scene.current?.addScore(20); close() }} />}
          {modal?.kind === 'boss' && <Quiz title={`Chefão: ${level.boss.name}`} intro={level.boss.intro} portrait={A + 'chefao/rataobossportrait.png'} questions={level.boss.questions} need={level.boss.requiredCorrect} variant="boss" onCorrect={() => scene.current?.attackBoss(bossHits.current++)}
            onDone={r => { firstTry.current += r.firstTry; scene.current?.addScore(50); setModal(null); scene.current?.defeatBoss() }} />}
          {modal?.kind === 'pause' && <div className="panel" role="dialog"><p className="kicker">Pausa</p><h2>{level.title}</h2><p>{level.narrative}</p>
            <div className="acts col"><button className="btn" onClick={close} autoFocus>Continuar</button>
              <button className="btn alt" onClick={() => { const v = !snd; setSnd(v); saveSound(v); if (scene.current) scene.current.muted = !v }}>Som: {snd ? 'ligado' : 'desligado'}</button>
              <button className="btn alt" onClick={onRestart}>Recomeçar fase</button>
              <button className="btn alt" onClick={() => setModal({ kind: 'leave' })}>Voltar ao mapa</button></div></div>}
          {modal?.kind === 'leave' && <div className="panel" role="dialog"><p className="kicker">Sair da fase?</p><h2>O progresso desta fase será perdido</h2><p>Moedas, perguntas e checkpoints só são salvos quando você conclui a fase.</p>
            <div className="acts"><button className="btn" onClick={() => setModal({ kind: 'pause' })} autoFocus>Continuar jogando</button><button className="btn alt" onClick={onExit}>Sair para o mapa</button></div></div>}
          {modal?.kind === 'cordel' && <div className="panel" role="dialog"><div className="who"><img src={A + 'provisorio/cordel.png'} alt="" />
            <div><p className="kicker">Cordel encontrado! +100</p><h2>{modal.o.title}</h2></div></div>
            <p className="verso">{modal.o.text}</p><div className="acts"><button className="btn" onClick={close} autoFocus>Guardar o cordel</button></div></div>}
          {modal?.kind === 'win' && <div className="panel" role="dialog"><p className="kicker">Fase concluída</p><h2>Vitória! {'★'.repeat(modal.stars)}{'☆'.repeat(3 - modal.stars)}</h2>
            <p>Pontuação: {modal.score}</p>
            {level.artifact && <p className="artefato"><img src={A + 'provisorio/artefato.png'} alt="" /> <span><b>Artefato recuperado:</b> {level.artifact.name}. {level.artifact.text}</span></p>}
            {hasCordel && <p>{modal.cordel ? '✦ Cordel desta fase encontrado!' : '✧ O cordel desta fase continua escondido. Que tal procurar?'}</p>}{level.boss.final && level.boss.ending && <p className="artefato"><span><b>Fim da aventura no Recife!</b> {level.boss.ending}</span></p>}<p><b>O que você aprendeu:</b> {level.objective}</p><div className="acts">{onNext && <button className="btn" onClick={onNext} autoFocus>Próxima fase</button>}<button className="btn alt" onClick={onExit}>Voltar ao mapa</button></div></div>}
        </div>}
      </div>
      {!touch && <footer className="keys" aria-label="Controles">
        <span><img src="/assets/ui/keys-arrows.png" alt="Setas" /><img src="/assets/ui/keys-wasd.png" alt="WASD" /> andar</span>
        <span><img src="/assets/ui/key-space.png" alt="Espaço" /> pular</span>
        <span><kbd>F</kbd> interagir · ESC pausa</span>
      </footer>}
      {touch && <div className="pad" onContextMenu={e => e.preventDefault()}>
        <div className="pad-dir" ref={dir} {...dirProps}><span className="pb">◀</span><span className="pb">▶</span></div>
        <div className="pad-r">{near && <button className="pb act" type="button" onPointerDown={e => { e.preventDefault(); scene.current?.interact() }}>INTERAGIR</button>}<button className="pb jump" type="button" {...jumpProps}>PULAR</button></div>
      </div>}
    </div>)
}

type Screen = 'title' | 'select' | 'state' | 'city' | 'map'
export default function App() {
  const [prog, setProg] = useState<Progress>(loadProgress), [run, setRun] = useState(0), [sound, setSound] = useState(loadSound), [hero, setHero] = useState<CharId>(loadChar)
  const [screen, setScreen] = useState<Screen>(() => (location.search.includes('city') ? 'city' : location.search.includes('map') ? 'state' : 'title')), [city, setCity] = useState('recife'), [area, setArea] = useState<Area | null>(null)
  const [play, setPlay] = useState<Level | null>(() => { const q = new URLSearchParams(location.search); return q.has('play') ? (LEVELS.find(l => l.id === q.get('play')) ?? LEVELS[0]) : null })
  useEffect(() => saveProgress(prog), [prog])
  const start = (l: Level) => { setProg(p => ({ ...p, last: l.id })); setRun(r => r + 1); setPlay(l) }
  const finish = (l: Level, stars: number, score: number, ex: { cordel: boolean; artifact: boolean }) => setProg(p => { const o = p.levels[l.id]; return { ...p, last: l.id, levels: { ...p.levels, [l.id]: { done: true, score: Math.max(score, o?.score ?? 0), stars: Math.max(stars, o?.stars ?? 0), cordel: !!(o?.cordel || ex.cordel), artifact: !!(o?.artifact || ex.artifact) } } } })
  if (play) { const nx = nextOf(play); return <Play key={play.id + ':' + run + ':' + hero} level={play} hero={hero} label={labelOf(play)} onExit={() => { setPlay(null); setScreen('city') }} onRestart={() => setRun(r => r + 1)} onWin={(st, sc, ex) => finish(play, st, sc, ex)} onNext={nx && isUnlocked(prog, nx) ? () => start(nx) : undefined} /> }
  if (screen === 'select') return <CharSelect onConfirm={c => { setHero(c); setScreen('state') }} onBack={() => setScreen('title')} />
  if (screen === 'state') return <StateMap onCity={id => { setCity(id); setScreen('city') }} onBack={() => setScreen('title')} />
  if (screen === 'city') return <Overworld cityId={city} progress={prog} hero={hero} initialArea={area} onArea={setArea} onPlay={start} onBack={() => setScreen('state')} onList={() => { if (!area) setArea(null); setScreen('map') }} />
  if (screen === 'map') return <WorldMap progress={prog} sound={sound} onSound={() => { const v = !sound; setSound(v); saveSound(v) }} onPlay={start} onBack={() => setScreen('city')} backLabel={'◀ Mapa 2.5D'} title={(area?.name ?? 'Recife').toUpperCase()} worldIds={area ? [area.worldId] : undefined} />
  const done = LEVELS.filter(l => prog.levels[l.id]?.done).length, total = LEVELS.reduce((n, l) => n + (prog.levels[l.id]?.stars ?? 0), 0)
  return (
    <main className="title">
      <div className="sky" />
      <img className="logo" src="/assets/original/ui/logo_crop.png" alt="Vem Pedroca" />
      <p className="sub">Aventura educacional por Pernambuco</p>
      <img className="hero" src={A + (hero === 'renata' ? 'personagens/ren_idle1.png' : 'personagens/NEW-pedroca-idle-animation1.png')} alt={CHARS[hero].name} />
      <button className="start" onClick={() => setScreen('select')} aria-label="Jogar"><img src="/assets/ui/start-btn.png" alt="START" /></button>
      <div className="card"><p className="kicker">Recife é a primeira região</p><h2>{done}/{LEVELS.length} fases concluídas</h2><p className="stars">{total > 0 ? `${total} estrelas` : 'Nenhuma estrela ainda'}</p>
        <p className="stars">Artefatos recuperados: {LEVELS.filter(l => prog.levels[l.id]?.artifact).length}/{LEVELS.length} · Cordéis: {LEVELS.filter(l => prog.levels[l.id]?.cordel).length}/{LEVELS.length}</p></div>
    </main>)
}
