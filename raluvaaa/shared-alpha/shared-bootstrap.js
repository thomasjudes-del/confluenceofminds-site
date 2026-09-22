(function(){
'use strict';

const params=new URLSearchParams(location.search);
const apiBase=params.get('api')||localStorage.getItem('raluvaaaAlphaApiBaseV1')||window.RALUVAAA_ALPHA_API_BASE||'';
const room=window.RALUVAAA_ROOM||String(params.get('room')||'ALPHA').toUpperCase();
const STORE=window.RALUVAAA_STORE_KEY||('raluvaaaSharedAlphaV1:'+room);
const maps={wish:new Map(),lineage:new Map(),proposal:new Map()};
let client=null,lastWorld=null,lastMe=null,lastInbox=null,lastFingerprint='',mutating=0,refreshTimer=null,queue=Promise.resolve();

function status(text,error=false){
  let box=document.getElementById('sharedStatus');
  if(!box){
    box=document.createElement('div');box.id='sharedStatus';
    box.style.cssText='position:fixed;z-index:120;left:50%;top:18px;transform:translateX(-50%);max-width:min(560px,calc(100vw - 28px));padding:9px 13px;border:1px solid rgba(184,214,255,.15);border-radius:999px;background:rgba(3,9,18,.92);backdrop-filter:blur(14px);font:9px/1.35 Inter,system-ui,sans-serif;color:rgba(238,246,255,.82);text-align:center';
    document.body.appendChild(box);
  }
  box.textContent=text;box.style.borderColor=error?'rgba(255,140,140,.32)':'rgba(184,214,255,.15)';
}
function hideStatus(){const b=document.getElementById('sharedStatus');if(b)b.remove()}
function installRoomBadge(){
  const sub=document.querySelector('#brand .sub');if(sub)sub.textContent='SHARED ALPHA · '+room;
  if(document.getElementById('sharedRoomBadge'))return;
  const style=document.createElement('style');style.textContent='#sharedRoomBadge{position:fixed;z-index:49;left:50%;bottom:10px;transform:translateX(-50%);display:flex;align-items:center;gap:7px;padding:5px 7px 5px 10px;border:1px solid rgba(184,214,255,.14);border-radius:999px;background:rgba(3,9,18,.82);backdrop-filter:blur(12px);font:7px/1 Inter,system-ui,sans-serif;letter-spacing:.08em;color:rgba(226,238,251,.58)}#sharedRoomBadge b{color:rgba(242,248,255,.88);font-size:8px;letter-spacing:.14em}#sharedRoomBadge button{height:24px;border:1px solid rgba(184,214,255,.12);border-radius:999px;background:rgba(255,255,255,.04);padding:0 8px;color:rgba(237,246,255,.74);font-size:7px;letter-spacing:.05em;text-transform:uppercase}#sharedRoomBadge button:hover{background:rgba(89,206,255,.07)}@media(max-width:820px){#sharedRoomBadge{bottom:7px;max-width:calc(100vw - 20px)}}';document.head.appendChild(style);
  const el=document.createElement('div');el.id='sharedRoomBadge';el.innerHTML='<span>TEST</span><b>'+room+'</b><button type="button">Copier le lien</button>';document.body.appendChild(el);
  el.querySelector('button').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);const b=el.querySelector('button'),old=b.textContent;b.textContent='Copié';setTimeout(()=>b.textContent=old,1400)}catch{prompt('Copiez ce lien',location.href)}};
}
function seed(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function idOf(id){return maps.wish.get(id)||id}
function proposalOf(id){return maps.proposal.get(id)||id}
function ownerFor(w,actorId){return w.isMine?actorId:'external:'+w.lineageId}

function buildState(world,me,inbox,actorId){
  const events=[],wishes=[...(world.wishes||[])].sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
  const byWish=new Map(wishes.map(w=>[w.id,w]));
  for(const w of wishes){
    const actor=ownerFor(w,actorId);
    if(w.kind==='create'){
      events.push({type:'create',actorId:actor,semanticId:w.id,lineageId:w.lineageId,text:w.text,loc:w.locationText||'Somewhere',seed:seed(w.lineageId),at:w.createdAt});
    }else if(w.kind==='evolve'){
      events.push({type:'evolve',actorId:actor,semanticId:w.id,lineageId:w.lineageId,parentSemanticId:w.parentWishId,text:w.text,loc:w.locationText||'Somewhere',seed:seed(w.id),at:w.createdAt});
    }else if(w.kind==='split'){
      events.push({type:'branch_add',actorId:actor,lineageId:w.lineageId,parentSemanticId:w.parentWishId,children:[{semanticId:w.id,text:w.text,loc:w.locationText||'Somewhere',seed:seed(w.id)}],at:w.createdAt});
    }
  }
  for(const w of wishes){
    const actor=ownerFor(w,actorId);
    if(w.state==='bloomed')events.push({type:'bloom',actorId:actor,semanticId:w.id,seed:seed('bloom|'+w.id),at:(w.updatedAt||w.createdAt)+1});
    if(w.state==='abandoned')events.push({type:'abandon',actorId:actor,semanticId:w.id,at:(w.updatedAt||w.createdAt)+1});
  }
  const mineEnc=new Set(me.encouragedWishIds||[]);
  for(const w of wishes){
    let n=Number(w.encouragementCount||0);
    if(mineEnc.has(w.id)&&n>0){events.push({type:'encourage',actorId,semanticId:w.id,at:(w.updatedAt||w.createdAt)+2});n--}
    for(let i=0;i<n;i++)events.push({type:'encourage',actorId:'external:enc:'+i+':'+w.id,semanticId:w.id,at:(w.updatedAt||w.createdAt)+3+i});
  }
  for(const e of world.events||[]){
    if(e.type==='help'&&byWish.has(e.wishId))events.push({type:'help',actorId:'system',proposalId:e.payload?.proposalId||e.id,semanticId:e.wishId,seed:seed(e.id),at:e.createdAt});
    if(e.type==='connect'&&byWish.has(e.wishId)&&e.payload?.otherWishId)events.push({type:'connect',actorId:'system',proposalId:e.payload?.proposalId||e.id,aSemanticId:e.wishId,bSemanticId:e.payload.otherWishId,seed:seed(e.id),at:e.createdAt});
  }
  const seenProposals=new Set();
  const addProposal=(p,role)=>{
    if(!p||seenProposals.has(p.id))return;
    seenProposals.add(p.id);
    const proposer=p.proposerActorId||'external:helper:'+p.id;
    const required=[p.targetOwnerActorId,p.otherOwnerActorId].filter(Boolean);
    const common={actorId:proposer,proposalId:p.id,requiredActors:[...new Set(required)],serverStatus:p.status||'pending',seed:seed(p.id),at:p.createdAt};
    if(p.type==='help')events.push({...common,type:'help_proposed',semanticId:p.targetWishId,note:p.privatePayload?.note||'',targetActorId:p.targetOwnerActorId||actorId});
    if(p.type==='suggest_branch')events.push({...common,type:'suggest_proposed',semanticId:p.targetWishId,suggestions:p.privatePayload?.steps||[],targetActorId:p.targetOwnerActorId||actorId});
    if(p.type==='connect')events.push({...common,type:'connect_proposed',aSemanticId:p.targetWishId,bSemanticId:p.otherWishId});
    if(role==='received'&&p.decision)events.push({type:'proposal_response',actorId,proposalId:p.id,decision:p.decision,semanticId:p.targetWishId,aSemanticId:p.targetWishId,bSemanticId:p.otherWishId,at:(p.updatedAt||p.createdAt)+1});
  };
  for(const p of inbox.pending||[])addProposal(p,'received');
  for(const p of inbox.sent||[])addProposal(p,'sent');
  for(const p of inbox.receivedHistory||[])addProposal(p,'received');
  events.sort((a,b)=>(a.at||0)-(b.at||0));
  return{version:26,lang:(navigator.language||'fr').toLowerCase().startsWith('en')?'en':'fr',entrusted:null,notifications:(inbox.notifications||[]).map(x=>({...x})),events};
}
function fp(state){return JSON.stringify({events:state.events.map(e=>[e.type,e.semanticId||'',e.parentSemanticId||'',e.proposalId||'',e.decision||'',e.serverStatus||'',e.aSemanticId||'',e.bSemanticId||'',(e.children||[]).map(c=>c.semanticId).join(',')]),notifications:(state.notifications||[]).map(n=>[n.id,n.kind,n.objectId,n.isRead,n.title||'',n.body||''])})}

async function fetchState(){
  const [world,me,inbox]=await Promise.all([client.world(),client.me(),client.inbox()]);
  lastWorld=world;lastMe=me;lastInbox=inbox;
  const next=buildState(world,me,inbox,client.actorId);
  return next;
}
async function refresh(force=false){
  if(mutating)return;
  const next=await fetchState(),fingerprint=fp(next);
  if(!force&&fingerprint===lastFingerprint)return;
  lastFingerprint=fingerprint;
  if(window.__RV26_SHARED__)window.__RV26_SHARED__.replace(next);
  else localStorage.setItem(STORE,JSON.stringify(next));
}
function scheduleRefresh(ms=250){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>refresh(true).catch(showError),ms)}
function showError(err){console.error(err);status('Shared sync error: '+String(err?.message||err),true);setTimeout(()=>{if(window.__RALUVAAA_SHARED_READY__)hideStatus()},3200)}

