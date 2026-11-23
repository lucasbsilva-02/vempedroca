/* Vem Pedroca — elementos gráficos da marca, tirados do pitch oficial (docs/design-system.md).
   Tudo é CSS/SVG desenhado aqui: nenhum personagem ou cenário é redesenhado. As ilustrações oficiais
   (public/assets/marca) e os sprites (public/assets/original) entram como estão. */
import type { CSSProperties, ReactNode } from 'react'

/** faixas diagonais do canto (pitch: ciano, coral e amarelo saindo do canto superior direito) */
export function Stripes({ corner = 'tr', size = 'md' }: { corner?: 'tr' | 'bl' | 'br' | 'tl'; size?: 'sm' | 'md' | 'lg' }) {
  return <div className={`vp-stripes ${corner} ${size}`} aria-hidden><i className="c1" /><i className="c2" /><i className="c3" /></div>
}

/** par de blocos (pitch: um bloco largo e um estreito, nos cantos das páginas) */
export function Blocks({ a = 'blue', b = 'yellow', pos, style }: { a?: Tone; b?: Tone; pos?: string; style?: CSSProperties }) {
  return <div className={'vp-blocks ' + (pos ?? '')} style={style} aria-hidden><i className={'t-' + a} /><i className={'t-' + b} /></div>
}
export type Tone = 'coral' | 'red' | 'blue' | 'cyan' | 'yellow' | 'green' | 'purple' | 'ink' | 'paper'

/** ondas da camisa de Pedroca e Renata: amarelo, roxo, vermelho, verde e azul */
export function Waves({ className = '', height = 18 }: { className?: string; height?: number }) {
  const cols = ['var(--vp-yellow)', 'var(--vp-purple)', 'var(--vp-red)', 'var(--vp-green)', 'var(--vp-blue)']
  return (
    <svg className={'vp-waves ' + className} viewBox="0 0 240 30" preserveAspectRatio="none" height={height} aria-hidden>
      {cols.map((c, i) => <path key={i} d={`M0 ${7 + i * 4} C40 ${-3 + i * 4} 80 ${19 + i * 4} 120 ${9 + i * 4} S200 ${-1 + i * 4} 240 ${9 + i * 4}`} fill="none" stroke={c} strokeWidth="3.2" />)}
    </svg>)
}

/** arcos concêntricos vermelho, verde e amarelo (pitch, página de contato) */
export function Arcs({ className = '' }: { className?: string }) {
  return (
    <svg className={'vp-arcs ' + className} viewBox="0 0 400 400" aria-hidden>
      <circle cx="400" cy="200" r="330" fill="none" stroke="var(--vp-red)" strokeWidth="50" />
      <circle cx="400" cy="200" r="280" fill="none" stroke="var(--vp-green)" strokeWidth="50" />
      <circle cx="400" cy="200" r="230" fill="none" stroke="var(--vp-amber)" strokeWidth="50" />
    </svg>)
}

/** linhas paralelas creme com pontas redondas (pitch: "trilhas" no fundo das páginas) */
export function Trails({ className = '' }: { className?: string }) {
  const n = 7
  return (
    <svg className={'vp-trails ' + className} viewBox="0 0 400 300" preserveAspectRatio="xMaxYMax slice" aria-hidden>
      {Array.from({ length: n }, (_, i) => { const o = i * 14
        return <g key={i}><path d={`M${40 + o} 300 V${200 - o * .4} Q${40 + o} ${170 - o * .4} ${70 + o} ${160 - o * .5} L${250 + o} ${90 - o * .6} Q${280 + o} ${80 - o * .6} ${280 + o} ${50 - o * .6} V${-10}`} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /><circle cx={40 + o} cy="292" r="5" fill="currentColor" /></g> })}
    </svg>)
}

/** título no estilo do logotipo: cada palavra num bloco colorido levemente inclinado */
export function BlockTitle({ words, as: Tag = 'h1', className = '' }: { words: [string, Tone][]; as?: 'h1' | 'h2'; className?: string }) {
  return <Tag className={'vp-blocktitle ' + className}>{words.map(([w, t], i) => <span key={i} className={'t-' + t} style={{ ['--r' as string]: `${(i % 2 ? 1.6 : -1.8)}deg` }}>{w}</span>)}</Tag>
}

/* ---------- ícones em pixel (12×12, contorno preto como os sprites do jogo) ----------
   k = contorno, w = branco; as outras letras são cores da marca. Cada linha da grade é uma linha de pixels. */
