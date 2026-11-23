import { useState } from 'react'
import { CHARS, otherChar, loadChar, saveChar, type CharId } from './game/characters'
import { Blocks, Icon, Stripes } from './ui/Brand'
/** ilustração oficial (pitch) + o sprite que o jogador vai ver na fase */
const ART: Record<CharId, string> = { pedroca: '/assets/marca/pedroca-ilustracao.png', renata: '/assets/marca/renata-ilustracao.png' }
const SPRITE: Record<CharId, string> = { pedroca: '/assets/original/ui/ped_portrait.png', renata: '/assets/original/ui/ren_portrait.png' }
const BLURB: Record<CharId, string> = { pedroca: 'Protagonista do jogo. Representa o brega-funk.', renata: 'Parceira de aventura, direto do Recife.' }
export default function CharSelect({ onConfirm, onBack }: { onConfirm: (c: CharId) => void; onBack: () => void }) {
  const [sel, setSel] = useState<CharId>(loadChar)
  return (
    <main className="select vp-backdrop">
      <Stripes corner="tr" /><Blocks a="green" b="blue" pos="bl" />
      <header className="scr-top"><button className="btn alt sm" onClick={onBack}><Icon name="back" size={16} />Voltar</button>
        <img className="logo sm" src="/assets/original/ui/logo_crop.png" alt="Vem Pedroca" /></header>
      <div className="scr-head"><h1 className="vp-h1">Escolha seu personagem</h1><p className="vp-sub">Quem vai explorar Pernambuco?</p></div>
      <div className="chars" role="radiogroup" aria-label="Personagem">
        {(['pedroca', 'renata'] as CharId[]).map(id => (
          <button key={id} role="radio" aria-checked={sel === id} className={'char ' + id + (sel === id ? ' on' : '')} onClick={() => setSel(id)}>
            <span className="char-bg" aria-hidden />
            <img className="char-art" src={ART[id]} alt="" />
            <span className="char-info">
              <span className="char-name">{CHARS[id].name}</span>
              <small>{BLURB[id]}</small>
              <span className="char-sprite"><img src={SPRITE[id]} alt="" />no jogo</span>
            </span>
            <span className="char-pick" aria-hidden>{sel === id ? <><Icon name="check" size={16} />Escolhido</> : 'Escolher'}</span>
          </button>))}
      </div>
      <p className="char-comp"><b>{CHARS[otherChar(sel)].name}</b> vai junto como acompanhante.</p>
      <div className="acts"><button className="btn xl" onClick={() => { saveChar(sel); onConfirm(sel) }}>Começar com {CHARS[sel].name}<Icon name="arrow" size={22} /></button></div>
    </main>)
}
