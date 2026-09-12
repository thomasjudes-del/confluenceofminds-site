/* RALUVAAA iterative product patch. Keeps the historical v03 geometry and changes only interaction/render treatment. */
(function(){
  const hour=3600000;

  remain=function(ms){
    const s=Math.max(0,Math.ceil(ms/1000));
    if(s<60)return s+'s';
    const m=Math.floor(s/60),sec=s%60;
    if(m<60)return m+'m '+String(sec).padStart(2,'0')+'s';
    const h=Math.floor(m/60),min=m%60;
    if(h<24)return h+'h '+String(min).padStart(2,'0')+'m';
    const d=Math.floor(h/24),hr=h%24;
    return d+'d '+hr+'h';
  };

  ensureEntrusted=function(){
    const now=Date.now(),bands=['hours','days','weeks'];
    let slots=state.entrusted;
    if(!Array.isArray(slots)||slots.length!==3)slots=bands.map(b=>makeSlot(b,now));
    slots=slots.map((s,i)=>s.expires<=now?makeSlot(s.band||bands[i],now):s);
    state.entrusted=slots;
    save();
    renderEntrusted();
  };

  renderEntrusted=function(){
    const now=Date.now();
    document.getElementById('entrustedGrid').innerHTML=(state.entrusted||[]).map(s=>{
      const w=wishById(s.wishId),r=s.expires-now;
      if(!w)return'';
      return `<button class="entrusted-item ${r<5*hour?'urgent':''}" data-wish="${w.id}"><div class="t">${esc(w.text)}</div><div class="m">${remain(r)} left</div></button>`;
    }).join('');
    document.querySelectorAll('#entrustedGrid [data-wish]').forEach(b=>b.onclick=()=>focusWish(b.dataset.wish));
  };

  setInterval(()=>{
    if(!bridge)return;
    const now=Date.now();
    if((state.entrusted||[]).some(s=>s.expires<=now))ensureEntrusted();
    else renderEntrusted();
  },1000);

  let ownWishCursor=-1;
  function cycleOwnWish(){
    const mine=wishes.filter(w=>isClaimedOwner(w)&&w.state!=='closed');
    if(!mine.length){toast('Release or claim a wish to return to it here.');return;}
    ownWishCursor=(ownWishCursor+1)%mine.length;
    const w=mine[ownWishCursor];
    detail.classList.add('hidden');
    bridge.focus(w.nodeId);
    toast((ownWishCursor+1)+'/'+mine.length+' · '+w.text.slice(0,62)+(w.text.length>62?'…':''));
  }

  window.addEventListener('message',e=>{
    if(e.origin!==location.origin)return;
    if(e.data?.type==='raluvaaa-cycle-my-wish')cycleOwnWish();
    if(e.data?.type==='raluvaaa-control-hint')toast(e.data.label);
  });

  requireIdentity=function(next){
    if(state.identity)return next();
    showIdentity(next);
  };

  showIdentity=function(next){
    modal(`<div class="eyebrow">PRIVATE IDENTITY</div><h2>Identify privately to continue.</h2><p>Your email is only used to associate this action with you. It is never displayed on a public wish.</p><label>Email</label><input class="field" id="idEmail" type="email" autocomplete="email" placeholder="you@example.com"><div class="note">Prototype: no email is sent. Once identified, you will not be asked again on this device.</div><div class="row"><button class="soft" id="cancelId">Not now</button><button class="soft primary" id="confirmId">Continue</button></div>`);
    document.getElementById('cancelId').onclick=closeModal;
    document.getElementById('confirmId').onclick=()=>{
      const v=document.getElementById('idEmail').value.trim();
      if(!/^\S+@\S+\.\S+$/.test(v))return toast('Enter a valid email.');
      state.identity={email:v,created:Date.now()};save();closeModal();next?.();
    };
  };

  openWish=function(id){
    const w=wishById(id);if(!w)return;
    const own=isClaimedOwner(w),enc=state.encouraged.includes(w.id);
    const helped=state.suggestions.some(s=>s.wishId===w.id&&s.type==='HELP');
    const connected=(state.events||[]).some(e=>e.type==='connect'&&(e.a===w.id||e.b===w.id));
    const pivotSuggested=!own&&state.suggestions.some(s=>s.wishId===w.id&&s.type==='PIVOT');
    const splitSuggested=!own&&state.suggestions.some(s=>s.wishId===w.id&&s.type==='SPLIT');
    bridge.focus(w.nodeId);
    detail.classList.remove('hidden');
    const label=w.simulated?'SIMULATED TEST WISH':own?'YOUR WISH':w.owner?'UNCLAIMED LOCAL WISH':'A HUMAN INTENTION';
    const status=w.state==='bloom'?'Bloomed':w.state==='closed'?'Trace · let go':own?'Your living wish':'Living wish';
    detail.innerHTML=`<div class="detail-top"><div><div class="eyebrow">${label}</div><div class="wishtext">${esc(w.text)}</div><div class="meta">${esc(w.loc)} · ${fmtDate(w.date)}</div><div class="state">${status}</div></div><button class="close" id="closeDetail">×</button></div><div class="actions"><button class="action ${enc?'active':''}" data-act="encourage"><span class="ico">${enc?'✦':'✧'}</span>${enc?'Encouraged':'Encourage'}</button><button class="action ${helped?'done':''}" data-act="help" ${helped?'disabled':''}><span class="ico">↟</span>${helped?'Helped':'Help'}</button><button class="action ${connected?'done':''}" data-act="connect" ${connected?'disabled':''}><span class="ico">⌁</span>${connected?'Connected':'Connect'}</button><button class="action ${pivotSuggested?'done':''}" data-act="pivot" ${pivotSuggested?'disabled':''}><span class="ico">↝</span>${pivotSuggested?'Pivot suggested':'Pivot'}</button><button class="action ${splitSuggested?'done':''}" data-act="split" ${splitSuggested?'disabled':''}><span class="ico">⑂</span>${splitSuggested?'Split suggested':'Split'}</button><button class="action" data-act="share"><span class="ico">↗</span>Share</button></div>${own?`<div class="owner"><h4>Only you decide what happens to this wish.</h4><div class="row"><button class="soft" data-act="bloom">Bloom</button><button class="soft" data-act="letgo">Let go</button></div></div>`:w.owner&&!own?`<div class="owner"><h4>This wish is not claimed yet.</h4><button class="soft" data-act="claim">Claim this wish</button></div>`:''}<div class="row"><button class="soft" data-act="report">Flag as inappropriate</button></div>`;
    document.getElementById('closeDetail').onclick=()=>detail.classList.add('hidden');
    detail.querySelectorAll('[data-act]:not(:disabled)').forEach(b=>b.onclick=()=>act(b.dataset.act,w));
  };

  reportWish=function(w){
    modal(`<div class="eyebrow">FLAG AS INAPPROPRIATE</div><h2>Help keep the world safe.</h2><div class="choices" id="reasons"><button class="chip">Hate or harassment</button><button class="chip">Personal information</button><button class="chip">Money or solicitation</button><button class="chip">Sexual or violent content</button><button class="chip">Spam</button><button class="chip">Other</button></div><div class="row"><button class="soft" id="cancelR">Cancel</button><button class="soft primary" id="sendR">Flag</button></div>`);
    let reason='';
    document.querySelectorAll('#reasons .chip').forEach(c=>c.onclick=()=>{document.querySelectorAll('#reasons .chip').forEach(x=>x.classList.remove('on'));c.classList.add('on');reason=c.textContent});
    document.getElementById('cancelR').onclick=closeModal;
    document.getElementById('sendR').onclick=()=>{if(!reason)return toast('Choose a reason.');state.reports.push({wishId:w.id,reason,t:Date.now()});save();closeModal();toast('Flag stored for this test.')};
  };

  function injectRendererPatch(){
    const doc=frame.contentDocument;if(!doc)return;
    const script=doc.createElement('script');
    script.textContent=`(function(){
      const rootPalette=[204,238,326,36,168,278,214,18,148];
      world.roots.forEach((r,i)=>r.hue=rootPalette[i%rootPalette.length]);

      const zin=document.getElementById('zin'),zout=document.getElementById('zout'),fitBtn=document.getElementById('fit'),focusBtn=document.getElementById('focus');
      if(zin){zin.title='Zoom in';zin.innerHTML='<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21M10.5 7.5v6M7.5 10.5h6"/></svg>';}
      if(zout){zout.title='Zoom out';zout.innerHTML='<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21M7.5 10.5h6"/></svg>';}
      if(fitBtn)fitBtn.title='Fit world';
      if(focusBtn){focusBtn.title='Cycle through my wishes';focusBtn.addEventListener('click',ev=>{ev.preventDefault();ev.stopImmediatePropagation();parent.postMessage({type:'raluvaaa-cycle-my-wish'},location.origin)},true);}
      function hint(btn,label){if(!btn)return;let timer=null;btn.addEventListener('pointerdown',()=>{timer=setTimeout(()=>parent.postMessage({type:'raluvaaa-control-hint',label},location.origin),520)});['pointerup','pointercancel','pointerleave'].forEach(k=>btn.addEventListener(k,()=>{clearTimeout(timer);timer=null}))}
      hint(zin,'Zoom in');hint(zout,'Zoom out');hint(fitBtn,'Fit world');hint(focusBtn,'My wishes');

      const oldFocus=camera.focus.bind(camera);
      camera.focus=function(n,deep=false){oldFocus(n,deep);window.__raluvaaaFocusPing={id:n.id,start:performance.now()};};

      rootHalo=function(r){const s=camera.worldToScreen(r.x,r.y);if(s.x<-300||s.x>W+300||s.y<-300||s.y>H+300)return;const count=world.nodes.filter(n=>n.root===r).length,z=camera.zoom,breath=1+Math.sin(tNow*.0011+r.index*1.7)*.03;let rad=(66+Math.sqrt(count)*9.2)*z*breath;rad=clamp(rad,14,205);const gr=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,rad);gr.addColorStop(0,'hsla('+r.hue+',34%,75%,.048)');gr.addColorStop(.25,'hsla('+(r.hue+12)+',30%,65%,.022)');gr.addColorStop(.62,'hsla('+(r.hue-14)+',28%,54%,.006)');gr.addColorStop(1,'hsla('+r.hue+',25%,45%,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(s.x,s.y,rad,0,TAU);ctx.fill();};

      drawEdge=function(e,progress=1){if(!inView((e.x0+e.x1)/2,(e.y0+e.y1)/2,180/camera.zoom))return;const z=camera.zoom,state=stateOfEdge(e),alive=state==='alive'||e.encouraged,fossil=state==='fossil',v1=((hash('pigment-a'+e.id)%1000)/1000-.5),v2=((hash('pigment-b'+e.id)%1000)/1000-.5),h=(e.hue+v1*46+360)%360,h2=(e.hue+v2*52+360)%360,sat=30+(hash('pigment-s'+e.id)%14),light=64+(hash('pigment-l'+e.id)%9);const breath=alive?(1+Math.sin(tNow*.0015+e.seed*.00001)*.05):1;const macro=z<.11,mid=z<.38;if(macro&&e.generation>6)return;if(mid&&e.generation>12&&e.type==='bloom')return;ctx.lineCap='round';if(alive){const boost=e.encouraged?1:0,alpha=e.mine?.82:boost?.60:clamp(.16+.21*Math.min(1,z*.9),.16,.37);ctx.shadowColor=e.mine?'rgba(233,218,184,.58)':boost?'rgba(226,240,232,.62)':'hsla('+h+',32%,70%,.12)';ctx.shadowBlur=(e.mine?9:boost?8:1.8)*breath/Math.max(.44,z);const g=ctx.createLinearGradient(e.x0,e.y0,e.x1,e.y1);if(e.mine){g.addColorStop(0,'rgba(235,223,196,.80)');g.addColorStop(.5,'rgba(246,234,208,.86)');g.addColorStop(1,'rgba(218,209,190,.73)')}else{g.addColorStop(0,'hsla('+((h-25+360)%360)+','+Math.max(22,sat-7)+'%,'+Math.max(57,light-5)+'%,'+(alpha*breath)+')');g.addColorStop(.46,'hsla('+((h+8)%360)+','+sat+'%,'+Math.min(77,light+4)+'%,'+(alpha*breath)+')');g.addColorStop(1,'hsla('+((h2+24)%360)+','+Math.max(20,sat-11)+'%,'+light+'%,'+(alpha*.88*breath)+')')}ctx.strokeStyle=g;ctx.lineWidth=(e.mine?1.9:1.14)/Math.max(.46,z);pathEdge(e,progress,0,.38/Math.max(.6,z));ctx.stroke();ctx.shadowBlur=0;const p=ctx.createLinearGradient(e.x0,e.y0,e.x1,e.y1);p.addColorStop(0,'hsla('+((h2+16)%360)+',24%,79%,'+(alpha*.16)+')');p.addColorStop(.55,'hsla('+((h-16+360)%360)+',22%,72%,'+(alpha*.25)+')');p.addColorStop(1,'hsla('+((h2+32)%360)+',26%,80%,'+(alpha*.14)+')');ctx.strokeStyle=p;ctx.lineWidth=.42/Math.max(.57,z);pathEdge(e,progress,(hash('side'+e.id)%2?1:-1)*.66/Math.max(.72,z),.17/Math.max(.84,z));ctx.stroke()}else{ctx.shadowBlur=0;ctx.strokeStyle=fossil?'rgba(106,120,140,.06)':'rgba(143,157,177,.11)';ctx.lineWidth=.63/Math.max(.5,z);pathEdge(e,1);ctx.stroke()}if(alive&&z>.22&&progress>.98){const phase=(tNow*.00018+e.seed*.0000007)%1,pp=qpt(e,phase),boost=e.encouraged?1:0;ctx.fillStyle=boost?'rgba(239,246,235,.82)':'hsla('+h2+',32%,82%,.36)';ctx.shadowColor=boost?'rgba(229,242,232,.78)':'hsla('+h+',30%,72%,.18)';ctx.shadowBlur=(boost?7:1.8)/Math.max(.62,z);ctx.beginPath();ctx.arc(pp.x,pp.y,(boost?1.2:.84)/Math.max(.68,z),0,TAU);ctx.fill();ctx.shadowBlur=0}};

      drawNode=function(n){const z=camera.zoom;if(z<.15&&!n.rootNode&&!n.mine&&!n.encouraged)return;if(!inView(n.x,n.y,100))return;const st=stateOf(n),alive=st==='alive'||n.encouraged,tone=((hash('node-pigment'+n.id)%1000)/1000-.5)*40,h=(n.root.hue+tone+360)%360,pulse=1+(alive?Math.sin(tNow*.0018+hash(n.id)*.00001)*.055:0);let r=(n.rootNode?3.4:(n.mine||n.received)?3.95:n.encouraged?2.26:alive?1.42:.9)*pulse/Math.max(.53,z);ctx.fillStyle=(n.mine||n.received)?'#e6dcc8':n.encouraged?'rgba(235,243,230,.88)':n.rootNode?'hsla('+h+',36%,79%,.68)':alive?'hsla('+h+',34%,76%,.45)':st==='dormant'?'rgba(159,173,193,.21)':'rgba(114,128,148,.10)';if(alive){ctx.shadowColor=(n.mine||n.received)?'rgba(231,214,180,.54)':n.encouraged?'rgba(228,241,231,.76)':'hsla('+h+',32%,71%,.15)';ctx.shadowBlur=((n.mine||n.received)?9:n.encouraged?12:1.8)/Math.max(.6,z)}ctx.beginPath();ctx.arc(n.x,n.y,r,0,TAU);ctx.fill();ctx.shadowBlur=0;if(world.selected?.id===n.id){ctx.strokeStyle='rgba(207,225,228,.28)';ctx.lineWidth=.62/Math.max(.6,z);ctx.beginPath();ctx.arc(n.x,n.y,r*2.2,0,TAU);ctx.stroke()}const fp=window.__raluvaaaFocusPing;if(fp&&fp.id===n.id){const elapsed=performance.now()-fp.start,dur=3000;if(elapsed>dur){window.__raluvaaaFocusPing=null}else{const base=elapsed/dur;for(let i=0;i<3;i++){const q=(base+i*.25)%1,rr=(12+q*88)/Math.max(.58,z),a=(1-q)*.52;ctx.strokeStyle='rgba(191,220,223,'+a+')';ctx.lineWidth=.82/Math.max(.58,z);ctx.beginPath();ctx.arc(n.x,n.y,rr,0,TAU);ctx.stroke()}const disc=(1-base)*.055;ctx.fillStyle='rgba(190,216,219,'+disc+')';ctx.beginPath();ctx.arc(n.x,n.y,(18+base*30)/Math.max(.58,z),0,TAU);ctx.fill()}}};
    })();`;
    doc.body.appendChild(script);
  }

  frame.addEventListener('load',()=>setTimeout(injectRendererPatch,0));
})();
