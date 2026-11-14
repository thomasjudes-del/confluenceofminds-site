/* Two standalone playable frontiers. Fixed-step simulation shared by game and trailer. */
(function(root){'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function createState(chapter='desert'){return {chapter,x:120,y:510,vx:0,vy:0,face:1,onGround:true,time:0,seed:'none',veil:0,actionAge:9,landing:0,lean:0,stoneX:850,bridge:0,water:0,pressure:0,gate:0,grabbing:false,grabOffset:100,finished:false,deaths:0,checkpoint:0,respawn:0,coyote:.1,jumpBuffer:0};}
function interactable(s){return s.chapter==='desert'?Math.abs(s.x-s.stoneX)<70&&s.onGround:Math.abs(s.x-530)<65&&s.onGround;}
function floors(s){return s.chapter==='desert'?[[0,1320,510],[1660,3300,510],...(s.bridge>.92?[[1320,1660,510]]:[])]:[[0,700,510],[860,1210,560-s.water*220],[1300,2500,340]];}
function restart(s){const n=createState(s.chapter),deaths=s.deaths+1,time=s.time;if(s.checkpoint){n.checkpoint=1;if(s.chapter==='desert'){n.x=1740;n.stoneX=1120;n.bridge=1;}else{n.x=1450;n.y=340;n.water=.8;}}Object.assign(s,n,{deaths,time});}
function step(s,input={},dt=1/60){dt=Math.min(dt,1/30);if(s.finished)return;s.time+=dt;s.actionAge+=dt;s.landing=Math.max(0,s.landing-dt*4);if(s.respawn>0){s.respawn-=dt;if(s.respawn<=0)restart(s);return;}
const axis=clamp(input.axis||0,-1,1),hold=!!input.hold;s.grabbing=hold&&interactable(s);if(axis)s.face=Math.sign(axis);
const onRaft=s.chapter==='red'&&s.onGround&&s.x>=860&&s.x<=1210;
if(s.chapter==='desert'){const pressed=Math.abs(s.stoneX-1120)<43;s.bridge=clamp(s.bridge+dt*(pressed?.65:-.5),0,1);}else{s.pressure=clamp(s.pressure+dt*(s.grabbing?.35:-.012),0,1);s.water=clamp(s.water+clamp(s.pressure-s.water,-.035*dt,.06*dt),0,1);s.gate=(Math.sin(s.time*.85)>-.15?1:0);if(onRaft)s.y=560-s.water*220;}
let target=axis*(s.grabbing?108:315);if(s.chapter==='desert'&&s.x>1880&&s.x<2680){const gust=Math.max(0,Math.sin(s.time*.9));target-=gust*80;}
s.vx+=(target-s.vx)*(1-Math.exp(-dt*(axis?14:20)));if(Math.abs(s.vx)<.1)s.vx=0;const oldX=s.x;let nx=clamp(s.x+s.vx*dt,25,s.chapter==='desert'?3250:2460);
if(s.chapter==='desert'){
 if(s.grabbing){const before=s.stoneX;s.stoneX=clamp(s.stoneX+nx-oldX,760,1210);nx=oldX+s.stoneX-before;}
 else if(s.y>445&&Math.abs(nx-s.stoneX)<55){nx=s.stoneX+(oldX<s.stoneX?-55:55);s.vx=0;}
}else if(s.x<1910&&nx>1870&&!s.gate&&s.y>260){nx=1870;s.vx=0;}
s.x=nx;
const f=floors(s);if(s.onGround&&!f.some(([a,b,y])=>s.x>=a&&s.x<=b&&Math.abs(s.y-y)<3))s.onGround=false;
s.coyote=s.onGround?.11:Math.max(0,s.coyote-dt);s.jumpBuffer=input.jump?.12:Math.max(0,s.jumpBuffer-dt);
if(s.jumpBuffer>0&&s.coyote>0&&!s.grabbing){s.vy=-510;s.onGround=false;s.coyote=0;s.jumpBuffer=0;}
if(!s.onGround){const py=s.y;s.vy+=1350*dt;s.y+=s.vy*dt;for(const [a,b,y] of f){if(s.x>=a&&s.x<=b&&s.vy>=0&&py<=y+1&&s.y>=y){s.y=y;s.vy=0;s.onGround=true;s.landing=.55;break;}}}
if(s.y>820)s.respawn=.45;
if(s.chapter==='desert'&&s.x>1730||s.chapter==='red'&&s.x>1400&&s.onGround)s.checkpoint=1;
if(s.x>(s.chapter==='desert'?3120:2350))s.finished=true;
}
const api={createState,step,interactable,floors,restart};if(typeof module!=='undefined')module.exports=api;root.NacreFrontier=api;
})(typeof window!=='undefined'?window:globalThis);
