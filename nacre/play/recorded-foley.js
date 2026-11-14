/* Local field recordings. No oscillator, noise generator or permanent weather bed. */
(function(r){'use strict';
const Pulse=typeof module!=='undefined'?require('./cistern-pulse.js'):null;
const Ferry=typeof module!=='undefined'?require('./ferry-motion.js'):null;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// Smooth room boundaries and physical emitters; no audio source switches at camera cuts.
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
function acousticSpace(s){
 const x=s.x||0;
 if(s.chapter==='forest')return {wet:s.swimming?.10:.025,delay:.065};
 if(s.chapter==='desert')return {wet:.025,delay:.065};
 if(s.chapter==='red'){const open=smooth(5950,6250,x);return {wet:.18-.14*open,delay:.145-.06*open};}
 const cover=smooth(4400,4550,x)*(1-smooth(4920,5100,x));
 const basin=smooth(5900,6200,x)*(1-smooth(7180,7400,x));
 return {wet:.10-.055*cover+.065*basin,delay:.09-.045*cover+.045*basin};
}
function spatialCue(p,s){
 let sourceX=p.sourceX;
 if(p.source==='ferry')sourceX=(Ferry||r.NacreFerryMotion).sample(s.ferryClock||0).x;
 const positioned=Number.isFinite(sourceX),distance=positioned?Math.abs(sourceX-s.x):0,range=p.range||520;
 const near=positioned?1-smooth(50,range,distance):1,room=acousticSpace(s);
 return {gain:p.gain*near,pan:positioned?clamp((sourceX-s.x)/360,-.85,.85):(p.pan||0),
  cutoff:s.swimming?1000:positioned?1400+3400*near:p.distant?1500:4800,
  wet:room.wet,delay:room.delay};
}
function surface(s){
 if(s.chapter==='forest')return s.x>4490&&s.x<4920||Math.abs(s.y-438)<4?'wood':'sand';
 if(s.chapter==='desert')return s.x>1320&&s.x<1660?'wood':s.x>=7800?'stone':'sand';
 if(s.chapter==='red')return s.x>860&&s.x<1210||s.x>3550&&s.x<4200&&Math.abs(s.y-400)<4?'wood':'stone';
 return Math.abs(s.y-438)<4?'wood':'stone';
}
class BodySounds{
 constructor(){this.reset();this.effort=0;}
 reset(){this.previous=null;this.distance=0;this.breathIn=2;this.enemyIn=0;this.mechanismIn=0;this.strokeIn=0;this.ferryIn=0;this.fillIn=0;this.pulseIn=[0,0];this.pulsePhase=[null,null];}
 update(s,dt){const cues=[];if(!Number.isFinite(dt)||dt<=0||s.paused||s.finished){return cues;}const prev=this.previous;this.previous={x:s.x,bodyTravelX:s.bodyTravelX,onGround:s.onGround,chapter:s.chapter,gate:s.gate||0,water:s.water||0,shutter:s.shutter||0,stoneX:s.stoneX??0,boxX:s.boxX??0,shelterX:s.shelterX??4900,drain:s.drain||0};
 if(!prev||prev.chapter!==s.chapter||Math.abs(s.x-prev.x)>100){this.distance=0;this.effort=0;this.breathIn=2;return cues;}
 const travel=Math.abs(Number.isFinite(s.bodyTravelX)&&Number.isFinite(prev.bodyTravelX)?s.bodyTravelX-prev.bodyTravelX:s.x-prev.x),speed=travel/dt;this.effort=clamp(this.effort+dt*(!s.swimming&&speed>200?.12:s.grabbing&&speed>25?.07:-.055),0,1);
 if(s.respawn){this.distance=0;return cues;}
 if(s.onGround&&!s.swimming){if(!prev.onGround)cues.push({name:surface(s)+'1',gain:.64,rate:.86});this.distance+=Math.abs(Number.isFinite(s.bodyTravelX)&&Number.isFinite(prev.bodyTravelX)?s.bodyTravelX-prev.bodyTravelX:s.x-prev.x);const stride=s.crouch>.2?53:s.grabbing?47:80;if(this.distance>=stride){this.distance%=stride;cues.push({name:surface(s),variant:true,gain:s.crouch>.2?.23:s.grabbing?.34:.48,rate:s.grabbing?.88:1});}}else this.distance=0;
 this.breathIn-=dt;if(!s.swimming&&this.effort>.22&&this.breathIn<=0){cues.push({name:'breath',gain:.25+this.effort*.32,rate:.86+this.effort*.12});this.breathIn=5.6-this.effort*.7;}
 this.strokeIn-=dt;if(s.swimming&&speed>40&&this.strokeIn<=0){cues.push({name:'stroke',gain:.65,rate:1});this.strokeIn=.74;}
 const witness=s.witnessStart>=0?s.time-s.witnessStart:-1,witnessWalk=witness>=0&&(witness<1.7||(witness>3.7&&witness<5.8)),hunter=s.hunterTime>=0&&Math.abs(s.x-s.hunterX)<450&&!s.swimming&&!s.hunterRest;
 this.enemyIn-=dt;if((witnessWalk||hunter)&&this.enemyIn<=0){cues.push({name:'stone',variant:true,gain:hunter?.42:.32,rate:.78,pan:hunter?-.7:.65,distant:true});this.enemyIn=hunter?.34:.52;}
 this.mechanismIn-=dt;const moving=Math.abs((s.gate||0)-prev.gate)+Math.abs((s.water||0)-prev.water)+Math.abs((s.shutter||0)-prev.shutter)+(s.drainOpen?0:Math.abs((s.drain||0)-prev.drain));const dragged=Math.abs((s.stoneX??0)-prev.stoneX)+Math.abs((s.boxX??0)-prev.boxX)+Math.abs((s.shelterX??4900)-prev.shelterX);
 if((dragged>.05||moving>.0008)&&this.mechanismIn<=0){cues.push({name:'creak',gain:s.grabbing?.2:.16,rate:.85});this.mechanismIn=3.8;}
 this.ferryIn-=dt;
 if(s.chapter==='red'&&s.drainOpen){const f=(Ferry||r.NacreFerryMotion).sample(s.ferryClock||0),near=clamp(1-Math.abs(s.x-f.x)/650,0,1);if(Math.abs(f.velocity)*(1-(s.ferryBrake||0))>18&&near>0&&this.ferryIn<=0){cues.push({name:'creak',gain:.14,rate:.72+Math.abs(f.velocity)/600,source:'ferry',range:650,distant:true});this.ferryIn=3.2;}}
 // Both visible valves keep their own rhythm, even while the listener crosses between them.
 if(s.chapter==='red')for(let i=0;i<2;i++){
  const p=(Pulse||r.NacreCisternPulse).sample(s,i),kind=p.warning?'warning':p.blast?'blast':'quiet';
  if(kind!==this.pulsePhase[i])this.pulseIn[i]=0;
  this.pulsePhase[i]=kind;this.pulseIn[i]-=dt;
  if(kind!=='quiet'&&this.pulseIn[i]<=0){
   const cue={name:p.warning?'metal':'stroke',gain:p.warning?.15:.29,rate:p.warning?.65:.7,sourceX:p.x,range:520,vent:i};
   if(spatialCue(cue,s).gain>.002)cues.push(cue);
   this.pulseIn[i]=p.warning?.65:.8;
  }
 }

 this.fillIn-=dt;if(s.chapter==='red'&&s.drainOpen&&(Ferry||r.NacreFerryMotion).catchment(s.ferryClock||0)>.1&&Math.abs(s.x-(Ferry||r.NacreFerryMotion).sample(s.ferryClock||0).x)<260&&this.fillIn<=0){cues.push({name:'stroke',gain:.16,rate:.8,distant:true});this.fillIn=1.2;}
 return cues;
 }
}
const names=['stone1','stone2','stone3','wood1','wood2','wood3','sand1','sand2','sand3','breath','splash','stroke','cloth','metal','creak'];
class RecordedFoley{
 constructor(audio){this.audio=audio;this.motion=new BodySounds();this.buffers={};this.voices=new Set();this.graphs=new Map();this.serial=0;this.status='ready';}
 load(){if(this.loading||!this.audio.ctx)return this.loading;const c=this.audio.ctx;this.loading=Promise.all(names.map(async name=>{try{const res=await fetch('assets/foley/'+name+'.mp3');if(!res.ok)throw Error(name);this.buffers[name]=await c.decodeAudioData(await res.arrayBuffer());}catch{this.status='partial';}})).then(()=>{if(this.status!=='partial')this.status='loaded';});return this.loading;}
 play(p,s={}){const c=this.audio.ctx;if(!c||c.state!=='running'||this.audio.muted||this.voices.size>=8)return;const name=p.variant?p.name+(++this.serial%3+1):p.name,b=this.buffers[name];if(!b)return;
 const src=c.createBufferSource(),gain=c.createGain(),filter=c.createBiquadFilter(),delay=c.createDelay(.3),echo=c.createGain(),pan=c.createStereoPanner?.();
 src.buffer=b;src.playbackRate.value=p.rate||1;filter.type='lowpass';
 src.connect(gain);gain.connect(filter);if(pan){filter.connect(pan);pan.connect(this.audio.fx);}else filter.connect(this.audio.fx);
 // Reflections remain diffuse; the direct sound supplies the direction.
 filter.connect(delay);delay.connect(echo);echo.connect(this.audio.fx);
 const graph={p,gain,filter,delay,echo,pan,timer:null};this.graphs.set(src,graph);this.applySpace(graph,s,true);this.voices.add(src);
 src.onended=()=>{this.voices.delete(src);src.disconnect();graph.timer=setTimeout(()=>this.dispose(src),320);};src.start();
 }
 applySpace(g,s,initial=false){const q=spatialCue(g.p,s),now=this.audio.ctx.currentTime;
  for(const [param,value]of [[g.gain.gain,q.gain],[g.filter.frequency,q.cutoff],[g.echo.gain,q.wet],[g.delay.delayTime,q.delay],...(g.pan?[[g.pan.pan,q.pan]]:[])]){
   if(initial)param.setValueAtTime(value,now);else param.setTargetAtTime(value,now,.09);
  }
 }
 dispose(src){const g=this.graphs.get(src);if(!g)return;if(g.timer!==null)clearTimeout(g.timer);for(const n of [g.gain,g.filter,g.delay,g.echo,g.pan])n?.disconnect();this.graphs.delete(src);}

 event(name,s){if(name==='ferry-release'||name==='ferry-dock'){const f=(Ferry||r.NacreFerryMotion).sample(s.ferryClock||0),near=clamp(1-Math.abs(s.x-f.x)/650,0,1);if(near>0)this.play({name:name==='ferry-dock'?'wood1':'creak',gain:name==='ferry-dock'?.35:.20,rate:name==='ferry-dock'?.62:.72,source:'ferry',range:650,distant:true},s);return;}const p={'crust-warning':{name:'creak',gain:.25,rate:.78},'crust-fall':{name:'stone1',gain:.4,rate:.65},'transfer-ready':{name:'metal',gain:.23,rate:.65,pan:.7,distant:true},jump:{name:'cloth',gain:.25},climb:{name:'cloth',gain:.3},grab:{name:'cloth',gain:.4},'capture-grip':{name:'cloth',gain:.7,rate:.78},caught:{name:'breath',gain:.6,rate:.86},splash:{name:'splash',gain:.7},'gate-ready':{name:'metal',gain:.28,rate:.7},latch:{name:'metal',gain:.32,rate:.8},'distant-stop':{name:'cloth',gain:.35,rate:.8,pan:.6,distant:true},wings:{name:'cloth',gain:.15,rate:1.5}}[name];if(p)this.play(p,s);if(name==='retry')this.stop();}
 tick(s,dt){if(s.paused||s.finished)return;for(const graph of this.graphs.values())this.applySpace(graph,s);for(const cue of this.motion.update(s,dt))this.play(cue,s);}
 stop(){for(const src of this.voices){try{src.stop();}catch{}}this.voices.clear();for(const src of this.graphs.keys())this.dispose(src);this.motion.reset();}
}
const api={BodySounds,RecordedFoley,surface,names,acousticSpace,spatialCue};if(typeof module!=='undefined')module.exports=api;r.NacreRecordedFoley=api;
})(typeof window!=='undefined'?window:globalThis);
