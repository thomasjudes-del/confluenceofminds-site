/* NACRE 0.6: deterministic simulation, no rendering or browser dependencies. */
(function(root){'use strict';
const C={ground:510,water:578,world:7000,start:190,seed:470,firstIris:760,socket:1432,mirror:1298,gapStart:1570,gapEnd:2145,iris:1990,altar:6670,speed:320,gravity:1350,jump:450,chargeRate:.44,decayRate:.06,crumbleDelay:.85,crumbleSpeed:360,crumbleStart:2470,crumbleEnd:3170,crumbleGapStart:2780,crumbleGapEnd:2890,liftStart:3980,liftEnd:4140,liftLever:3925,terraceEnd:4380,cartStart:3790,plate:3550,sluice:4210,watchStart:4500,watchEnd:5960,signals:[4820,5480],shelters:[4590,5180,5770]};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const approach=(v,target,amount)=>v<target?Math.min(v+amount,target):Math.max(v-amount,target);
function createState(){return {x:C.start,y:C.ground,vx:0,vy:0,face:1,walk:0,onGround:true,seed:'nest',charge:0,charges:[0,0],bridges:[0,0],bridge:0,mirror:0,mirrorAngle:0,mirrorHold:0,guiding:false,handleX:0,handleY:0,iris:0,concealed:false,veil:0,time:0,respawn:0,checkpoint:C.start,started:false,paused:false,finished:false,ending:0,offered:false,events:[],actionAge:9,fallCount:0,chargedOnce:false,pickedOnce:false,across:false,passedIris:false,stepClock:0,interaction:null,coyote:.1,jumpBuffer:0,landing:0,lean:0,blocked:0,focus:0,focusTime:0,collapseTime:0,escaped:false,fracture:0,actionKind:null,cartX:C.cartStart,cartV:0,grabbing:false,grabOffset:0,sluice:0,weightOn:false,sluicePassed:false,watchTime:0,watchAlert:0,watchTarget:4800,signals:[0,0],watchPassed:false,chapter:0,lift:0,liftCall:0,firstIris:1,firstPassed:false,introBlocked:0};}
function bridgeHeight(x){return C.ground-24*Math.sin(clamp((x-C.gapStart)/(C.gapEnd-C.gapStart),0,1)*Math.PI);}
function collapseFront(s){return s.collapseTime>0?C.crumbleStart+Math.max(0,s.collapseTime-C.crumbleDelay)*C.crumbleSpeed:C.crumbleStart-1;}
function floorAt(s,x){if(x>=C.liftStart&&x<C.liftEnd)return C.ground-140*s.lift;if(x>=C.liftEnd&&x<C.terraceEnd)return C.ground-140;if(Math.abs(x-s.cartX)<40)return C.ground-78;if(x>C.crumbleGapStart&&x<C.crumbleGapEnd)return Infinity;if(x>C.crumbleStart&&x<C.crumbleEnd&&s.collapseTime>C.crumbleDelay&&x<collapseFront(s))return Infinity;if(x>C.gapStart&&x<C.gapEnd){const side=x<(C.gapStart+C.gapEnd)/2?0:1;return s.bridges[side]>.86?bridgeHeight(x):Infinity;}if(x>960&&x<1013)return Infinity;return C.ground;}
function nearby(s){if(s.offered||s.respawn>0||!s.onGround)return null;if(s.seed==='nest'&&Math.abs(s.x-C.seed)<58)return 'take';if(Math.abs(s.x-C.liftLever)<44)return 'callLift';if(Math.abs(s.x-s.cartX)<88&&s.x>3300)return 'grab';if(Math.abs(s.x-C.mirror)<49)return 'reflect';if(Math.abs(s.x-C.socket)<55){if(s.seed==='held')return 'place';if(s.seed==='socket')return 'retrieve';}if(Math.abs(s.x-C.altar)<75&&s.seed==='held')return 'offer';return null;}
function interact(s){const n=nearby(s);s.actionAge=0;s.actionKind=n;
if(n==='take'){s.seed='held';s.pickedOnce=true;s.events.push('take');}
if(n==='place'){s.seed='socket';s.events.push('place');s.focus=1;s.focusTime=3;}
if(n==='retrieve'){s.seed='held';s.events.push('retrieve');}
if(n==='reflect'){s.mirrorHold=.25;s.events.push('reflect');s.focus=1;s.focusTime=2.7;}
if(n==='callLift'){s.liftCall=3.1;s.events.push('sluice');}if(n==='grab'){s.events.push('grab');}if(n==='offer'){s.seed='altar';s.offered=true;s.events.push('offer');}return n;}
function step(s,input,dt){dt=clamp(dt,0,1/30);s.events.length=0;if(!s.started||s.paused||s.finished)return;s.time+=dt;s.actionAge+=dt;s.focusTime=Math.max(0,s.focusTime-dt);s.landing=Math.max(0,s.landing-dt*3);s.fracture=Math.max(0,s.fracture-dt*2);
if(s.offered){s.ending+=dt;s.vx=approach(s.vx,0,1000*dt);s.veil=approach(s.veil,0,dt*3);if(s.ending>9.5){s.finished=true;s.events.push('finish');}return;}
if(s.respawn>0){s.respawn=Math.max(0,s.respawn-dt);if(s.respawn===0){if(s.seed==='socket')s.across=false;s.collapseTime=0;s.escaped=false;s.x=s.checkpoint>=6020?6020:s.checkpoint>=4480?4480:s.checkpoint>=3250?3250:s.across?2220:(s.checkpoint>=1230?1230:(s.pickedOnce?830:C.start));s.watchAlert=0;s.watchTime=0;s.grabbing=false;s.y=C.ground;s.vx=s.vy=0;s.onGround=true;s.coyote=.1;s.jumpBuffer=0;s.concealed=false;s.veil=0;if(s.seed==='socket')s.seed='held';s.charges=[0,0];s.bridges=[0,0];s.bridge=s.charge=0;s.events.push('reborn');}return;}
if(input.interact)interact(s);
s.liftCall=Math.max(0,s.liftCall-dt);if(input.veil&&Math.abs(s.x-C.liftLever)<55)s.liftCall=Math.max(s.liftCall,.5);
s.lift=approach(s.lift,s.weightOn&&s.liftCall<=0?1:0,dt*.62);if(s.onGround&&s.x>=C.liftStart&&s.x<C.liftEnd)s.y=C.ground-140*s.lift;

const wasGrabbing=s.grabbing;s.grabbing=!!input.veil&&s.onGround&&s.y>495&&!input.jump&&Math.abs(s.x-s.cartX)<90&&s.x>3300&&s.x<4000;if(s.grabbing&&!wasGrabbing){s.grabOffset=s.x-s.cartX;s.events.push('grab');}s.concealed=!!input.veil&&s.seed==='held'&&!s.grabbing;s.veil=approach(s.veil,s.concealed?1:0,dt*5);
s.mirrorHold=Math.max(0,s.mirrorHold-dt);const guiding=(input.veil&&Math.abs(s.x-C.mirror)<58&&s.onGround)||s.mirrorHold>0;s.mirrorAngle=approach(s.mirrorAngle,guiding?1:0,dt*(guiding?4.5:2.7));s.mirror=s.mirrorAngle>.5?1:0;s.guiding=!!guiding;const tilt=-.32+s.mirrorAngle*.64;s.handleX=C.mirror+Math.cos(tilt)*29-Math.sin(tilt)*50;s.handleY=407+Math.sin(tilt)*29+Math.cos(tilt)*50;
for(let i=0;i<2;i++){const lit=s.seed==='socket'&&(i===0?s.mirrorAngle<.12:s.mirrorAngle>.88);s.charges[i]=clamp(s.charges[i]+(lit?(i===0?2.2:.55):-(i===0?.10:.04))*dt,0,1);const target=clamp(s.charges[i]/.65,0,1);s.bridges[i]+=(target-s.bridges[i])*Math.min(1,dt*2.6);}
s.charge=Math.min(...s.charges);s.bridge=Math.min(...s.bridges);
if(s.charges[s.mirror]>.985&&!s.chargedOnce){s.chargedOnce=true;s.events.push('charged');}
const dark=s.seed!=='held'||s.veil>.72;s.firstIris=approach(s.firstIris,s.firstPassed||dark?1:0,dt*(dark?2.2:1.8));s.iris=approach(s.iris,dark?1:0,dt*(dark?1.5:1.1));
const dir=(input.right?1:0)-(input.left?1:0);const analog=input.axis===undefined?dir:clamp(input.axis,-1,1);const prevVX=s.vx;
const pace=s.grabbing?.40:s.concealed?.82:1;s.vx=approach(s.vx,analog*C.speed*pace,dt*(analog?2300:2900));if(s.grabbing)s.face=s.grabOffset<0?1:-1;else if(Math.abs(analog)>.1)s.face=Math.sign(analog);s.lean+=(clamp((s.vx-prevVX)/dt/1700,-.25,.25)-s.lean)*Math.min(1,dt*9);
if(input.jump)s.jumpBuffer=.13;else s.jumpBuffer=Math.max(0,s.jumpBuffer-dt);
s.coyote=s.onGround?.12:Math.max(0,s.coyote-dt);if(s.jumpBuffer>0&&s.coyote>0){s.vy=-C.jump;s.onGround=false;s.coyote=0;s.jumpBuffer=0;s.events.push('jump');}
if(s.guiding&&Math.abs(analog)<.1){s.vx=clamp((s.handleX-s.face*27-s.x)*9,-120,120);}
const oldX=s.x,oldY=s.y;s.x=clamp(s.x+s.vx*dt,70,C.world-130);
// A heavy rolling specimen carriage provides a physical counterweight.
if(s.grabbing){const desired=clamp(s.x-s.grabOffset,3415,3900);s.cartV=(desired-s.cartX)/dt;s.cartX=desired;s.x=s.cartX+s.grabOffset;}else{s.cartV=approach(s.cartV,0,dt*900);s.cartX=clamp(s.cartX+s.cartV*dt,3415,3900);}
if(s.y>C.ground-68&&!s.grabbing){if(oldX<=s.cartX-52&&s.x>s.cartX-52)s.x=s.cartX-52;if(oldX>=s.cartX+52&&s.x<s.cartX+52)s.x=s.cartX+52;}
s.weightOn=Math.abs(s.cartX-C.plate)<38;const beforeGate=s.sluice;s.sluice=approach(s.sluice,s.weightOn?1:0,dt*(s.weightOn?.7:.45));if(beforeGate<.05&&s.sluice>=.05){s.events.push('sluice');s.focus=2;s.focusTime=2.2;}
function wall(x,closed){if(!closed)return;if(oldX<=x-25&&s.x>x-25){s.x=x-25;s.vx=0;}else if(oldX>=x+25&&s.x<x+25){s.x=x+25;s.vx=0;}}
wall(C.firstIris,s.firstIris<.84&&!s.firstPassed);s.introBlocked=s.firstIris<.84&&!s.firstPassed&&Math.abs(s.x-C.firstIris)<27&&Math.abs(analog)>.1?s.introBlocked+dt:0;if(s.x>C.firstIris+35)s.firstPassed=true;
wall(C.liftStart,s.x<C.liftStart&&s.y>C.ground-140*s.lift+26);wall(C.liftEnd,s.x<C.liftEnd&&s.y>396);wall(C.sluice,s.sluice<.87);wall(C.watchEnd,!s.signals.every(v=>v>=1));
if(s.iris<.8){const left=C.iris-34,right=C.iris+34;if(oldX<=left&&s.x>left){s.x=left;s.vx=0;s.blocked+=dt;}else if(oldX>=right&&s.x<right){s.x=right;s.vx=0;s.blocked+=dt;}}else s.blocked=0;
s.vy+=C.gravity*dt;s.y+=s.vy*dt;const floor=floorAt(s,s.x);
if(s.vy>=0&&s.y>=floor&&oldY<floor+32){if(!s.onGround&&s.vy>100){s.events.push('land');s.landing=Math.min(1,s.vy/500);}s.y=floor;s.vy=0;s.onGround=true;}else if(!Number.isFinite(floor)||s.y<floor-4)s.onGround=false;
if(s.x>1120&&s.onGround)s.checkpoint=Math.max(s.checkpoint,1230);if(s.x>3220&&s.onGround)s.checkpoint=Math.max(s.checkpoint,3250);if(s.x>4400&&s.onGround){s.sluicePassed=true;s.checkpoint=Math.max(s.checkpoint,4480);}if(s.x>C.watchEnd+35){s.watchPassed=true;s.checkpoint=Math.max(s.checkpoint,6020);}
if(s.x>C.gapEnd+30&&s.onGround){if(!s.across)s.events.push('crossed');s.across=true;}
if(s.x>C.iris+45)s.passedIris=true;
if(s.x>C.crumbleStart+12&&s.x<C.crumbleEnd&&!s.collapseTime&&!s.escaped){s.collapseTime=.001;s.fracture=1;s.events.push('fracture');}
if(s.collapseTime>0&&!s.escaped){const before=collapseFront(s);s.collapseTime+=dt;const after=collapseFront(s);if(Math.floor(before/75)!==Math.floor(after/75)){s.events.push('crumble');s.fracture=Math.max(s.fracture,.45);}if(s.x>C.crumbleEnd&&s.onGround){s.escaped=true;s.events.push('escaped');}}

// The listening chamber: light is necessary for the resonators but reveals the player.
s.chapter=s.x<3250?0:s.x<4450?1:2;
if(s.x>C.watchStart-100&&!s.watchPassed){s.watchTime+=dt;const phase=s.watchTime%7.2,active=phase>3.6&&phase<6,warning=phase>2.5&&phase<=3.6;const shelter=C.shelters.some(x=>Math.abs(x-s.x)<46);const exposed=s.seed==='held'&&s.veil<.55&&!shelter;
if(exposed)s.watchTarget+=(s.x-s.watchTarget)*Math.min(1,dt*2.5);
const detected=active&&exposed&&Math.abs(s.x-s.watchTarget)<145&&s.x<C.watchEnd;
const oldAlert=s.watchAlert;s.watchAlert=clamp(s.watchAlert+(detected?dt*.9:-dt*.75),0,1);if(oldAlert<.15&&s.watchAlert>=.15)s.events.push('noticed');
for(let i=0;i<2;i++){if(s.signals[i]>=1)continue;const lit=Math.abs(s.x-C.signals[i])<68&&s.seed==='held'&&s.veil<.4&&s.onGround;s.signals[i]=clamp(s.signals[i]+(lit?dt*.48:-dt*.10),0,1);if(s.signals[i]>=.999){s.signals[i]=1;s.events.push('resonance');}}
if(s.watchAlert>=1){s.respawn=1.3;s.fallCount++;s.events.push('caught');}
}
if(s.y>675){s.respawn=1.3;s.fallCount++;s.events.push('fall');}
s.walk+=Math.abs(s.vx)*dt/15.4;
if(s.onGround&&Math.abs(s.vx)>25){s.stepClock+=Math.abs(s.vx)*dt;if(s.stepClock>(s.grabbing?47:40+56*clamp((Math.abs(s.vx)-85)/235,0,1))){s.stepClock=0;s.events.push('step');}}
s.interaction=nearby(s);
}
const api={C,createState,step,interact,nearby,floorAt,bridgeHeight,collapseFront,clamp};if(typeof module!=='undefined')module.exports=api;root.NacreLogic=api;
})(typeof window!=='undefined'?window:globalThis);
