#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFilter
import math, random, os, subprocess, shutil, urllib.request
import numpy as np

HERE=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(HERE,"share-assets")
W,H=720,900
FPS=30
DUR=9
FRAMES=FPS*DUR
MUSIC_URL="https://raw.githubusercontent.com/carolcarriazo/incarnation-game/main/public/music/Immersed.mp3"
MUSIC_OFFSET=18
PAL=[
('#06111f','#102b35','#65d6cf','#f2c979','#ef91ad','#9b8df2'),
('#090d22','#2a1635','#b494ff','#ffb276','#ff7f9e','#6fd4de'),
('#071917','#24351f','#9cdda1','#f0c767','#79d9c9','#d897d6'),
('#071124','#1f3151','#7fb8ff','#c7a0ff','#ff9e81','#f0d579'),
('#130d18','#40221f','#ff9d7c','#f1cc77','#cf8bd4','#6fc7c7')]

def rgb(h):
    h=h.lstrip('#')
    return tuple(int(h[i:i+2],16) for i in (0,2,4))

def ease(t):
    t=max(0,min(1,t))
    return 2*t*t if t<.5 else 1-((-2*t+2)**2)/2

def lerp(a,b,t):
    return a+(b-a)*t

def mkbg(a,b):
    aa=np.array(rgb(a),dtype=float); bb=np.array(rgb(b),dtype=float)
    yy=np.linspace(0,1,H)[:,None,None]
    xx=np.linspace(0,1,W)[None,:,None]
    tt=.58*(.55*yy+.45*xx)+.42*yy
    arr=(aa[None,None,:]*(1-tt)+bb[None,None,:]*tt).clip(0,255).astype('uint8')
    return Image.fromarray(arr,'RGB').convert('RGBA')

def glow(im,x,y,color,r,alpha):
    layer=Image.new('RGBA',(W,H),(0,0,0,0))
    d=ImageDraw.Draw(layer)
    c=rgb(color)
    d.ellipse((x-r,y-r,x+r,y+r),fill=(*c,int(alpha*255)))
    layer=layer.filter(ImageFilter.GaussianBlur(max(1,r/2)))
    im.alpha_composite(layer)

def dot(d,x,y,r,color,alpha=1):
    c=rgb(color)
    d.ellipse((x-r,y-r,x+r,y+r),fill=(*c,int(255*alpha)))

def line(d,a,b,color,w=1,alpha=.5):
    d.line((a[0],a[1],b[0],b[1]),fill=(*rgb(color),int(255*alpha)),width=max(1,int(w)))

def bez(p0,p1,p2,p3,t):
    u=1-t
    return (u**3*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t**3*p3[0],
            u**3*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t**3*p3[1])

def curve(d,pts,prog,color,w,a=1):
    steps=100
    n=max(2,int(steps*max(.02,min(1,prog))))
    arr=[bez(*pts,i/steps) for i in range(n+1)]
    d.line(arr,fill=(*rgb(color),int(255*a)),width=max(1,int(w)),joint='curve')

def petal(im,cx,cy,rx,ry,ang,color,alpha):
    if rx<=0 or ry<=0:return
    temp=Image.new('RGBA',(max(8,int(rx*2+10)),max(8,int(ry*2+10))),(0,0,0,0))
    d=ImageDraw.Draw(temp)
    d.ellipse((5,5,5+2*rx,5+2*ry),fill=(*rgb(color),int(alpha*255)))
    temp=temp.rotate(math.degrees(ang),resample=Image.Resampling.BICUBIC,expand=True)
    im.alpha_composite(temp,(int(cx-temp.width/2),int(cy-temp.height/2)))

def flower(im,cx,cy,r,p,rot=0,alpha=1):
    if r<1:return
    for i in range(7):
        a=rot-math.pi/2+i*2*math.pi/7
        dist=r*.54
        petal(im,cx+math.cos(a)*dist,cy+math.sin(a)*dist,r*.46,r*.20,a,[p[2],p[4],p[5],p[3]][i%4],.70*alpha)
    glow(im,cx,cy,p[3],r*.42,.20*alpha)
    d=ImageDraw.Draw(im,'RGBA')
    dot(d,cx,cy,r*.14,p[3],.94*alpha)

