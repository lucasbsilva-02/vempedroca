"""Gerador de fases (formato schema 1 do motor). Uso: python3 tools/gen_levels.py  -> grava src/data/<id>.json
Layout: 12 linhas, chão nas linhas 10-11; plataformas '-' sempre em pares de colunas; blocos ? na linha 7; objetos em y=9 ficam sobre o chão."""
import json, os
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "data")
def Q(i, p, o, c, e, h): return {"id": i, "type": "multiple_choice", "prompt": p, "options": o, "correctIndex": c, "explanation": e, "hint": h}
def build(s):
    W = s["W"]; g = [["."] * W for _ in range(12)]
    for r in (10, 11):
        for c in range(W): g[r][c] = "#"
    for a, b in s["gaps"]:
        for r in (10, 11):
            for c in range(a, b + 1): g[r][c] = "."
    for r, c in s["plats"]: g[r][c] = g[r][c + 1] = "-"
    ob = [{"id": "start", "type": "start", "x": s["start"], "y": 9}]
    for i, (c, t, x) in enumerate(s["signs"], 1): ob.append({"id": f"sign{i}", "type": "sign", "x": c, "y": 9, "title": t, "text": x})
    for i, (c, t, x) in enumerate(s["npcs"], 1): ob.append({"id": f"npc{i}", "type": "npc", "x": c, "y": 9, "title": t, "text": x})
    for i, (c, r) in enumerate(s["coins"], 1): ob.append({"id": f"c{i}", "type": "collectible", "x": c, "y": r})
    for i, (c, q) in enumerate(s["blocks"], 1): ob.append({"id": f"q{i}", "type": "question", "x": c, "y": 7, "title": "Bloco de pergunta", "question": q})
    for i, c in enumerate(s["cps"], 1): ob.append({"id": f"cp{i}", "type": "checkpoint", "x": c, "y": 9})
    for i, c in enumerate(s["obst"], 1): ob.append({"id": f"ob{i}", "type": "obstacle", "asset": "roadblock", "x": c, "y": 9})
    for i, (a, c) in enumerate(s["decor"], 1): ob.append({"id": f"d{i}", "type": "decor", "asset": a, "x": c, "y": 9})
    ob.append({"id": "boss", "type": "boss", "x": s["bossX"], "y": 9})
    meta = {k: s[k] for k in ("id", "worldId", "title", "order", "discipline", "grade", "difficulty", "competency", "objective", "narrative", "theme", "boss")}
    return {"schema": 1, **meta, "bncc": {"code": "", "description": "Proposta pedagógica editável — ainda não validada com a BNCC.", "validated": False}, "tiles": ["".join(r) for r in g], "objects": ob}
