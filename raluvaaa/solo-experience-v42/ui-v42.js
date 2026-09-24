(function(){
'use strict';

const WATER_ICON='https://shattered-dragons-enigma.thomas-judes.workers.dev/assets/raluvaaa/v41/icons/revive.svg';

function lang(){
  return document.querySelector('.lang button.active')?.dataset.lang==='en'?'en':'fr';
}
function copy(){
  return lang()==='en'
    ?{
      wake:'Wake',
      resume:'Resume',
      fading:(days)=>'Quiet for '+days+' days. Its light is slowly fading.',
      dormant:(days)=>'Dormant after '+days+' days without a meaningful action. Its trace is still here.'
    }
    :{
      wake:'Réveiller',
      resume:'Reprendre',
      fading:(days)=>'Calme depuis '+days+' jours. Sa lumière s’atténue progressivement.',
      dormant:(days)=>'Dormant après '+days+' jours sans action significative. Sa trace est toujours là.'
    };
}
function semanticOf(unit){
  return unit?.dataset.v42Icon||unit?.dataset.v41Icon||unit?.dataset.v39Icon||unit?.dataset.v37Icon||unit?.dataset.v35Icon||'';
}
function current(){
  return window.__RALUVAAA_UI__?.current?.()||null;
}
function vitality(cur){
  return cur?window.__RALUVAAA_VITALITY_V42__?.forSemantic?.(cur.semanticId)||cur.vitality||null:null;
}
function relabelExplicitResume(){
  const cur=current();
  if(!cur||cur.state!=='abandoned')return;
  const label=copy().resume;
  document.querySelectorAll('#drawerBody .v33-action-unit').forEach(unit=>{
    if(semanticOf(unit)!=='revive')return;
    const button=unit.querySelector('.v33-action-circle');
    const text=unit.querySelector('.v33-action-label');
    if(button){button.setAttribute('aria-label',label);button.title=label}
    if(text)text.textContent=label;
  });
}
function ensureVitalityNote(){
  const body=document.getElementById('drawerBody'),cur=current();
  if(!body||!cur||!cur.owner||cur.state!=='alive'){
    body?.querySelector('.v42-vitality-note')?.remove();
    return;
  }
  const v=vitality(cur);
  if(!v||v.status==='vital'){
    body.querySelector('.v42-vitality-note')?.remove();
    return;
  }
  let note=body.querySelector('.v42-vitality-note');
  if(!note){
    note=document.createElement('div');
    note.className='v42-vitality-note';
    const meta=body.querySelector('.meta');
    if(meta)meta.insertAdjacentElement('afterend',note);
    else body.prepend(note);
  }
  note.dataset.state=v.status;
  const t=copy();
  note.textContent=v.status==='dormant'?t.dormant(v.days):t.fading(v.days);
}
function ensureWake(){
  const body=document.getElementById('drawerBody'),deck=body?.querySelector('.v33-action-deck'),cur=current();
  if(!deck||!cur){
    body?.querySelector('.v33-action-unit[data-v42-icon="wake"]')?.remove();
    return;
  }
  const v=vitality(cur),should=cur.owner&&cur.state==='alive'&&v?.status==='dormant';
  let unit=deck.querySelector('.v33-action-unit[data-v42-icon="wake"]');
  if(!should){
    unit?.remove();
    return;
  }
  if(!unit){
    unit=document.createElement('div');
    unit.className='v33-action-unit v42-wake-unit';
    unit.dataset.v42Icon='wake';
    unit.style.order='1';

    const button=document.createElement('button');
    button.type='button';
    button.className='v33-action-circle';
    button.dataset.v42Icon='wake';
    const img=document.createElement('img');
    img.src=WATER_ICON;
    img.alt='';
    img.setAttribute('aria-hidden','true');
    img.draggable=false;
    img.className='v39-icon-art v42-wake-art';
    button.appendChild(img);
    button.onclick=()=>window.__RALUVAAA_UI__?.action?.('wake');

    const text=document.createElement('div');
    text.className='v33-action-label';
    unit.append(button,text);
    deck.appendChild(unit);
  }
  const label=copy().wake;
  const button=unit.querySelector('.v33-action-circle'),text=unit.querySelector('.v33-action-label');
  if(button){button.setAttribute('aria-label',label);button.title=label}
  if(text)text.textContent=label;

  for(const other of deck.querySelectorAll('.v33-action-unit')){
    if(other===unit)continue;
    const sem=semanticOf(other);
    other.classList.toggle('v42-dormant-hidden',['evolve','branch','bloom','graft','movebranch'].includes(sem));
  }
}
function clearDormantHides(){
  const cur=current(),v=vitality(cur);
  if(cur?.owner&&cur.state==='alive'&&v?.status==='dormant')return;
  document.querySelectorAll('#drawerBody .v33-action-unit.v42-dormant-hidden').forEach(x=>x.classList.remove('v42-dormant-hidden'));
}
function decorate(){
  document.title='RALUVAAA · Experience V42';
  const sub=document.querySelector('#brand .sub');
  if(sub)sub.textContent='EXPERIENCE V42';
  relabelExplicitResume();
  ensureVitalityNote();
  ensureWake();
  clearDormantHides();
}
let queued=false;
function schedule(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;decorate()});
}
new MutationObserver(schedule).observe(document.body,{
  subtree:true,childList:true,attributes:true,
  attributeFilter:['class','data-v42-icon','data-v41-icon','data-v39-icon','data-sig','src']
});
document.addEventListener('click',e=>{
  if(e.target.closest('.lang button,.v33-action-circle,[data-panel],[data-nav-wish],#drawerClose'))setTimeout(schedule,0)
},true);
decorate();
setTimeout(decorate,100);
setTimeout(decorate,320);
window.__RALUVAAA_V42__={version:42,decorate,waterIcon:WATER_ICON};
})();