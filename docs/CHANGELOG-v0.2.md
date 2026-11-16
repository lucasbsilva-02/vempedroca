# Changelog v0.2 — Mapa de Pernambuco e Recife (revisão REC-AREA01-v0.1)

Fontes: formulário preenchido por Aline Cristina / Gestão (05/11 e 13/11/2026), `registro-decisoes.docx`, `como-atualizar-o-jogo-2026-11-13.docx` e o protótipo aprovado "Mapa de Pernambuco v0.2" (pasta `MAPA_PERNAMBUCO/v0.2` do `vem-pedroca-design`).

**Como ver:** `npm run dev` e abrir `http://localhost:5173/?map` (estado inteiro) ou `?city` (mapa de Recife).

## Uma linha por item

| Item | O que mudou | Arquivos | Status |
|---|---|---|---|
| A1 | Mapa do estado e do Recife no estilo pixel simples e geométrico aprovado. A arte é provisória. | `public/assets/mapa/v0.2/*.png`, `src/StateMap.tsx` | Feito. Arte final pendente (AST-MAP-001 a 004) |
| A2 | Seleção por pontos: cada cidade é um ponto azul do mesmo tamanho; cadeado ao lado = bloqueada; bandeirinha = concluída. | `src/StateMap.tsx`, `src/data/geo.json` | Feito |
| A3 | O ponto é a âncora: mostra a região principal e os municípios agregados ("Região de Toritama · Inclui Toritama, Vertentes e Taquaritinga do Norte"; "Região de Camaragibe · Inclui Camaragibe e São Lourenço da Mata"). Olinda ficou só Olinda, sem Paulista (aprovação de 05/11). | `src/data/geo.json` (`title`, `inclui`), `src/StateMap.tsx` | Feito |
| A4 | Estrada de barro (Rota Norte) em marrom avermelhado. Nada mais mudou nas estradas. | `public/assets/mapa/v0.2/arco1.png` | Feito |
| A5 | Não alterado (aprovado). O bloqueado agora aparece como cadeado ao lado do ponto, como na v0.2 aprovada. | — | Sem mudança |
| A6.1 | Na visão geral, o trecho escolhido fica nítido e colorido; o resto fica apagado. | `ov-arco1.png`, `ov-sertao.png`, `ov-saofrancisco.png`, `src/StateMap.tsx` | Feito |
| A6.2 | Clicar no Sertão abre o Sertão (e o São Francisco abre o São Francisco), em cinza, com "Indisponível". O fluxo visão geral → Arco → cidade → área continua. | `src/StateMap.tsx`, `rg-sertao.png`, `rg-saofrancisco.png`, `ov-idx.png` | Feito e testado |
| A7 | Geografia pelas 5 mesorregiões (Grande Recife, Zona da Mata, Agreste, Sertão, São Francisco), com vegetação por região: cactos no Sertão, árvores no Agreste, mata densa na Zona da Mata, rios em azul. | `public/assets/mapa/v0.2/*.png`, `src/data/geo.json` (`groups`) | Feito |
| I-01 | Selo de rota só em Toritama (Norte), Gravatá (Central) e Bonito (Sul). As demais cidades dão "carimbo da cidade", sem efeito no desbloqueio. | `src/data/geo.json` (`seals`), `src/geo.ts` (`sealsOf`, `rewardOf`) | Feito |
| I-02 | Bezerros é opcional: não entra em nenhuma regra. Caruaru abre com os 3 selos. | `src/data/geo.json` (`optional`, `final`), `src/geo.ts` (`cityState`) | Feito e testado |
| I-04 | REC-01-03: encontro sem golpes (encurralar o capanga); variante de 3 pisões guardada. Só documentação: as fases REC-01-0x ainda não entram no jogo. A variante de 3 pisões já existe no motor (capanga-chefe em `src/game/foes.ts`, desligado). | `docs/revisao-REC-AREA01.md`, `docs/gdd-audit.md` | Feito na documentação |
| I-05 / R-01 | Padrão registrado: tile 32×32, resolução-base 1280×720, mapa de Pernambuco 640×360 ampliado 2×. O mapa novo já segue. O jogo não foi alterado (ver divergências abaixo). | `src/StateMap.tsx`, `src/styles.css`, `docs/gdd-audit.md` | **Pendente de validação** (programador e responsável artístico) |
| I-06 | Nome "Quatro Cantos" mantido: Área 1 = "Rua do Bom Jesus e Quatro Cantos". | `src/data/geo.json` | Feito |

Também mudou, por consequência:

- **Regras de progressão** (`src/geo.ts`): Recife abre as 3 rotas; cada cidade abre a seguinte da sua rota. O progresso salvo (`vp:progress:v1`) não foi apagado nem migrado: o campo novo `cities` é opcional.
- **Recife** (`src/StateMap.tsx`, `src/App.tsx`, `src/Overworld.tsx`): o seletor de áreas agora é o mapa em pixel com as 4 áreas. Entrar numa área abre a rua 2.5D com as fases, como antes. A maquete 2.5D da cidade inteira deixou de ser usada (o código continua em `src/Overworld.tsx`).
- **Cidades fora do Recife** aparecem no mapa, mas ainda não têm fases: ao entrar, o jogo avisa "em breve".

## Divergências de tile e resolução (I-05 / R-01)

| # | Onde | O que estava | Como ficou |
|---|---|---|---|
| 1 | GDD (citado em `docs/gdd-audit.md`) | Resolução 960×540 | `gdd-audit.md` corrigido para 1280×720. O documento do GDD não está neste repositório: **falta a Gestão corrigir lá** |
| 2 | GDD | Personagem "32×32"; no ZIP os quadros são 64×64 | Não é erro: o quadro tem 64×64 e o corpo cerca de 32 px. Registrado em `gdd-audit.md`; falta corrigir o texto do GDD |
| 3 | GDD | Engine Unity | O jogo deste repositório é Phaser (web). Registrado; falta corrigir o GDD |
| 4 | Jogo (`src/game/GameScene.ts`, `src/App.tsx`) | Tela interna 640×360 ampliada (2× = 1280×720), tile 32 | Já atende à decisão. **Não alterado.** Atenção: 1280×720 "nativo" com tile 32 mostraria o dobro da área com tudo pela metade do tamanho |
| 5 | Jogo (`src/App.tsx`, função `fit`) | Em telas estreitas a largura interna cai de 640 para até 384 (celular em pé) | **Não alterado; dúvida para o programador:** manter a largura adaptável ou fixar 640? |
| 6 | Mapa de Pernambuco antigo (`src/StateMap.tsx`) | SVG 700×260 | Substituído por canvas 640×360 ampliado 2× |
| 7 | `docs/asset-manifest.md` | Tileset 32×32; referências de UI 1280×720; sprites 64×64 | Coerente com o padrão. Sem mudança |

R-01 continua **pendente** até o programador e o responsável artístico validarem os itens 4 e 5.

## O que não entrou

- As fases REC-01-01, 01-02 e 01-03: precisam da v0.2 e de nova aprovação (ver "Pontos em aberto para a Aline" em `docs/revisao-REC-AREA01.md`).
- Arte final do mapa (AST-MAP-001 a 004).
- Mapas locais e fases das outras 13 cidades.

## Testes

`npm run build` passa. Navegação conferida no navegador (Chromium), 33 verificações: destaque do trecho, clique no Sertão e no São Francisco bloqueados, pontos e municípios agregados, selos e carimbos, Caruaru com 3 selos sem Bezerros, save antigo, Recife → área → fases → voltar, teclado e toque.

Capturas em `docs/capturas-v0.2/`.
