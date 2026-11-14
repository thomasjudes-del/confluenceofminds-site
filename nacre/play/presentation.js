/* Presentation policy independent of browser events and simulation. */
(function(root){'use strict';
function landscapeRequired(touch,width,height){return !!touch&&height>width;}
function interpolate(previous,current,alpha){if(Math.abs(current.x-previous.x)>80||Math.abs(current.y-previous.y)>100)return current;const view={...current,x:previous.x+(current.x-previous.x)*alpha,y:previous.y+(current.y-previous.y)*alpha};for(const key of ['bodyTravelX','ferryClock','ferryBrake','ferryFill','exitGate'])if(Number.isFinite(previous[key])&&Number.isFinite(current[key])&&current[key]>=previous[key]-20)view[key]=previous[key]+(current[key]-previous[key])*alpha;return view;}
const api={landscapeRequired,interpolate};if(typeof module!=='undefined')module.exports=api;root.NacrePresentation=api;
})(typeof window!=='undefined'?window:globalThis);
