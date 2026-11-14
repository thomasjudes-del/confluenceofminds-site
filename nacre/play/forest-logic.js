/* Forest prologue: independent checkpoints and physical path; based on the proven convoy controller. */
(function(root){'use strict';
const C={ground:510,speed:320,gravity:1350,jump:450,world:8800,wall:2590,ledge:330,ledgeEnd:3010,gap:3920,gapEnd:4080,refuge:4490,refugeExit:4920,finish:8660,dive:6100,bank:7200,boxHalf:52,boxHeight:72};
const covers=[{a:1150,b:1350,top:405},{a:1630,b:1810,top:395}];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),approach=(a,b,n)=>a<b?Math.min(a+n,b):Math.max(a-n,b);
function createState(){return{bridgeLower:0,bridgeLatched:false,winding:false,x:130,y:510,vx:0,vy:0,face:1,onGround:true,walk:0,seed:'none',veil:0,time:0,landing:0,lean:0,actionAge:10,grabbing:false,guiding:false,grabOffset:65,boxX:2280,boxV:0,crouch:0,vehicleTime:-1,scanTime:-1,searchPassed:false,alert:0,checkpoint:0,chaseTime:-1,chaser:0,escaped:false,inspection:0,hunterTime:-1,hunterX:0,hunterV:378,hunterRest:0,swimming:false,splashAge:10,splashX:0,finished:false,ending:0,deaths:0,respawn:0,events:[],jumpBuffer:0,coyote:.1,climb:null,jumps:0};}
function bridgeAngle(s){return (1-(s.bridgeLower||0))*.85;}
function bridgeTip(s){return 7650+420*Math.cos(bridgeAngle(s));}
function bridgeTop(s,x){return 510-(x-7650)*Math.tan((1-(s.bridgeLower||0))*.85);}
function floorAt(s,x){if(x>7650&&x<8070)return x<=bridgeTip(s)?bridgeTop(s,x):Infinity;if(x>=C.dive&&x<C.bank)return Infinity;if(x>=C.gap&&x<=C.gapEnd)return Infinity;if(x>=C.wall&&x<=C.ledgeEnd)return C.ledge;return C.ground;}
function beam(s){const phase=((s.scanTime%6)+6)%6;return{target:1510+500*Math.cos(phase*Math.PI/3),width:150,active:s.scanTime>.8&&!s.searchPassed,source:{x:2070,y:285}};}
// One world-space footprint controls both the visible light and detection.
function patrol(s){
 const turn=clamp((s.inspection-7.2)/1,0,1),sweep=turn*turn*(3-2*turn);
 return {active:s.escaped&&s.inspection<8.2,left:C.refugeExit+(5340-C.refugeExit)*sweep,right:5340,
 source:{x:5117,y:378},turn,vehicleX:5290+Math.max(0,s.inspection-8.2)*115,
 opacity:1-clamp((s.inspection-10)/2,0,1)};
}
function patrolVisible(s){const p=patrol(s);return p.active&&s.x>p.left&&s.x<p.right;}
// Presentation values derived from physical depth, including the approach to the ladder.
function swimAngle(s){if(!s.swimming)return 0;const depth=clamp((s.y-540)/40,0,1),bank=clamp((C.bank-20-s.x)/120,0,1);return s.face*1.15*depth*depth*(3-2*depth)*bank*bank*(3-2*bank);}
function pursuerPose(s){
 const x=s.hunterX,air=x>5650&&x<5840,u=clamp((x-5650)/190,0,1),vx=x>=C.dive-30?0:(s.hunterV??378);
 // Smooth take-off and landing: zero vertical velocity at both contacts.
 const h=air?90*Math.sin(u*Math.PI)**2:0,vy=air?-90*Math.PI*Math.sin(2*u*Math.PI)*vx/190:0;
 return Object.assign(createState(),{x,y:510-h,vx,vy,onGround:!air,time:s.time,
 landing:x>=5840&&x<5900?1-(x-5840)/60:0,lean:x>5900&&vx>0?-.8:0,
 watching:clamp((s.hunterRest||0)/.65,0,1)});
}
function sheltered(s){return s.onGround&&covers.some(c=>s.x>=c.a+9&&s.x<=c.b-9);}
function visible(s){const b=beam(s);return b.active&&s.x>1070&&s.x<2090&&Math.abs(s.x-b.target)<b.width&&!sheltered(s);}
function interactable(s){return s.onGround&&s.y>490&&Math.abs(s.x-s.boxX)<87;}
function fail(s,reason){if(s.respawn)return;s.events.push(reason);s.deaths++;s.respawn=.9;s.vx=0;s.vy=0;s.grabbing=false;s.climb=null;}
function restartAtCheckpoint(s){const cp=s.checkpoint,deaths=s.deaths,time=s.time;const fresh=createState();Object.assign(s,fresh,{checkpoint:cp,deaths,time,vehicleTime:cp?16:-1});if(cp===1)Object.assign(s,{x:1100,scanTime:0});if(cp===2)Object.assign(s,{x:2160,searchPassed:true,scanTime:9});if(cp>=3)Object.assign(s,{x:3120,searchPassed:true,scanTime:9,boxX:C.wall-C.boxHalf});if(cp>=4)Object.assign(s,{x:4560,escaped:true,chaseTime:5,chaser:4450,inspection:0});if(cp>=5)Object.assign(s,{x:5200,inspection:9});if(cp>=6)Object.assign(s,{x:7320,hunterTime:10,hunterX:6070,hunterV:0,inspection:20});s.events=['retry'];}
function solids(s){return[{a:490,b:610,top:470},{a:s.boxX-C.boxHalf,b:s.boxX+C.boxHalf,top:C.ground-C.boxHeight},{a:C.wall,b:C.ledgeEnd,top:C.ledge},{a:5700,b:5790,top:465},{a:C.bank,b:7650,top:510},{a:8070,b:C.world+100,top:510}];}
function step(s,input={},dt=1/60){dt=clamp(dt,0,1/30);s.events=[];if(s.paused)return s;s.time+=dt;s.actionAge+=dt;s.splashAge+=dt;s.landing=Math.max(0,s.landing-dt*4);if(s.finished){s.ending+=dt;return s;}if(s.respawn>0){s.respawn=Math.max(0,s.respawn-dt);if(!s.respawn)restartAtCheckpoint(s);return s;}
 // Ratchet winch pays out a suspended timber bridge; the far brake secures a return route.
 const oldLower=s.bridgeLower||0;
 s.winding=!!input.hold&&s.onGround&&Math.abs(s.x-7500)<48;
 if(input.hold&&s.onGround&&Math.abs(s.x-8200)<48&&oldLower>.82)s.bridgeLatched=true;
 s.bridgeLower=approach(oldLower,s.bridgeLatched||s.winding?1:0,dt*(s.winding?.22:.035));
 if(s.bridgeLower!==oldLower&&Math.floor(s.bridgeLower*12)!==Math.floor(oldLower*12))s.events.push('grab');
 if(s.onGround&&s.x>7650&&s.x<=7650+420*Math.cos((1-oldLower)*.85)){
 const distance=(s.x-7650)/Math.cos((1-oldLower)*.85);
 s.x=7650+distance*Math.cos(bridgeAngle(s));s.y=510-distance*Math.sin(bridgeAngle(s));
 }
 if(s.x>7290&&s.onGround&&s.checkpoint<6){s.checkpoint=6;s.events.push('checkpoint');}
 if(s.vehicleTime>=0)s.vehicleTime+=dt;if(s.scanTime>=0&&!s.searchPassed)s.scanTime+=dt;
 if(s.x>340&&s.vehicleTime<0){s.vehicleTime=0;s.events.push('convoy');}
 if(s.x>1040&&s.scanTime<0&&!s.searchPassed){s.scanTime=0;s.checkpoint=1;s.events.push('search');}
 if(s.x>2110&&!s.searchPassed){s.searchPassed=true;s.alert=0;s.checkpoint=2;s.events.push('clear');}
 if(s.x>3100&&s.checkpoint<3){s.checkpoint=3;s.events.push('checkpoint');}
 if(s.x>3220&&s.chaseTime<0&&!s.escaped){s.chaseTime=0;s.chaser=s.x-330;s.events.push('pursuit');}
 if(s.chaseTime>=0&&!s.escaped){s.chaseTime+=dt;s.chaser+=Math.min(378,130+s.chaseTime*220)*dt;if(s.x>C.refuge){s.escaped=true;s.checkpoint=4;s.events.push('shelter');}else if(s.chaser>s.x-26)fail(s,'caught');}
 if(s.escaped){s.inspection+=dt;s.chaser=approach(s.chaser,4450,dt*90);if(patrolVisible(s)){s.alert+=dt;if(s.alert>.38){fail(s,'caught');return s;}}}
 if(s.x>5170&&s.checkpoint<5)s.checkpoint=5;
 if(s.x>5380&&s.hunterTime<0){s.hunterTime=0;s.hunterX=s.x-310;s.events.push('pursuit');}
 if(s.hunterTime>=0){s.hunterTime+=dt;const remaining=C.dive-30-s.hunterX;
 // Braking distance v²/(2a) keeps the guard on dry ground without a hard stop.
 s.hunterV=Math.min(378,Math.sqrt(Math.max(0,2*560*remaining)));
 const travel=s.hunterV*dt;if(remaining<=travel+.08){s.hunterX=C.dive-30;s.hunterV=0;s.hunterRest+=dt;}else s.hunterX+=travel;if(s.hunterTime>1.2&&s.x<C.dive&&s.hunterX>s.x-25){fail(s,'caught');return s;}}
 const cover=sheltered(s),low=s.x>C.refuge-45&&s.x<C.refugeExit;s.crouch=approach(s.crouch,cover||low?1:0,dt*4.8);
 if(!(s.escaped&&patrolVisible(s)))s.alert=visible(s)?s.alert+dt:Math.max(0,s.alert-dt*2);if(s.alert>.22&&!s.escaped){fail(s,'caught');return s;}
 if(s.climb){const a=s.climb;a.t+=dt;const u=clamp(a.t/.54,0,1),rise=clamp(u/.82,0,1),shift=clamp((u-.22)/.78,0,1),e=rise*rise*(3-2*rise),h=shift*shift*(3-2*shift);s.x=a.x+(a.targetX-a.x)*h;s.y=a.y+(a.top-a.y)*e;s.vx=0;s.vy=0;s.onGround=false;s.guiding=true;s.handleX=a.edge;s.handleY=a.top;s.grabbing=false;if(u>=1){s.climb=null;s.guiding=false;s.onGround=true;s.events.push('land');}return s;}
 let axis=clamp(input.axis||0,-1,1),hold=!!input.hold;const oldX=s.x,oldY=s.y,wasGround=s.onGround;s.guiding=!!s.winding;if(s.winding){s.handleX=7500;s.handleY=450;s.face=s.x<7500?1:-1;}
 if(input.jump)s.jumpBuffer=.13;else s.jumpBuffer=Math.max(0,s.jumpBuffer-dt);s.coyote=s.onGround?.1:Math.max(0,s.coyote-dt);
 if(hold&&interactable(s)&&!s.grabbing){s.grabbing=true;s.grabOffset=s.boxX-s.x;s.face=Math.sign(s.grabOffset)||s.face;s.events.push('grab');}if(!hold||!s.onGround||input.jump)s.grabbing=false;
 if(!s.swimming&&s.x>C.dive&&s.x<C.bank&&s.y>540){s.swimming=true;s.vy=clamp(s.vy,-120,120);s.splashAge=0;s.splashX=s.x;s.events.push("splash");}
 const maxSpeed=s.swimming?185:s.grabbing?128:low?210:cover?175:C.speed,target=axis*maxSpeed-(s.onGround&&s.x>7650&&s.x<bridgeTip(s)?Math.max(0,Math.sin(bridgeAngle(s))-.2)*700:0);s.vx=approach(s.vx,target,(axis?2300:2900)*dt);s.lean=clamp((target-s.vx)/200,-1,1);if(axis&&!s.grabbing)s.face=Math.sign(axis);
 if(s.jumpBuffer>0&&s.coyote>0&&!s.grabbing&&!low){s.vy=-C.jump;s.onGround=false;s.coyote=0;s.jumpBuffer=0;s.jumps++;s.events.push('jump');}
 if(s.grabbing){const before=s.boxX;s.boxX=clamp(s.boxX+s.vx*dt,2180,C.wall-C.boxHalf);s.boxV=(s.boxX-before)/dt;s.x=s.boxX-s.grabOffset;s.vx=s.boxV;}else{s.boxV=approach(s.boxV,0,dt*420);s.boxX=clamp(s.boxX+s.boxV*dt,2180,C.wall-C.boxHalf);s.x+=s.vx*dt;}
 if(s.swimming&&s.x<C.dive+12)s.vx=Math.max(0,s.vx);s.x=clamp(s.x,s.swimming?C.dive+12:20,C.world);if(s.swimming){s.vy=clamp(s.vy+((595-s.y)*20-s.vy*9)*dt,-180,180);if(input.jump)s.vy=-150;}else s.vy+=C.gravity*dt;s.y+=s.vy*dt;if(low&&s.y<495){s.y=495;s.vy=Math.max(0,s.vy);}s.onGround=false;
 if(s.swimming&&s.x<C.dive+24&&axis<0){s.climb={t:0,x:s.x,y:s.y,top:510,edge:C.dive,targetX:C.dive-25};s.swimming=false;s.face=-1;s.events.push('climb');return s;}
 if(s.swimming&&s.x>C.bank-20){s.climb={t:0,x:s.x,y:s.y,top:510,edge:C.bank,targetX:C.bank+25};s.swimming=false;s.events.push('climb');return s;}
 const walls=solids(s);
 for(const b of walls){if(s.x+12<=b.a||s.x-12>=b.b)continue;if(oldY<=b.top+2&&s.y>=b.top&&s.vy>=0){s.y=b.top;s.vy=0;s.onGround=true;continue;}if(s.y>b.top+3){
 const fromLeft=oldX<=b.a+12,edge=fromLeft?b.a:b.b,toward=fromLeft?axis>0:axis<0;
 if(toward&&s.vy<145&&s.y-b.top<=69&&oldY>b.top&&!s.grabbing){s.climb={t:0,x:fromLeft?b.a-13:b.b+13,y:s.y,top:b.top,edge,targetX:edge+(fromLeft?24:-24)};s.x=s.climb.x;s.vx=0;s.vy=0;s.events.push('climb');break;}
 if(oldX<b.a){s.x=b.a-12;s.vx=0;}else if(oldX>b.b){s.x=b.b+12;s.vx=0;}
 }}
 const floor=floorAt(s,s.x);
 // Project a grounded step onto the actual plank surface, including entry at the hinge.
 if(wasGround&&!input.jump&&s.x>7650&&s.x<=bridgeTip(s)&&oldX>=7638&&oldX<=bridgeTip(s)+12&&Math.abs(oldY-(oldX<=7650?510:bridgeTop(s,oldX)))<5){s.y=floor;s.vy=0;s.onGround=true;}
 if(s.y>=floor&&oldY<=floor+4&&s.vy>=0){if(s.vy>180){s.landing=1;s.events.push('land');}s.y=floor;s.vy=0;s.onGround=true;}
 if(s.y>830)fail(s,'fall');if(s.x>C.finish&&s.onGround){s.finished=true;s.events.push('finish');}
 const walkBefore=Math.floor(s.walk);s.walk+=Math.abs(s.x-oldX)/(s.grabbing?47:96);if(s.onGround&&Math.floor(s.walk)>walkBefore)s.events.push('step');return s;
}
function recoverCheckpoint(cp){const s=createState();s.checkpoint=Number.isInteger(cp)&&cp>=1&&cp<=6?cp:0;restartAtCheckpoint(s);s.events=[];return s;}
const api={recoverCheckpoint,C,covers,clamp,createState,step,beam,swimAngle,pursuerPose,patrol,patrolVisible,sheltered,visible,interactable,floorAt,solids,bridgeAngle,bridgeTip,bridgeTop};if(typeof module!=='undefined')module.exports=api;root.NacreForest=api;
})(typeof window!=='undefined'?window:globalThis);
