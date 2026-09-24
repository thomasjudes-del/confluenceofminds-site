(function(){
'use strict';

const REPORT_ICON='https://shattered-dragons-enigma.thomas-judes.workers.dev/assets/raluvaaa/v37/icons/report.svg';

function lang(){
  return document.querySelector('.lang button.active')?.dataset.lang==='en'?'en':'fr';
}
function reportLabel(){
  return lang()==='en'?'Flag as inappropriate':'Signaler comme inapproprié';
}

function decorateExistingReport(){
  document.querySelectorAll('#drawerBody .v33-action-unit[data-v37-icon="report"]').forEach(unit=>{
    unit.classList.add('v38-report-unit');
    const label=unit.querySelector('.v33-action-label');
    const button=unit.querySelector('.v33-action-circle');
    const text=reportLabel();
    if(label)label.textContent=text;
    if(button){
      button.setAttribute('aria-label',text);
      button.title=text;
    }
  });
}

function ensureReportButton(){
  const body=document.getElementById('drawerBody');
  const current=window.__RALUVAAA_UI__?.current?.();
  if(!body||!current||current.owner||!body.querySelector('.wish'))return;
  if(body.querySelector('.v33-action-unit[data-v37-icon="report"]')){
    body.querySelector('.v38-report-row')?.remove();
    return;
  }

  let row=body.querySelector('.v38-report-row');
  if(!row){
    row=document.createElement('div');
    row.className='v38-report-row';
    const button=document.createElement('button');
    button.type='button';
    button.className='v38-report-button';
    button.innerHTML='<img src="'+REPORT_ICON+'" alt="" aria-hidden="true"><span></span>';
    button.onclick=()=>window.__RALUVAAA_UI__?.action?.('report');
    row.appendChild(button);

    const deck=body.querySelector('.v33-action-deck');
    if(deck)deck.insertAdjacentElement('afterend',row);
    else body.appendChild(row);
  }
  const button=row.querySelector('button');
  const text=reportLabel();
  row.querySelector('span').textContent=text;
  button.setAttribute('aria-label',text);
  button.title=text;
}

function decorate(){
  document.title='RALUVAAA · Experience V38';
  const sub=document.querySelector('#brand .sub');
  if(sub)sub.textContent='EXPERIENCE V38';
  decorateExistingReport();
  ensureReportButton();
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
  attributeFilter:['class','data-v37-icon','data-sig']
});

document.addEventListener('click',event=>{
  if(event.target.closest('.lang button,[data-panel],[data-nav-wish],.v28-back,.v28-root,#drawerClose')){
    setTimeout(schedule,0);
  }
},true);

decorate();
setTimeout(decorate,80);
setTimeout(decorate,350);
window.__RALUVAAA_V38__={version:38,decorate,reportLabel};
})();