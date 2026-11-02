# Vem Pedroca — Proposta de level design (Etapa 2)

> **Status (v9): aplicada.** As 6 fases foram readaptadas segundo esta metodologia — ver `docs/level-design-v9.md` e `tools/build-levels.mjs`. Ficam para depois: barcos, vento, toldos com arte própria, cordel e inimigos.

## 1. Avaliação do level design atual

As 6 fases jogáveis (Mundos 1 e 2) foram construídas com a mesma gramática:

| Aspecto | Como está hoje | Problema |
|---|---|---|
| Rotas | Um único corredor da esquerda para a direita | Não há escolha; explorar não muda nada |
| Altura usada | Só as linhas 7–11 de um mapa de 12 linhas; a câmera é presa ao chão | Não existe "andar de cima" nem "andar de baixo" |
| Desafios | Buraco de 3 blocos, barreira de 1 pulo, plataforma sobre o buraco | Mesmos 3 desafios em todas as fases; a dificuldade quase não sobe |
| Ritmo | Desafios espaçados de forma regular | Falta alternância entre calma, tensão e descoberta |
| Mecânica por região | Nenhuma (o GDD pede uma nova por região) | Rua do Bom Jesus e Cinema São Luiz jogam igual |
| Educação | Placas, NPC e blocos "?" no único caminho | O conteúdo não interage com o espaço; não há puzzle |
| Recompensa | Moedas em linha | Nada escondido; nenhum motivo para voltar |
| Inimigos | Nenhum | Sem ameaça móvel para ler e evitar |

**Medidas reais do motor** (simuladas a partir de `GameScene.step`, 60 quadros/s):

- pulo segurando o botão: sobe **3,5 blocos** e alcança **4,4 blocos** na horizontal (0,62 s no ar);
- toque curto: sobe **2,5 blocos** e alcança **3,1 blocos**;
- corrida máxima: **7 blocos/s**; tolerância de pulo depois da borda: 8 quadros; memória do botão de pulo: 9 quadros.

Essas medidas viram as regras de construção abaixo.

## 2. A mistura: Sonic (rotas) + Super Mario Bros. 1 (ritmo)

- **Do Sonic clássico vem o *onde*:** a fase tem camadas sobrepostas (alto, térreo e, às vezes, subsolo) que se separam e se reencontram. Ler o cenário e escolher a rota é parte do jogo.
- **Do Super Mario Bros. 1 vem o *como*:** movimentos simples, desafios apresentados um de cada vez, sempre em tela, sem depender de velocidade. O jogador pode parar, olhar e decidir.
- **O que não trazemos do Sonic:** loops, molas de alta velocidade e trechos em que a câmera não acompanha. O Pedroca não precisa correr para atravessar nada.

## 3. Metodologia de construção

### 3.1 Estrutura em três atos (alinhada ao GDD)

| Ato | Duração aprox. | Função | Regras |
|---|---|---|---|
| 1. Chegada | 25% | Contemplar o lugar e apresentar **a** mecânica da fase em situação segura | Rota única; erro sem punição; NPC/acompanhante explica |
| 2. Exploração | 50% | Rotas alternativas, a mecânica combinada com saltos, conteúdo educativo | 2 bifurcações; 1 segredo (cordel); checkpoint antes de cada trecho de timing |
| 3. Desafio | 25% | Teste da mecânica sem ajuda, depois a arena do chefão | Rota única de novo; arena plana e segura para a introdução do chefão |

### 3.2 Rotas alternativas: alto, térreo e subsolo

- **Térreo (calçada e rua):** a rota **padrão e acessível**. É mais longa e passa pelas placas, pelo NPC e pelos blocos de pergunta. Exige no máximo saltos de 3 blocos e degraus de 2. **Sempre completável.**
- **Alto (sacadas, toldos, andaimes, telhados):** mais curta, exige precisão (vãos de 3–4 blocos, plataformas de 2 blocos de largura) e guarda recompensas: moedas em arco e, às vezes, o cordel.
- **Subsolo (galerias, canais, porões de museu):** opcional, acessado por uma passagem discreta. Só segredos, nunca conteúdo obrigatório.

**Regras de bifurcação:**

1. Toda bifurcação é **sinalizada**: moedas formando uma escada para cima ou uma seta do acompanhante ("dá pra subir ali, visse?").
2. As rotas **se reencontram antes de cada checkpoint**. Ninguém fica preso numa rota errada.
3. Toda rota alta tem uma **descida segura** (andaime, escada de toldos) a cada 15–20 blocos.
4. A rota térrea **nunca exige precisão alta**. A rota alta **nunca esconde o conteúdo necessário para o chefão**.
5. Vertical: as fases passam de 12 para **16–18 linhas**, e a câmera passa a acompanhar o jogador na vertical (ver §7).

