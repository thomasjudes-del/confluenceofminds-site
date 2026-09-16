(function(){
'use strict';
let suppressSelectUntil=0;
function arm(){suppressSelectUntil=Date.now()+1400}
document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-accept],[data-decline]'))arm();
},true);
window.addEventListener('message',e=>{
  if(Date.now()<suppressSelectUntil&&e.data?.type==='rv25-select')e.stopImmediatePropagation();
},true);
})();
