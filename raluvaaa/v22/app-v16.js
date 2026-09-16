(function(){
'use strict';
const frame=document.getElementById('engine');
const detail=document.getElementById('detail');
const overlay=document.getElementById('overlay');
const STORE='raluvaaaWishClassicV16';
const PREV='raluvaaaWishClassicV15';
const LEGACY='raluvaaaWishClassicV1';
const HOUR=3600000,DAY=86400000;
const baseState={version:16,identity:null,events:[],encouraged:[],reports:[],suggestions:[],claimedWishIds:[],entrusted:null,onboarded:false};
let state=load(),bridge=null,wishes=[],wishByNode=new Map(),pulseIndex=0,ownWishCursor=-1;

if(new URLSearchParams(location.search).get('reset')==='1'){
  localStorage.removeItem(STORE);localStorage.removeItem(PREV);localStorage.removeItem(LEGACY);state=cloneBase();
}
function cloneBase(){return {...baseState,events:[],encouraged:[],reports:[],suggestions:[],claimedWishIds:[],entrusted:null}}
function load(){
  try{
    const source=localStorage.getItem(STORE)||localStorage.getItem(PREV)||localStorage.getItem(LEGACY)||'{}';
    const v=JSON.parse(source),wasOld=v.version!==16;
    const out=Object.assign(cloneBase(),v,{version:16});
    if(wasOld)out.entrusted=null;
    return out;
  }catch{return cloneBase()}
}
function save(){localStorage.setItem(STORE,JSON.stringify(state))}
function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
function hash(s){let h=2166136261>>>0;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function seedFor(s){return hash(s+'|raluvaaa')}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function fmtDate(v){return new Intl.DateTimeFormat('en',{day:'numeric',month:'short',year:'numeric'}).format(new Date(v))}
function toast(t){const wrap=document.getElementById('toastWrap');wrap.innerHTML=`<div class="toast">${esc(t)}</div>`;setTimeout(()=>{wrap.innerHTML=''},2600)}
function modal(html,cls=''){overlay.innerHTML=`<div class="scrim" id="scrim"></div><div class="sheet ${cls}">${html}</div>`;document.getElementById('scrim').onclick=closeModal}
function closeModal(){overlay.innerHTML=''}
function closeDetail(){detail.classList.add('hidden');bridge?.clearSelection?.()}
function wishById(id){return wishes.find(w=>w.id===id)}
function postWishNodes(){wishByNode=new Map(wishes.filter(w=>w.nodeId).map(w=>[w.nodeId,w.id]));bridge?.setWishNodes([...wishByNode.keys()])}

function injectBridge(){
  const doc=frame.contentDocument;if(!doc)return;
  const style=doc.createElement('style');
  style.textContent='.top-left,.top-center,.minimap,.bottom-left,.bottom-right,.node-card,.scale,.lod{display:none!important}.side{z-index:20}';
  doc.head.appendChild(style);
  const script=doc.createElement('script');
  script.textContent=`(function(){
    const wishNodes=new Set();
    function node(id){return world.nodes.find(n=>n.id===id)||null}
    function seedNodes(count){
      const arr=world.nodes.filter(n=>!n.rootNode&&n.generation>=2&&n.generation<=13&&stateOf(n)==='alive');
      arr.sort((a,b)=>hash('wish-map-'+a.id)-hash('wish-map-'+b.id));
      if(arr.length<count){for(const n of world.nodes){if(!n.rootNode&&!arr.includes(n))arr.push(n)}}
      const out=[],step=Math.max(1,Math.floor(arr.length/count));
      for(let i=0;i<count;i++)out.push(arr[(i*step+(i*17)%step)%arr.length].id);
      return [...new Set(out)].slice(0,count);
    }
    function growWish(baseId,type,seed){
      const R=rng(seed>>>0);let p=baseId?node(baseId):pickTip(R);if(!p)return null;
      world.clock+=.11;const out=grow(p,type||'bend',R,false);out.node.lastActive=world.clock;out.edge.lastActive=world.clock;updateStats();return out.node.id;
    }
    function connect(aId,bId,seed){
      const a=node(aId),b=node(bId);if(!a||!b)return null;
      world.clock+=.05;const ang=Math.atan2(b.y-a.y,b.x-a.x),len=Math.hypot(b.x-a.x,b.y-a.y);const e=edgeGeom(a.x,a.y,ang,len,(((seed>>>0)%1000)/1000-.5)*.38);
      e.id='wc'+world.next++;e.root=a.root;e.parentId=a.id;e.hue=(a.root.hue+(((seed>>>0)%29)-14)+360)%360;e.generation=Math.max(a.generation,b.generation)+1;e.created=world.clock;e.lastActive=world.clock;e.mine=false;e.type='connect';e.seed=seed>>>0;e.micro=[];e.activityLevel=.46;world.edges.push(e);updateStats();return e.id;
    }
    function setVisualState(id,data){
      const n=node(id);if(!n)return false;
      const e=world.edges.find(x=>x.id===n.edgeId);
      const encouragementCount=Math.max(0,Number(data?.encouragementCount)||0);
      const activityLevel=Math.max(.02,Math.min(1,Number(data?.activityLevel)||.10));
      const helpCount=Math.max(0,Number(data?.helpCount)||0);
      const urgency=Math.max(0,Math.min(1,Number(data?.entrustedUrgency)||0));
      n.encouragementCount=encouragementCount;n.activityLevel=activityLevel;n.helpCount=helpCount;n.entrustedUrgency=urgency;
      if(e){e.encouragementCount=encouragementCount;e.activityLevel=activityLevel;e.helpCount=helpCount;}
      return true;
    }
    function fossil(id){const n=node(id);if(!n)return false;n.lastActive=world.clock-120;const e=world.edges.find(x=>x.id===n.edgeId);if(e)e.lastActive=world.clock-120;return true}
    function focus(id){const n=node(id);if(!n)return false;world.selected=n;camera.focus(n,false);return true}
    function clearSelection(){world.selected=null;return true}
    function setWishNodes(ids){wishNodes.clear();ids.forEach(id=>wishNodes.add(id))}
    function stats(){return{nodes:world.nodes.length,routes:world.edges.length,roots:world.roots.length,worldClock:world.clock,zoom:camera.zoom}}
    canvas.addEventListener('click',ev=>{
      let best=null,bd=30;
      for(const id of wishNodes){const n=node(id);if(!n)continue;const p=camera.worldToScreen(n.x,n.y),d=Math.hypot(p.x-ev.clientX,p.y-ev.clientY);if(d<bd){bd=d;best=id}}
      if(best){parent.postMessage({type:'raluvaaa-wish-click',nodeId:best},location.origin)}
      else{world.selected=null;parent.postMessage({type:'raluvaaa-world-blank'},location.origin)}
    });
    window.RV_BRIDGE={seedNodes,growWish,connect,setVisualState,fossil,focus,clearSelection,setWishNodes,stats,nodeState:id=>{const n=node(id);return n?stateOf(n):null},worldClock:()=>world.clock};
    parent.postMessage({type:'raluvaaa-engine-ready'},location.origin);
  })();`;
  doc.body.appendChild(script);
}

frame.addEventListener('load',()=>{try{injectBridge()}catch(err){console.error(err);toast('The living world could not initialise.')}});
window.addEventListener('message',e=>{
  if(e.origin!==location.origin)return;
  if(e.data?.type==='raluvaaa-engine-ready'){bridge=frame.contentWindow.RV_BRIDGE;initWorld()}
  if(e.data?.type==='raluvaaa-wish-click'){const id=wishByNode.get(e.data.nodeId);if(id)openWish(id)}
  if(e.data?.type==='raluvaaa-world-blank')closeDetail()
  if(e.data?.type==='raluvaaa-cycle-my-wish')cycleOwnWish()
  if(e.data?.type==='raluvaaa-control-hint')toast(e.data.label)
  if(e.data?.type==='raluvaaa-renderer-error')console.error('RALUVAAA renderer:',e.data.message)
});

function initWorld(){
  const texts=window.RALUVAAA_SEED_WISHES||[],locs=window.RALUVAAA_SEED_LOCS||['Somewhere in the world'];
  const nodes=bridge.seedNodes(texts.length);
  wishes=texts.slice(0,nodes.length).map((text,i)=>({id:'w'+(i+1),text,loc:locs[(i*7+3)%locs.length],date:new Date(Date.UTC(2026,7+(i%2),1+((i*5)%35))).toISOString(),nodeId:nodes[i],state:i%37===0?'closed':i%31===0?'bloom':'alive',owner:false,claimed:true,parent:null,simulated:true}));
  replay();postWishNodes();ensureEntrusted();renderStats();refreshAllVisuals();rotatePulse();onboard();
  if(location.hash.startsWith('#wish=')){const id=decodeURIComponent(location.hash.slice(6));setTimeout(()=>focusWish(id),250)}
}
function replay(){
  for(const ev of state.events||[]){
    if(ev.type==='create'){
      const nodeId=bridge.growWish(null,'bend',ev.seed);wishes.push({...ev.wish,nodeId,state:'alive',owner:true,claimed:true,simulated:false});
    }else if(ev.type==='pivot'){
      const w=wishById(ev.wishId);if(w){w.nodeId=bridge.growWish(w.nodeId,'bend',ev.seed)||w.nodeId;w.text=ev.to;}
    }else if(ev.type==='split'){
      const p=wishById(ev.parentId);if(p)for(const c of ev.children){const nodeId=bridge.growWish(p.nodeId,'split',c.seed);wishes.push({...c,nodeId,state:'alive',claimed:true,simulated:false});}
    }else if(ev.type==='connect'){
      const a=wishById(ev.a),b=wishById(ev.b);if(a&&b)bridge.connect(a.nodeId,b.nodeId,ev.seed);
    }else if(ev.type==='bloom'){
      const w=wishById(ev.wishId);if(w){bridge.growWish(w.nodeId,'bloom',ev.seed);w.state='bloom';}
    }else if(ev.type==='letgo'){
      const w=wishById(ev.wishId);if(w){bridge.fossil(w.nodeId);w.state='closed';}
    }
  }
}
function renderStats(){
  const s=bridge?.stats?.()||{},custom=wishes.filter(w=>!w.simulated).length,blooms=(state.events||[]).filter(e=>e.type==='bloom').length;
  document.getElementById('stats').innerHTML=[['Wishes',wishes.length],['Routes',s.routes||0],['Roots',s.roots||0],['Blooms',blooms],['Local test wishes',custom]].map(([k,v])=>`<span>${k}</span><b>${v}</b>`).join('');
}
const pulse=['A wish bloomed in Kyoto. · SIMULATED','Someone connected two distant intentions. · SIMULATED','A quiet wish moved again. · SIMULATED','Someone split a large intention into smaller steps. · SIMULATED'];
function rotatePulse(){document.getElementById('pulseNews').textContent=pulse[pulseIndex++%pulse.length];setTimeout(rotatePulse,6500)}

function simulatedEncouragements(w){
  if(!w.simulated)return 0;
  const p=hash('sim-enc-band|'+w.id)%100,q=hash('sim-enc-count|'+w.id);
  if(p<72)return 0;if(p<88)return 1+(q%3);if(p<97)return 4+(q%9);return 20+(q%61);
}
function helpCount(w){return state.suggestions.filter(s=>s.wishId===w.id&&s.type==='HELP'&&s.accepted!==false).length}
function connectionCount(w){return state.events.filter(e=>e.type==='connect'&&(e.a===w.id||e.b===w.id)).length}
function pivotCount(w){return state.events.filter(e=>e.type==='pivot'&&e.wishId===w.id).length}
function splitCount(w){return state.events.filter(e=>e.type==='split'&&e.parentId===w.id).length}
function localEncouragement(w){return state.encouraged.includes(w.id)?1:0}
function visualStateFor(w){
  const h=helpCount(w),c=connectionCount(w),p=pivotCount(w),s=splitCount(w),enc=simulatedEncouragements(w)+localEncouragement(w);
  const seeded=w.simulated?(0.10+(hash('sim-flow|'+w.id)%22)/100):.16;
  const bloom=w.state==='bloom'?.22:0;
  const activity=clamp(seeded+h*.27+c*.16+p*.11+s*.15+localEncouragement(w)*.05+bloom,.035,1);
  const slot=(state.entrusted||[]).find(x=>x.wishId===w.id),remaining=slot?slot.expires-Date.now():Infinity;
  const urgency=remaining<DAY?clamp(1-remaining/DAY,.08,1):0;
  return{encouragementCount:enc,activityLevel:activity,helpCount:h,entrustedUrgency:urgency};
}
function refreshVisual(w){if(w?.nodeId)bridge?.setVisualState?.(w.nodeId,visualStateFor(w))}
function refreshAllVisuals(){for(const w of wishes)refreshVisual(w)}

function makeSlot(band,now,exclude=new Set()){
  let pool=wishes.filter(w=>w.state!=='closed'&&!exclude.has(w.id));if(!pool.length)pool=wishes.filter(w=>w.state!=='closed');
  const w=pool[Math.floor(Math.random()*pool.length)];
  const ms=band==='hours'?(2+Math.random()*21)*HOUR:band==='days'?(2+Math.random()*6)*DAY:(11+Math.random()*10)*DAY;
  return{wishId:w.id,band,expires:now+ms};
}
function ensureEntrusted(){
  const now=Date.now(),bands=['hours','days','weeks'];let slots=state.entrusted;
  const wrongShape=!Array.isArray(slots)||slots.length!==3;
  const wrongBands=!wrongShape&&slots.some((slot,i)=>slot.band!==bands[i]);
  if(wrongShape||wrongBands){
    const used=new Set();slots=bands.map(b=>{const x=makeSlot(b,now,used);used.add(x.wishId);return x});
  }else{
    const used=new Set();slots=slots.map((slot,i)=>{const x=slot.expires<=now?makeSlot(slot.band||bands[i],now,used):slot;used.add(x.wishId);return x});
  }
  state.entrusted=slots;save();renderEntrusted();refreshAllVisuals();
}
function remain(ms){
  const total=Math.max(0,Math.floor(ms/1000));
  if(total<60)return total+'s';
  const m=Math.floor(total/60),s=total%60;if(m<60)return m+'m '+String(s).padStart(2,'0')+'s';
  const h=Math.floor(m/60),mm=m%60;if(h<24)return h+'h '+String(mm).padStart(2,'0')+'m';
  const d=Math.floor(h/24),hh=h%24;return d+'d '+hh+'h';
}
function temporalClass(r){return r<DAY?'urgent':r>10*DAY?'long':'mid'}
function renderEntrusted(){
  const now=Date.now(),grid=document.getElementById('entrustedGrid');
  grid.innerHTML=(state.entrusted||[]).map(slot=>{const w=wishById(slot.wishId),r=slot.expires-now;if(!w)return'';return `<button class="entrusted-item ${temporalClass(r)}" data-wish="${w.id}"><div class="t">${esc(w.text)}</div><div class="m">${remain(r)} left</div></button>`}).join('');
  grid.querySelectorAll('[data-wish]').forEach(b=>b.onclick=()=>focusWish(b.dataset.wish));
}
setInterval(()=>{if(!bridge)return;const now=Date.now();if((state.entrusted||[]).some(s=>s.expires<=now))ensureEntrusted();else{renderEntrusted();refreshAllVisuals()}},1000);
function focusWish(id){const w=wishById(id);if(!w)return;bridge.focus(w.nodeId);openWish(id)}
function cycleOwnWish(){
  const mine=wishes.filter(w=>w.owner&&w.state!=='closed');
  if(!mine.length){toast('Release a wish first.');return;}
  ownWishCursor=(ownWishCursor+1)%mine.length;openWish(mine[ownWishCursor].id);
  toast((ownWishCursor+1)+'/'+mine.length+' · '+mine[ownWishCursor].text.slice(0,58)+(mine[ownWishCursor].text.length>58?'…':''));
}
function isClaimedOwner(w){return !!w.owner}

function openWish(id){
  const w=wishById(id);if(!w)return;
  const own=isClaimedOwner(w),enc=state.encouraged.includes(w.id),helped=helpCount(w)>0,connected=connectionCount(w)>0,pivoted=pivotCount(w)>0,splitDone=splitCount(w)>0;
  bridge.focus(w.nodeId);detail.classList.remove('hidden');
  const label=w.simulated?'SIMULATED TEST WISH':own?'YOUR LOCAL TEST WISH':'A TEST INTENTION';
  const status=w.state==='bloom'?'Bloomed':w.state==='closed'?'Trace · let go':own?'Your living wish':'Living wish';
  detail.innerHTML=`<div class="detail-top"><div><div class="eyebrow">${label}</div><div class="wishtext">${esc(w.text)}</div><div class="meta">${esc(w.loc)} · ${fmtDate(w.date)}</div><div class="state">${status}</div></div><button class="close" id="closeDetail">×</button></div><div class="actions"><button class="action ${enc?'active':''}" data-act="encourage"><span class="ico">${enc?'✦':'✧'}</span>${enc?'Encouraged':'Encourage'}</button><button class="action ${helped?'done':''}" data-act="help" ${helped?'disabled':''}><span class="ico">↟</span>${helped?'Helped':'Help'}</button><button class="action ${connected?'done':''}" data-act="connect" ${connected?'disabled':''}><span class="ico">⌁</span>${connected?'Connected':'Connect'}</button><button class="action ${pivoted?'done':''}" data-act="pivot" ${pivoted?'disabled':''}><span class="ico">↝</span>${pivoted?'Pivoted':'Pivot'}</button><button class="action ${splitDone?'done':''}" data-act="split" ${splitDone?'disabled':''}><span class="ico">⑂</span>${splitDone?'Split':'Split'}</button><button class="action" data-act="share"><span class="ico">↗</span>Share</button></div>${own?`<div class="owner"><h4>Test your wish lifecycle.</h4><div class="row"><button class="soft" data-act="bloom">Bloom</button><button class="soft" data-act="letgo">Let go</button></div></div>`:''}<div class="test-note">Prototype shortcut: HELP, PIVOT, SPLIT and CONNECT apply immediately so their visual effect can be tested. Identity and recipient acceptance come later.</div><div class="row"><button class="soft" data-act="report">Flag as inappropriate</button></div>`;
  document.getElementById('closeDetail').onclick=closeDetail;
  detail.querySelectorAll('[data-act]:not(:disabled)').forEach(b=>b.onclick=()=>act(b.dataset.act,w));
}
function act(a,w){
  if(a==='encourage'){
    const i=state.encouraged.indexOf(w.id);
    if(i<0){state.encouraged.push(w.id);toast('You encouraged this wish.')}
    else{state.encouraged.splice(i,1);toast('Encouragement removed.')}
    save();refreshVisual(w);openWish(w.id);return;
  }
  if(a==='share'){shareWish(w);return}
  if(a==='report'){reportWish(w);return}
  if(a==='help'){testHelp(w);return}
  if(a==='connect'){chooseConnection(w);return}
  if(a==='pivot'){testPivot(w);return}
  if(a==='split'){testSplit(w);return}
  if(a==='bloom'&&ownable(w)){const ev={type:'bloom',wishId:w.id,seed:seedFor('bloom'+w.id+Date.now())};state.events.push(ev);bridge.growWish(w.nodeId,'bloom',ev.seed);w.state='bloom';save();renderStats();refreshVisual(w);openWish(w.id);toast('This wish bloomed. Its trace remains.');return}
  if(a==='letgo'&&ownable(w)){state.events.push({type:'letgo',wishId:w.id});bridge.fossil(w.nodeId);w.state='closed';save();refreshVisual(w);openWish(w.id);toast('You let this wish go. The trace stays in the world.')}
}
function ownable(w){return !!w.owner}
function shareWish(w){const url=location.href.split('#')[0]+'#wish='+encodeURIComponent(w.id),data={title:'A wish in RALUVAAA',text:w.text,url};if(navigator.share)navigator.share(data).catch(()=>{});else navigator.clipboard?.writeText(url).then(()=>toast('Wish link copied.'))}

function testHelp(w){
  modal(`<div class="eyebrow">HELP · TEST MODE</div><h2>What help reaches this wish?</h2><p>For this prototype, the help is treated as accepted immediately so you can inspect the visual result.</p><textarea class="field" id="helpText" maxlength="220" placeholder="I can help by…"></textarea><div class="row"><button class="soft" id="cancelH">Cancel</button><button class="soft primary" id="applyH">Apply help</button></div>`);
  document.getElementById('cancelH').onclick=closeModal;
  document.getElementById('applyH').onclick=()=>{const text=document.getElementById('helpText').value.trim();if(text.length<3)return toast('Add a short concrete help.');state.suggestions.push({type:'HELP',wishId:w.id,text,t:Date.now(),accepted:true,from:'local-test'});save();closeModal();refreshVisual(w);openWish(w.id);toast('Help applied. Watch the flow around this wish.')};
}
function chooseConnection(from){
  detail.classList.add('hidden');
  const choices=(state.entrusted||[]).map(s=>wishById(s.wishId)).filter(w=>w&&w.id!==from.id);
  modal(`<div class="eyebrow">CONNECT / CARRY · TEST MODE</div><h2>Connect this wish to another.</h2><p>The bridge is applied immediately in this prototype.</p>${choices.map(w=>`<button class="entrusted-item" style="width:100%;margin-top:7px" data-target="${w.id}"><div class="t">${esc(w.text)}</div></button>`).join('')}<div class="row"><button class="soft" id="cancelCon">Cancel</button></div>`);
  document.getElementById('cancelCon').onclick=closeModal;
  document.querySelectorAll('[data-target]').forEach(b=>b.onclick=()=>{const to=wishById(b.dataset.target);const ev={type:'connect',a:from.id,b:to.id,seed:seedFor('connect'+from.id+to.id+Date.now())};state.events.push(ev);bridge.connect(from.nodeId,to.nodeId,ev.seed);save();closeModal();renderStats();refreshVisual(from);refreshVisual(to);openWish(from.id);toast('Connected. The bridge now carries more flow.')});
}
function testPivot(w){
  modal(`<div class="eyebrow">PIVOT · TEST MODE</div><h2>Try another direction.</h2><p>For this prototype, imagine the wisher accepted the pivot.</p><textarea class="field" id="pivotText" maxlength="180">${esc(w.text)}</textarea><div class="row"><button class="soft" id="cancelP">Cancel</button><button class="soft primary" id="applyP">Apply pivot</button></div>`);
  document.getElementById('cancelP').onclick=closeModal;
  document.getElementById('applyP').onclick=()=>{const to=document.getElementById('pivotText').value.trim();if(to.length<8)return toast('Give the new direction a little more shape.');const ev={type:'pivot',wishId:w.id,from:w.text,to,seed:seedFor('pivot'+w.id+Date.now())};state.events.push(ev);w.nodeId=bridge.growWish(w.nodeId,'bend',ev.seed)||w.nodeId;w.text=to;save();closeModal();postWishNodes();refreshVisual(w);focusWish(w.id);toast('Pivot applied. The earlier trace remains.')};
}
function testSplit(w){
  modal(`<div class="eyebrow">SPLIT · TEST MODE</div><h2>Turn this wish into smaller actions.</h2><p>Write two to four sub-wishes, one per line. They are created immediately for testing.</p><textarea class="field" id="splitText" placeholder="First smaller action\nSecond smaller action"></textarea><div class="row"><button class="soft" id="cancelS">Cancel</button><button class="soft primary" id="applyS">Create branches</button></div>`);
  document.getElementById('cancelS').onclick=closeModal;
  document.getElementById('applyS').onclick=()=>{const parts=document.getElementById('splitText').value.split(/\n+/).map(x=>x.trim()).filter(x=>x.length>3).slice(0,4);if(parts.length<2)return toast('Add at least two smaller actions.');const stamp=Date.now(),children=parts.map((text,i)=>({id:'u'+stamp+'s'+i,text,loc:w.loc,date:new Date().toISOString(),owner:w.owner,claimed:true,parent:w.id,seed:seedFor('split'+w.id+stamp+i),testContribution:!w.owner}));state.events.push({type:'split',parentId:w.id,children});for(const c of children){c.nodeId=bridge.growWish(w.nodeId,'split',c.seed);c.state='alive';c.simulated=false;wishes.push(c)}save();closeModal();postWishNodes();renderStats();refreshVisual(w);children.forEach(refreshVisual);focusWish(w.id);toast('Sub-wishes created. Find them in My World if this is your wish.')};
}
function reportWish(w){
  modal(`<div class="eyebrow">FLAG AS INAPPROPRIATE</div><h2>Help keep the world safe.</h2><div class="choices" id="reasons"><button class="chip">Hate or harassment</button><button class="chip">Personal information</button><button class="chip">Money or solicitation</button><button class="chip">Sexual or violent content</button><button class="chip">Spam</button><button class="chip">Other</button></div><div class="row"><button class="soft" id="cancelR">Cancel</button><button class="soft primary" id="sendR">Flag</button></div>`);
  let reason='';document.querySelectorAll('#reasons .chip').forEach(c=>c.onclick=()=>{document.querySelectorAll('#reasons .chip').forEach(x=>x.classList.remove('on'));c.classList.add('on');reason=c.textContent});document.getElementById('cancelR').onclick=closeModal;document.getElementById('sendR').onclick=()=>{if(!reason)return toast('Choose a reason.');state.reports.push({wishId:w.id,reason,t:Date.now()});save();closeModal();toast('Flag stored for this test.')};
}

function showCreate(){
  modal(`<div class="eyebrow">RELEASE A WISH · TEST MODE</div><h2>What would you like to bring into the world?</h2><label>Start with</label><div class="choices" id="starts"><button class="chip on">I want to…</button><button class="chip">I wish I could…</button><button class="chip">I want to learn…</button><button class="chip">I want to create…</button><button class="chip">I want to change…</button></div><label>Your intention</label><textarea class="field" id="wishText" maxlength="150" placeholder="cross the Atlantic one day"></textarea><label>Place</label><input class="field" id="wishLoc" maxlength="60" placeholder="Nantes, France"><div class="note">No account needed in this prototype. The wish remains on this device.</div><div id="modNote" class="note"></div><div class="row"><button class="soft" id="cancelC">Cancel</button><button class="soft primary" id="publishC">Release</button></div>`);
  let start='I want to…';document.querySelectorAll('#starts .chip').forEach(c=>c.onclick=()=>{document.querySelectorAll('#starts .chip').forEach(x=>x.classList.remove('on'));c.classList.add('on');start=c.textContent});document.getElementById('cancelC').onclick=closeModal;document.getElementById('publishC').onclick=()=>{const raw=document.getElementById('wishText').value.trim(),loc=document.getElementById('wishLoc').value.trim()||'Somewhere in the world',text=(start.replace('…','')+' '+raw).replace(/\s+/g,' ').trim(),err=moderate(text);if(err){document.getElementById('modNote').innerHTML=`<span class="danger">${esc(err)}</span>`;return}createWish(text,loc)};
}
function moderate(t){if(t.length<10)return'Give the wish a little more shape.';if(/https?:\/\/|www\.|@\w+\.\w+|\+?\d[\d\s().-]{7,}\d/i.test(t))return'Please remove links or personal contact details.';if(/kill myself|suicide|self[- ]?harm|cancer|chemotherapy|diagnos|porn|nude|sex with|buy drugs|weapon|gun|send money|donate money|fundraiser|crowdfund/i.test(t))return'This test version cannot safely host this kind of wish yet.';return null}
function createWish(text,loc){
  const stamp=Date.now(),id='u'+stamp,ev={type:'create',seed:seedFor('create'+stamp),wish:{id,text,loc,date:new Date().toISOString(),owner:true,claimed:true,parent:null}};
  state.events.push(ev);const nodeId=bridge.growWish(null,'bend',ev.seed);const w={...ev.wish,nodeId,state:'alive',simulated:false};wishes.push(w);if(!state.claimedWishIds.includes(id))state.claimedWishIds.push(id);save();closeModal();postWishNodes();renderStats();refreshVisual(w);focusWish(id);toast('Wish released locally. No account required in test mode.');
}
function flattenOwnTree(){
  const mine=wishes.filter(w=>w.owner),roots=mine.filter(w=>!w.parent||!mine.some(x=>x.id===w.parent)),out=[];
  function add(w,depth){out.push({w,depth});mine.filter(x=>x.parent===w.id).forEach(c=>add(c,depth+1))}
  roots.forEach(r=>add(r,0));return out;
}
function showMyWorld(){
  const tree=flattenOwnTree();
  const helped=state.suggestions.filter(s=>s.type==='HELP'&&s.accepted!==false).length,connected=state.events.filter(e=>e.type==='connect').length,pivots=state.events.filter(e=>e.type==='pivot').length,splits=state.events.filter(e=>e.type==='split').length;
  modal(`<div class="eyebrow">MY WORLD · LOCAL TEST</div><h2>Your wishes and traces.</h2><p>No account barrier in this prototype. Everything below is stored only on this device.</p><div class="divider"></div><label>Your wishes</label><div class="my-tree">${tree.length?tree.map(({w,depth})=>`<button class="entrusted-item ${depth?'child':''}" data-mine="${w.id}"><div class="t">${esc(w.text)}</div><div class="m">${w.state}</div></button>`).join(''):'<div class="tiny">No wish released from this device yet.</div>'}</div><div class="divider"></div><label>Your test actions</label><div class="contrib-list"><div class="contrib-row"><b>${helped}</b> helped · <b>${connected}</b> connected · <b>${pivots}</b> pivoted · <b>${splits}</b> split</div></div>`);
  document.querySelectorAll('[data-mine]').forEach(b=>b.onclick=()=>{closeModal();focusWish(b.dataset.mine)});
}
function showPulse(){
  const real=wishes.filter(w=>!w.simulated).length,s=bridge?.stats?.()||{};
  modal(`<div class="eyebrow">WORLD PULSE · TEST</div><h2>The world moved.</h2><p>This is not a feed. Nothing here is ranked for you.</p><div class="stats" style="display:grid;font-size:12px;margin-top:15px"><span>Seeded simulated wishes</span><b>${wishes.length-real}</b><span>Local test wishes</span><b>${real}</b><span>Routes</span><b>${s.routes||0}</b><span>Roots</span><b>${s.roots||0}</b><span>Nodes</span><b>${s.nodes||0}</b><span>Zoom</span><b>${Number(s.zoom||0).toFixed(2)}x</b><span>Local connections</span><b>${state.events.filter(e=>e.type==='connect').length}</b><span>Local blooms</span><b>${state.events.filter(e=>e.type==='bloom').length}</b></div><div class="note">Seeded visual activity is simulated for UX testing. Your local actions are stored separately on this device.</div>`);
}
function onboard(){if(state.onboarded)return;let step=0;const copy=[['A living map of human intentions.','Move through the world and meet what humans hoped for.'],['Every wish can change.','Encourage it, help it, pivot it, split it or connect it. In this prototype those outcomes apply immediately so you can test them.'],['Wishes are entrusted to you.','One is short, one intermediate and one long. When their time with you ends, they return to the world.']];function show(){const [a,b]=copy[step];modal(`<div class="orb"></div><div class="eyebrow">RALUVAAA</div><h2>${a}</h2><p>${b}</p><div class="steps">${copy.map((_,i)=>`<i class="${i===step?'on':''}"></i>`).join('')}</div><button class="soft primary" id="next">${step===copy.length-1?'Enter the world':'Continue'}</button>`,'onboard');document.getElementById('next').onclick=()=>{step++;if(step<copy.length)show();else{state.onboarded=true;save();closeModal()}}}show()}

document.getElementById('createBtn').onclick=showCreate;
document.getElementById('myWorldBtn').onclick=showMyWorld;
document.getElementById('pulseMore').onclick=showPulse;
})();
