/* NACRE split touch: left thumb movement/upward jump; right thumb interaction. */
(function(root){'use strict';class Gestures{
constructor(emit,context){this.emit=emit;this.context=context;this.points=new Map();this.axis=null;this.veil=false;}
down(id,x,y,width,now){const role=x<width*.5?'move':'action';if([...this.points.values()].some(p=>p.role===role))return;this.points.set(id,{x,y,sx:x,sy:y,jumpY:y,time:now,role,jumped:false,acted:false});}
move(id,x,y){
 const p=this.points.get(id);if(!p)return;const dx=x-p.sx;p.x=x;p.y=y;
 if(p.role!=='move')return;
 const radius=20;if(Math.abs(dx)>radius)p.sx=x-Math.sign(dx)*radius;
 const travel=x-p.sx;this.axis=Math.abs(travel)<=6?0:Math.sign(travel)*Math.min(1,.78+(Math.abs(travel)-6)/60);
 // Separate vertical hysteresis lets the thumb run, jump, lower and jump again.
 // Small drift cannot retrigger a jump or cancel the independent right-hand hold.
 if(p.jumped){p.jumpY=Math.min(p.jumpY,y);if(y-p.jumpY>=16){p.jumped=false;p.jumpY=y;}}
 else{p.jumpY=Math.max(p.jumpY,y);if(p.jumpY-y>=22){this.emit('jump');p.jumped=true;p.jumpY=y;}}
}
tick(now){for(const p of this.points.values()){if(p.role!=='action'||now-p.time<.18)continue;if(!p.acted&&this.context()){this.emit('interact');p.acted=true;}this.veil=true;}}
up(id,now,cancel=false){const p=this.points.get(id);if(!p)return;if(!cancel&&p.role==='action'&&!p.acted&&this.context())this.emit('interact');this.points.delete(id);if(p.role==='move')this.axis=null;else this.veil=false;}
clear(){this.points.clear();this.axis=null;this.veil=false;}
}if(typeof module!=='undefined')module.exports=Gestures;root.NacreGestures=Gestures;})(typeof window!=='undefined'?window:globalThis);
