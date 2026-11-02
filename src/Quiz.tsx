import { useState } from 'react'
import type { Question } from './types'
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
  if (state === 'attacking') return <div className="peek" role="status"><b>Acertou!</b> Murro de Cultura!</div>
  return (
    <div className={'panel quiz' + (variant === 'boss' ? ' boss' : '')} role="dialog" aria-label={title}>
      <div className="who">{portrait && i === 0 && <img src={portrait} alt="" />}<div><p className="kicker">{title}</p>
        {i === 0 && intro && <p className="intro">{intro}</p>}</div></div>
      <p className="qcount">Pergunta {i + 1} de {questions.length}</p>
      <p className="prompt">{q.prompt}</p>
      <div className="opts">{q.options.map((o, k) => (
        <button key={k} className={'opt' + (sel === k ? ' sel' : '')} disabled={state === 'right'} onClick={() => { setSel(k); if (state === 'wrong') setState('ask') }}><b>{String.fromCharCode(65 + k)}</b> {o}</button>))}</div>
      {state === 'wrong' && <p className="fb bad">Quase! Vale rever o raciocínio. {q.hint ?? ''} Tente de novo — sem perder vida.</p>}
      {state === 'right' && <p className="fb good">{q.explanation}</p>}
      {hint && state !== 'right' && q.hint && <p className="fb hint">Dica: {q.hint}</p>}
      <div className="acts">
        {state !== 'right' && q.hint && <button className="btn alt" onClick={() => setHint(true)}>Ver dica</button>}
        {state === 'right' ? <button className="btn" onClick={next} autoFocus>{i + 1 >= questions.length ? 'Concluir' : 'Próxima'}</button> : <button className="btn" disabled={sel === null} onClick={check}>Responder</button>}
      </div>
    </div>)
}
