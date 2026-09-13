(function(){
  'use strict';
  const detail=document.getElementById('detail');
  if(!detail)return;

  function compactify(){
    if(detail.classList.contains('hidden'))return;

    const eyebrow=detail.querySelector('.eyebrow');
    if(eyebrow){
      const raw=(eyebrow.textContent||'').trim().toUpperCase();
      if(raw.includes('SIMULATED')){
        eyebrow.textContent='SIMULATED';
        eyebrow.classList.add('simulated-label');
        eyebrow.classList.remove('compact-hidden');
      }else{
        eyebrow.classList.add('compact-hidden');
      }
    }

    const rows=[...detail.querySelectorAll(':scope > .row')];
    const reportRow=rows.find(row=>row.querySelector('[data-act="report"]'));
    if(reportRow){
      reportRow.classList.add('report-row');
      const report=reportRow.querySelector('[data-act="report"]');
      if(report)report.textContent='Report';
    }
  }

  new MutationObserver(()=>setTimeout(compactify,0)).observe(detail,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  compactify();
})();
