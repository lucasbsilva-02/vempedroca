"""Recalcula as bboxes de src/game/assets.ts ignorando componentes conectados minúsculos (pixels soltos nos PNGs)."""
import re, sys
from PIL import Image
import numpy as np
P="src/game/assets.ts"; s=open(P).read(); MIN=6
def robust(path):
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
pat=re.compile(r'"([^"]+)": \[\n"([^"]+)",\n(\d+),\n(\d+),\n(\d+),\n(\d+),\n(\d+),\n(\d+)\n\]')
changed=[]
def rep(m):
    k,p,w,h,x0,y0,x1,y1=m.groups()
    if re.match(r"^(idle|jump|run|hurt|boss|npc|coin|renata|rebeca)",k): return m.group(0)  # sprites de personagem: não mexer
    nb=robust("public/assets/original/"+p); old=tuple(map(int,(x0,y0,x1,y1)))
    if nb!=old: changed.append((k,old,nb))
    return f'"{k}": [\n"{p}",\n{w},\n{h},\n{nb[0]},\n{nb[1]},\n{nb[2]},\n{nb[3]}\n]'
s2=pat.sub(rep,s)
open(P,"w").write(s2)
print(len(changed),"assets corrigidos")
for k,o,n in changed: print(f"  {k}: bbox {o} -> {n}")
