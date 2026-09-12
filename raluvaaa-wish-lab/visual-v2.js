/* RALUVAAA Visual System V2
   Restores the fine, organic, mycelial / neural world language while keeping
   the WISH product model and all current interactions intact.

   Important: spatial organisation is deterministic but deliberately unrelated
   to theme, geography, date or profile. It is visual topology only. */

(function(){
  'use strict';

  if(typeof wishes==='undefined'||typeof ctx==='undefined'||typeof worldToScreen!=='function') return;

  const V2_WORLD={w:3200,h:2100};
  const V2_ROOTS=[
    {x:390,y:390,c:'#6e9fd0'},
    {x:1010,y:620,c:'#a45cd1'},
    {x:1600,y:360,c:'#c56cad'},
    {x:2250,y:610,c:'#6ed5d0'},
    {x:2830,y:370,c:'#d4b864'},
    {x:610,y:1460,c:'#7757c4'},
    {x:1510,y:1510,c:'#b65fce'},
    {x:2460,y:1470,c:'#65c1c2'}
  ];

  const v2Segments=[];
  const v2Anchors=[];
  const v2CoreDust=[];
  const v2StarDust=[];
  const v2Assigned=new Map();

  function v2Rnd(seed){
    let t=seed>>>0;
    return function(){
      t+=0x6D2B79F5;
      let r=Math.imul(t^t>>>15,1|t);
      r^=r+Math.imul(r^r>>>7,61|r);
      return((r^r>>>14)>>>0)/4294967296;
    };
  }

  function v2Hash(s){
    let h=2166136261;
    s=String(s);
    for(let i=0;i<s.length;i++){
      h^=s.charCodeAt(i);
      h=Math.imul(h,16777619);
    }
    return h>>>0;
  }

  const vr=v2Rnd(0x52414c55);

  function v2Grow(rootIndex,x,y,angle,steps,depth){
    const root=V2_ROOTS[rootIndex];
    let px=x,py=y,a=angle;
    for(let i=0;i<steps;i++){
      a+=(vr()-.5)*(depth?0.42:0.29);
      const len=(depth?34:48)+vr()*(depth?44:58);
      const nx=Math.max(70,Math.min(V2_WORLD.w-70,px+Math.cos(a)*len));
      const ny=Math.max(70,Math.min(V2_WORLD.h-70,py+Math.sin(a)*len));
      const bend=(vr()-.5)*30;
      const c1x=px+(nx-px)*.34+Math.cos(a+Math.PI/2)*bend;
      const c1y=py+(ny-py)*.34+Math.sin(a+Math.PI/2)*bend;
      const c2x=px+(nx-px)*.72-Math.cos(a+Math.PI/2)*bend*.55;
      const c2y=py+(ny-py)*.72-Math.sin(a+Math.PI/2)*bend*.55;
      const active=vr()>(depth?0.66:0.49);
      const seg={root:rootIndex,x1:px,y1:py,c1x,c1y,c2x,c2y,x2:nx,y2:ny,depth,active,phase:vr(),width:.42+vr()*.46};
      v2Segments.push(seg);
      if(i>1||depth>0) v2Anchors.push({x:nx,y:ny,root:rootIndex,depth,active});

      if(depth<2&&i>1&&i<steps-1&&vr()<(depth?0.08:0.22)){
        const side=a+(vr()<.5?-1:1)*(0.48+vr()*.58);
        v2Grow(rootIndex,nx,ny,side,depth===0?3+Math.floor(vr()*4):2+Math.floor(vr()*3),depth+1);
      }
      px=nx;py=ny;
    }
  }

  V2_ROOTS.forEach((root,ri)=>{
    const rays=7+Math.floor(vr()*4);
    for(let r=0;r<rays;r++){
      const base=r*Math.PI*2/rays+(vr()-.5)*.34;
      v2Grow(ri,root.x,root.y,base,6+Math.floor(vr()*4),0);
    }
    for(let k=0;k<38;k++){
      const a=vr()*Math.PI*2;
      const rad=Math.pow(vr(),.68)*74;
      v2CoreDust.push({x:root.x+Math.cos(a)*rad,y:root.y+Math.sin(a)*rad,root:ri,r:.5+vr()*1.8,a:.07+vr()*.25});
    }
  });

  for(let i=0;i<170;i++){
    v2StarDust.push({x:vr()*V2_WORLD.w,y:vr()*V2_WORLD.h,r:.25+vr()*.8,a:.025+vr()*.07});
  }

  function v2AnchorFor(w,index){
    if(w.parent){
      const p=wishById(w.parent);
      if(p){
        const h=v2Hash(w.id);
        const a=((h%628)/100)-Math.PI;
        const d=92+(h%73);
        return{x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d,root:0,depth:1,active:true};
      }
    }
    const start=(v2Hash(w.id)+index*37)%v2Anchors.length;
    let idx=start;
    for(let tries=0;tries<v2Anchors.length;tries++){
      idx=(start+tries*53)%v2Anchors.length;
      if(!v2Assigned.has(idx)) break;
    }
    v2Assigned.set(idx,w.id);
    return v2Anchors[idx];
  }

  function raluvaaaSnapWishes(){
    v2Assigned.clear();
    const ordered=[...wishes].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
    ordered.forEach((w,i)=>{
      const an=v2AnchorFor(w,i);
      const h=v2Hash(w.id+'j');
      const jitter=3+(h%9);
      const ang=(h%628)/100;
      w.x=Math.max(50,Math.min(V2_WORLD.w-50,an.x+Math.cos(ang)*jitter));
      w.y=Math.max(50,Math.min(V2_WORLD.h-50,an.y+Math.sin(ang)*jitter));
      w._v2root=an.root;
    });
  }

  raluvaaaSnapWishes();

  /* Ambient proximity edges from the functional prototype are intentionally
     removed. A visible cross-world connection should correspond to an actual
     CONNECT / SPLIT action, while the organism underneath remains visual soil. */
  const v2OriginalRebuild=typeof rebuildEdges==='function'?rebuildEdges:null;
  rebuildEdges=function(){
    if(typeof edges!=='undefined') edges.length=0;
    for(const e of (state.customEdges||[])) edges.push(e);
    raluvaaaSnapWishes();
  };
  rebuildEdges();

  function v2RGBA(hex,a){
    const h=hex.replace('#','');
    const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function v2Visible(x,y,pad){
    const p=worldToScreen(x,y);
    return p.x>-pad&&p.x<W+pad&&p.y>-pad&&p.y<H+pad;
  }

  function v2Curve(seg){
    const p=worldToScreen(seg.x1,seg.y1),q=worldToScreen(seg.x2,seg.y2);
    const c1=worldToScreen(seg.c1x,seg.c1y),c2=worldToScreen(seg.c2x,seg.c2y);
    ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.bezierCurveTo(c1.x,c1.y,c2.x,c2.y,q.x,q.y);
  }

  function v2QuadPoint(p,c,q,t){
    const u=1-t;
    return{x:u*u*p.x+2*u*t*c.x+t*t*q.x,y:u*u*p.y+2*u*t*c.y+t*t*q.y};
  }

  function v2DrawBackground(now){
    ctx.fillStyle='#020610';ctx.fillRect(0,0,W,H);
    const bg=ctx.createRadialGradient(W*.49,H*.38,0,W*.49,H*.38,Math.max(W,H)*.92);
    bg.addColorStop(0,'#07182a');
    bg.addColorStop(.42,'#03101d');
    bg.addColorStop(.76,'#020813');
    bg.addColorStop(1,'#01040a');
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);

    ctx.save();
    for(const s of v2StarDust){
      const p=worldToScreen(s.x,s.y);
      if(p.x<-10||p.x>W+10||p.y<-10||p.y>H+10)continue;
      ctx.globalAlpha=s.a;
      ctx.fillStyle='#b8d7ef';
      ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.28,s.r*cam.z),0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }

  function v2DrawOrganism(now){
    ctx.lineCap='round';ctx.lineJoin='round';

    /* Fossil layer */
    ctx.save();
    for(const s of v2Segments){
      if(!v2Visible((s.x1+s.x2)/2,(s.y1+s.y2)/2,140))continue;
      v2Curve(s);
      const root=V2_ROOTS[s.root];
      const base=s.active?.075:.036;
      ctx.strokeStyle=v2RGBA(root.c,base*(s.depth===0?1:.76));
      ctx.lineWidth=Math.max(.25,s.width*cam.z*(s.depth===0?1:.72));
      ctx.stroke();
    }
    ctx.restore();

    /* Living traces layered over fossil geometry */
    ctx.save();
    for(let i=0;i<v2Segments.length;i++){
      const s=v2Segments[i];
      if(!s.active||!v2Visible((s.x1+s.x2)/2,(s.y1+s.y2)/2,130))continue;
      const root=V2_ROOTS[s.root];
      v2Curve(s);
      ctx.strokeStyle=v2RGBA(root.c,s.depth===0?.19:.12);
      ctx.lineWidth=Math.max(.38,(s.width+.14)*cam.z);
      ctx.stroke();

      /* Sparse travelling impulse, never every branch at once */
      if(i%17===0){
        const t=((now*.000025+s.phase)%1);
        const p=worldToScreen(s.x1+(s.x2-s.x1)*t,s.y1+(s.y2-s.y1)*t);
        const rr=Math.max(1.1,2.0*cam.z);
        const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,rr*5);
        g.addColorStop(0,v2RGBA(root.c,.55));g.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,rr*5,0,Math.PI*2);ctx.fill();
      }
    }
    ctx.restore();

    /* Root nuclei: not categories, only visual origins in the organism */
    ctx.save();
    for(let ri=0;ri<V2_ROOTS.length;ri++){
      const r=V2_ROOTS[ri],p=worldToScreen(r.x,r.y);
      if(p.x<-110||p.x>W+110||p.y<-110||p.y>H+110)continue;
      const rad=38*cam.z+18;
      const glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,rad);
      glow.addColorStop(0,v2RGBA(r.c,.13));glow.addColorStop(.35,v2RGBA(r.c,.06));glow.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,rad,0,Math.PI*2);ctx.fill();
    }
    for(const d of v2CoreDust){
      const p=worldToScreen(d.x,d.y),r=V2_ROOTS[d.root];
      if(p.x<-30||p.x>W+30||p.y<-30||p.y>H+30)continue;
      ctx.globalAlpha=d.a;
      ctx.fillStyle=r.c;ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.45,d.r*cam.z),0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }

  function v2DrawHumanEdges(now){
    if(typeof edges==='undefined')return;
    for(let i=0;i<edges.length;i++){
      const e=edges[i],a=wishById(e.a),b=wishById(e.b);
      if(!a||!b)continue;
      const p=worldToScreen(a.x,a.y),q=worldToScreen(b.x,b.y);
      if((p.x<-300&&q.x<-300)||(p.x>W+300&&q.x>W+300)||(p.y<-300&&q.y<-300)||(p.y>H+300&&q.y>H+300))continue;
      const dx=q.x-p.x,dy=q.y-p.y,dist=Math.hypot(dx,dy)||1;
      const normalX=-dy/dist,normalY=dx/dist;
      const bend=Math.min(135,dist*.18)*((v2Hash(e.a+e.b)%2)?1:-1);
      const c={x:(p.x+q.x)/2+normalX*bend,y:(p.y+q.y)/2+normalY*bend};

      ctx.save();
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo(c.x,c.y,q.x,q.y);
      ctx.strokeStyle='rgba(181,229,239,.34)';
      ctx.lineWidth=Math.max(.65,.95*cam.z);ctx.stroke();
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo(c.x,c.y,q.x,q.y);
      ctx.strokeStyle='rgba(151,199,222,.09)';ctx.lineWidth=Math.max(2,4*cam.z);ctx.stroke();

      const t=((now*.00009+(v2Hash(e.a+e.b)%100)/100)%1);
      const m=v2QuadPoint(p,c,q,t);
      const glow=ctx.createRadialGradient(m.x,m.y,0,m.x,m.y,10);
      glow.addColorStop(0,'rgba(224,250,255,.86)');glow.addColorStop(.18,'rgba(123,219,229,.35)');glow.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=glow;ctx.beginPath();ctx.arc(m.x,m.y,10,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }
  }

  function v2DrawWishes(now){
    for(const w of wishes){
      const p=worldToScreen(w.x,w.y);
      if(p.x<-75||p.x>W+75||p.y<-75||p.y>H+75)continue;

      const encouraged=(state.encouraged||[]).includes(w.id);
      const bloom=w.state==='bloom';
      const closed=w.state==='closed';
      const selected=selectedId===w.id;
      const root=V2_ROOTS[w._v2root||0];
      const col=bloom?'#f6e6a7':(w.color||root.c);
      const activity=Math.min(1,(w.enc||0)/18);
      const base=1.25+Math.min(1.7,cam.z*1.15)+activity*.55+(encouraged?.72:0);
      const glowR=(bloom?18:8.5)+(encouraged?6:0)+activity*4;

      ctx.save();
      ctx.globalAlpha=closed?.19:1;

      if(!closed){
        const glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,glowR);
        glow.addColorStop(0,v2RGBA(col,bloom?.56:.34+(encouraged?.13:0)));
        glow.addColorStop(.24,v2RGBA(col,.13+(encouraged?.06:0)));
        glow.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,glowR,0,Math.PI*2);ctx.fill();
      }

      ctx.fillStyle=closed?'rgba(124,149,170,.44)':col;
      ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.75,base),0,Math.PI*2);ctx.fill();

      if(encouraged&&!closed){
        ctx.strokeStyle=v2RGBA(col,.24);ctx.lineWidth=.55;
        ctx.beginPath();ctx.arc(p.x,p.y,base+4.5+Math.sin(now*.002+w.x)*.7,0,Math.PI*2);ctx.stroke();
      }

      if(bloom&&!closed){
        for(let k=0;k<8;k++){
          const a=k*Math.PI/4+now*.00008;
          const rr=7.5+Math.sin(now*.001+k)*1.1;
          ctx.fillStyle='rgba(252,238,177,.65)';
          ctx.beginPath();ctx.arc(p.x+Math.cos(a)*rr,p.y+Math.sin(a)*rr,.72+cam.z*.28,0,Math.PI*2);ctx.fill();
        }
      }

      if(selected){
        ctx.strokeStyle='rgba(226,241,251,.64)';ctx.lineWidth=.72;
        ctx.beginPath();ctx.arc(p.x,p.y,base+8+Math.sin(now*.003)*1.1,0,Math.PI*2);ctx.stroke();
      }

      if((cam.z>1.22&& !closed)||selected){
        ctx.font=`${selected?'500 ':'400 '}10.5px Inter,ui-sans-serif,sans-serif`;
        ctx.fillStyle=selected?'rgba(232,241,250,.88)':'rgba(190,207,225,.58)';
        const text=w.text.length>42?w.text.slice(0,42)+'…':w.text;
        ctx.fillText(text,p.x+9,p.y-7);
      }
      ctx.restore();
    }
  }

  function drawOrganic(){
    const now=Date.now();
    v2DrawBackground(now);
    v2DrawOrganism(now);
    v2DrawHumanEdges(now);
    v2DrawWishes(now);
    requestAnimationFrame(draw);
  }

  draw=drawOrganic;

  /* Keep the existing interaction radius slightly generous because the new
     visible wish nodes are intentionally finer than in the first Wish Lab. */
  nearestWish=function(sx,sy){
    let best=null,bd=28;
    for(const w of wishes){
      const p=worldToScreen(w.x,w.y),d=Math.hypot(p.x-sx,p.y-sy);
      if(d<bd){bd=d;best=w;}
    }
    return best;
  };

  /* Recenter to the organic world on both mobile and desktop. */
  cam.x=1600;cam.y=1050;
  cam.z=Math.max(.27,Math.min(.70,innerWidth/1900));

  if(typeof document!=='undefined'){
    document.documentElement.dataset.visual='organic-v2';
  }
})();
