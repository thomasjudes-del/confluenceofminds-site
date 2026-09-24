(function(){
'use strict';

const REVIVE_ICON='https://shattered-dragons-enigma.thomas-judes.workers.dev/assets/raluvaaa/v41/icons/revive.svg';
const MOVE_ICON='https://shattered-dragons-enigma.thomas-judes.workers.dev/assets/raluvaaa/v41/icons/move-branch.svg';

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

function moveCopy(){
  return lang()==='en'
    ?{label:'Move branch'}
    :{label:'Déplacer la branche'};
}

function semanticOf(unit){
  return unit?.dataset.v41Icon||unit?.dataset.v39Icon||unit?.dataset.v37Icon||unit?.dataset.v35Icon||'';
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
  const reviveUnits=[...document.querySelectorAll('#drawerBody .v33-action-unit')].filter(unit=>semanticOf(unit)==='revive');
  // V30 + V33 expose the abandoned-state revive twice (primary + secondary).
  // Keep the duplicate in DOM so older index-based decorators stay aligned, but hide it from users.
  reviveUnits.forEach((unit,index)=>unit.classList.toggle('v41-workflow-hidden',index>0));
  reviveUnits.slice(0,1).forEach(unit=>{
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

function normalizeWorkflowDeck(){
  const cur=window.__RALUVAAA_UI__?.current?.();
  const wf=window.__RALUVAAA_WORKFLOW_V41__;
  const deck=document.querySelector('#drawerBody .v33-action-deck');
  if(!cur||!wf||!deck)return;

  const superseded=wf.isSuperseded(cur.semanticId);
  const activeBelow=wf.hasActiveDescendants(cur.semanticId);

  for(const unit of deck.querySelectorAll('.v33-action-unit')){
    if(unit.dataset.v41Icon==='movebranch')continue;
    const semantic=semanticOf(unit);
    let hide=false;
    if(superseded&&semantic==='graft')hide=true;
    if(!cur.owner&&superseded&&['support','help','suggest'].includes(semantic))hide=true;
    if(cur.owner&&cur.kind!=='create'&&activeBelow&&semantic==='letgo')hide=true;
    unit.classList.toggle('v41-workflow-invalid',hide);

    const order={evolve:1,branch:2,bloom:3,recenter:4,modify:5,graft:7,share:8,letgo:9,revive:1,support:1,help:2,suggest:3,report:9}[semantic];
    if(order)unit.style.order=String(order);
  }

  const shouldMove=cur.owner&&cur.kind==='split'&&cur.state==='alive';
  let move=deck.querySelector('.v33-action-unit[data-v41-icon="movebranch"]');
  if(!shouldMove){
    move?.remove();
    return;
  }
  const copy=moveCopy();
  if(!move){
    move=document.createElement('div');
    move.className='v33-action-unit v41-move-unit';
    move.dataset.v41Icon='movebranch';
    move.dataset.v39Icon='movebranch';
    move.style.order='6';

    const button=document.createElement('button');
    button.type='button';
    button.className='v33-action-circle';
    button.dataset.v41Icon='movebranch';
    button.dataset.v39Icon='movebranch';
    const image=document.createElement('img');
    image.alt='';
    image.setAttribute('aria-hidden','true');
    image.draggable=false;
    image.className='v39-icon-art v41-move-art';
    image.src=MOVE_ICON;
    button.appendChild(image);
    button.onclick=()=>window.__RALUVAAA_UI__?.action?.('reattach');

    const label=document.createElement('div');
    label.className='v33-action-label';

    move.append(button,label);
    deck.appendChild(move);
  }
  const button=move.querySelector('.v33-action-circle');
  const label=move.querySelector('.v33-action-label');
  if(button){
    button.setAttribute('aria-label',copy.label);
    button.title=copy.label;
  }
  if(label)label.textContent=copy.label;
}

function decorate(){
  document.title='RALUVAAA · Experience V41';
  const sub=document.querySelector('#brand .sub');
  if(sub)sub.textContent='EXPERIENCE V41';
  relabelSuggest();
  patchSuggestModal();
  applyReviveIcon();
  normalizeWorkflowDeck();
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
  reviveIcon:REVIVE_ICON,
  moveIcon:MOVE_ICON,
  normalizeWorkflowDeck
};
})();