### 3.3 Timing sem pressa

O timing entra como **observação**, não como corrida:

- elementos **cíclicos com período fixo e aviso prévio**: semáforo, toldo que abre e fecha, barco no Capibaribe, jato d'água;
- o jogador sempre tem uma **área segura para esperar** em frente ao elemento cíclico;
- **um elemento de timing por vez** no Ato 1; no máximo dois combinados no Ato 2;
- ciclos longos (5–6 s) nas primeiras fases, encurtando aos poucos nas seguintes.

### 3.4 Desafios ambientais com identidade do Recife

Cada área do Recife ganha **uma mecânica própria** (GDD: "uma mecânica nova por região"):

| Área | Mecânica | Por que ela |
|---|---|---|
| Rua do Bom Jesus | Toldos e sacadas como plataformas (rota alta) | Casario colado, ruas estreitas |
| Cinema São Luiz / Rua da Aurora | **Semáforo e trânsito** | Avenida movimentada à beira-rio |
| Rio Capibaribe | Barcos e plataformas flutuantes (móveis) | Cidade dos rios e das pontes |
| Marco Zero | Vento do mar que empurra levemente no pulo | Praça aberta ao porto |

### 3.5 Progressão de dificuldade

Para cada mecânica, o mesmo ciclo em 4 passos, distribuído entre as fases de uma área:

1. **Apresentar:** a mecânica aparece sozinha, sem perigo (o jogador só observa).
2. **Praticar:** a mecânica com consequência leve e espaço de sobra.
3. **Combinar:** a mecânica junto de saltos e de uma rota alternativa.
4. **Testar:** a mecânica sem ajuda, com o tempo mais curto, antes do chefão.

Entre áreas, a mecânica anterior volta em versão fácil (revisão), e a nova entra no passo 1.

### 3.6 Educação integrada aos caminhos

- **Térreo = aprender:** placas, NPC e acompanhante explicam o conteúdo; os blocos "?" obrigatórios ficam aqui.
- **Alto = desafio extra:** um "bloco de ouro" com pergunta bônus mais difícil vale o cordel e estrelas. Errar não tira vida.
- **Puzzles ambientais:** o conteúdo abre o caminho, como uma comporta que só abre ao escolher a fração certa, uma sequência de toldos que segue um padrão numérico, ou uma placa de rua que é preciso interpretar para achar a passagem.
- **Pontos de convergência:** antes de cada checkpoint há uma dica que resume o que a rota térrea ensinou, para quem veio pelo alto não perder conteúdo.

### 3.7 Acessibilidade

- A rota térrea é sempre jogável por quem só sabe andar e pular.
- Checkpoint **antes** de todo trecho de timing; nunca no meio.
- Os ciclos de timing podem ganhar um "modo calmo" (ciclo 50% mais longo) nas opções.
- Cores do semáforo sempre acompanhadas de forma ou ícone (boneco parado ou andando), para não depender só da cor.

## 4. Mecânica do semáforo e do trânsito

### 4.1 Regras

| Estado | Carros | Pedestre | Sinais visíveis |
|---|---|---|---|
| **Verde para os carros** (6 s) | Passam pela faixa | Espera na calçada (zona segura) | Semáforo de carro verde; boneco de pedestre **vermelho e parado** |
| **Amarelo** (1,5 s) | Desaceleram | Espera | Amarelo aceso; boneco vermelho piscando |
| **Vermelho para os carros** (6 s) | **Param antes da linha de retenção**, nunca sobre a faixa | **Pode atravessar** | Vermelho aceso; boneco **verde andando** |

- Os carros aparecem **fora da tela** e levam no mínimo **1,2 s** até a faixa, então nenhum carro surge em cima do personagem.
- A calçada e a ilha central são **zonas seguras**: lá os carros nunca colidem.
- Se a travessia começa no vermelho para os carros, ela **termina com segurança mesmo que o sinal mude**: o próximo carro só entra depois que a faixa esvazia. Isso evita punição injusta.
- O acompanhante espera junto com o jogador e comenta na primeira vez ("Bora esperar o boneco verde, Pedroca!").

### 4.2 Atravessar errado

