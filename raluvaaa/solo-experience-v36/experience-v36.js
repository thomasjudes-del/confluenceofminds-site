(function(){
'use strict';
const BASE='https://shattered-dragons-enigma.thomas-judes.workers.dev/assets/raluvaaa/v35/icons/';
const ASSET={
  entrusted:BASE+'entrusted.png',
  notifications:BASE+'notifications.png',
  mywishes:BASE+'mywishes.png',
  music:BASE+'music.png',
  create:BASE+'create.png',
  seed:BASE+'seed.png',
  evolve:'https://shattered-dragons-enigma.thomas-judes.workers.dev/assets/raluvaaa/v36/icons/evolve.svg',
  branch:BASE+'branch.png',
  bloom:BASE+'bloom.png',
  recenter:BASE+'recenter.png',
  modify:BASE+'modify.png',
  graft:'https://shattered-dragons-enigma.thomas-judes.workers.dev/assets/raluvaaa/v36/icons/graft.svg',
  share:BASE+'share.png',
  letgo:'https://shattered-dragons-enigma.thomas-judes.workers.dev/assets/raluvaaa/v36/icons/letgo.svg',
  encourage:BASE+'encourage.png',
  help:BASE+'help.png',
  suggest:BASE+'suggest.png',
  revive:BASE+'revive.png',
  report:BASE+'report.png'
};
const img=(name,cls='v35-icon')=>'<img class="'+cls+'" src="'+ASSET[name]+'" alt="" aria-hidden="true" draggable="false">';

function semanticForAction(act){
  return ({
    evolve:'evolve',split:'branch',branch:'branch',bloom:'bloom',
    resume:'revive',resume_lineage:'revive',
    support:'encourage',help:'help',graft:'graft',recenter:'recenter',
    modify:'modify',share:'share',suggest:'suggest',letgo:'letgo',
    revive:'revive',report:'report'
  })[act]||null;
}
function currentDeckSemantics(){
  const out=[];
  document.querySelectorAll('#drawerBody .action-grid button[data-act]').forEach(button=>{
    const act=button.dataset.act||'';
    if(['evolve','split','branch','bloom','resume','resume_lineage'].includes(act))out.push(semanticForAction(act));
  });
  document.querySelectorAll('#drawerBody .v30-action-surface .v30-action').forEach(button=>{
    out.push(semanticForAction(button.dataset.v30Act||''));
  });
  return out;
}
function decorateRail(){
  const defs=[
    ['entrustedBtn','entrusted',true],
    ['inboxBtn','notifications',true],
    ['myWorldBtn','mywishes',false],
    ['musicBtn','music',false],
    ['createBtn','create',false]
  ];
  for(const [id,name,hasBadge] of defs){
    const b=document.getElementById(id); if(!b)continue;
    const badge=hasBadge?b.querySelector('.badge')?.outerHTML||'':'';
    const muted=id==='musicBtn'?'<span class="sound-strike"></span>':'';
    const sig=name+'|'+badge;
    if(b.dataset.v35Rail===sig&&b.querySelector('.v35-rail-icon'))continue;
    b.dataset.v35Rail=sig;
    b.innerHTML='<span class="v35-rail-icon">'+img(name,'v35-icon')+muted+'</span>'+badge;
    b.dataset.v35Icon=name;
  }
}
function decorateRoot(){
  document.querySelectorAll('#drawerBody .v33-root-seed').forEach(h=>{
    if(h.dataset.v35Icon==='seed'&&h.querySelector('.v35-icon'))return;
    h.dataset.v35Icon='seed';h.innerHTML=img('seed');
  });
}
function decorateDeck(){
  const buttons=[...document.querySelectorAll('#drawerBody .v33-action-circle')];
  const semantics=currentDeckSemantics();
  buttons.forEach((button,index)=>{
    const semantic=semantics[index];
    if(!semantic||!ASSET[semantic])return;
    const unit=button.closest('.v33-action-unit');
    if(unit)unit.dataset.v35Icon=semantic;
    if(button.dataset.v35Icon===semantic&&button.querySelector('.v35-icon'))return;
    button.dataset.v35Icon=semantic;
    button.innerHTML=img(semantic);
  });
}
function decorate(){
  document.title='RALUVAAA · Experience V36';
  const sub=document.querySelector('#brand .sub');if(sub)sub.textContent='EXPERIENCE V36';
  decorateRail();decorateRoot();decorateDeck();
}
let queued=false;
function schedule(){
  if(queued)return;queued=true;
  requestAnimationFrame(()=>{queued=false;decorate()});
}
new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','disabled','data-sig']});
document.addEventListener('click',e=>{
  if(e.target.closest('.lang button,[data-panel],[data-nav-wish],.v28-back,.v28-root,#drawerClose'))setTimeout(schedule,0);
},true);
decorate();setTimeout(decorate,80);setTimeout(decorate,350);
window.__RALUVAAA_V36__={version:36,decorate,assets:ASSET};
})();