(function(){
'use strict';
function install(){
  const drawer=document.getElementById('drawer'),close=document.getElementById('drawerClose');
  if(!drawer||!close||typeof close.onclick!=='function')return false;
  document.querySelectorAll('[data-panel]').forEach(btn=>{
    if(btn.dataset.alphaWrapped==='1'||typeof btn.onclick!=='function')return;
    const native=btn.onclick;
    btn.onclick=function(ev){
      const wasHidden=drawer.classList.contains('hidden');
      if(wasHidden) close.onclick();
      native.call(this,ev);
      if(wasHidden&&drawer.classList.contains('hidden')){
        close.onclick();
        native.call(this,ev);
      }
    };
    btn.dataset.alphaWrapped='1';
  });
  return true;
}
let tries=0;const timer=setInterval(()=>{if(install()||++tries>120)clearInterval(timer)},25);
})();
