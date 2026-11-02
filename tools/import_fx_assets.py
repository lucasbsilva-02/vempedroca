"""v6: troca os quadros antigos de luta (Sprites não utilizados/pedroca-fighting-animation) pelos NOVOS do Pedroca
(Sprite pedroca/fighting) e importa as partículas de poeira (particle/). Remove os antigos do catálogo e da pasta."""
import glob, os, re, shutil, sys
sys.path.insert(0, os.path.dirname(__file__))
from bbox_util import robust

from PIL import Image
D = "/home/claude/drive2/Vem Pedroca/"; S = D + "Sprites 2.0/Sprite pedroca/fighting/"; R = "public/assets/original/"
nat = lambda f: [int(x) for x in re.findall(r"\d+", os.path.basename(f))]
sets = [("pg", S + "NEW-Pedroca-fightingpose*.png"), ("pl", S + "NEW-Pedroca-punchingleft*.png"), ("pr", S + "NEW-Pedroca-punchingright*.png"),
        ("dust", D + "particle/1particle[0-9]*.png"), ("puff", D + "particle/1particle-car*.png")]
cat = open("src/game/assets.ts").read()
# remove os quadros antigos fight1..16 (arquivos e catálogo)
for i in range(1, 17):
    cat = re.sub(r'"fight%d": \[\n"[^"]+",\n\d+,\n\d+,\n\d+,\n\d+,\n\d+,\n\d+\n\],?\n' % i, "", cat)
for f in glob.glob(R + "combate/fight*.png"): os.remove(f)
cat = cat.rstrip().rstrip("}").rstrip().rstrip(","); add = []
for pre, pat in sets:
    for i, f in enumerate(sorted(glob.glob(pat), key=nat), 1):
        rel = f"combate/{pre}{i}.png"; shutil.copy(f, R + rel); w, h = Image.open(R + rel).size; b = robust(R + rel)
        add.append(f'"{pre}{i}": [\n"{rel}",\n{w},\n{h},\n{b[0]},\n{b[1]},\n{b[2]},\n{b[3]}\n]')
    print(pre, len([a for a in add if a.startswith(f'"{pre}')]), "quadros")
open("src/game/assets.ts", "w").write(cat + ",\n" + ",\n".join(add) + "\n}\n")
