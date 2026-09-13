/* RALUVAAA V19: historical engine roots are rendering scaffolding, not product-semantic wish roots. */
(function(){
  'use strict';
  const frame=document.getElementById('engine');
  if(!frame)return;

  function inject(){
    const doc=frame.contentDocument;
    if(!doc||!doc.body)return;
    const script=doc.createElement('script');
    script.textContent=`(function(){
      try{
        /* Root A/B/C and g12/g13 labels belong to the old engine model.
           They are intentionally hidden until roots correspond to actual wish lineages. */
        drawLabels=function(){};
        parent.postMessage({type:'raluvaaa-v19-labels-ready'},location.origin);
      }catch(err){parent.postMessage({type:'raluvaaa-renderer-error',message:String(err&&err.message||err)},location.origin);}
    })();`;
    doc.body.appendChild(script);
  }
  frame.addEventListener('load',()=>setTimeout(inject,0));
})();
