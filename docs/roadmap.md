# Roadmap do Vem Pedroca (vivo)

Fontes: GDD original (`Downloads/GDD - Vem Pedroca.pdf`), `docs/gdd-audit.md`, `docs/proposta-level-design.md` (§7) e o estado do código.

**Regra de trabalho (a partir da v14):** cada etapa entrega um conjunto de funcionalidades. Bugs que atrapalham o jogo são corrigidos na hora. Imperfeições menores viram pendência nesta página e não abrem uma nova rodada de ajustes.

## Onde estávamos
| Etapa | Conteúdo | Estado |
|---|---|---|
| 1 — MVP | Plataforma, 6 fases, quiz, chefão, mapa de Pernambuco/Recife, seleção de personagem, ônibus | ✅ (v1–v8) |
| 2 — Level design + mecânicas ambientais | Fases readaptadas (Sonic + Mario), trânsito e semáforos, subsolo, bloqueios educativos, acompanhante orientando | ✅ (v9) |
| Refinamentos visuais | Carros no mesmo chão, animações de ponte e muralha, escala, subsolo no padrão do original, placa de obras | ✅ encerrado na v14 (o resto é pendência) |
| 3 — Objetivos, ameaças e segredos | Artefato por fase, capangas do Ratão, power-up "Pedroca Ratão", cordel escondido por fase | ✅ v14 |
| 4 — Nova região e mecânica | Mundo 3 "Floresta das Descobertas" (Ciências): rio com canoas e troncos, escalar cipós, bioma de mata | ✅ v15 |
| **5 — Inimigos variados e chefões por região** | Rei Ratão como chefe final. Inimigos e capangas-chefes desligados até existirem personagens desenhados | ⏸ **v16 (parcial)** |

## Etapa 5 — o que entrou (v16)
- **Regra do autor (v16):** não criar personagens que ainda não existem. Capangas (v14), ladrão, valentão, caranguejo, urubu e capangas-chefes foram tirados das fases (`ENEMIES = false`). O código continua pronto e testado:
  - ladrão que arremessa chinelos, valentão com investida, caranguejo com pinças, urubu com rasante;
  - capanga-chefe com 3 pisões que abre um portão.
  Para religar: `ENEMIES = true` em `tools/build-levels.mjs` e `node tools/build-levels.mjs`, depois que os personagens forem desenhados.
- **Rei Ratão** (GDD: chefe final): o chefão da 3-3 é o Rataão original (sem coroa nem arte nova). São 6 perguntas, incluindo revisão de Português e de Matemática, e a vitória mostra o fim da aventura no Recife.
- Sem inimigos, o power-up "Pedroca Ratão" (todas as moedas) continua: corre e pula mais.

## Pendências da Etapa 5
- Desenhar os personagens dos inimigos e dos capangas-chefes, se você quiser que eles existam; só então religar.
- Rei Ratão com arte própria, se você quiser diferenciá-lo (hoje: Rataão original).

## Pendências registradas (não bloqueiam)
- Subsolo: a transição ainda pode ficar mais natural com arte própria de borda e rampa (placa "em obras" no lugar).
- Câmera mostra 11 Pedrocas de altura (o original, 17); estudar `VH` maior numa etapa de interface.
- Renata transformada: faltam os quadros parado e correndo "RATA".
- Testes manuais em tempo real e no celular.

## Próximas etapas
| Etapa | Conteúdo (GDD) | Observação |
|---|---|---|
| **6 — Museu e viagens no tempo** | Cena de abertura no museu, galeria de artefatos recuperados, áreas "num ponto no tempo" acessadas por pontos históricos | Arte de interior |
| 7 — Polimento de apresentação | Foreground, sons originais (pulo, moeda, soco), trilha brega-funk/manguebeat, opções (modo calmo nos semáforos) | Áudio e arte |
