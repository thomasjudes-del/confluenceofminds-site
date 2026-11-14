(function(r){'use strict';
const C={start:7800,end:8220,landing:8420,exit:8950,warning:1.6,fall:1.2,drop:90};
function sample(s){const t=Math.max(0,s.crustTime||0),p=Math.max(0,Math.min(1,(t-C.warning)/C.fall));return {progress:p,y:510+C.drop*p*p*(3-2*p),warning:t>0&&t<C.warning};}
const api={C,sample};if(typeof module!=='undefined')module.exports=api;r.NacreSaltCrust=api;globalThis.NacreSaltCrust=api;
})(typeof window!=='undefined'?window:globalThis);
