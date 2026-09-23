(function(){
'use strict';

const STORE=window.RALUVAAA_STORE_KEY||'raluvaaaSoloAlphaV1';
const history=[];
let ctx=null,master=null,armed=false,lastAt=0;

const motifs={
  create:[[196,0,.34,.026],[294,.08,.42,.020],[392,.18,.52,.014]],
  evolve:[[220,0,.26,.018],[330,.10,.34,.020],[494,.22,.46,.016]],
  split:[[196,0,.24,.016],[247,.07,.27,.015],[330,.14,.31,.015],[392,.22,.36,.012]],
  branch_add:[[220,0,.25,.016],[294,.09,.32,.018],[440,.19,.40,.013]],
  bloom:[[262,0,.62,.019],[392,.08,.76,.020],[523,.18,.88,.017],[659,.34,1.02,.012]],
  abandon:[[330,0,.40,.014],[247,.12,.52,.012],[196,.25,.62,.010]],
  close_lineage:[[294,0,.44,.014],[220,.13,.55,.011],[165,.28,.72,.009]],
  resume:[[196,0,.30,.013],[294,.10,.38,.016],[440,.22,.52,.013]],
  resume_lineage:[[196,0,.34,.013],[262,.08,.40,.015],[392,.18,.52,.014],[523,.30,.64,.010]],
  correct:[[330,0,.20,.010],[392,.08,.25,.009]],
  encourage:[[523,0,.24,.010],[659,.09,.31,.009]],
  help_proposed:[[247,0,.34,.011],[370,.15,.42,.010]],
  suggest_proposed:[[294,0,.30,.010],[440,.12,.40,.010]],
  connect_proposed:[[220,0,.42,.011],[330,.10,.48,.010],[440,.22,.58,.009]],
  help:[[247,0,.36,.012],[370,.12,.46,.011],[494,.25,.56,.009]],
  connect:[[220,0,.46,.012],[330,.10,.50,.012],[494,.22,.62,.010]],
  reparent:[[196,0,.34,.011],[294,.12,.44,.011],[392,.22,.52,.009]],
  proposal_accept:[[330,0,.26,.010],[494,.10,.38,.010]],
  proposal_decline:[[294,0,.25,.009],[220,.11,.34,.008]],
  proposal_cancel:[[262,0,.22,.008],[196,.10,.32,.007]],
  remove:[[262,0,.21,.009],[196,.08,.30,.007]],
  share:[[659,0,.16,.010],[880,.07,.22,.008]],
  ui_open:[[294,0,.12,.012],[440,.055,.17,.009]],
  ui_close:[[392,0,.11,.010],[262,.05,.16,.008]],
  ui_nav:[[330,0,.10,.010],[494,.045,.15,.008]],
  ui_action:[[247,0,.09,.009],[370,.04,.14,.007]],
  ui_more:[[440,0,.08,.008],[554,.035,.12,.006]]
};

function enabled(){
  const a=window.__RALUVAAA_AUDIO__;
  return (a?.enabled!==false)&&localStorage.getItem('raluvaaaAmbientAudioV1')!=='off';
}
function ensure(){
  if(!enabled())return null;
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return null;
  if(!ctx){
    ctx=new AC();
    master=ctx.createGain();
    master.gain.value=.92;
    master.connect(ctx.destination);
  }
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  return ctx;
}
function tone(freq,offset,dur,gain,type='sine'){
  const c=ensure();if(!c||!master)return;
  const t=c.currentTime+offset,o=c.createOscillator(),g=c.createGain(),lp=c.createBiquadFilter();
  o.type=type;o.frequency.setValueAtTime(freq,t);
  lp.type='lowpass';lp.frequency.setValueAtTime(Math.min(2300,freq*3.3),t);lp.Q.value=.25;
  g.gain.setValueAtTime(.0001,t);
  g.gain.exponentialRampToValueAtTime(Math.max(.0002,Math.min(.085,gain*1.9)),t+.022);
  g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(lp);lp.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.04);
}
function noise(offset=.01,dur=.16,gain=.006){
  const c=ensure();if(!c||!master)return;
  const length=Math.max(1,Math.floor(c.sampleRate*dur)),buf=c.createBuffer(1,length,c.sampleRate),data=buf.getChannelData(0);
  for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
  const src=c.createBufferSource(),g=c.createGain(),bp=c.createBiquadFilter(),t=c.currentTime+offset;
  src.buffer=buf;bp.type='bandpass';bp.frequency.value=980;bp.Q.value=.7;
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.016);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  src.connect(bp);bp.connect(g);g.connect(master);src.start(t);src.stop(t+dur+.02);
}
function duckAmbient(){
  const a=window.__RALUVAAA_AUDIO__?.audio;
  if(!a||a.paused)return;
  const base=a.volume||.125;
  a.volume=Math.max(.055,base*.46);
  setTimeout(()=>{try{a.volume=base}catch{}},720);
}
function play(name){
  const seq=motifs[name];if(!seq||!enabled())return false;
  const c=ensure();if(!c)return false;
  const now=c.currentTime;if(now-lastAt<.055)return false;lastAt=now;
  history.push({name,at:Date.now()});if(history.length>120)history.shift();
  duckAmbient();
  seq.forEach((x,i)=>tone(x[0],x[1],x[2],x[3],i%3===1?'triangle':'sine'));
  if(['create','split','branch_add','bloom','connect','help'].includes(name))noise(.025,.18,name==='bloom'?.009:.0055);
  try{if(navigator.vibrate)navigator.vibrate(name==='bloom'?[8,28,10]:8)}catch{}
  return true;
}
function eventName(ev){
  if(!ev||ev.quiet)return null;
  if(ev.type==='proposal_response')return ev.decision==='accept'?'proposal_accept':'proposal_decline';
  if(ev.type==='proposal_cancelled')return'proposal_cancel';
  if(ev.type==='remove_mistake')return'remove';
  return motifs[ev.type]?ev.type:null;
}
function arm(){
  armed=true;
  ensure();
  const A=window.__RALUVAAA_AUDIO__;
  if(A?.enabled!==false)A?.start?.();
}
document.addEventListener('pointerdown',arm,{once:true,capture:true});
document.addEventListener('touchstart',arm,{once:true,capture:true,passive:true});
document.addEventListener('keydown',arm,{once:true,capture:true});

