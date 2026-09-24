(function(){
'use strict';

const BASE='https://shattered-dragons-enigma.thomas-judes.workers.dev/assets/raluvaaa/v38/audio/';
const samples={
  create:BASE+'create.wav',
  evolve:BASE+'evolve.wav',
  branch:BASE+'branch.mp3',
  bloomWish:BASE+'bloom-wish.mp3',
  bloomBranch:BASE+'bloom-branch.mp3',
  graft:BASE+'graft.wav',
  help:BASE+'help.wav',
  encourage:BASE+'encourage.mp3',
  share:BASE+'share.wav'
};

const semanticChannel=new Audio();
semanticChannel.preload='metadata';
semanticChannel.playsInline=true;
semanticChannel.volume=.76;

const history=[];
let lastDirectCreateAt=0;
let pendingName=null;

function enabled(){
  return window.__RALUVAAA_AUDIO__?.enabled!==false && localStorage.getItem('raluvaaaSoundFxV1')!=='off';
}

function duckAmbient(){
  const ambient=window.__RALUVAAA_AUDIO__?.audio;
  if(!ambient||ambient.paused)return;
  const base=ambient.volume||.16;
  ambient.volume=Math.max(.055,base*.48);
  setTimeout(()=>{try{ambient.volume=base}catch{}},1500);
}

function currentKind(semanticId){
  try{
    const current=window.__RALUVAAA_UI__?.current?.();
    if(current?.semanticId===semanticId)return current.kind||null;
  }catch{}
  try{
    const semantic=window.__RV26_SOLO__?.semantic?.()||[];
    return semantic.find(x=>x.semanticId===semanticId)?.kind||null;
  }catch{}
  return null;
}

function sampleForEvent(ev){
  if(!ev||ev.quiet)return null;
  if(ev.type==='create')return 'create';
  if(ev.type==='evolve')return 'evolve';
  if(ev.type==='split'||ev.type==='branch_add'||ev.type==='reparent')return 'branch';
  if(ev.type==='bloom')return currentKind(ev.semanticId)==='create'?'bloomWish':'bloomBranch';
  if(ev.type==='connect_proposed'||ev.type==='connect')return 'graft';
  if(ev.type==='help_proposed'||ev.type==='help')return 'help';
  if(ev.type==='encourage')return 'encourage';
  return null;
}

function playNamed(name){
  const url=samples[name];
  if(!enabled()||!url)return false;
  try{
    semanticChannel.pause();
    semanticChannel.src=url;
    semanticChannel.volume=.76;
    try{semanticChannel.currentTime=0}catch{}
    pendingName=name;
    const at=Date.now();
    history.push({name,at,url});
    if(history.length>120)history.shift();
    duckAmbient();
    const p=semanticChannel.play();
    if(p&&typeof p.catch==='function')p.catch(()=>{});
    return true;
  }catch{
    return false;
  }
}

function playCreate(){
  lastDirectCreateAt=Date.now();
  return playNamed('create');
}

semanticChannel.addEventListener('playing',()=>{
  pendingName=null;
});

window.addEventListener('raluvaaa-action',event=>{
  const ev=event.detail?.event;
  const name=sampleForEvent(ev);
  if(!name)return;
  if(name==='create'&&Date.now()-lastDirectCreateAt<900)return;
  playNamed(name);
});

window.addEventListener('raluvaaa-share',()=>playNamed('share'));

window.__RALUVAAA_ACTION_AUDIO__={
  semanticChannel,
  samples,
  history,
  playCreate,
  playSemantic:playNamed,
  playNamed,
  sampleForEvent,
  get enabled(){return enabled()}
};
window.__RALUVAAA_SOUND_V38__={
  version:38,
  samples,
  history,
  semanticChannel,
  playNamed,
  sampleForEvent
};
})();