L = []
L.append(dict(id="vila-palavras-2", worldId="vila-palavras", title="O Mistério da Biblioteca", order=2, discipline="Língua Portuguesa", grade="6º ano", difficulty=1,
 competency="Interpretação de textos: informações explícitas, inferências e construção de sentidos",
 objective="Ler pistas, localizar informações no texto e inferir o que não está escrito de forma direta.",
 narrative="A biblioteca do bairro amanheceu com uma estante vazia: o livro de receitas do Vovô Zé sumiu! Siga as pistas, leia os bilhetes e descubra quem foi.",
 theme={"character": "pedroca", "sky": "#2fa3d8", "bg": "recife", "skyTint": 16756361, "tint": 16763296, "midTint": 14198928, "far": ["sinagoga", "cinema", "pred6", "pred2", "pred7", "pred5", "pred8"], "mid": ["wvermelho", "wlaranja", "wamarelo", "wvermelho"]},
 W=112, start=3, bossX=104, gaps=[(21, 23), (47, 49), (76, 78)], plats=[(8, 20), (8, 24), (7, 46), (8, 50), (8, 75), (8, 79)],
 cps=[38, 66, 92], obst=[31, 58, 61, 86],
 signs=[(8, "Dica: leia as pistas", "Em um mistério, cada detalhe importa: horários, lugares e objetos. Anote mentalmente o que o texto diz de forma direta e depois pense no que essas pistas sugerem."),
        (70, "Dica: ler o que não está escrito", "Inferir é ligar pistas para chegar a uma ideia que o texto não diz com todas as letras. Pergunte-se: o que isso mostra? O que provavelmente aconteceu?"),
        (96, "Carta encontrada na estante", "Querido leitor, não levei o livro por maldade. É que a estante da minha toca estava vazia e eu queria aprender a fazer bolo de rolo. Devolverei o livro ao amanhecer. — Um amigo que adora cozinhar")],
 npcs=[(14, "Guarda-Pitomba lê o bilhete", "Ontem, às cinco da tarde, a bibliotecária Dona Lúcia trancou a porta e deixou a janela dos fundos entreaberta para o gato tomar sol. Hoje cedo, o livro de receitas do Vovô Zé sumiu da estante. No chão, havia migalhas de pão e pequenas pegadas de patas minúsculas que iam até a janela.")],
 coins=[(18, 7), (25, 7), (28, 9), (45, 6), (52, 7), (62, 8), (77, 6), (88, 8), (99, 9)],
 blocks=[(35, Q("q1", "A que horas Dona Lúcia trancou a biblioteca?", ["De manhã cedo", "Às cinco da tarde", "Ao meio-dia", "À noite"], 1, "Correto! O horário está escrito de forma direta na primeira frase do bilhete.", "Procure o horário logo no começo do texto.")),
         (90, Q("q2", "Pelas pistas no chão, quem provavelmente levou o livro?", ["Dona Lúcia, pela porta da frente", "Um bichinho pequeno que entrou pela janela", "O gato, sem passar pela janela", "O Vovô Zé, de madrugada"], 1, "Isso! Migalhas e pegadas minúsculas até a janela sugerem um animal pequeno. O texto não diz isso diretamente: é uma inferência.", "Pense no tamanho das pegadas e no lugar onde elas terminam."))],
 decor=[("banco", 6), ("mato1", 11), ("lixeira", 17), ("canteiro", 27), ("mato3", 34), ("banco", 41), ("mato4", 54), ("canteiro", 64), ("lixeira", 69), ("mato1", 84), ("banco", 90), ("mato3", 100)],
 boss={"name": "Rataão Traça-de-Livros", "intro": "O Rataão estava escondido entre os livros! Responda sobre a carta e as pistas para recuperar o livro de receitas.", "requiredCorrect": 3, "questions": [
   Q("b1", "Segundo a carta, por que o autor levou o livro?", ["Para vender na feira", "Para aprender a fazer bolo de rolo", "Para esconder da bibliotecária", "Para escrever uma nova história"], 1, "Isso! A própria carta explica o motivo: aprender a fazer bolo de rolo.", "Releia a frase que começa com 'É que a estante'."),
   Q("b2", "Em 'não levei o livro por maldade', a palavra 'maldade' é o contrário de:", ["Pressa", "Tristeza", "Bondade", "Curiosidade"], 2, "Isso! Maldade é o oposto de bondade: o autor diz que não agiu com a intenção de fazer mal.", "Pense na palavra que combina com 'fazer o bem'."),
   Q("b3", "Quando o autor escreve 'Devolverei o livro ao amanhecer', podemos concluir que ele:", ["Pretende devolver o livro no dia seguinte, bem cedo", "Nunca vai devolver o livro", "Já devolveu o livro ontem", "Vai devolver o livro à noite"], 0, "Isso! Amanhecer é o começo do dia. A carta não diz 'amanhã cedo', mas dá a pista para concluir isso.", "O que significa 'amanhecer'?")]}))
