(function(){
'use strict';

const V33={
  seed:'<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M15.8 26C10.2 22.4 9.2 14.4 15.8 8.1C22.4 14.4 21.4 22.4 15.8 26Z" stroke-width="1.9"/><path d="M15.8 9C15.8 6.3 18 4.2 21.2 3.4" stroke-width="1.7"/><path d="M12.7 18.1C14.3 18.7 16.8 18.4 19.2 16.5" stroke-width="1.35" opacity=".55"/></svg>',
  wishes:'<svg viewBox="0 0 36 36" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M18 31V20M18 20C18 15 14.8 12.2 10.2 9.4M18 20C18 14.4 22 11.4 27.2 8.2M13.4 16.9C10.6 16.7 8 15.4 6 13.2M22.7 15.5C25.5 15.1 28.2 13.6 30.2 11.1M18 25.1C14.8 25.1 12.2 23.7 10.1 21.7M18 25.1C21.3 25.1 24.2 23.5 26.2 21.2" stroke-width="2"/><circle cx="10.2" cy="9.4" r="2.2" stroke-width="1.7"/><circle cx="27.2" cy="8.2" r="2.2" stroke-width="1.7"/><circle cx="6" cy="13.2" r="1.6" stroke-width="1.5" opacity=".72"/><circle cx="30.2" cy="11.1" r="1.6" stroke-width="1.5" opacity=".72"/><circle cx="10.1" cy="21.7" r="1.6" stroke-width="1.5" opacity=".62"/><circle cx="26.2" cy="21.2" r="1.6" stroke-width="1.5" opacity=".62"/></svg>',
  entrusted:'<svg viewBox="0 0 36 36" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M18 4L19.7 10.3L26 12L19.7 13.7L18 20L16.3 13.7L10 12L16.3 10.3L18 4Z" stroke-width="1.7"/><path d="M27 19L28 22.7L31.7 23.7L28 24.7L27 28.4L26 24.7L22.3 23.7L26 22.7L27 19Z" stroke-width="1.5" opacity=".72"/><circle cx="8.3" cy="25.5" r="1.5" fill="currentColor" stroke="none" opacity=".65"/></svg>',
  music:'<svg viewBox="0 0 36 36" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M22 5V24.5" stroke-width="2.5"/><path d="M22 7L29 5.8" stroke-width="2.2"/><ellipse cx="16.1" cy="27.1" rx="5.8" ry="4.1" transform="rotate(-13 16.1 27.1)" stroke-width="2.3"/></svg>'
};

function isEn(){
  try{
    const saved=JSON.parse(localStorage.getItem(window.RALUVAAA_STORE_KEY)||'null');
    if(saved?.lang)return saved.lang==='en';
  }catch{}
  return (document.querySelector('.lang button.active')?.dataset.lang||document.documentElement.lang||'fr').startsWith('en');
}

function railIcon(svg,extra=''){
  return '<span class="v33-rail-icon">'+svg+extra+'</span>';
}

function syncRailLanguage(code){
  const en=code==='en';
  const my=document.getElementById('myWorldBtn');
  if(my){
    const l=en?'My wishes':'Mes wishes';
    my.setAttribute('aria-label',l);
    my.title=l;
  }
  const create=document.getElementById('createBtn');
  if(create){
    const l=en?'Release a wish':'Déposer un wish';
    create.setAttribute('aria-label',l);
    create.title=l;
  }
}

function decorateRail(){
  const entrusted=document.getElementById('entrustedBtn');
  if(entrusted){
    const badge=entrusted.querySelector('#entrustedBadge')?.outerHTML||'';
    const sig='v33-'+badge;
    if(entrusted.dataset.v33Rail!==sig){
      entrusted.dataset.v33Rail=sig;
      entrusted.innerHTML=railIcon(V33.entrusted)+badge;
    }
  }

  const my=document.getElementById('myWorldBtn');
  if(my&&my.dataset.v33Rail!=='1'){
    my.dataset.v33Rail='1';
    my.innerHTML=railIcon(V33.wishes);
  }
  if(my){
    const l=isEn()?'My wishes':'Mes wishes';
    my.setAttribute('aria-label',l);my.title=l;
  }

  const create=document.getElementById('createBtn');
  if(create&&create.dataset.v33Rail!=='1'){
    create.dataset.v33Rail='1';
    create.innerHTML='<span class="v33-create-plus" aria-hidden="true">+</span>';
  }
  if(create){
    const l=isEn()?'Release a wish':'Déposer un wish';
    create.setAttribute('aria-label',l);create.title=l;
  }

  const music=document.getElementById('musicBtn');
  if(music&&music.dataset.v33Rail!=='1'){
    music.dataset.v33Rail='1';
    music.innerHTML=railIcon(V33.music,'<span class="sound-strike"></span>');
    try{
      const enabled=window.__RALUVAAA_AUDIO__?.enabled!==false;
      music.classList.toggle('muted',!enabled);
      const strike=music.querySelector('.sound-strike');
      if(strike)strike.style.opacity=enabled?'0':'1';
    }catch{}
  }
}

function decorateRoot(){
  document.querySelectorAll('#drawerBody .v28-root').forEach(root=>{
    if(root.querySelector('.v33-root-seed'))return;
    const old=root.querySelector('.v30-seed');
    if(!old)return;
    const holder=document.createElement('span');
    holder.className='v30-seed v33-root-seed';
    holder.innerHTML=V33.seed;
    old.replaceWith(holder);
  });
}

function sourceEntries(){
  const out=[];
  document.querySelectorAll('#drawerBody .action-grid button[data-act]').forEach(b=>{
    const act=b.dataset.act;
    if(!['evolve','split','branch','bloom','resume','resume_lineage'].includes(act))return;
    out.push({key:'p:'+act,source:b,label:b.getAttribute('aria-label')||b.title||b.textContent.trim(),icon:b.querySelector('svg')?.outerHTML||'',color:getComputedStyle(b).color});
  });
  document.querySelectorAll('#drawerBody .v30-action-surface .v30-action').forEach(b=>{
    const act=b.dataset.v30Act||'';
    out.push({key:'s:'+act,source:b,label:b.querySelector('.v30-action-label')?.textContent.trim()||b.textContent.trim(),icon:b.querySelector('.v30-action-icon svg')?.outerHTML||'',color:getComputedStyle(b).color});
  });
  return out;
}

function buildDeck(){
  const body=document.getElementById('drawerBody');
  const wish=body?.querySelector('.wish');
  if(!body||!wish)return;

  const entries=sourceEntries();
  if(!entries.length)return;
  const sig=entries.map(x=>x.key+':'+x.label+':'+(x.source.disabled?'1':'0')).join('|');

  let deck=body.querySelector('.v33-action-deck');
  if(deck?.dataset.sig===sig)return;
  if(deck)deck.remove();

  deck=document.createElement('div');
  deck.className='v33-action-deck';
  deck.dataset.sig=sig;

  for(const entry of entries){
    const unit=document.createElement('div');
    unit.className='v33-action-unit';
    unit.style.color=entry.color;

    const button=document.createElement('button');
    button.type='button';
    button.className='v33-action-circle';
    button.disabled=entry.source.disabled;
    button.setAttribute('aria-label',entry.label);
    button.title=entry.label;
    button.innerHTML=entry.icon;
    button.onclick=()=>entry.source.click();

    const label=document.createElement('div');
    label.className='v33-action-label';
    label.textContent=entry.label;

    unit.append(button,label);
    deck.appendChild(unit);
  }

  const oldSecondary=body.querySelector('.v30-action-surface');
  const oldPrimary=body.querySelector('.action-grid');
  const anchor=oldSecondary||oldPrimary;
  if(anchor)anchor.insertAdjacentElement('afterend',deck);
  else body.appendChild(deck);
}

function decorate(){
  document.title='RALUVAAA · Experience V33';
  decorateRail();
  decorateRoot();
  buildDeck();
}

let queued=false;
function schedule(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;decorate()});
}
const observer=new MutationObserver(schedule);
observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','disabled','data-sig']});
document.addEventListener('click',e=>{
  const langButton=e.target.closest('.lang button');
  if(langButton){
    const code=langButton.dataset.lang;
    setTimeout(()=>{decorate();syncRailLanguage(code);schedule()},60);
    return;
  }
  if(e.target.closest('[data-panel],[data-nav-wish],.v28-back,.v28-root,#drawerClose'))setTimeout(schedule,0);
});

