from PIL import Image, ImageDraw, ImageFont
import math, os
W,H,FPS,D=1080,1920,30,12
out="tmp_silmea_frames"; os.makedirs(out,exist_ok=True)
font="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
fb=ImageFont.truetype(font,78); fm=ImageFont.truetype(font,46); fs=ImageFont.truetype(font,34)
for i in range(FPS*D):
    t=i/FPS
    im=Image.new("RGB",(W,H),(4,5,8)); d=ImageDraw.Draw(im); cy=H//2+80
    for r in range(520,10,-22):
        a=(1-r/520)*0.10; c=(int(10+40*a),int(12+70*a),int(18+90*a)); d.ellipse((W//2-r,H//2-r,W//2+r,H//2+r),fill=c)
    pts=[]
    for x in range(70,W-70,4):
        nx=(x-70)/(W-140); amp=90+70*math.sin(t*.7)**2; y=cy+amp*math.sin(nx*math.pi*8+t*2.7)*math.sin(nx*math.pi); pts.append((x,y))
    d.line(pts,fill=(170,210,225),width=4)
    for k in range(3):
        p=(t*.35+k/3)%1; rr=120+p*390; s=max(20,int(90*(1-p))); d.ellipse((W//2-rr,cy-rr,W//2+rr,cy+rr),outline=(s,s+20,s+30),width=2)
    if t<3.6: lines=["CLOSE YOUR EYES.","THE MOVIE STARTS NOW."]
    elif t<8: lines=["CAN A MOVIE EXIST","WITHOUT IMAGES?"]
    else: lines=["SILMEA","films without images"]
    y0=290
    for j,line in enumerate(lines):
        f=fb if j==0 or t<8 else fm
        bb=d.textbbox((0,0),line,font=f); d.text(((W-(bb[2]-bb[0]))/2,y0+j*110),line,font=f,fill=(242,244,248) if j==0 else (190,196,206))
    footer="CONFLUENCE OF MINDS"; bb=d.textbbox((0,0),footer,font=fs); d.text(((W-(bb[2]-bb[0]))/2,H-150),footer,font=fs,fill=(150,156,166))
    im.save(f"{out}/f{i:04d}.jpg",quality=90)
