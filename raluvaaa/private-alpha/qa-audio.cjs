const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function harness({pending=false}={}){
  const audios=[],plays=[],listeners=new Map(),values=new Map(),timers=[];
  const target=()=>({addEventListener(type,fn){const a=this.listeners||(this.listeners={});(a[type]??=[]).push(fn)},dispatchEvent(e){for(const f of this.listeners?.[e.type]||[])f(e)},removeEventListener(){}});
  class Audio{constructor(src){Object.assign(this,target(),{src,paused:true,muted:false,ended:false,volume:1});audios.push(this)}pause(){this.paused=true;this.dispatchEvent({type:'pause'})}play(){this.paused=false;const done=()=>{this.dispatchEvent({type:'playing'});return undefined};if(pending)return new Promise(r=>plays.push(()=>r(done())));done();return Promise.resolve()}}
  const btn={classList:{toggle(){}},querySelector:()=>({style:{}}),setAttribute(k,v){this[k]=v}};
  const rail={insertBefore(){}};
  const document=Object.assign(target(),{head:{appendChild(){}},body:{appendChild(){}},createElement:()=>({style:{},setAttribute(){}}),getElementById:id=>id==='musicBtn'?btn:id==='rail'?rail:null,querySelector:()=>({dataset:{lang:'en'}})});
  const window=Object.assign(target(),{__RV26_SHARED__:{state:()=>({lang:'en'})}});
  const context={window,document,Audio,URLSearchParams,location:{search:''},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},setTimeout:f=>{timers.push(f);return timers.length},performance:{now:()=>0},requestAnimationFrame:f=>timers.push(()=>f(1000)),Date,console};
  vm.createContext(context);
  const load=file=>vm.runInContext(fs.readFileSync(path.resolve(__dirname,file),'utf8'),context);
  load('../mvp-v26/ambient-audio.js');load('../solo-experience-v38/sound-v38.js');load('../solo-experience-v42/revive-sound-v42.js');load('../solo-organic-v27/ambient-playlist-v27.js');
  return{window,document,audios,plays,btn,values,timers};
}
test('mute pauses and mutes every live channel, and prevents new effects',async()=>{
 const h=harness(),A=h.window.__RALUVAAA_AUDIO__,S=h.window.__RALUVAAA_ACTION_AUDIO__,R=h.window.__RALUVAAA_REVIVE_AUDIO_V42__;
 S.playNamed('help');R.play({type:'wake'});await Promise.resolve();
 assert(h.audios.every(a=>!a.paused),'baseline channels actually playing');
 A.setEnabled(false);
 assert(h.audios.every(a=>a.paused&&a.muted),'ambient, semantic and revive all stop immediately');
 assert.equal(S.playNamed('graft'),false);assert.equal(R.play({type:'wake'}),false);
 await h.window.__RALUVAAA_PLAYLIST__.advance();
 for(const f of h.timers.splice(0))f();
 assert(h.audios.every(a=>a.paused&&a.muted),'playlist and duck/fade callbacks cannot unmute');
 assert.equal(h.values.get('raluvaaaAmbientAudioV1'),'off');assert.equal(h.btn['aria-label'],'Enable sound');
 A.setEnabled(true);await Promise.resolve();
 assert.equal(A.audio.paused,false);assert.equal(A.audio.muted,false);assert.equal(S.playNamed('help'),true);assert.equal(R.play({type:'wake'}),true);
 assert(h.audios.every(a=>!a.muted),'explicit enable restores all existing sounds');
});
test('late play completions cannot restart sound after mute',async()=>{
 const h=harness({pending:true}),A=h.window.__RALUVAAA_AUDIO__;
 h.window.__RALUVAAA_ACTION_AUDIO__.playNamed('create');h.window.__RALUVAAA_REVIVE_AUDIO_V42__.play({type:'wake'});
 A.setEnabled(false);for(const finish of h.plays.splice(0))finish();await Promise.resolve();await Promise.resolve();
 assert(h.audios.every(a=>a.paused&&a.muted));assert.equal(A.started,false);assert.equal(A.enabled,false);
});
test('pending gesture and muted autoplay honour a later mute',async()=>{
 for(const method of ['awakenFromGesture','primeMutedAutoplay']){
  const h=harness({pending:true}),A=h.window.__RALUVAAA_AUDIO__;
  A.audio.paused=true;const job=A[method]();A.setEnabled(false);
  for(const finish of h.plays.splice(0))finish();await job;await Promise.resolve();
  assert.equal(A.audio.muted,true,method);assert.equal(A.audio.paused,true,method);assert.equal(A.started,false,method);
 }
});
