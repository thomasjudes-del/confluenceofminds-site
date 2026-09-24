(function(){
'use strict';

const ICONS={
  seed:'<svg class="v34-icon" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M18 47c0-11 7-19 17-22 4 9 2 18-4 24-5 5-10 7-13 5-2-1-2-3 0-7Z" fill="currentColor" stroke="none"/><path d="M29 43c3-9 7-18 14-25" stroke-width="4"/><path d="M41 20c3-6 9-8 15-7-1 6-5 11-12 12" fill="currentColor" stroke="none"/></svg>',
  create:'<svg class="v34-icon" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M11 48c0-11 7-18 17-21 4 8 2 17-4 23-5 5-10 7-13 5-2-1-2-3 0-7Z" fill="currentColor" stroke="none"/><path d="M23 44c3-10 8-20 15-27" stroke-width="4"/><path d="M37 20c3-6 9-8 15-7-1 6-5 11-12 12" fill="currentColor" stroke="none"/><path d="M49 35v16M41 43h16" stroke-width="4.4"/></svg>',
  myWishes:'<svg class="v34-icon" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M8 51h48" stroke-width="4"/><path d="M16 50V37M30 50V28M44 50V34M54 50V40" stroke-width="3.8"/><path d="M16 39c-7-1-9-5-9-9 6-1 10 2 11 7M30 31c-7-1-10-5-10-10 7-1 11 2 12 8M30 35c7-1 10-5 10-10-7-1-11 2-12 8M44 37c-6-1-9-4-9-9 6-1 10 2 11 7M54 42c-5-1-8-4-8-8 5-1 8 1 10 6" fill="currentColor" stroke="none"/></svg>',
  encourage:'<svg class="v34-icon" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="48" cy="15" r="6" fill="currentColor" stroke="none"/><path d="M48 3v5M48 22v5M36 15h5M55 15h6M39 6l4 4M56 6l-4 4M39 24l4-4M56 24l-4-4" stroke-width="3.2"/><path d="M25 52V32" stroke-width="4"/><path d="M25 37c-8-1-12-5-12-11 8-1 13 3 14 9M25 33c7-1 12-5 13-11-8-1-13 3-14 9" fill="currentColor" stroke="none"/><path d="M14 53c8-3 16-3 24 0" stroke-width="4"/></svg>',
  help:'<svg class="v34-icon" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M31 40V23" stroke-width="4"/><path d="M31 28c-8-1-12-5-12-11 8-1 13 3 14 9M31 25c7-1 12-5 13-11-8-1-13 3-14 9" fill="currentColor" stroke="none"/><path d="M6 39c8-3 15 0 22 8 2 2 5 2 8 0 7-8 14-11 22-8" stroke-width="4"/><path d="M8 42c5 9 12 14 24 17M56 42c-5 9-12 14-24 17" stroke-width="4"/></svg>',
  letgo:'<svg class="v34-icon" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M32 33V18" stroke-width="4"/><path d="M32 22c-7-1-11-5-11-10 7-1 12 3 13 8M32 20c6-1 10-4 11-9-6-1-10 2-12 7" fill="currentColor" stroke="none"/><path d="M8 38h48v15H8z" stroke-width="4"/><path d="M10 42l10 4 6-4 8 5 7-5 13 4M23 53l4-7M40 53l-4-6" stroke-width="3.2"/></svg>',
  explore:'<svg class="v34-icon" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="30" cy="30" r="20" stroke-width="4"/><path d="M10 30h40M30 10c7 6 10 13 10 20s-3 14-10 20M30 10c-7 6-10 13-10 20s3 14 10 20M30 10v40" stroke-width="3"/><path d="M39 46c2-10 8-17 18-19-1 10-7 17-17 20" fill="currentColor" stroke="none"/><path d="M39 47c5-5 10-9 16-12" stroke-width="3.6"/></svg>',
  evolve:'<svg class="v34-icon" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M17 55c7-7 12-15 15-25 3-10 7-16 15-22" stroke-width="4.2"/><path d="M32 34c-8-1-13-5-15-11 8-2 14 2 17 9M39 20c8 0 13-3 17-9-8-2-14 1-18 7" fill="currentColor" stroke="none"/><circle cx="17" cy="55" r="3.5" fill="currentColor" stroke="none"/></svg>',
  branch:'<svg class="v34-icon" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M32 55V31M32 34c-5-8-11-13-19-17M32 34c6-9 13-15 22-19" stroke-width="4.2"/><path d="M13 17c6-2 11 1 14 7-7 2-12-1-14-7ZM54 15c-6-2-11 1-14 7 7 2 12-1 14-7Z" fill="currentColor" stroke="none"/><circle cx="32" cy="55" r="3.5" fill="currentColor" stroke="none"/></svg>',
  bloom:'<svg class="v34-icon" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M32 56V35" stroke-width="4"/><path d="M32 40c-8-1-12-5-13-11 8-1 13 3 15 9" fill="currentColor" stroke="none"/><circle cx="32" cy="23" r="5" fill="currentColor" stroke="none"/><path d="M32 7c5 4 7 8 5 13-4 2-7 1-10-2-1-5 1-8 5-11ZM48 17c0 6-2 10-7 12-4-1-6-4-6-8 3-4 7-5 13-4ZM44 34c-5 4-10 5-14 2-2-4-1-7 2-10 5-1 9 2 12 8ZM20 34c5 4 10 5 14 2 2-4 1-7-2-10-5-1-9 2-12 8ZM16 17c0 6 2 10 7 12 4-1 6-4 6-8-3-4-7-5-13-4Z" fill="currentColor" stroke="none"/></svg>',
  graft:'<svg class="v34-icon" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M19 55c8-10 13-21 14-34M46 10c-4 8-9 14-16 19M31 31c7 4 12 10 15 18" stroke-width="4"/><path d="M26 29h12v8H26z" fill="currentColor" stroke="none"/><path d="M46 10c5-2 9-1 12 3-3 5-7 7-13 6M46 49c5-1 9 1 12 5-5 4-10 4-15 0" fill="currentColor" stroke="none"/></svg>',
  recenter:'<svg class="v34-icon" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="32" r="19" stroke-width="4"/><circle cx="32" cy="32" r="7" fill="currentColor" stroke="none"/><path d="M32 5v8M32 51v8M5 32h8M51 32h8" stroke-width="4"/></svg>',
  modify:'<svg class="v34-icon" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M14 50c3-12 10-22 21-30" stroke-width="4"/><path d="M34 21c8-3 14-1 18 5-5 7-12 9-20 5" fill="currentColor" stroke="none"/><path d="M17 48l-3 9 9-3 26-26-6-6Z" stroke-width="3.6"/></svg>',
  share:'<svg class="v34-icon" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="17" cy="33" r="5" fill="currentColor" stroke="none"/><circle cx="48" cy="17" r="5" fill="currentColor" stroke="none"/><circle cx="48" cy="49" r="5" fill="currentColor" stroke="none"/><path d="M22 31l21-11M22 36l21 10" stroke-width="4"/></svg>',
  suggest:'<svg class="v34-icon" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M15 54c5-13 11-23 18-31M33 23c6-6 12-9 19-11M33 23c5 2 10 6 14 12" stroke-width="4"/><path d="M47 8l7 4-5 7M45 31l4 6-7 3" stroke-width="3.6"/></svg>',
  revive:'<svg class="v34-icon" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M17 49c0-9 6-16 15-19 4 7 3 14-2 19-4 4-9 6-12 4-2-1-2-2-1-4Z" fill="currentColor" stroke="none"/><path d="M29 45c3-9 8-17 15-23" stroke-width="4"/><path d="M43 24c3-6 9-8 14-7-1 6-5 10-11 11" fill="currentColor" stroke="none"/><path d="M12 21c3-5 7-8 12-10M9 30c2-2 4-4 7-5" stroke-width="3"/></svg>',
  report:'<svg class="v34-icon" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M17 57V9" stroke-width="4"/><path d="M19 11h30l-6 10 6 10H19z" fill="currentColor" stroke="none"/></svg>'
};

function normalized(value){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
}

function semanticFor(label){
  const s=normalized(label);
  if(!s)return null;
  if(s.includes('prolong')||s.includes('continue'))return 'evolve';
  if(s.includes('embranch')||s==='branch'||s.includes('brancher'))return 'branch';
  if(s.includes('fleur')||s.includes('bloom'))return 'bloom';
  if(s.includes('soutien')||s.includes('soutenir')||s==='support')return 'encourage';
  if(s.includes("proposer de l'aide")||s.includes('offer help')||s==='help')return 'help';
  if(s.includes('greffer')||s.includes('graft'))return 'graft';
  if(s.includes('recentr')||s.includes('recenter'))return 'recenter';
  if(s.includes('modifier')||s.includes('modify'))return 'modify';
  if(s.includes('partager')||s.includes('share'))return 'share';
  if(s.includes('proposer une piste')||s.includes('suggest a path'))return 'suggest';
  if(s.includes('laisser ce wish')||s.includes('laisser cette branche')||s.includes('let this'))return 'letgo';
  if(s.includes('reveiller')||s.includes('revive'))return 'revive';
  if(s.includes('signaler')||s.includes('report'))return 'report';
  return null;
}

function decorateRail(){
  const my=document.getElementById('myWorldBtn');
  if(my){
    my.innerHTML='<span class="v33-rail-icon v34-rail-icon">'+ICONS.myWishes+'</span>';
    my.dataset.v34Icon='myWishes';
  }
  const create=document.getElementById('createBtn');
  if(create){
    create.innerHTML='<span class="v33-rail-icon v34-rail-icon">'+ICONS.create+'</span>';
    create.dataset.v34Icon='create';
  }
}

function decorateRoot(){
  document.querySelectorAll('#drawerBody .v33-root-seed').forEach(holder=>{
    if(holder.dataset.v34Icon==='seed')return;
    holder.dataset.v34Icon='seed';
    holder.innerHTML=ICONS.seed;
  });
}

function decorateDeck(){
  document.querySelectorAll('#drawerBody .v33-action-circle').forEach(button=>{
    const semantic=semanticFor(button.getAttribute('aria-label')||button.title||'');
    if(!semantic||!ICONS[semantic])return;
    if(button.dataset.v34Icon===semantic&&button.querySelector('.v34-icon'))return;
    button.dataset.v34Icon=semantic;
    const unit=button.closest('.v33-action-unit');
    if(unit)unit.dataset.v34Icon=semantic;
    button.innerHTML=ICONS[semantic];
  });
}

function decorate(){
  document.title='RALUVAAA · Experience V34';
  const sub=document.querySelector('#brand .sub');
  if(sub)sub.textContent='EXPERIENCE V34';
  decorateRail();
  decorateRoot();
  decorateDeck();
}

let queued=false;
function schedule(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{
    queued=false;
    decorate();
  });
}

const observer=new MutationObserver(schedule);
observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-label','title','disabled','data-sig']});
document.addEventListener('click',event=>{
  if(event.target.closest('.lang button,[data-panel],[data-nav-wish],.v28-back,.v28-root,#drawerClose'))setTimeout(schedule,0);
},true);

decorate();
setTimeout(decorate,80);
window.__RALUVAAA_V34__={version:34,decorate,icons:ICONS,semanticFor};
})();