export type IconName = 'heart' | 'qblock' | 'star' | 'star-off' | 'bulb' | 'lens' | 'pad' | 'check' | 'cross' | 'lock' | 'flag' | 'pause' | 'sound' | 'mute' | 'back' | 'map' | 'restart' | 'play' | 'trophy' | 'full' | 'arrow' | 'bus'
const PAL: Record<string, string> = { k: 'var(--vp-ink)', w: '#fff', r: 'var(--vp-red)', c: 'var(--vp-coral)', y: 'var(--vp-yellow)', a: 'var(--vp-amber)', g: 'var(--vp-green)', b: 'var(--vp-blue)', s: 'var(--vp-cyan)', p: '#ffb3a8', q: '#c9c2b0', l: '#bfe9f6', o: '#a0612f' }
const G: Record<IconName, string[]> = {
  heart:   ['............', '.kkk...kkk..', 'krrrk.krrrk.', 'krprrkrrrrk.', 'krrrrrrrrrk.', 'krrrrrrrrrk.', '.krrrrrrrk..', '..krrrrrk...', '...krrrk....', '....krk.....', '.....k......', '............'],
  qblock:  ['kkkkkkkkkkkk', 'kaaaaaaaaaak', 'kaaakkkkaaak', 'kaakaaaakaak', 'kaaaaaaakaak', 'kaaaaaakaaak', 'kaaaaakaaaak', 'kaaaaakaaaak', 'kaaaaaaaaaak', 'kaaaaakaaaak', 'kaaaaaaaaaak', 'kkkkkkkkkkkk'],
  star:    ['.....kk.....', '....kyyk....', '....kyyk....', 'kkkkkyykkkkk', 'kyyyyyyyyyyk', '.kyyyyyyyyk.', '..kyyyyyyk..', '..kyyyyyyk..', '.kyyykkyyyk.', '.kyykk.kyyk.', 'kyyk....kyyk', 'kkk......kkk'],
  'star-off': ['.....kk.....', '....kqqk....', '....kqqk....', 'kkkkkqqkkkkk', 'kqqqqqqqqqqk', '.kqqqqqqqqk.', '..kqqqqqqk..', '..kqqqqqqk..', '.kqqqkkqqqk.', '.kqqkk.kqqk.', 'kqqk....kqqk', 'kkk......kkk'],
  bulb:    ['...kkkkkk...', '..kyyyyyyk..', '.kywwyyyyyk.', '.kywyyyyyyk.', '.kyyyyyyyyk.', '.kyyyyyyyyk.', '..kyyyyyyk..', '...kyyyyk...', '...kkkkkk...', '...kqqqqk...', '...kkkkkk...', '....kkkk....'],
  lens:    ['..kkkkk.....', '.klllllk....', 'kllwllllk...', 'klwlllllk...', 'klllllllk...', 'klllllllk...', '.klllllk....', '..kkkkkgk...', '.......kggk.', '........kggk', '.........kgk', '..........k.'],
  pad:     ['............', '..kkkkkkkk..', '.krrrrrrrrk.', 'krrwrrrrwrrk', 'krwwwrrwrwrk', 'krrwrrrrwrrk', 'krrrrrrrrrrk', 'krrrkkkkrrrk', 'krrk....krrk', '.kk......kk.', '............', '............'],
  check:   ['............', '..........kk', '.........kgk', '........kggk', '.......kggk.', 'kk....kggk..', 'kgk..kggk...', 'kggkkggk....', '.kgggggk....', '..kgggk.....', '...kkk......', '............'],
  cross:   ['............', '.kk......kk.', 'krrk....krrk', '.krrk..krrk.', '..krrkkrrk..', '...krrrrk...', '...krrrrk...', '..krrkkrrk..', '.krrk..krrk.', 'krrk....krrk', '.kk......kk.', '............'],
  lock:    ['...kkkkkk...', '..kk....kk..', '..k......k..', '..k......k..', '.kkkkkkkkkk.', '.kaaaaaaaak.', '.kaaaakaaak.', '.kaaakkkaak.', '.kaaaakaaak.', '.kaaaaaaaak.', '.kkkkkkkkkk.', '............'],
  flag:    ['kk..........', 'kkkkkkkkkkk.', 'kkrrrrrrrrk.', 'kkrryrrrrk..', 'kkrrrrrrk...', 'kkrrrrryrk..', 'kkrrrrrrrrk.', 'kkkkkkkkkkk.', 'kk..........', 'kk..........', 'kk..........', 'kkkk........'],
  pause:   ['............', '.kkkk..kkkk.', '.kwwk..kwwk.', '.kwwk..kwwk.', '.kwwk..kwwk.', '.kwwk..kwwk.', '.kwwk..kwwk.', '.kwwk..kwwk.', '.kwwk..kwwk.', '.kwwk..kwwk.', '.kkkk..kkkk.', '............'],
  sound:   ['............', '.....kk.....', '....kbk..k..', 'kkkkbbk...k.', 'kbbbbbk.k.k.', 'kbbbbbk.k.k.', 'kbbbbbk.k.k.', 'kkkkbbk...k.', '....kbk..k..', '.....kk.....', '............', '............'],
  mute:    ['............', '.....kk.....', '....kqk.....', 'kkkkqqk.k..k', 'kqqqqqk..kk.', 'kqqqqqk..kk.', 'kqqqqqk.k..k', 'kkkkqqk.....', '....kqk.....', '.....kk.....', '............', '............'],
  back:    ['............', '.....kk.....', '....kwk.....', '...kwwkkkkk.', '..kwwwwwwwk.', '.kwwwwwwwwk.', '.kwwwwwwwwk.', '..kwwwwwwwk.', '...kwwkkkkk.', '....kwk.....', '.....kk.....', '............'],
  arrow:   ['............', '.....kk.....', '.....kwk....', '.kkkkkwwk...', '.kwwwwwwwk..', '.kwwwwwwwwk.', '.kwwwwwwwwk.', '.kwwwwwwwk..', '.kkkkkwwk...', '.....kwk....', '.....kk.....', '............'],
  map:     ['............', 'kkkkkkkkkkkk', 'kllkyyyykggk', 'kllkyyyykggk', 'kllkyrrykggk', 'kllkyrrykggk', 'kllkyyyykggk', 'kllkyyyykggk', 'kllkyyyykggk', 'kkkkkkkkkkkk', '............', '............'],
  restart: ['............', '...kkkkk.k..', '..kwwwwwkwk.', '.kwwkkkwwwk.', '.kwk...kwwk.', '.kwk..kkkkk.', '.kwk........', '.kwk....kk..', '.kwwkkkkwk..', '..kwwwwwwk..', '...kkkkkk...', '............'],
  play:    ['..kk........', '..kgkk......', '..kgggkk....', '..kgggggkk..', '..kgggggggk.', '..kgggggggk.', '..kgggggkk..', '..kgggkk....', '..kgkk......', '..kk........', '............', '............'],
  trophy:  ['kkkkkkkkkkkk', 'kaaaaaaaaaak', 'kakaawaaakak', 'kakaawaaakak', '.kkaaaaaakk.', '...kaaaak...', '....kaak....', '.....kk.....', '....kaak....', '...kaaaak...', '..kkkkkkkk..', '............'],
  bus:     ['............', '.kkkkkkkkkk.', 'kbbbbbbbbbbk', 'kbllkbllkbbk', 'kbllkbllkbbk', 'kbbbbbbbbbbk', 'kbbbbbbbbbbk', 'kyybbbbbbyyk', 'kkkkkkkkkkkk', '.kk......kk.', '............', '............'],
  full:    ['kkkk....kkkk', 'kwwk....kwwk', 'kwk......kwk', 'kk........kk', '............', '............', '............', '............', 'kk........kk', 'kwk......kwk', 'kwwk....kwwk', 'kkkk....kkkk'],
}
export function Icon({ name, size = 20, title, className = '' }: { name: IconName; size?: number; title?: string; className?: string }) {
  const rects: JSX.Element[] = []
  G[name].forEach((row, y) => { for (let x = 0; x < row.length;) { const ch = row[x]; if (ch === '.') { x++; continue } let w = 1; while (row[x + w] === ch) w++; rects.push(<rect key={x + '-' + y} x={x} y={y} width={w} height={1} fill={PAL[ch]} />); x += w } })
  return (
    <svg className={'vp-icon ' + className} width={size} height={size} viewBox="0 0 12 12" shapeRendering="crispEdges" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>{rects}</svg>)
}

/** linha de estrelas (★ e ☆ com forma diferente, não só cor) */
export function Stars({ n, of = 3, size = 22 }: { n: number; of?: number; size?: number }) {
  return <span className="vp-stars" role="img" aria-label={`${n} de ${of} estrelas`}>{Array.from({ length: of }, (_, i) => <Icon key={i} name={i < n ? 'star' : 'star-off'} size={size} />)}</span>
}

/** fundo das telas de fora da fase: papel branco, trilhas creme, faixas e blocos da marca */
export function Backdrop({ children, className = '', stripes = true }: { children: ReactNode; className?: string; stripes?: boolean }) {
  return (
    <div className={'vp-backdrop ' + className}>
      <Trails className="tr-a" /><Trails className="tr-b" />
      {stripes && <Stripes corner="tr" />}
      {children}
    </div>)
}
