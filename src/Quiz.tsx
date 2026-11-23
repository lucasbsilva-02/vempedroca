import { useState } from 'react'
import type { Question } from './types'
import { Icon } from './ui/Brand'
/** cada alternativa tem letra E cor: a cor nunca é o único sinal */
const TONES = ['coral', 'blue', 'amber', 'green', 'purple', 'cyan']
type Props = { title: string; intro?: string; portrait?: string; questions: Question[]; need: number; onDone: (r: { correct: number; firstTry: number }) => void; onCorrect?: () => Promise<void> | void; variant?: 'boss' }
export default function Quiz({ title, intro, portrait, questions, need, onDone, onCorrect, variant }: Props) {
  const [i, setI] = useState(0), [sel, setSel] = useState<number | null>(null), [state, setState] = useState<'ask' | 'wrong' | 'attacking' | 'right'>('ask')
  const [hint, setHint] = useState(false), [first, setFirst] = useState(0), [tries, setTries] = useState(0)
  const q = questions[i]
  const check = () => {
    if (sel === null) return
    if (sel === q.correctIndex) { if (tries === 0) setFirst(f => f + 1); if (onCorrect) { setState('attacking'); Promise.resolve(onCorrect()).catch(() => undefined).then(() => setState('right')) } else setState('right') } else { setState('wrong'); setTries(t => t + 1) }
  }
  const next = () => {
    const last = i + 1 >= questions.length
    if (last) onDone({ correct: Math.min(questions.length, Math.max(need, questions.length)), firstTry: first })
    else { setI(i + 1); setSel(null); setState('ask'); setHint(false); setTries(0) }
  }
  if (state === 'attacking') return <div className="peek" role="status"><Icon name="check" size={28} /><span><b>Acertou!</b> Murro de Cultura!</span></div>
  return (
    <div className={'panel quiz' + (variant === 'boss' ? ' boss' : '')} role="dialog" aria-label={title}>
      <div className="quiz-head">
        <div className="who">{portrait && i === 0 && <img src={portrait} alt="" />}<div><p className="kicker">{variant === 'boss' ? null : <Icon name="qblock" size={14} />}{title}</p>
          {i === 0 && intro && <p className="intro">{intro}</p>}</div></div>
        <p className="qcount" aria-label={`Pergunta ${i + 1} de ${questions.length}`}>{questions.length > 1 && <span className="pips" aria-hidden>{questions.map((_, k) => <i key={k} className={k < i ? 'done' : k === i ? 'now' : ''} />)}</span>}Pergunta {i + 1} de {questions.length}</p>
      </div>
      <p className="prompt">{q.prompt}</p>
      <div className="opts" role="radiogroup" aria-label="Alternativas">{q.options.map((o, k) => {
        const mark = state === 'right' && k === q.correctIndex ? 'right' : state === 'wrong' && sel === k ? 'wrong' : ''
        return <button key={k} role="radio" aria-checked={sel === k} className={'opt' + (sel === k ? ' sel' : '') + (mark ? ' ' + mark : '')} style={{ ['--ot' as string]: `var(--vp-${TONES[k % TONES.length]})` }} disabled={state === 'right'} onClick={() => { setSel(k); if (state === 'wrong') setState('ask') }}>
          <b className="opt-l">{String.fromCharCode(65 + k)}</b><span className="opt-t">{o}</span>{mark === 'right' && <Icon name="check" size={20} title="Resposta certa" />}{mark === 'wrong' && <Icon name="cross" size={18} title="Resposta errada" />}</button>
      })}</div>
      {state === 'wrong' && <div className="fb bad" role="status"><Icon name="cross" size={22} /><p><b>Quase!</b> Vale rever o raciocínio. {q.hint ?? ''} Tente de novo — sem perder vida.</p></div>}
      {state === 'right' && <div className="fb good" role="status"><Icon name="lens" size={24} /><p><b>Acertou! Por quê?</b> {q.explanation}</p></div>}
      {hint && state !== 'right' && q.hint && <div className="fb hint"><Icon name="bulb" size={22} /><p><b>Dica:</b> {q.hint}</p></div>}
      <div className="acts">
        {state !== 'right' && q.hint && <button className="btn alt" onClick={() => setHint(true)}><Icon name="bulb" size={18} />Ver dica</button>}
        {state === 'right' ? <button className="btn go" onClick={next} autoFocus>{i + 1 >= questions.length ? 'Concluir' : 'Próxima'}<Icon name="arrow" size={18} /></button> : <button className="btn" disabled={sel === null} onClick={check}>Responder</button>}
      </div>
    </div>)
}
