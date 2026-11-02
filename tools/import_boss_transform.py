"""v7: importa a transformação original do chefão (Sprites 2.0/ratoboss/ratoboss-transformation1..15) como chefao/tr1..tr15.
tr1 = forma humana (antes da transformação); tr15 = Ratão transformado. Uso: python3 -I tools/import_boss_transform.py <pasta 'Vem Pedroca' do Drive>"""
import glob, os, re, shutil, sys
from PIL import Image
import numpy as np
SRC = sys.argv[1] if len(sys.argv) > 1 else "/home/claude/drive2/Vem Pedroca"
S = os.path.join(SRC, "Sprites 2.0", "ratoboss"); R = "public/assets/original/"
def robust(path, MIN=6):
    a = np.array(Image.open(path).convert("RGBA"))[:, :, 3] > 0; h, w = a.shape; seen = np.zeros_like(a); keep = np.zeros_like(a)
    for y in range(h):
        for x in range(w):
            if a[y, x] and not seen[y, x]:
                st = [(y, x)]; seen[y, x] = True; comp = []
                while st:
                    cy, cx = st.pop(); comp.append((cy, cx))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < h and 0 <= nx < w and a[ny, nx] and not seen[ny, nx]: seen[ny, nx] = True; st.append((ny, nx))
                if len(comp) >= MIN:
                    for cy, cx in comp: keep[cy, cx] = True
    ys, xs = np.where(keep if keep.any() else a); return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
nat = lambda f: [int(x) for x in re.findall(r"\d+", os.path.basename(f))]
fs = sorted(glob.glob(os.path.join(S, "ratoboss-transformation[0-9]*.png")), key=nat)
assert len(fs) == 15, f"esperava 15 quadros, achei {len(fs)}"
cat = open("src/game/assets.ts").read()
cat = re.sub(r'"tr\d+": \[\n"[^"]+",\n\d+,\n\d+,\n\d+,\n\d+,\n\d+,\n\d+\n\],?\n', "", cat)  # idempotente
cat = cat.rstrip().rstrip("}").rstrip().rstrip(","); add = []
for i, f in enumerate(fs, 1):
    rel = f"chefao/tr{i}.png"; shutil.copy(f, R + rel); w, h = Image.open(f).size; b = robust(f)
    add.append(f'"tr{i}": [\n"{rel}",\n{w},\n{h},\n{b[0]},\n{b[1]},\n{b[2]},\n{b[3]}\n]')
open("src/game/assets.ts", "w").write(cat + ",\n" + ",\n".join(add) + "\n}\n"); print(len(add), "quadros importados")