BG=[mkbg(p[0],p[1]) for p in PAL]
STARS=[]
CURVES=[]
for idx,p in enumerate(PAL):
    rnd=random.Random(100+idx)
    STARS.append([(rnd.random()*W,85+rnd.random()*520,.45+rnd.random()*1.55,
                   p[3] if i%7==0 else (p[2] if i%3==0 else '#f5f4ef'),
                   .14+rnd.random()*.32) for i in range(58)])
    rr=random.Random(400+idx)
    rows=[]
    for k in range(5):
        y=118+k*92+(rr.random()-.5)*40
        rows.append(((-40,y),(W*.18,y-80),(W*.48,y+110),(W+60,y-25)))
    CURVES.append(rows)

def base(idx):
    p=PAL[idx]
    im=BG[idx].copy()
    glow(im,W*.22,H*.18,p[2],W*.52,.19)
    glow(im,W*.82,H*.46,p[4],W*.46,.15)
    d=ImageDraw.Draw(im,'RGBA')
    for x,y,r,c,a in STARS[idx]:
        dot(d,x,y,r,c,a)
    for pts in CURVES[idx]:
        arr=[bez(*pts,t/80) for t in range(81)]
        d.line(arr,fill=(210,235,236,14),width=1)
    # soft vignette
    vig=Image.new('L',(W,H),0)
    vd=ImageDraw.Draw(vig)
    vd.ellipse((-W*.25,-H*.20,W*1.25,H*1.15),fill=0)
    vig=Image.eval(vig,lambda x:x)
    # framing only, no wish URL in the artwork
    d.rounded_rectangle((30,30,W-30,H-30),radius=34,outline=(230,245,245,28),width=2)
    d.text((48,55),'R A L U V A A A',fill=(242,247,246,220))
    d.text((48,845),'DISCOVER A WISH ON RALUVAAA',fill=(*rgb(p[3]),230))
    return im

BASE=[base(i) for i in range(5)]

def draw_pulse(im,t,p,seed=0):
    d=ImageDraw.Draw(im,'RGBA')
    rnd=random.Random(900+seed)
    cx,cy=W*.48,H*.36
    beat=.5+.5*math.sin(t*math.pi*4)
    for ring in range(3):
        layer=Image.new('RGBA',(W,H),(0,0,0,0))
        ld=ImageDraw.Draw(layer,'RGBA')
        rx=78+ring*44; ry=38+ring*24
        ld.ellipse((cx-rx,cy-ry,cx+rx,cy+ry),outline=(*rgb([p[2],p[5],p[3]][ring]),int(255*(.18+ring*.05))),width=2)
        layer=layer.rotate(math.degrees(t*math.pi*((-.4) if ring%2 else .28)+ring),center=(cx,cy),resample=Image.Resampling.BICUBIC)
        im.alpha_composite(layer)
    d=ImageDraw.Draw(im,'RGBA')
    for i in range(34):
        a=rnd.random()*math.pi*2+t*.45
        dist=62+rnd.random()*210
        x=cx+math.cos(a)*dist; y=cy+math.sin(a)*dist*.62
        if i<18: line(d,(cx,cy),(x,y),p[2] if i%3 else p[4],1,.06)
        dot(d,x,y,1.2+rnd.random()*2.4,[p[2],p[3],p[4],p[5]][i%4],.22+rnd.random()*.46)
    glow(im,cx,cy,p[2],86,.23)
    d=ImageDraw.Draw(im,'RGBA')
    dot(d,cx,cy,18+beat*8,p[2],.96); dot(d,cx,cy,6,p[3],1)
    tip=(cx+168,cy-86)
    pts=((cx+12,cy-4),(cx+62,cy-72),(cx+126,cy-52),tip)
    curve(d,pts,1,p[3],3.2,.56)
    dot(d,tip[0],tip[1],8,p[4],.9)

