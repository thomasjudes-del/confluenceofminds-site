/* RALUVAAA V20: action motion language over the existing V18 renderer. */
(function(){
  'use strict';
  const frame=document.getElementById('engine');
  if(!frame)return;

  function inject(){
    const doc=frame.contentDocument;
    if(!doc||!doc.body)return;
    const script=doc.createElement('script');
    script.textContent=`(function(){
      try{
        if(!window.RV_BRIDGE||typeof drawNode!=='function')return;
        const fx=[];
        const now=()=>performance.now();
        function addFx(id,type,duration){
          if(!id)return;
          fx.push({id,type,start:now(),dur:duration||1200});
          if(fx.length>24)fx.splice(0,fx.length-24);
        }
        function animateNewEdges(before,type){
          const fresh=world.edges.slice(before);
          if(!fresh.length)return;
          const t=now(),dur=type==='split'?1180:type==='connect'?1350:type==='bloom'?1280:1050;
          if(anim&&Array.isArray(anim.edges)&&t-anim.start<260){
            anim.edges=[...new Set(anim.edges.concat(fresh))];
            anim.start=Math.min(anim.start,t);
            anim.dur=Math.max(anim.dur||0,dur);
          }else{
            anim={edges:fresh,start:t,dur};
          }
        }

        const baseGrow=window.RV_BRIDGE.growWish;
        if(baseGrow){
          window.RV_BRIDGE.growWish=function(baseId,type,seed){
            const before=world.edges.length;
            const out=baseGrow(baseId,type,seed);
            animateNewEdges(before,type);
            const semantic=!baseId?'create':type==='split'?'split':type==='bloom'?'bloom':'pivot';
            if(baseId)addFx(baseId,semantic,semantic==='split'?1250:1150);
            if(out)addFx(out,semantic,semantic==='bloom'?1450:1000);
            return out;
          };
        }

        const baseConnect=window.RV_BRIDGE.connect;
        if(baseConnect){
          window.RV_BRIDGE.connect=function(aId,bId,seed){
            const before=world.edges.length;
            const out=baseConnect(aId,bId,seed);
            animateNewEdges(before,'connect');
            addFx(aId,'connect',1400);addFx(bId,'connect',1400);
            return out;
          };
        }

        const baseFossil=window.RV_BRIDGE.fossil;
        if(baseFossil){
          window.RV_BRIDGE.fossil=function(id){addFx(id,'letgo',1650);return baseFossil(id);};
        }

        window.RV_BRIDGE.actionEffect=function(id,type){addFx(id,type, type==='help'?1550:type==='encourage'?1450:1200);return true;};

        const baseDrawNode=drawNode;
        drawNode=function(n){
          baseDrawNode(n);
          if(!fx.length||!inView(n.x,n.y,200))return;
          const z=Math.max(.08,camera.zoom),T=tNow;
          for(let i=fx.length-1;i>=0;i--){
            const f=fx[i],p=(T-f.start)/f.dur;
            if(p>=1){fx.splice(i,1);continue;}
            if(f.id!==n.id||p<0)continue;
            const fade=Math.max(0,1-p),ease=1-Math.pow(1-p,3),h=(n.root?.hue||190);
            ctx.save();ctx.lineCap='round';
            if(f.type==='encourage'){
              for(let k=0;k<3;k++){
                const q=Math.min(1,Math.max(0,p-k*.12)),rr=(10+q*54)/z,a=(1-q)*(.32-k*.055);
                ctx.strokeStyle='rgba(225,240,229,'+Math.max(0,a)+')';ctx.lineWidth=.9/z;
                ctx.beginPath();ctx.arc(n.x,n.y,rr,0,TAU);ctx.stroke();
              }
            }else if(f.type==='help'){
              const rr=(9+ease*12)/z;
              for(let k=0;k<3;k++){
                const a=p*TAU*1.6+k*TAU/3;
                ctx.fillStyle='hsla('+(h+18)+',28%,82%,'+(.20+.42*fade)+')';
                ctx.beginPath();ctx.arc(n.x+Math.cos(a)*rr,n.y+Math.sin(a)*rr,(1.15+.45*fade)/z,0,TAU);ctx.fill();
              }
              ctx.strokeStyle='rgba(203,226,215,'+(.18*fade)+')';ctx.lineWidth=.65/z;ctx.beginPath();ctx.arc(n.x,n.y,rr,0,TAU);ctx.stroke();
            }else if(f.type==='split'){
              const base=n.angle||0,reach=(11+ease*38)/z;
              for(let k=-1;k<=1;k++){
                const a=base+k*.72,inner=5/z;
                ctx.strokeStyle='hsla('+(h+k*16)+',30%,80%,'+(.34*fade)+')';ctx.lineWidth=.9/z;
                ctx.beginPath();ctx.moveTo(n.x+Math.cos(a)*inner,n.y+Math.sin(a)*inner);ctx.lineTo(n.x+Math.cos(a)*reach,n.y+Math.sin(a)*reach);ctx.stroke();
              }
              ctx.strokeStyle='rgba(210,231,225,'+(.20*fade)+')';ctx.lineWidth=.7/z;ctx.beginPath();ctx.arc(n.x,n.y,(12+ease*28)/z,0,TAU);ctx.stroke();
            }else if(f.type==='pivot'){
              const rr=(14+ease*35)/z,start=(n.angle||0)-1.0,end=start+.55+ease*1.25;
              ctx.strokeStyle='hsla('+(h+22)+',30%,82%,'+(.38*fade)+')';ctx.lineWidth=1.0/z;
              ctx.beginPath();ctx.arc(n.x,n.y,rr,start,end);ctx.stroke();
              const ex=n.x+Math.cos(end)*rr,ey=n.y+Math.sin(end)*rr;
              ctx.fillStyle='rgba(224,237,231,'+(.50*fade)+')';ctx.beginPath();ctx.arc(ex,ey,1.6/z,0,TAU);ctx.fill();
            }else if(f.type==='connect'){
              const rr=(12+ease*42)/z;
              ctx.strokeStyle='rgba(196,224,229,'+(.30*fade)+')';ctx.lineWidth=.9/z;ctx.beginPath();ctx.arc(n.x,n.y,rr,0,TAU);ctx.stroke();
            }else if(f.type==='bloom'){
              const rr=(8+ease*26)/z;
              for(let k=0;k<8;k++){
                const a=k*TAU/8+p*.18,inner=5/z;
                ctx.strokeStyle='hsla('+(h+k*4)+',34%,84%,'+(.40*fade)+')';ctx.lineWidth=.95/z;
                ctx.beginPath();ctx.moveTo(n.x+Math.cos(a)*inner,n.y+Math.sin(a)*inner);ctx.lineTo(n.x+Math.cos(a)*rr,n.y+Math.sin(a)*rr);ctx.stroke();
              }
            }else if(f.type==='letgo'){
              const rr=(34-ease*14)/z;
              ctx.setLineDash([3/z,5/z]);ctx.strokeStyle='rgba(170,190,205,'+(.26*fade)+')';ctx.lineWidth=.7/z;ctx.beginPath();ctx.arc(n.x,n.y,rr,0,TAU);ctx.stroke();ctx.setLineDash([]);
            }else if(f.type==='create'){
              const rr=(8+ease*34)/z;ctx.strokeStyle='rgba(224,233,219,'+(.30*fade)+')';ctx.lineWidth=.8/z;ctx.beginPath();ctx.arc(n.x,n.y,rr,0,TAU);ctx.stroke();
            }
            ctx.restore();
          }
        };
        parent.postMessage({type:'raluvaaa-v20-motion-ready'},location.origin);
      }catch(err){parent.postMessage({type:'raluvaaa-renderer-error',message:String(err&&err.message||err)},location.origin);}
    })();`;
    doc.body.appendChild(script);
  }

  frame.addEventListener('load',()=>setTimeout(inject,24));
})();
