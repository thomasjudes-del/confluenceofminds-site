(function(){
'use strict';

/*
  V39 changes the icon pipeline deliberately:
  the approved icon board is now the source of truth.
  We do not redraw these pictograms in SVG/CSS anymore.
  Each UI icon is an exact crop from that board, hosted as a versioned R2 asset.
*/
const BASE='https://shattered-dragons-enigma.thomas-judes.workers.dev/assets/raluvaaa/v39/icons/';
const ASSET={
  evolve:BASE+'evolve.png',
  branch:BASE+'branch.png',
  bloom:BASE+'bloom.png',
  recenter:BASE+'recenter.png',
  modify:BASE+'modify.png',
  graft:BASE+'graft.png',
  share:BASE+'share.png',
  letgo:BASE+'letgo.png',
  report:BASE+'report.png',
  encourage:BASE+'encourage.png',
  help:BASE+'help.png',
  suggest:BASE+'suggest.png',
  entrusted:BASE+'entrusted.png',
  notifications:BASE+'notifications.png',
  mywishes:BASE+'mywishes.png',
  music:BASE+'music.png',
  create:BASE+'create.png',
  seed:BASE+'seed.png'
};

const railMap={
  entrustedBtn:'entrusted',
  inboxBtn:'notifications',
  myWorldBtn:'mywishes',
  musicBtn:'music',
  createBtn:'create'
};

function setImage(image,name){
  if(!image||!ASSET[name])return;
  if(image.dataset.v39Icon===name&&image.src===ASSET[name])return;
  image.dataset.v39Icon=name;
  image.classList.add('v39-icon-art');
  image.src=ASSET[name];
  image.removeAttribute('srcset');
}

function applyRail(){
  for(const [id,name] of Object.entries(railMap)){
    const button=document.getElementById(id);
    if(!button)continue;
    const image=button.querySelector('img.v37-icon, img.v35-icon, img');
    setImage(image,name);
    button.dataset.v39Icon=name;
  }
}

function applyDeck(){
  document.querySelectorAll('#drawerBody .v33-action-unit').forEach(unit=>{
    const name=unit.dataset.v37Icon||unit.dataset.v35Icon||'';
    if(!ASSET[name])return;
    const button=unit.querySelector('.v33-action-circle');
    const image=button?.querySelector('img');
    setImage(image,name);
    unit.dataset.v39Icon=name;
    if(button)button.dataset.v39Icon=name;
  });
}

function applyRoot(){
  document.querySelectorAll('#drawerBody .v33-root-seed img').forEach(image=>setImage(image,'seed'));
}

function applyFlag(){
  document.querySelectorAll('#drawerBody .v38-report-button img').forEach(image=>setImage(image,'report'));
}

function decorate(){
  document.title='RALUVAAA · Experience V39';
  const sub=document.querySelector('#brand .sub');
  if(sub)sub.textContent='EXPERIENCE V39';
  applyRail();
  applyDeck();
  applyRoot();
  applyFlag();
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

new MutationObserver(schedule).observe(document.body,{
  subtree:true,
  childList:true,
  attributes:true,
  attributeFilter:['class','data-v37-icon','data-v35-icon','data-v39-icon','data-sig','src']
});

document.addEventListener('click',event=>{
  if(event.target.closest('.lang button,[data-panel],[data-nav-wish],.v28-back,.v28-root,#drawerClose,.v33-action-circle')){
    setTimeout(schedule,0);
  }
},true);

decorate();
setTimeout(decorate,60);
setTimeout(decorate,250);

window.__RALUVAAA_V39__={
  version:39,
  source:'approved-icon-board-crops',
  assets:ASSET,
  decorate
};
})();