function syncGlobalSoundState(){
  const enabled=window.__RALUVAAA_AUDIO__?.enabled!==false;
  localStorage.setItem('raluvaaaSoundFxV1',enabled?'on':'off');
  const createAudio=window.__RALUVAAA_CREATE_AUDIO_V33__?.audio;
  const semantic=window.__RALUVAAA_ACTION_AUDIO__?.semanticChannel;
  if(!enabled){
    try{createAudio?.pause()}catch{}
    try{semantic?.pause()}catch{}
  }
  const music=document.getElementById('musicBtn');
  const strike=music?.querySelector('.sound-strike');
  music?.classList.toggle('muted',!enabled);
  if(strike)strike.style.opacity=enabled?'0':'1';
}

function installV33Interactions(){
  const music=document.getElementById('musicBtn');
  if(music&&!music.dataset.v33GlobalMute){
    music.dataset.v33GlobalMute='1';
    music.addEventListener('click',()=>setTimeout(syncGlobalSoundState,0));
  }

  window.addEventListener('message',e=>{
    if(e.origin!==location.origin||e.data?.type!=='rv25-blank')return;
    const drawer=document.getElementById('drawer');
    if(drawer&&!drawer.classList.contains('hidden'))document.getElementById('drawerClose')?.click();
  });

  document.addEventListener('pointerdown',e=>{
    const drawer=document.getElementById('drawer');
    if(!drawer||drawer.classList.contains('hidden'))return;
    if(e.target.closest('#drawer,#rail,#overlay'))return;
    document.getElementById('drawerClose')?.click();
  });
}

decorate();
installV33Interactions();
syncGlobalSoundState();
window.__RALUVAAA_V33__={version:33,decorate,seed:V33.seed,wishes:V33.wishes};
})();