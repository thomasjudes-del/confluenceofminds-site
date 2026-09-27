(function(){
'use strict';

const params=new URLSearchParams(location.search);
const apiBase=params.get('api')||localStorage.getItem('raluvaaaAlphaApiBaseV1')||window.RALUVAAA_ALPHA_API_BASE||'';
const room=window.RALUVAAA_ROOM||String(params.get('room')||'ALPHA').toUpperCase();
const STORE=window.RALUVAAA_STORE_KEY||('raluvaaaSharedAlphaV1:'+room);
const maps={wish:new Map(),lineage:new Map(),proposal:new Map()};
let client=null,lastWorld=null,lastMe=null,lastInbox=null,lastFingerprint='',mutating=0,refreshTimer=null,queue=Promise.resolve();
let authMe=null,authResolver=null,savedSyncing=false,lastSavedServer=[];
let preferredLang=(()=>{try{return JSON.parse(localStorage.getItem(STORE)||'null')?.lang||window.RALUVAAA_DEFAULT_LANG||((navigator.language||'en').toLowerCase().startsWith('fr')?'fr':'en')}catch{return window.RALUVAAA_DEFAULT_LANG||'en'}})();

function status(text,error=false){
  let box=document.getElementById('sharedStatus');
  if(!box){
    box=document.createElement('div');box.id='sharedStatus';
    box.style.cssText='position:fixed;z-index:120;left:50%;top:18px;transform:translateX(-50%);max-width:min(560px,calc(100vw - 28px));padding:9px 13px;border:1px solid rgba(184,214,255,.15);border-radius:999px;background:rgba(3,9,18,.92);backdrop-filter:blur(14px);font:9px/1.35 Inter,system-ui,sans-serif;color:rgba(238,246,255,.82);text-align:center';
    document.body.appendChild(box);
  }
  box.textContent=text;box.dataset.error=error?'1':'0';box.style.borderColor=error?'rgba(255,140,140,.42)':'rgba(184,214,255,.15)';box.style.fontSize=error?'13px':'9px';box.style.fontWeight=error?'680':'400';box.style.padding=error?'13px 16px':'9px 13px';box.style.borderRadius=error?'16px':'999px';box.style.background=error?'rgba(31,7,13,.96)':'rgba(3,9,18,.92)';box.style.boxShadow=error?'0 16px 48px rgba(0,0,0,.42)':'none';
}
function hideStatus(){const b=document.getElementById('sharedStatus');if(b)b.remove()}
function installRoomBadge(){
  const sub=document.querySelector('#brand .sub');if(sub)sub.textContent='SHARED ALPHA · REAL · '+room;
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
      events.push({type:'create',actorId:actor,semanticId:w.id,lineageId:w.lineageId,text:w.text,loc:w.locationText||'',seed:seed(w.lineageId),at:w.createdAt});
    }else if(w.kind==='evolve'){
      events.push({type:'evolve',actorId:actor,semanticId:w.id,lineageId:w.lineageId,parentSemanticId:w.parentWishId,text:w.text,loc:w.locationText||'',seed:seed(w.id),at:w.createdAt});
    }else if(w.kind==='split'){
      events.push({type:'branch_add',actorId:actor,lineageId:w.lineageId,parentSemanticId:w.parentWishId,children:[{semanticId:w.id,text:w.text,loc:w.locationText||'',seed:seed(w.id)}],at:w.createdAt});
    }
  }
  const mineEnc=new Set(me.encouragedWishIds||[]);
  for(const w of wishes){
    let n=Number(w.encouragementCount||0);
    if(mineEnc.has(w.id)&&n>0){events.push({type:'encourage',actorId,semanticId:w.id,at:(w.updatedAt||w.createdAt)+2});n--}
    for(let i=0;i<n;i++)events.push({type:'encourage',actorId:'external:enc:'+i+':'+w.id,semanticId:w.id,at:(w.updatedAt||w.createdAt)+3+i});
  }
  for(const e of world.events||[]){
    const w=byWish.get(e.wishId);
    if(['bloom','abandon','resume','wake'].includes(e.type)&&w)events.push({type:e.type,actorId:ownerFor(w,actorId),semanticId:e.wishId,seed:seed(e.id),at:e.createdAt});if(e.type==='help_setting'&&w)events.push({type:'help_setting',actorId:ownerFor(w,actorId),semanticId:e.wishId,open:e.payload?.open!==false,at:e.createdAt});
    if(e.type==='help'&&w)events.push({type:'help',actorId:'system',proposalId:e.payload?.proposalId||e.id,semanticId:e.wishId,seed:seed(e.id),at:e.createdAt});
    if(e.type==='connect'&&w&&e.payload?.otherWishId)events.push({type:'connect',actorId:'system',proposalId:e.payload?.proposalId||e.id,aSemanticId:e.wishId,bSemanticId:e.payload.otherWishId,seed:seed(e.id),at:e.createdAt});
  }
  const seenProposals=new Set();
  const addProposal=(p,role)=>{
    if(!p||seenProposals.has(p.id))return;
    seenProposals.add(p.id);
    const proposer=p.proposerActorId||'external:helper:'+p.id;
    const required=[p.targetOwnerActorId,p.otherOwnerActorId].filter(Boolean);
    const common={actorId:proposer,proposalId:p.id,requiredActors:[...new Set(required)],serverStatus:p.status||'pending',seed:seed(p.id),at:p.createdAt};
    if(p.type==='help')events.push({...common,type:'help_proposed',semanticId:p.targetWishId,helpTitle:p.privatePayload?.title||'',note:p.privatePayload?.note||'',targetActorId:p.targetOwnerActorId||actorId});
    if(p.type==='suggest_branch')events.push({...common,type:'suggest_proposed',semanticId:p.targetWishId,suggestions:p.privatePayload?.steps||[],targetActorId:p.targetOwnerActorId||actorId});
    if(p.type==='connect')events.push({...common,type:'connect_proposed',aSemanticId:p.targetWishId,bSemanticId:p.otherWishId});
    if(role==='received'&&p.decision)events.push({type:'proposal_response',actorId,proposalId:p.id,decision:p.decision,semanticId:p.targetWishId,aSemanticId:p.targetWishId,bSemanticId:p.otherWishId,at:(p.updatedAt||p.createdAt)+1});
  };
  for(const p of inbox.pending||[])addProposal(p,'received');
  for(const p of inbox.sent||[])addProposal(p,'sent');
  for(const p of inbox.receivedHistory||[])addProposal(p,'received');
  events.sort((a,b)=>(a.at||0)-(b.at||0));
  return{version:26,lang:preferredLang,entrusted:null,notifications:(inbox.notifications||[]).map(x=>({...x})),events};
}
function fp(state){return JSON.stringify({events:state.events.map(e=>[e.type,e.semanticId||'',e.parentSemanticId||'',e.proposalId||'',e.decision||'',e.serverStatus||'',e.aSemanticId||'',e.bSemanticId||'',e.text||'',e.loc||'',e.state||'',e.helpTitle||'',e.open===false?'closed':'',e.note||'',(e.suggestions||[]).join('|'),(e.children||[]).map(c=>[c.semanticId,c.text||'',c.loc||'']).join('|')]),notifications:(state.notifications||[]).map(n=>[n.id,n.kind,n.objectId,n.isRead,n.title||'',n.body||''])})}

