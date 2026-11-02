# Artes que ainda precisam ser feitas (lista viva)

> Tudo abaixo está no jogo como **arte provisória** — gerada por código para o jogo funcionar.
> Ao entregar a arte definitiva, substitua o arquivo indicado (mesmo nome e tamanho) e risque o item aqui.
> Artes provisórias de arquivo ficam em `public/assets/original/provisorio/` e são recriadas por `node tools/gen-provisional-art.mjs`
> (se você substituir um PNG, não rode o gerador de novo, ou ele sobrescreve o seu arquivo).

## Subsolo (provisórias geradas na v12)

> **v13:** o subsolo passou a seguir o VemPedroca original (vale aberto, aterro de alvenaria do próprio tileset). Os itens 1, 3, 4, 5 e 6 **não estão mais em uso**. Continuam listados para você decidir se quer desenhá-los para outros ambientes (porões, túneis) ou descartá-los. O item 2 (placa de descida) continua em uso.

| # | Arte | Arquivo provisório | Tamanho | Observações |
|---|---|---|---|---|
| 1 | Degrau de pedra das escadarias (meio, ponta esquerda, ponta direita) | `provisorio/degrau.png`, `degrau_e.png`, `degrau_d.png` | 32×32 cada | Laje lapidada no topo (10 px) e rocha embaixo, combinando com a rocha do `tiles-marcozero` |
| 2 | Placa de descida / acesso subterrâneo | `provisorio/placa_descida.png` | 32×48 | Hoje: placa azul estilo metrô com seta e escada |
| 3 | Tocha de parede (animação) | `provisorio/tocha1–3.png` | 16×32, 3 quadros | O brilho em volta é feito por código |
| 4 | Cano preso sob a laje | `provisorio/cano.png` | 32×16 | Repete lado a lado |
| 5 | Raízes penduradas | `provisorio/raizes.png` | 32×24 | Penduradas no teto da galeria |
| 6 | Parede de fundo da galeria (3 variantes) | `provisorio/galeria1–3.png` | 32×32 cada | Variações: lisa, com musgo, rachada |

## Trânsito (provisórias desde a v9)
| # | Arte | Hoje | Tamanho sugerido |
|---|---|---|---|
| 7 | Semáforo de pedestre (boneco parado e andando) | desenhado por código (10×14) em `traffic.ts` | 16×24, 2 estados + 2 quadros de andar |
| 8 | Semáforo de carro com luz vermelha e verde acesas | recolorido por código a partir de `Semaforo_c_luzes_apagadas` | 64×64 (mesmo do amarelo original) |
| 9 | Faixa de pedestre e linha de retenção | listras desenhadas por código | tile 32 px |
| 10 | Asfalto do leito da rua | desenhado por código (`asphalt`) | tile 32 px |
| 11 | Mais modelos de carro | só o `fuscaazulclaro` recolorido | 32×32 ou 64×32 cada |

## Bloqueios educativos (provisórias desde a v9)
| # | Arte | Hoje | Sugestão |
|---|---|---|---|
| 12 | Bloco "?" obrigatório (laranja) e bloco "?" comum/usado | desenhados por código (`qreq`, `qblock`, `qused`) | 32×32, estados ativo/usado |
| 13 | Ponte levadiça baixando | tabuleiro `plataforma-com-barra` girado por código | 3–5 quadros + poste/corrente |
| 14 | Muralha/portão de pedra abrindo | peças do tileset afundando por código | 3–5 quadros |

## Outras pendências antigas (de `docs/assets-pending.md`)
| # | Arte |
|---|---|
| 15 | Porta do ônibus abrindo/fechando (3–4 quadros, 128×128) |
| 16 | Pose de luta da Renata (64×64, 2–4 quadros) |
| 17 | Ratão recebendo dano (64×64, 4–6 quadros) |
| 18 | Mais espécies de árvore (coqueiro, pau-brasil, mangueira — 64×96) |
| 19 | Mapa de Pernambuco em pixel art e cenários dos mundos 3 e 4 |
| 20 | Sons originais (pulo, moeda, acerto, soco, impacto) |

## v13 — ainda provisórios ou novos
| # | Arte | Hoje | Observação |
|---|---|---|---|
| 21 | Brilho dos postes acesos do vale | degradê radial feito por código | No original era uma Light2D; uma arte de halo em pixel art ficaria mais fiel |
| 22 | Crosta de pedregulho nas faces do aterro | recorte por código das peças de borda do tileset | Peças próprias de borda para a alvenaria musgosa (topo, laterais, quinas) |

## v14 — Etapa 3 (provisórias geradas por código, `tools/gen-provisional-art.mjs`)
| # | Arte | Arquivo provisório | Tamanho | Observações |
|---|---|---|---|---|
| 24 | Folheto de cordel (coletável) | `provisorio/cordel.png` | 20×24 | Capa em xilogravura |
| 25 | Artefatos do museu (um por fase) | `provisorio/artefato.png` (relicário genérico) | 24×24 | Sombrinha de frevo, folheto de cordel, partitura, planta da ponte, alfaia, florim |
| 26 | Placa temporária "em construção" | `provisorio/placa_obras.png` | 32×40 | Remover junto com `OBRAS` quando o subsolo tiver arte final |
| 27 | Renata transformada ("RATA") parada e correndo | — (hoje: quadros normais com brilho dourado) | 64×64 | Já existe o pulo `NEW-renata-RATA-jumping` |

## v15 — Etapa 4, Floresta das Descobertas (provisórias desenhadas por código em `GameScene`, sem arquivo)
| # | Arte | Hoje | Tamanho sugerido | Observações |
|---|---|---|---|---|
| 28 | Canoa (plataforma móvel do rio) | retângulo marrom com borda | 96×16 (3 tiles) | Canoa de madeira vista de lado; o topo é o piso |
| 29 | Tronco flutuante | retângulo com anéis | 96×16 | Tronco com casca e musgo |
| 30 | Água do rio (animada) | faixa azul com ondinhas, rolando | 64×26 + corpo escuro | Superfície em 2–4 quadros; fundo barrento do Capibaribe |
| 31 | Cipó escalável | linha verde com folhas | 32×32 repetível | Topo, meio e base |
| 32 | Chão de mata (grama + terra) | grama e terra por código | tiles 32×32 | Topo, meio e bordas de barranco |
| 33 | Floresta de fundo | árvores geradas em camadas | camadas paralaxe | Mata atlântica/mangue: copas, troncos, raízes de mangue |
| 34 | Pose de escalada (Pedroca e Renata) | quadros de pulo | 2–4 quadros 64×64 | Subindo agarrado ao cipó |

## v16 — Etapa 5
Inimigos e capangas-chefes foram **tirados do jogo** (não existem no original). As artes provisórias deles (capanga, ladrão, chinelo, valentão, caranguejo, urubu) ficam no projeto sem uso e **não entram nesta lista**. Só voltam se você decidir criar esses personagens.

O Rei Ratão (chefe final) usa a arte original do Rataão: nenhuma arte nova nesta etapa.
