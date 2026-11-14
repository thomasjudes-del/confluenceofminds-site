/* Presentation-only contract. The proven convoy simulation remains in pixel units. */
(function(r){'use strict';
 const SCALE=1/60, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function point(x,y=510,z=0){return{x:x*SCALE,y:(510-y)*SCALE,z};}
 function camera(s,aspect=16/9){
  const chase=(s.chaseTime>=0&&!s.escaped)||(s.hunterTime>=0&&s.x<6100);
  const close=s.x>2120&&s.x<3050,swim=s.swimming;
  const distance=(close?11.5:chase?14.2:swim?12:11.5)*Math.max(1,1.48/Math.max(.5,aspect));
  const lead=chase?2.4:swim?1.6:close?1.1:1.65;
  const height=swim?.35:1.45+clamp((510-s.y)*SCALE,-.3,3)*.65;
  // Descend before the low shelter: otherwise its front beam hides the head.
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const shelter=smooth((s.x-4300)/190)*(1-smooth((s.x-4920)/180));
  const reveal=s.gate!==undefined?smooth((s.x-2150)/230)*(1-smooth((s.x-2810)/300)):0;
  if(reveal>0)return{x:s.x*SCALE+lead,y:height+(3.35-height)*reveal,z:distance+(14.8-distance)*reveal,eyeY:height+2.1+(4.85-height-2.1)*reveal,eyeOffset:-.4,fov:36};
  const c={x:s.x*SCALE+lead,y:height+(.72-height)*shelter,z:distance,eyeY:height+2.1+(1.12-height-2.1)*shelter,eyeOffset:chase?-1.3:-.4,fov:36};
  // Compose the shore before contact, then release into the final bay.
  // Spatial envelopes remain stable at rest and on checkpoint recovery.
  const shore=smooth((s.x-6750)/330)*(1-smooth((s.x-7330)/360));
  if(shore>0){
   const aspectScale=Math.max(1,1.48/Math.max(.5,aspect));
   c.x+=(s.x*SCALE+.65-c.x)*shore;
   c.y+=(.65-c.y)*shore;
   c.z+=(10.7*aspectScale-c.z)*shore;
   c.eyeY+=(4.45-c.eyeY)*shore;
   c.eyeOffset+=(-1.1-c.eyeOffset)*shore;
  }
  // The safe final bay opens slowly onto the rooted bloom, without taking control.
  const bay=s.gate!==undefined?smooth((s.x-7290)/160):0;
  if(bay>0){
   const aspectScale=Math.max(1,1.48/Math.max(.5,aspect));
   c.y+=(1.9-c.y)*bay;c.eyeY+=(4.2-c.eyeY)*bay;
   c.z+=(13.1*aspectScale-c.z)*bay;
   c.x+=(s.x*SCALE+.85-c.x)*bay;
  }
  return c;
 }
 function pose(s){return s.finished?'idle':s.climb?'climb':s.swimming?'swim':s.crouch>.45?'crouch':s.grabbing?'push':!s.onGround?'jump':Math.abs(s.vx)>15?'run':'idle';}
 const api={SCALE,point,camera,pose,clamp};if(typeof module!=='undefined')module.exports=api;r.NacreConservatoryView=api;
})(typeof window!=='undefined'?window:globalThis);
