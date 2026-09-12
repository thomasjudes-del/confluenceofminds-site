(function(){
'use strict';
const frame=document.getElementById('engine');
const detail=document.getElementById('detail');
const overlay=document.getElementById('overlay');
const STORE='raluvaaaWishClassicV15';
const LEGACY='raluvaaaWishClassicV1';
const HOUR=3600000, DAY=86400000;
const baseState={version:15,identity:null,events:[],encouraged:[],reports:[],suggestions:[],claimedWishIds:[],entrusted:null,onboarded:false};
let state=load(),bridge=null,wishes=[],wishByNode=new Map(),pulseIndex=0,ownWishCursor=-1;

if(new URLSearchParams(location.search).get('reset')==='1'){
  localStorage.removeItem(STORE);localStorage.removeItem(LEGACY);state=cloneBase();
}
function cloneBase(){return {...baseState,events:[],encouraged:[],reports:[],suggestions:[],claimedWishIds:[],entrusted:null}}
function load(){
  try{
    const raw=localStorage.getItem(STORE)||localStorage.getItem(LEGACY)||'{}';
    const v=JSON.parse(raw);return Object.assign(cloneBase(),v,{version:15});
  }catch{return cloneBase()}
}
function save(){localStorage.setItem(STORE,JSON.stringify(state))}
function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
function hash(s){let h=2166136261>>>0;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function seedFor(s){return hash(s+'|raluvaaa')}
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
      e.id='wc'+world.next++;e.root=a.root;e.parentId=a.id;e.hue=(a.root.hue+(((seed>>>0)%29)-14)+360)%360;e.generation=Math.max(a.generation,b.generation)+1;e.created=world.clock;e.lastActive=world.clock;e.mine=false;e.type='connect';e.seed=seed>>>0;e.micro=[];world.edges.push(e);updateStats();return e.id;
    }
    function setEncouraged(id,on){const n=node(id);if(!n)return false;n.encouraged=!!on;const e=world.edges.find(x=>x.id===n.edgeId);if(e)e.encouraged=!!on;return true}
    function fossil(id){const n=node(id);if(!n)return false;n.lastActive=world.clock-120;const e=world.edges.find(x=>x.id===n.edgeId);if(e)e.lastActive=world.clock-120;return true}
    function focus(id){const n=node(id);if(!n)return false;world.selected=n;camera.focus(n,false);return true}
    function clearSelection(){world.selected=null;return true}
    function setWishNodes(ids){wishNodes.clear();ids.forEach(id=>wishNodes.add(id))}
    canvas.addEventListener('click',ev=>{
      let best=null,bd=30;
      for(const id of wishNodes){const n=node(id);if(!n)continue;const p=camera.worldToScreen(n.x,n.y),d=Math.hypot(p.x-ev.clientX,p.y-ev.clientY);if(d<bd){bd=d;best=id}}
      if(best){parent.postMessage({type:'raluvaaa-wish-click',nodeId:best},location.origin)}
      else{world.selected=null;parent.postMessage({type:'raluvaaa-world-blank'},location.origin)}
    });
    window.RV_BRIDGE={seedNodes,growWish,connect,setEncouraged,fossil,focus,clearSelection,setWishNodes,nodeState:id=>{const n=node(id);return n?stateOf(n):null},worldClock:()=>world.clock};
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
  replay();postWishNodes();ensureEntrusted();renderStats();rotatePulse();onboard();
  if(location.hash.startsWith('#wish=')){const id=decodeURIComponent(location.hash.slice(6));setTimeout(()=>focusWish(id),250)}
}
function replay(){
  for(const ev of state.events||[]){
    if(ev.type==='create'){
      const nodeId=bridge.growWish(null,'bend',ev.seed);wishes.push({...ev.wish,nodeId,state:'alive',owner:true,simulated:false});
    }else if(ev.type==='claim'){
      const w=wishById(ev.wishId);if(w)w.claimed=true;
    }else if(ev.type==='pivot'){
      const w=wishById(ev.wishId);if(w){w.nodeId=bridge.growWish(w.nodeId,'bend',ev.seed)||w.nodeId;w.text=ev.to;}
    }else if(ev.type==='split'){
      const p=wishById(ev.parentId);if(p)for(const c of ev.children){const nodeId=bridge.growWish(p.nodeId,'split',c.seed);wishes.push({...c,nodeId,state:'alive',owner:true,claimed:true,simulated:false,parent:p.id});}
    }else if(ev.type==='connect'){
      const a=wishById(ev.a),b=wishById(ev.b);if(a&&b)bridge.connect(a.nodeId,b.nodeId,ev.seed);
    }else if(ev.type==='bloom'){
      const w=wishById(ev.wishId);if(w){bridge.growWish(w.nodeId,'bloom',ev.seed);w.state='bloom';}
    }else if(ev.type==='letgo'){
      const w=wishById(ev.wishId);if(w){bridge.fossil(w.nodeId);w.state='closed';}
    }
  }
  for(const id of state.encouraged||[]){const w=wishById(id);if(w)bridge.setEncouraged(w.nodeId,true)}
}
function renderStats(){
  const custom=wishes.filter(w=>!w.simulated).length,splits=(state.events||[]).filter(e=>e.type==='split').length,blooms=(state.events||[]).filter(e=>e.type==='bloom').length,conns=(state.events||[]).filter(e=>e.type==='connect').length;
  document.getElementById('stats').innerHTML=[['Wishes',wishes.length],['Human connections',conns],['Splits',splits],['Blooms',blooms],['Real test wishes',custom]].map(([k,v])=>`<span>${k}</span><b>${v}</b>`).join('');
}
const pulse=['A wish bloomed in Kyoto. · SIMULATED','Someone connected two distant intentions. · SIMULATED','A quiet wish moved again. · SIMULATED','Someone split a large intention into smaller steps. · SIMULATED'];
function rotatePulse(){document.getElementById('pulseNews').textContent=pulse[pulseIndex++%pulse.length];setTimeout(rotatePulse,6500)}

function makeSlot(band,now,exclude=new Set()){
  let pool=wishes.filter(w=>w.state!=='closed'&&!exclude.has(w.id));if(!pool.length)pool=wishes.filter(w=>w.state!=='closed');
  const w=pool[Math.floor(Math.random()*pool.length)];
  const ms=band==='hours'?(1+Math.random()*17)*HOUR:band==='days'?(1+Math.random()*5)*DAY:(6+Math.random()*10)*DAY;
  return{wishId:w.id,band,expires:now+ms};
}
function ensureEntrusted(){
  const now=Date.now(),bands=['hours','days','weeks'];let slots=state.entrusted;
  if(!Array.isArray(slots)||slots.length!==3){
    const used=new Set();slots=bands.map(b=>{const x=makeSlot(b,now,used);used.add(x.wishId);return x});
  }else{
    const used=new Set();slots=slots.map((slot,i)=>{const x=slot.expires<=now?makeSlot(slot.band||bands[i],now,used):slot;used.add(x.wishId);return x});
  }
  state.entrusted=slots;save();renderEntrusted();
}
function remain(ms){
  const total=Math.max(0,Math.floor(ms/1000));
  if(total<60)return total+'s';
  const m=Math.floor(total/60),s=total%60;if(m<60)return m+'m '+String(s).padStart(2,'0')+'s';
  const h=Math.floor(m/60),mm=m%60;if(h<24)return h+'h '+String(mm).padStart(2,'0')+'m';
  const d=Math.floor(h/24),hh=h%24;return d+'d '+hh+'h';
}
function renderEntrusted(){
  const now=Date.now(),grid=document.getElementById('entrustedGrid');
  grid.innerHTML=(state.entrusted||[]).map(slot=>{const w=wishById(slot.wishId),r=slot.expires-now;if(!w)return'';return `<button class="entrusted-item ${r<5*HOUR?'urgent':''}" data-wish="${w.id}"><div class="t">${esc(w.text)}</div><div class="m">${remain(r)} left</div></button>`}).join('');
  grid.querySelectorAll('[data-wish]').forEach(b=>b.onclick=()=>focusWish(b.dataset.wish));
}
setInterval(()=>{if(!bridge)return;const now=Date.now();if((state.entrusted||[]).some(s=>s.expires<=now))ensureEntrusted();else renderEntrusted()},1000);
function focusWish(id){const w=wishById(id);if(!w)return;bridge.focus(w.nodeId);openWish(id)}
function cycleOwnWish(){
  const mine=wishes.filter(w=>isClaimedOwner(w)&&w.state!=='closed');
  if(!mine.length){toast('Release or claim a wish first.');return;}
  ownWishCursor=(ownWishCursor+1)%mine.length;openWish(mine[ownWishCursor].id);
  toast((ownWishCursor+1)+'/'+mine.length+' · '+mine[ownWishCursor].text.slice(0,58)+(mine[ownWishCursor].text.length>58?'…':''));
}

function isClaimedOwner(w){return !!w.owner&&(w.claimed||state.claimedWishIds.includes(w.id))}
function openWish(id){
  const w=wishById(id);if(!w)return;
  const own=isClaimedOwner(w),enc=state.encouraged.includes(w.id);
  const helped=state.suggestions.some(s=>s.wishId===w.id&&s.type==='HELP');
  const connected=(state.events||[]).some(e=>e.type==='connect'&&(e.a===w.id||e.b===w.id));
  const pivotSuggested=!own&&state.suggestions.some(s=>s.wishId===w.id&&s.type==='PIVOT');
  const splitSuggested=!own&&state.suggestions.some(s=>s.wishId===w.id&&s.type==='SPLIT');
  bridge.focus(w.nodeId);detail.classList.remove('hidden');
  const label=w.simulated?'SIMULATED TEST WISH':own?'YOUR WISH':w.owner?'UNCLAIMED LOCAL WISH':'A HUMAN INTENTION';
  const status=w.state==='bloom'?'Bloomed':w.state==='closed'?'Trace · let go':own?'Your living wish':'Living wish';
  detail.innerHTML=`<div class="detail-top"><div><div class="eyebrow">${label}</div><div class="wishtext">${esc(w.text)}</div><div class="meta">${esc(w.loc)} · ${fmtDate(w.date)}</div><div class="state">${status}</div></div><button class="close" id="closeDetail">×</button></div><div class="actions"><button class="action ${enc?'active':''}" data-act="encourage"><span class="ico">${enc?'✦':'✧'}</span>${enc?'Encouraged':'Encourage'}</button><button class="action ${helped?'done':''}" data-act="help" ${helped?'disabled':''}><span class="ico">↟</span>${helped?'Helped':'Help'}</button><button class="action ${connected?'done':''}" data-act="connect" ${connected?'disabled':''}><span class="ico">⌁</span>${connected?'Connected':'Connect'}</button><button class="action ${pivotSuggested?'done':''}" data-act="pivot" ${pivotSuggested?'disabled':''}><span class="ico">↝</span>${pivotSuggested?'Pivot suggested':'Pivot'}</button><button class="action ${splitSuggested?'done':''}" data-act="split" ${splitSuggested?'disabled':''}><span class="ico">⑂</span>${splitSuggested?'Split suggested':'Split'}</button><button class="action" data-act="share"><span class="ico">↗</span>Share</button></div>${own?`<div class="owner"><h4>Only you decide what happens to this wish.</h4><div class="row"><button class="soft" data-act="bloom">Bloom</button><button class="soft" data-act="letgo">Let go</button></div></div>`:w.owner&&!own?`<div class="owner"><h4>This wish is not claimed yet.</h4><button class="soft" data-act="claim">Claim this wish</button></div>`:''}<div class="row"><button class="soft" data-act="report">Flag as inappropriate</button></div>`;
  document.getElementById('closeDetail').onclick=closeDetail;
  detail.querySelectorAll('[data-act]:not(:disabled)').forEach(b=>b.onclick=()=>act(b.dataset.act,w));
}
function requireIdentity(next){if(state.identity)return next();showIdentity(next)}
function act(a,w){
  if(a==='encourage'){
    const i=state.encouraged.indexOf(w.id);
    if(i<0){state.encouraged.push(w.id);bridge.setEncouraged(w.nodeId,true);toast('You encouraged this wish.')}
    else{state.encouraged.splice(i,1);bridge.setEncouraged(w.nodeId,false);toast('Encouragement removed.')}
    save();openWish(w.id);return;
  }
  if(a==='share'){shareWish(w);return}
  if(a==='report'){reportWish(w);return}
  if(a==='claim'){showClaim(w);return}
  if(a==='help'){requireIdentity(()=>proposal('HELP',w));return}
  if(a==='connect'){requireIdentity(()=>chooseConnection(w));return}
  if(a==='pivot'){if(isClaimedOwner(w))ownerPivot(w);else requireIdentity(()=>proposal('PIVOT',w));return}
  if(a==='split'){if(isClaimedOwner(w))ownerSplit(w);else requireIdentity(()=>proposal('SPLIT',w));return}
  if(a==='bloom'&&isClaimedOwner(w)){const ev={type:'bloom',wishId:w.id,seed:seedFor('bloom'+w.id+Date.now())};state.events.push(ev);bridge.growWish(w.nodeId,'bloom',ev.seed);w.state='bloom';save();renderStats();openWish(w.id);toast('This wish bloomed. Its trace remains.');return}
  if(a==='letgo'&&isClaimedOwner(w)){state.events.push({type:'letgo',wishId:w.id});bridge.fossil(w.nodeId);w.state='closed';save();openWish(w.id);toast('You let this wish go. The trace stays in the world.')}
}
function shareWish(w){const url=location.href.split('#')[0]+'#wish='+encodeURIComponent(w.id),data={title:'A wish in RALUVAAA',text:w.text,url};if(navigator.share)navigator.share(data).catch(()=>{});else navigator.clipboard?.writeText(url).then(()=>toast('Wish link copied.'))}
function showIdentity(next){
  modal(`<div class="eyebrow">PRIVATE IDENTITY</div><h2>Identify privately to continue.</h2><p>Your email is used only to associate actions and wishes with you. It is never shown on a public wish.</p><label>Email</label><input class="field" id="idEmail" type="email" autocomplete="email" placeholder="you@example.com"><div class="note">Prototype: no email is sent. This device remembers you.</div><div class="row"><button class="soft" id="cancelId">Not now</button><button class="soft primary" id="confirmId">Continue</button></div>`);
  document.getElementById('cancelId').onclick=closeModal;
  document.getElementById('confirmId').onclick=()=>{const v=document.getElementById('idEmail').value.trim();if(!/^\S+@\S+\.\S+$/.test(v))return toast('Enter a valid email.');state.identity={email:v,created:Date.now()};save();closeModal();next?.()};
}
function showClaim(w){
  if(state.identity){claim(w);return}
  modal(`<div class="eyebrow">KEEP THIS WISH</div><h2>Give this trace a way back to you.</h2><p>Claim it to shape it, receive help and decide when it blooms or when to let it go.</p><label>Email</label><input class="field" id="claimEmail" type="email" autocomplete="email" placeholder="you@example.com"><div class="note">Your email stays private. Prototype data remains on this device.</div><div class="row"><button class="soft" id="later">Later</button><button class="soft primary" id="claim">Keep this wish</button></div>`);
  document.getElementById('later').onclick=closeModal;
  document.getElementById('claim').onclick=()=>{const v=document.getElementById('claimEmail').value.trim();if(!/^\S+@\S+\.\S+$/.test(v))return toast('Enter a valid email.');state.identity={email:v,created:Date.now()};claim(w)};
}
function claim(w){if(!state.claimedWishIds.includes(w.id))state.claimedWishIds.push(w.id);state.events.push({type:'claim',wishId:w.id});w.claimed=true;save();closeModal();openWish(w.id);toast('This wish is now yours on this test device.')}
function proposal(type,w){
  const copy=type==='HELP'?['Offer something concrete.','I may be able to help by…']:type==='PIVOT'?['Suggest another direction.','What if the path became…']:['Suggest smaller steps.','A first smaller step could be…'];
  modal(`<div class="eyebrow">${type} · SUGGESTION</div><h2>${copy[0]}</h2><p>You are offering a possibility. The wisher decides what happens.</p><label>Your note</label><textarea class="field" id="proposal" maxlength="240" placeholder="${copy[1]}"></textarea><div class="row"><button class="soft" id="cancelP">Cancel</button><button class="soft primary" id="sendP">Send</button></div>`);
  document.getElementById('cancelP').onclick=closeModal;
  document.getElementById('sendP').onclick=()=>{const text=document.getElementById('proposal').value.trim();if(text.length<4)return toast('Write a short, concrete suggestion.');state.suggestions.push({type,wishId:w.id,text,t:Date.now(),from:state.identity.email});save();closeModal();openWish(w.id);toast(type==='HELP'?'Help offered.':'Suggestion sent.')};
}
function chooseConnection(from){
  detail.classList.add('hidden');
  const choices=(state.entrusted||[]).map(s=>wishById(s.wishId)).filter(w=>w&&w.id!==from.id);
  modal(`<div class="eyebrow">CONNECT / CARRY</div><h2>Connect this wish to another.</h2><p>Choose the intention you want to bridge to.</p>${choices.map(w=>`<button class="entrusted-item" style="width:100%;margin-top:7px" data-target="${w.id}"><div class="t">${esc(w.text)}</div></button>`).join('')}<div class="row"><button class="soft" id="cancelCon">Cancel</button></div>`);
  document.getElementById('cancelCon').onclick=closeModal;
  document.querySelectorAll('[data-target]').forEach(b=>b.onclick=()=>{const to=wishById(b.dataset.target);const ev={type:'connect',a:from.id,b:to.id,seed:seedFor('connect'+from.id+to.id+Date.now())};state.events.push(ev);bridge.connect(from.nodeId,to.nodeId,ev.seed);save();closeModal();renderStats();openWish(from.id);toast('Connected.')});
}
function ownerPivot(w){
  modal(`<div class="eyebrow">PIVOT YOUR WISH</div><h2>Change direction without erasing the earlier path.</h2><label>New direction</label><textarea class="field" id="pivotText" maxlength="180">${esc(w.text)}</textarea><div class="row"><button class="soft" id="cancelP">Cancel</button><button class="soft primary" id="applyP">Pivot</button></div>`);
  document.getElementById('cancelP').onclick=closeModal;
  document.getElementById('applyP').onclick=()=>{const to=document.getElementById('pivotText').value.trim();if(to.length<8)return toast('Give the wish a little more shape.');const ev={type:'pivot',wishId:w.id,from:w.text,to,seed:seedFor('pivot'+w.id+Date.now())};state.events.push(ev);w.nodeId=bridge.growWish(w.nodeId,'bend',ev.seed)||w.nodeId;w.text=to;save();closeModal();postWishNodes();focusWish(w.id);toast('The wish pivoted.')};
}
function ownerSplit(w){
  modal(`<div class="eyebrow">SPLIT YOUR WISH</div><h2>Turn one intention into smaller actions.</h2><p>Write two to four smaller intentions, one per line.</p><textarea class="field" id="splitText" placeholder="First smaller intention\nSecond smaller intention"></textarea><div class="row"><button class="soft" id="cancelS">Cancel</button><button class="soft primary" id="applyS">Split</button></div>`);
  document.getElementById('cancelS').onclick=closeModal;
  document.getElementById('applyS').onclick=()=>{const parts=document.getElementById('splitText').value.split(/\n+/).map(x=>x.trim()).filter(x=>x.length>4).slice(0,4);if(parts.length<2)return toast('Add at least two smaller intentions.');const stamp=Date.now(),children=parts.map((text,i)=>({id:'u'+stamp+'s'+i,text,loc:w.loc,date:new Date().toISOString(),owner:true,claimed:true,parent:w.id,seed:seedFor('split'+w.id+stamp+i)}));state.events.push({type:'split',parentId:w.id,children});for(const c of children){c.nodeId=bridge.growWish(w.nodeId,'split',c.seed);c.state='alive';c.simulated=false;wishes.push(c);state.claimedWishIds.push(c.id)}save();closeModal();postWishNodes();renderStats();focusWish(w.id);toast('The wish split into smaller branches.')};
}
function reportWish(w){
  modal(`<div class="eyebrow">FLAG AS INAPPROPRIATE</div><h2>Help keep the world safe.</h2><div class="choices" id="reasons"><button class="chip">Hate or harassment</button><button class="chip">Personal information</button><button class="chip">Money or solicitation</button><button class="chip">Sexual or violent content</button><button class="chip">Spam</button><button class="chip">Other</button></div><div class="row"><button class="soft" id="cancelR">Cancel</button><button class="soft primary" id="sendR">Flag</button></div>`);
  let reason='';document.querySelectorAll('#reasons .chip').forEach(c=>c.onclick=()=>{document.querySelectorAll('#reasons .chip').forEach(x=>x.classList.remove('on'));c.classList.add('on');reason=c.textContent});document.getElementById('cancelR').onclick=closeModal;document.getElementById('sendR').onclick=()=>{if(!reason)return toast('Choose a reason.');state.reports.push({wishId:w.id,reason,t:Date.now()});save();closeModal();toast('Flag stored for this test.')};
}

function showCreate(){
  modal(`<div class="eyebrow">RELEASE A WISH</div><h2>What would you like to bring into the world?</h2><label>Start with</label><div class="choices" id="starts"><button class="chip on">I want to…</button><button class="chip">I wish I could…</button><button class="chip">I want to learn…</button><button class="chip">I want to create…</button><button class="chip">I want to change…</button></div><label>Your intention</label><textarea class="field" id="wishText" maxlength="150" placeholder="cross the Atlantic one day"></textarea><label>Place</label><input class="field" id="wishLoc" maxlength="60" placeholder="Nantes, France"><div class="note">Public metadata: place + date. No contact details or links.</div><div id="modNote" class="note"></div><div class="row"><button class="soft" id="cancelC">Cancel</button><button class="soft primary" id="publishC">Release</button></div>`);
  let start='I want to…';document.querySelectorAll('#starts .chip').forEach(c=>c.onclick=()=>{document.querySelectorAll('#starts .chip').forEach(x=>x.classList.remove('on'));c.classList.add('on');start=c.textContent});document.getElementById('cancelC').onclick=closeModal;document.getElementById('publishC').onclick=()=>{const raw=document.getElementById('wishText').value.trim(),loc=document.getElementById('wishLoc').value.trim()||'Somewhere in the world',text=(start.replace('…','')+' '+raw).replace(/\s+/g,' ').trim(),err=moderate(text);if(err){document.getElementById('modNote').innerHTML=`<span class="danger">${esc(err)}</span>`;return}createWish(text,loc)};
}
function moderate(t){if(t.length<10)return'Give the wish a little more shape.';if(/https?:\/\/|www\.|@\w+\.\w+|\+?\d[\d\s().-]{7,}\d/i.test(t))return'Please remove links or personal contact details.';if(/kill myself|suicide|self[- ]?harm|cancer|chemotherapy|diagnos|porn|nude|sex with|buy drugs|weapon|gun|send money|donate money|fundraiser|crowdfund/i.test(t))return'This test version cannot safely host this kind of wish yet.';return null}
function createWish(text,loc){const stamp=Date.now(),id='u'+stamp,ev={type:'create',seed:seedFor('create'+stamp),wish:{id,text,loc,date:new Date().toISOString(),owner:true,claimed:false,parent:null}};state.events.push(ev);const nodeId=bridge.growWish(null,'bend',ev.seed);const w={...ev.wish,nodeId,state:'alive',simulated:false};wishes.push(w);save();closeModal();postWishNodes();renderStats();focusWish(id);setTimeout(()=>showClaim(w),160)}
function showMyWorld(){
  const mine=wishes.filter(w=>w.owner);
  modal(`<div class="eyebrow">MY WORLD</div><h2>${state.identity?'Your wishes and traces.':'You are exploring anonymously.'}</h2>${state.identity?`<div class="note">${esc(state.identity.email)} · private test identity</div>`:`<div class="row"><button class="soft primary" id="identify">Identify this device</button></div>`}<div class="divider"></div><label>Your wishes</label>${mine.length?mine.map(w=>`<button class="entrusted-item" style="width:100%;margin-top:6px" data-mine="${w.id}"><div class="t">${esc(w.text)}</div><div class="m">${isClaimedOwner(w)?w.state:'unclaimed'}</div></button>`).join(''):'<div class="tiny">No wish released from this device yet.</div>'}`);
  if(!state.identity)document.getElementById('identify').onclick=()=>{closeModal();showIdentity(showMyWorld)};
  document.querySelectorAll('[data-mine]').forEach(b=>b.onclick=()=>{closeModal();focusWish(b.dataset.mine)});
}
function showPulse(){const real=wishes.filter(w=>!w.simulated).length;modal(`<div class="eyebrow">WORLD PULSE · 24H</div><h2>The world moved.</h2><p>This is not a feed. Nothing here is ranked for you.</p><div class="stats" style="display:grid;font-size:12px;margin-top:15px"><span>Seeded wishes</span><b>${wishes.length-real}</b><span>Real local test wishes</span><b>${real}</b><span>Connections made here</span><b>${state.events.filter(e=>e.type==='connect').length}</b><span>Splits made here</span><b>${state.events.filter(e=>e.type==='split').length}</b><span>Blooms made here</span><b>${state.events.filter(e=>e.type==='bloom').length}</b></div><div class="note">Test mode always distinguishes simulated activity from actions made on this device.</div>`)}
function onboard(){if(state.onboarded)return;let step=0;const copy=[['A living map of human intentions.','Move through the world and meet what humans hoped for.'],['Every wish can change.','Encourage it, offer help, suggest a pivot or a split, or carry a connection. The wisher remains sovereign.'],['Wishes are entrusted to you.','They are temporary. When their time with you ends, they return to the world.']];function show(){const [a,b]=copy[step];modal(`<div class="orb"></div><div class="eyebrow">RALUVAAA</div><h2>${a}</h2><p>${b}</p><div class="steps">${copy.map((_,i)=>`<i class="${i===step?'on':''}"></i>`).join('')}</div><button class="soft primary" id="next">${step===copy.length-1?'Enter the world':'Continue'}</button>`,'onboard');document.getElementById('next').onclick=()=>{step++;if(step<copy.length)show();else{state.onboarded=true;save();closeModal()}}}show()}

document.getElementById('createBtn').onclick=showCreate;
document.getElementById('myWorldBtn').onclick=showMyWorld;
document.getElementById('pulseMore').onclick=showPulse;
})();
