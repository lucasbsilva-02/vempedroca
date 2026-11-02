import numpy as np
from PIL import Image
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
