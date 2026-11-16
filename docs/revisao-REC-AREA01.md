# Revisão REC-AREA01 — registro e pontos em aberto

Cópia de trabalho, dentro do repositório do jogo, do que a revisão decidiu. O registro oficial continua sendo o `registro-decisoes.docx` (pasta `vem-pedroca-design`). Nada aqui foi decidido em nome da Aline: as linhas abaixo só repetem o que ela registrou.

## Decisões registradas

| Data | ID | Decisão | Quem decidiu | No jogo |
|---|---|---|---|---|
| 05/11/2026 | MAPA-v0.1 | Ajustes pedidos em A1, A2, A3, A4, A6 e A7 (A5 aprovado) | Aline Cristina / Gestão | — |
| 05/11/2026 | MAPA-v0.2 | Mapa v0.2 aprovado em conceito: pixel simplificado, 5 mesorregiões, pontos azuis do mesmo tamanho, Olinda sem Paulista, bandeirinha na cidade concluída | Aline Cristina / Gestão | Implementado (`docs/CHANGELOG-v0.2.md`) |
| 13/11/2026 | RODADA-1 | Fases REC-01-01, 01-02 e 01-03: ajustes obrigatórios (v0.2) em diversão, dificuldade e elementos culturais. Resto OK. B1–B3 OK | Aline Cristina / Gestão | Fases não entram no jogo ainda |
| 13/11/2026 | I-01 | Selo de rota só em Toritama, Gravatá e Bonito; demais cidades dão "carimbo da cidade", sem efeito no desbloqueio | Aline Cristina / Gestão | Implementado |
| 13/11/2026 | I-02 | Bezerros é opcional; Caruaru abre com os 3 selos | Aline Cristina / Gestão | Implementado |
| 13/11/2026 | I-04 | REC-01-03: encontro sem golpes (encurralar o capanga); variante de 3 pisões guardada | Aline Cristina / Gestão | Só documentado (fase fora do jogo) |
| 13/11/2026 | I-05 / R-01 | Tile 32×32, resolução-base 1280×720, mapa de Pernambuco 640×360 (2×) | Aline Cristina / Gestão | Mapa segue o padrão; resto aguarda validação |
| 13/11/2026 | I-06 | Manter o nome "Quatro Cantos" na Área 1 de Recife | Aline Cristina / Gestão | Implementado |

## Pedidos de alteração

| ID | Item | Descrição | Prioridade | Situação | Resolvido em |
|---|---|---|---|---|---|
| R-01 | Resolução e tileset | Padronizar o tamanho dos tiles e a resolução-base, eliminando divergências entre o GDD e os arquivos | Alta | Divergências levantadas e padrão aplicado ao mapa (`docs/CHANGELOG-v0.2.md`). Aguarda validação do programador e do responsável artístico; falta corrigir o texto do GDD | **Pendente** |

Para fechar o R-01, faltam três coisas:

1. Programador: confirmar que 640×360 ampliado 2× (= 1280×720) com tile 32 é o padrão, e decidir se a largura adaptável no celular em pé (até 384) continua.
2. Responsável artístico: confirmar tile 32×32 e quadro de personagem 64×64 com corpo de cerca de 32 px.
3. Gestão: corrigir o GDD (resolução, tamanho do personagem, engine Phaser, público 6º e 7º ano).

## Pontos em aberto para a Aline (responder antes da v0.3 das fases)

Nas três fases (REC-01-01, 01-02, 01-03) os critérios abaixo vieram como AJUSTAR, sem comentário. Nada foi mudado no design. Respostas curtas bastam; se a resposta for diferente por fase, diga qual.

**Divertido**

1. O que deixou as fases pouco divertidas: ritmo lento, pouca variedade de desafios, poucas recompensas ou outra coisa?
2. Tem algum trecho de alguma das três fases que você achou divertido e quer ver mais?
3. As perguntas educativas interrompem a diversão ou falta ação entre elas?

**Dificuldade adequada**

1. Está fácil demais ou difícil demais para o 6º e o 7º ano? Vale para as três fases ou só para alguma?
2. Onde a dificuldade pesa: nos pulos e plataformas, nas perguntas ou no encontro com o capanga da 01-03?
3. A dificuldade deveria crescer mais da 01-01 para a 01-03, ou a primeira fase já começa alta?

**Elementos culturais / respeito**

1. Faltam elementos culturais, sobram, ou algum está representado de um jeito que incomoda?
2. Qual elemento específico preocupa (personagem, cenário, fala, símbolo, nome de lugar)?
3. Alguém deveria validar esse conteúdo antes da v0.3 (por exemplo, um professor ou alguém da comunidade)?