/* Best effort autoplay. Browsers, especially iOS Safari, may require the first user gesture. */
function tryAmbient(){
  const A=window.__RALUVAAA_AUDIO__;
  if(!A)return;
  const a=A.audio;
  if(a){
    a.autoplay=true;a.preload='auto';a.playsInline=true;
    try{a.setAttribute('playsinline','')}catch{}
  }
  if(A.enabled!==false)A.start?.();
}
tryAmbient();
setTimeout(tryAmbient,350);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')tryAmbient()});

const previousSet=Storage.prototype.setItem;
Storage.prototype.setItem=function(key,value){
  let before=null;
  if(key===STORE){try{before=JSON.parse(this.getItem(key)||'null')}catch{}}
  previousSet.call(this,key,value);
  if(key!==STORE)return;
  let after=null;try{after=JSON.parse(value||'null')}catch{}
  const n=Array.isArray(before?.events)?before.events.length:0;
  const fresh=Array.isArray(after?.events)?after.events.slice(n):[];
  let delay=70;
  for(const ev of fresh){
    const name=eventName(ev);
    if(name){setTimeout(()=>play(name),delay);delay+=95}
  }
};
window.addEventListener('raluvaaa-share',()=>play('share'));
window.addEventListener('raluvaaa-remove',()=>play('remove'));

/* Audible but restrained UI layer. Semantic actions still have their own motifs;
   these cues make the interface itself feel alive on mobile. */
document.addEventListener('click',e=>{
  const el=e.target.closest('button,summary,[data-open],[data-nav-wish]');
  if(!el||el.disabled||el.id==='musicBtn')return;
  let name=null;
  if(el.id==='drawerClose'||el.id==='cancel')name='ui_close';
  else if(el.matches('[data-nav-wish],.v28-back,.v28-root,[data-open]'))name='ui_nav';
  else if(el.matches('summary'))name='ui_more';
  else if(el.id==='entrustedBtn'||el.id==='myWorldBtn'||el.id==='createBtn')name='ui_open';
  else if(el.matches('[data-act],#confirm,.sheet-actions button'))name='ui_action';
  if(name)play(name);
},true);

window.__RALUVAAA_ACTION_AUDIO__={
  play,motifs,history,
  get context(){return ctx},
  get enabled(){return enabled()},
  get armed(){return armed}
};
})();