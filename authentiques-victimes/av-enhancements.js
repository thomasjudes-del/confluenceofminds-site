(() => {
  document.documentElement.classList.remove('av-pen-active');
  document.querySelectorAll('.av-pen-cursor').forEach(el => el.remove());

  const fragmentSection = document.querySelector('.fragments');
  const fragmentBackdrop = fragmentSection?.querySelector('.fragments__image');
  if (fragmentBackdrop) {
    // Use the same repository artwork that is confirmed to render correctly on mobile.
    fragmentBackdrop.src = 'assets/photos/hero.webp?v=20260907-fragments';
    fragmentBackdrop.removeAttribute('srcset');
    fragmentBackdrop.addEventListener('error', () => fragmentBackdrop.remove(), {once:true});
  }

  const fragments = document.querySelector('.fragments__field');
  const cleanStrayMarks = () => {
    if (!fragments) return;
    const walker = document.createTreeWalker(fragments, NodeFilter.SHOW_TEXT);
    const doomed = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const t = (node.nodeValue || '').trim();
      if (['?', '❓', '�', '□'].includes(t)) doomed.push(node);
    }
    doomed.forEach(node => node.remove());
    fragments.querySelectorAll('*').forEach(el => {
      const own = Array.from(el.childNodes).filter(n => n.nodeType === Node.TEXT_NODE).map(n => (n.nodeValue || '').trim()).join('');
      const alt = (el.getAttribute?.('alt') || '').trim();
      const title = (el.getAttribute?.('title') || '').trim();
      if (['?', '❓', '�', '□'].includes(own) || ['?', '❓', '�', '□'].includes(alt) || ['?', '❓', '�', '□'].includes(title)) el.remove();
    });
  };
  cleanStrayMarks();
  if (fragments) new MutationObserver(cleanStrayMarks).observe(fragments, {subtree:true,childList:true,characterData:true});

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