L.append(dict(id="vila-palavras-3", worldId="vila-palavras", title="O Desafio das Palavras", order=3, discipline="Língua Portuguesa", grade="6º ano", difficulty=2,
 competency="Vocabulário em contexto, organização textual e reconhecimento de gêneros textuais",
 objective="Reconhecer a finalidade de diferentes gêneros, organizar ideias em sequência e descobrir o sentido de palavras pelo contexto.",
 narrative="Na praça da vila, o Rataão espalhou papéis de todo tipo pelo chão. Descubra que texto é cada um, coloque as ideias na ordem certa e enfrente o desafio final do mundo!",
 theme={"character": "pedroca", "sky": "#2fa3d8", "bg": "recife", "skyTint": 7469256, "tint": 8423624, "midTint": 7368888, "far": ["pred3", "pred5", "cinema", "pred8", "pred1", "pred7", "pred6"], "mid": ["wazulesc", "wazul", "wverde", "wazulesc", "wverdeclaro"]},
 W=118, start=3, bossX=110, gaps=[(18, 20), (40, 42), (63, 65), (88, 90)], plats=[(8, 17), (7, 21), (8, 39), (8, 43), (7, 62), (8, 66), (8, 87), (7, 91)],
 cps=[34, 58, 82, 100], obst=[27, 31, 52, 72, 76, 96],
 signs=[(8, "Dica: o que o texto quer?", "Cada gênero tem uma finalidade: convidar, ensinar, informar ou divertir. Observe para que o texto foi escrito e como ele está organizado."),
        (46, "Dica: ordem das ideias", "Um texto bem organizado tem começo, meio e fim. Palavras como 'primeiro', 'depois' e 'por fim' mostram a ordem. Numa receita, trocar a ordem dos passos muda o resultado."),
        (104, "Dica final", "No desafio final, o Rataão vai misturar tudo o que você viu: gêneros, ordem das ideias e palavras novas. Use o contexto e releia os papéis quando precisar.")],
 npcs=[(14, "Guarda-Pitomba lê os papéis", "Papel 1: 'Venha à festa de São João da escola! Sábado, às 16h, no pátio. Traga um prato de milho.' Papel 2: 'Ingredientes: 2 ovos e 1 xícara de açúcar. Modo de preparo: bata os ovos, junte o açúcar e leve ao forno.' Papel 3: 'A Prefeitura inaugurou ontem a nova biblioteca do bairro, que terá mais de mil livros.'"),
       (70, "Guarda-Pitomba relembra", "Na feira, dona Marta espera os fregueses voltarem depois da chuva. Na biblioteca, a janela dos fundos estava entreaberta, e o autor da carta jurou devolver o livro ao amanhecer. Cada palavra ganha sentido pelo contexto.")],
 coins=[(17, 6), (23, 6), (31, 9), (44, 7), (50, 9), (64, 5), (68, 7), (79, 9), (89, 6), (93, 6), (106, 9)],
 blocks=[(36, Q("q1", "O Papel 1 é um convite. Qual pista mostra isso?", ["Ensina o que fazer passo a passo", "Chama o leitor para um evento, com dia, hora e local", "Conta um fato que aconteceu ontem", "Explica o que é o milho"], 1, "Correto! Convites chamam alguém para um evento e informam quando e onde ele será.", "Que informações aparecem no Papel 1: data, horário, local?")),
         (60, Q("q2", "No Papel 3, a palavra 'inaugurou' significa:", ["Fechou para sempre", "Abriu oficialmente, pela primeira vez", "Vendeu", "Reformou"], 1, "Isso! Inaugurar é abrir algo novo ao público. A ideia de 'nova biblioteca' ajuda a perceber o sentido.", "Que palavra no texto combina com algo que acabou de ser criado?")),
         (101, Q("q3", "O Papel 2 é uma receita. Como você percebe isso?", ["Tem lista de ingredientes e modo de preparo", "Dá uma notícia", "Convida para uma festa", "Conta uma história com personagens"], 0, "Isso! Ingredientes e modo de preparo são marcas típicas do gênero receita.", "Que partes do Papel 2 têm título próprio?"))],
 decor=[("fusca", 5), ("semaforo_am", 12), ("mato1", 24), ("parada", 31), ("lixeira", 38), ("mato3", 49), ("banco", 56), ("semaforo_am", 68), ("mato4", 74), ("canteiro", 80), ("fusca", 85), ("banco", 98), ("mato1", 102), ("lixeira", 107)],
 boss={"name": "Rataão, Rei das Palavras", "intro": "O Rei das Palavras reuniu tudo o que você aprendeu! Acerte as quatro perguntas para encerrar o mundo da Vila.", "requiredCorrect": 4, "questions": [
   Q("b1", "Qual sequência organiza corretamente a receita? (A) Sirva. (B) Bata os ovos. (C) Asse no forno. (D) Junte o açúcar.", ["A – B – C – D", "B – D – C – A", "C – B – D – A", "D – A – B – C"], 1, "Isso! Primeiro bate os ovos, depois junta o açúcar, assa e só então serve.", "O que precisa acontecer antes de levar ao forno?"),
   Q("b2", "Um texto que informa um fato recente, com data e local, é:", ["Uma receita", "Um convite", "Uma notícia", "Um poema"], 2, "Isso! A notícia informa fatos recentes, respondendo a perguntas como o quê, quando e onde.", "Pense no texto que você leria para saber o que aconteceu ontem."),
   Q("b3", "Na biblioteca, a janela estava 'entreaberta'. Isso quer dizer que ela estava:", ["Totalmente fechada", "Um pouco aberta", "Quebrada", "Muito grande"], 1, "Isso! O prefixo 'entre' indica algo no meio do caminho: nem aberta, nem fechada.", "'Entre' lembra algo no meio de dois extremos."),
   Q("b4", "Na feira, dona Marta espera os 'fregueses' voltarem. Fregueses são:", ["Clientes", "Vizinhos", "Policiais", "Cobradores"], 0, "Isso! Freguês é quem costuma comprar numa barraca; o contexto da feira ajuda a descobrir.", "Quem volta à barraca para comprar?")]}))

