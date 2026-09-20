from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, os, random
W,H,FPS,D=1080,1920,30,8
OUT="tmp_raluvaa_queue"; os.makedirs(OUT,exist_ok=True)
font_bold="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
font_reg="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
F1=ImageFont.truetype(font_bold,80)
F2=ImageFont.truetype(font_bold,68)
F3=ImageFont.truetype(font_reg,34)
random.seed(42)

branches=[
((150,1500),(320,1290),(480,1190),(610,980)),
((610,980),(690,800),(790,680),(880,520)),
((610,980),(520,820),(430,650),(350,480)),
((610,980),(780,1030),(860,1170),(920,1350)),
((610,980),(570,760),(610,560),(670,360)),
((520,1210),(410,1120),(300,980),(210,820)),
]
stars=[(random.randint(0,W),random.randint(0,H),random.uniform(.3,1.0)) for _ in range(90)]

def bez(a,c1,c2,b,t):
    u=1-t
    return (
      u*u*u*a[0]+3*u*u*t*c1[0]+3*u*t*t*c2[0]+t*t*t*b[0],
      u*u*u*a[1]+3*u*u*t*c1[1]+3*u*t*t*c2[1]+t*t*t*b[1]
    )

for i in range(FPS*D):
    t=i/FPS
    p=min(1.0,t/5.6)
    im=Image.new("RGB",(W,H),(2,6,13))
    glow=Image.new("RGBA",(W,H),(0,0,0,0))
    gd=ImageDraw.Draw(glow)
    gd.ellipse((260,400,1120,1350),fill=(24,120,118,32))
    glow=glow.filter(ImageFilter.GaussianBlur(120))
    im=Image.alpha_composite(im.convert("RGBA"),glow)
    d=ImageDraw.Draw(im)
    for sx,sy,a in stars:
        tw=.5+.5*math.sin(t*2.2+sx*.01+sy*.006)
        c=int(95+80*tw*a)
        d.ellipse((sx-1,sy-1,sx+1,sy+1),fill=(80,180,c,80))
    for bi,(a,c1,c2,b) in enumerate(branches):
        local=max(0,min(1,(p-bi*.08)/(.52)))
        if local<=0: continue
        pts=[bez(a,c1,c2,b,local*j/48) for j in range(49)]
        d.line(pts,fill=(45,215,198,70),width=18,joint="curve")
        d.line(pts,fill=(135,255,235,230),width=4,joint="curve")
        tip=pts[-1]
        rr=18+8*math.sin(t*5+bi)
        d.ellipse((tip[0]-rr,tip[1]-rr,tip[0]+rr,tip[1]+rr),fill=(115,245,225,110))
        d.ellipse((tip[0]-5,tip[1]-5,tip[0]+5,tip[1]+5),fill=(235,255,250,255))
    # seed
    rr=34+8*math.sin(t*4)
    d.ellipse((135-rr,1495-rr,135+rr,1495+rr),fill=(95,240,220,90))
    d.ellipse((130,1490,140,1500),fill=(245,255,252,255))

    if t < 2.7:
        lines=["WHAT IF SOCIAL MEDIA","MAPPED INTENTIONS","NOT IDENTITIES?"]
    elif t < 5.5:
        lines=["A WISH BECOMES","A LIVING LINEAGE."]
    else:
        lines=["RALUVAAA","MAKE A WISH. WATCH IT GROW."]

    y=220
    for j,line in enumerate(lines):
        f=F1 if (j==0 and t<5.5) else (F2 if j<2 else F3)
        bb=d.textbbox((0,0),line,font=f)
        x=(W-(bb[2]-bb[0]))/2
        shadow=(x+3,y+j*105+3)
        d.text(shadow,line,font=f,fill=(0,0,0,160))
        d.text((x,y+j*105),line,font=f,fill=(242,249,248,255))
    footer="CONFLUENCE OF MINDS"
    bb=d.textbbox((0,0),footer,font=F3)
    d.text(((W-(bb[2]-bb[0]))/2,H-120),footer,font=F3,fill=(150,175,178,220))
    im.convert("RGB").save(f"{OUT}/f{i:04d}.jpg",quality=92)
