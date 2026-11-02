"""Renomeia arquivos de public/assets/original com acento/espaço para nomes ASCII seguros e atualiza o catálogo (evita 404/placeholder preto-verde do Phaser em macOS/hospedagens)."""
import os, re, unicodedata
R="public/assets/original/"; A="src/game/assets.ts"; s=open(A).read(); mapa={}
def slug(n):
    b=unicodedata.normalize("NFKD",n).encode("ascii","ignore").decode(); return re.sub(r"[^A-Za-z0-9._/-]+","_",b)
for m in set(re.findall(r'^"([^"]+\.png)",$',s,re.M)):
    n=slug(m)
    if n!=m and os.path.exists(R+m):
        t=n; i=1
        while os.path.exists(R+t) and t!=m: t=n.replace(".png",f"_{i}.png"); i+=1
        os.rename(R+m,R+t); mapa[m]=t
for k,v in mapa.items(): s=s.replace(f'"{k}",',f'"{v}",')
open(A,"w").write(s); print(len(mapa),"arquivos renomeados"); [print("  ",k,"->",v) for k,v in sorted(mapa.items())]
