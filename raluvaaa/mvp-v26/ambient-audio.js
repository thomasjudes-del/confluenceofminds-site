(function(){
'use strict';

const AUDIO_URL='https://incompetech.com/music/royalty-free/mp3-royaltyfree/Immersed.mp3';
const STORE='raluvaaaAmbientAudioV1';
const params=new URLSearchParams(location.search);
const qa=params.has('qa')||params.has('sharedqa')||params.has('soloqa');
const audio=new Audio(AUDIO_URL);
audio.loop=true;
audio.preload='none';
audio.volume=.16;
let enabled=localStorage.getItem(STORE)!=='off';
let started=false;

function installStyle(){
  const style=document.createElement('style');
  style.textContent=`
    #musicBtn{font-size:15px}
    #musicBtn.muted{opacity:.46}
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
  btn.textContent='♪';
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
    if(enabled)start();else{audio.pause();started=false}
    refresh();
  };
  refresh();
}

function refresh(){
  const btn=document.getElementById('musicBtn');
  if(!btn)return;
  btn.classList.toggle('muted',!enabled);
  btn.textContent=enabled?'♪':'×';
  btn.setAttribute('aria-pressed',enabled?'true':'false');
  btn.title=enabled?'Couper la musique · Immersed · Kevin MacLeod · CC BY 4.0':'Activer la musique · Immersed · Kevin MacLeod · CC BY 4.0';
}

async function start(){
  if(!enabled||started||qa)return;
  try{
    await audio.play();
    started=true;
    refresh();
  }catch{
    started=false;
  }
}

function arm(){
  if(qa)return;
  const begin=()=>{start();document.removeEventListener('pointerdown',begin,true);document.removeEventListener('keydown',begin,true)};
  document.addEventListener('pointerdown',begin,true);
  document.addEventListener('keydown',begin,true);
}

installStyle();
installUi();
arm();

window.__RALUVAAA_AUDIO__={audio,start,get enabled(){return enabled},url:AUDIO_URL};
})();