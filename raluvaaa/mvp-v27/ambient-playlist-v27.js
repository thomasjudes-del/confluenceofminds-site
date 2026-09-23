(function(){
'use strict';
const A=window.__RALUVAAA_AUDIO__;
if(!A||!A.audio)return;
const audio=A.audio;
const base='https://incompetech.com/music/royalty-free/mp3-royaltyfree/';
const tracks=[
 ['Immersed','Immersed.mp3','USUAN1600010'],
 ['Meditation Impromptu 01','Meditation Impromptu 01.mp3','USUAN1100163'],
 ['Windswept','Windswept.mp3','USUAN1100757'],
 ['Dream Culture','Dream Culture.mp3','USUAN1300046']
];
const key='raluvaaaAmbientTrackV27';
let i=Math.max(0,Math.min(tracks.length-1,Number(localStorage.getItem(key)||0)||0));
audio.loop=false;
function trackUrl(t){return base+encodeURIComponent(t[1])}
function pageUrl(t){return 'https://incompetech.com/music/royalty-free/index.html?isrc='+encodeURIComponent(t[2])}
function credit(){
 const c=document.getElementById('ambientCredit'),t=tracks[i];
 if(c)c.innerHTML='Ambient: <a href="'+pageUrl(t)+'" target="_blank" rel="noopener">'+t[0]+'</a> &middot; Kevin MacLeod &middot; <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>';
}
function advance(){
 i=(i+1)%tracks.length;localStorage.setItem(key,String(i));audio.src=trackUrl(tracks[i]);credit();
 if(A.enabled)audio.play().catch(()=>{});
}
audio.addEventListener('ended',advance);
audio.addEventListener('error',()=>setTimeout(advance,700));
credit();
window.__RALUVAAA_PLAYLIST__={tracks:tracks.map(t=>t[0]),get index(){return i},advance};
})();