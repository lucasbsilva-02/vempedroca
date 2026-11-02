# Auditoria do GDD × versão v7 (verificada no código e em execução)
Legenda: OK = implementado e testado · PARCIAL · AUSENTE · FUTURO = fora do MVP.
| Requisito do GDD | Estado | Observação / próxima ação |
|---|---|---|
| Plataforma 2D: correr e pular | OK | Física de passo fixo, câmera a 40%. Testado por robô em 6 fases |
| Escalar | AUSENTE | Exige novo estado de movimento + tiles/assets de parede/cipó (programação + arte) |
| Enredo: museu com artefatos sumidos | PARCIAL | Só há o mote no mapa de Pernambuco. Falta cena de abertura e 1 artefato por fase |
| Rei Ratão como antagonista | PARCIAL | v16: Rei Ratão (Rataão original) é o chefe final na 3-3. Falta arte própria |
| Estrutura em 3 etapas (contemplar → mecânica → mini-chefe) | PARCIAL | Fases crescem em dificuldade e terminam em chefão; a divisão e a mecânica nova por região não são explícitas |
| Mecânica nova por região | AUSENTE | Proposta na Etapa 2 (`docs/proposta-level-design.md`): toldos, semáforo, barcos, vento — aguardando aprovação |
| Cenário com background/middleground/foreground | PARCIAL | Céu + 2 camadas de prédios com parallax; falta foreground |
| Ambientes distintos por região | PARCIAL | Temas por fase (prédios, cor, hora do dia) mas tudo é "Recife"; falta arte de outras regiões |
| Inimigos variados (ladrões, bullies, tubarões) | DESLIGADO | v16: motor pronto (ladrão, valentão, animais, capanga-chefe), mas fora das fases até existirem personagens desenhados |
| NPCs curtos e úteis | PARCIAL | Guarda-Pitomba + acompanhante com falas curtas (3 por fase). Falta variedade de NPCs |
| Chefões com dificuldade progressiva | PARCIAL | v7: introdução com a transformação original (humano → Ratão), início só em solo firme, pose de luta; golpe a cada acerto. Falta variar chefões por região e a animação de dano dedicada |
| Moedas | OK | Contagem e estrelas |
| Power-up/transformação ao pegar todas as moedas | AUSENTE | Existem quadros `renata-rata-idle` (óculos escuros) que parecem ser a transformação; falta definir regra e animações |
| Cordéis escondidos | AUSENTE | Precisa de item novo + esconderijos no level design |
| Passagens subterrâneas/áreas secretas/museus no tempo | AUSENTE | FUTURO: exige tiles de interior e transição de cena |
| Puzzles e cálculos | PARCIAL | Quizzes e problemas matemáticos; ainda sem puzzle físico |
| Pixel art SNES; grafite, cordel, manguebeat | PARCIAL | Pixel art OK; identidade cultural aparece na logo e nas falas, ainda pouco no cenário |
| Seleção de personagem (cada um com estilo musical) | OK | Pedroca (brega-funk, do GDD) e Renata; o estilo da Renata não consta nos materiais, então não foi inventado |
| Mapa de Pernambuco → Recife → áreas → fases | OK | v7: maquete 2.5D de Recife com rio, pontes, praças e marcos de estado; 2 de 4 áreas jogáveis |
| Proporções 32×32 / 128×128 / 960×540 | PARCIAL | Sprites 32/64 px e prédios 128 px; resolução interna do jogo difere de 960×540 |

## Atualização v14 (ver docs/roadmap.md)
| Requisito do GDD | Estado |
|---|---|
| Objetivo: recuperar artefatos e chegar na parada | OK — artefato por fase + ônibus |
| Inimigos | DESLIGADOS — motor pronto; aguardam personagens desenhados |
| Power-up ao pegar todas as moedas | OK — Pedroca Ratão (arte original); Renata parcial |
| Cordéis escondidos | OK — um por fase |
| Mecânica nova por região | PARCIAL — trânsito (ruas do Recife) e, na v15, rio com canoas/troncos e escalar cipós (Floresta das Descobertas); falta vento |
| Passagens subterrâneas | OK — vales acessíveis pela superfície |
