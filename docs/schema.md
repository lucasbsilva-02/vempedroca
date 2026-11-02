# Esquema de fase (schema: 1)
Ver `src/types.ts`. Campos: id, worldId, title, order, discipline, grade, difficulty, competency, objective, bncc{code,description,validated}, narrative, theme, tiles (linhas de texto: `#` chão, `-` plataforma, `.` vazio), objects (start, checkpoint, collectible, sign, npc, question, enemy*, boss; x,y em tiles), boss{name,intro,requiredCorrect,questions[]}. Pergunta: id, type "multiple_choice", prompt, options, correctIndex, explanation, hint. *enemy ainda não implementado no motor.

## Catálogo e mundos (v1)
`src/data/worlds.json`: lista de `{id, order, name, discipline, blurb, color}`. Uma fase pertence a um mundo por `worldId`; `order` (1–3) define a posição dentro do mundo. Basta colocar o JSON da fase em `src/data/` — `catalog.ts` o encontra automaticamente. Progresso: `{levels:{[id]:{done,stars,score}}, last?}` (compatível com a versão anterior).

## v9
- `tiles`: 12 linhas (superfície) ou 18 (com subsolo). `#` chão, `-` plataforma atravessável, `.` vazio, `=` asfalto da rua rebaixada (linha 11), `G` rocha do subsolo, `_` laje fina do subsolo. As zonas das estações de ônibus são acrescentadas pelo motor.
- `question.required: true` → bloco obrigatório (laranja, com seta).
- `traffic`: `{ x, w, tutorial?, cycle: { green, yellow, red, offset? } (segundos), lanes: [{ dir: 1|-1, every?, speed? }] }` — x/w = colunas da rua rebaixada.
- `gate`: `{ x, w, kind: 'bridge'|'wall', requires: <id do bloco obrigatório> }`.

## v10
- `=` agora fica na linha 10 (leito da rua no MESMO nível da calçada; linha 11 continua `#`). Não existe mais rua rebaixada.

## v11
- Escadarias de subsolo são células `G` comuns (degraus de 1 tile); `#` sobre vão (linha 11) é a laje da rua vista por baixo. A célula de rocha onde a calçada termina é `G` (meio-fio).
- Placas de descida: objetos `sign` comuns (leitura opcional por F) + `decor` com asset `seta`.
