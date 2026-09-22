(function(){
'use strict';

const STORE=window.RALUVAAA_STORE_KEY||'raluvaaaManualMvpV26';
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let ctx=null,master=null,lastAt=0;

const motifs={
  create:[[0,523,.46,.010],[.09,659,.58,.008]],
  evolve:[[0,440,.30,.007],[.12,554,.38,.008],[.24,659,.46,.007]],
  split:[[0,392,.24,.006],[.08,523,.30,.006],[.14,587,.28,.0055],[.20,659,.30,.005]],
  branch_add:[[0,440,.24,.0055],[.10,587,.34,.006]],
  bloom:[[0,392,.55,.005],[.05,523,.70,.007],[.11,659,.86,.007],[.20,784,.95,.0045]],
  abandon:[[0,392,.42,.0055],[.13,330,.55,.0045],[.27,262,.62,.0035]],
  resume:[[0,330,.28,.004],[.10,440,.38,.005],[.21,554,.46,.0045]],
  correct:[[0,466,.18,.003],[.09,523,.26,.0035]],
  encourage:[[0,659,.22,.0055],[.08,784,.30,.0045]],
  help_proposed:[[0,440,.18,.004],[.12,523,.28,.004]],
  suggest_proposed:[[0,466,.18,.004],[.10,587,.28,.004]],
  connect_proposed:[[0,392,.20,.0038],[.16,659,.22,.0038]],
  help:[[0,523,.34,.0055],[.12,659,.38,.005]],
  connect:[[0,392,.34,.0045],[.08,659,.34,.0045],[.23,523,.50,.006]],
  reparent:[[0,466,.24,.0045],[.12,554,.36,.0045]],
  proposal_accept:[[0,523,.24,.0045],[.10,659,.38,.005]],
  proposal_decline:[[0,392,.25,.0038],[.13,330,.34,.003]],
  proposal_cancel:[[0,440,.20,.0034],[.10,392,.28,.0028]],
  remove:[[0,330,.22,.003],[.08,247,.34,.0025]],
  share:[[0,659,.16,.0032],[.07,880,.22,.0026]]
};

function audioEnabled(){
  const ambient=window.__RALUVAAA_AUDIO__;
  if(ambient&&typeof ambient.enabled==='boolean')return ambient.enabled;
  return localStorage.getItem('raluvaaaAmbientAudioV1')!=='off';
}
function ensure(){
  if(!audioEnabled())return null;
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
  if(!ctx){
    ctx=new AC();master=ctx.createGain();master.gain.value=.72;master.connect(ctx.destination);
  }
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  return ctx;
}
function tone(at,freq,dur,gain,type='sine'){
  if(!ensure()||!master)return;
  const o=ctx.createOscillator(),g=ctx.createGain(),lp=ctx.createBiquadFilter();
  o.type=type;o.frequency.setValueAtTime(freq,at);
  lp.type='lowpass';lp.frequency.setValueAtTime(Math.min(2400,freq*3.2),at);lp.Q.value=.25;
  g.gain.setValueAtTime(.0001,at);
  g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),at+.028);
  g.gain.exponentialRampToValueAtTime(.0001,at+dur);
  o.connect(lp);lp.connect(g);g.connect(master);o.start(at);o.stop(at+dur+.04);
}
function play(name){
  if(!audioEnabled())return false;
  const seq=motifs[name];if(!seq)return false;
  const c=ensure();if(!c)return false;
  const now=c.currentTime;
  if(now-lastAt<.045)return false;
  lastAt=now;
  seq.forEach(([d,f,dur,g],i)=>tone(now+d,f,dur,g,i%3===2?'triangle':'sine'));
  return true;
}
function eventName(ev){
  if(!ev)return null;
  if(ev.type==='proposal_response')return ev.decision==='accept'?'proposal_accept':'proposal_decline';
  if(ev.type==='proposal_cancelled')return'proposal_cancel';
  if(ev.type==='remove_mistake')return'remove';
  return motifs[ev.type]?ev.type:null;
}

const nativeSet=Storage.prototype.setItem;
Storage.prototype.setItem=function(key,value){
  let before=null;if(key===STORE){try{before=JSON.parse(this.getItem(key)||'null')}catch{}}
  nativeSet.call(this,key,value);
  if(key!==STORE)return;
  let after=null;try{after=JSON.parse(value||'null')}catch{}
  const oldLen=Array.isArray(before?.events)?before.events.length:0;
  const events=Array.isArray(after?.events)?after.events.slice(oldLen):[];
  let delay=80;
  for(const ev of events){const name=eventName(ev);if(name){setTimeout(()=>play(name),delay);delay+=70}}
};

document.addEventListener('pointerdown',()=>ensure(),{capture:true,once:true});
document.addEventListener('keydown',()=>ensure(),{capture:true,once:true});
window.addEventListener('raluvaaa-share',()=>play('share'));
window.__RALUVAAA_ACTION_AUDIO__={play,motifs,get context(){return ctx},get enabled(){return audioEnabled()},reduceMotion};
})();