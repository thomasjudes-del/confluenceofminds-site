/* Shared kinematics: simulation, fittings and foley use the same cycle. */
(function(r){'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),smooth=x=>x*x*(3-2*x);
function sample(clock=0){
 const t=((clock%12)+12)%12,leg=t%6,direction=t<6?1:-1,u=clamp((leg-2)/4,0,1);
 const moving=leg>=2,prepare=!moving?smooth(clamp((leg-1.35)/.65,0,1)):1-smooth(clamp((leg-5.6)/.4,0,1));
 return {x:direction>0?3660+420*smooth(u):4080-420*smooth(u),velocity:moving?direction*630*u*(1-u):0,direction,moving,prepare,brake:1-prepare,dock:!moving?direction:0};
}
function crossings(before,after,offset){return Math.floor((after-offset+1e-9)/6)>Math.floor((before-offset+1e-9)/6);}
const receiver={streamX:3890,halfWidth:72,jetRadius:9,fillRate:.38,leakRate:.035};
const exitGate={x:4370,halfWidth:12,bodyRadius:14,bodyHeight:102,floor:400,height:210,travel:220};
function catchment(clock){const x=sample(clock).x,g=receiver;return clamp((Math.min(x+g.halfWidth,g.streamX+g.jetRadius)-Math.max(x-g.halfWidth,g.streamX-g.jetRadius))/(2*g.jetRadius),0,1);}
const api={sample,crossings,receiver,exitGate,catchment};if(typeof module!=='undefined')module.exports=api;r.NacreFerryMotion=api;
})(typeof window!=='undefined'?window:globalThis);
