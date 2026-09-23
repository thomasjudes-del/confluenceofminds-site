(function(){
'use strict';

document.title='RALUVAAA · Solo Mobile V28';

const STORE=window.RALUVAAA_STORE_KEY||'raluvaaaSoloAlphaV1';
const CLOSE_AFTER=new Set([
  'create','evolve','split','branch_add','bloom','abandon','close_lineage',
  'resume','resume_lineage','reparent','correct','remove_mistake',
  'encourage','help','help_proposed','suggest_proposed','connect_proposed','connect',
  'proposal_response'
]);

const ROOT_ICON='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v9M12 12c-4 1-6 4-7 8M12 12c4 1 6 4 7 8M12 14c0 3-1 5-3 7M12 14c0 3 1 5 3 7"/></svg>';
const SHORT_FR={evolve:'Évoluer',split:'Ramifier',branch:'Ramifier',bloom:'Fleurir',focus:'Lignée',encourage:'Encourager',help:'Aider',suggest:'Proposer',connect:'Relier',share:'Partager',correct:'Corriger',reattach:'Greffer',abandon:'Laisser',close_lineage:'Clore',resume:'Reprendre',resume_lineage:'Reprendre',remove:'Effacer',report:'Signaler'};
const SHORT_EN={evolve:'Evolve',split:'Branch',branch:'Branch',bloom:'Bloom',focus:'Lineage',encourage:'Encourage',help:'Help',suggest:'Suggest',connect:'Connect',share:'Share',correct:'Correct',reattach:'Graft',abandon:'Let go',close_lineage:'Close',resume:'Resume',resume_lineage:'Resume',remove:'Remove',report:'Report'};

function lang(){
  return document.querySelector('.lang button.active')?.dataset.lang||document.documentElement.lang||'fr';
}
function semantic(){
  try{return window.__RV26_SOLO__?.semantic?.()||[]}catch{return[]}
}
function openSemantic(id){
  if(!id)return;
  try{window.__RV26_SOLO__?.open?.(id)}catch{}
}
function currentSemantic(){
  const api=semantic(),wish=document.querySelector('#drawerBody .wish');
  if(!wish||!api.length)return null;
  const text=wish.textContent.trim();
  const parentId=document.querySelector('#drawerBody .wish-nav-parent')?.dataset.navWish;
  if(parentId){
    const c=api.filter(x=>x.parentSemanticId===parentId&&x.text===text);
    if(c.length===1)return c[0];
  }
  const childId=document.querySelector('#drawerBody .wish-nav button:not(.wish-nav-parent)[data-nav-wish]')?.dataset.navWish;
  if(childId){
    const child=api.find(x=>x.semanticId===childId);
    if(child?.parentSemanticId){
      const cur=api.find(x=>x.semanticId===child.parentSemanticId);
      if(cur)return cur;
    }
  }
  const same=api.filter(x=>x.text===text);
  return same.length===1?same[0]:same.find(x=>x.owner)||same[0]||null;
}
function rootFor(cur,api){
  if(!cur)return null;
  const direct=api.find(x=>x.lineageId===cur.lineageId&&x.kind==='create');
  if(direct)return direct;
  let p=cur,guard=0;
  while(p?.parentSemanticId&&guard++<30){
    const n=api.find(x=>x.semanticId===p.parentSemanticId);
    if(!n)break;p=n;
  }
  return p||cur;
}
function ensureMore(){
  const body=document.getElementById('drawerBody');
  if(!body)return null;
  let details=body.querySelector('details.more');
  if(details)return details;
  details=document.createElement('details');
  details.className='more';
  details.innerHTML='<summary aria-label="Plus" title="Plus">•••</summary><div class="more-grid"></div>';
  body.appendChild(details);
  return details;
}
function buildLineageBar(){
  const body=document.getElementById('drawerBody');
  if(!body||!body.querySelector('.wish'))return;
  let bar=body.querySelector('.v28-lineage-bar');
  const api=semantic(),cur=currentSemantic();
  if(!cur)return;
  const parent=cur.parentSemanticId?api.find(x=>x.semanticId===cur.parentSemanticId):null;
  const root=rootFor(cur,api);
  if(!parent&&!root)return;
  const sig=[cur.semanticId,parent?.semanticId||'',root?.semanticId||'',lang()].join('|');
  if(bar?.dataset.sig===sig)return;
  if(bar)bar.remove();

  bar=document.createElement('div');
  bar.className='v28-lineage-bar';
  bar.dataset.sig=sig;

  if(parent){
    const back=document.createElement('button');
    back.className='v28-back';
    back.type='button';
    back.setAttribute('aria-label',lang().startsWith('en')?'Back to parent':'Retour au parent');
    back.title=back.getAttribute('aria-label');
    back.textContent='←';
    back.onclick=()=>openSemantic(parent.semanticId);
    bar.appendChild(back);
  }
  if(root&&root.semanticId!==cur.semanticId){
    const rb=document.createElement('button');
    rb.className='v28-root';
    rb.type='button';
    rb.setAttribute('aria-label',lang().startsWith('en')?'Back to root wish':'Retour au wish racine');
    rb.title=rb.getAttribute('aria-label');
    rb.innerHTML=ROOT_ICON+'<span>'+(lang().startsWith('en')?'Root':'Racine')+'</span>';
    rb.onclick=()=>openSemantic(root.semanticId);
    bar.appendChild(rb);
  }

  if(bar.childElementCount){
    const wish=body.querySelector('.wish');
    body.insertBefore(bar,wish);
  }
}
function simplifyActions(){
  const body=document.getElementById('drawerBody');
  if(!body)return;
  const map=lang().startsWith('en')?SHORT_EN:SHORT_FR;
  const grid=body.querySelector('.action-grid');
  if(grid){
    const focus=grid.querySelector('[data-act="focus"]');
    if(focus){
      const details=ensureMore(),mg=details?.querySelector('.more-grid');
      if(mg&&!mg.contains(focus))mg.prepend(focus);
    }
  }
  body.querySelectorAll('[data-act]').forEach(b=>{
    const act=b.dataset.act,label=map[act];
    if(!label)return;
    const span=b.querySelector('.v27-action-label');
    if(span)span.textContent=label;
    b.setAttribute('aria-label',label);
    b.title=label;
  });
}
function simplifyFragments(){
  document.querySelectorAll('#drawerBody .chip').forEach(c=>{
    if(!c.title)c.title=c.textContent.trim();
    if(!c.getAttribute('aria-label'))c.setAttribute('aria-label',c.textContent.trim());
  });
  const nav=document.querySelector('#drawerBody .wish-nav');
  if(nav){
    nav.setAttribute('aria-label',lang().startsWith('en')?'Branches':'Branches');
    nav.querySelectorAll('button:not(.wish-nav-parent)').forEach(b=>{
      const s=b.querySelector('span');
      if(s){const next=lang().startsWith('en')?'Branch':'Branche';if(s.textContent!==next)s.textContent=next;}
    });
  }
}
function decorate(){
  if(window.RALUVAAA_SOLO)document.title='RALUVAAA · Solo Mobile V28';
  if(document.querySelector('#drawer:not(.hidden) #drawerBody .wish')){
    buildLineageBar();
    simplifyActions();
    simplifyFragments();
  }
}

let queued=false;
const observer=new MutationObserver(()=>{
  if(queued)return;queued=true;
  requestAnimationFrame(()=>{queued=false;decorate()});
});
observer.observe(document.body,{subtree:true,childList:true});
document.addEventListener('click',e=>{
  if(e.target.closest('.lang button'))setTimeout(decorate,30);
},true);
decorate();

/* After a successful meaningful action, clear the UI so the consequence is seen in the world. */
let pendingClose=0;
const previousSet=Storage.prototype.setItem;
function closeWishSheet(){
  const drawer=document.getElementById('drawer');
  if(drawer&&!drawer.classList.contains('hidden'))document.getElementById('drawerClose')?.click();
}
Storage.prototype.setItem=function(key,value){
  let before=null;
  if(key===STORE){try{before=JSON.parse(this.getItem(key)||'null')}catch{}}
  previousSet.call(this,key,value);
  if(key!==STORE)return;
  let after=null;try{after=JSON.parse(value||'null')}catch{}
  const n=Array.isArray(before?.events)?before.events.length:0;
  const fresh=Array.isArray(after?.events)?after.events.slice(n):[];
  const visible=fresh.find(ev=>!ev.quiet&&CLOSE_AFTER.has(ev.type));
  if(!visible)return;
  const ticket=++pendingClose;
  /* The engine may refocus/reopen the selected wish after commit. Close only
     after its visual consequence begins, with a short fallback if no ritual fires. */
  setTimeout(()=>{
    if(pendingClose!==ticket)return;
    closeWishSheet();
    pendingClose=0;
  },780);
};

const ritualLayer=document.getElementById('ritualLayer');
if(ritualLayer){
  const ritualObserver=new MutationObserver(mutations=>{
    if(!pendingClose)return;
    const visual=mutations.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(
      n.matches?.('.rv-ring,.rv-seed,.rv-petal,.rv-bud,.rv-collapse,.rv-path')||
      n.querySelector?.('.rv-ring,.rv-seed,.rv-petal,.rv-bud,.rv-collapse,.rv-path')
    )));
    if(!visual)return;
    closeWishSheet();
    pendingClose=0;
  });
  ritualObserver.observe(ritualLayer,{childList:true,subtree:true});
}

window.__RALUVAAA_V28__={
  version:28,
  decorate,
  semantic,
  currentSemantic,
  openRoot(){
    const api=semantic(),cur=currentSemantic(),root=rootFor(cur,api);
    if(root)openSemantic(root.semanticId);
  }
};
})();