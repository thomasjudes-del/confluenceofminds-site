(function(r){'use strict';
class SerreAudio extends r.NacreAudio{
 constructor(){super();this.musicLevel=.55;this.fxLevel=.42;this.presence=0;this.lastState={x:190,chapter:'serre'};this.foley=new r.NacreRecordedFoley.RecordedFoley(this);try{const q=JSON.parse(localStorage.getItem('nacre-serre-mix'));if(q){for(const k of ['musicLevel','fxLevel'])if(Number.isFinite(q[k]))this[k]=Math.max(0,Math.min(1,q[k]));this.muted=!!q.muted;}}catch{}}
 async start(restart=false){if(restart)this.foley.stop();const ready=super.start(restart);if(this.ctx)for(const g of this.gains)g.gain.setValueAtTime(0,this.ctx.currentTime);await ready;this.foley.load();}
 event(e){if(['step','land'].includes(e))return;const s=this.lastState;if(e==='reborn'){this.foley.stop();return;}const map={place:'metal',reflect:'cloth',fracture:'creak',crumble:'stone1',sluice:'creak',noticed:'cloth',fall:'splash'};if(map[e])this.foley.play({name:map[e],gain:e==='fracture'?.34:.24,rate:e==='noticed'?.65:.85},s);else this.foley.event(e,s);}
 update(s,dt){const q={...s,chapter:'serre',gate:s.sluice+(s.hydroGate||0),water:s.pond||0,boxX:s.cartX};this.lastState=q;this.foley.tick(q,dt);const tense=s.x>4380&&!s.watchPassed&&!s.offered,target=s.offered?.68:tense?.40:s.across&&!s.escaped?.24:s.seed==='socket'?.14:0;this.presence+=(target-this.presence)*(1-Math.exp(-dt*.65));this.blend+=(Number(tense)-this.blend)*(1-Math.exp(-dt*.6));if(this.ctx){this.gains[0].gain.setTargetAtTime(this.musicLevel*this.presence*(1-this.blend),this.ctx.currentTime,.35);this.gains[1].gain.setTargetAtTime(this.musicLevel*this.presence*this.blend,this.ctx.currentTime,.35);}}
 save(){try{localStorage.setItem('nacre-serre-mix',JSON.stringify({musicLevel:this.musicLevel,fxLevel:this.fxLevel,muted:this.muted}));}catch{}}
 suspend(p){if(p)this.foley.stop();super.suspend(p);}
 setMuted(v){super.setMuted(v);this.save();}setMusic(v){super.setMusic(v);this.save();}setEffects(v){super.setEffects(v);this.save();}
}
r.NacreAudio=SerreAudio;
})(window);
