import { useState } from 'react'
import { WORLDS, LEVELS, levelsOf, labelOf, isUnlocked, continueLevel } from './catalog'
import type { Level, Progress } from './types'
import { Icon, Stars, Stripes } from './ui/Brand'
type Props = { progress: Progress; sound: boolean; onSound: () => void; onPlay: (l: Level) => void; onBack: () => void; worldIds?: string[]; title?: string; backLabel?: string }
export default function WorldMap({ progress, sound, onSound, onPlay, onBack, worldIds, title, backLabel }: Props) {
  const [sel, setSel] = useState<string | null>(null), cont = continueLevel(progress)
  const total = LEVELS.reduce((s, l) => s + (progress.levels[l.id]?.stars ?? 0), 0), done = LEVELS.filter(l => progress.levels[l.id]?.done).length
  return (
    <main className="map vp-backdrop">
      <Stripes corner="tr" size="sm" />
      <header className="map-top"><button className="btn alt sm" onClick={onBack}><Icon name="back" size={16} />{(backLabel ?? 'Voltar').replace('◀ ', '')}</button><div className="scr-head"><h1 className="vp-h1">{title ?? 'MAPA DE MUNDOS'}</h1><p className="vp-sub">Modo lista · todas as fases</p></div>
        <span className="map-sum"><Icon name="trophy" size={18} />{done}/{LEVELS.length} fases · <Icon name="star" size={18} />{total}</span><button className="btn alt sm" onClick={onSound} aria-pressed={sound}><Icon name={sound ? 'sound' : 'mute'} size={16} />Som: {sound ? 'ligado' : 'desligado'}</button></header>
      {cont && <button className="btn go cont" onClick={() => onPlay(cont)}><Icon name="play" size={20} />{progress.levels[cont.id]?.done ? 'Jogar de novo' : 'Continuar'} · {labelOf(cont)} {cont.title}</button>}
      {WORLDS.filter(w => !worldIds || worldIds.includes(w.id)).map((w) => { const ls = levelsOf(w), open = ls.length > 0 && isUnlocked(progress, ls[0]), wd = ls.filter(l => progress.levels[l.id]?.done).length
        return (
          <section key={w.id} className={'world' + (open ? '' : ' closed')} style={{ ['--wc' as string]: w.color }}>
            <div className="world-h"><span className="wnum">{WORLDS.indexOf(w) + 1}</span><div><h2>{w.name}</h2><p>{w.discipline} · {w.blurb}</p></div><span className="chip">{wd}/3</span></div>
            <div className="path">{[1, 2, 3].map(n => { const l = ls.find(x => x.order === n)
              if (!l) return <div key={n} className="node soon" aria-disabled><b>{n}</b><small>em breve</small></div>
              const r = progress.levels[l.id], un = isUnlocked(progress, l), st = r?.done ? 'done' : un ? 'open' : 'locked'
              return <button key={n} className={'node ' + st + (sel === l.id ? ' sel' : '')} disabled={!un} onClick={() => setSel(sel === l.id ? null : l.id)} aria-label={`${l.title} (${st})`}>
                <b>{un ? n : <Icon name="lock" size={24} />}</b><small>{r?.done ? <Stars n={r.stars} size={14} /> : un ? 'jogar' : 'bloqueada'}</small></button> })}</div>
            {ls.filter(l => l.id === sel).map(l => { const r = progress.levels[l.id]; return (
              <div key={l.id} className="info"><p className="kicker">{labelOf(l)} · {l.discipline} · {l.grade}</p><h3>{l.title}</h3><p>{l.objective}</p>
                <p className="stars">{r?.done ? <><Stars n={r.stars} size={18} /> melhor: {r.score} pts</> : 'Ainda não concluída'}</p>
                <button className="btn go" onClick={() => onPlay(l)}><Icon name="play" size={18} />{r?.done ? 'Jogar de novo' : 'Jogar'}</button></div>) })}
          </section>) })}
    </main>)
}
