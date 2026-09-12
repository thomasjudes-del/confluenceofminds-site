(function(){
  'use strict';
  const frame=document.getElementById('engine');
  const detail=document.getElementById('detail');
  const entrusted=document.getElementById('entrusted');
  const grid=document.getElementById('entrustedGrid');
  const quick=document.getElementById('entrustedQuick');
  const pulse=document.getElementById('quickPulse');

  const bridge=()=>frame?.contentWindow?.RV_BRIDGE||null;
  const selectedId=()=>bridge()?.selectedId?.()||null;

  function closeSelected(){
    detail?.classList.add('hidden');
    bridge()?.clearSelection?.();
  }

  if(pulse){
    pulse.addEventListener('click',()=>document.getElementById('pulseMore')?.click());
  }

  /* Re-clicking the same entrusted wish returns to the neutral world. */
  if(grid){
    grid.addEventListener('click',ev=>{
      const row=ev.target.closest?.('[data-wish]');
      if(!row||detail.classList.contains('hidden'))return;
      const openText=(detail.querySelector('.wishtext')?.textContent||'').trim();
      const rowText=(row.querySelector('.t')?.textContent||'').trim();
      if(openText&&rowText&&openText===rowText){
        ev.preventDefault();ev.stopImmediatePropagation();closeSelected();
      }
    },true);
  }

  function renderQuickEntrusted(){
    if(!quick||!grid)return;
    const rows=[...grid.querySelectorAll('.entrusted-item[data-wish]')];
    quick.innerHTML=rows.map((row,i)=>{
      const cls=row.classList.contains('urgent')?'urgent':row.classList.contains('long')?'long':'mid';
      const label=(row.querySelector('.t')?.textContent||('Entrusted wish '+(i+1))).trim();
      return `<button class="entrusted-jump ${cls}" data-jump="${i}" title="${label.replace(/"/g,'&quot;')}" aria-label="Go to entrusted wish ${i+1}"><span></span></button>`;
    }).join('');
    quick.querySelectorAll('[data-jump]').forEach(btn=>btn.addEventListener('click',ev=>{
      ev.preventDefault();ev.stopPropagation();
      const row=rows[Number(btn.dataset.jump)];
      row?.click();
    }));
  }

  if(grid){
    new MutationObserver(renderQuickEntrusted).observe(grid,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    renderQuickEntrusted();
  }

  function ensureDetailControls(){
    if(!detail||detail.classList.contains('hidden'))return;
    const top=detail.querySelector('.detail-top');
    if(!top)return;
    if(!top.querySelector('.locate-wish')){
      const close=top.querySelector('.close');
      const btn=document.createElement('button');
      btn.className='locate-wish';
      btn.type='button';
      btn.title='Center this wish';
      btn.setAttribute('aria-label','Center this wish');
      btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>';
      btn.addEventListener('click',ev=>{
        ev.preventDefault();ev.stopPropagation();
        const id=selectedId();if(id)bridge()?.focus?.(id);
      });
      if(close)top.insertBefore(btn,close);else top.appendChild(btn);
    }
    const id=selectedId();
    const enc=detail.querySelector('[data-act="encourage"]');
    if(id&&enc)bridge()?.setManualEncouraged?.(id,enc.classList.contains('active'));
  }

  if(detail){
    detail.addEventListener('click',ev=>{
      const enc=ev.target.closest?.('[data-act="encourage"]');
      if(!enc)return;
      const id=selectedId();
      const turningOn=!enc.classList.contains('active');
      setTimeout(()=>{if(id)bridge()?.setManualEncouraged?.(id,turningOn)},0);
    },true);
    new MutationObserver(()=>setTimeout(ensureDetailControls,0)).observe(detail,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  }

  window.addEventListener('message',ev=>{
    if(ev.origin!==location.origin)return;
    if(ev.data?.type==='raluvaaa-renderer-ready'){
      renderQuickEntrusted();
      ensureDetailControls();
    }
  });
})();