def th(sky, tint, mid_tint, far, mid): return {"character": "pedroca", "sky": "#2fa3d8", "bg": "recife", "skyTint": sky, "tint": tint, "midTint": mid_tint, "far": far, "mid": mid}
M = dict(worldId="reino-numeros", discipline="Matemática", grade="6º ano")
L.append(dict(M, id="reino-numeros-1", title="A Ponte das Operações", order=1, difficulty=1,
 competency="Operações com números naturais e resolução de problemas contextualizados",
 objective="Escolher a operação adequada, resolver problemas em etapas e conferir se o resultado faz sentido.",
 narrative="A grande ponte do Reino dos Números desabou! Para reconstruí-la, cada trecho exige contas certas. Ajude o Rei a calcular tábuas, moedas e carpinteiros.",
 theme=th(10477823, 11065536, 12116136, ["pred1", "pred3", "pred8", "pred5", "pred7", "sinagoga", "pred2"], ["wverde", "wverdeclaro", "wamarelo", "wverde"]),
 W=108, start=3, bossX=100, gaps=[(24, 26), (52, 54), (80, 82)], plats=[(8, 24), (8, 26), (8, 52), (8, 54), (8, 80), (8, 82), (7, 33)],
 cps=[44, 66, 86], obst=[38, 70, 95],
 signs=[(8, "Dica: ler o problema", "Leia o problema, separe os dados e escolha a operação. Quantidades iguais repetidas pedem multiplicação; repartir em partes iguais pede divisão; juntar pede adição; comparar quanto falta pede subtração."),
        (58, "Dica: conferir o resultado", "Depois de calcular, volte ao enunciado e pergunte: a resposta faz sentido? Um preço total não pode ser menor que o preço de uma só peça.")],
 npcs=[(14, "Engenheira Pitomba explica a obra", "A ponte tem 4 trechos. Cada trecho precisa de 15 tábuas, e cada tábua custa 8 moedas. O Rei já guardou 200 moedas para a obra. Os carpinteiros dividirão o pagamento em partes iguais.")],
 coins=[(20, 7), (25, 6), (29, 9), (42, 8), (53, 6), (60, 9), (75, 8), (81, 6), (90, 9)],
 blocks=[(43, Q("q1", "Quantas tábuas são necessárias para os 4 trechos?", ["45", "60", "19", "64"], 1, "Isso! São 4 trechos com 15 tábuas cada: 4 × 15 = 60 tábuas.", "Quantidades iguais repetidas: qual operação usar?")),
         (74, Q("q2", "Quanto custam todas as tábuas da ponte?", ["68 moedas", "420 moedas", "480 moedas", "520 moedas"], 2, "Isso! São 60 tábuas a 8 moedas cada: 60 × 8 = 480 moedas.", "Use o total de tábuas que você descobriu antes."))],
 decor=[("banco", 6), ("mato1", 12), ("canteiro", 19), ("lixeira", 31), ("mato3", 36), ("banco", 47), ("mato4", 56), ("canteiro", 62), ("mato1", 74), ("lixeira", 78), ("banco", 88), ("mato3", 92)],
 boss={"name": "Rataão Contador", "intro": "O Rataão Contador quer embaralhar as contas da ponte! Resolva os problemas para reconstruí-la.", "requiredCorrect": 3, "questions": [
   Q("b1", "O Rei tem 200 moedas e a obra custa 480. Quantas moedas ainda faltam?", ["280", "680", "240", "320"], 0, "Isso! Faltam 480 − 200 = 280 moedas.", "Para saber quanto falta, compare o que se tem com o que se precisa: qual operação?"),
   Q("b2", "Se 480 moedas forem divididas igualmente entre 6 carpinteiros, quanto recebe cada um?", ["60 moedas", "80 moedas", "86 moedas", "96 moedas"], 1, "Isso! 480 ÷ 6 = 80. Confira: 6 × 80 = 480.", "Repartir em partes iguais pede divisão. Depois confira multiplicando."),
   Q("b3", "Qual expressão representa 'o triplo de 25, menos 10'?", ["3 × (25 − 10)", "3 × 25 − 10", "(3 + 25) − 10", "25 ÷ 3 − 10"], 1, "Isso! O triplo de 25 é 3 × 25 = 75; menos 10 resulta em 65.", "Primeiro calcule o triplo; só depois subtraia.")]}))
