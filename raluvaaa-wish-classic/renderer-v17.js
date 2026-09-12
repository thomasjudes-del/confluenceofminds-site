/* RALUVAAA V17 visual treatment over the exact historical v03 engine.
   Geometry stays historical; this file changes rendering cues, focus and controls only. */
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
          if(!btn)return;let timer=null;
          btn.addEventListener('pointerdown',()=>{timer=setTimeout(()=>parent.postMessage({type:'raluvaaa-control-hint',label},location.origin),520)});
          ['pointerup','pointercancel','pointerleave'].forEach(k=>btn.addEventListener(k,()=>{clearTimeout(timer);timer=null}));
        }
        hint(zin,'Zoom in');hint(zout,'Zoom out');hint(fitBtn,'Fit world');hint(focusBtn,'My wishes');

        /* A selected wish belongs in the visible upper stage, not beneath the detail sheet. */
        function smartFocus(id){
          const n=world.nodes.find(x=>x.id===id);if(!n)return false;
          world.selected=n;
          camera.zoom=Math.max(camera.zoom,.72);
          const targetY=W<=760?H*.29:H*.40;
          camera.x=n.x;
          camera.y=n.y+(H/2-targetY)/camera.zoom;
          updateStats();
          window.__raluvaaaSelectedId=n.id;
          return true;
        }
        if(window.RV_BRIDGE){
          window.RV_BRIDGE.focus=smartFocus;
          window.RV_BRIDGE.selectedId=()=>window.__raluvaaaSelectedId||world.selected?.id||null;
          window.RV_BRIDGE.clearSelection=()=>{world.selected=null;window.__raluvaaaSelectedId=null;return true};
          window.RV_BRIDGE.setManualEncouraged=(id,on)=>{
            const n=world.nodes.find(x=>x.id===id);if(!n)return false;
            n.manualEncouraged=!!on;
            const e=world.edges.find(x=>x.id===n.edgeId);if(e)e.manualEncouraged=!!on;
            return true;
          };
        }

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

        /* Prototype scale: one real local encouragement must be clearly visible.
           Keep headroom for later population-adaptive scaling instead of pretending 1..100 today. */
        function encouragementLevel(obj){
          if(obj&&obj.manualEncouraged)return .64;
          return 0;
        }
        function drawFlow(e,z,activity,state,h2){
          const fossil=state==='fossil';
          if(fossil||z<=.18)return;
          const a=Math.max(.035,Math.min(1,Number(activity)||.10));
          const dots=1+Math.floor(a*3.2);
          const speed=.000035+a*.00020;
          for(let i=0;i<dots;i++){
            const phase=(tNow*speed+(e.seed||1)*.0000007+i/dots)%1;
            const pp=qpt(e,phase);
            const size=(.54+a*.58)/Math.max(.72,z);
            const alpha=.12+a*.30;
            ctx.fillStyle='hsla('+h2+',20%,83%,'+alpha+')';
            ctx.shadowColor=a>.62?'hsla('+h2+',24%,78%,'+(alpha*.65)+')':'transparent';
            ctx.shadowBlur=a>.62?(2+a*4)/Math.max(.72,z):0;
            ctx.beginPath();ctx.arc(pp.x,pp.y,size,0,TAU);ctx.fill();ctx.shadowBlur=0;
          }
        }

        drawEdge=function(e,progress=1){
          if(!inView((e.x0+e.x1)/2,(e.y0+e.y1)/2,180/camera.zoom))return;
          const z=camera.zoom,state=stateOfEdge(e),fossil=state==='fossil';
          const a=((hash('pig-a'+e.id)%1000)/1000-.5),b=((hash('pig-b'+e.id)%1000)/1000-.5),c=((hash('pig-c'+e.id)%1000)/1000-.5);
          const h=(e.hue+a*54+360)%360,h2=(e.hue+b*64+360)%360,h3=(e.hue+c*42+360)%360;
          const sat=21+(hash('pig-s'+e.id)%10),light=61+(hash('pig-l'+e.id)%10);
          const macro=z<.11,mid=z<.38;if(macro&&e.generation>6)return;if(mid&&e.generation>12&&e.type==='bloom')return;
          const encouragement=encouragementLevel(e);
          const activity=Math.max(.04,Math.min(1,Number(e.activityLevel)||.12));
          const alive=state==='alive'||encouragement>0||activity>.18;
          ctx.lineCap='round';
          if(alive){
            const alpha=e.mine?.72:clamp(.13+.16*Math.min(1,z*.9)+encouragement*.20,.13,.49);
            ctx.shadowColor=e.mine?'rgba(226,215,194,.35)':encouragement>.01?'rgba(224,239,229,'+(.14+encouragement*.58)+')':'hsla('+h+',22%,70%,.035)';
            ctx.shadowBlur=(e.mine?5.5:.55+encouragement*13)/Math.max(.48,z);
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
            ctx.strokeStyle=g;ctx.lineWidth=(e.mine?1.72:1.0+encouragement*.24)/Math.max(.48,z);pathEdge(e,progress,0,.34/Math.max(.62,z));ctx.stroke();ctx.shadowBlur=0;
            const pat=ctx.createLinearGradient(e.x0,e.y0,e.x1,e.y1);
            pat.addColorStop(0,'rgba(208,199,180,'+(alpha*.08)+')');
            pat.addColorStop(.38,'rgba(188,204,201,'+(alpha*.16)+')');
            pat.addColorStop(.72,'rgba(218,201,191,'+(alpha*.11)+')');
            pat.addColorStop(1,'rgba(188,194,207,'+(alpha*.07)+')');
            ctx.strokeStyle=pat;ctx.lineWidth=.46/Math.max(.62,z);pathEdge(e,progress,(hash('side'+e.id)%2?1:-1)*.58/Math.max(.74,z),.12/Math.max(.88,z));ctx.stroke();
          }else{
            ctx.shadowBlur=0;ctx.strokeStyle=fossil?'rgba(111,121,137,.055)':'rgba(139,151,169,.09)';ctx.lineWidth=.60/Math.max(.52,z);pathEdge(e,1);ctx.stroke();
          }
          drawFlow(e,z,activity,state,h2);
        };

        drawNode=function(n){
          const z=camera.zoom;if(z<.15&&!n.rootNode&&!n.mine&&!n.manualEncouraged&&!n.entrustedUrgency)return;if(!inView(n.x,n.y,180))return;
          const st=stateOf(n),tone=((hash('node-pig'+n.id)%1000)/1000-.5)*46,h=(n.root.hue+tone+360)%360;
          const encouragement=encouragementLevel(n);
          const activity=Math.max(.04,Math.min(1,Number(n.activityLevel)||.12));
          const alive=st==='alive'||encouragement>0||activity>.18;
          let r=(n.rootNode?3.0:(n.mine||n.received)?3.45:alive?1.28:.86)/Math.max(.55,z);
          r*=1+encouragement*.65;
          ctx.fillStyle=(n.mine||n.received)?'#ded5c5':encouragement>.01?'rgba(239,245,234,.92)':n.rootNode?'hsla('+h+',24%,78%,.58)':alive?'hsla('+h+',22%,74%,.36)':st==='dormant'?'rgba(154,166,184,.18)':'rgba(112,124,142,.08)';
          if(alive){ctx.shadowColor=(n.mine||n.received)?'rgba(223,210,186,.38)':encouragement>.01?'rgba(225,240,229,.82)':'transparent';ctx.shadowBlur=((n.mine||n.received)?5:encouragement*18)/Math.max(.62,z)}
          ctx.beginPath();ctx.arc(n.x,n.y,r,0,TAU);ctx.fill();ctx.shadowBlur=0;

          if(n.helpCount>0){
            const q=(tNow*.00018+hash('help-orbit'+n.id)%1000/1000)%1,ang=q*TAU,rr=(8+Math.min(3,n.helpCount)*2)/Math.max(.62,z);
            ctx.fillStyle='rgba(212,231,220,.58)';ctx.beginPath();ctx.arc(n.x+Math.cos(ang)*rr,n.y+Math.sin(ang)*rr,1.0/Math.max(.72,z),0,TAU);ctx.fill();
          }
          if(n.entrustedUrgency>0){
            const u=Math.min(1,n.entrustedUrgency),pulse=.5+.5*Math.sin(tNow*.0021+hash(n.id));
            ctx.strokeStyle='rgba(226,133,121,'+(.09+.12*u+.04*pulse)+')';ctx.lineWidth=.72/Math.max(.64,z);
            ctx.beginPath();ctx.arc(n.x,n.y,(6.5+2.5*pulse)/Math.max(.62,z),0,TAU);ctx.stroke();
          }
          if(world.selected?.id===n.id){
            /* Screen-relative, persistent radar. It remains legible at every zoom. */
            const phase=(tNow*.00010)%1;
            const maxScreen=Math.max(150,Math.min(W,H)*.46);
            const minScreen=18;
            for(let i=0;i<4;i++){
              const q=(phase+i/4)%1;
              const screenR=minScreen+q*(maxScreen-minScreen);
              const rr=screenR/Math.max(.001,z),aa=(1-q)*.48;
              ctx.strokeStyle='rgba(190,218,220,'+aa+')';ctx.lineWidth=.82/Math.max(.60,z);
              ctx.beginPath();ctx.arc(n.x,n.y,rr,0,TAU);ctx.stroke();
            }
            const breathe=.5+.5*Math.sin(tNow*.0018);
            ctx.strokeStyle='rgba(205,226,226,'+(.28+.09*breathe)+')';ctx.lineWidth=.76/Math.max(.62,z);
            ctx.beginPath();ctx.arc(n.x,n.y,(9+2*breathe)/Math.max(.60,z),0,TAU);ctx.stroke();
          }
        };
        parent.postMessage({type:'raluvaaa-renderer-ready'},location.origin);
      }catch(err){parent.postMessage({type:'raluvaaa-renderer-error',message:String(err&&err.message||err)},location.origin);}
    })();`;
    doc.body.appendChild(script);
  }
  frame.addEventListener('load',()=>setTimeout(inject,0));
})();
