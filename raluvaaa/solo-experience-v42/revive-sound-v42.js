(function(){
'use strict';
const URL='https://shattered-dragons-enigma.thomas-judes.workers.dev/assets/raluvaaa/v41/audio/revive-water.wav';
const audio=new Audio();
audio.preload='metadata';
audio.playsInline=true;
audio.volume=.68;
const history=[];
function enabled(){
  return window.__RALUVAAA_AUDIO__?.enabled!==false && localStorage.getItem('raluvaaaSoundFxV1')!=='off';
}
function duckAmbient(){
  const ambient=window.__RALUVAAA_AUDIO__?.audio;
  if(!ambient||ambient.paused)return;
  const base=ambient.volume||.16;
  ambient.volume=Math.max(.052,base*.46);
  setTimeout(()=>{try{ambient.volume=base}catch{}},1450);
}
function play(event){
  if(!enabled()||event?.quiet)return false;
  try{
    audio.pause();audio.src=URL;
    try{audio.currentTime=0}catch{}
    history.push({type:event?.type||'wake',semanticId:event?.semanticId||null,at:Date.now(),url:URL});
    if(history.length>80)history.shift();
    duckAmbient();
    const p=audio.play();
    if(p&&typeof p.catch==='function')p.catch(()=>{});
    return true;
  }catch{return false}
}
window.addEventListener('raluvaaa-action',e=>{
  const ev=e.detail?.event;
  if(!ev||!['resume','resume_branch','resume_lineage','wake'].includes(ev.type))return;
  play(ev);
});
window.__RALUVAAA_REVIVE_AUDIO_V42__={version:42,url:URL,audio,history,play};
window.__RALUVAAA_REVIVE_AUDIO_V41__=window.__RALUVAAA_REVIVE_AUDIO_V42__;
})();