L.append(dict(M, id="reino-numeros-2", title="O Labirinto dos Padrões", order=2, difficulty=2,
 competency="Sequências, regularidades e raciocínio lógico",
 objective="Descobrir a regra de uma sequência numérica ou de figuras e usá-la para prever termos seguintes.",
 narrative="Os portões do labirinto só abrem para quem descobre o padrão escondido. Observe as placas, ache a regra e siga adiante!",
 theme=th(13147391, 12099808, 11046096, ["pred6", "pred7", "pred2", "cinema", "pred5", "pred1", "pred3"], ["wazulesc", "wvermelho", "wazul", "wvermelho"]),
 W=114, start=3, bossX=106, gaps=[(16, 18), (35, 37), (58, 60), (84, 86), (97, 99)], plats=[(8, 15), (7, 19), (8, 34), (7, 38), (8, 57), (8, 61), (7, 83), (8, 87), (8, 96), (8, 100)],
 cps=[40, 62, 88], obst=[26, 46, 70, 74, 92],
 signs=[(8, "Dica: procure a regra", "Compare cada número com o seguinte: a diferença é sempre a mesma? Ou cada termo é o anterior multiplicado por algo? Descubra a regra antes de continuar a sequência."),
        (54, "Dica: padrões que se repetem", "Em sequências de figuras, descubra qual grupo se repete e conte as posições. Se o grupo tem 3 figuras, a 3ª, a 6ª e a 9ª são iguais.")],
 npcs=[(14, "Guarda-Pitomba mostra as placas dos portões", "Portão 1: 3, 7, 11, 15, ... Portão 2: 2, 4, 8, 16, ... Portão 3: ▲ ● ■ ▲ ● ■ ▲ ● ...")],
 coins=[(17, 6), (21, 6), (28, 9), (36, 6), (44, 9), (59, 6), (66, 8), (85, 6), (90, 9), (98, 6)],
 blocks=[(30, Q("q1", "Qual é o próximo número do Portão 1 (3, 7, 11, 15, ...)?", ["18", "19", "20", "23"], 1, "Isso! A cada passo soma-se 4: 15 + 4 = 19.", "Calcule a diferença entre dois números vizinhos.")),
         (50, Q("q2", "Qual é a regra do Portão 2 (2, 4, 8, 16, ...)?", ["Somar 2", "Multiplicar por 2", "Somar 4", "Multiplicar por 4"], 1, "Isso! 2 → 4 → 8 → 16: cada termo é o dobro do anterior.", "A diferença muda a cada passo (2, 4, 8). Pense em multiplicação.")),
         (78, Q("q3", "No Portão 3, qual figura vem depois de ▲ ● ■ ▲ ● ■ ▲ ● ?", ["▲", "●", "■", "◆"], 2, "Isso! O grupo ▲ ● ■ se repete; depois de ▲ ● vem ■.", "Qual grupo de figuras se repete?"))],
 decor=[("mato1", 6), ("banco", 11), ("lixeira", 22), ("canteiro", 31), ("mato3", 42), ("banco", 48), ("mato4", 52), ("lixeira", 64), ("canteiro", 68), ("mato1", 80), ("banco", 94), ("mato3", 103)],
 boss={"name": "Rataão do Labirinto", "intro": "O Rataão do Labirinto embaralhou os padrões! Descubra as regras para atravessar o último portão.", "requiredCorrect": 3, "questions": [
   Q("b1", "Qual é o 8º termo da sequência 5, 10, 15, 20, ...?", ["35", "40", "45", "50"], 1, "Isso! A regra é 'somar 5', e o termo de posição n vale 5 × n: 5 × 8 = 40.", "Cada termo é 5 vezes a sua posição."),
   Q("b2", "Complete a sequência dos quadrados: 1, 4, 9, 16, ?", ["20", "24", "25", "36"], 2, "Isso! São 1², 2², 3², 4² e depois 5² = 25. As diferenças (3, 5, 7, 9) também crescem de 2 em 2.", "Pense em 1×1, 2×2, 3×3, 4×4..."),
   Q("b3", "Uma sequência começa em 100 e diminui 12 a cada passo. Qual é o 4º termo?", ["52", "64", "76", "48"], 1, "Isso! 100, 88, 76, 64: o 4º termo é 64.", "Escreva os termos um a um: 100, 88, ...")]}))
