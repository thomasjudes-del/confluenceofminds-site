(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.__RALUVAAA_WISH_CONTEXT__=api;
})(typeof window==='object'?window:globalThis,function(){
'use strict';
const EVENT_LIMIT=3000;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function copy(lang){return lang==='en'?{
  create:'initial wish',split:'branch',evolve:'evolution',unknown:'wish',current:'Currently viewed wish',path:'Wish path',children:'Direct continuations',
  missingRoot:'Initial wish unavailable',missingParent:'Part of the parent path is unavailable',invalidPath:'Incomplete wish path',
  support:'support received',help:'accepted offers of help',suggest:'accepted branch suggestions',atLeast:'At least ',unavailable:'Count unavailable',simulated:'Simulated wish',
  limit:'Public history is incomplete; this is a minimum.',simulation:'Real engagement is unavailable for this simulated wish.',dateUnavailable:'Date unavailable'
}:{
  create:'vœu initial',split:'branche',evolve:'évolution',unknown:'vœu',current:'Vœu actuellement ouvert',path:'Chemin du vœu',children:'Suites directes',
  missingRoot:'Vœu initial indisponible',missingParent:'Une partie du chemin parent est indisponible',invalidPath:'Chemin du vœu incomplet',
  support:'soutiens reçus',help:'aides acceptées',suggest:'suggestions de branche acceptées',atLeast:'Au moins ',unavailable:'Compteur indisponible',simulated:'Wish simulé',
  limit:'L’historique public est incomplet ; ce chiffre est un minimum.',simulation:'L’activité réelle est indisponible pour ce wish simulé.',dateUnavailable:'Date indisponible'
}}
function context(current,semantic,world){
  const navigable=new Set((semantic||[]).map(m=>m.semanticId));
  const by=new Map((semantic||[]).map(m=>[m.semanticId,{...m}]));
  // Public records carry explicit parent/root IDs even if the renderer cannot
  // reconstruct an ancestor omitted by the 600-wish snapshot cap.
  for(const w of world?.wishes||[]){const m=by.get(w.id)||{};by.set(w.id,{...m,semanticId:w.id,lineageId:w.lineageId,parentSemanticId:w.parentWishId,rootWishId:w.rootWishId,kind:w.kind,text:w.text,loc:w.locationText,state:w.state})}
  const viewed={...current,...by.get(current.semanticId)},seen=new Set([viewed.semanticId]),ancestors=[];
  let node=viewed,missing=false,invalid=false;
  while(node.parentSemanticId){
    if(seen.has(node.parentSemanticId)){invalid=true;break}
    const parent=by.get(node.parentSemanticId);
    if(!parent){missing=true;break}
    if(parent.lineageId!==viewed.lineageId){invalid=true;break}
    seen.add(parent.semanticId);ancestors.unshift(parent);node=parent;
  }
  const declared=by.get(viewed.rootWishId);
  const candidates=[...by.values()].filter(m=>m.lineageId===viewed.lineageId&&m.kind==='create'&&!m.parentSemanticId);
  const initial=viewed.kind==='create'&&!viewed.parentSemanticId?viewed:
    declared?.kind==='create'&&declared.lineageId===viewed.lineageId&&!declared.parentSemanticId?declared:
    !viewed.rootWishId&&candidates.length===1?candidates[0]:null;
  const parents=ancestors.filter(m=>m.semanticId!==initial?.semanticId&&m.semanticId!==viewed.semanticId);
  const children=[...by.values()].filter(m=>m.parentSemanticId===viewed.semanticId&&m.lineageId===viewed.lineageId&&m.semanticId!==viewed.semanticId);
  return{viewed,initial,parents,children,missing,invalid,navigable};
}
function counts(current,world){
  const record=world?.wishes?.find(w=>w.id===current.semanticId);
  const unavailable={value:null,limited:false};
  if(current.simulated||!record)return{support:{...unavailable},help:{...unavailable},suggest:{...unavailable}};
  const support={value:Number.isSafeInteger(record.encouragementCount)&&record.encouragementCount>=0?record.encouragementCount:null,limited:false};
  if(!Array.isArray(world.events))return{support,help:{...unavailable},suggest:{...unavailable}};
  const helps=new Set(),suggestions=new Set();
  for(const event of world.events){
    if(event.type==='help'&&event.wishId===current.semanticId&&(event.payload?.proposalId||event.id))helps.add(event.payload?.proposalId||event.id);
    // One accepted proposal can create several split nodes. Owner-created
    // branches lack proposalId and must never count as someone’s suggestion.
    if(event.type==='split'&&event.parentWishId===current.semanticId&&event.payload?.proposalId)suggestions.add(event.payload.proposalId);
  }
  const limited=world.events.length>=EVENT_LIMIT;
  return{support,help:{value:limited&&!helps.size?null:helps.size,limited},suggest:{value:limited&&!suggestions.size?null:suggestions.size,limited}};
}
function countLabel(metric,key,lang,simulated){
  const t=copy(lang);
  if(metric.value===null)return simulated?t.simulation:t.unavailable+' · '+t[key]+(metric.limited?'. '+t.limit:'');
  const singular=lang==='en'?{support:'support received',help:'accepted offer of help',suggest:'accepted branch suggestion'}:{support:'soutien reçu',help:'aide acceptée',suggest:'suggestion de branche acceptée'};
  return (metric.limited?t.atLeast:'')+metric.value+' '+(metric.value===1?singular[key]:t[key])+(metric.limited?'. '+t.limit:'');
}
function facts(current,world,lang,status){
  const t=copy(lang),record=world?.wishes?.find(w=>w.id===current.semanticId),date=Number(record?.createdAt);
  const location=record?.locationText||current.loc||'';
  const validDate=!current.simulated&&Number.isFinite(date)&&date>0&&!Number.isNaN(new Date(date).getTime());
  const dateHtml=validDate?'<time datetime="'+esc(new Date(date).toISOString())+'" title="'+esc(new Intl.DateTimeFormat(lang==='en'?'en-GB':'fr-FR',{dateStyle:'long'}).format(date))+'">'+esc(new Intl.DateTimeFormat(lang==='en'?'en-GB':'fr-FR',{day:'numeric',month:'short'}).format(date))+'</time>':'<span class="pa-date-unavailable">'+esc(t.dateUnavailable)+'</span>';
  return '<div class="pa-context-facts"><span class="pa-wish-status pa-state-'+esc(current.state||'alive')+'">'+esc(status)+'</span>'+(location?'<span class="pa-fact-sep" aria-hidden="true">·</span><span class="pa-context-location" title="'+esc(location)+'">'+esc(location)+'</span>':'')+'<span class="pa-fact-sep" aria-hidden="true">·</span>'+dateHtml+'</div>';
}
function render({current,semantic,world,lang,status}){
  const t=copy(lang),c=context(current,semantic,world),id=current.semanticId;
  function title(m,role,depth){
    const active=m.semanticId===id,kind=t[m.kind]||t.unknown;
    const clickable=c.navigable.has(m.semanticId),tag=clickable?'button':'div';
    return '<'+tag+(clickable?' type="button"':'')+' data-context-wish="'+esc(m.semanticId)+'" class="pa-context-title pa-context-'+role+(active?' pa-context-current':'')+'"'+(clickable?' data-nav-wish="'+esc(m.semanticId)+'"':'')+' style="--pa-depth:'+depth+'"'+(active?' aria-current="page" aria-describedby="pa-current-annotation"':'')+'><b class="pa-context-text'+(active?' wish pa-current-text':'')+'">'+esc(m.text)+'</b> <small class="pa-context-kind">('+esc(kind)+')</small></'+tag+'>'; 
  }
  let html='<nav class="pa-context-heading" aria-label="'+esc(t.path)+'">';
  html+=c.initial?title(c.initial,'root',0):'<div class="pa-context-root pa-context-missing">'+esc(t.missingRoot)+'</div>';
  if(c.missing||c.invalid)html+='<p class="pa-context-gap">'+esc(c.invalid?t.invalidPath:t.missingParent)+'</p>';
  html+=c.parents.map((m,i)=>title(m,'parent',i+1)).join('');
  if(c.initial?.semanticId!==id)html+=title(c.viewed,'viewed',c.parents.length+1);
  html+='<span class="pa-sr-only" id="pa-current-annotation">'+esc(t.current)+'</span></nav>';
  html+=facts(current,world,lang,status);
  // Example provenance is retained internally and in exported media.
  // The approved disclosure is shown once in the About panel.
  if(c.children.length)html+='<nav class="pa-context-children" aria-label="'+esc(t.children)+'">'+c.children.map(m=>title(m,'child',1)).join('')+'</nav>';
  return html;
}
return{context,counts,countLabel,facts,render,copy,EVENT_LIMIT};
});
