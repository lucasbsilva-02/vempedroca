"""Importa do Drive (export em /home/claude/drive2) as artes originais usadas na v5 e as registra em src/game/assets.ts.
Renata == Rebeca (confirmado pelo cliente): idle = NEW-rebeca-idle-animation, corrida = NEW-Renata-running-animation, pulo = NEWrenata-jumping-animation."""
import glob, os, re, shutil
import numpy as np
from PIL import Image
D="/home/claude/drive2/Vem Pedroca/"; S=D+"Sprites 2.0/"; R="public/assets/original/"
nat=lambda f:[int(x) for x in re.findall(r"\d+",os.path.basename(f))]
def robust(path,MIN=6):
    a=np.array(Image.open(path).convert("RGBA"))[:,:,3]>0; h,w=a.shape; seen=np.zeros_like(a); keep=np.zeros_like(a)
    for y in range(h):
        for x in range(w):
            if a[y,x] and not seen[y,x]:
                st=[(y,x)]; seen[y,x]=True; comp=[]
                while st:
                    cy,cx=st.pop(); comp.append((cy,cx))
                    for dy in (-1,0,1):
                        for dx in (-1,0,1):
                            ny,nx=cy+dy,cx+dx
                            if 0<=ny<h and 0<=nx<w and a[ny,nx] and not seen[ny,nx]: seen[ny,nx]=True; st.append((ny,nx))
                if len(comp)>=MIN:
                    for cy,cx in comp: keep[cy,cx]=True
    ys,xs=np.where(keep if keep.any() else a); return int(xs.min()),int(ys.min()),int(xs.max())+1,int(ys.max())+1
sets=[("ren_idle","personagens",S+"Sprites renata/idle/NEW-rebeca-idle-animation*.png"),("ren_run","personagens",S+"Sprites renata/running/NEW-Renata-running-animation*.png"),
 ("ren_jump","personagens",S+"Sprites renata/jumping/NEWrenata-jumping-animation*.png"),("fight","combate",D+"Sprites n*/pedroca-fighting-animation*.png"),
 ("murro","combate",S+"murro de cultura/murro de cultura[0-9]*.png"),("murro_v","combate",S+"murro de cultura/murro de cultura-verde*.png"),
 ("murro_a","combate",S+"murro de cultura/murro de cultura-amarelo*.png"),("murro_r","combate",S+"murro de cultura/murro de cultura-vermelho*.png")]
cat=open("src/game/assets.ts").read().rstrip(); assert cat.endswith("}"); cat=cat[:-1].rstrip(); add=[]
for pre,folder,pat in sets:
    fs=sorted(glob.glob(pat),key=nat); os.makedirs(R+folder,exist_ok=True); print(pre,len(fs),"frames")
    for i,f in enumerate(fs,1):
        rel=f"{folder}/{pre}{i}.png"; shutil.copy(f,R+rel); w,h=Image.open(R+rel).size; b=robust(R+rel)
        add.append(f'"{pre}{i}": [\n"{rel}",\n{w},\n{h},\n{b[0]},\n{b[1]},\n{b[2]},\n{b[3]}\n]')
os.makedirs(R+"ui",exist_ok=True); shutil.copy(D+"Logofundopedroca.png",R+"ui/logo.png"); w,h=Image.open(R+"ui/logo.png").size; print("logo",w,h)
open("src/game/assets.ts","w").write(cat+",\n"+",\n".join(add)+"\n}\n")
