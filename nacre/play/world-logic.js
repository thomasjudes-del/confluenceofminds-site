/* Extended 3D passages. Painted fragments and trailer keep frontier-logic.js. */
(function(root){'use strict';
const Crust=typeof module!=='undefined'?require('./salt-crust.js'):root.NacreSaltCrust;
const Pulse=typeof module!=='undefined'?require('./cistern-pulse.js'):root.NacreCisternPulse;
const Ferry=typeof module!=='undefined'?require('./ferry-motion.js'):root.NacreFerryMotion;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function createState(chapter='desert'){return {chapter,x:120,y:510,vx:0,vy:0,face:1,onGround:true,time:0,seed:'none',veil:0,actionAge:9,landing:0,lean:0,stoneX:850,bridge:0,water:0,pressure:0,shutter:0,shutterLatched:false,drain:0,drainOpen:false,gate:0,gateLatched:false,pulseClock:0,pulseHit:0,ferryFill:0,exitGate:0,exitLatched:false,ferryClock:0,ferryBrake:0,braking:false,bodyTravelX:0,grabbing:false,grabOffset:100,finished:false,deaths:0,checkpoint:0,crustTime:0,shelterX:4900,movingShelter:false,stormClock:0,exposure:0,respawn:0,coyote:.1,jumpBuffer:0};}
const saltShelters=[4900,5500,6100,6700];
function saltWeather(s){const phase=((s.stormClock||0)%10+10)%10;return {phase,warning:phase>=4&&phase<6,blast:phase>=6&&phase<9,sheltered:[s.shelterX??4900,...saltShelters.slice(1)].some(x=>Math.abs(s.x-x)<=100),active:s.x>4800&&s.x<6900};}
function saltCoverage(x){return clamp((Math.min(x+50,1174)-Math.max(x-50,1066))/100,0,1);}
// Same dimensions drive the collision and the visible portcullis (60 units/metre).
const saltGate={x:2820,halfWidth:9,bodyRadius:14,bodyHeight:102,floor:510,height:169,travel:210};
const cisternGate={x:1870,halfWidth:12,bodyRadius:14,bodyHeight:102,floor:340,height:180,travel:210};
function cisternHydraulics(s){return {target:clamp((s.water-.40)/.24,0,1),basinY:s.water*3.4-.3,flow:s.drainOpen?clamp(s.water/.25,0,1):0};}
function gateOverlap(s,y=s.y,g=cisternGate,opening=s.gate){const bottom=g.floor-opening*g.travel;return y>bottom-g.height&&y-g.bodyHeight<bottom;}
function brakeReach(s){return s.chapter==='red'&&s.drainOpen&&s.onGround&&Math.abs(s.y-400)<3&&s.x>3550&&s.x<4200&&Math.abs(s.x-ferryX(s)-36)<30;}
function shelterReach(s){return s.chapter==='desert'&&s.onGround&&Math.abs(s.x-(s.shelterX??4900))<42;}
function interactable(s){if(shelterReach(s))return true;if(brakeReach(s))return true;return s.chapter==='desert'?(Math.abs(s.x-s.stoneX)<70||Math.abs(s.x-2600)<65)&&s.onGround:(Math.abs(s.x-530)<65||Math.abs(s.x-2180)<65)&&s.onGround;}
function ferryX(s){return Ferry.sample(s.ferryClock||0).x;}
function floors(s){return s.chapter==='desert'?[[0,1320,510],[1660,7800,510],[7800,8220,Crust.sample(s).y],[8220,9200,600],...(s.bridge>.92?[[1320,1660,510]]:[])]:[[0,700,510],[860,1210,560-s.water*220],[1300,2450,340],[2490,2670,510],[2760,2920,480],[3010,3190,450],[3270,3550,400],[4200,6800,400],[ferryX(s)-120,ferryX(s)+120,400]];}
function restart(s){const n=createState(s.chapter),deaths=s.deaths+1,time=s.time;if(s.checkpoint){n.checkpoint=1;if(s.chapter==='desert'){n.x=s.checkpoint>=5?8500:s.checkpoint>=4?7650:s.checkpoint>=3?4900:s.checkpoint>=2?3000:1740;n.checkpoint=s.checkpoint;if(s.checkpoint>=5){n.y=600;n.crustTime=3;}n.stoneX=1120;n.bridge=1;n.shutterLatched=s.checkpoint>=2;n.shutter=n.shutterLatched?1:0;}else{n.x=s.checkpoint>=2?2180:1450;n.y=340;n.water=s.checkpoint>=2?.08:.8;n.pressure=n.water;n.checkpoint=s.checkpoint;n.drainOpen=s.checkpoint>=2;n.drain=n.drainOpen?1:0;n.gateLatched=true;n.gate=1;if(s.checkpoint>=3){n.x=3380;n.y=400;}if(s.checkpoint>=4){n.x=4810;n.y=400;n.exitGate=1;n.exitLatched=true;}}}Object.assign(s,n,{deaths,time});}
function step(s,input={},dt=1/60){if(s.paused)return;s.events=[];dt=Math.min(dt,1/30);if(s.finished)return;s.time+=dt;if(s.chapter==='red'&&s.x>4750)s.pulseClock+=dt;if(s.chapter==='desert'&&s.x>4700)s.stormClock=(s.stormClock||0)+dt;s.actionAge+=dt;s.landing=Math.max(0,s.landing-dt*4);if(s.respawn>0){s.respawn-=dt;if(s.respawn<=0)restart(s);return;}
if(s.chapter==='desert'){
const before=Crust.sample(s),riding=s.onGround&&s.x>7800&&s.x<8220&&Math.abs(s.y-before.y)<3;
if((s.crustTime||0)>0||riding){const old=s.crustTime||0;s.crustTime=Math.min(3,old+dt);if(old===0)s.events.push('crust-warning');if(old<1.6&&s.crustTime>=1.6)s.events.push('crust-fall');if(riding)s.y=Crust.sample(s).y;}
}
const axis=clamp(input.axis||0,-1,1),hold=!!input.hold;s.movingShelter=hold&&!input.jump&&shelterReach(s);s.braking=hold&&!input.jump&&brakeReach(s);s.grabbing=hold&&(!shelterReach(s)||s.movingShelter)&&interactable(s)&&(!brakeReach(s)||s.braking);s.ferryBrake=clamp((s.ferryBrake||0)+dt*(s.braking?4:-2),0,1);if(axis)s.face=Math.sign(axis);
if(s.chapter==='red'&&s.drainOpen&&(s.x>3300||s.ferryClock>0)){const oldClock=s.ferryClock||0,before=ferryX(s),riding=s.onGround&&s.x>3550&&s.x<4200&&Math.abs(s.x-before)<=120&&Math.abs(s.y-400)<3;s.ferryClock=oldClock+dt*(1-s.ferryBrake);if(riding)s.x+=ferryX(s)-before;if(Ferry.crossings(oldClock,s.ferryClock,1.35))s.events.push('ferry-release');if(Ferry.crossings(oldClock,s.ferryClock,6))s.events.push('ferry-dock');}
const onRaft=s.chapter==='red'&&s.onGround&&s.x>=860&&s.x<=1210;
if(s.chapter==='desert'){const coverage=saltCoverage(s.stoneX),pressed=coverage>=.6;s.saltLoad=clamp(coverage+(s.onGround&&Math.abs(s.x-1120)<54?.25:0),0,1);const oldBridge=s.bridge;s.bridge=clamp(s.bridge+dt*(pressed?.65:-.5),0,1);if(oldBridge<.92&&s.bridge>=.92)s.events.push('gate-ready');const winding=s.grabbing&&Math.abs(s.x-2600)<65;const before=s.shutter;s.shutter=clamp(s.shutter+dt*(s.shutterLatched?2:winding?.65:-.12),0,1);if(Math.abs(s.x-saltGate.x)<saltGate.halfWidth+saltGate.bodyRadius&&gateOverlap(s,s.y,saltGate,s.shutter)&&s.shutter<before)s.shutter=before;}else{const pumping=s.grabbing&&Math.abs(s.x-530)<65,venting=s.grabbing&&Math.abs(s.x-2180)<65;s.drain=clamp(s.drain+dt*(venting?.5:-.3),0,1);if(s.drain>.99){if(!s.drainOpen)s.events.push('latch');s.drainOpen=true;s.checkpoint=Math.max(s.checkpoint,2);}s.pressure=clamp(s.pressure+dt*(s.drainOpen?-.2:pumping?.35:-.012),0,1);s.water=clamp(s.water+clamp(s.pressure-s.water,-(s.drainOpen?.13:.035)*dt,.06*dt),0,1);const desired=s.gateLatched?1:cisternHydraulics(s).target;
const previousGate=s.gate;s.gate+=clamp(desired-s.gate,-dt*.4,dt*.5);
// A body already under the moving gate prevents a closing stroke.
if(Math.abs(s.x-cisternGate.x)<cisternGate.halfWidth+cisternGate.bodyRadius&&gateOverlap(s)&&s.gate<previousGate)s.gate=previousGate;
if(s.gate>=.999&&!s.gateLatched){s.gate=1;s.gateLatched=true;s.events.push('gate-ready');}
if(onRaft)s.y=560-s.water*220;
const g=Ferry.exitGate,was=s.exitGate||0;
s.ferryFill=clamp((s.ferryFill||0)+dt*(s.drainOpen?Ferry.catchment(s.ferryClock)*Ferry.receiver.fillRate-Ferry.receiver.leakRate:0),0,1);
const target=s.exitLatched?1:clamp((s.ferryFill-.22)/.5,0,1);
s.exitGate=was+clamp(target-was,-dt*.25,dt*.6);
if(Math.abs(s.x-g.x)<g.halfWidth+g.bodyRadius&&gateOverlap(s,s.y,g,s.exitGate)&&s.exitGate<was)s.exitGate=was;
if(was<.99&&s.exitGate>=.99)s.events.push('transfer-ready');
if(s.x>g.x+g.halfWidth+g.bodyRadius&&s.exitGate>.5&&!s.exitLatched){s.exitLatched=true;s.events.push('latch');}
}
let target=axis*(s.grabbing?108:315);if(s.chapter==='desert'&&s.x>1880&&s.x<2680&&!s.grabbing&&axis){const gust=Math.max(0,Math.sin(s.time*.9));target-=gust*80;}
s.vx+=(target-s.vx)*(1-Math.exp(-dt*(axis?14:20)));if(Math.abs(s.vx)<.1)s.vx=0;const oldX=s.x;let nx=clamp(s.x+s.vx*dt,25,s.chapter==='desert'?9150:6750);
if(s.chapter==='desert'){
 // Block the visible face while the descending deck is above the lower path.
 const crustEdge=Crust.C.end+saltGate.bodyRadius;
 if(oldX>=Crust.C.end&&nx<crustEdge&&s.y>Crust.sample(s).y+1){nx=crustEdge;s.vx=0;}
 if(oldX>=7800&&nx<7800&&s.y>511){nx=7800;s.vx=0;}
 if(s.movingShelter){const before=s.shelterX;s.shelterX=clamp(before+nx-oldX,4900,5260);nx=oldX+s.shelterX-before;}
 if(s.grabbing&&Math.abs(s.x-s.stoneX)<70){const before=s.stoneX;s.stoneX=clamp(s.stoneX+nx-oldX,760,1210);nx=oldX+s.stoneX-before;}
 else if(s.y>445&&Math.abs(nx-s.stoneX)<55){nx=s.stoneX+(oldX<s.stoneX?-55:55);s.vx=0;}
}
for(const [g,opening] of (s.chapter==='desert'?[[saltGate,s.shutter]]:[[cisternGate,s.gate],[Ferry.exitGate,s.exitGate]])){if(!gateOverlap(s,s.y,g,opening))continue;
 const edge=g.halfWidth+g.bodyRadius,left=g.x-edge,right=g.x+edge;
 if(oldX<=left&&nx>left){nx=left;s.vx=0;}
 else if(oldX>=right&&nx<right){nx=right;s.vx=0;}
}

if(s.chapter==='desert'&&!s.shutterLatched){if(oldX<=2860&&nx>2860&&s.shutter>.49){s.shutterLatched=true;s.checkpoint=Math.max(s.checkpoint,2);s.events.push('latch');}}s.bodyTravelX=(s.bodyTravelX||0)+nx-oldX;s.x=nx;
const f=floors(s);if(s.onGround&&!f.some(([a,b,y])=>s.x>=a&&s.x<=b&&Math.abs(s.y-y)<3))s.onGround=false;
s.coyote=s.onGround?.11:Math.max(0,s.coyote-dt);s.jumpBuffer=input.jump?.12:Math.max(0,s.jumpBuffer-dt);
if(s.jumpBuffer>0&&s.coyote>0&&!s.grabbing){s.vy=-510;s.onGround=false;s.coyote=0;s.jumpBuffer=0;}
if(!s.onGround){const py=s.y;s.vy+=1350*dt;s.y+=s.vy*dt;
if(s.vy<0)for(const [g,opening] of (s.chapter==='desert'?[[saltGate,s.shutter]]:[[cisternGate,s.gate],[Ferry.exitGate,s.exitGate]])){if(Math.abs(s.x-g.x)<g.halfWidth+g.bodyRadius){const bottom=g.floor-opening*g.travel;if(py-g.bodyHeight>=bottom&&s.y-g.bodyHeight<bottom){s.y=bottom+g.bodyHeight;s.vy=0;}}}
for(const [a,b,y] of f){if(s.x>=a&&s.x<=b&&s.vy>=0&&py<=y+1&&s.y>=y){s.y=y;s.vy=0;s.onGround=true;s.landing=.55;break;}}}
if(s.y>820||(s.chapter==='red'&&s.x>2450&&s.x<3270&&s.water>.2&&s.y>510-(s.water*3.4-.3)*60+20))s.respawn=.45;
if(s.chapter==='desert'&&s.x>1730||s.chapter==='red'&&s.x>1400&&s.onGround)s.checkpoint=Math.max(s.checkpoint,1);
if(s.chapter==='desert'){if(s.x>8420&&s.onGround)s.checkpoint=Math.max(s.checkpoint,5);else if(s.x>7550&&s.x<7800&&s.onGround)s.checkpoint=Math.max(s.checkpoint,4);if(s.x>4800)s.checkpoint=Math.max(s.checkpoint,3);const weather=saltWeather(s);s.exposure=clamp((s.exposure||0)+dt*(weather.active&&weather.blast&&!weather.sheltered?1:-2),0,1);if(s.exposure>=1)s.respawn=.45;}
if(s.chapter==='red'&&s.drainOpen&&s.x>3350&&s.onGround)s.checkpoint=Math.max(s.checkpoint,3);
if(s.chapter==='red'){if(s.x>4750&&s.onGround&&s.checkpoint<4){s.checkpoint=4;s.pulseClock=2;}s.pulseHit=clamp(s.pulseHit+dt*(Pulse.danger(s)?4:-3),0,1);if(s.pulseHit>=1)s.respawn=.6;}
if(s.x>(s.chapter==='desert'?Crust.C.exit:6600))s.finished=true;
}
const api={crust:Crust,shelterReach,saltGate,pulse:Pulse,exitGate:Ferry.exitGate,catchment:Ferry.catchment,brakeReach,ferryX,cisternGate,cisternHydraulics,gateOverlap,saltWeather,saltShelters,saltCoverage,createState,step,interactable,floors,restart};if(typeof module!=='undefined')module.exports=api;root.NacreWorlds=api;
})(typeof window!=='undefined'?window:globalThis);
