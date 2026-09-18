(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
  const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
  const mix = (a, b, t) => a + (b - a) * t;

  const LABELS = {
    en: [
      ['MAKE A WISH', .025, .16, .115, .82],
      ['BREAK IT DOWN', .23, .42, .42, .43],
      ['GET SUPPORT', .43, .58, .62, .78],
      ['CONNECT', .59, .72, .74, .48],
      ['BLOOM', .82, .985, .78, .13]
    ],
    fr: [
      ['FAIS UN VŒU', .025, .16, .115, .82],
      ['DÉCOUPE-LE', .23, .42, .42, .43],
      ['REÇOIS DE L’AIDE', .43, .58, .62, .78],
      ['CONNECTE', .59, .72, .74, .48],
      ['ÉCLOS', .82, .985, .78, .13]
    ]
  };

  const MAIN_SEGMENTS = [
    { a:[.11,.70], c1:[.20,.68], c2:[.29,.58], b:[.39,.54], s:.10, e:.29 },
    { a:[.39,.54], c1:[.48,.49], c2:[.57,.39], b:[.66,.31], s:.24, e:.43 },
    { a:[.66,.31], c1:[.74,.27], c2:[.83,.21], b:[.91,.17], s:.34, e:.48 },
    { a:[.39,.54], c1:[.49,.60], c2:[.58,.69], b:[.69,.72], s:.28, e:.47 },
    { a:[.69,.72], c1:[.77,.75], c2:[.85,.74], b:[.92,.68], s:.39, e:.53 },
    { a:[.54,.43], c1:[.61,.45], c2:[.69,.53], b:[.79,.50], s:.38, e:.54 },
    { a:[.66,.31], c1:[.65,.22], c2:[.61,.16], b:[.62,.105], s:.43, e:.56 },
    { a:[.55,.64], c1:[.56,.73], c2:[.61,.80], b:[.67,.86], s:.43, e:.57 },
    { a:[.79,.50], c1:[.84,.46], c2:[.87,.42], b:[.89,.37], s:.72, e:.82 }
  ];

  const SECOND_SEGMENTS = [
    { a:[.84,.64], c1:[.88,.61], c2:[.91,.57], b:[.94,.52], s:.54, e:.64 },
    { a:[.94,.52], c1:[.93,.46], c2:[.92,.41], b:[.95,.35], s:.58, e:.68 },
    { a:[.94,.52], c1:[.97,.55], c2:[.98,.59], b:[.985,.63], s:.60, e:.69 }
  ];

  const NODES = [
    {p:[.11,.70], d:.92, r:4.6},
    {p:[.39,.54], d:.68, r:4.0},
    {p:[.54,.43], d:.46, r:3.6},
    {p:[.66,.31], d:.26, r:3.8},
    {p:[.91,.17], d:.00, r:4.4},
    {p:[.69,.72], d:.48, r:3.9},
    {p:[.92,.68], d:.27, r:4.2},
    {p:[.79,.50], d:.35, r:3.8},
    {p:[.89,.37], d:.10, r:4.6},
    {p:[.62,.105], d:.18, r:3.8},
    {p:[.67,.86], d:.28, r:3.8},
    {p:[.84,.64], d:.55, r:3.6, second:true},
    {p:[.94,.52], d:.38, r:3.6, second:true},
    {p:[.95,.35], d:.22, r:3.8, second:true},
    {p:[.985,.63], d:.20, r:3.8, second:true}
  ];

  const SUPPORT_TARGETS = [
    {from:[.47,.92], to:[.63,.66], delay:0.00},
    {from:[.56,.97], to:[.66,.69], delay:0.10},
    {from:[.72,.94], to:[.70,.69], delay:0.20},
    {from:[.81,.91], to:[.73,.67], delay:0.29},
    {from:[.58,.88], to:[.61,.61], delay:0.38}
  ];

  const cubic = (seg, t) => {
    const u = 1-t, tt=t*t, uu=u*u;
    return [
      uu*u*seg.a[0] + 3*uu*t*seg.c1[0] + 3*u*tt*seg.c2[0] + tt*t*seg.b[0],
      uu*u*seg.a[1] + 3*uu*t*seg.c1[1] + 3*u*tt*seg.c2[1] + tt*t*seg.b[1]
    ];
  };

  const hash = (n) => {
    const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  class RaluvaVisual {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: true });
      this.mode = canvas.dataset.raluvaVisual || 'loop';
      this.lang = canvas.dataset.lang === 'fr' ? 'fr' : 'en';
      this.start = performance.now();
      this.dpr = 1;
      this.visible = true;
      this.reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas);
      this.resize();
      if ('IntersectionObserver' in window) {
        this.io = new IntersectionObserver((entries) => {
          for (const entry of entries) this.visible = entry.isIntersecting;
        }, { rootMargin: '220px' });
        this.io.observe(canvas);
      }
      this.tick = this.tick.bind(this);
      requestAnimationFrame(this.tick);
    }

    resize() {
      const r = this.canvas.getBoundingClientRect();
      this.w = Math.max(1, r.width);
      this.h = Math.max(1, r.height);
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rw = Math.round(this.w * this.dpr), rh = Math.round(this.h * this.dpr);
      if (rw !== this.canvas.width || rh !== this.canvas.height) {
        this.canvas.width = rw;
        this.canvas.height = rh;
      }
      this.scale = Math.min(this.w, this.h);
    }

    progress(now) {
      const elapsed = (now - this.start) / 1000;
      if (this.reduced) {
        if (this.mode === 'wish') return .18;
        if (this.mode === 'split') return .46;
        if (this.mode === 'support') return .57;
        if (this.mode === 'connect') return .71;
        return .94;
      }
      if (this.mode === 'hero') return (elapsed % 14.5) / 14.5;
      if (this.mode === 'loop') return (elapsed % 12.6) / 12.6;
      if (this.mode === 'wish') return .055 + ((elapsed % 5.0) / 5.0) * .19;
      if (this.mode === 'split') return .24 + ((elapsed % 6.5) / 6.5) * .28;
      if (this.mode === 'support') return .43 + ((elapsed % 5.8) / 5.8) * .15;
      if (this.mode === 'connect') return .56 + ((elapsed % 6.2) / 6.2) * .17;
      if (this.mode === 'bloom') return .78 + ((elapsed % 6.8) / 6.8) * .215;
      return (elapsed % 12.6) / 12.6;
    }

    map(p) { return [p[0] * this.w, p[1] * this.h]; }

    drawBackground(p) {
      const ctx = this.ctx, w = this.w, h = this.h;
      const g = ctx.createRadialGradient(w*.61,h*.43,0,w*.61,h*.43,Math.max(w,h)*.72);
      g.addColorStop(0, '#10323b');
      g.addColorStop(.38, '#071923');
      g.addColorStop(.78, '#030912');
      g.addColorStop(1, '#02050b');
      ctx.fillStyle = g;
      ctx.fillRect(0,0,w,h);
      const glow = ctx.createRadialGradient(w*.78,h*.2,0,w*.78,h*.2,Math.max(w,h)*.5);
      glow.addColorStop(0, 'rgba(46,121,128,.11)');
      glow.addColorStop(1, 'rgba(2,6,16,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0,0,w,h);
      for (let i=0;i<78;i++) {
        const x = hash(i*3+2) * w;
        const y = hash(i*7+5) * h;
        const tw = .35 + .65 * Math.sin((p*TAU*2) + i);
        const r = .35 + hash(i*11+4) * 1.25;
        ctx.fillStyle = 'rgba(151,225,218,' + (.025 + .07*tw) + ')';
        ctx.beginPath();
        ctx.arc(x,y,r,0,TAU);
        ctx.fill();
      }
    }

    drawSegment(seg, p, second=false) {
      const local = clamp((p - seg.s) / (seg.e - seg.s));
      if (local <= 0) return;
      const eased = easeOut(local);
      const ctx = this.ctx;
      const samples = Math.max(8, Math.round(44 * eased));
      const draw = (stroke, width, alpha) => {
        ctx.beginPath();
        for (let i=0;i<=samples;i++) {
          const t = eased * i / samples;
          const pt = cubic(seg,t);
          const xy = this.map(pt);
          if (i===0) ctx.moveTo(xy[0],xy[1]); else ctx.lineTo(xy[0],xy[1]);
        }
        ctx.strokeStyle = stroke;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      };
      draw(second ? 'rgba(132,172,255,.28)' : 'rgba(79,226,204,.22)', Math.max(7, this.scale*.012), .92);
      draw(second ? 'rgba(155,186,255,.88)' : 'rgba(119,238,218,.93)', Math.max(1.7, this.scale*.0033), 1);
      const tip = this.map(cubic(seg,eased));
      const pulse = ctx.createRadialGradient(tip[0],tip[1],0,tip[0],tip[1],Math.max(10,this.scale*.035));
      pulse.addColorStop(0, second ? 'rgba(215,225,255,.9)' : 'rgba(220,255,247,.94)');
      pulse.addColorStop(.2, second ? 'rgba(139,174,255,.38)' : 'rgba(82,233,207,.35)');
      pulse.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = pulse;
      ctx.globalAlpha = .75;
      ctx.beginPath(); ctx.arc(tip[0],tip[1],Math.max(10,this.scale*.035),0,TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }

    drawSeed(p) {
      const ctx = this.ctx;
      const xy = this.map([.11,.70]);
      const local = smooth(clamp(p/.15));
      const pulse = .9 + Math.sin(p*TAU*9)*.08;
      const radius = this.scale * (.018 + .045*local) * pulse;
      const g = ctx.createRadialGradient(xy[0],xy[1],0,xy[0],xy[1],radius);
      g.addColorStop(0,'rgba(245,255,250,1)');
      g.addColorStop(.15,'rgba(157,249,230,.92)');
      g.addColorStop(.48,'rgba(75,228,202,.24)');
      g.addColorStop(1,'rgba(75,228,202,0)');
      ctx.fillStyle=g; ctx.beginPath();ctx.arc(xy[0],xy[1],radius,0,TAU);ctx.fill();
      ctx.fillStyle='#effff9';ctx.beginPath();ctx.arc(xy[0],xy[1],Math.max(2.6,this.scale*.0065),0,TAU);ctx.fill();
    }

    drawNodes(p) {
      const ctx=this.ctx;
      const appear = smooth(clamp((p-.25)/.15));
      if (appear<=0) return;
      for (let i=0;i<NODES.length;i++) {
        const n=NODES[i];
        if (n.second && p<.54) continue;
        const xy=this.map(n.p);
        const r=Math.max(1.8,this.scale*.0048*n.r/4);
        ctx.fillStyle=n.second?'rgba(187,205,255,.86)':'rgba(198,255,242,.88)';
        ctx.shadowBlur=this.scale*.025;ctx.shadowColor=n.second?'rgba(130,163,255,.55)':'rgba(105,240,217,.6)';
        ctx.globalAlpha=appear;
        ctx.beginPath();ctx.arc(xy[0],xy[1],r,0,TAU);ctx.fill();
      }
      ctx.shadowBlur=0;ctx.globalAlpha=1;
    }

    drawSupport(p) {
      const ctx=this.ctx;
      const phase=clamp((p-.43)/.16);
      if(phase<=0) return;
      for(let i=0;i<SUPPORT_TARGETS.length;i++){
        const item=SUPPORT_TARGETS[i];
        const lp=clamp((phase-item.delay)/.62);
        if(lp<=0||lp>=1) continue;
        const t=smooth(lp);
        const x=mix(item.from[0],item.to[0],t)*this.w;
        const y=mix(item.from[1],item.to[1],t)*this.h - Math.sin(t*Math.PI)*this.h*.045;
        const r=Math.max(3,this.scale*.007*(.8+.4*Math.sin(t*Math.PI)));
        const g=ctx.createRadialGradient(x,y,0,x,y,r*5);
        g.addColorStop(0,'rgba(255,242,199,.98)');
        g.addColorStop(.18,'rgba(255,194,103,.75)');
        g.addColorStop(1,'rgba(255,194,103,0)');
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*5,0,TAU);ctx.fill();
        ctx.fillStyle='#ffd39a';ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
      }
      if(phase>.48){
        const q=smooth((phase-.48)/.52);
        const xy=this.map([.67,.69]);
        const g=ctx.createRadialGradient(xy[0],xy[1],0,xy[0],xy[1],this.scale*.12*q);
        g.addColorStop(0,'rgba(255,203,120,.30)');
        g.addColorStop(1,'rgba(255,203,120,0)');
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(xy[0],xy[1],this.scale*.12*q,0,TAU);ctx.fill();
      }
    }

    drawConnection(p) {
      const ctx=this.ctx;
      const phase=clamp((p-.58)/.15);
      if(phase<=0) return;
      const p0=this.map([.79,.50]), p3=this.map([.94,.52]);
      const c1=[p0[0]+this.w*.04,p0[1]-this.h*.10];
      const c2=[p3[0]-this.w*.05,p3[1]-this.h*.08];
      const eased=easeOut(phase);
      const samples=Math.max(2,Math.round(34*eased));
      ctx.beginPath();
      for(let i=0;i<=samples;i++){
        const t=eased*i/samples, u=1-t;
        const x=u*u*u*p0[0]+3*u*u*t*c1[0]+3*u*t*t*c2[0]+t*t*t*p3[0];
        const y=u*u*u*p0[1]+3*u*u*t*c1[1]+3*u*t*t*c2[1]+t*t*t*p3[1];
        if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.lineCap='round';
      ctx.strokeStyle='rgba(172,145,255,.25)';ctx.lineWidth=Math.max(7,this.scale*.012);ctx.stroke();
      ctx.strokeStyle='rgba(190,164,255,.95)';ctx.lineWidth=Math.max(1.6,this.scale*.003);ctx.stroke();
      const pulseT=(performance.now()/1200)%1;
      if(phase>.65){
        const t=pulseT,u=1-t;
        const x=u*u*u*p0[0]+3*u*u*t*c1[0]+3*u*t*t*c2[0]+t*t*t*p3[0];
        const y=u*u*u*p0[1]+3*u*u*t*c1[1]+3*u*t*t*c2[1]+t*t*t*p3[1];
        const g=ctx.createRadialGradient(x,y,0,x,y,this.scale*.025);
        g.addColorStop(0,'rgba(248,240,255,1)');g.addColorStop(.3,'rgba(176,145,255,.75)');g.addColorStop(1,'rgba(176,145,255,0)');
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,this.scale*.025,0,TAU);ctx.fill();
      }
    }

    drawFlower(x,y,amount,index) {
      if(amount<=0) return;
      const ctx=this.ctx;
      const a=easeOut(amount);
      const base=Math.max(7,this.scale*.018) * a;
      ctx.save();
      ctx.translate(x,y);
      ctx.rotate((hash(index*17)-.5)*.7);
      ctx.shadowBlur=base*1.8;ctx.shadowColor='rgba(255,190,105,.75)';
      for(let i=0;i<6;i++){
        ctx.save();
        ctx.rotate(i*TAU/6);
        ctx.globalAlpha=.25+.75*a;
        ctx.fillStyle=i%2?'#ffb36d':'#ffe0a0';
        ctx.beginPath();
        ctx.ellipse(0,-base*1.05,base*.36,base*1.05,0,0,TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle='#fff2c9';ctx.globalAlpha=a;ctx.beginPath();ctx.arc(0,0,base*.36,0,TAU);ctx.fill();
      ctx.restore();
      const burst=smooth(clamp((amount-.28)/.72));
      if(burst>0){
        for(let j=0;j<7;j++){
          const ang=hash(index*31+j*7)*TAU;
          const speed=(.55+hash(index*13+j*11)*.7)*base*3.3*burst;
          const px=x+Math.cos(ang)*speed;
          const py=y+Math.sin(ang)*speed;
          const rr=Math.max(.7,base*.085*(1-burst*.35));
          ctx.fillStyle='rgba(255,'+Math.round(190+45*hash(j+index))+',125,'+(.8*(1-burst*.5))+')';
          ctx.beginPath();ctx.arc(px,py,rr,0,TAU);ctx.fill();
        }
      }
    }

    drawBloom(p) {
      const ctx=this.ctx;
      const start=.82;
      if(p<start) return;
      const phase=clamp((p-start)/.16);
      const fade=1-smooth(clamp((p-.965)/.035));
      ctx.globalAlpha=fade;
      for(let i=0;i<NODES.length;i++){
        const n=NODES[i];
        const delay=n.d*.48;
        const amount=clamp((phase-delay)/.34);
        const xy=this.map(n.p);
        this.drawFlower(xy[0],xy[1],amount,i+1);
      }
      const wave=smooth(clamp((phase-.16)/.72));
      if(wave>0){
        for(let i=0;i<56;i++){
          const idx=i%NODES.length;
          const n=NODES[idx];
          const xy=this.map(n.p);
          const ang=hash(i*29+7)*TAU;
          const rad=this.scale*(.02+.16*hash(i*17+3))*wave;
          const x=xy[0]+Math.cos(ang)*rad;
          const y=xy[1]+Math.sin(ang)*rad;
          const size=.7+hash(i*5+1)*2.1;
          const alpha=(1-wave*.55)*(.25+.65*hash(i*11));
          ctx.fillStyle='rgba(255,'+Math.round(170+75*hash(i*3))+','+Math.round(95+70*hash(i*9))+','+alpha+')';
          ctx.beginPath();ctx.arc(x,y,size,0,TAU);ctx.fill();
        }
      }
      if(phase>.54){
        const flash=smooth(clamp((phase-.54)/.2))*(1-smooth(clamp((phase-.82)/.18)));
        const g=ctx.createRadialGradient(this.w*.65,this.h*.45,0,this.w*.65,this.h*.45,Math.max(this.w,this.h)*.58);
        g.addColorStop(0,'rgba(255,210,138,'+(.10*flash)+')');
        g.addColorStop(.45,'rgba(126,239,219,'+(.08*flash)+')');
        g.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=g;ctx.fillRect(0,0,this.w,this.h);
      }
      ctx.globalAlpha=1;
    }

    drawLabels(p) {
      if(this.mode !== 'loop') return;
      const ctx=this.ctx;
      const items=LABELS[this.lang] || LABELS.en;
      ctx.textBaseline='middle';
      ctx.font='700 '+Math.max(9,Math.min(12,this.w*.016))+'px DM Sans, system-ui, sans-serif';
      for(const item of items){
        const txt=item[0],s=item[1],e=item[2],nx=item[3],ny=item[4];
        if(p<s||p>e) continue;
        const local=clamp((p-s)/(e-s));
        const alpha=smooth(clamp(local/.18))*(1-smooth(clamp((local-.78)/.22)));
        const x=nx*this.w, y=ny*this.h;
        const tw=ctx.measureText(txt).width;
        ctx.globalAlpha=alpha;
        ctx.fillStyle='rgba(2,8,15,.56)';
        const padX=10,padY=7,rx=x-padX,ry=y-10-padY,rw=tw+padX*2,rh=20+padY*2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(rx,ry,rw,rh,10); else ctx.rect(rx,ry,rw,rh);
        ctx.fill();
        ctx.strokeStyle='rgba(179,245,232,.24)';ctx.lineWidth=1;ctx.stroke();
        ctx.fillStyle='rgba(229,255,250,.96)';
        ctx.fillText(txt,x,y);
        ctx.globalAlpha=1;
      }
    }

    draw(now) {
      const p=this.progress(now);
      const ctx=this.ctx;
      ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
      ctx.clearRect(0,0,this.w,this.h);
      this.drawBackground(p);
      this.drawSeed(p);
      for(const seg of MAIN_SEGMENTS) this.drawSegment(seg,p,false);
      for(const seg of SECOND_SEGMENTS) this.drawSegment(seg,p,true);
      this.drawNodes(p);
      this.drawSupport(p);
      this.drawConnection(p);
      this.drawBloom(p);
      this.drawLabels(p);
    }

    tick(now) {
      if(this.visible || this.mode==='loop') this.draw(now);
      requestAnimationFrame(this.tick);
    }
  }

  const boot=()=>{
    document.querySelectorAll('canvas[data-raluva-visual]').forEach((c)=>{
      if(!c.__raluvaVisual) c.__raluvaVisual=new RaluvaVisual(c);
    });
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();