def draw_branch(im,t,p):
    d=ImageDraw.Draw(im,'RGBA')
    prog=ease(min(1,t*1.08))
    root=(W*.18,H*.55); end=(W*.78,H*.24)
    main=(root,(W*.32,H*.49),(W*.54,H*.48),end)
    curve(d,main,prog,p[2],7,.84)
    curve(d,main,max(0,prog-.03),p[3],2.1,.48)
    qs=[.34,.52,.68]
    ends=[(W*.38,H*.25),(W*.60,H*.30),(W*.78,H*.49)]
    for i,qq in enumerate(qs):
        q=bez(*main,qq); side=1 if i==2 else -1
        branch=(q,(q[0]+38,q[1]+side*6),(ends[i][0]-42,ends[i][1]+side*22),ends[i])
        bp=max(0,min(1,(prog-(.22+i*.13))/.56))
        curve(d,branch,bp,[p[5],p[4],p[3]][i],4,.72)
        if bp>.72:
            a=.5+.5*math.sin((t+i*.18)*math.pi*2)
            petal(im,ends[i][0]-10,ends[i][1]-3,20+a*3,10,.3,[p[2],p[4],p[5]][i],.78)
            petal(im,ends[i][0]+9,ends[i][1]+4,18+a*2,9,-.38,[p[3],p[2],p[4]][i],.72)
            d=ImageDraw.Draw(im,'RGBA')
    dot(d,root[0],root[1],9,p[3],.88)
    if prog>.91:
        dot(d,end[0],end[1],10,p[2],.92); dot(d,end[0],end[1],3,'#f5f4ef',.88)

def draw_bridge(im,t,p,seed=0):
    d=ImageDraw.Draw(im,'RGBA')
    rnd=random.Random(1200+seed)
    left=(W*.20,H*.43); right=(W*.80,H*.40)
    for idx,c in enumerate((left,right)):
        for i in range(16):
            a=rnd.random()*math.pi*2; dist=24+rnd.random()*116
            q=(c[0]+math.cos(a)*dist,c[1]+math.sin(a)*dist*.62)
            line(d,c,q,p[4] if idx else p[2],1,.10)
            dot(d,q[0],q[1],1.2+rnd.random()*2.5,[p[2],p[3],p[4],p[5]][i%4],.24+rnd.random()*.38)
        glow(im,c[0],c[1],p[4] if idx else p[2],52,.20)
        d=ImageDraw.Draw(im,'RGBA')
        dot(d,c[0],c[1],10,p[4] if idx else p[2],.96)
    prog=ease(min(1,t*1.18))
    n=max(2,int(100*prog))
    arr=[]
    for i in range(n+1):
        u=i/100
        arr.append((lerp(left[0],right[0],u),lerp(left[1],right[1],u)-math.sin(u*math.pi)*132))
    d.line(arr,fill=(*rgb(p[3]),209),width=4,joint='curve')
    for k in range(4):
        u=(t*.75+k*.22)%1
        x=lerp(left[0],right[0],u); y=lerp(left[1],right[1],u)-math.sin(u*math.pi)*132
        dot(d,x,y,4.5,p[5] if k%2 else p[3],.82)

def draw_bloom(im,t,p):
    opened=ease(min(1,t*1.15))
    flower(im,W*.49,H*.36,68*opened,p,0,.98)
    delayed=max(0,min(1,(opened-.28)/.72))
    p2=(p[0],p[1],p[4],p[3],p[2],p[5])
    p3=(p[0],p[1],p[5],p[3],p[4],p[2])
    flower(im,W*.31,H*.45,38*delayed,p2,.35,.78)
    flower(im,W*.69,H*.46,42*delayed,p3,-.25,.82)
    if opened>.8:
        d=ImageDraw.Draw(im,'RGBA')
        for i in range(11):
            a=i*math.pi*2/11+t*.8; dist=96+(i%3)*15
            dot(d,W*.49+math.cos(a)*dist,H*.36+math.sin(a)*dist*.64,1.5+(i%2),[p[2],p[3],p[4],p[5]][i%4],.25)

