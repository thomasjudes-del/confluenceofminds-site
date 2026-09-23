(function(){
'use strict';
const A=window.__RALUVAAA_AUDIO__;
if(!A||!A.audio)return;
const audio=A.audio;
const base='https://incompetech.com/music/royalty-free/mp3-royaltyfree/';
const tracks=[
  {name:'Immersed',file:'Immersed.mp3',isrc:'USUAN1600010'}
];
const KEY='raluvaaaAmbientTrackV27';
let index=Math.max(0,Math.min(tracks.length-1,Number(localStorage.getItem(KEY)||0)||0));
let advancing=false;
audio.loop=true;
audio.preload='auto';

function trackUrl(t){return base+encodeURIComponent(t.file)}
function pageUrl(t){return 'https://incompetech.com/music/royalty-free/index.html?isrc='+encodeURIComponent(t.isrc)}
function current(){return tracks[index]}
function refresh(){
  const t=current(),credit=document.getElementById('ambientCredit'),btn=document.getElementById('musicBtn');
  if(credit)credit.innerHTML='Ambient: <a href="'+pageUrl(t)+'" target="_blank" rel="noopener">'+t.name+'</a> &middot; Kevin MacLeod &middot; <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>';
  if(btn)btn.title=(A.enabled?'Couper':'Activer')+' la musique · '+t.name+' · Kevin MacLeod';
}
function loadCurrent(){
  const wanted=trackUrl(current());
  if(!audio.src||decodeURI(audio.src)!==decodeURI(wanted))audio.src=wanted;
  refresh();
}
async function advance(){
  if(advancing)return;
  advancing=true;
  index=(index+1)%tracks.length;
  localStorage.setItem(KEY,String(index));
  audio.src=trackUrl(current());
  refresh();
  if(A.enabled){try{await audio.play()}catch{}}
  advancing=false;
}
audio.addEventListener('ended',advance);
audio.addEventListener('error',()=>{if(!advancing)setTimeout(advance,900)});
loadCurrent();
window.__RALUVAAA_PLAYLIST__={tracks:tracks.map(x=>x.name),get index(){return index},get current(){return current().name},advance};
})();