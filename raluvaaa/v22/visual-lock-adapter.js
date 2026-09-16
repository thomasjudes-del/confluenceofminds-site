/* RALUVAAA V22 visual lock adapter.
   Product layer may hide obsolete v03 product panels, but the approved v03 world remains untouched.
   In particular, keep the native minimap visible and do not replace any renderer function. */
(function(){
  'use strict';
  const frame=document.getElementById('engine');
  if(!frame)return;
  frame.addEventListener('load',()=>{
    const doc=frame.contentDocument;
    if(!doc||!doc.head)return;
    const style=doc.createElement('style');
    style.dataset.raluvaaaVisualLock='v03';
    style.textContent='.minimap{display:block!important}.side{display:grid!important}';
    doc.head.appendChild(style);
    try{
      frame.contentWindow.parent.postMessage({type:'raluvaaa-visual-lock-ready',baseline:'v03-17714b'},location.origin);
    }catch(_){ }
  });
})();