def draw_awaken(im,t,p,seed=0):
    d=ImageDraw.Draw(im,'RGBA')
    rnd=random.Random(1600+seed)
    awake=ease(max(0,min(1,(t-.08)/.84)))
    root=(W*.20,H*.50); end=(W*.78,H*.28)
    main=(root,(W*.34,H*.48),(W*.58,H*.43),end)
    curve(d,main,1,'#74685f',6,.38)
    curve(d,main,awake,p[2],6,.82)
    q1=bez(*main,.48); q2=bez(*main,.70)
    e1=(W*.45,H*.24); e2=(W*.77,H*.51)
    curve(d,(q1,(q1[0]+8,q1[1]-42),(e1[0]-28,e1[1]+32),e1),max(0,(awake-.22)/.78),p[4],4,.72)
    curve(d,(q2,(q2[0]+30,q2[1]+18),(e2[0]-48,e2[1]-12),e2),max(0,(awake-.42)/.58),p[5],4,.70)
    if awake>.52:
        k=(awake-.52)/.48
        petal(im,e1[0]-9,e1[1],22*k,10*k,.28,p[2],.8)
        petal(im,e1[0]+9,e1[1]+3,20*k,9*k,-.36,p[3],.76)
    if awake>.68:
        k=(awake-.68)/.32
        flower(im,end[0],end[1],27*k,p,.2,.85)
    d=ImageDraw.Draw(im,'RGBA')
    pulse=.5+.5*math.sin(t*math.pi*3)
    dot(d,root[0],root[1],8+pulse*3,p[3],.72+awake*.18)
    for _ in range(14):
        tt=min(awake,max(0,awake-rnd.random()*.18))
        if tt<=0:continue
        q=bez(*main,tt)
        dot(d,q[0]+(rnd.random()-.5)*12,q[1]+(rnd.random()-.5)*9,1.5+rnd.random()*2,p[3],.18+rnd.random()*.32)

def frame(idx,n):
    t=(n/(FRAMES-1)) if FRAMES>1 else 0
    im=BASE[idx].copy()
    p=PAL[idx]
    if idx==0: draw_pulse(im,t,p,idx)
    elif idx==1: draw_branch(im,t,p)
    elif idx==2: draw_bridge(im,t,p,idx)
    elif idx==3: draw_bloom(im,t,p)
    else: draw_awaken(im,t,p,idx)
    return im.convert('RGB')

def download_music():
    path=os.path.join(OUT,'Immersed.mp3')
    if not os.path.exists(path) or os.path.getsize(path)<100000:
        urllib.request.urlretrieve(MUSIC_URL,path)
    return path

def run():
    os.makedirs(OUT,exist_ok=True)
    audio=download_music()
    work=os.path.join(OUT,'.frames')
    shutil.rmtree(work,ignore_errors=True)
    os.makedirs(work,exist_ok=True)
    for idx in range(5):
        folder=os.path.join(work,f'f{idx+1}')
        os.makedirs(folder,exist_ok=True)
        for n in range(FRAMES):
            frame(idx,n).save(os.path.join(folder,f'{n:04d}.jpg'),quality=88,optimize=True)
        frame(idx,int((FRAMES-1)*.64)).save(os.path.join(OUT,f'poster-{idx+1}.png'),optimize=True)
        target=os.path.join(OUT,f'template-{idx+1}.mp4')
        subprocess.run([
            'ffmpeg','-y','-hide_banner','-loglevel','error',
            '-framerate',str(FPS),'-i',os.path.join(folder,'%04d.jpg'),
            '-ss',str(MUSIC_OFFSET),'-i',audio,
            '-t',str(DUR),
            '-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p',
            '-profile:v','main','-level','3.1','-movflags','+faststart',
            '-c:a','aac','-b:a','128k','-filter:a','volume=0.22',
            '-shortest',target
        ],check=True)
    for idx in range(5):
        subprocess.run([
            'ffprobe','-v','error','-select_streams','a:0',
            '-show_entries','stream=codec_name','-of','csv=p=0',
            os.path.join(OUT,f'template-{idx+1}.mp4')
        ],check=True)
    shutil.rmtree(work,ignore_errors=True)
    print('Generated five V44-inspired 30fps share templates using Immersed by Kevin MacLeod (CC BY 4.0).')

if __name__=='__main__':
    run()
