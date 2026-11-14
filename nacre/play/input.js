/* Own only gestures that begin inside the play surface, including Safari Touch Events. */
(function(root){'use strict';
function bind(surface,gestures,options){const {active,now,onPress=()=>{},onRelease=()=>{}}=options,touchNative=!!options.touchNative;let touchIds=new Set();const stop=e=>{if(e.cancelable)e.preventDefault();};const point=e=>{const r=surface.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top,width:r.width};};
function down(id,e){const p=point(e);gestures.down(id,p.x,p.y,p.width,now());onPress(p.x,p.y);}
function move(id,e){const p=point(e);gestures.move(id,p.x,p.y);}
function up(id,cancel){gestures.up(id,now(),cancel);onRelease();}
// Native touch handling prevents browser panning before it claims the gesture.
surface.addEventListener('touchstart',e=>{if(!active())return;stop(e);if(!touchNative)return;for(const t of e.changedTouches){touchIds.add(t.identifier);down('t'+t.identifier,t);}},{passive:false});
surface.addEventListener('touchmove',e=>{if(!active())return;stop(e);if(!touchNative)return;for(const t of e.changedTouches)if(touchIds.has(t.identifier))move('t'+t.identifier,t);},{passive:false});
for(const type of ['touchend','touchcancel'])surface.addEventListener(type,e=>{if(!active()&&!touchIds.size)return;stop(e);if(!touchNative)return;for(const t of e.changedTouches){if(touchIds.delete(t.identifier))up('t'+t.identifier,type==='touchcancel');}},{passive:false});
surface.addEventListener('pointerdown',e=>{if(!active()||(touchNative&&e.pointerType==='touch'))return;stop(e);try{surface.setPointerCapture(e.pointerId);}catch{}down('p'+e.pointerId,e);},{passive:false});
surface.addEventListener('pointermove',e=>{if(!active()||(touchNative&&e.pointerType==='touch'))return;stop(e);move('p'+e.pointerId,e);},{passive:false});
for(const type of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(type,e=>{if(touchNative&&e.pointerType==='touch')return;stop(e);up('p'+e.pointerId,type!=='pointerup');},{passive:false});
for(const type of ['contextmenu','selectstart','dragstart','gesturestart','gesturechange','gestureend'])surface.addEventListener(type,e=>{if(active())stop(e);},{passive:false});
return{clear(){touchIds.clear();gestures.clear();onRelease();},transport:touchNative?'touch':'pointer'};
}
const api={bind};if(typeof module!=='undefined')module.exports=api;root.NacreInput=api;
})(typeof window!=='undefined'?window:globalThis);
