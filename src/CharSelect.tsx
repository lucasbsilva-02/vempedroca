import { useState } from 'react'
import { CHARS, otherChar, loadChar, saveChar, type CharId } from './game/characters'
const PORT: Record<CharId, string> = { pedroca: '/assets/original/ui/ped_portrait.png', renata: '/assets/original/ui/ren_portrait.png' }
const BLURB: Record<CharId, string> = { pedroca: 'Protagonista do jogo. Representa o brega-funk.', renata: 'Parceira de aventura, direto do Recife.' }
export default function CharSelect({ onConfirm, onBack }: { onConfirm: (c: CharId) => void; onBack: () => void }) {
  const [sel, setSel] = useState<CharId>(loadChar)
  return (
    <main className="select">
      <img className="logo sm" src="/assets/original/ui/logo_crop.png" alt="Vem Pedroca" />
      <h1>ESCOLHA SEU PERSONAGEM</h1>
      <div className="chars" role="radiogroup" aria-label="Personagem">
        {(['pedroca', 'renata'] as CharId[]).map(id => (
          <button key={id} role="radio" aria-checked={sel === id} className={'char' + (sel === id ? ' on' : '')} onClick={() => setSel(id)}>
            <img src={PORT[id]} alt={CHARS[id].name} /><b>{CHARS[id].name}</b><small>{BLURB[id]}</small>
            {sel === id && <em>Acompanhante: {CHARS[otherChar(id)].name}</em>}
          </button>))}
      </div>
      <div className="acts"><button className="btn alt" onClick={onBack}>◀ Voltar</button><button className="btn" onClick={() => { saveChar(sel); onConfirm(sel) }}>Começar com {CHARS[sel].name}</button></div>
    </main>)
}
