#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFilter
import math, random, os, subprocess, wave
import numpy as np

HERE=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(HERE,"share-assets")
W,H=720,900
FPS=12
DUR=9
FRAMES=FPS*DUR
PAL=[
('#06111f','#102b35','#65d6cf','#f2c979','#ef91ad','#9b8df2'),
('#090d22','#2a1635','#b494ff','#ffb276','#ff7f9e','#6fd4de'),
('#071917','#24351f','#9cdda1','#f0c767','#79d9c9','#d897d6'),
('#071124','#1f3151','#7fb8ff','#c7a0ff','#ff9e81','#f0d579'),
('#130d18','#40221f','#ff9d7c','#f1cc77','#cf8bd4','#6fc7c7')]

def rgb(h):
    h=h.lstrip('#')
    return tuple(int(h[i:i+2],16) for i in (0,2,4))

def mkbg(a,b):
    a=np.array(rgb(a),dtype=float); b=np.array(rgb(b),dtype=float)
    y=np.linspace(0,1,H)[:,None,None]
    x=np.linspace(0,1,W)[None,:,None]
    t=.65*y+.35*(x+y)/2
    arr=(a[None,None,:]*(1-t)+b[None,None,:]*t).clip(0,255).astype('uint8')
    return Image.fromarray(arr,'RGB').convert('RGBA')

def glow(im,x,y,color,r,alpha):
    layer=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(layer); c=rgb(color)
    d.ellipse((x-r,y-r,x+r,y+r),fill=(*c,int(alpha*255)))
    layer=layer.filter(ImageFilter.GaussianBlur(r/2))
    im.alpha_composite(layer)

def bez(p0,p1,p2,p3,t):
    u=1-t
    return (u**3*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t**3*p3[0],
            u**3*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t**3*p3[1])

def curve(d,pts,prog,color,w,a=255):
    n=max(2,int(80*max(0,min(1,prog))))
    arr=[bez(*pts,i/80) for i in range(n+1)]
    d.line(arr,fill=(*rgb(color),a),width=w,joint='curve')

def petal(layer,cx,cy,rx,ry,ang,color,alpha):
    temp=Image.new('RGBA',(int(rx*2+8),int(ry*2+8)),(0,0,0,0))
    d=ImageDraw.Draw(temp)
    d.ellipse((4,4,4+2*rx,4+2*ry),fill=(*rgb(color),alpha))
    temp=temp.rotate(math.degrees(ang),resample=Image.Resampling.BICUBIC,expand=True)
    layer.alpha_composite(temp,(int(cx-temp.width/2),int(cy-temp.height/2)))

def flower(im,cx,cy,r,p,alpha=220):
    if r<2: return
    layer=Image.new('RGBA',(W,H),(0,0,0,0)); cols=[p[2],p[4],p[5],p[3]]
    for i in range(7):
        a=-math.pi/2+i*2*math.pi/7
        petal(layer,cx+math.cos(a)*r*.48,cy+math.sin(a)*r*.48,r*.34,r*.15,a,cols[i%4],alpha)
    d=ImageDraw.Draw(layer)
    d.ellipse((cx-r*.12,cy-r*.12,cx+r*.12,cy+r*.12),fill=(*rgb(p[3]),240))
    im.alpha_composite(layer)

BG=[mkbg(p[0],p[1]) for p in PAL]
STARS=[]
for idx,p in enumerate(PAL):
    rnd=random.Random(100+idx)
    STARS.append([(rnd.randrange(20,W-20),rnd.randrange(90,560),rnd.choice([1,1,1,2]),
                   [p[2],p[3],p[4],p[5]][i%4],60+rnd.randrange(80)) for i in range(64)])