async function syncEvent(ev){
  mutating++;
  try{
    let out;
    if(ev.type==='create'){
      out=await client.createWish({text:ev.text,locationText:ev.loc});maps.wish.set(ev.semanticId,out.wishId);maps.lineage.set(ev.lineageId,out.lineageId);
    }else if(ev.type==='evolve'){
      out=await client.wishEvent(idOf(ev.parentSemanticId),{type:'evolve',text:ev.text});maps.wish.set(ev.semanticId,out.wishId);
    }else if((ev.type==='split'||ev.type==='branch_add')&&!ev.proposalId){
      out=await client.wishEvent(idOf(ev.parentSemanticId),{type:ev.type==='split'?'split':'add_branch',children:(ev.children||[]).map(c=>c.text)});
      (ev.children||[]).forEach((c,i)=>{if(out.wishIds?.[i])maps.wish.set(c.semanticId,out.wishIds[i])});
    }else if(ev.type==='bloom'||ev.type==='abandon'){
      await client.wishEvent(idOf(ev.semanticId),{type:ev.type});
    }else if(ev.type==='reparent'){
      await client.wishEvent(idOf(ev.semanticId),{type:'reparent',newParentWishId:idOf(ev.newParentSemanticId)});
    }else if(ev.type==='encourage'){
      await client.encourage(idOf(ev.semanticId));
    }else if(ev.type==='help_proposed'){
      out=await client.proposeHelp(idOf(ev.semanticId),ev.note);maps.proposal.set(ev.proposalId,out.proposalId);
    }else if(ev.type==='suggest_proposed'){
      out=await client.suggestBranches(idOf(ev.semanticId),ev.suggestions||[]);maps.proposal.set(ev.proposalId,out.proposalId);
    }else if(ev.type==='connect_proposed'){
      out=await client.proposeConnect(idOf(ev.aSemanticId),idOf(ev.bSemanticId));maps.proposal.set(ev.proposalId,out.proposalId);
    }else if(ev.type==='proposal_response'){
      try{await client.respondProposal(proposalOf(ev.proposalId),ev.decision)}catch(e){if(e.code!=='already_decided')throw e}
    }else if(ev.type==='proposal_cancelled'){
      await client.cancelProposal(proposalOf(ev.proposalId));
    }
  }finally{
    mutating--;
  }
  scheduleRefresh();
}
function enqueue(ev){queue=queue.then(()=>syncEvent(ev)).catch(err=>{showError(err);scheduleRefresh(50)});return queue}