async function fetchState(){
  const [world,me]=await Promise.all([client.world(),client.me()]);
  const inbox=me.claimed?await client.inbox():{notifications:[],pending:[],sent:[],receivedHistory:[]};
  lastWorld=world;lastMe=me;lastInbox=inbox;authMe=me;
  updateAccountButton();
  const next=buildState(world,me,inbox,client.actorId);
  return next;
}
async function refresh(force=false){
  if(mutating)return;
  const next=await fetchState(),fingerprint=fp(next);
  if(fingerprint===lastFingerprint)return;
  lastFingerprint=fingerprint;
  if(window.__RV26_SHARED__)window.__RV26_SHARED__.replace(next);
  else localStorage.setItem(STORE,JSON.stringify(next));
}
function scheduleRefresh(ms=250){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>refresh(true).catch(showError),ms)}
function friendlyError(err){
  const lang=window.__RV26_SHARED__?.state?.().lang||((navigator.language||'fr').toLowerCase().startsWith('en')?'en':'fr');
  const fr={
    invalid_wish:'Le wish doit contenir entre 3 et 280 caractères.',
    location_required:'Le lieu est nécessaire pour publier ce wish.',
    contact_or_url:'Les liens et coordonnées personnelles ne peuvent pas être publiés dans un wish.',
    outside_alpha_scope:'Ce sujet n’est pas ouvert dans cette première version de RALUVAAA.',
    owner_required:'Cette action appartient au wisher.',
    wish_not_alive:'Ce wish n’est plus actif.',
    same_text:'Le nouvel état doit réellement être différent.',
    already_continued:'Cet état a déjà une continuation.',
    need_two_branches:'Ajoutez au moins deux branches.',
    need_branch:'Ajoutez au moins une branche.',
    root_cannot_move:'Le wish racine ne peut pas être rattaché.',
    different_lineage:'Une branche ne peut être rattachée qu’à sa propre lignée.',
    cycle:'Ce rattachement créerait une boucle impossible.',
    has_descendants:'Cette trace a des descendants. Retirez d’abord ses descendants ou laissez-la dans l’histoire.',
    has_external_activity:'Cette trace a déjà reçu une interaction humaine et ne peut plus être effacée comme simple erreur.',
    own_wish:'Cette action est destinée au wish d’un autre humain.',
    already_encouraged:'Vous avez déjà encouragé ce wish.',
    target_not_available:'Ce wish n’est plus disponible pour cette proposition.',
    other_not_available:'L’autre wish n’est plus disponible.',
    same_lineage:'Choisissez un wish d’une autre lignée.',
    help_note_required:'Décrivez l’aide concrète que vous proposez.',help_title_required:'Donnez un titre court à votre aide.',help_closed:'Ce wish n’accepte pas de nouvelles propositions d’aide.',
    steps_required:'Proposez au moins une branche.',
    duplicate_pending:'Une proposition similaire est déjà en attente.',
    proposal_not_found:'Cette proposition n’existe plus.',
    proposal_not_pending:'Cette proposition a déjà été traitée.',
    consent_not_required:'Votre accord n’est pas requis pour cette proposition.',
    already_decided:'Vous avez déjà répondu à cette proposition.',
    claim_required:'Vérifie ton email pour continuer.',invalid_email:'Entre une adresse email valide.',invalid_code:'Ce code n’est pas correct.',code_expired:'Ce code a expiré.',code_too_soon:'Attends une minute avant de demander un autre code.',code_rate_limited:'Trop de codes demandés. Réessaie plus tard.',email_delivery_failed:'Impossible d’envoyer le code pour le moment.'
  };
  const en={
    invalid_wish:'A wish must contain between 3 and 280 characters.',
    contact_or_url:'Links and personal contact details cannot be published in a wish.',
    outside_alpha_scope:'This topic is not open in this first version of RALUVAAA.',
    owner_required:'Only the wisher can do this.',
    wish_not_alive:'This wish is no longer active.',
    same_text:'The new state must actually be different.',
    already_continued:'This state already has a continuation.',
    need_two_branches:'Add at least two branches.',
    need_branch:'Add at least one branch.',
    root_cannot_move:'The root wish cannot be reattached.',
    different_lineage:'A branch can only be reattached within its own lineage.',
    cycle:'This reattachment would create an impossible loop.',
    has_descendants:'This trace has descendants. Remove them first or keep the trace in its history.',
    has_external_activity:'This trace already has human activity and can no longer be erased as a simple mistake.',
    own_wish:'This action is for another human’s wish.',
    already_encouraged:'You already encouraged this wish.',
    target_not_available:'This wish is no longer available for the proposal.',
    other_not_available:'The other wish is no longer available.',
    same_lineage:'Choose a wish from another lineage.',
    help_note_required:'Describe the concrete help you are offering.',help_title_required:'Give your help a short title.',help_closed:'This wish is not accepting new help offers.',
    steps_required:'Suggest at least one branch.',
    duplicate_pending:'A similar proposal is already pending.',
    proposal_not_found:'This proposal no longer exists.',
    proposal_not_pending:'This proposal has already been handled.',
    consent_not_required:'Your consent is not required for this proposal.',
    already_decided:'You already responded to this proposal.',
    claim_required:'Verify your email to continue.',invalid_email:'Enter a valid email address.',invalid_code:'That code is not correct.',code_expired:'This code has expired.',code_too_soon:'Wait a minute before requesting another code.',code_rate_limited:'Too many codes requested. Try again later.',email_delivery_failed:'Could not send the code right now.'
  };
  return (lang==='en'?en:fr)[err?.code]||String(err?.message||err||'Unexpected error');
}
function showError(err){console.error(err);status(friendlyError(err),true);setTimeout(()=>{if(window.__RALUVAAA_SHARED_READY__)hideStatus()},6500)}