def base(idx):
    p=PAL[idx]
    im=BG[idx].copy()
    glow(im,W*.22,H*.18,p[2],220,.16)
    glow(im,W*.80,H*.43,p[4],190,.12)
    d=ImageDraw.Draw(im,'RGBA')
    for x,y,r,c,a in STARS[idx]:
        d.ellipse((x-r,y-r,x+r,y+r),fill=(*rgb(c),a))
    d.rounded_rectangle((30,30,W-30,H-30),radius=34,outline=(220,240,240,26),width=2)
    d.text((48,55),'R A L U V A A A',fill=(242,247,246,220))
    d.text((48,845),'DISCOVER A WISH ON RALUVAAA',fill=(*rgb(p[3]),230))
    return im

BASE=[base(i) for i in range(5)]

def frame(idx,n):
    t=n/(FRAMES-1)
    im=BASE[idx].copy()
    p=PAL[idx]
    d=ImageDraw.Draw(im,'RGBA')
    if idx==0:
        cx,cy=W*.48,H*.36; beat=.5+.5*math.sin(t*math.pi*8)
        for k in range(3):
            rr=70+k*46+beat*5
            d.ellipse((cx-rr,cy-rr*.5,cx+rr,cy+rr*.5),outline=(*rgb([p[2],p[5],p[3]][k]),48),width=2)
        glow(im,cx,cy,p[2],85,.24)
        d.ellipse((cx-19-beat*7,cy-19-beat*7,cx+19+beat*7,cy+19+beat*7),fill=(*rgb(p[2]),235))
        d.ellipse((cx-6,cy-6,cx+6,cy+6),fill=(*rgb(p[3]),250))
        tip=(cx+175,cy-90)
        curve(d,((cx+10,cy),(cx+70,cy-85),(cx+130,cy-52),tip),min(1,t*1.6),p[3],4,150)
        d.ellipse((tip[0]-8,tip[1]-8,tip[0]+8,tip[1]+8),fill=(*rgb(p[4]),220))
    elif idx==1:
        prog=min(1,t*1.25); root=(W*.18,H*.55); end=(W*.79,H*.24)
        main=(root,(W*.31,H*.49),(W*.56,H*.47),end)
        curve(d,main,prog,p[2],7,215); curve(d,main,max(0,prog-.04),p[3],2,120)
        for j,(q,end2,col) in enumerate([(0.35,(W*.39,H*.25),p[5]),(0.53,(W*.61,H*.30),p[4]),(0.69,(W*.79,H*.49),p[3])]):
            b=bez(*main,q); bp=max(0,min(1,(prog-(.22+j*.13))/.56))
            curve(d,(b,(b[0]+38,b[1]-20+j*18),(end2[0]-42,end2[1]+28-j*18),end2),bp,col,4,190)
        d.ellipse((root[0]-9,root[1]-9,root[0]+9,root[1]+9),fill=(*rgb(p[3]),230))
    elif idx==2:
        l=(W*.20,H*.43); r=(W*.80,H*.40)
        for j,c in enumerate((l,r)):
            d.ellipse((c[0]-11,c[1]-11,c[0]+11,c[1]+11),fill=(*rgb(p[2] if j==0 else p[4]),235))
        prog=min(1,t*1.3); arr=[]
        for i in range(max(2,int(100*prog))+1):
            u=i/100
            arr.append((l[0]+(r[0]-l[0])*u,l[1]+(r[1]-l[1])*u-math.sin(u*math.pi)*135))
        d.line(arr,fill=(*rgb(p[3]),210),width=5,joint='curve')
        for k in range(4):
            u=(t*.65+k*.23)%1
            x=l[0]+(r[0]-l[0])*u; y=l[1]+(r[1]-l[1])*u-math.sin(u*math.pi)*135
            d.ellipse((x-5,y-5,x+5,y+5),fill=(*rgb(p[5] if k%2 else p[3]),230))
    elif idx==3:
        o=min(1,t*1.3)
        flower(im,W*.49,H*.36,72*o,p,225)
        if o>.3:
            k=(o-.3)/.7
            flower(im,W*.30,H*.46,40*k,(p[0],p[1],p[4],p[3],p[2],p[5]),185)
            flower(im,W*.69,H*.46,44*k,(p[0],p[1],p[5],p[3],p[4],p[2]),190)
    else:
        a=max(0,min(1,(t-.08)/.84)); root=(W*.20,H*.50); end=(W*.78,H*.28)
        main=(root,(W*.34,H*.48),(W*.58,H*.43),end)
        curve(d,main,1,'#74685f',6,90); curve(d,main,a,p[2],6,210)
        if a>.55: flower(im,end[0],end[1],30*((a-.55)/.45),p,205)
        pulse=.5+.5*math.sin(t*math.pi*6)
        d.ellipse((root[0]-9-pulse*3,root[1]-9-pulse*3,root[0]+9+pulse*3,root[1]+9+pulse*3),fill=(*rgb(p[3]),220))
    return im.convert('RGB')

