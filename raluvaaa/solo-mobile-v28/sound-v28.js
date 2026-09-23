(function(){
'use strict';

const STORE=window.RALUVAAA_STORE_KEY||'raluvaaaSoloAlphaV1';
const history=[];
let ctx=null,master=null,armed=false,lastAt=-1e9;

const motifs={
  create:[[174,0,.34,.060],[349,.055,.52,.055],[523,.19,.64,.050],[784,.39,.70,.038],[1047,.62,.52,.025]],
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

/* Semantic sound transport: a single pre-unlocked HTMLAudio channel.
   This is intentionally separate from ambient music and is more reliable
   than WebAudio-only playback on iOS Safari. */
const poeticSamples={
  create:'audio/create.mp3',
  encourage:'audio/encourage.mp3',
  evolve:'audio/evolve.mp3',
  resume:'audio/evolve.mp3',
  resume_lineage:'audio/evolve.mp3',
  split:'audio/split.mp3',
  branch_add:'audio/split.mp3',
  reparent:'audio/split.mp3',
  connect:'audio/connect.mp3',
  connect_proposed:'audio/connect.mp3',
  share:'audio/connect.mp3',
  help:'audio/help.mp3',
  help_proposed:'audio/help.mp3',
  proposal_accept:'audio/help.mp3',
  bloom:'audio/bloom.mp3',
  abandon:'audio/letgo.mp3',
  close_lineage:'audio/letgo.mp3',
  remove:'audio/letgo.mp3',
  proposal_decline:'audio/letgo.mp3',
  proposal_cancel:'audio/letgo.mp3',
  correct:'audio/encourage.mp3',
  suggest_proposed:'audio/encourage.mp3'
};

const semanticChannel=new Audio();
semanticChannel.preload='auto';
semanticChannel.playsInline=true;
semanticChannel.volume=.42;
let semanticUnlocked=false;
const mediaHistory=[];
const playbackHistory=[];
let pendingSemanticName=null;

semanticChannel.addEventListener('playing',()=>{
  if(!pendingSemanticName)return;
  playbackHistory.push({name:pendingSemanticName,at:Date.now()});
  if(playbackHistory.length>120)playbackHistory.shift();
  pendingSemanticName=null;
});

function fxEnabled(){return window.RALUVAAA_SOUND_DESIGN_APPROVED===true&&localStorage.getItem('raluvaaaSoundFxV1')!=='off'}

function buildSampleUrl(name){
  return poeticSamples[name]||null;
}
function primeSemanticChannel(){
  const url=buildSampleUrl('create');if(!url)return;
  if(!semanticChannel.src)semanticChannel.src=url;
  try{semanticChannel.load()}catch{}
}
async function unlockSemanticChannel(){
  if(semanticUnlocked||!fxEnabled())return semanticUnlocked;
  primeSemanticChannel();
  const prev=semanticChannel.volume;semanticChannel.volume=0;
  try{
    await semanticChannel.play();
    semanticChannel.pause();
    try{semanticChannel.currentTime=0}catch{}
    semanticUnlocked=true;
  }catch{}
  semanticChannel.volume=prev;
  return semanticUnlocked;
}
function playSemantic(name){
  if(!fxEnabled())return false;
  const url=buildSampleUrl(name);
  if(!url)return play(name,true);
  try{
    semanticChannel.pause();
    pendingSemanticName=name;
    semanticChannel.src=url;
    semanticChannel.volume=.42;
    try{semanticChannel.currentTime=0}catch{}
    const at=Date.now();
    mediaHistory.push({name,at});
    if(mediaHistory.length>120)mediaHistory.shift();
    history.push({name,at,transport:'media'});
    if(history.length>120)history.shift();
    duckAmbient();
    const promise=semanticChannel.play();
    if(promise&&typeof promise.catch==='function')promise.catch(()=>{});
    
    return true;
  }catch{
    return play(name,true);
  }
}
let lastDirectCreateAt=0;
function playCreate(){
  lastDirectCreateAt=Date.now();
  /* CREATE is intentionally more legible than generic UI cues: a low seed pulse
     followed by an ascending organic chime, with a short ambient duck. */
  return playSemantic('create');
}

primeSemanticChannel();


function enabled(){return fxEnabled()}
function ensure(){
  if(!enabled())return null;
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return null;
  if(!ctx){
    ctx=new AC();
    master=ctx.createGain();
    master.gain.value=1;
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
  g.gain.exponentialRampToValueAtTime(Math.max(.0002,Math.min(.12,gain*2.35)),t+.022);
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
  a.volume=Math.max(.075,base*.72);
  setTimeout(()=>{try{a.volume=base}catch{}},1100);
}
function play(name,force=false){
  const seq=motifs[name];if(!seq||!enabled())return false;
  const c=ensure();if(!c)return false;
  const now=c.currentTime;if(!force&&now-lastAt<.055)return false;lastAt=now;
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
  unlockSemanticChannel();
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

window.addEventListener('raluvaaa-action',e=>{
  const name=eventName(e.detail?.event);
  if(!name)return;
  if(name==='create'&&Date.now()-lastDirectCreateAt<900)return;
  playSemantic(name);
});
window.addEventListener('raluvaaa-share',()=>playSemantic('share'));
window.addEventListener('raluvaaa-remove',()=>playSemantic('remove'));

/* No generic click/notification layer: RALUVAAA sound belongs to meaningful human actions only. */

window.__RALUVAAA_ACTION_AUDIO__={
  play,playSemantic,playCreate,motifs,poeticSamples,history,mediaHistory,playbackHistory,semanticChannel,unlockSemanticChannel,
  get context(){return ctx},
  get enabled(){return fxEnabled()},
  get mediaUnlocked(){return semanticUnlocked},
  get armed(){return armed}
};
})();