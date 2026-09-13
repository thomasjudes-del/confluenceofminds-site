/* RALUVAAA V21 - Bring back the sumptuous world.
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
        const targetGrowth=vw>1180?14000:vw>760?7600:2600;
        const originalRootCount=world.roots.length;

        /* Add independent simulated lineages around the historical organism. */
        for(let i=world.roots.length;i<targetRoots;i++){
          const j=i-originalRootCount;
          const a=(j/Math.max(1,targetRoots-originalRootCount))*TAU+.38+(j%2)*.17;
          const ring=j%3;
          const rad=920+ring*360+(hash('v21-rad-'+i)%230);
          const r=addRoot(Math.cos(a)*rad,Math.sin(a)*rad*.78,'Lineage '+(i+1));
          r.hue=palette[i%palette.length];
        }
        world.roots.forEach((r,i)=>{r.hue=palette[i%palette.length]});

        /*
          Fast visual-history builder.
          Native simulate()/grow() intentionally favour correctness over bulk generation and
          scan the complete tips/nodes arrays on every mutation. That becomes quadratic around
          15k nodes. Here we mirror the native geometry directly with bounded branch pools so
          the sumptuous world is generated in linear time, while remaining visually v03-native.
        */
        function fastGrow(parent,type,R){
          const root=parent.root;
          let radial=Math.atan2(parent.y-root.y,parent.x-root.x);
          if(parent.generation<2)radial=parent.angle;
          let dev=(R()-.5)*(type==='split'?1.35:type==='bloom'?.9:.72);
          if(type==='bend')dev+=(R()<.5?-1:1)*(.10+R()*.24);
          const a=parent.angle*.38+radial*.38+(radial+dev)*.24;
          let len=(78+R()*62)*Math.pow(.965,Math.max(0,parent.generation-4));
          if(type==='bloom')len*=.72;
          const e=edgeGeom(parent.x,parent.y,a,len,(R()-.5)*.34);
          e.id='e'+world.next++;e.root=root;e.parentId=parent.id;
          e.hue=(root.hue+parent.generation*.72+((hash('tone'+e.id)%1000)/1000-.5)*34+Math.sin(parent.generation*.9)*7+360)%360;
          e.generation=parent.generation+1;e.created=world.clock;e.lastActive=world.clock;e.mine=false;e.type=type;e.seed=hash(e.id);e.micro=[];
          const microN=type==='bloom'?7:type==='split'?4:2;
          for(let i=0;i<microN;i++){
            const tt=.55+R()*.4,p=qpt(e,tt),aa=a+(R()-.5)*(type==='bloom'?2.2:1.2),ll=(type==='bloom'?14:9)+R()*(type==='bloom'?28:18);
            e.micro.push(edgeGeom(p.x,p.y,aa,ll,(R()-.5)*.55));
          }
          world.edges.push(e);
          const n={id:'n'+world.next++,root,parentId:parent.id,edgeId:e.id,x:e.x1,y:e.y1,angle:a,generation:parent.generation+1,created:world.clock,lastActive:world.clock,children:[],mutation:type,mine:false};
          world.nodes.push(n);
          if(parent.children)parent.children.push(n.id);
          world.humans++;
          return n;
        }

        function buildAmbient(total){
          const R=rng(hash('v21-sumptuous-linear'));
          const pools=world.roots.map(r=>{
            const base=world.nodes.find(n=>n.id===r.nodeId);
            return{root:r,anchors:[base],frontier:[base]};
          });
          for(let i=0;i<total;i++){
            world.clock+=.045+R()*.055;
            const pool=pools[Math.floor(R()*pools.length)];
            const useAnchor=R()<.57&&pool.anchors.length;
            const arr=useAnchor?pool.anchors:pool.frontier;
            const p=arr[Math.floor(R()*arr.length)]||pool.anchors[0];
            const q=R(),type=q<.43?'bend':q<.78?'split':'bloom';
            const n=fastGrow(p,type,R);

            /* Preserve many shallow branches: at fit view these create the firework density. */
            if(n.generation<=5){
              if(pool.anchors.length<430)pool.anchors.push(n);
              else pool.anchors[Math.floor(R()*pool.anchors.length)]=n;
            }
            if(pool.frontier.length<520)pool.frontier.push(n);
            else pool.frontier[Math.floor(R()*pool.frontier.length)]=n;

            if((i+1)%900===0){
              /* Re-seed a few shallow anchors so the organism keeps widening instead of becoming a vine. */
              const rootNodeRef=pool.anchors[0];
              if(rootNodeRef&&pool.anchors.length>1)pool.frontier[Math.floor(R()*pool.frontier.length)]=pool.anchors[Math.floor(R()*Math.min(pool.anchors.length,140))]||rootNodeRef;
            }
          }
          /* Keep future semantic CREATE operations fast: expose a bounded set of visual tips. */
          world.tips=[];
          for(const p of pools){
            const take=Math.min(90,p.frontier.length);
            for(let i=0;i<take;i++)world.tips.push(p.frontier[Math.floor(i*p.frontier.length/take)]);
          }
        }

        buildAmbient(targetGrowth);

        /* Keep a rich mix of living pigment, patina and fossil history after the large seed. */
        for(const e of world.edges){
          const h=hash('v21-life-edge-'+e.id)%100;
          if(h<38)e.lastActive=world.clock-(h%21);
          else if(h<74)e.lastActive=world.clock-(34+(h%43));
          else e.lastActive=world.clock-(94+(h%51));
        }
        for(const n of world.nodes){
          if(n.rootNode||n.mine||n.received)continue;
          const h=hash('v21-life-node-'+n.id)%100;
          if(h<38)n.lastActive=world.clock-(h%21);
          else if(h<74)n.lastActive=world.clock-(34+(h%43));
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
