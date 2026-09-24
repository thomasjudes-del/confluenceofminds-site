(function(){
'use strict';

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

function decorate(){
  document.title='RALUVAAA · Experience V40';
  const sub=document.querySelector('#brand .sub');
  if(sub)sub.textContent='EXPERIENCE V40';
  relabelSuggest();
  patchSuggestModal();
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
  attributeFilter:['class','data-v39-icon','data-v37-icon','data-sig']
});

document.addEventListener('click',event=>{
  if(event.target.closest('.lang button,.v33-action-circle,[data-panel],[data-nav-wish],#drawerClose')){
    setTimeout(schedule,0);
  }
},true);

decorate();
setTimeout(decorate,100);
window.__RALUVAAA_V40__={version:40,decorate,suggestCopy};
})();