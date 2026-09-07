(() => {
  // The stray "?" was the browser fallback for the custom fountain-pen cursor.
  // Remove that cursor layer entirely and restore the native pointer.
  document.documentElement.classList.remove('av-pen-active');
  document.querySelectorAll('.av-pen-cursor').forEach(el => el.remove());
  const cursorFix = document.createElement('style');
  cursorFix.textContent = '.fragments .fragment,.fragments a,.fragments button{cursor:auto!important}.fragments a,.fragments button{cursor:pointer!important}';
  document.head.appendChild(cursorFix);

  const fragments = document.querySelector('.fragments__field');
  if (fragments) {
    fragments.querySelectorAll('img,span,i').forEach(el => {
      const t=(el.textContent||'').trim(), a=(el.getAttribute('alt')||'').trim();
      if(['?','❓','�'].includes(t)||['?','❓','�'].includes(a)) el.remove();
    });
  }

  const stage=document.querySelector('.kiosk-stage');
  const kiosk=stage?.querySelector('.kiosk');
  if(stage&&kiosk&&!kiosk.querySelector('.kiosk-expand')){
    const button=document.createElement('button');
    button.type='button';button.className='kiosk-expand';button.setAttribute('aria-label','Agrandir le kiosque Robotiques');button.setAttribute('aria-pressed','false');
    button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>';
    kiosk.appendChild(button);
    const toggle=()=>{const open=stage.classList.toggle('is-fullscreen');document.body.classList.toggle('kiosk-fullscreen',open);button.setAttribute('aria-pressed',String(open));button.setAttribute('aria-label',open?'Réduire le kiosque Robotiques':'Agrandir le kiosque Robotiques');};
    button.addEventListener('click',toggle);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&stage.classList.contains('is-fullscreen'))toggle();});
  }
})();