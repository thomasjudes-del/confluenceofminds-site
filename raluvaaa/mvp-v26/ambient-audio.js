(function(){
'use strict';

const AUDIO_URL='https://incompetech.com/music/royalty-free/mp3-royaltyfree/Immersed.mp3';
const STORE='raluvaaaAmbientAudioV1';
const params=new URLSearchParams(location.search);
const qa=params.has('qa')||params.has('sharedqa')||params.has('soloqa');
const audio=new Audio(AUDIO_URL);
audio.loop=true;
audio.preload='auto';
audio.volume=.16;
let enabled=localStorage.getItem(STORE)!=='off';
let started=false;
let starting=false;
let autoplayPrimed=false;
let blockedByAutoplay=false;
let disarmAudioGesture=null;

function installStyle(){
  const style=document.createElement('style');
  style.textContent=`
    #musicBtn{font-size:15px}.sound-note{position:relative;display:grid;place-items:center;width:22px;height:22px;line-height:1}.sound-strike{position:absolute;left:1px;right:1px;top:10px;height:2px;border-radius:2px;background:currentColor;transform:rotate(-42deg);transform-origin:center;opacity:0;pointer-events:none}#musicBtn.muted{opacity:.68}#musicBtn.muted .sound-strike{opacity:1}
    #ambientCredit{position:fixed;z-index:29;left:14px;bottom:10px;max-width:300px;font-size:6.5px;letter-spacing:.025em;color:rgba(219,230,246,.34);pointer-events:auto}
    #ambientCredit a{color:inherit;text-decoration:none;border-bottom:1px solid rgba(219,230,246,.13)}
    #ambientCredit a:hover{color:rgba(236,245,255,.68)}
    @media(max-width:820px){#ambientCredit{left:9px;bottom:7px;max-width:210px;font-size:5.8px}}
  `;
  document.head.appendChild(style);
}

function installUi(){
  const rail=document.getElementById('rail');
  if(!rail||document.getElementById('musicBtn'))return;
  const create=document.getElementById('createBtn');
  const btn=document.createElement('button');
  btn.id='musicBtn';
  btn.className='rail-btn';
  btn.type='button';
  btn.innerHTML='<span class="sound-note" aria-hidden="true">♪<span class="sound-strike"></span></span>';
  btn.setAttribute('aria-label','Musique d’ambiance');
  btn.title='Musique d’ambiance · Immersed · Kevin MacLeod · CC BY 4.0';
  rail.insertBefore(btn,create||null);

  const credit=document.createElement('div');
  credit.id='ambientCredit';
  credit.innerHTML='Music: <a href="https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600010" target="_blank" rel="noopener">Immersed · Kevin MacLeod</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>';
  document.body.appendChild(credit);

  btn.onclick=()=>{
    enabled=!enabled;
    localStorage.setItem(STORE,enabled?'on':'off');
    if(enabled){arm();start().then(ok=>{if(!ok)primeMutedAutoplay()})}else{audio.pause();audio.muted=false;started=false;starting=false;autoplayPrimed=false;blockedByAutoplay=false}
    refresh();
  };
  refresh();
}

function refresh(){
  const btn=document.getElementById('musicBtn');
  if(!btn)return;
  btn.classList.toggle('muted',!enabled);
  const strike=btn.querySelector('.sound-strike');
  if(strike)strike.style.opacity=enabled?'0':'1';
  btn.setAttribute('aria-pressed',enabled?'true':'false');
  btn.title=enabled?'Couper la musique · Immersed · Kevin MacLeod · CC BY 4.0':'Activer la musique · Immersed · Kevin MacLeod · CC BY 4.0';
}

async function start(){
  if(!enabled||qa)return false;
  if(!audio.paused&&!audio.ended&&!audio.muted){
    started=true;
    blockedByAutoplay=false;
    refresh();
    if(disarmAudioGesture)disarmAudioGesture();
    return true;
  }
  if(starting)return false;
  starting=true;
  try{
    audio.muted=false;
    await audio.play();
    started=true;
    autoplayPrimed=false;
    blockedByAutoplay=false;
    refresh();
    if(disarmAudioGesture)disarmAudioGesture();
    return true;
  }catch{
    started=false;
    blockedByAutoplay=true;
    refresh();
    return false;
  }finally{
    starting=false;
  }
}

async function primeMutedAutoplay(){
  if(!enabled||qa||autoplayPrimed||(!audio.paused&&!audio.ended))return false;
  const previousMuted=audio.muted;
  try{
    audio.muted=true;
    await audio.play();
    autoplayPrimed=true;
    blockedByAutoplay=true;
    started=false;
    refresh();
    return true;
  }catch{
    audio.muted=previousMuted;
    autoplayPrimed=false;
    return false;
  }
}

function fadeIn(){
  const target=.16;
  audio.volume=.015;
  const began=performance.now(),duration=620;
  const step=now=>{
    const p=Math.min(1,(now-began)/duration);
    audio.volume=.015+(target-.015)*(1-Math.pow(1-p,3));
    if(p<1)requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

async function awakenFromGesture(){
  if(!enabled||qa)return false;
  try{
    audio.muted=false;
    if(audio.paused||audio.ended)await audio.play();
    fadeIn();
    started=true;
    autoplayPrimed=false;
    blockedByAutoplay=false;
    refresh();
    if(disarmAudioGesture)disarmAudioGesture();
    return true;
  }catch{
    return start();
  }
}

function arm(){
  if(qa||disarmAudioGesture)return;
  const events=['pointerdown','touchstart','keydown'];
  const begin=()=>{if(enabled&&(!started||audio.muted||blockedByAutoplay))awakenFromGesture()};
  disarmAudioGesture=()=>{
    for(const type of events)document.removeEventListener(type,begin,true);
    disarmAudioGesture=null;
  };
  for(const type of events){
    document.addEventListener(type,begin,type==='touchstart'?{capture:true,passive:true}:true);
  }
}

installStyle();
installUi();
arm();

audio.addEventListener('playing',()=>{if(audio.muted){autoplayPrimed=true;started=false}else{started=true;blockedByAutoplay=false;if(disarmAudioGesture)disarmAudioGesture()}refresh()});
audio.addEventListener('pause',()=>{if(!audio.ended)started=false});
window.__RALUVAAA_AUDIO__={audio,start,awakenFromGesture,primeMutedAutoplay,get enabled(){return enabled},get started(){return started},get blockedByAutoplay(){return blockedByAutoplay},get autoplayPrimed(){return autoplayPrimed},url:AUDIO_URL};
if(enabled&&!qa){
  start().then(ok=>{if(!ok)primeMutedAutoplay()});
}
})();