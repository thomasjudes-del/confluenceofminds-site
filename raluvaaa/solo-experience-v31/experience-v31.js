(function(){
'use strict';

const V31={
  seed:'<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M15.8 26C10.2 22.4 9.2 14.4 15.8 8.1C22.4 14.4 21.4 22.4 15.8 26Z" stroke-width="1.9"/><path d="M15.8 9C15.8 6.3 18 4.2 21.2 3.4" stroke-width="1.7"/><path d="M12.7 18.1C14.3 18.7 16.8 18.4 19.2 16.5" stroke-width="1.35" opacity=".55"/></svg>',
  create:'<svg viewBox="0 0 36 36" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M14.2 30C8.8 26.4 8 18.2 14.2 12C20.4 18.2 19.6 26.4 14.2 30Z" stroke-width="2"/><path d="M14.2 12.8C14.2 10.1 16.2 8 19.2 7.2" stroke-width="1.8"/><path d="M11.5 22C13 22.5 15.4 22.2 17.6 20.5" stroke-width="1.35" opacity=".55"/><path d="M27 5V15M22 10H32" stroke-width="2.2"/></svg>',
  wishes:'<svg viewBox="0 0 36 36" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M18 16C14.2 13.6 13.7 8.6 18 5C22.3 8.6 21.8 13.6 18 16Z" stroke-width="1.65"/><path d="M10.2 30C6.4 27.6 5.9 22.6 10.2 19C14.5 22.6 14 27.6 10.2 30Z" stroke-width="1.65"/><path d="M25.8 30C22 27.6 21.5 22.6 25.8 19C30.1 22.6 29.6 27.6 25.8 30Z" stroke-width="1.65"/><path d="M18 5.6V3.6M10.2 19.6V17.6M25.8 19.6V17.6" stroke-width="1.4" opacity=".65"/></svg>',
  entrusted:'<svg viewBox="0 0 36 36" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M18 4L19.7 10.3L26 12L19.7 13.7L18 20L16.3 13.7L10 12L16.3 10.3L18 4Z" stroke-width="1.7"/><path d="M27 19L28 22.7L31.7 23.7L28 24.7L27 28.4L26 24.7L22.3 23.7L26 22.7L27 19Z" stroke-width="1.5" opacity=".72"/><circle cx="8.3" cy="25.5" r="1.5" fill="currentColor" stroke="none" opacity=".65"/></svg>',
  music:'<svg viewBox="0 0 36 36" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M14 7V25.5M14 10L28 7V22.5" stroke-width="2.2"/><ellipse cx="10" cy="27" rx="4.2" ry="3.2" stroke-width="2"/><ellipse cx="24" cy="24" rx="4.2" ry="3.2" stroke-width="2"/></svg>'
};

function isEn(){
  return (document.querySelector('.lang button.active')?.dataset.lang||document.documentElement.lang||'fr').startsWith('en');
}

function railIcon(svg,extra=''){
  return '<span class="v31-rail-icon">'+svg+extra+'</span>';
}

function decorateRail(){
  const entrusted=document.getElementById('entrustedBtn');
  if(entrusted){
    const badge=entrusted.querySelector('#entrustedBadge')?.outerHTML||'';
    const sig='v31-'+badge;
    if(entrusted.dataset.v31Rail!==sig){
      entrusted.dataset.v31Rail=sig;
      entrusted.innerHTML=railIcon(V31.entrusted)+badge;
    }
  }

  const my=document.getElementById('myWorldBtn');
  if(my&&my.dataset.v31Rail!=='1'){
    my.dataset.v31Rail='1';
    my.innerHTML=railIcon(V31.wishes);
  }
  if(my){
    const l=isEn()?'My wishes':'Mes wishes';
    my.setAttribute('aria-label',l);my.title=l;
  }

  const create=document.getElementById('createBtn');
  if(create&&create.dataset.v31Rail!=='1'){
    create.dataset.v31Rail='1';
    create.innerHTML=railIcon(V31.create);
  }
  if(create){
    const l=isEn()?'Release a wish':'Déposer un wish';
    create.setAttribute('aria-label',l);create.title=l;
  }

  const music=document.getElementById('musicBtn');
  if(music&&music.dataset.v31Rail!=='1'){
    music.dataset.v31Rail='1';
    music.innerHTML=railIcon(V31.music,'<span class="sound-strike"></span>');
    try{
      const enabled=window.__RALUVAAA_AUDIO__?.enabled!==false;
      music.classList.toggle('muted',!enabled);
      const strike=music.querySelector('.sound-strike');
      if(strike)strike.style.opacity=enabled?'0':'1';
    }catch{}
  }
}

function decorateRoot(){
  document.querySelectorAll('#drawerBody .v28-root .v30-seed').forEach(old=>{
    const holder=document.createElement('span');
    holder.className='v30-seed';
    holder.innerHTML=V31.seed;
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

  let deck=body.querySelector('.v31-action-deck');
  if(deck?.dataset.sig===sig)return;
  if(deck)deck.remove();

  deck=document.createElement('div');
  deck.className='v31-action-deck';
  deck.dataset.sig=sig;

  for(const entry of entries){
    const unit=document.createElement('div');
    unit.className='v31-action-unit';
    unit.style.color=entry.color;

    const button=document.createElement('button');
    button.type='button';
    button.className='v31-action-circle';
    button.disabled=entry.source.disabled;
    button.setAttribute('aria-label',entry.label);
    button.title=entry.label;
    button.innerHTML=entry.icon;
    button.onclick=()=>entry.source.click();

    const label=document.createElement('div');
    label.className='v31-action-label';
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
  document.title='RALUVAAA · Experience V31';
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
  if(e.target.closest('.lang button,[data-panel],[data-nav-wish],.v28-back,.v28-root,#drawerClose'))setTimeout(schedule,0);
},true);

decorate();
window.__RALUVAAA_V31__={version:31,decorate,seed:V31.seed,create:V31.create,wishes:V31.wishes};
})();