Usa o **sistema de dano que já existe**: tremor curto de câmera, o personagem é empurrado de volta para a calçada, perde 1 vida e fica alguns instantes invencível (o mesmo de uma queda). Sem sistema paralelo de vida.

### 4.3 Formato de dados (proposta)

```json
{ "id": "sem1", "type": "traffic", "x": 42, "y": 9, "width": 6,
  "cycle": { "green": 6, "yellow": 1.5, "red": 6, "offset": 0 },
  "lanes": [ { "dir": 1, "speed": 3.2, "vehicles": ["fusca", "onibus"] } ] }
```

### 4.4 Assets

- **Já existem:** `semaforo_am` (amarelo), `semaforo_of` (apagado), `fusca`, `onibus` 1–4 (animado).
- **Faltam (pedido de arte):** semáforo com luz verde e vermelha (12×63, mesmo estilo); semáforo de pedestre com boneco parado e andando (16×24, 2 estados + 2 quadros de andar); faixa de pedestre em tile de 32 px; linha de retenção.
- **Provisório possível:** acender as luzes do `semaforo_of` por código até a arte chegar, sinalizado no inventário.

## 5. Exemplo conceitual: "Rua da Aurora" (área Cinema São Luiz)

O esquema `docs/exemplo-fase-rua-da-aurora.svg` mostra o trecho central da fase (Ato 2), da esquerda para a direita:

1. **Chegada à avenida (seguro).** O acompanhante aponta o semáforo. Um carro passa no verde; o jogador só observa (passo "apresentar").
2. **Bifurcação sinalizada.** Moedas em escada sobem pelos **toldos** do casario.
   - **Rota alta:** 3 toldos (vãos de 3 e 4 blocos), uma sacada com o **bloco de ouro** (pergunta bônus) e a **passarela de pedestres** sobre a avenida. Atravessa **sem esperar o sinal**, mas exige saltos precisos.
   - **Rota térrea:** placa com dica, bloco "?" obrigatório e a **travessia pelo semáforo**: espera na calçada, boneco verde e faixa. Mais longa, sem precisão.
3. **Convergência na Ponte da Boa Vista.** As duas rotas descem para a ponte sobre o Capibaribe, onde fica o **checkpoint**. A dica de convergência resume o conteúdo da rota térrea.
4. **Segredo.** Embaixo da ponte, uma escadinha leva a uma galeria (subsolo) com o **cordel** da fase.

**Curva de ritmo** (intensidade de 1 a 5):

```
Ato 1  ▁▂▂▁▃            chegada, semáforo apresentado, 1 travessia guiada
Ato 2  ▃▅▃▂▄▅▂          bifurcação (toldos ou semáforo), convergência na ponte, segredo
Ato 3  ▄▅▅▁ CHEFÃO      dois semáforos em sequência sem ajuda, arena calma, Ratão
```

## 6. Como as 4 áreas do Recife seguiriam a metodologia

| Área | Mecânica | Rota alta | Rota térrea | Segredo |
|---|---|---|---|---|
| Rua do Bom Jesus | Toldos/sacadas | Telhados do casario | Calçada com placas e NPC | Porão da sinagoga |
| Cinema São Luiz | Semáforo e trânsito | Passarela e toldos | Faixa de pedestre | Galeria sob a ponte |
| Capibaribe | Barcos móveis | Pontes e cais altos | Margem com barcos | Canal escondido |
| Marco Zero | Vento do mar | Mastros e quiosques | Praça da rosa dos ventos | Armazém do porto |

## 7. O que muda no motor (depois da aprovação)

| Item | Trabalho | Depende de |
|---|---|---|
| Fases mais altas (16–18 linhas) e câmera vertical suave | Motor (câmera e limites), gerador de fases | — |
| Plataforma "toldo/sacada" atravessável por baixo com arte própria | Motor (já existe a lógica `-`), arte | Arte de toldo |
| Objeto `traffic` (semáforo, carros, faixa, zonas seguras) | Motor e dados | Arte do semáforo e do pedestre |
| Plataformas móveis (barcos) | Motor | Arte de barco |
| Cordel colecionável e passagem secreta | Motor, HUD e progresso salvo | Arte do cordel |
| Bloco de ouro (pergunta bônus) | Motor e quiz | — |
| Inimigos simples (ladrão, bully) | Motor | Sprites |

**Ordem sugerida:** câmera vertical e fases altas → semáforo → reconstruir **uma** fase (Cinema São Luiz 2-1) com a nova metodologia como protótipo → validar com você → aplicar às demais.