L.append(dict(M, id="reino-numeros-3", title="A Fortaleza das Frações", order=3, difficulty=2,
 competency="Frações, equivalência e relações proporcionais",
 objective="Representar partes de um todo com frações, reconhecer frações equivalentes e aplicar proporção em situações do dia a dia.",
 narrative="A Fortaleza guarda seus tesouros em partes iguais. Só quem domina as frações e as proporções consegue abrir o cofre final do reino!",
 theme=th(8957120, 9477296, 8425632, ["sinagoga", "pred8", "pred3", "cinema", "pred7", "pred2", "pred1"], ["wazul", "wazulesc", "wlaranja"]),
 W=120, start=3, bossX=112, gaps=[(22, 24), (45, 47), (66, 68), (90, 92)], plats=[(8, 21), (7, 25), (8, 44), (7, 48), (8, 65), (8, 69), (7, 89), (8, 93), (7, 56)],
 cps=[42, 70, 102], obst=[29, 36, 56, 78, 98],
 signs=[(8, "Dica: parte e todo", "Uma fração mostra partes iguais de um todo: o denominador diz em quantas partes o todo foi dividido, e o numerador, quantas partes foram tomadas."),
        (52, "Dica: proporção", "Se uma quantidade dobra, triplica ou é dividida, os outros valores mudam na mesma proporção. Dobrar a receita é dobrar cada ingrediente."),
        (108, "Dica final", "No desafio final, o Rataão mistura frações, proporção, operações e padrões. Ao comparar frações, procure um denominador comum.")],
 npcs=[(14, "Guarda-Pitomba abre o livro do tesouro", "A Fortaleza tem 8 baús, e 3 deles já foram abertos. Uma torta foi dividida em 4 partes iguais e Pedroca comeu 1. A receita da cozinha real usa 2 xícaras de farinha para fazer 3 pães."),
       (74, "Guarda-Pitomba lembra das salas", "A Fortaleza tem 5 salas com 12 tesouros em cada uma. Os tesouros serão repartidos em partes iguais entre as guardas, que seguem sempre a mesma regra de contagem.")],
 coins=[(18, 8), (26, 6), (34, 9), (46, 6), (49, 6), (58, 6), (67, 6), (82, 9), (91, 6), (94, 6), (105, 9)],
 blocks=[(40, Q("q1", "Que fração dos baús já foi aberta?", ["3/5", "3/8", "8/3", "5/8"], 1, "Isso! São 3 baús abertos em um total de 8: 3/8.", "O denominador é o total de partes iguais.")),
         (62, Q("q2", "Pedroca comeu 1 de 4 partes iguais da torta. Que fração da torta sobrou?", ["1/4", "3/4", "4/3", "1/2"], 1, "Isso! O todo é 4/4. Comeu-se 1/4, então sobraram 4/4 − 1/4 = 3/4.", "Quantas partes sobraram do total de 4?")),
         (101, Q("q3", "Qual fração é equivalente a 1/2?", ["2/3", "2/4", "1/3", "3/4"], 1, "Isso! Multiplicando numerador e denominador por 2: 1/2 = 2/4.", "Multiplique em cima e embaixo pelo mesmo número."))],
 decor=[("banco", 6), ("mato1", 12), ("lixeira", 19), ("canteiro", 32), ("mato3", 40), ("banco", 50), ("mato4", 54), ("canteiro", 60), ("lixeira", 72), ("mato1", 84), ("banco", 96), ("mato3", 104)],
 boss={"name": "Rataão, Guardião do Cofre", "intro": "O Guardião do Cofre reuniu tudo o que você aprendeu no Reino! Acerte as quatro perguntas para abrir o cofre.", "requiredCorrect": 4, "questions": [
   Q("b1", "Uma receita usa 2 xícaras de farinha para 3 pães. Quantas xícaras são necessárias para 6 pães?", ["3", "4", "5", "6"], 1, "Isso! Os 6 pães são o dobro de 3, então a farinha também dobra: 2 × 2 = 4 xícaras.", "Quantas vezes a quantidade de pães aumentou?"),
   Q("b2", "Qual fração é maior: 3/4 ou 2/3?", ["3/4", "2/3", "São iguais", "Não é possível comparar"], 0, "Isso! Com denominador 12: 3/4 = 9/12 e 2/3 = 8/12. Logo 3/4 é maior.", "Procure um denominador comum para as duas frações."),
   Q("b3", "São 5 salas com 12 tesouros cada. Se 1/4 de todos os tesouros foi levado, quantos foram levados?", ["12", "15", "20", "25"], 1, "Isso! O total é 5 × 12 = 60 e 1/4 de 60 é 60 ÷ 4 = 15.", "Calcule primeiro o total e depois divida em 4 partes iguais."),
   Q("b4", "Na sequência 1/2, 1, 3/2, 2, ... qual é o próximo termo?", ["5/2", "3", "9/4", "7/2"], 0, "Isso! A regra é somar 1/2: 2 + 1/2 = 5/2.", "Veja quanto se soma de um termo para o outro.")]}))
TIPS = json.load(open(os.path.join(os.path.dirname(__file__), 'tips.json')))
for s in L:
    d = build(s); d['tips'] = TIPS.get(s['id'], [])
    json.dump(d, open(os.path.join(OUT, s["id"] + ".json"), "w"), ensure_ascii=False, indent=1); print("ok", s["id"], s["W"], "colunas")
