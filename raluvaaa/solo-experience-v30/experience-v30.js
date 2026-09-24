(function(){
'use strict';

const UI=()=>window.__RALUVAAA_UI__;
const body=()=>document.getElementById('drawerBody');
const lang=()=>((document.querySelector('.lang button.active')?.dataset.lang||document.documentElement.lang||'fr').startsWith('en')?'en':'fr');

const SEED='<svg class="v30-seed" viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M20 31C17 24 17 18 20 12C23 18 23 24 20 31Z" stroke-width="2"/><path d="M20 18C15 15 12 11 12 7C17 7 20 10 20 15" stroke-width="1.7" opacity=".75"/><path d="M20 19C25 16 28 12 28 8C23 8 20 11 20 16" stroke-width="1.7" opacity=".75"/><path d="M20 31V35" stroke-width="2"/><circle cx="20" cy="34.5" r="2.2" fill="currentColor" stroke="none"/></svg>';
const WORLD='<svg class="v30-world" viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="20" cy="20" r="3" stroke-width="1.9"/><path d="M20 17C17 12 14 9 10 8M23 19C28 16 31 13 33 9M18 23C14 26 11 29 9 33M22 23C26 27 29 30 33 32" stroke-width="1.7"/><circle cx="10" cy="8" r="2.1"/><circle cx="33" cy="9" r="2.1"/><circle cx="9" cy="33" r="2.1"/><circle cx="33" cy="32" r="2.1"/></svg>';
const BACK='<svg class="v30-back-icon" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 8L12 16L20 24"/><path d="M12 16H26"/></svg>';

function bigGlyph(kind){
  if(kind==='evolve')return '<svg class="v29-gesture" viewBox="0 0 96 96" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M20 75C29 64 35 50 39 34C42 22 48 16 57 11" stroke-width="4"/><path d="M56 11C64 10 70 7 75 3" stroke-width="2.8" opacity=".62"/><path d="M58 14C65 18 71 20 78 20" stroke-width="2.8" opacity=".45"/><circle cx="20" cy="75" r="5" stroke-width="3"/><circle cx="57" cy="11" r="4.5" stroke-width="3"/><path d="M39 34C31 33 26 29 22 23" stroke-width="2.4" opacity=".52"/></svg>';
  if(kind==='split'||kind==='branch')return '<svg class="v29-gesture" viewBox="0 0 96 96" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M48 80C48 62 47 47 47 31" stroke-width="4"/><path d="M47 42C38 34 30 28 20 23" stroke-width="3.4"/><path d="M47 42C57 33 65 26 77 20" stroke-width="3.4"/><circle cx="48" cy="80" r="5" stroke-width="3"/><circle cx="20" cy="23" r="4.5" stroke-width="3"/><circle cx="77" cy="20" r="4.5" stroke-width="3"/><path d="M20 23C16 17 13 12 12 8M77 20C82 15 85 10 87 5" stroke-width="2.2" opacity=".48"/></svg>';
  if(kind==='bloom')return '<svg class="v29-gesture" viewBox="0 0 96 96" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M48 82C47 67 47 53 48 40" stroke-width="4"/><path d="M47 62C37 58 31 52 28 44" stroke-width="2.6" opacity=".48"/><path d="M48 40C38 35 32 27 34 19C43 19 48 25 48 34" stroke-width="2.8"/><path d="M48 40C58 34 65 26 63 18C54 18 49 24 48 34" stroke-width="2.8"/><path d="M48 38C42 29 42 18 48 11C54 18 54 29 48 38" stroke-width="2.8"/><path d="M48 39C39 40 31 37 27 31C34 25 43 28 48 36" stroke-width="2.6" opacity=".78"/><path d="M48 39C57 40 65 37 69 31C62 25 53 28 48 36" stroke-width="2.6" opacity=".78"/><circle cx="48" cy="39" r="4" stroke-width="2.4"/></svg>';
  return null;
}

function icon(kind){
  const m={
    recenter:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="16" cy="16" r="4"/><circle cx="16" cy="16" r="10" opacity=".55"/><path d="M16 2v5M16 25v5M2 16h5M25 16h5"/></svg>',
    modify:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 24l5-1 12-12-4-4L8 19l-1 5z"/><path d="M18 9l4 4"/></svg>',
    graft:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M7 28C12 22 14 16 14 7"/><path d="M14 18C18 14 22 11 27 9"/><path d="M20 14C23 16 25 19 26 23"/><circle cx="7" cy="28" r="2"/><circle cx="14" cy="7" r="2"/><circle cx="27" cy="9" r="2"/></svg>',
    share:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="8" cy="16" r="2.6"/><circle cx="24" cy="8" r="2.6"/><circle cx="24" cy="24" r="2.6"/><path d="M10.5 15l11-5.5M10.5 17l11 5.5"/></svg>',
    support:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="16" cy="16" r="4"/><path d="M16 4v5M16 23v5M4 16h5M23 16h5M7.5 7.5l3.5 3.5M21 21l3.5 3.5M24.5 7.5L21 11M11 21l-3.5 3.5" opacity=".72"/></svg>',
    help:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 19c4-4 7-4 10 0l1.5 1.5L19 19c3-4 6-4 10 0"/><path d="M8 20c2 5 5 8 9.5 10C22 28 25 25 27 20"/><path d="M17 5v9M12.5 9.5h9"/></svg>',
    suggest:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M7 27C11 19 17 13 25 7"/><path d="M19 7h6v6"/><path d="M10 21C7 18 6 15 6 11" opacity=".5"/></svg>',
    letgo:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M8 26C13 20 17 14 20 6"/><path d="M13 18C9 17 7 14 6 11M18 11C23 11 26 9 28 6"/><path d="M22 22c2 2 3 4 3 6" opacity=".5"/></svg>',
    revive:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M10 27C14 22 17 16 18 9"/><path d="M18 13c4-5 8-6 11-5-1 5-4 8-9 9"/><circle cx="10" cy="27" r="2"/></svg>',
    report:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M8 28V5M9 6h14l-3 6 3 6H9"/></svg>'
  };
  return m[kind]||m.recenter;
}

const LABELS={
  en:{recenter:'Recenter',modify:'Modify',graft:'Graft',share:'Share',support:'Support',help:'Offer help',suggest:'Suggest a path',letgo:'Let this branch go',letwish:'Let this wish go',revive:'Revive',report:'Report',root:'Root wish',back:'Back to parent',release:'Release a wish',my:'My wishes'},
  fr:{recenter:'Recentrer',modify:'Modifier',graft:'Greffer',share:'Partager',support:'Soutenir',help:"Proposer de l'aide",suggest:'Proposer une piste',letgo:'Laisser cette branche',letwish:'Laisser ce wish',revive:'Réveiller',report:'Signaler',root:'Wish racine',back:'Retour au parent',release:'Déposer un wish',my:'Mes wishes'}
};
function L(k){return LABELS[lang()][k]||k}

function decorateRail(){
  const create=document.getElementById('createBtn');
  if(create&&create.dataset.v30!=='1'){
    create.dataset.v30='1';
    create.innerHTML=SEED;
  }
  if(create){create.setAttribute('aria-label',L('release'));create.title=L('release')}
  const my=document.getElementById('myWorldBtn');
  if(my&&my.dataset.v30!=='1'){
    my.dataset.v30='1';
    my.innerHTML=WORLD;
  }
  if(my){my.setAttribute('aria-label',L('my'));my.title=L('my')}
}

function decorateLineage(){
  const back=document.querySelector('#drawerBody .v28-back');
  if(back){
    if(back.dataset.v30!=='1'){back.dataset.v30='1';back.innerHTML=BACK}
    back.setAttribute('aria-label',L('back'));back.title=L('back');
  }
  const root=document.querySelector('#drawerBody .v28-root');
  if(root){
    root.dataset.v30='1';
    root.innerHTML=SEED+'<span>'+L('root')+'</span>';
    root.setAttribute('aria-label',L('root'));root.title=L('root');
  }
}

function decoratePrimary(){
  document.querySelectorAll('#drawerBody .action-grid button[data-act]').forEach(b=>{
    const act=b.dataset.act,art=bigGlyph(act);
    if(!art)return;
    const sig=act+'|v30';
    if(b.dataset.v30Primary===sig)return;
    b.dataset.v30Primary=sig;
    const a11y=act==='evolve'?(lang()==='en'?'Continue':'Prolonger'):(act==='bloom'?(lang()==='en'?'Bloom':'Fleurir'):(lang()==='en'?'Branch':'Embrancher'));
    b.innerHTML=art+'<span class="v29-action-name">'+a11y+'</span>';
    b.setAttribute('aria-label',a11y);b.title=a11y;
  });
}

function actionButton(kind,map,disabled=false){
  const b=document.createElement('button');
  b.type='button';
  b.className='v30-action';
  b.dataset.v30Act=kind;
  b.disabled=!!disabled;
  b.innerHTML='<span class="v30-action-icon">'+icon(kind)+'</span><span class="v30-action-label">'+L(kind)+'</span>';
  b.onclick=()=>UI()?.action(map);
  return b;
}

function buildActionSurface(){
  const d=body(),cur=UI()?.current?.();
  if(!d||!cur||!d.querySelector('.wish'))return;
  let surface=d.querySelector('.v30-action-surface');
  const helperDisabled=!!d.querySelector('.action-grid [data-act="encourage"]:disabled');
  const sig=[cur.semanticId,cur.owner?'owner':'helper',cur.state,cur.kind,helperDisabled,lang()].join('|');
  if(surface?.dataset.sig===sig)return;
  if(surface)surface.remove();
  surface=document.createElement('div');
  surface.className='v30-action-surface '+(cur.owner?'v30-owner':'v30-helper');
  surface.dataset.sig=sig;

  if(cur.owner){
    if(cur.state==='abandoned'){
      surface.append(actionButton('revive',cur.kind==='create'?'resume_lineage':'resume'));
    }
    surface.append(actionButton('recenter','focus'));
    surface.append(actionButton('modify','correct'));
    if(cur.state==='alive')surface.append(actionButton('graft','connect'));
    surface.append(actionButton('share','share'));
    if(cur.state==='alive'){
      const b=actionButton('letgo',cur.kind==='create'?'close_lineage':'abandon');
      b.querySelector('.v30-action-label').textContent=L(cur.kind==='create'?'letwish':'letgo');
      surface.append(b);
    }
  }else{
    if(cur.state==='alive'){
      surface.append(actionButton('support','encourage',helperDisabled));
      surface.append(actionButton('help','help'));
      surface.append(actionButton('graft','connect'));
      surface.append(actionButton('suggest','suggest'));
    }
    surface.append(actionButton('recenter','focus'));
    surface.append(actionButton('share','share'));
    if(!cur.simulated)surface.append(actionButton('report','report'));
  }
  d.appendChild(surface);
}

function hideLegacyMenu(){
  const details=document.querySelector('#drawerBody details.more');
  if(details)details.setAttribute('aria-hidden','true');
}

function decorate(){
  document.title='RALUVAAA · Experience V30';
  decorateRail();
  if(document.querySelector('#drawer:not(.hidden) #drawerBody .wish')){
    decorateLineage();
    decoratePrimary();
    hideLegacyMenu();
    buildActionSurface();
  }
}

let queued=false;
function schedule(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;decorate()});
}
const observer=new MutationObserver(schedule);
observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','disabled']});
document.addEventListener('click',e=>{
  if(e.target.closest('.lang button,[data-nav-wish],.v28-back,.v28-root,[data-panel]'))setTimeout(schedule,0);
},true);

decorate();
window.__RALUVAAA_V30__={version:30,decorate,seed:SEED};
})();