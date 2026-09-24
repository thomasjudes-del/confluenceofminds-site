(function(){
'use strict';

const REVIVE_ICON='https://shattered-dragons-enigma.thomas-judes.workers.dev/assets/raluvaaa/v41/icons/revive.svg';

function lang(){
  return document.querySelector('.lang button.active')?.dataset.lang==='en'?'en':'fr';
}

function suggestCopy(){
  return lang()==='en'
    ?{
      label:'Suggest a branch',
      title:'Suggest a branch',
      hint:'Propose one or more possible branches. Nothing is added unless the wisher accepts.'
    }
    :{
      label:'Proposer une branche',
      title:'Proposer une branche',
      hint:"Proposer une ou plusieurs branches possibles. Rien n'est ajouté tant que l'auteur du wish n'accepte pas."
    };
}

function reviveCopy(){
  return lang()==='en'
    ?{label:'Revive'}
    :{label:'Réveiller'};
}

function relabelSuggest(){
  const copy=suggestCopy();
  document.querySelectorAll('#drawerBody .v33-action-unit').forEach(unit=>{
    const semantic=unit.dataset.v39Icon||unit.dataset.v37Icon||unit.dataset.v35Icon||'';
    if(semantic!=='suggest')return;
    const label=unit.querySelector('.v33-action-label');
    const button=unit.querySelector('.v33-action-circle');
    if(label)label.textContent=copy.label;
    if(button){
      button.setAttribute('aria-label',copy.label);
      button.title=copy.label;
    }
  });
}

function patchSuggestModal(){
  const input=document.getElementById('suggestInput');
  if(!input)return;
  const sheet=input.closest('.sheet');
  if(!sheet)return;
  const copy=suggestCopy();
  const title=sheet.querySelector('h3');
  const hint=sheet.querySelector('p');
  if(title)title.textContent=copy.title;
  if(hint)hint.textContent=copy.hint;
}

function applyReviveIcon(){
  const copy=reviveCopy();
  document.querySelectorAll('#drawerBody .v33-action-unit').forEach(unit=>{
    const semantic=unit.dataset.v39Icon||unit.dataset.v37Icon||unit.dataset.v35Icon||'';
    if(semantic!=='revive')return;
    const button=unit.querySelector('.v33-action-circle');
    if(!button)return;
    let image=button.querySelector('img');
    if(!image){
      image=document.createElement('img');
      image.alt='';
      image.setAttribute('aria-hidden','true');
      image.draggable=false;
      button.replaceChildren(image);
    }
    const assetReady=image.dataset.v41Revive==='1'&&image.src===REVIVE_ICON;
    if(!assetReady){
      image.classList.add('v39-icon-art','v41-revive-art');
      image.src=REVIVE_ICON;
      image.removeAttribute('srcset');
      image.dataset.v41Revive='1';
      unit.dataset.v39Icon='revive';
      unit.dataset.v41Icon='revive';
      button.dataset.v39Icon='revive';
      button.dataset.v41Icon='revive';
    }
    button.setAttribute('aria-label',copy.label);
    button.title=copy.label;
    const label=unit.querySelector('.v33-action-label');
    if(label)label.textContent=copy.label;
  });
}

function decorate(){
  document.title='RALUVAAA · Experience V41';
  const sub=document.querySelector('#brand .sub');
  if(sub)sub.textContent='EXPERIENCE V41';
  relabelSuggest();
  patchSuggestModal();
  applyReviveIcon();
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
  attributeFilter:['class','data-v39-icon','data-v37-icon','data-v41-icon','data-sig','src']
});

document.addEventListener('click',event=>{
  if(event.target.closest('.lang button,.v33-action-circle,[data-panel],[data-nav-wish],#drawerClose')){
    setTimeout(schedule,0);
  }
},true);

decorate();
setTimeout(decorate,80);
setTimeout(decorate,280);

window.__RALUVAAA_V41__={
  version:41,
  decorate,
  suggestCopy,
  reviveCopy,
  reviveIcon:REVIVE_ICON
};
})();