(function(){
'use strict';

const audio=new Audio('./create-a-wish.mp3?build=v32-20260924-1');
audio.preload='auto';
audio.playsInline=true;
audio.volume=.48;

let ambientRestore=null;
const history=[];

function playCreate(){
  history.push({name:'create',at:Date.now()});
  const ambient=window.__RALUVAAA_AUDIO__?.audio;
  if(ambient&&!ambient.paused){
    if(ambientRestore===null)ambientRestore=ambient.volume;
    ambient.volume=Math.max(.06,ambientRestore*.68);
  }
  try{
    audio.pause();
    audio.currentTime=0;
  }catch{}
  const p=audio.play();
  if(p&&typeof p.catch==='function')p.catch(err=>{
    console.warn('RALUVAAA CREATE sound blocked',err?.name||err);
  });
  return p;
}

function restoreAmbient(){
  const ambient=window.__RALUVAAA_AUDIO__?.audio;
  if(ambient&&ambientRestore!==null)ambient.volume=ambientRestore;
  ambientRestore=null;
}
audio.addEventListener('ended',restoreAmbient);
audio.addEventListener('error',restoreAmbient);

function bind(){
  if(window.__RALUVAAA_ACTION_AUDIO__){
    window.__RALUVAAA_ACTION_AUDIO__.playCreate=playCreate;
    return;
  }
  setTimeout(bind,25);
}
bind();

window.__RALUVAAA_CREATE_AUDIO_V32__={
  audio,
  playCreate,
  history,
  source:'uploaded create a wish.wav',
  format:'audio/mpeg'
};
})();