import { useState } from 'react'
import { CITIES } from './geo'
const X = (lon: number) => ((lon + 41.6) / 7) * 700, Y = (lat: number) => 10 + ((-7 - lat) / 2.8) * 240
/* contorno estilizado de Pernambuco (não cartográfico): [lon, lat] */
const OUTLINE: [number, number][] = [[-41.35, -8.95], [-41.0, -8.4], [-40.6, -8.0], [-40.1, -7.85], [-39.5, -7.75], [-39.0, -7.45], [-38.5, -7.3], [-37.9, -7.3], [-37.3, -7.25], [-36.8, -7.3], [-36.2, -7.4], [-35.6, -7.55], [-35.15, -7.55], [-34.85, -7.7], [-34.85, -8.15], [-35.0, -8.6], [-35.2, -8.95], [-35.6, -9.1], [-36.0, -9.25], [-36.5, -9.4], [-37.1, -9.2], [-37.6, -9.0], [-38.2, -8.85], [-38.8, -8.95], [-39.4, -9.2], [-39.8, -9.4], [-40.4, -9.55], [-40.9, -9.2]]
const PATH = 'M' + OUTLINE.map(([a, b]) => `${X(a).toFixed(0)},${Y(b).toFixed(0)}`).join(' L') + ' Z'
export default function StateMap({ onCity, onBack }: { onCity: (id: string) => void; onBack: () => void }) {
  const [sel, setSel] = useState('recife'), c = CITIES.find(x => x.id === sel)!
  return (
    <main className="statemap">
      <header className="map-top"><button className="btn alt" onClick={onBack}>◀ Voltar</button><h1>PERNAMBUCO</h1></header>
      <p className="sub">Recupere os artefatos da nossa história, cidade por cidade. Hoje só o Recife está disponível.</p>
      <svg viewBox="0 0 700 260" className="pe" role="img" aria-label="Mapa estilizado de Pernambuco">
        <rect x="0" y="0" width="700" height="260" fill="#0b2d5b" />
        <rect x="605" y="0" width="95" height="260" fill="#12468c" />
        {[40, 90, 140, 190, 240].map(y => <path key={y} d={`M610,${y} q8,-6 16,0 t16,0 t16,0 t16,0 t16,0`} stroke="#5fa8ff" strokeWidth="2" fill="none" />)}
        <path d={PATH} fill="#d9a441" stroke="#000" strokeWidth="4" strokeLinejoin="round" />
        <path d={PATH} fill="none" stroke="#6fe0a3" strokeWidth="2" strokeDasharray="2 6" transform="translate(0,-3)" />
        <text x="22" y="24" className="mapt">SERTÃO</text><text x="520" y="24" className="mapt">LITORAL</text>
        {[...CITIES].sort((a, b) => Number(a.available) - Number(b.available)).map(ct => { const x = X(ct.lon), y = Y(ct.lat) + (ct.dy ?? 0), on = ct.available
          return (
            <g key={ct.id} role="button" tabIndex={0} aria-label={ct.name + (on ? '' : ' (em breve)')} className={'city' + (on ? ' on' : '') + (sel === ct.id ? ' sel' : '')} onClick={() => setSel(ct.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSel(ct.id) }}>
              <circle cx={x} cy={y} r={on ? 14 : 9} fill="transparent" />
              <circle cx={x} cy={y} r={on ? 7 : 5} className="dot" />
              <text x={x + 10} y={y + 4} textAnchor="start" className="cname">{ct.name}</text>
            </g>) })}
      </svg>
      <section className="info"><p className="kicker">{c.available ? 'Disponível agora' : 'Em breve — ainda não implementado'}</p><h3>{c.name}</h3>
        <p>{c.available ? c.blurb : 'Esta cidade faz parte da visão final do jogo, mas ainda não tem fases.'}</p>
        {c.available ? <button className="btn" onClick={() => onCity(c.id)}>Explorar {c.name}</button> : <button className="btn alt" disabled>Bloqueada</button>}</section>
    </main>)
}
