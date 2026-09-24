(function(){
'use strict';

const audio=new Audio('./create-a-wish.mp3?build=v33-original-20260924-1');
audio.preload='auto';
audio.playsInline=true;
audio.volume=1;
const history=[];

function soundEnabled(){
  return window.__RALUVAAA_AUDIO__?.enabled!==false && localStorage.getItem('raluvaaaSoundFxV1')!=='off';
}

function playCreate(){
  if(!soundEnabled())return false;
  history.push({name:'create',at:Date.now()});
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

function bind(){
  if(window.__RALUVAAA_ACTION_AUDIO__){
    window.__RALUVAAA_ACTION_AUDIO__.playCreate=playCreate;
    return;
  }
  setTimeout(bind,25);
}
bind();

window.__RALUVAAA_CREATE_AUDIO_V33__={
  audio,
  playCreate,
  history,
  source:'original user-provided create-a-wish MP3',
  format:'audio/mpeg'
};
})();