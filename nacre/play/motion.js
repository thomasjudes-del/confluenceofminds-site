/* Render-side locomotion, separate from collision and puzzle state. */
(function(root){'use strict';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,k)=>a+(b-a)*k;
function ik(hx,hy,fx,fy,a=26,b=25){const dx=fx-hx,dy=fy-hy,d=clamp(Math.hypot(dx,dy),.001,a+b-.1),q=Math.atan2(dy,dx)-Math.acos(clamp((a*a+d*d-b*b)/(2*a*d),-1,1));return{x:hx+Math.cos(q)*a,y:hy+Math.sin(q)*a};}
// Convert a fixed world contact into the rotated torso drawing coordinates.
function contactHand(s,p,front){
 const normal=front?p.frontHand:p.backHand,c=p.contacts;if(!c)return normal;
 const flip=Math.abs(p.turn)<.18?Math.sign(p.turn||s.face)*.18:p.turn;
 const x=(c.x-s.x)/flip-(front?p.reach*1.3:0),y=c.y-s.y-p.bob-p.breath+45;
 const co=Math.cos(p.lean),si=Math.sin(p.lean);
 return {x:mix(normal.x,x*co+y*si,c.weight),y:mix(normal.y,-x*si+y*co-45,c.weight)};
}
class Motion{
 constructor(){this.reset();}
 reset(){this.phase=0;this.speed=0;this.activity=0;this.air=0;this.lean=0;this.turn=1;this.bob=0;this.cloth=0;this.clothV=0;this.lastX=null;this.lastFace=1;this.feet=[{x:4,y:0,anchor:null,stance:false},{x:-5,y:0,anchor:null,stance:false}];this.pose=null;}
 update(s,dt){dt=clamp(dt,0,.05);const dx=this.lastX===null?0:s.x-this.lastX,teleport=Math.abs(dx)>65;this.lastX=s.x;if(teleport){this.feet.forEach(f=>{f.anchor=null;f.stance=false;});this.phase=0;}
 const crouch=clamp(s.crouch||0,0,1);
 const signed=s.vx*s.face,speed=Math.abs(s.vx),run=clamp((speed-85)/235,0,1),backward=signed< -4;
 this.speed=mix(this.speed,speed,1-Math.exp(-dt*12));this.activity=mix(this.activity,s.onGround?clamp(speed/95,0,1):.65,1-Math.exp(-dt*14));this.air=mix(this.air,s.onGround?0:1,1-Math.exp(-dt*18));
 const stride=s.grabbing?94:mix(80*clamp(speed/85,.25,1),192,run),stance=s.grabbing?.56:mix(.62,.34,run),front=stride*stance*.5;
 if(!teleport&&s.onGround)this.phase+=Math.abs(dx)/stride;if(s.swimming)this.phase+=dt*(.45+.5*clamp(speed/185,0,1));
 const changed=s.face!==this.lastFace;if(changed){this.feet.forEach(f=>f.anchor=null);this.lastFace=s.face;}this.turn=mix(this.turn,s.face,1-Math.exp(-dt*24));
 const cycle=this.phase*TAU,landing=s.landing||0,targetBob=(Math.cos(cycle*2)*2.1-1.6)*run*this.activity+landing*6;
 this.bob=mix(this.bob,targetBob,1-Math.exp(-dt*20));
 const leanTarget=(s.climb?Math.sin(clamp(s.climb.t/.54,0,1)*Math.PI)*.36:0)+crouch*.30+(s.guiding?0:s.grabbing?.12*Math.sign(signed):(.12+.045*Math.sin(cycle))*run)+clamp((s.lean||0)*.16,-.08,.08);
 this.lean=mix(this.lean,leanTarget,1-Math.exp(-dt*8));
 const clothTarget=-clamp(signed/320,-1,1)*7+Math.sin(cycle-1.2)*3.2*this.activity;this.clothV+=(clothTarget-this.cloth)*65*dt;this.clothV*=Math.exp(-dt*12);this.cloth+=this.clothV*dt;
 const feet=[];
 for(let i=0;i<2;i++){const f=this.feet[i],ph=(this.phase+i*.5)%1,inStance=ph<stance,direction=backward?-1:1;let tx,ty,toe=0;
 if(inStance){if(!f.stance||f.anchor===null)f.anchor=s.x+s.face*direction*(front-stride*ph);tx=(f.anchor-s.x)*s.face;ty=0;toe=clamp((ph/stance-.78)/.22,0,1)*-.22*run;}else{f.anchor=null;const u=(ph-stance)/(1-stance),ease=u*u*(3-2*u);tx=direction*mix(-front,front,ease);ty=-6.75*u*(1-u)*(1-u)*(s.grabbing?9:mix(14,30,run));toe=Math.sin(u*Math.PI*2)*.38*run;}
 f.stance=inStance;
 if(speed<18){f.anchor=null;tx=i?-5:5;ty=0;toe=0;}
 ty*=this.activity*(1-crouch*.55);
 const airX=(i?14:-15)+(s.vy<0?i?3:-2:0),airY=s.vy<0?(i?-23:-12):(i?-5:-11);
 tx=mix(tx,airX,this.air);ty=mix(ty,airY,this.air);if(s.swimming){tx=(i?10:-10)+Math.sin(cycle+i*Math.PI)*16;ty=-8+Math.cos(cycle+i*Math.PI)*7;}
 if(s.climb){const u=clamp(s.climb.t/.54,0,1),plant=clamp((u-(i?.25:.62))/.22,0,1),e=plant*plant*(3-2*plant);tx=mix(tx,(s.climb.edge+s.face*(i?18:8)-s.x)*s.face,e);ty=mix(ty,s.climb.top-s.y,e);toe=0;}
 const smooth=speed<18||this.air>.01||this.activity<.9?1-Math.exp(-dt*20):1;f.x=mix(f.x,tx,smooth);f.y=mix(f.y,ty,smooth);
 const hip={x:i?2:-3,y:mix(-54,-40,clamp(this.speed/180,0,1))+this.bob+crouch*21},ankle={x:f.x,y:f.y-5},knee=ik(hip.x,hip.y,ankle.x,ankle.y);
 feet.push({hip,knee,ankle,x:f.x,y:f.y,toe,planted:inStance&&s.onGround&&speed>=18});
 }
 const reachLimit=50.9,pelvisDrop=Math.max(0,...feet.map(f=>f.ankle.y-Math.sqrt(Math.max(0,reachLimit*reachLimit-(f.ankle.x-f.hip.x)**2))-f.hip.y));
 for(const f of feet){f.hip.y+=pelvisDrop;f.knee=ik(f.hip.x,f.hip.y,f.ankle.x,f.ankle.y);}
 const reach=Math.sin(clamp(1-(s.actionAge||0)/.55,0,1)*Math.PI),carry=s.seed==='held',veil=s.veil||0;
 const swingHand=(phase,shoulder)=>{const swing=Math.sin(phase),upper=swing*(.38+.48*run),forearm=swing*.42;return{x:shoulder+Math.sin(upper)*22+Math.cos(forearm)*22,y:-72+Math.cos(upper)*22-Math.sin(forearm)*22};};
 const fh=swingHand(cycle+Math.PI,-4),bh=swingHand(cycle,-6);
 let frontHand={x:mix(8,fh.x,this.activity),y:mix(-43,fh.y,this.activity)},backHand={x:mix(-6,bh.x,this.activity),y:mix(-44,bh.y,this.activity)};
 if(s.swimming){frontHand={x:8+Math.sin(cycle)*18,y:-74-Math.cos(cycle)*70};backHand={x:8+Math.sin(cycle+Math.PI)*18,y:-74-Math.cos(cycle+Math.PI)*30};}
 if(carry)frontHand={x:23-veil*18+Math.sin(cycle+Math.PI)*(2+7*run)*(1-veil)*this.activity,y:-49+veil*9+Math.cos(cycle)*(1+5*run)*(1-veil)*this.activity};
 if(s.guiding&&!s.climb){frontHand={x:clamp((s.handleX-s.x)*s.face,-42,46),y:s.handleY-s.y-this.bob};backHand={x:frontHand.x-4,y:frontHand.y+5};}
 else if(s.grabbing){frontHand={x:clamp(Math.abs(s.grabOffset)-47,18,46),y:-52};backHand={x:frontHand.x-2,y:-48};}
 else if(reach>.01){frontHand.x=mix(frontHand.x,29,reach*.65);frontHand.y-=reach*7;}
 if(!s.onGround&&!s.climb&&!s.swimming){backHand.x=-18;backHand.y=-58;}
 const climbU=s.climb?clamp(s.climb.t/.54,0,1):0;
 const contacts=s.climb?{x:s.climb.edge,y:s.climb.top-2,weight:1-clamp((climbU-.52)/.22,0,1)}:null;
 this.pose={contacts,feet,bob:this.bob+pelvisDrop+crouch*21,lean:this.lean,turn:this.turn,cloth:this.cloth,activity:this.activity,run,phase:cycle,frontHand,backHand,headTilt:-this.lean*.55+Math.sin(s.time*1.3)*.012,breath:Math.sin(s.time*1.8)*.45,reach};return this.pose;
 }
}
const api={Motion,ik,contactHand};if(typeof module!=='undefined')module.exports=api;root.NacreMotion=api;
})(typeof window!=='undefined'?window:globalThis);