async function removeShared(localId){
  await queue;
  await client.wishEvent(idOf(localId),{type:'remove_mistake'});
  await refresh(true);
}

function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Could not load '+src));document.body.appendChild(s)})}

async function boot(){
  if(!apiBase){status('Shared Alpha backend is not deployed yet. Use the Alpha V0 candidate for product review.',true);return}
  localStorage.setItem('raluvaaaAlphaApiBaseV1',apiBase);
  status('Connecting RALUVAAA shared world…');
  const mod=await import('/raluvaaa/alpha-api/client.mjs');
  client=new mod.RaluvaaaAlphaClient({baseUrl:apiBase,room});
  await client.ensureSession();
  window.RALUVAAA_ACTOR_ID=client.actorId;
  window.__RALUVAAA_SHARED_COMMIT__=enqueue;
  window.__RALUVAAA_SHARED_REMOVE__=removeShared;
  window.__RALUVAAA_SHARED_SHARE__=async localId=>{await queue;return idOf(localId)};
  window.__RALUVAAA_SHARED_MARK_READ__=id=>client.markRead(id);
  const initial=await fetchState();
  lastFingerprint=fp(initial);
  localStorage.setItem(STORE,JSON.stringify(initial));
  await loadScript('../mvp-v26/app.js?build=shared-alpha-20260921-1');
  await loadScript('../mvp-v26/alpha-v0-controls.js?build=shared-alpha-20260921-1');
  await loadScript('../mvp-v26/ambient-audio.js?build=shared-alpha-20260921-1');
  await loadScript('../mvp-v26/action-audio.js?build=shared-alpha-20260922-1');
  window.__RALUVAAA_SHARED_READY__=true;
  window.__RALUVAAA_SHARED_DEBUG__={client,room,refresh:()=>refresh(true),world:()=>lastWorld,me:()=>lastMe,inbox:()=>lastInbox,maps};
  hideStatus();
  setInterval(()=>{if(!document.hidden)refresh(false).catch(showError)},2500);
}
installRoomBadge();
boot().catch(showError);
})();