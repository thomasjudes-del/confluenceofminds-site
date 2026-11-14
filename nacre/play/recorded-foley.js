/* Local field recordings. No oscillator, noise generator or permanent weather bed. */
(function(r){'use strict';
const Pulse=typeof module!=='undefined'?require('./cistern-pulse.js'):null;
const Ferry=typeof module!=='undefined'?require('./ferry-motion.js'):null;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function surface(s){return s.chapter==='desert'?(s.x>1320&&s.x<1660?'wood':'sand'):s.chapter==='red'?(s.x>860&&s.x<1210?'wood':'stone'):(Math.abs(s.y-438)<4?'wood':'stone');}
class BodySounds{
 constructor(){this.reset();this.effort=0;}
 reset(){this.previous=null;this.distance=0;this.breathIn=2;this.enemyIn=0;this.mechanismIn=0;this.strokeIn=0;this.ferryIn=0;this.fillIn=0;this.pulseIn=0;}
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
 if(s.chapter==='red'&&s.drainOpen){const f=(Ferry||r.NacreFerryMotion).sample(s.ferryClock||0),near=clamp(1-Math.abs(s.x-f.x)/650,0,1);if(Math.abs(f.velocity)*(1-(s.ferryBrake||0))>18&&near>0&&this.ferryIn<=0){cues.push({name:'creak',gain:.14*near,rate:.72+Math.abs(f.velocity)/600,pan:clamp((f.x-s.x)/500,-.8,.8),distant:true});this.ferryIn=3.2;}}
 this.pulseIn-=dt;if(s.chapter==='red'&&s.x>4950&&s.x<6000&&this.pulseIn<=0){const phase=(Pulse||r.NacreCisternPulse).sample(s,s.x>5500?1:0).phase;if(phase>=2&&phase<7){cues.push({name:phase<4?'metal':'stroke',gain:phase<4?.13:.28,rate:phase<4?.65:.7,distant:true});this.pulseIn=phase<4?1.2:.8;}}
 this.fillIn-=dt;if(s.chapter==='red'&&s.drainOpen&&(Ferry||r.NacreFerryMotion).catchment(s.ferryClock||0)>.1&&Math.abs(s.x-(Ferry||r.NacreFerryMotion).sample(s.ferryClock||0).x)<260&&this.fillIn<=0){cues.push({name:'stroke',gain:.16,rate:.8,distant:true});this.fillIn=1.2;}
 return cues;
 }
}
const names=['stone1','stone2','stone3','wood1','wood2','wood3','sand1','sand2','sand3','breath','splash','stroke','cloth','metal','creak'];
class RecordedFoley{
 constructor(audio){this.audio=audio;this.motion=new BodySounds();this.buffers={};this.voices=new Set();this.serial=0;this.status='ready';}
 load(){if(this.loading||!this.audio.ctx)return this.loading;const c=this.audio.ctx;this.loading=Promise.all(names.map(async name=>{try{const res=await fetch('assets/foley/'+name+'.mp3');if(!res.ok)throw Error(name);this.buffers[name]=await c.decodeAudioData(await res.arrayBuffer());}catch{this.status='partial';}})).then(()=>{if(this.status!=='partial')this.status='loaded';});return this.loading;}
 play(p,s={}){const c=this.audio.ctx;if(!c||c.state!=='running'||this.audio.muted||this.voices.size>=8)return;const name=p.variant?p.name+(++this.serial%3+1):p.name,b=this.buffers[name];if(!b)return;
 const src=c.createBufferSource(),gain=c.createGain(),filter=c.createBiquadFilter(),delay=c.createDelay(.3),echo=c.createGain(),pan=c.createStereoPanner?.();src.buffer=b;src.playbackRate.value=p.rate||1;gain.gain.value=p.gain;filter.type='lowpass';filter.frequency.value=s.swimming?1000:p.distant?1500:4800;delay.delayTime.value=s.chapter==='red'?.14:.085;echo.gain.value=s.chapter==='desert'?.025:s.chapter==='red'?.17:.10;src.connect(gain);gain.connect(filter);if(pan){pan.pan.value=p.pan||0;filter.connect(pan);pan.connect(this.audio.fx);}else filter.connect(this.audio.fx);filter.connect(delay);delay.connect(echo);echo.connect(this.audio.fx);this.voices.add(src);
 src.onended=()=>{this.voices.delete(src);src.disconnect();setTimeout(()=>{gain.disconnect();filter.disconnect();delay.disconnect();echo.disconnect();pan?.disconnect();},300);};src.start();
 }
 event(name,s){if(name==='ferry-release'||name==='ferry-dock'){const f=(Ferry||r.NacreFerryMotion).sample(s.ferryClock||0),near=clamp(1-Math.abs(s.x-f.x)/650,0,1);if(near>0)this.play({name:name==='ferry-dock'?'wood1':'creak',gain:near*(name==='ferry-dock'?.35:.20),rate:name==='ferry-dock'?.62:.72,pan:clamp((f.x-s.x)/500,-.8,.8),distant:true},s);return;}const p={'crust-warning':{name:'creak',gain:.25,rate:.78},'crust-fall':{name:'stone1',gain:.4,rate:.65},'transfer-ready':{name:'metal',gain:.23,rate:.65,pan:.7,distant:true},jump:{name:'cloth',gain:.25},climb:{name:'cloth',gain:.3},grab:{name:'cloth',gain:.4},'capture-grip':{name:'cloth',gain:.7,rate:.78},caught:{name:'breath',gain:.6,rate:.86},splash:{name:'splash',gain:.7},'gate-ready':{name:'metal',gain:.28,rate:.7},latch:{name:'metal',gain:.32,rate:.8},'distant-stop':{name:'cloth',gain:.35,rate:.8,pan:.6,distant:true},wings:{name:'cloth',gain:.15,rate:1.5}}[name];if(p)this.play(p,s);if(name==='retry')this.stop();}
 tick(s,dt){for(const cue of this.motion.update(s,dt))this.play(cue,s);}
 stop(){for(const src of this.voices){try{src.stop();}catch{}}this.voices.clear();this.motion.reset();}
}
const api={BodySounds,RecordedFoley,surface,names};if(typeof module!=='undefined')module.exports=api;r.NacreRecordedFoley=api;
})(typeof window!=='undefined'?window:globalThis);
