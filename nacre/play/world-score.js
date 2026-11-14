/* Recorded score direction shared by the three 3D passages. */
(function(r){'use strict';
function musicScene(s){
 if(s.respawn>0)return 'failure';
 if(s.chapter==='desert'&&s.x>7800&&s.x<8420&&s.crustTime>0&&s.crustTime<2.8)return 'exposure';
 if(s.chapter==='desert'&&s.x>7000)return 'release';
 if(s.chapter==='desert'){const w=(typeof module!=='undefined'?require('./world-logic.js'):r.NacreWorlds).saltWeather(s);if(w.active&&!w.sheltered&&(w.warning||w.blast))return 'exposure';}
 if(s.chapter==='desert')return s.x>2480&&!s.shutterLatched?'exposure':'salt';
 if(s.chapter==='red'&&s.x>4950&&s.x<6020)return s.pulseHit>0?'pressure':'cistern';
 if(s.chapter==='red')return s.drainOpen?(s.x>4380?'release':s.x<2490?'release':'cistern'):s.x>1750&&s.x<2500?'pressure':'cistern';
 if(s.swimming)return 'submerged';
 if(s.finished||s.x>7200)return 'release';
 if((s.chaseTime>=0&&!s.escaped)||(s.hunterTime>=0&&s.x<6100))return 'pursuit';
 if((s.scanTime>=0&&!s.searchPassed)||(s.escaped&&s.inspection<8.2))return 'watched';
 if(s.x>2100&&s.x<3100)return 'mechanism';
 return 'exploration';
}
const mixes={exploration:[0,0,0,0],mechanism:[0,0,0,0],watched:[0,.12,0,0],pursuit:[0,.16,.70,0],submerged:[0,0,0,0],release:[.20,0,0,0],failure:[0,.3,.16,0],salt:[0,0,0,0],exposure:[0,.18,.12,0],cistern:[0,0,0,0],pressure:[0,.25,.34,0]};
function advance(weights,target,dt){const k=1-Math.exp(-Math.min(.1,dt)/(target[2]>.3?.7:2.4));return weights.map((n,i)=>n+(target[i]-n)*k);}
const api={musicScene,mixes,advance};if(typeof module!=='undefined')module.exports=api;r.NacreScore=api;
if(!r.ConservatoryAudio)return;
r.WorldAudio=class extends r.ConservatoryAudio{
 constructor(){super();for(const name of ['pursuit','salt']){const a=new Audio('assets/'+name+'.mp3');a.preload='metadata';a.loop=true;a.setAttribute('playsinline','');a.addEventListener('error',()=>this.musicStatus='error');this.tracks.push(a);}this.weights=[0,0,0,0];this.sceneName='exploration';this.foley=r.NacreRecordedFoley?new r.NacreRecordedFoley.RecordedFoley(this):null;}
 async start(restart=false){const pending=super.start(restart);if(this.gains)for(let i=0;i<this.gains.length;i++)this.gains[i].gain.setValueAtTime(this.musicLevel*this.weights[i],this.ctx.currentTime);else this.tracks.forEach((a,i)=>a.volume=this.muted?0:this.musicLevel*this.weights[i]);this.foley?.load();await pending;}
 update(s,dt=1/60){this.sceneName=musicScene(s);this.weights=advance(this.weights,mixes[this.sceneName],dt);if(this.ctx){for(let i=0;i<4;i++)this.gains[i].gain.setTargetAtTime(this.musicLevel*this.weights[i],this.ctx.currentTime,.12);}else this.tracks.forEach((a,i)=>a.volume=this.muted?0:this.musicLevel*this.weights[i]);}
 event(name,s={}){this.foley?.event(name,s);} tick(s,dt){this.foley?.tick(s,dt);}
 suspend(p){if(p)this.foley?.stop();super.suspend(p);}
};
})(typeof window!=='undefined'?window:globalThis);