async function resolveWishId(localId,force=false){
  const mapped=idOf(localId);
  if(!force&&(mapped!==localId||lastWorld?.wishes?.some(w=>w.id===mapped)))return mapped;
  const world=await client.world();lastWorld=world;
  if((world.wishes||[]).some(w=>w.id===mapped))return mapped;
  const meta=window.__RV26_SHARED__?.semantic?.().find(x=>x.semanticId===localId);
  if(!meta)return mapped;
  const parentId=meta.parentSemanticId?idOf(meta.parentSemanticId):null;
  const candidates=(world.wishes||[]).filter(w=>
    w.isMine&&w.text===meta.text&&
    (!meta.loc||w.locationText===meta.loc)&&
    (!parentId||w.parentWishId===parentId)
  );
  if(candidates.length===1){maps.wish.set(localId,candidates[0].id);return candidates[0].id}
  return mapped
}
async function safeWishEvent(localId,payload){
  let id=await resolveWishId(localId);
  try{return await client.wishEvent(id,payload)}
  catch(err){
    if(err?.code!=='wish_not_found')throw err;
    const recovered=await resolveWishId(localId,true);
    if(recovered===id)throw err;
    return client.wishEvent(recovered,payload)
  }
}
async function safeEncourage(localId){return client.encourage(await resolveWishId(localId))}
async function syncEvent(ev){
  mutating++;
  try{
    let out;
    if(ev.type==='create'){
      out=await client.createWish({text:ev.text,locationText:ev.loc});maps.wish.set(ev.semanticId,out.wishId);maps.lineage.set(ev.lineageId,out.lineageId);
    }else if(ev.type==='evolve'){
      out=await safeWishEvent(ev.parentSemanticId,{type:'evolve',text:ev.text});maps.wish.set(ev.semanticId,out.wishId);
    }else if((ev.type==='split'||ev.type==='branch_add')&&!ev.proposalId){
      out=await safeWishEvent(ev.parentSemanticId,{type:ev.type==='split'?'split':'add_branch',children:(ev.children||[]).map(c=>c.text)});
      (ev.children||[]).forEach((c,i)=>{if(out.wishIds?.[i])maps.wish.set(c.semanticId,out.wishIds[i])});
    }else if(ev.type==='close_branch'){
      for(const sid of (ev.semanticIds||[ev.semanticId]))await safeWishEvent(sid,{type:'abandon'});
    }else if(ev.type==='resume_branch'){
      for(const sid of (ev.semanticIds||[ev.semanticId]))await safeWishEvent(sid,{type:'resume'});
    }else if(ev.type==='wake'){
      await safeWishEvent(ev.semanticId,{type:'wake'});
    }else if(ev.type==='bloom'||ev.type==='abandon'||ev.type==='resume'||ev.type==='close_lineage'||ev.type==='resume_lineage'){
      await safeWishEvent(ev.semanticId,{type:ev.type});
    }else if(ev.type==='correct'){
      await safeWishEvent(ev.semanticId,{type:'correct',text:ev.text,locationText:ev.loc||''});
    }else if(ev.type==='reparent'){
      await safeWishEvent(ev.semanticId,{type:'reparent',newParentWishId:idOf(ev.newParentSemanticId)});
    }else if(ev.type==='encourage'){
      await safeEncourage(ev.semanticId);
    }else if(ev.type==='help_proposed'){
      out=await client.proposeHelp(await resolveWishId(ev.semanticId),ev.helpTitle,ev.note);maps.proposal.set(ev.proposalId,out.proposalId);
    }else if(ev.type==='help_setting'){
      await safeWishEvent(ev.semanticId,{type:'set_help',open:ev.open!==false});
    }else if(ev.type==='suggest_proposed'){
      out=await client.suggestBranches(await resolveWishId(ev.semanticId),ev.suggestions||[]);maps.proposal.set(ev.proposalId,out.proposalId);
    }else if(ev.type==='connect_proposed'){
      out=await client.proposeConnect(await resolveWishId(ev.aSemanticId),await resolveWishId(ev.bSemanticId));maps.proposal.set(ev.proposalId,out.proposalId);
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


function authText(){
  const en=(navigator.language||'').toLowerCase().startsWith('en');
  return en?{
    account:'Your space',title:'Keep this yours',body:'Use your email to publish and manage wishes, save them across devices, help people and receive replies. No password. No public profile.',
    email:'Email',send:'Send my code',codeTitle:'Enter your code',codeBody:'We sent a 6-digit code to your email. It expires in 10 minutes.',code:'6-digit code',verify:'Continue',
    cancel:'Not now',logout:'Sign out',signed:'Private identity',error:'Something went wrong.',reasons:{publish:'Publish this wish',save:'Save across devices',help:'Offer help',suggest:'Suggest a branch',connect:'Propose a graft'}
  }:{
    account:'Ton espace',title:'Garder ceci à toi',body:'Utilise ton email pour publier et gérer tes wishes, les retrouver sur tes appareils, aider et recevoir des réponses. Pas de mot de passe. Pas de profil public.',
    email:'Email',send:'Envoyer mon code',codeTitle:'Entre ton code',codeBody:'Un code à 6 chiffres vient de partir par email. Il expire dans 10 minutes.',code:'Code à 6 chiffres',verify:'Continuer',
    cancel:'Pas maintenant',logout:'Se déconnecter',signed:'Identité privée',error:'Une erreur est survenue.',reasons:{publish:'Publier ce wish',save:'Sauvegarder sur tes appareils',help:'Proposer une aide',suggest:'Suggérer une branche',connect:'Proposer une greffe'}
  }
}
function authHost(){
  let host=document.getElementById('raluvaaaAuthOverlay');
  if(!host){host=document.createElement('div');host.id='raluvaaaAuthOverlay';document.body.appendChild(host)}
  return host
}
function finishAuth(ok){
  const host=authHost();host.classList.remove('open');host.innerHTML='';
  const resolve=authResolver;authResolver=null;if(resolve)resolve(!!ok)
}
function showAccount(){
  const t=authText(),host=authHost();host.classList.add('open');
  if(authMe?.claimed){
    host.innerHTML='<div class="pa-auth-scrim"></div><section class="pa-auth-card"><button class="pa-auth-x" type="button">×</button><div class="pa-auth-kicker">'+t.signed+'</div><h2>'+t.account+'</h2><div class="pa-auth-account"><b>'+String(authMe.email||'')+'</b><span>'+t.body+'</span></div><div class="pa-auth-actions"><button data-pa-logout>'+t.logout+'</button></div></section>';
    host.querySelector('.pa-auth-scrim').onclick=()=>finishAuth(false);host.querySelector('.pa-auth-x').onclick=()=>finishAuth(false);
    host.querySelector('[data-pa-logout]').onclick=async()=>{
      try{
        await client.logout();await client.ensureSession();window.RALUVAAA_ACTOR_ID=client.actorId;window.__RALUVAAA_UI__?.setActor?.(client.actorId);
        authMe=await client.me();await refreshSavedFromServer();await refresh(true);finishAuth(false)
      }catch(e){showError(e)}
    };
    return
  }
  renderEmailStep('')
}
function renderEmailStep(reason){
  const t=authText(),host=authHost();host.classList.add('open');
  host.innerHTML='<div class="pa-auth-scrim"></div><section class="pa-auth-card"><button class="pa-auth-x" type="button">×</button><div class="pa-auth-kicker">'+(t.reasons[reason]||t.account)+'</div><h2>'+t.title+'</h2><p>'+t.body+'</p><div class="pa-auth-field"><label>'+t.email+'</label><input data-pa-email type="email" autocomplete="email" inputmode="email"></div><div class="pa-auth-error" data-pa-error></div><div class="pa-auth-actions"><button data-pa-cancel>'+t.cancel+'</button><button class="primary" data-pa-send>'+t.send+'</button></div></section>';
  const cancel=()=>finishAuth(false);host.querySelector('.pa-auth-scrim').onclick=cancel;host.querySelector('.pa-auth-x').onclick=cancel;host.querySelector('[data-pa-cancel]').onclick=cancel;
  const input=host.querySelector('[data-pa-email]');setTimeout(()=>input.focus(),40);
  host.querySelector('[data-pa-send]').onclick=async()=>{
    const email=input.value.trim(),btn=host.querySelector('[data-pa-send]'),err=host.querySelector('[data-pa-error]');err.textContent='';btn.disabled=true;
    try{const sent=await client.requestCode(email);renderCodeStep(reason,email,sent.testCode||'')}catch(e){err.textContent=friendlyError(e);btn.disabled=false}
  }
}
function renderCodeStep(reason,email,testCode=''){
  const t=authText(),host=authHost();
  host.innerHTML='<div class="pa-auth-scrim"></div><section class="pa-auth-card"><button class="pa-auth-x" type="button">×</button><div class="pa-auth-kicker">'+String(email).replace(/^(.{2}).+(@.+)$/,'$1***$2')+'</div><h2>'+t.codeTitle+'</h2><p>'+t.codeBody+'</p><div class="pa-auth-field"><label>'+t.code+'</label><input data-pa-code class="pa-auth-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></div><div class="pa-auth-error" data-pa-error></div><div class="pa-auth-actions"><button data-pa-cancel>'+t.cancel+'</button><button class="primary" data-pa-verify>'+t.verify+'</button></div></section>';
  const cancel=()=>finishAuth(false);host.querySelector('.pa-auth-scrim').onclick=cancel;host.querySelector('.pa-auth-x').onclick=cancel;host.querySelector('[data-pa-cancel]').onclick=cancel;
  const input=host.querySelector('[data-pa-code]');if(testCode)input.value=testCode;setTimeout(()=>input.focus(),40);
  host.querySelector('[data-pa-verify]').onclick=async()=>{
    const err=host.querySelector('[data-pa-error]'),btn=host.querySelector('[data-pa-verify]');err.textContent='';btn.disabled=true;
    try{
      await client.verifyCode(email,input.value);window.RALUVAAA_ACTOR_ID=client.actorId;window.__RALUVAAA_UI__?.setActor?.(client.actorId);
      authMe=await client.me();await refresh(true);await refreshSavedFromServer();updateAccountButton();finishAuth(true)
    }catch(e){err.textContent=friendlyError(e);btn.disabled=false}
  }
}
function requireClaim(reason){
  if(authMe?.claimed)return Promise.resolve(true);
  if(authResolver)return Promise.resolve(false);
  return new Promise(resolve=>{authResolver=resolve;renderEmailStep(reason)})
}
function accountCopy(){
  return (window.__RV26_SHARED__?.state?.().lang||((navigator.language||'fr').toLowerCase().startsWith('en')?'en':'fr'))==='en'
    ?{title:'Your space',anonymous:'Not signed in',connect:'Continue with email',logout:'Sign out',note:'Private identity · no public profile'}
    :{title:'Ton espace',anonymous:'Non connecté',connect:'Continuer avec email',logout:'Se déconnecter',note:'Identité privée · aucun profil public'}
}
function decorateMyWorldAccount(){
  const drawer=document.getElementById('drawer'),body=document.getElementById('drawerBody'),my=document.getElementById('myWorldBtn');
  document.getElementById('privateAccountBtn')?.remove();
  if(!drawer||!body||!my?.classList.contains('active')||drawer.classList.contains('hidden'))return;
  const t=accountCopy(),identity=authMe?.claimed?String(authMe.email||''):t.anonymous;
  let section=document.getElementById('privateAccountSection');
  if(!section){
    section=document.createElement('section');section.id='privateAccountSection';section.className='pa-myworld-account';body.prepend(section)
  }else if(section.parentElement===body&&body.firstElementChild!==section)body.prepend(section);
  const signature=[t.title,identity,t.note,authMe?.claimed?'logout':'connect'].join('|');
  if(section.dataset.signature!==signature){
    section.dataset.signature=signature;
    section.innerHTML='<div class="pa-myworld-account-copy"><span>'+t.title+'</span><b>'+identity+'</b><small>'+t.note+'</small></div>'+
      '<button type="button" class="pa-myworld-account-action">'+(authMe?.claimed?t.logout:t.connect)+'</button>';
    const action=section.querySelector('.pa-myworld-account-action');
    action.onclick=async e=>{
      e.stopPropagation();
      if(authMe?.claimed){
        action.disabled=true;
        try{
          await client.logout();await client.ensureSession();authMe=await client.me();
          window.RALUVAAA_ACTOR_ID=client.actorId;window.__RALUVAAA_UI__?.setActor?.(client.actorId);
          await refreshSavedFromServer();await refresh(true);updateAccountButton()
        }catch(err){showError(err);action.disabled=false}
      }else showAccount()
    }
  }
  const title=document.getElementById('drawerTitle');
  if(title)title.textContent=(window.__RV26_SHARED__?.state?.().lang==='en')?'My wishes':'Mes wishes'
}
function updateAccountButton(){
  document.getElementById('privateAccountBtn')?.remove();
  decorateMyWorldAccount()
}
function localSavedKey(){return'raluvaaaSavedWishesV1:local'}
function writeSavedLocal(rows){
  savedSyncing=true;
  const compact=(rows||[]).map(w=>({semanticId:w.id||w.semanticId,lineageId:w.lineageId,savedAt:w.savedAt||Date.now(),text:w.text||'',loc:w.locationText||w.loc||''}));
  localStorage.setItem(localSavedKey(),JSON.stringify(compact));
  window.dispatchEvent(new CustomEvent('raluvaaa-saved-changed',{detail:{count:compact.length}}));
  setTimeout(()=>{savedSyncing=false},0)
}
async function refreshSavedFromServer(){
  if(!authMe?.claimed){lastSavedServer=[];writeSavedLocal([]);return}
  const data=await client.saved();lastSavedServer=data.saved||[];writeSavedLocal(lastSavedServer)
}
async function syncSavedFromLocal(){
  if(savedSyncing||!authMe?.claimed)return;
  let desired=[];try{desired=JSON.parse(localStorage.getItem(localSavedKey())||'[]')}catch{}
  const desiredIds=new Set(desired.map(r=>idOf(r.semanticId)));
  const serverIds=new Set(lastSavedServer.map(w=>w.id));
  for(const id of desiredIds)if(id&&!serverIds.has(id))await client.saveWish(id);
  for(const id of serverIds)if(!desiredIds.has(id))await client.unsaveWish(id);
  await refreshSavedFromServer()
}
function installPrivateGuards(){
  window.__RALUVAAA_SHARED_REQUIRE_CLAIM__=requireClaim;
  document.addEventListener('click',e=>{
    if(e.target.closest?.('#myWorldBtn,.lang button')){setTimeout(()=>{preferredLang=window.__RV26_SHARED__?.state?.().lang||preferredLang;updateAccountButton()},0);setTimeout(updateAccountButton,80)}
  });
  const drawerBody=document.getElementById('drawerBody');
  if(drawerBody)new MutationObserver(()=>{if(document.getElementById('myWorldBtn')?.classList.contains('active'))requestAnimationFrame(decorateMyWorldAccount)}).observe(drawerBody,{childList:true});

  document.addEventListener('click',async e=>{
    const b=e.target.closest?.('#v43BookmarkBtn,#v43MobileBookmarkBtn');
    if(!b||authMe?.claimed)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const id=window.__RALUVAAA_UI__?.current?.()?.semanticId;
    if(await requireClaim('save')){await refreshSavedFromServer();if(id)window.__RALUVAAA_V46__?.toggleSaved?.(id)}
  },true);
  window.addEventListener('raluvaaa-saved-changed',()=>{if(!savedSyncing)syncSavedFromLocal().catch(showError)})
}

function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Could not load '+src));document.body.appendChild(s)})}

async function boot(){
  if(!apiBase){status('Private Alpha backend is not deployed yet.',true);return}
  localStorage.setItem('raluvaaaAlphaApiBaseV1',apiBase);
  status('Connecting RALUVAAA…');
  const mod=await import('/raluvaaa/alpha-api/client.mjs');
  client=new mod.RaluvaaaAlphaClient({baseUrl:apiBase,room});
  await client.ensureSession();authMe=await client.me();
  window.RALUVAAA_ACTOR_ID=client.actorId;
  installPrivateGuards();updateAccountButton();
  window.__RALUVAAA_SHARED_COMMIT__=enqueue;
  window.__RALUVAAA_SHARED_REMOVE__=removeShared;
  window.__RALUVAAA_SHARED_SHARE__=async localId=>{await queue;return idOf(localId)};
  window.__RALUVAAA_SHARED_MARK_READ__=id=>client.markRead(id);
  window.__RALUVAAA_SHARED_STATS__=()=>{
    const wishes=lastWorld?.wishes||[],events=lastWorld?.events||[];
    return{roots:wishes.filter(w=>w.kind==='create').length,states:wishes.length,blooms:wishes.filter(w=>w.state==='bloomed').length,abandoned:wishes.filter(w=>w.state==='abandoned').length,helps:events.filter(e=>e.type==='help').length,warps:events.filter(e=>e.type==='connect').length,localRoots:(lastMe?.wishes||[]).filter(w=>w.kind==='create').length}
  };
  window.__RALUVAAA_SHARED_REPORT__=async(localId,reason,details)=>{await queue;return client.report({wishId:idOf(localId),reason,details})};

  const initial=await fetchState();lastFingerprint=fp(initial);localStorage.setItem(STORE,JSON.stringify(initial));

  await loadScript('../solo-experience-v42/app-v42.js?build=private-alpha-help-1');
  await loadScript('../mvp-v26/alpha-v0-controls.js?build=private-alpha-1');
  await loadScript('../mvp-v26/ambient-audio.js?build=private-alpha-1');
  await loadScript('../solo-experience-v38/sound-v38.js?build=private-alpha-1');
  await loadScript('../solo-organic-v27/ambient-playlist-v27.js?build=private-alpha-1');
  await loadScript('../solo-organic-v27/organic-v27.js?build=private-alpha-1');
  await loadScript('../solo-mobile-v28/mobile-v28.js?build=private-alpha-1');
  await loadScript('../solo-experience-v30/experience-v30.js?build=private-alpha-1');
  await loadScript('../solo-experience-v33/experience-v33.js?build=private-alpha-1');
  await loadScript('../solo-experience-v37/experience-v37.js?build=private-alpha-1');
  await loadScript('../solo-experience-v38/patch-v38.js?build=private-alpha-1');
  await loadScript('../solo-experience-v39/exact-icons-v39.js?build=private-alpha-1');
  await loadScript('../solo-experience-v42/revive-sound-v42.js?build=private-alpha-1');
  await loadScript('../solo-experience-v42/ui-v42.js?build=private-alpha-1');
  await loadScript('features.js?build=private-alpha-1');

  window.__RALUVAAA_SHARED_READY__=true;
  window.__RALUVAAA_SHARED_ERROR__=friendlyError;
  window.__RALUVAAA_PRIVATE_AUTH__={requireClaim,showAccount,me:()=>authMe,refreshSaved:refreshSavedFromServer};
  window.__RALUVAAA_SHARED_DEBUG__={client,room,refresh:()=>refresh(true),world:()=>lastWorld,me:()=>lastMe,inbox:()=>lastInbox,maps};
  await refreshSavedFromServer();updateAccountButton();hideStatus();
  setInterval(()=>{if(!document.hidden)refresh(false).catch(showError)},2500)
}
boot().catch(showError);
})();