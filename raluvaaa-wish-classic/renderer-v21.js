/* RALUVAAA V21 — Bring back the sumptuous world.
   Uses the historical v03 visual language as source of truth, enriches the simulated
   organism for world-scale depth, restores the minimap, and keeps current Wish semantics. */
(function(){
  'use strict';
  const frame=document.getElementById('engine');
  if(!frame)return;

  function inject(){
    const doc=frame.contentDocument;
    if(!doc||!doc.body)return;

    /* app-v16 deliberately hides the old engine chrome. Re-enable only the jewel-like minimap. */
    const style=doc.createElement('style');
    style.textContent=`
      .minimap{display:block!important;right:16px!important;top:14px!important;width:250px!important;height:148px!important;padding:8px!important;opacity:.98!important;border-color:rgba(184,214,255,.15)!important;background:linear-gradient(180deg,rgba(7,16,29,.62),rgba(3,9,18,.46))!important;box-shadow:0 20px 60px rgba(0,0,0,.30),0 0 40px rgba(112,146,210,.035)!important}
      .minimap canvas{background:radial-gradient(circle at 50% 48%,rgba(123,108,190,.055),rgba(255,255,255,.008) 58%,transparent 100%)!important}
      .side{top:178px!important}
      @media(max-width:980px){.minimap{width:210px!important;height:124px!important}}
      @media(max-width:760px){.minimap{display:none!important}.side{top:116px!important}}
    `;
    doc.head.appendChild(style);

    const script=doc.createElement('script');
    script.textContent=`(function(){
      try{
        if(window.__raluvaaaSumptuousV21)return;
        window.__raluvaaaSumptuousV21=true;

        const palette=[202,257,318,42,174,286,218,20,148,334,58,190,274,8,160];
        const vw=Math.max(320,window.innerWidth||W||1200);
        const targetRoots=vw>1180?15:vw>760?12:8;
        const targetGrowth=vw>1180?12000:vw>760?6500:2200;
        const originalRootCount=world.roots.length;

        /* The additional structure is simulated visual history, not additional real wishes. */
        for(let i=world.roots.length;i<targetRoots;i++){
          const j=i-originalRootCount;
          const a=(j/Math.max(1,targetRoots-originalRootCount))*TAU + .38 + (j%2)*.17;
          const ring=j%3;
          const rad=920 + ring*360 + (hash('v21-rad-'+i)%230);
          const x=Math.cos(a)*rad, y=Math.sin(a)*rad*.78;
          const r=addRoot(x,y,'Lineage '+(i+1));
          r.hue=palette[i%palette.length];
          buildCluster(r,190+(i%4)*28,hash('v21-root-'+i));
        }
        world.roots.forEach((r,i)=>{r.hue=palette[i%palette.length]});

        simulate(targetGrowth,false);

        /* Keep a real mix of living pigment, patina and fossil history after the large seed. */
        for(const e of world.edges){
          const h=hash('v21-life-edge-'+e.id)%100;
          if(h<36)e.lastActive=world.clock-(h%21);
          else if(h<72)e.lastActive=world.clock-(34+(h%43));
          else e.lastActive=world.clock-(94+(h%51));
        }
        for(const n of world.nodes){
          if(n.rootNode||n.mine||n.received)continue;
          const h=hash('v21-life-node-'+n.id)%100;
          if(h<36)n.lastActive=world.clock-(h%21);
          else if(h<72)n.lastActive=world.clock-(34+(h%43));
          else n.lastActive=world.clock-(94+(h%51));
        }

        /* Current product uses these fields. Layer them over native v03 color instead of replacing it. */
        if(window.RV_BRIDGE){
          window.RV_BRIDGE.setManualEncouraged=(id,on)=>{
            const n=world.nodes.find(x=>x.id===id);if(!n)return false;
            n.manualEncouraged=!!on;n.encouraged=!!on;
            const e=world.edges.find(x=>x.id===n.edgeId);if(e){e.manualEncouraged=!!on;e.encouraged=!!on;}
            return true;
          };
          window.RV_BRIDGE.selectedId=()=>window.__raluvaaaSelectedId||world.selected?.id||null;
          window.RV_BRIDGE.clearSelection=()=>{world.selected=null;window.__raluvaaaSelectedId=null;return true};
          window.RV_BRIDGE.focus=(id)=>{
            const n=world.nodes.find(x=>x.id===id);if(!n)return false;
            world.selected=n;window.__raluvaaaSelectedId=n.id;
            const mobile=W<=760;
            camera.zoom=Math.max(camera.zoom,mobile?.72:.66);
            const targetY=mobile?H*.29:H*.43;
            camera.x=n.x;
            camera.y=n.y+(H/2-targetY)/camera.zoom;
            updateStats();return true;
          };
        }

        /* Preserve V17's large selected-wish echo plus current HELP / entrusted signals. */
        const nativeDrawNode=drawNode;
        drawNode=function(n){
          nativeDrawNode(n);
          if(!inView(n.x,n.y,220))return;
          const z=Math.max(.001,camera.zoom);
          if(n.helpCount>0){
            const phase=(tNow*.00017+hash('v21-help-'+n.id)%1000/1000)%1;
            const a=phase*TAU,rr=(8+Math.min(3,n.helpCount)*2.3)/Math.max(.62,z);
            ctx.fillStyle='rgba(210,239,222,.64)';ctx.shadowColor='rgba(142,231,203,.32)';ctx.shadowBlur=4/Math.max(.65,z);
            ctx.beginPath();ctx.arc(n.x+Math.cos(a)*rr,n.y+Math.sin(a)*rr,1.05/Math.max(.72,z),0,TAU);ctx.fill();ctx.shadowBlur=0;
          }
          if(n.entrustedUrgency>0){
            const u=Math.min(1,n.entrustedUrgency),pulse=.5+.5*Math.sin(tNow*.0021+hash(n.id));
            ctx.strokeStyle='rgba(238,142,124,'+(.12+.18*u+.06*pulse)+')';ctx.lineWidth=.78/Math.max(.64,z);
            ctx.beginPath();ctx.arc(n.x,n.y,(7+3*pulse)/Math.max(.62,z),0,TAU);ctx.stroke();
          }
          if(world.selected?.id===n.id){
            const phase=(tNow*.000095)%1;
            const maxScreen=Math.max(150,Math.min(W,H)*.43),minScreen=20;
            for(let i=0;i<4;i++){
              const q=(phase+i/4)%1,screenR=minScreen+q*(maxScreen-minScreen),rr=screenR/z,aa=(1-q)*.31;
              ctx.strokeStyle='rgba(194,224,229,'+aa+')';ctx.lineWidth=.72/Math.max(.60,z);
              ctx.beginPath();ctx.arc(n.x,n.y,rr,0,TAU);ctx.stroke();
            }
          }
        };

        /* Start from the whole organism. This is the intended first desktop impression. */
        camera.fit();
        if(vw>760)camera.zoom*=.91;
        updateStats();
        window.__raluvaaaAmbientGeometry={simulated:true,nodes:world.nodes.length,edges:world.edges.length,roots:world.roots.length};
        parent.postMessage({type:'raluvaaa-v21-sumptuous-ready',nodes:world.nodes.length,edges:world.edges.length,roots:world.roots.length},location.origin);
      }catch(err){parent.postMessage({type:'raluvaaa-renderer-error',message:'V21 '+String(err&&err.message||err)},location.origin);}
    })();`;
    doc.body.appendChild(script);
  }

  frame.addEventListener('load',()=>setTimeout(inject,0));
})();
