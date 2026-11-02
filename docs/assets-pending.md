# Assets usados, derivados e pendentes (v5)
## Usados do Drive (cópias em public/assets/original; originais intactos)
- Renata (== Rebeca): idle `NEW-rebeca-idle-animation` (16), corrida `NEW-Renata-running-animation` (12), pulo `NEWrenata-jumping-animation` (11) → `personagens/ren_*`
- Pedroca lutando: `Sprites não utilizados/pedroca-fighting-animation` (16) → `combate/fight*`
- Murro de Cultura: 4 cores (roxo, verde, amarelo, vermelho) → `combate/murro*` (uma cor por golpe)
- Logo `Logofundopedroca.png` → `ui/logo.png` (original) e `ui/logo_crop.png` (só recorte do espaço transparente, sem alterar proporção)
- Retratos `ui/ped_portrait.png` e `ui/ren_portrait.png`: recorte ampliado 4× (sem suavização) do 1º quadro de idle de cada personagem
## Correções
- `roadblock.png` tinha 3 pixels soltos na linha 60 (pernas acabam na 47): bbox no catálogo era (9,9,64,61), correto (9,9,57,48). Corrigido com `tools/fix_bbox.py` (também `poste`, `aceso*`, `lixeira`, `cinema`, `pred2`).
- 31 arquivos com acento/espaço renomeados (`tools/ascii_assets.py`) — causa provável das "caixas pretas com linhas verdes" (placeholder do Phaser para imagem que não carrega) em alguns ambientes; não reproduzido aqui (0 texturas ausentes nas 6 fases).
## Provisórios (identificados)
- Reação do Ratão ao golpe: brilho branco + recuo por código (NÃO é arte original).
- Bloco "?" (`qblock`) e piso de perigo: gerados por código.
## Pendências de arte (solicitações)
0. v6: o Ratão leva o golpe usando os quadros 2–4 de `RATAO-BOSS-fainting` (susto/cambaleio) + recuo e brilho por código — NÃO existe um conjunto de dano com esse nome nos arquivos.
1. **Ratão recebendo dano (arte dedicada)** — sprite 64×64, fundo transparente, 4–6 quadros (impacto, encolher, recuperar), mesma paleta do `RATAO-BOSS-idle`. Obs.: `RATAO-BOSS-PUSH` (6 quadros) não é dano (parece ataque com saco).
2. **Bloco de pergunta pixel art** 32×32, 2 estados (ativo com brilho, usado), tema cordel/grafite.
3. **Mapa de Pernambuco** em pixel art (hoje: contorno estilizado em SVG) + ícones de cidade.
4. **Cenários de Floresta/Rio e Marco Zero** (mundos 3 e 4) e foreground.
5. **Sons originais** (pulo, moeda, acerto, soco, impacto) — hoje só bipes gerados por código.
6. **Retrato da Renata** desenhado (hoje é recorte do idle) e quadros de "lutando" da Renata, se desejado.

## v6 — substituições
- Antigos (removidos do catálogo e da pasta): `fight1–16` (Sprites não utilizados/pedroca-fighting-animation).
- Novos: `Sprite pedroca/fighting` → `pg1–2` (guarda), `pr1–7` (soco direito: preparação, golpe, recuperação), `pl1–6` (soco esquerdo; importado, ainda não usado); `particle/1particle*` → `dust1–14`; `particle/1particle-car*` → `puff1–3` (poeira).
- Mapa 2.5D: `ui/map_stone.png` = tile 610 do tileset Marco Zero; prédios, postes, nuvens e vegetação do catálogo original.

## v7 — novos usos e pendências
- **Usados:** `Sprites 2.0/ratoboss/ratoboss-transformation1–15` → `chefao/tr1–tr15` (tr1 = forma humana; tr15 = Ratão); `Sprites 2.0/Sprite pedroca/fighting/NEW-Pedroca-fightingpose1–2` → `combate/pg1–2` (já importados na v6, agora usados como pose de luta); `Bandeira de Pernambuco_.png` → `ui/bandeira_pe.png` (marco de fase concluída no mapa); `ui/map_stone.png` (chão do mapa).
- **Pendente — pose de luta da Renata:** não há nos arquivos. Pedido: 64×64, transparente, 2–4 quadros em guarda (punhos à frente, peso nas pernas), mesma paleta e proporção de `NEW-rebeca-idle-animation`. Enquanto isso a Renata fica em idle durante a batalha.
- **Pendente — semáforo (proposta Etapa 2):** luzes verde e vermelha acesas (12×63, estilo de `Semaforo_sinal_amarelo_`), semáforo de pedestre com boneco parado e andando (16×24), faixa de pedestre em tile de 32 px.
- **Ainda provisório:** o mapa 2.5D desenha rio, mar, pontes, parques e praças por código (SVG) em pixel/flat; um tileset de mapa em pixel art (água, grama, calçada, ponte) substituiria esses desenhos.

