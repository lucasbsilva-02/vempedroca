# Level design v9 — o que mudou em cada fase
Fluxo comum: estação (chegada) → apresentação (placa, NPC) → mecânica da fase → rotas alternativas → bloco obrigatório + bloqueio → checkpoint → transição limpa → arena de 20 colunas → estação (embarque).
Barreiras de PARE: de ~26 obstáculos espalhados para 2, ambas em ruas em obra (1-3 e 2-3), logo depois de uma travessia.

| Fase | Linhas | Trânsito | Bloqueio ← bloco obrigatório | Rotas e segredos |
|---|---|---|---|---|
| 1-1 Feira de Dona Marta | 12 | **Tutorial**: ciclo 6 s, carros lentos, explicação do acompanhante; 2ª rua com ciclo 5 s | Ponte levadiça ← q1 (texto da feira) | Passarela alta sobre a 2ª rua (sem esperar o sinal, moedas); degraus opcionais em volta do bloco |
| 1-2 Mistério da Biblioteca | 18 | Duas ruas seguidas, mãos opostas, ilha de 4 colunas, sinais defasados | Portão de pedra ← q1 (horário) | **Porão secreto** com a pergunta das pistas (q2, opcional); rota alta sobre o porão |
| 1-3 Desafio das Palavras | 12 | Avenida de mão dupla (7 col.), rua em obra (PARE), rua de ciclo curto (3,5 s) | Ponte levadiça ← q2 ("inaugurou") | Toldos altos sobre a última rua com a pergunta bônus (q3) |
| 2-1 Ponte das Operações | 12 | Revisão: 1 rua, ciclo longo | **A ponte da obra** ← q1 (tábuas) | Andaimes altos com q2 (bônus) ou térreo com dois vãos |
| 2-2 Labirinto dos Padrões | 18 | "Onda verde": 2 sinais na mesma mão, defasados 2,5 s | Portão 1 ← q1; Portão 3 ← q3 | **Labirinto subterrâneo** com o Portão 2 (q2, opcional) |
| 2-3 Fortaleza das Frações | 18 | Avenida de mão dupla + obra (PARE) | Muralha ← q1 (baús) | **Masmorra** com a pergunta da torta (q2, opcional); rota alta final com q3 (bônus) |

Verificado por robô (Pedroca nas 6 fases; Renata em 1-1 e 2-2): 0 atropelamentos, 0 quedas, 0 quedas ou reposicionamentos do acompanhante, todos os bloqueios abertos pelo bloco certo e chegada ao chefão.

## v10
- Ruas sem rebaixo, com 6 colunas de calçada antes e depois de cada uma (ilha de 6 entre ruas em sequência). Comprimentos atuais: 1-1 156, 1-2 141, 1-3 166, 2-1 125, 2-2 157, 2-3 148 colunas (sem contar as estações).
- Verificado por robô nas 6 fases (Pedroca): 0 atropelamentos ao esperar o vermelho, 0 quedas, acompanhante nunca no leito da rua com o sinal aberto, bloqueios abertos só depois da animação.

## v11
- Galerias (1-2 porão, 2-2 labirinto, 2-3 masmorra) agora fazem parte do caminho: escadaria de descida → galeria → escadaria de subida, com placa de aviso e seta antes. Os blocos opcionais e as moedas continuam lá embaixo. A coluna de pedra de 3 tiles do labirinto passou a 2 (deixava 2 px de folga sob a laje).
- Verificado por robô nas 6 fases (Pedroca): chegada ao chefão, 0 atropelamentos, 0 quedas, 0 reposicionamentos do acompanhante; herói e acompanhante desceram e subiram as escadarias nas 3 fases com subsolo.

## v13
- Subsolo reconstruído no padrão do original: `Map.underground(n)` agora gera aterro diagonal de 6 colunas, vale de n colunas a céu aberto e aterro de subida. As plataformas do vale passaram de lajes finas para madeira com barra; o banco e os postes acesos são gerados junto. Ruas de mão dupla com 10 colunas.
