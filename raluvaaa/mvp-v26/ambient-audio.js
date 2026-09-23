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
    if(enabled){arm();start()}else{audio.pause();started=false;starting=false}
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
  if(!audio.paused&&!audio.ended){
    started=true;
    refresh();
    if(disarmAudioGesture)disarmAudioGesture();
    return true;
  }
  if(starting)return false;
  starting=true;
  try{
    await audio.play();
    started=true;
    refresh();
    if(disarmAudioGesture)disarmAudioGesture();
    return true;
  }catch{
    started=false;
    refresh();
    return false;
  }finally{
    starting=false;
  }
}

function arm(){
  if(qa)return;
  const events=['pointerup','touchend','click','keydown'];
  const begin=()=>{if(enabled&&!started)start()};
  disarmAudioGesture=()=>{
    for(const type of events)document.removeEventListener(type,begin,true);
    disarmAudioGesture=null;
  };
  for(const type of events){
    document.addEventListener(type,begin,type==='touchend'?{capture:true,passive:true}:true);
  }
}

installStyle();
installUi();
arm();

audio.addEventListener('playing',()=>{started=true;refresh();if(disarmAudioGesture)disarmAudioGesture()});
audio.addEventListener('pause',()=>{if(!audio.ended)started=false});
window.__RALUVAAA_AUDIO__={audio,start,get enabled(){return enabled},get started(){return started},url:AUDIO_URL};
})();