def make_audio():
    sr=44100; dur=9.0; n=int(sr*dur); t=np.arange(n)/sr
    freqs=[220.0,261.63,329.63]
    y=np.zeros(n,dtype=np.float64)
    for i,f in enumerate(freqs):
        y += 0.10*np.sin(2*np.pi*f*t+i*.7)+0.035*np.sin(2*np.pi*(f/2)*t+i)
    y*=0.78+0.22*np.sin(2*np.pi*0.10*t-math.pi/2)
    for st,f in [(1.0,440.0),(2.8,523.25),(4.6,659.25),(6.4,523.25),(7.5,440.0)]:
        tt=np.arange(max(0,int((dur-st)*sr)))/sr
        sig=(0.18*np.sin(2*np.pi*f*tt)+0.05*np.sin(2*np.pi*2*f*tt))*np.exp(-2.5*tt)
        a=int(st*sr); b=min(n,a+len(sig)); y[a:b]+=sig[:b-a]
    left=y.copy(); shift=int(.013*sr); right=np.roll(y,shift); right[:shift]=0
    fade=np.ones(n); fi=int(.7*sr); fo=int(1.1*sr)
    fade[:fi]=np.linspace(0,1,fi); fade[-fo:]=np.linspace(1,0,fo)
    left*=fade; right*=fade
    mx=max(np.max(np.abs(left)),np.max(np.abs(right)),1e-6); scale=0.78/mx
    pcm=(np.stack([left*scale,right*scale],axis=1)*32767).astype('<i2')
    path=os.path.join(OUT,'share-ambient.wav')
    with wave.open(path,'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())
    return path

def run():
    os.makedirs(OUT,exist_ok=True)
    audio=make_audio()
    work=os.path.join(OUT,'.frames')
    os.makedirs(work,exist_ok=True)
    for idx in range(5):
        folder=os.path.join(work,f'f{idx+1}')
        os.makedirs(folder,exist_ok=True)
        for n in range(FRAMES):
            frame(idx,n).save(os.path.join(folder,f'{n:04d}.jpg'),quality=84)
        frame(idx,int(FRAMES*.64)).save(os.path.join(OUT,f'poster-{idx+1}.png'),quality=95)
        target=os.path.join(OUT,f'template-{idx+1}.mp4')
        subprocess.run([
            'ffmpeg','-y','-hide_banner','-loglevel','error','-framerate',str(FPS),
            '-i',os.path.join(folder,'%04d.jpg'),'-i',audio,
            '-c:v','libx264','-preset','medium','-crf','22','-pix_fmt','yuv420p',
            '-profile:v','main','-level','3.1','-movflags','+faststart',
            '-c:a','aac','-b:a','128k','-shortest',target
        ],check=True)
    for idx in range(5):
        subprocess.run(['ffprobe','-v','error','-select_streams','a:0','-show_entries','stream=codec_name',
                        '-of','csv=p=0',os.path.join(OUT,f'template-{idx+1}.mp4')],check=True)
    print('Generated five prebuilt V45 share videos + posters with embedded audio.')

if __name__=='__main__':
    run()
