# Vem Pedroca — MVP web
> **Artes provisórias no jogo:** veja `docs/arte-pendente.md` — lista das artes que ainda precisam ser desenhadas (hoje geradas por código).

Instalar: `npm install` · Rodar: `npm run dev` (http://localhost:5173) · Build: `npm run build`
Teclado: setas/WASD andam, Espaço pula, ↑/W sobe cipó, E/Enter relê placas, Esc pausa. Toque: botão de direção (deslize) + PULAR.
Parâmetros de teste: `?map` abre o mapa, `?play` ou `?play=<id>` abre uma fase, `?debug` expõe `window.__scene`, `?nobus` pula a chegada de ônibus, `?hitboxes` mostra colisões.

## Estado (v16 — Etapa 5: chefe final; inimigos inventados desligados)
- **Sem personagens inventados:** capangas, ladrão, valentão, caranguejo, urubu e capangas-chefes não existem no jogo original e foram tirados das fases (`ENEMIES = false` em `tools/build-levels.mjs`). Nas fases ficam só os personagens originais: Pedroca, Renata, Guarda-Pitomba e o Rataão.
- O motor de inimigos (`src/game/foes.ts`) e as artes provisórias continuam no projeto, desligados, para quando houver personagens desenhados.
- **Rei Ratão** (chefe final, 3-3, `boss.final`): é o Rataão original, sem nenhuma arte nova. Faz 6 perguntas (inclui revisão de Português e Matemática), e a vitória mostra o fim da aventura no Recife.

## Estado (v15 — Etapa 4: Floresta das Descobertas)
- **Mundo 3 jogável** (Ciências, Rio Capibaribe no mapa do Recife): 3-1 "O Ciclo da Água no Capibaribe", 3-2 "A Teia do Manguezal", 3-3 "O Laboratório da Mata". Cada fase tem perguntas, chefão, artefato, cordel e paradas de ônibus próprias.
- **Rio com canoas e troncos** (`src/game/nature.ts`, objetos `mover`, tile `~`): plataformas que vão e voltam de margem a margem, no nível da margem (embarca andando) e carregam herói e acompanhante. Cair na água tira 1 vida e volta ao checkpoint.
- **Escalar** (GDD 1.2, tile `H` = cipó): ↑/W agarra e sobe, ↓/S desce, Espaço salta do cipó; no toque, segurar PULAR sobe. No topo o herói sobe na borda sozinho.
- **Bioma de mata** (`theme.biome: 'mata'`): chão de grama e terra, rio animado e fundo de floresta em camadas. Tudo provisório, feito por código (ver `docs/arte-pendente.md`).
- Gerador: `river(n, movers)` e `cliff(h, w, { vineRight })` em `tools/build-levels.mjs`. Capturas em `docs/capturas-v15/`.

## Estado (v14 — Etapa 3: objetivos, ameaças e segredos)
Roadmap e pendências: `docs/roadmap.md`.
- **Artefato por fase** (objetivo do GDD): o Ratão derrotado solta o artefato do museu (`level.artifact`), que aparece na vitória, fica salvo e é contado na tela inicial.
- **Capangas do Ratão** (`src/game/foes.ts`, objetos `enemy`): patrulha, pisão na cabeça derrota, contato lateral tira 1 vida. São posicionados automaticamente por `placeFoes` no gerador.
- **Power-up "Pedroca Ratão"** (todas as moedas): usa a arte original `NEW-pedroca-RATAO` e `Pedroca-ratao-running`; corre e pula mais e derruba capangas no contato. A Renata usa `NEW-renata-RATA-jumping`.
- **Cordel escondido** (objeto `cordel`): um por fase, painel com sextilha original, HUD, vitória e progresso salvo (`levels[id].cordel` e `.artifact`).
- **Subsolo:** aterro com inclinação mais suave (1 tile a cada 2 colunas) e placa temporária "em construção" (`OBRAS = false` em `tools/build-levels.mjs` remove).

## Estado (v13 — subsolo e proporções a partir do VemPedroca original)
- **Referência analisada:** o executável original foi jogado e a cena `MVP/Main` do projeto exportado foi lida diretamente (transforms, pixels por unidade, tilemaps). Análise, tabela comparativa e capturas em `docs/proporcoes-v13.md` e `docs/referencia-original/`.
- **Subsolo no padrão do original:** vale a céu aberto sob a rua (sem teto nem fundo preto). Aterro de alvenaria musgosa (#25/#26 do `tiles-marcozero`) em escada diagonal de 1 tile, sólida e caminhável, com crosta de pedregulho em toda face exposta. Piso com plataformas de madeira com barra, banco e postes acesos. Os prédios do fundo ficam sobre lajes de tijolo com moldura de pedra.
- **Proporções:** centralizadas em `src/game/scale.ts` (razões do original comentadas): árvores 6–8×, prédios ≈9,5×, banco/canteiro ≈1×, poste 2,25×, semáforo 2,6×, fusca/carros 1,5×, PARE 1,7×, NPC 1,26×, ônibus/parada 2,3×/2,6×. Ruas de mão dupla com 10 colunas por causa dos carros maiores.
- **Trânsito:** carros entram e saem pela borda do asfalto recortados por máscara (vêm de uma rua transversal), e nunca surgem prontos sobre ninguém. Regra única: carro em movimento atinge; carro parado não. O boneco verde só acende quando nenhum carro está andando, e carro novo só entra no verde.
- **Sem uso desde a v13:** a parede de galeria, os degraus de pedra, as tochas, o cano e as raízes provisórios (a construção do original não usa túnel fechado).

## Estado (v12 — artes provisórias do subsolo)
- Geradas por `tools/gen-provisional-art.mjs` em `public/assets/original/provisorio/`: degraus de pedra lapidada (topo de cada degrau das escadarias), placa de descida azul (estilo metrô), tochas animadas com brilho, cano sob a laje, raízes penduradas e parede de galeria em 3 variantes (no lugar do tijolo do tileset). Placas aceitam `asset` próprio (também no painel de leitura). **Todas são provisórias** — ver `docs/arte-pendente.md`. Capturas em `docs/capturas-v12/`.

## Estado (v11 — descidas subterrâneas, placas de descida e física dos carros)
- **Descidas e subidas** (`Map.underground` em `tools/build-levels.mjs`): no lugar da boca de 2 colunas e da escada estreita, ESCADARIAS de 5 degraus (2 colunas × 1 tile cada) dos dois lados da galeria. Peças do tileset original `tiles-marcozero`: rocha 9 partes (1–3, 5–8) com contorno de pedregulho, quinas internas (12,7) e (14,7) onde o topo de um degrau encontra a face do seguinte, meio-fio de rocha onde a calçada termina e pontas da laje com acabamento. Fundo das galerias e escadarias: parede de tijolos (12,15) escurecida com cornija (5,11) no topo e sob a laje; por trás, camada sólida que cobre as falhas transparentes das peças de borda (por onde antes vazavam céu e prédios). Câmera desce em qualquer coluna com piso (não só na galeria). Capturas em `docs/capturas-v11/`.
- **Placas de descida:** uma por descida (1-2 "Atenção: descida à frente!", 2-2 "Acesso subterrâneo", 2-3 "Descida para a masmorra"), com leitura opcional por F, e seta para baixo sobre o primeiro degrau. A superfície acima das galerias deixou de ser caminho (sem rotas elevadas nesta versão); o NPC da 2-3 foi para antes da descida.
- **Carros** (`src/game/traffic.ts`): andam SÓ sobre o asfalto (entram e saem pelas bordas da rua); a calçada é segura porque o carro não passa por ela. `Crossing.state()` é a fonte única: cor do semáforo, avanço dos carros, dano e boneco de pedestre. Corpo do carro = bbox visível (53×27), com detecção VARRIDA entre quadros (posição anterior ∪ atual, do carro e do jogador). Verde/amarelo: contato com carro em movimento atinge. Vermelho: carros param antes da linha e não causam dano; um carro que já passou da linha termina de cruzar e continua sólido — o boneco verde só acende com a faixa vazia. Entrou no boneco verde: proteção até sair da rua, com 1,5 s de tolerância depois que o sinal abre. Carro novo não entra no amarelo nem surge em cima do jogador. Ruas 2 colunas mais largas (8–9). `?hitboxes` mostra os carros (vermelho = perigoso).

## Estado (v10 — trânsito no mesmo chão, mecanismos animados, ajustes de cenário)
- **Trânsito sem buraco:** a rua é chão contínuo ('=' na linha 10, mesmo nível da calçada) com asfalto e faixa pintada; os carros andam na mesma linha dos pés do personagem. Dano só de carro EM MOVIMENTO, com o sinal aberto para os carros (verde/amarelo) e com o personagem DENTRO do leito da rua. Na calçada, atrás do semáforo, o carro passa por ele sem atingi-lo. No vermelho os carros param antes da linha de retenção e não causam dano. Não há parede invisível: dá para tentar atravessar no verde, assumindo o risco.
- **Espaçamento:** cada rua tem 6 colunas de calçada antes e depois (ruas em sequência: ilha de 6). O gerador recusa vala, boca de galeria ou bloqueio a menos de 5–6 colunas de uma rua e objeto de leitura no leito.
- **Ponte levadiça:** treme erguida (1 s, rangendo) → baixa acelerando (1,9 s) → impacto com tremor de câmera, poeira e um quique → só então vira chão. **Muralha:** vibra e solta pó do topo → afunda trepidando com poeira na base (2,4 s) → baque. A colisão muda apenas no fim (`Gate.ready`); a câmera acompanha a abertura inteira (`OPEN_MS`).
- **Semáforos:** a base dos postes entra 6 px na faixa clara da calçada (antes terminava na borda escura do tile e parecia flutuar), inclusive o semáforo da estação.
- **Arbustos:** removida a camada de arbustos abaixo da calçada (pareciam enterrados); agora ficam plantados ao pé das árvores (todas as do percurso e ~55% das de fundo), decorativos e sem colisão.

## Estado (v9 — level design readaptado, trânsito, subsolo e bloqueios educativos)
As 6 fases foram readaptadas (Sonic: rotas e vertical · Super Mario Bros. 1: ritmo e leitura) por `tools/build-levels.mjs`, que lê o conteúdo educativo ORIGINAL de `tools/levels-v8/` (placas, NPCs, perguntas, falas e chefão sem alteração) e grava `src/data/*.json`. O gerador recusa a fase se houver objeto/relevo/plataforma na arena, objeto de leitura sem chão, elementos interativos colados (< 3 colunas) ou bloqueio sem bloco obrigatório ANTES dele. Para mudar uma fase: edite o gerador e rode `node tools/build-levels.mjs`. Detalhes por fase: `docs/level-design-v9.md`.
- **Trânsito** (`src/game/traffic.ts`): rua rebaixada de 1 tile com asfalto, faixa, linha de retenção, semáforo (vermelho/verde derivados do semáforo original) e semáforo de pedestre (provisório por código). Verde para os carros: passam; amarelo: param se houver distância; vermelho: param ANTES da linha. Quem entra na faixa com o sinal fechado fica protegido até sair. Atropelamento = −1 vida e volta à calçada de onde veio, invencível por 1,5 s. Os carros só circulam num trecho de calçada contínua em volta da rua (entram e saem com fade).
- **Bloqueios educativos** (`src/game/gates.ts`): `gate` (ponte levadiça sobre vão de 6 colunas, ou muralha de pedra de 5 tiles, mais alta que o pulo) ligado por `requires` a um bloco com `required: true` (laranja, com seta ACIMA, fora da arte). Ao responder, o bloqueio abre uma vez só (quedas e checkpoints não fecham) e a câmera mostra a passagem se ela estiver longe. Blocos opcionais são amarelos, sem seta, com o título "(opcional)".
- **Orientação do acompanhante:** ao encostar no bloqueio pendente, quem acompanha (Renata ou Pedroca) avisa; nas tentativas seguintes usa falas curtas que variam (intervalo mínimo de 7 s), e uma seta na borda da tela aponta o bloco. Nada aparece depois que o bloco é respondido. Cada bloqueio tem um NPC explicando o motivo.
- **Subsolo:** fases com galeria têm 18 linhas; tiles `G` (rocha) e `_` (laje) do tileset original `cenario/tiles-marcozero.png` (autotile de 9 partes, borda de pedregulho, boca revestida de tijolo). A câmera desce só dentro da galeria; entrada por boca na calçada, saída por escada de rocha.
- **Arena do Ratão:** 20 colunas planas; o motor descarta cenário, placas, blocos e moedas que caiam nela e as árvores de fundo evitam a janela da luta.
- **Vegetação:** menos árvores, em grupos de 1–3 com trechos abertos; base no chão (o parallax vertical enterrava as de fundo); árvores de fundo não ficam atrás de blocos, bloqueios, placas, NPCs, semáforos e checkpoints.
- **IA do acompanhante:** respeita o semáforo (espera na calçada), não desce em galerias quando o herói segue pela superfície, reposicionamento com intervalo mínimo.

## Estado (v8 — viagem de ônibus, escala e acompanhante)
- **Ônibus no início e no fim de TODAS as fases** (`src/game/busStop.ts`, um sistema só): o motor acrescenta uma zona de estação de chão firme antes (12 colunas) e depois (18 colunas) do mapa original — o level design não muda, só é deslocado. Chegada: estação → BRT original (`onibus-animation1–4`) chega desacelerando → porta abre → herói escolhido desce o degrau e caminha até a plataforma → acompanhante desce → porta fecha → ônibus parte → controle liberado. Encerramento: derrotar o Ratão **não** conclui a fase; o controle volta, o HUD mostra "→ ESTAÇÃO" e uma seta marca a parada final; ao chegar, o ônibus para, acompanhante e herói embarcam, o ônibus parte e só então o evento `complete` grava o progresso e libera a próxima fase. Cada fase tem nome de parada próprio (Recife) e adereços alternados.
- **Ratão:** forma original com a altura do Pedroca (≈1,14×, era 2×); transformação original 1–15 nesse tamanho; depois cresce até 2× ancorado no corpo e nos pés (sem flutuar/afundar); hitbox física 66×76 enquanto está de pé, removida na derrota.
- **Acompanhante** (`src/game/companion.ts`): planeja cada salto simulando a física real do jogo e só pula se aterrissa em chão seguro mais perto do destino; segue a última posição segura do herói (ou o ponto previsto de aterrissagem), espera na borda quando não há salto seguro, mantém ~60 px de folga acompanhando a velocidade do herói e se recupera fora da câmera (nunca teletransporta diante do jogador).
- **Árvores e vegetação:** árvores 3–5× (96–160 px) em três camadas (plano de jogo, fileira intermediária com parallax 0,85, entre os sobrados) e arbustos em primeiro plano abaixo da linha da calçada. Detalhes em `docs/scale-audit.md`.

## Estrutura
- `src/catalog.ts` — catálogo central: qualquer JSON de fase em `src/data/*.json` (com `tiles`, `objects` e `boss`) entra sozinho; mundos em `src/data/worlds.json`. Regras de desbloqueio e "continuar" ficam aqui.
- `src/WorldMap.tsx` — mapa de mundos; `src/App.tsx` — título, mapa, gameplay, pausa; `src/game/GameScene.ts` — motor; `src/Quiz.tsx`; `src/progress.ts` (localStorage: progresso `vp:progress:v1`, som `vp:sound`).
- Progressão: a 1ª fase começa liberada; concluir uma libera a próxima (a 3ª libera o próximo mundo). Melhor pontuação e estrelas são preservadas ao rejogar.

## Estado (v7 — Etapa 1)
- **Introdução do chefão:** o Ratão aparece na forma original e executa a transformação original completa (`ratoboss-transformation` 1–15, importada como `chefao/tr1–tr15` por `tools/import_boss_transform.py`), com faixas de cinema, pausa dramática e só então o quiz (`GameScene.beginBossIntro`). Golpes não podem acontecer durante a introdução.
- **Início em solo firme:** a introdução só começa com o herói no chão; no ar, o jogo espera a aterrissagem natural (sem teletransporte). O acompanhante vai para a posição de luta atrás do herói.
- **Pose de luta:** o Pedroca usa `Sprite pedroca/fighting/NEW-Pedroca-fightingpose` (`pg1–2`) durante a batalha, como herói ou acompanhante. A Renata não tem pose de luta nos arquivos (pendência de arte).
- **Pausa real:** a pausa congela relógio, tweens e animações da cena (`freeze/thaw`); o botão de pausa fica desativado com um painel aberto (antes ele substituía o quiz do chefão e a pergunta se perdia).
- **Plataformas invisíveis:** o motor desenhava só o primeiro par de cada trecho `-`; trechos de 3+ blocos tinham colisão sem arte (fase 2-1: 3 trechos de 4 blocos). Agora toda coluna sólida tem arte; `?hitboxes` mostra as plataformas em laranja.
- **Painel do chefão compacto:** cabe sem rolagem interna, para a arena continuar visível.
- **Seletor 2.5D refeito ("Recife em miniatura"):** rio Capibaribe e mar, pontes onde as ruas cruzam a água, praças com marco (bandeira de Pernambuco = concluída, placa com seta = disponível, cadeado = bloqueada, barreira = em breve), prédio-símbolo atrás de cada parada, rosa dos ventos no Marco Zero, horizonte que acompanha a câmera, legenda de estados, layout de celular com cartão no topo.
- Proposta de level design (Etapa 2, aguardando aprovação): `docs/proposta-level-design.md` e `docs/exemplo-fase-rua-da-aurora.svg`.

## Estado (v6, mantido)
Combate cinematográfico (`GameScene.attackBoss`): foco/zoom no atacante, preparação e soco com os quadros NOVOS do Pedroca, Murro de Cultura ~2,4× mais lento com rastro, hit stop, tremor, dano do Ratão (quadros de susto) e retorno da câmera. Queda do Ratão (`defeatBoss`): elevação, queda de costas ancorada pela linha do dorso, poeira em pixel art e tremor pesado. Câmera por `CameraFX` (foco, zoom, tremor sem acúmulo, limitada ao mundo).
Acompanhante (estilo Tails): corpo próprio com física, segue com atraso/folga, imita saltos com atraso, salta obstáculos/buracos/degraus, recupera-se discretamente; modo de batalha; Pedroca vai à frente para socar quando a Renata joga.
Mapa 2.5D de Recife (`Overworld.tsx`): o personagem escolhido anda pelas ruas entre as áreas e as fases, confirmação com F/Enter/Espaço (ou botão), bloqueios, fades; "Modo lista" mantém a lista acessível. Pernambuco → Recife → áreas (mundos) → fases, dados em `geo.json`.
Escala dos objetos: `scale.ts` + `docs/scale-audit.md`.
Ver também `docs/gdd-audit.md`, `docs/assets-pending.md`.
Testes (Playwright/Chromium com teclado/cliques reais): 6 fases concluídas por robô com o novo combate; golpe e queda verificados quadro a quadro em câmera lenta com Pedroca e Renata; acompanhante medido em 2 fases (0 reposicionamentos); mapa 2.5D (andar, bloqueio, entrar no mundo, confirmar fase). NÃO testado: celular/toque real, áudio, hardware real (o ambiente roda ~11 fps).
