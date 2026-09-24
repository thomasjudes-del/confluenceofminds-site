(function(){
'use strict';

document.title='RALUVAAA · Experience V29';

function glyph(path, extra=''){
  return '<svg class="v29-gesture" viewBox="0 0 96 96" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">'+extra+path+'</svg>';
}
function smallGlyph(path){
  return '<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">'+path+'</svg>';
}

const GESTURES={
  evolve:glyph(
    '<path d="M20 75C29 64 35 50 39 34C42 22 48 16 57 11" stroke-width="4"/>'+
    '<path d="M56 11C64 10 70 7 75 3" stroke-width="2.8" opacity=".62"/>'+
    '<path d="M58 14C65 18 71 20 78 20" stroke-width="2.8" opacity=".45"/>'+
    '<circle cx="20" cy="75" r="5" stroke-width="3"/>'+
    '<circle cx="57" cy="11" r="4.5" stroke-width="3"/>'+
    '<path d="M39 34C31 33 26 29 22 23" stroke-width="2.4" opacity=".52"/>'+
    '<path d="M39 34C46 32 51 28 55 22" stroke-width="2.4" opacity=".46"/>'
  ),
  split:glyph(
    '<path d="M48 80C48 62 47 47 47 31" stroke-width="4"/>'+
    '<path d="M47 42C38 34 30 28 20 23" stroke-width="3.4"/>'+
    '<path d="M47 42C57 33 65 26 77 20" stroke-width="3.4"/>'+
    '<circle cx="48" cy="80" r="5" stroke-width="3"/>'+
    '<circle cx="20" cy="23" r="4.5" stroke-width="3"/>'+
    '<circle cx="77" cy="20" r="4.5" stroke-width="3"/>'+
    '<path d="M20 23C16 17 13 12 12 8M77 20C82 15 85 10 87 5" stroke-width="2.2" opacity=".48"/>'
  ),
  branch:null,
  bloom:glyph(
    '<path d="M48 82C47 67 47 53 48 40" stroke-width="4"/>'+
    '<path d="M47 62C37 58 31 52 28 44" stroke-width="2.6" opacity=".48"/>'+
    '<path d="M48 40C38 35 32 27 34 19C43 19 48 25 48 34" stroke-width="2.8"/>'+
    '<path d="M48 40C58 34 65 26 63 18C54 18 49 24 48 34" stroke-width="2.8"/>'+
    '<path d="M48 38C42 29 42 18 48 11C54 18 54 29 48 38" stroke-width="2.8"/>'+
    '<path d="M48 39C39 40 31 37 27 31C34 25 43 28 48 36" stroke-width="2.6" opacity=".78"/>'+
    '<path d="M48 39C57 40 65 37 69 31C62 25 53 28 48 36" stroke-width="2.6" opacity=".78"/>'+
    '<circle cx="48" cy="39" r="4" stroke-width="2.4"/>'
  ),
  encourage:glyph(
    '<circle cx="48" cy="49" r="10" stroke-width="3"/>'+
    '<path d="M48 16V27M48 71V82M15 49H26M70 49H81M25 26L33 34M63 64L71 72M71 26L63 34M33 64L25 72" stroke-width="3" opacity=".72"/>'+
    '<path d="M36 52C40 57 44 60 48 62C53 59 57 55 60 50" stroke-width="2.6" opacity=".56"/>'
  ),
  help:glyph(
    '<path d="M21 55C30 47 37 48 44 55L48 59L52 55C59 48 66 47 75 55" stroke-width="3.6"/>'+
    '<path d="M24 56C28 68 37 77 48 82C59 77 68 68 72 56" stroke-width="3.2"/>'+
    '<path d="M48 17V40M37 29H59" stroke-width="3.2" opacity=".72"/>'
  ),
  suggest:glyph(
    '<path d="M21 75C31 58 43 45 66 27" stroke-width="3.5"/>'+
    '<path d="M58 27H69V38" stroke-width="3"/>'+
    '<path d="M28 64C24 55 22 47 24 38" stroke-width="2.4" opacity=".45"/>'+
    '<circle cx="21" cy="75" r="4.5" stroke-width="3"/>'
  ),
  resume:glyph(
    '<path d="M25 77C35 65 42 51 46 35C49 24 55 17 65 13" stroke-width="4"/>'+
    '<path d="M43 44C34 42 28 36 24 29" stroke-width="2.6" opacity=".42"/>'+
    '<path d="M65 13C59 23 59 31 64 38C73 34 77 26 76 17C72 14 68 13 65 13Z" stroke-width="2.8"/>'+
    '<circle cx="25" cy="77" r="5" stroke-width="3"/>'
  )
};
GESTURES.branch=GESTURES.split;

const SECONDARY={
  focus:smallGlyph('<circle cx="16" cy="16" r="4"/><path d="M4 16C7 10 11 7 16 7S25 10 28 16C25 22 21 25 16 25S7 22 4 16"/>'),
  correct:smallGlyph('<path d="M7 24l5-1 12-12-4-4L8 19l-1 5z"/><path d="M18 9l4 4"/>'),
  reattach:smallGlyph('<path d="M8 27C14 20 17 14 17 5"/><path d="M17 14C22 14 25 11 28 7"/><path d="M24 7h4v4"/>'),
  connect:smallGlyph('<path d="M12 20l8-8"/><path d="M10 22l-2 2a4 4 0 01-6-6l5-5a4 4 0 016 0"/><path d="M22 10l2-2a4 4 0 016 6l-5 5a4 4 0 01-6 0"/>'),
  close_lineage:smallGlyph('<path d="M8 25C14 19 18 12 22 5"/><path d="M13 17C9 16 6 13 5 10"/><path d="M19 10C24 10 27 8 29 5"/>'),
  abandon:smallGlyph('<path d="M8 25C14 19 18 12 22 5"/><path d="M13 17C9 16 6 13 5 10"/><path d="M19 10C24 10 27 8 29 5"/>'),
  remove:smallGlyph('<path d="M8 8l16 16M24 8L8 24"/>'),
  share:smallGlyph('<circle cx="8" cy="16" r="3"/><circle cx="24" cy="8" r="3"/><circle cx="24" cy="24" r="3"/><path d="M11 15l10-5M11 17l10 5"/>'),
  report:smallGlyph('<path d="M8 27V5M9 6h14l-3 6 3 6H9"/>'),
  resume_lineage:smallGlyph('<path d="M8 25C14 19 18 12 22 5"/><path d="M19 5C16 11 17 16 21 19C26 17 28 13 27 8C24 6 21 5 19 5Z"/>')
};

const FR={
  evolve:'Prolonger',split:'Embrancher',branch:'Ajouter un embranchement',bloom:'Faire fleurir',
  encourage:'Encourager',help:'Aider',suggest:'Proposer une piste',resume:'Réveiller',resume_lineage:'Réveiller le wish',
  focus:'Voir la lignée',correct:'Corriger',reattach:'Greffer ailleurs',connect:'Relier',close_lineage:'Clore le wish',
  abandon:'Laisser cette branche',remove:'Effacer cette erreur',share:'Partager',report:'Signaler'
};
const EN={
  evolve:'Continue',split:'Branch',branch:'Add a branch',bloom:'Bloom',
  encourage:'Encourage',help:'Help',suggest:'Suggest a path',resume:'Revive',resume_lineage:'Revive wish',
  focus:'See lineage',correct:'Correct',reattach:'Graft elsewhere',connect:'Connect',close_lineage:'Close wish',
  abandon:'Let this branch go',remove:'Remove this mistake',share:'Share',report:'Report'
};

function isEn(){
  return (document.querySelector('.lang button.active')?.dataset.lang||document.documentElement.lang||'fr').startsWith('en');
}
function labelFor(act){
  return (isEn()?EN:FR)[act]||act;
}
function moreMark(){
  return '<svg class="v29-more-mark" viewBox="0 0 32 32" aria-hidden="true" fill="currentColor"><circle cx="7" cy="16" r="2.1"/><circle cx="16" cy="16" r="2.1"/><circle cx="25" cy="16" r="2.1"/></svg>';
}
function branchMark(){
  return '<span class="v29-branch-mark"><svg viewBox="0 0 24 34" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M7 30C10 23 11 16 11 6"/><path d="M11 17C15 13 18 10 22 8"/><circle cx="7" cy="30" r="1.7"/><circle cx="11" cy="6" r="1.7"/><circle cx="22" cy="8" r="1.7"/></svg></span>';
}

function decoratePrimary(){
  document.querySelectorAll('#drawerBody .action-grid button[data-act]').forEach(b=>{
    const act=b.dataset.act;
    const art=GESTURES[act];
    if(!art)return;
    const sig=act+'|'+(isEn()?'en':'fr');
    if(b.dataset.v29Glyph===sig)return;
    const label=labelFor(act);
    b.dataset.v29Glyph=sig;
    b.setAttribute('aria-label',label);
    b.title=label;
    b.innerHTML=art+'<span class="v29-action-name">'+label+'</span>';
  });
}

function decorateSecondary(){
  const details=document.querySelector('#drawerBody details.more');
  if(!details)return;
  const summary=details.querySelector(':scope > summary');
  if(summary){
    summary.innerHTML=moreMark();
    summary.setAttribute('aria-label',isEn()?'More actions':'Autres actions');
    summary.title=summary.getAttribute('aria-label');
  }
  details.querySelectorAll('.more-grid button[data-act]').forEach(b=>{
    const act=b.dataset.act,label=labelFor(act);
    const icon=SECONDARY[act]||smallGlyph('<circle cx="16" cy="16" r="5"/><circle cx="16" cy="16" r="11" opacity=".45"/>');
    const sig=act+'|'+(isEn()?'en':'fr');
    if(b.dataset.v29Secondary===sig)return;
    b.dataset.v29Secondary=sig;
    b.setAttribute('aria-label',label);
    b.title=label;
    b.innerHTML='<span class="v29-secondary-icon">'+icon+'</span><span class="v29-secondary-label">'+label+'</span>';
  });
}

function decorateBranches(){
  document.querySelectorAll('#drawerBody .wish-nav button:not(.wish-nav-parent)').forEach(b=>{
    if(!b.querySelector('.v29-branch-mark'))b.insertAdjacentHTML('afterbegin',branchMark());
  });
}

function decorateLineage(){
  const back=document.querySelector('#drawerBody .v28-back');
  if(back){
    back.textContent='←';
    back.setAttribute('aria-label',isEn()?'Back to parent':'Retour au wish parent');
    back.title=back.getAttribute('aria-label');
  }
  const root=document.querySelector('#drawerBody .v28-root span');
  if(root)root.textContent=isEn()?'Root wish':'Wish racine';
}

function decorateDrawer(){
  const drawer=document.getElementById('drawer');
  const wish=document.querySelector('#drawerBody>.wish');
  if(!drawer)return;
  drawer.classList.toggle('v29-wish-view',!!wish);
  if(!wish)return;
  decorateLineage();
  decorateBranches();
  decoratePrimary();
  decorateSecondary();
}

let queued=false;
function schedule(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{
    queued=false;
    try{window.__RALUVAAA_V28__?.decorate?.()}catch{}
    document.title='RALUVAAA · Experience V29';
    decorateDrawer();
  });
}

const observer=new MutationObserver(schedule);
observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','open']});
document.addEventListener('click',e=>{
  if(e.target.closest('.lang button,[data-nav-wish],.v28-back,.v28-root,summary'))schedule();
},true);

schedule();

window.__RALUVAAA_V29__={
  version:29,
  decorate:decorateDrawer
};
})();