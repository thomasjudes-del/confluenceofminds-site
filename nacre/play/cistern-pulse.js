(function(r){'use strict';
const vents=[{x:5180,half:85,offset:0},{x:5760,half:85,offset:4}];
function sample(s,i){const v=vents[i],phase=((s.pulseClock||0)+v.offset)%12;return {...v,phase,warning:phase>=2&&phase<4,blast:phase>=4&&phase<7,pressure:phase<4?phase/4:phase<7?1:Math.max(0,1-(phase-7)/2)};}
function danger(s){return vents.some((v,i)=>Math.abs(s.x-v.x)<v.half&&sample(s,i).blast);}
const api={vents,sample,danger};if(typeof module!=='undefined')module.exports=api;r.NacreCisternPulse=api;
})(typeof window!=='undefined'?window:globalThis);
