/* Original procedural foley. No melodic synthesis or external samples. */
(function(root){'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function space(s){return s.swimming?'water':s.x>4490&&s.x<5020?'shelter':s.x>6100?'basin':'gallery';}
function cue(name,s={}){const room=space(s),quiet=s.crouch>.2?.42:1;
 const table={wings:['flutter',.09,.6],'gate-ready':['metal',.22,.55],latch:['metal',.3,.4],step:['stone',.24*quiet,.14],land:['stone',.42,.24],grab:['wood',.25,.22],climb:['cloth',.16,.24],jump:['cloth',.10,.13],splash:['water',.45,.72],stroke:['water',.17,.34],scrape:['wood',.13,.23],convoy:['transit',.28,4.2],drip:['drip',.10,.85],search:['metal',.13,.38],pursuit:['transit',.22,1.8],shelter:['stone',.25,.45],caught:['distress',.32,1.4],fall:['distress',.28,1.4]};
 const p=table[name];return p?{kind:p[0],gain:p[1],duration:p[2],wet:room==='shelter'?.06:room==='basin'||room==='water'?.24:.14,cutoff:room==='water'||p[0]==='distress'?1100:p[0]==='transit'?1700:p[0]==='flutter'?2200:5500}:null;
}
// Deterministic, decorrelated short noise/inharmonic resonances, not pitched notes.
function samples(kind,duration,rate=24000,seed=1){const a=new Float32Array(Math.ceil(duration*rate));let low=0,bass=0;for(let i=0;i<a.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=seed/2147483648-1,t=i/rate,u=t/duration;low+=.17*(n-low);let env=Math.min(1,t/.006)*Math.pow(1-u,kind==='water'?2:4);let v=low;bass+=.008*(n-bass);
 if(kind==='stone')v=.7*low+.18*n+Math.sin(t*2*Math.PI*87)*Math.exp(-t*36)*.25;
 if(kind==='wood')v=.7*low+.16*Math.sin(t*2*Math.PI*193)*Math.exp(-t*23);
 if(kind==='metal')v=.3*low+(.18*Math.sin(t*2*Math.PI*137)+.12*Math.sin(t*2*Math.PI*349)+.08*Math.sin(t*2*Math.PI*571))*Math.exp(-t*7);
 if(kind==='water')v=low*(.7+.3*Math.sin(t*89))+Math.sin(t*2*Math.PI*(230-120*u))*.05;
 if(kind==='distress'){env=Math.pow(Math.sin(Math.PI*u),2);v=1.8*bass+.12*Math.sin(2*Math.PI*(61*t-12*t*t))+.08*low;}
 if(kind==='transit'){env=Math.pow(Math.sin(Math.PI*u),2);const wheels=Math.pow(.5+.5*Math.cos(t*2*Math.PI*5.5),12);v=2*bass+low*(.4+.8*wheels)+.06*Math.sin(t*2*Math.PI*43);}
 if(kind==='flutter'){env=Math.pow(Math.sin(Math.PI*u),2);v=low*(.35+.65*Math.pow(Math.sin(t*32),2));}
 if(kind==='drip'){env=Math.min(1,t/.025)*Math.pow(1-u,5);v=.25*low+.15*Math.sin(2*Math.PI*(1050*t-180*t*t))*Math.exp(-t*12);}
 a[i]=v*env;}return a;}
class MotionSounds{constructor(){this.stroke=0;this.scrape=0;this.air=0;}reset(){this.stroke=this.scrape=this.air=0;}update(s,dt){if(s.respawn||s.finished||s.paused){this.reset();return [];}const events=[];this.air+=dt;if(this.air>=11){this.air=0;if(!(s.hunterTime>=0)&&!(s.chaseTime>=0)&&!s.swimming)events.push('drip');}if(s.swimming&&Math.abs(s.vx)>25){this.stroke+=dt;if(this.stroke>=.72){this.stroke%=.72;events.push('stroke');}}else this.stroke=0;if(s.grabbing&&Math.abs(s.boxV)>8){this.scrape+=dt;if(this.scrape>=.18){this.scrape%=.18;events.push('scrape');}}else this.scrape=0;return events;}}
const api={space,cue,samples,MotionSounds};if(typeof module!=='undefined')module.exports=api;root.NacreConservatorySound=api;
if(!root.NacreAudio)return;
root.ConservatoryAudio=class extends root.NacreAudio{
 constructor(){super();this.motion=new MotionSounds();this.serial=0;this.voices=new Set();try{const p=JSON.parse(localStorage.getItem('nacre-conservatory-mix-v1'));if(p){if(Number.isFinite(p.music))this.musicLevel=clamp(p.music,0,1);if(Number.isFinite(p.fx))this.fxLevel=clamp(p.fx,0,1);this.muted=p.muted===true;}}catch{}}
 persist(){try{localStorage.setItem('nacre-conservatory-mix-v1',JSON.stringify({music:this.musicLevel,fx:this.fxLevel,muted:this.muted}));}catch{}}
 setMusic(v){super.setMusic(v);this.persist();}setEffects(v){super.setEffects(v);this.persist();}setMuted(v){super.setMuted(v);this.persist();}
 event(name,s={}){const p=cue(name,s);if(!p||!this.ctx||this.ctx.state!=='running'||this.voices.size>=12)return;const c=this.ctx,src=c.createBufferSource(),g=c.createGain(),filter=c.createBiquadFilter(),delay=c.createDelay(.4),echo=c.createGain();const data=samples(p.kind,p.duration,c.sampleRate,++this.serial);src.buffer=c.createBuffer(1,data.length,c.sampleRate);src.buffer.copyToChannel(data,0);g.gain.value=p.gain;filter.type='lowpass';filter.frequency.value=p.cutoff;delay.delayTime.value=space(s)==='shelter'?.045:.115;echo.gain.value=p.wet;src.connect(g);g.connect(filter);filter.connect(this.fx);filter.connect(delay);delay.connect(echo);echo.connect(this.fx);this.voices.add(src);src.onended=()=>{this.voices.delete(src);src.disconnect();setTimeout(()=>{g.disconnect();filter.disconnect();delay.disconnect();echo.disconnect();},400);};src.start();}
 tick(s,dt){for(const name of this.motion.update(s,dt))this.event(name,s);}
 suspend(p){if(p){this.motion.reset();for(const v of this.voices){try{v.stop();}catch{}}}super.suspend(p);}
};
})(typeof window!=='undefined'?window:globalThis);
