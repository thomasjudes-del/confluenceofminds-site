(function(){
'use strict';
const BASE='https://shattered-dragons-enigma.thomas-judes.workers.dev/assets/raluvaaa/v37/icons/';
const ASSET={
  entrusted:BASE+'entrusted.svg',
  notifications:BASE+'notifications.svg',
  mywishes:BASE+'mywishes.svg',
  music:BASE+'music.svg',
  create:BASE+'create.svg',
  seed:BASE+'seed.svg',
  evolve:BASE+'evolve.svg',
  branch:BASE+'branch.svg',
  bloom:BASE+'bloom.svg',
  recenter:BASE+'recenter.svg',
  modify:BASE+'modify.svg',
  graft:BASE+'graft.svg',
  share:BASE+'share.svg',
  letgo:BASE+'letgo.svg',
  encourage:BASE+'encourage.svg',
  help:BASE+'help.svg',
  suggest:BASE+'suggest.svg',
  revive:BASE+'revive.svg',
  report:BASE+'report.svg'
};
const img=(name,cls='v37-icon')=>'<img class="'+cls+'" src="'+ASSET[name]+'" alt="" aria-hidden="true" draggable="false">';

function semanticForAction(act){
  return ({
    evolve:'evolve',split:'branch',branch:'branch',bloom:'bloom',
    resume:'revive',resume_lineage:'revive',
    support:'encourage',encourage:'encourage',
    help:'help',graft:'graft',connect:'graft',
    recenter:'recenter',focus:'recenter',
    modify:'modify',correct:'modify',
    share:'share',suggest:'suggest',
    letgo:'letgo',abandon:'letgo',close_lineage:'letgo',
    revive:'revive',report:'report'
  })[act]||null;
}

function currentDeckSemantics(){
  const out=[];
  document.querySelectorAll('#drawerBody .action-grid button[data-act]').forEach(button=>{
    const act=button.dataset.act||'';
    if(['evolve','split','branch','bloom','resume','resume_lineage'].includes(act)){
      out.push(semanticForAction(act));
    }
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
    const b=document.getElementById(id);
    if(!b)continue;
    const badge=hasBadge?(b.querySelector('.badge')?.outerHTML||''):'';
    const muted=id==='musicBtn'?'<span class="sound-strike"></span>':'';
    const sig=name+'|'+badge;
    if(b.dataset.v37Rail===sig&&b.querySelector('.v37-rail-icon'))continue;
    b.dataset.v37Rail=sig;
    b.dataset.v37Icon=name;
    b.innerHTML='<span class="v37-rail-icon">'+img(name)+muted+'</span>'+badge;
  }
}

function decorateRoot(){
  document.querySelectorAll('#drawerBody .v33-root-seed').forEach(holder=>{
    if(holder.dataset.v37Icon==='seed'&&holder.querySelector('.v37-icon'))return;
    holder.dataset.v37Icon='seed';
    holder.innerHTML=img('seed');
  });
}

function decorateDeck(){
  const buttons=[...document.querySelectorAll('#drawerBody .v33-action-circle')];
  const semantics=currentDeckSemantics();
  buttons.forEach((button,index)=>{
    const semantic=semantics[index];
    if(!semantic||!ASSET[semantic])return;
    const unit=button.closest('.v33-action-unit');
    if(unit)unit.dataset.v37Icon=semantic;
    if(button.dataset.v37Icon===semantic&&button.querySelector('.v37-icon'))return;
    button.dataset.v37Icon=semantic;
    button.innerHTML=img(semantic);
  });
}

function decorate(){
  document.title='RALUVAAA · Experience V37';
  const sub=document.querySelector('#brand .sub');
  if(sub)sub.textContent='EXPERIENCE V37';
  decorateRail();
  decorateRoot();
  decorateDeck();
}

let queued=false;
function schedule(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;decorate()});
}

new MutationObserver(schedule).observe(document.body,{
  subtree:true,
  childList:true,
  attributes:true,
  attributeFilter:['class','disabled','data-sig']
});

document.addEventListener('click',event=>{
  if(event.target.closest('.lang button,[data-panel],[data-nav-wish],.v28-back,.v28-root,#drawerClose')){
    setTimeout(schedule,0);
  }
},true);

decorate();
setTimeout(decorate,80);
setTimeout(decorate,350);
window.__RALUVAAA_V37__={version:37,decorate,assets:ASSET,semanticForAction};
})();