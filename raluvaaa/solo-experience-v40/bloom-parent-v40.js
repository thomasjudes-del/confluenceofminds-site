(function(){
'use strict';

const frame=document.getElementById('engine');
if(!frame)return;

function inject(){
  try{
    const doc=frame.contentDocument;
    if(!doc?.body||doc.getElementById('raluvaaa-v40-bloom-patch'))return;
    const script=doc.createElement('script');
    script.id='raluvaaa-v40-bloom-patch';
    script.src='/raluvaaa/solo-experience-v40/engine-bloom-v40.js?build=v40-20260924-1';
    doc.body.appendChild(script);
  }catch(err){
    console.warn('RALUVAAA V40 bloom patch injection deferred',err?.message||err);
  }
}

frame.addEventListener('load',()=>setTimeout(inject,120));
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
  if(event.data?.type==='rv25-ready')setTimeout(inject,0);
});
setTimeout(inject,500);

window.__RALUVAAA_BLOOM_PARENT_V40__={version:40,inject};
})();