/* RALUVAAA renderer treatment layered over the exact historical v03 engine.
   Self-contained on purpose: do not rely on variables hidden inside app.js. */
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
        const rootPalette=[207,232,316,29,156,271,196,14,143];
        world.roots.forEach((r,i)=>r.hue=rootPalette[i%rootPalette.length]);

        const zin=document.getElementById('zin');
        const zout=document.getElementById('zout');
        const fitBtn=document.getElementById('fit');
        const focusBtn=document.getElementById('focus');
        const lensPlus='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.2"/><path d="M14.6 14.6L20.5 20.5M10 7.2v5.6M7.2 10h5.6"/></svg>';
        const lensMinus='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.2"/><path d="M14.6 14.6L20.5 20.5M7.2 10h5.6"/></svg>';
        if(zin){zin.innerHTML=lensPlus;zin.title='Zoom in';zin.setAttribute('aria-label','Zoom in');}
        if(zout){zout.innerHTML=lensMinus;zout.title='Zoom out';zout.setAttribute('aria-label','Zoom out');}
        if(fitBtn){fitBtn.title='Fit world';fitBtn.setAttribute('aria-label','Fit world');}
        if(focusBtn){
          focusBtn.title='My wishes';focusBtn.setAttribute('aria-label','Cycle through my wishes');
          focusBtn.addEventListener('click',function(ev){
            ev.preventDefault();ev.stopImmediatePropagation();
            parent.postMessage({type:'raluvaaa-cycle-my-wish'},location.origin);
          },true);
        }
        function hint(btn,label){
          if(!btn)return;
          let timer=null;
          btn.addEventListener('pointerdown',()=>{timer=setTimeout(()=>parent.postMessage({type:'raluvaaa-control-hint',label},location.origin),520)});
          ['pointerup','pointercancel','pointerleave'].forEach(k=>btn.addEventListener(k,()=>{clearTimeout(timer);timer=null}));
        }
        hint(zin,'Zoom in');hint(zout,'Zoom out');hint(fitBtn,'Fit world');hint(focusBtn,'My wishes');

        const oldFocus=camera.focus.bind(camera);
        camera.focus=function(n,deep=false){
          oldFocus(n,deep);
          window.__raluvaaaFocusPing={id:n.id,start:performance.now()};
        };

        rootHalo=function(r){
          const s=camera.worldToScreen(r.x,r.y);
          if(s.x<-300||s.x>W+300||s.y<-300||s.y>H+300)return;
          const count=world.nodes.filter(n=>n.root===r).length,z=camera.zoom;
          let rad=(58+Math.sqrt(count)*8.2)*z;rad=clamp(rad,12,185);
          const gr=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,rad);
          gr.addColorStop(0,'hsla('+r.hue+',20%,72%,.026)');
          gr.addColorStop(.35,'hsla('+(r.hue+18)+',18%,62%,.010)');
          gr.addColorStop(1,'hsla('+r.hue+',15%,45%,0)');
          ctx.fillStyle=gr;ctx.beginPath();ctx.arc(s.x,s.y,rad,0,TAU);ctx.fill();
        };

        drawEdge=function(e,progress=1){
          if(!inView((e.x0+e.x1)/2,(e.y0+e.y1)/2,180/camera.zoom))return;
          const z=camera.zoom,state=stateOfEdge(e),alive=state==='alive'||e.encouraged,fossil=state==='fossil';
          const a=((hash('pig-a'+e.id)%1000)/1000-.5),b=((hash('pig-b'+e.id)%1000)/1000-.5),c=((hash('pig-c'+e.id)%1000)/1000-.5);
          const h=(e.hue+a*54+360)%360,h2=(e.hue+b*64+360)%360,h3=(e.hue+c*42+360)%360;
          const sat=21+(hash('pig-s'+e.id)%10),light=61+(hash('pig-l'+e.id)%10);
          const macro=z<.11,mid=z<.38;if(macro&&e.generation>6)return;if(mid&&e.generation>12&&e.type==='bloom')return;
          ctx.lineCap='round';
          if(alive){
            const boost=e.encouraged?1:0;
            const alpha=e.mine?.72:boost?.59:clamp(.13+.18*Math.min(1,z*.9),.13,.31);
            ctx.shadowColor=e.mine?'rgba(226,215,194,.35)':boost?'rgba(224,239,229,.62)':'hsla('+h+',22%,70%,.045)';
            ctx.shadowBlur=(e.mine?5.5:boost?9:0.7)/Math.max(.48,z);
            const g=ctx.createLinearGradient(e.x0,e.y0,e.x1,e.y1);
            if(e.mine){
              g.addColorStop(0,'rgba(218,208,188,.66)');g.addColorStop(.48,'rgba(238,228,207,.72)');g.addColorStop(1,'rgba(201,198,184,.58)');
            }else{
              g.addColorStop(0,'hsla('+((h-26+360)%360)+','+Math.max(15,sat-5)+'%,'+Math.max(54,light-5)+'%,'+alpha+')');
              g.addColorStop(.28,'hsla('+((h2+14)%360)+','+sat+'%,'+Math.min(74,light+5)+'%,'+(alpha*.97)+')');
              g.addColorStop(.58,'hsla('+((h3-10+360)%360)+','+Math.max(14,sat-7)+'%,'+Math.min(72,light+2)+'%,'+(alpha*.90)+')');
              g.addColorStop(.82,'hsla('+((h+34)%360)+','+Math.max(13,sat-8)+'%,'+Math.max(55,light-3)+'%,'+(alpha*.82)+')');
              g.addColorStop(1,'hsla('+((h2+48)%360)+','+Math.max(12,sat-10)+'%,'+light+'%,'+(alpha*.72)+')');
            }
            ctx.strokeStyle=g;ctx.lineWidth=(e.mine?1.72:1.02)/Math.max(.48,z);pathEdge(e,progress,0,.34/Math.max(.62,z));ctx.stroke();ctx.shadowBlur=0;
            const pat=ctx.createLinearGradient(e.x0,e.y0,e.x1,e.y1);
            pat.addColorStop(0,'rgba(208,199,180,'+(alpha*.08)+')');
            pat.addColorStop(.38,'rgba(188,204,201,'+(alpha*.16)+')');
            pat.addColorStop(.72,'rgba(218,201,191,'+(alpha*.11)+')');
            pat.addColorStop(1,'rgba(188,194,207,'+(alpha*.07)+')');
            ctx.strokeStyle=pat;ctx.lineWidth=.46/Math.max(.62,z);pathEdge(e,progress,(hash('side'+e.id)%2?1:-1)*.58/Math.max(.74,z),.12/Math.max(.88,z));ctx.stroke();
          }else{
            ctx.shadowBlur=0;ctx.strokeStyle=fossil?'rgba(111,121,137,.055)':'rgba(139,151,169,.09)';ctx.lineWidth=.60/Math.max(.52,z);pathEdge(e,1);ctx.stroke();
          }
          if(alive&&z>.22&&progress>.98){
            const phase=(tNow*.00018+e.seed*.0000007)%1,pp=qpt(e,phase),boost=e.encouraged?1:0;
            ctx.fillStyle=boost?'rgba(238,245,235,.78)':'hsla('+h2+',22%,82%,.28)';
            ctx.shadowColor=boost?'rgba(226,240,230,.75)':'transparent';ctx.shadowBlur=(boost?7:0)/Math.max(.62,z);
            ctx.beginPath();ctx.arc(pp.x,pp.y,(boost?1.18:.72)/Math.max(.70,z),0,TAU);ctx.fill();ctx.shadowBlur=0;
          }
        };

        drawNode=function(n){
          const z=camera.zoom;if(z<.15&&!n.rootNode&&!n.mine&&!n.encouraged)return;if(!inView(n.x,n.y,100))return;
          const st=stateOf(n),alive=st==='alive'||n.encouraged,tone=((hash('node-pig'+n.id)%1000)/1000-.5)*46,h=(n.root.hue+tone+360)%360;
          let r=(n.rootNode?3.0:(n.mine||n.received)?3.45:n.encouraged?2.15:alive?1.30:.86)/Math.max(.55,z);
          ctx.fillStyle=(n.mine||n.received)?'#ded5c5':n.encouraged?'rgba(237,243,232,.88)':n.rootNode?'hsla('+h+',24%,78%,.58)':alive?'hsla('+h+',22%,74%,.36)':st==='dormant'?'rgba(154,166,184,.18)':'rgba(112,124,142,.08)';
          if(alive){ctx.shadowColor=(n.mine||n.received)?'rgba(223,210,186,.38)':n.encouraged?'rgba(225,240,229,.74)':'transparent';ctx.shadowBlur=((n.mine||n.received)?5:n.encouraged?11:0)/Math.max(.62,z)}
          ctx.beginPath();ctx.arc(n.x,n.y,r,0,TAU);ctx.fill();ctx.shadowBlur=0;

          if(world.selected?.id===n.id){
            const breathe=.5+.5*Math.sin(tNow*.0022);
            ctx.strokeStyle='rgba(195,218,220,'+(.23+.10*breathe)+')';ctx.lineWidth=.72/Math.max(.62,z);
            ctx.beginPath();ctx.arc(n.x,n.y,(9+3*breathe)/Math.max(.60,z),0,TAU);ctx.stroke();
            ctx.strokeStyle='rgba(195,218,220,'+(.08+.05*breathe)+')';
            ctx.beginPath();ctx.arc(n.x,n.y,(18+5*breathe)/Math.max(.60,z),0,TAU);ctx.stroke();
          }
          const fp=window.__raluvaaaFocusPing;
          if(fp&&fp.id===n.id){
            const elapsed=performance.now()-fp.start,dur=3400;
            if(elapsed>dur){window.__raluvaaaFocusPing=null}else{
              const base=elapsed/dur;
              for(let i=0;i<3;i++){
                const q=(base+i*.22)%1,rr=(14+q*96)/Math.max(.60,z),aa=(1-q)*.58;
                ctx.strokeStyle='rgba(190,218,220,'+aa+')';ctx.lineWidth=.86/Math.max(.60,z);
                ctx.beginPath();ctx.arc(n.x,n.y,rr,0,TAU);ctx.stroke();
              }
            }
          }
        };
        parent.postMessage({type:'raluvaaa-renderer-ready'},location.origin);
      }catch(err){parent.postMessage({type:'raluvaaa-renderer-error',message:String(err&&err.message||err)},location.origin);}
    })();`;
    doc.body.appendChild(script);
  }
  frame.addEventListener('load',()=>setTimeout(inject,0));
})();
