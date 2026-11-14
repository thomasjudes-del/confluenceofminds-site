/* Conservatory-only counterweight. The painted convoy keeps its original rules. */
(function(r){'use strict';const B=typeof module!=='undefined'?require('./convoy-logic.js'):r.NacreConvoy;
const captureDuration=1.94;
const gateX=2770,plateX=B.C.wall-B.C.boxHalf;
function plateCoverage(boxX){const halfPlate=1.95*60/2,halfBox=B.C.boxHalf;return B.clamp((Math.min(boxX+halfBox,plateX+halfPlate)-Math.max(boxX-halfBox,plateX-halfPlate))/(halfBox*2),0,1);}
function puzzle(s,done=false){s.gate=done?1:0;s.gateLatched=done;s.plateLoaded=false;s.platePressure=0;s.bloomOpen=0;return s;}
function createState(){return Object.assign(puzzle(B.createState()),{y:400,vy:100,vx:150,onGround:false,coyote:0,entrance:true,entranceLand:-1,entranceControlled:false,mothStart:-1});}
function recoverCheckpoint(cp){return puzzle(B.recoverCheckpoint(cp),cp>=3);}
function step(s,input={},dt=1/60){if(s.paused)return s;dt=B.clamp(dt,0,1/30);
 if(s.capture){const c=s.capture;s.events=[];s.time+=dt;c.t+=dt;c.vy+=1350*dt;c.y=Math.min(c.groundY,c.y+c.vy*dt);s.y=c.y;s.vx=s.vy=0;s.respawn=.9;if(c.t>=.76&&!c.contact){c.contact=true;s.events.push('capture-grip');}if(c.t>=captureDuration){s.capture=null;s.respawn=.001;B.step(s,{},dt);puzzle(s,s.checkpoint>=3);s.entrance=false;s.entranceLand=-1;s.mothStart=-1;s.witnessStart=-2;s.retryFade=1;}return s;}
 s.retryFade=Math.max(0,(s.retryFade||0)-dt*3.5);
 const oldX=s.x,wasRespawn=s.respawn>0;
 if(s.entrance){if(input.axis||input.jump||input.hold)s.entranceControlled=true;if(!s.entranceControlled&&s.entranceLand<.12)input={...input,axis:.38};}
 // A jump gesture releases the crate even while the other thumb holds action.
 if(input.jump&&input.hold)input={...input,hold:false};
 B.step(s,input,dt);
 if(!wasRespawn&&s.respawn&&s.events.includes('caught')){const hunter=s.hunterTime>=0,vehicle=s.chaseTime>=0&&!s.escaped;const side=hunter?-1:1;s.capture={t:0,x:s.x,y:s.y,side,sourceX:hunter?s.hunterX:s.x+126,vy:Math.max(0,s.vy),groundY:Math.min(Number.isFinite(B.floorAt(s,s.x))?B.floorAt(s,s.x):510,...B.solids(s).filter(o=>s.x>=o.a&&s.x<=o.b&&o.top>=s.y).map(o=>o.top)),kind:vehicle?'vehicle':hunter?'hunter':'warden',contact:false};return s;}
 if((s.witnessStart??-1)===-1&&s.checkpoint===0&&s.x>440){s.witnessStart=s.time;s.events.push('distant-steps');}
 if(s.witnessStart>=0&&s.time-s.witnessStart>1.7&&!s.witnessListened){s.witnessListened=true;s.events.push('distant-stop');}
 if(wasRespawn&&!s.respawn){puzzle(s,s.checkpoint>=3);s.entrance=false;s.entranceLand=-1;s.mothStart=-1;}
 if(s.entrance){if(s.onGround&&s.entranceLand<0)s.entranceLand=0;if(s.entranceLand>=0)s.entranceLand+=dt;if(s.entranceLand>=.7||s.x>390||s.respawn)s.entrance=false;}
 if((s.mothStart??-1)<0&&Math.abs(s.x-s.boxX)<230&&!s.respawn){s.mothStart=s.time;s.mothOrigin=s.boxX;s.events.push('wings');}if(s.respawn||s.finished)return s;
 // Optional living encounter after the bank: no input lock or mandatory waiting.
 const nearBloom=s.x>7240&&!s.swimming&&!s.climb;
 s.bloomOpen=B.clamp((s.bloomOpen||0)+dt*(nearBloom?.26:-.18),0,1);
 const coverage=plateCoverage(s.boxX),onBox=s.onGround&&Math.abs(s.y-(B.C.ground-B.C.boxHeight))<3&&Math.abs(s.x-s.boxX)<B.C.boxHalf+3;
 s.plateLoaded=coverage>=.6&&onBox;
 s.platePressure=s.plateLoaded?1:coverage*.48;
 const before=s.gate;s.gate=B.clamp(s.gate+(s.gateLatched?1:s.plateLoaded?1.1:-.24)*dt,0,1);
 // Occupied threshold holds the current leaf; jumping meets its underside.
 if(!s.gateLatched&&Math.abs(oldX-gateX)<23){
  s.gate=Math.max(before,s.gate);
  const feetBelowLeaf=510-(3+s.gate*2.9-1.82)*60;
  if(s.y<feetBelowLeaf){s.y=feetBelowLeaf;s.vy=Math.max(0,s.vy);}
 }
 const required=B.clamp(((510-s.y)/60+1.82-3)/2.9,0,1);
 if(!s.gateLatched&&s.gate<required){if(oldX<=gateX&&s.x>gateX-24){s.x=gateX-24;s.vx=0;}else if(oldX>gateX&&s.x<gateX+24){s.x=gateX+24;s.vx=0;}}
 if(!s.gateLatched&&s.x>gateX+30){s.gateLatched=true;s.events.push('latch');}
 if(before<.95&&s.gate>=.95&&s.plateLoaded)s.events.push('gate-ready');
 return s;}
const api={...B,createState,recoverCheckpoint,step,gateX,plateX,plateCoverage};if(typeof module!=='undefined')module.exports=api;r.NacreConservatoryLogic=api;
})(typeof window!=='undefined'?window:globalThis);