## v7 — plataformas com colisão e sem arte (corrigidas)
| Fase | Trecho (linha, colunas) | Antes | Depois |
|---|---|---|---|
| 2-1 A Ponte das Operações | linha 8, col. 24–27 | 2 de 4 blocos visíveis | 4 de 4 |
| 2-1 A Ponte das Operações | linha 8, col. 52–55 | 2 de 4 blocos visíveis | 4 de 4 |
| 2-1 A Ponte das Operações | linha 8, col. 80–83 | 2 de 4 blocos visíveis | 4 de 4 |
As demais fases só tinham trechos de 2 blocos (já cobertos). Nenhum outro sólido invisível: terreno `#` sempre desenhado, blocos "?" respondidos continuam visíveis (`qused`), barreiras com hitbox igual à arte; limites laterais do mapa são invisíveis por serem limite de movimentação, não plataforma.

## v8 — ônibus, estações e vegetação
- **Usados:** `cenario/onibus-animation1–4` (BRT articulado, frente para a direita; animação de motor ligado), `cenario/parada_brt_vidroarrumado` (estações de chegada e partida), `cenario/matoA2` (novo no catálogo como `mato2`, arbusto), `matoA1/matoA3` como árvores.
- **Provisório (código):** porta do ônibus aberta = interior iluminado + folhas recolhidas desenhadas sobre a porta dianteira original (não há quadros de porta abrindo). Embarque/desembarque = degrau curto + fade no vão da porta (não há animação de subir/descer escada).
- **Pedido de arte:** (1) ônibus com 3–4 quadros de porta abrindo/fechando (mesmo tamanho 128×128); (2) estações com variação regional (fachada/telhado) para fases fora do Recife; (3) mais espécies de árvore (coqueiro, pau-brasil, mangueira) em 64×96, para variar além de matoA1/matoA3; (4) placa de parada em pixel art (hoje o nome é texto sobre fundo escuro).
- **Fonte:** a Silkscreen não tem "Ã"; o navegador usa a fonte de reserva só nesse caractere ("SÃO JOSÉ").

## v9 — trânsito, subsolo e bloqueios
- **Usados:** `cenario/tiles-marcozero.png` (spritesheet 32×32: rocha 9 partes nas colunas 1–3/linhas 5–8, lajes na linha 5, tijolos de pedra nas colunas 8–12/linhas 14–16), `Semaforo_c_luzes_apagadas` (base do vermelho/verde), `Semaforo_sinal_amarelo_`, `fusca` (carros com variação de cor), `plataforma-com-barra` (tabuleiro da ponte), `WarningSign` (aviso de obra).
- **Derivados por código (provisórios):** luzes vermelha e verde acesas (recolor das lâmpadas apagadas, mesmo critério do amarelo original), semáforo de pedestre (boneco 10×14), asfalto e faixa, bloco obrigatório laranja, fundo escuro das galerias.
- **Pedidos de arte:** semáforo de pedestre (16×24, parado/andando), faixa e linha de retenção em tile de 32 px, mais modelos de carro, ponte levadiça com quadros de baixar, muralha/portão com quadros de abrir, bloco "?" obrigatório desenhado, decoração de subsolo (tochas, canos, raízes) e fundo de galeria próprio.

## v11
- **Usados agora:** quinas internas de rocha (12,7) e (14,7), parede de tijolos (12,15) e cornija (5,11) do `tiles-marcozero`.
- **Ainda pedido:** degraus/rampa de pedra desenhados para escadarias (hoje degraus de rocha de 1 tile), placa de "descida/metrô" em pixel art (hoje a placa genérica + seta), decoração de subsolo (tochas, canos, raízes) e um fundo de galeria próprio.
