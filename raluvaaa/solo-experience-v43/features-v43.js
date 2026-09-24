(function(){
'use strict';

const VERSION=43;
const params=new URLSearchParams(location.search);
const actor=params.get('actor')||'local';
const SAVE_KEY='raluvaaaSavedWishesV1:'+actor;
const MUSIC_URL=window.__RALUVAAA_AUDIO__?.url||'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Immersed.mp3';
const MUSIC_CREDIT='Immersed · Kevin MacLeod · CC BY 4.0';
const W=720,H=900,DURATION=6000,FPS=30;

const bookmarkSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z"/></svg>';

const palettes=[
  {bg:'#07111b',bg2:'#102331',ink:'#edf4f1',muted:'#a9b8b4',a:'#78a9a3',b:'#d0b58a',c:'#7f8eae'},
  {bg:'#0b0d18',bg2:'#251b2a',ink:'#f1ecef',muted:'#b8aab2',a:'#b18ca5',b:'#d3b28f',c:'#7b93aa'},
  {bg:'#09110f',bg2:'#1d2a21',ink:'#eef1e8',muted:'#aab7a7',a:'#8cad8b',b:'#c6ad79',c:'#789898'},
  {bg:'#080d17',bg2:'#171f31',ink:'#eef2f7',muted:'#a6afc0',a:'#8298b7',b:'#b8a1c1',c:'#c3aa82'},
  {bg:'#0d1115',bg2:'#2a2020',ink:'#f2eee9',muted:'#b9aca4',a:'#b48c7e',b:'#c8b388',c:'#77989a'}
];

const templateNames=['Pulse','Branch','Bridge','Bloom','Awaken'];
let shareStyle=Math.floor(Date.now()/1000)%5;
let shareMode='image';
let shareAnimationFrame=0;
let shareStartedAt=performance.now();
let shareWish=null;
let shareStatus='';
let recorderBusy=false;

function lang(){
  return document.querySelector('.lang button.active')?.dataset.lang==='en'?'en':'fr';
}
function copy(){
  return lang()==='en'?{
    save:'Save',saved:'Saved',savedTitle:'Saved wishes',savedEmpty:'Save wishes you want to revisit, help or connect later.',
    entrusted:'Entrusted for now',remove:'Remove',unavailable:'Unavailable in this local session',
    shareTitle:'Share this wish',image:'Still image',animation:'Animated clip',style:'Style',preview:'Preview',
    shareNow:'Share',download:'Download',copyLink:'Copy link',close:'Close',creating:'Creating media…',
    copied:'Link copied',fallback:'Your browser cannot export this animation. The still image is available.',
    shareText:'Discover this wish on RALUVAAA',simulated:'SIMULATED WISH',local:'LOCAL POC WISH',human:'HUMAN WISH',
    audioFail:'Music could not be embedded in this browser. The clip will be silent.',saveFailed:'Could not save this wish.'
  }:{
    save:'Sauvegarder',saved:'Sauvegardé',savedTitle:'Wishes sauvegardés',savedEmpty:'Sauvegarde les wishes que tu veux retrouver, aider ou connecter plus tard.',
    entrusted:'Confiés pour un temps',remove:'Retirer',unavailable:'Indisponible dans cette session locale',
    shareTitle:'Partager ce wish',image:'Image fixe',animation:'Clip animé',style:'Style',preview:'Aperçu',
    shareNow:'Partager',download:'Télécharger',copyLink:'Copier le lien',close:'Fermer',creating:'Création du média…',
    copied:'Lien copié',fallback:"Ce navigateur ne peut pas exporter l'animation. L'image fixe reste disponible.",
    shareText:'Découvrir ce wish sur RALUVAAA',simulated:'WISH SIMULÉ',local:'WISH LOCAL POC',human:'WISH HUMAIN',
    audioFail:"La musique n'a pas pu être intégrée par ce navigateur. Le clip sera muet.",saveFailed:"Impossible de sauvegarder ce wish."
  };
}
function toast(msg){
  const el=document.getElementById('toast');
  if(!el)return;
  el.textContent=msg;el.classList.add('show-toast');
  clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove('show-toast'),1800);
}
function semantic(){return window.__RV26_SOLO__?.semantic?.()||window.__RV26_SHARED__?.semantic?.()||[]}
function current(){return window.__RALUVAAA_UI__?.current?.()||null}
function workflow(){return window.__RALUVAAA_WORKFLOW_V41__||null}
function loadSaved(){
  try{
    const v=JSON.parse(localStorage.getItem(SAVE_KEY)||'[]');
    return Array.isArray(v)?v.filter(x=>x&&x.semanticId&&x.lineageId):[];
  }catch{return[]}
}
function saveSaved(rows){
  localStorage.setItem(SAVE_KEY,JSON.stringify(rows.slice(0,250)));
  window.dispatchEvent(new CustomEvent('raluvaaa-saved-changed',{detail:{count:rows.length}}));
}
function resolveSaved(row){
  const rows=semantic(),by=new Map(rows.map(x=>[x.semanticId,x])),wf=workflow();
  let id=row.semanticId,guard=0,next=null;
  while(guard++<100&&by.has(id)&&wf?.evolveChild&&(next=wf.evolveChild(id)))id=next;
  if(by.has(id))return by.get(id);
  const lineage=rows.filter(x=>x.lineageId===row.lineageId);
  if(!lineage.length)return null;
  const root=lineage.find(x=>x.kind==='create')||lineage[0];
  id=root.semanticId;guard=0;
  while(guard++<100&&wf?.evolveChild&&(next=wf.evolveChild(id)))id=next;
  return by.get(id)||root;
}
function savedRecordFor(m){
  if(!m)return null;
  return loadSaved().find(row=>row.semanticId===m.semanticId||resolveSaved(row)?.semanticId===m.semanticId)||null;
}
function toggleSaved(m){
  if(!m)return;
  let rows=loadSaved();
  const existing=savedRecordFor(m);
  if(existing)rows=rows.filter(x=>!(x.semanticId===existing.semanticId&&x.lineageId===existing.lineageId));
  else rows.unshift({semanticId:m.semanticId,lineageId:m.lineageId,savedAt:Date.now(),text:m.text||'',loc:m.loc||''});
  try{saveSaved(rows);decorate();toast(existing?copy().remove:copy().saved)}catch{toast(copy().saveFailed)}
}
function stateLabel(m){
  if(!m)return'';
  if(m.state==='bloom')return lang()==='en'?'Bloomed':'Fleuri';
  if(m.state==='abandoned')return lang()==='en'?'Let go':'Laissé';
  if(window.__RALUVAAA_VITALITY_V42__?.isDormant?.(m.semanticId))return lang()==='en'?'Dormant':'Dormant';
  return lang()==='en'?'Alive':'Vivant';
}
function ensureBookmark(){
  const head=document.querySelector('#drawer:not(.hidden) .drawer-head'),m=current();
  let btn=document.getElementById('v43BookmarkBtn');
  if(!head||!m){
    btn?.remove();return;
  }
  if(!btn){
    btn=document.createElement('button');
    btn.id='v43BookmarkBtn';
    btn.type='button';
    btn.className='v43-bookmark';
    btn.innerHTML=bookmarkSvg+'<span></span>';
    const close=document.getElementById('drawerClose');
    head.insertBefore(btn,close||null);
    btn.onclick=e=>{e.stopPropagation();toggleSaved(current())};
  }
  const is=!!savedRecordFor(m),t=copy();
  btn.classList.toggle('active',is);
  btn.querySelector('span').textContent=is?t.saved:t.save;
  btn.title=is?t.saved:t.save;
  btn.setAttribute('aria-pressed',is?'true':'false');
}
function decorateEntrusted(){
  const body=document.getElementById('drawerBody');
  const active=document.getElementById('entrustedBtn')?.classList.contains('active');
  if(!body||!active||document.getElementById('drawer')?.classList.contains('hidden'))return;
  if(body.querySelector('.v43-library-marker'))return;
  const t=copy();
  const first=document.createElement('div');
  first.className='drawer-kicker v43-library-marker';
  first.textContent=t.entrusted;
  body.prepend(first);

  const saved=document.createElement('section');
  saved.className='v43-saved-section';
  const rows=loadSaved();
  saved.innerHTML='<div class="v43-saved-head"><div class="drawer-kicker">'+escapeHtml(t.savedTitle)+'</div><span>'+rows.length+'</span></div>';
  const list=document.createElement('div');
  list.className='v43-saved-list';
  if(!rows.length){
    list.innerHTML='<div class="empty">'+escapeHtml(t.savedEmpty)+'</div>';
  }else{
    for(const row of rows){
      const m=resolveSaved(row);
      const item=document.createElement('div');
      item.className='v43-saved-row';
      if(m){
        const open=document.createElement('button');
        open.className='drawer-item v43-saved-open';
        open.innerHTML='<span><div class="t">'+escapeHtml(m.text||row.text||'')+'</div><div class="m">'+escapeHtml(m.loc||row.loc||'')+'</div></span><span class="state">'+escapeHtml(stateLabel(m))+'</span>';
        open.onclick=()=>window.__RALUVAAA_UI__?.navigateWish?.(m.semanticId);
        item.appendChild(open);
      }else{
        const unavailable=document.createElement('div');
        unavailable.className='drawer-item v43-saved-unavailable';
        unavailable.innerHTML='<span><div class="t">'+escapeHtml(row.text||'Wish')+'</div><div class="m">'+escapeHtml(t.unavailable)+'</div></span>';
        item.appendChild(unavailable);
      }
      const remove=document.createElement('button');
      remove.className='v43-saved-remove';remove.type='button';remove.textContent='×';remove.title=t.remove;
      remove.onclick=()=>{saveSaved(loadSaved().filter(x=>!(x.semanticId===row.semanticId&&x.lineageId===row.lineageId)));decorateEntrustedFresh()};
      item.appendChild(remove);
      list.appendChild(item);
    }
  }
  saved.appendChild(list);
  body.appendChild(saved);
}
function decorateEntrustedFresh(){
  const body=document.getElementById('drawerBody');
  body?.querySelector('.v43-library-marker')?.remove();
  body?.querySelector('.v43-saved-section')?.remove();
  decorateEntrusted();
  ensureBookmark();
}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function hash(s){let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function seeded(seed){let x=hash(seed)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%100000)/100000}}
function lerp(a,b,t){return a+(b-a)*t}
function ease(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}
function roundRect(ctx,x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath()
}
function wrapText(ctx,text,maxWidth,maxLines){
  const words=String(text||'').split(/\s+/),lines=[];let line='';
  for(const word of words){
    const test=line?line+' '+word:word;
    if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word;if(lines.length===maxLines-1)break}else line=test
  }
  if(line&&lines.length<maxLines)lines.push(line);
  if(words.join(' ')!==lines.join(' ')&&lines.length){let last=lines.length-1;while(ctx.measureText(lines[last]+'…').width>maxWidth&&lines[last].length>2)lines[last]=lines[last].slice(0,-1);lines[last]+='…'}
  return lines
}
function background(ctx,p){
  const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,p.bg);g.addColorStop(1,p.bg2);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  const rg=ctx.createRadialGradient(W*.52,H*.42,20,W*.52,H*.42,W*.62);rg.addColorStop(0,'rgba(190,211,207,.055)');rg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=rg;ctx.fillRect(0,0,W,H)
}
function dot(ctx,x,y,r,color,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore()}
function line(ctx,a,b,color,width=1,alpha=.5){ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore()}
function drawPulse(ctx,t,p,seed){
  const rnd=seeded(seed+'pulse'),cx=W*.5,cy=H*.39;
  for(let i=0;i<28;i++){const a=rnd()*Math.PI*2,d=70+rnd()*220;const x=cx+Math.cos(a)*d,y=cy+Math.sin(a)*d*.72;line(ctx,{x:cx,y:cy},{x,y},p.a,.8,.08);dot(ctx,x,y,1.2+rnd()*2,p.c,.18+rnd()*.35)}
  const beat=.5+.5*Math.sin(t*Math.PI*4),r=17+beat*7;
  const g=ctx.createRadialGradient(cx,cy,2,cx,cy,55);g.addColorStop(0,'rgba(220,235,229,.28)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,55,0,Math.PI*2);ctx.fill();dot(ctx,cx,cy,r,p.a,.95);dot(ctx,cx,cy,5,p.b,.9)
}
function bezierPoint(p0,p1,p2,p3,t){const u=1-t;return{x:u*u*u*p0.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*p3.x,y:u*u*u*p0.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*p3.y}}
function strokeCurve(ctx,pts,progress,color,width,alpha){
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.globalAlpha=alpha;ctx.lineCap='round';ctx.beginPath();
  const steps=80,n=Math.max(2,Math.floor(steps*Math.max(.02,progress)));
  for(let i=0;i<=n;i++){const q=bezierPoint(...pts,i/steps);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)}
  ctx.stroke();ctx.restore()
}
function drawBranch(ctx,t,p){
  const prog=ease(Math.min(1,t*1.25)),root={x:W*.23,y:H*.54},end={x:W*.72,y:H*.28};
  const main=[root,{x:W*.35,y:H*.48},{x:W*.55,y:H*.42},end];strokeCurve(ctx,main,prog,p.a,5,.76);
  const q1=bezierPoint(...main,.48),q2=bezierPoint(...main,.7);
  strokeCurve(ctx,[q1,{x:q1.x+20,y:q1.y-20},{x:W*.48,y:H*.29},{x:W*.55,y:H*.2}],Math.max(0,(prog-.35)/.65),p.c,3,.66);
  strokeCurve(ctx,[q2,{x:q2.x+12,y:q2.y+35},{x:W*.67,y:H*.52},{x:W*.78,y:H*.56}],Math.max(0,(prog-.5)/.5),p.b,3,.6);
  dot(ctx,root.x,root.y,8,p.b,.75);if(prog>.92)dot(ctx,end.x,end.y,9,p.a,.86)
}
function drawBridge(ctx,t,p,seed){
  const rnd=seeded(seed+'bridge'),l={x:W*.25,y:H*.4},r={x:W*.75,y:H*.43};
  for(const c of [l,r])for(let i=0;i<12;i++){const a=rnd()*Math.PI*2,d=18+rnd()*85;const q={x:c.x+Math.cos(a)*d,y:c.y+Math.sin(a)*d*.7};line(ctx,c,q,p.c,.7,.12);dot(ctx,q.x,q.y,1+rnd()*2,p.a,.28)}
  const prog=ease(Math.min(1,t*1.4));ctx.save();ctx.strokeStyle=p.b;ctx.globalAlpha=.75;ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();
  const steps=80,n=Math.max(2,Math.floor(steps*prog));for(let i=0;i<=n;i++){const tt=i/steps,x=lerp(l.x,r.x,tt),y=lerp(l.y,r.y,tt)-Math.sin(tt*Math.PI)*105;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();ctx.restore();
  dot(ctx,l.x,l.y,9,p.a,.84);dot(ctx,r.x,r.y,9,p.c,.84)
}
function drawFlower(ctx,t,p){
  const cx=W*.5,cy=H*.4,open=ease(Math.min(1,t*1.6)),petals=7;
  ctx.save();ctx.translate(cx,cy);for(let i=0;i<petals;i++){const a=-Math.PI/2+i*Math.PI*2/petals,d=44*open;ctx.save();ctx.rotate(a);ctx.translate(d,0);ctx.scale(open,.7+open*.3);ctx.fillStyle=i%2?p.a:p.c;ctx.globalAlpha=.74;ctx.beginPath();ctx.ellipse(0,0,42,18,0,0,Math.PI*2);ctx.fill();ctx.restore()}dot(ctx,0,0,15,p.b,.92);ctx.restore()
}
function drawAwaken(ctx,t,p,seed){
  const rnd=seeded(seed+'awake'),cx=W*.5,cy=H*.4,awake=ease(Math.max(0,(t-.12)/.88));
  ctx.save();ctx.globalAlpha=.18+awake*.62;ctx.strokeStyle=p.a;ctx.lineWidth=2.4;ctx.lineCap='round';
  for(let i=0;i<11;i++){const a=(i/11)*Math.PI*2,d=55+rnd()*125;ctx.beginPath();ctx.moveTo(cx,cy);ctx.quadraticCurveTo(cx+Math.cos(a+.45)*d*.55,cy+Math.sin(a+.45)*d*.4,cx+Math.cos(a)*d,cy+Math.sin(a)*d*.68);ctx.stroke()}
  ctx.restore();dot(ctx,cx,cy,10+awake*7,p.b,.55+awake*.35)
}
function overlay(ctx,m,p,mode){
  const t=copy(),pad=48;
  ctx.fillStyle='rgba(3,8,14,.52)';roundRect(ctx,30,30,W-60,H-60,32);ctx.fill();
  ctx.fillStyle=p.ink;ctx.font='600 18px system-ui,sans-serif';ctx.letterSpacing='3px';ctx.fillText('RALUVAAA',pad,72);
  const badge=m.simulated?t.simulated:(m.owner?t.local:t.human);
  ctx.font='600 11px system-ui,sans-serif';ctx.fillStyle=p.muted;ctx.fillText(badge,pad,99);
  ctx.font='36px Georgia,serif';ctx.fillStyle=p.ink;
  const lines=wrapText(ctx,m.text||'',W-pad*2,4);let y=585;for(const s of lines){ctx.fillText(s,pad,y);y+=46}
  if(m.loc){ctx.font='500 14px system-ui,sans-serif';ctx.fillStyle=p.muted;ctx.fillText(m.loc,pad,Math.min(790,y+16))}
  ctx.font='650 14px system-ui,sans-serif';ctx.fillStyle=p.b;ctx.fillText(t.shareText.toUpperCase(),pad,842);
  if(mode==='animation'){ctx.font='500 9px system-ui,sans-serif';ctx.fillStyle='rgba(220,228,225,.46)';ctx.fillText('Music: '+MUSIC_CREDIT,pad,868)}
}
function renderFrame(canvas,m,style,timeMs,mode='animation'){
  const ctx=canvas.getContext('2d'),p=palettes[style%palettes.length],t=((timeMs%DURATION)/DURATION),seed=m.semanticId||m.text||'wish';
  background(ctx,p);
  const localT=mode==='image'?.58:t;
  if(style===0)drawPulse(ctx,localT,p,seed);
  if(style===1)drawBranch(ctx,localT,p);
  if(style===2)drawBridge(ctx,localT,p,seed);
  if(style===3)drawFlower(ctx,localT,p);
  if(style===4)drawAwaken(ctx,localT,p,seed);
  overlay(ctx,m,p,mode);
}
function shareUrl(m){
  const base=window.RALUVAAA_PUBLIC_BASE_URL||location.href;
  const u=new URL(base,location.href);
  ['actor','qa','soloqa','sharedqa','reset'].forEach(k=>u.searchParams.delete(k));
  u.hash='wish='+encodeURIComponent(m.semanticId);
  return u.href
}
function fileName(m,ext){return'raluvaaa-'+String(m.semanticId||'wish').replace(/[^a-z0-9_-]+/gi,'-').slice(0,42)+'.'+ext}
function canvasBlob(canvas,type='image/png',quality=.94){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Canvas export failed')),type,quality))}
function bestMime(){
  if(!window.MediaRecorder)return null;
  const types=['video/mp4;codecs=h264,aac','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  return types.find(x=>MediaRecorder.isTypeSupported?.(x))||'video/webm';
}
async function audioTrack(durationMs){
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC||!MUSIC_URL)return null;
  const ac=new AC();
  try{
    const res=await fetch(MUSIC_URL,{mode:'cors',cache:'force-cache'});
    if(!res.ok)throw new Error('music '+res.status);
    const buffer=await ac.decodeAudioData(await res.arrayBuffer());
    const dest=ac.createMediaStreamDestination(),src=ac.createBufferSource(),gain=ac.createGain();
    gain.gain.value=.16;src.buffer=buffer;src.connect(gain);gain.connect(dest);
    const maxOffset=Math.max(0,buffer.duration-durationMs/1000-.2),offset=Math.min(22,maxOffset);
    src.start(0,offset,durationMs/1000+.1);
    return{track:dest.stream.getAudioTracks()[0],stop(){try{src.stop()}catch{}setTimeout(()=>ac.close().catch(()=>{}),50)}}
  }catch{try{await ac.close()}catch{}return null}
}
async function recordAnimation(canvas,m,style,durationMs=DURATION){
  if(!canvas.captureStream||!window.MediaRecorder)throw new Error('animation-unsupported');
  const mime=bestMime();if(!mime)throw new Error('animation-unsupported');
  const video=canvas.captureStream(FPS),music=await audioTrack(durationMs),tracks=[...video.getVideoTracks()];
  if(music?.track)tracks.push(music.track);
  const stream=new MediaStream(tracks),chunks=[],rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2800000});
  const result=new Promise((resolve,reject)=>{rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};rec.onerror=e=>reject(e.error||new Error('recording failed'));rec.onstop=()=>resolve({blob:new Blob(chunks,{type:mime}),mime,audioEmbedded:!!music?.track})});
  const began=performance.now();rec.start(200);
  await new Promise(resolve=>{
    const frame=now=>{const elapsed=now-began;renderFrame(canvas,m,style,elapsed,'animation');if(elapsed<durationMs)requestAnimationFrame(frame);else resolve()};
    requestAnimationFrame(frame)
  });
  rec.stop();music?.stop();video.getTracks().forEach(t=>t.stop());
  return result
}
async function shareFile(file,m){
  const url=shareUrl(m),t=copy(),payload={title:'RALUVAAA · '+(m.text||'Wish'),text:t.shareText+'\n'+url,url,files:[file]};
  try{
    if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share(payload);window.dispatchEvent(new CustomEvent('raluvaaa-share'));return'shared'}
  }catch(e){if(e?.name==='AbortError')return'aborted'}
  downloadFile(file);
  await copyUrl(url);
  window.dispatchEvent(new CustomEvent('raluvaaa-share'));
  return'downloaded'
}
function downloadFile(file){
  const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=file.name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)
}
async function copyUrl(url){
  try{await navigator.clipboard.writeText(url);toast(copy().copied)}catch{prompt(copy().copyLink,url)}
}
function supportsAnimation(){return !!(HTMLCanvasElement.prototype.captureStream&&window.MediaRecorder&&bestMime())}
function modalHtml(){
  const t=copy();
  return'<div class="v43-share-scrim"></div><section class="v43-share-sheet" role="dialog" aria-modal="true" aria-label="'+escapeHtml(t.shareTitle)+'">'+
    '<header><div><span class="v43-eyebrow">RALUVAAA SHARE</span><h3>'+escapeHtml(t.shareTitle)+'</h3></div><button class="v43-share-x" aria-label="'+escapeHtml(t.close)+'">×</button></header>'+
    '<div class="v43-share-modes"><button data-mode="image">'+escapeHtml(t.image)+'</button><button data-mode="animation">'+escapeHtml(t.animation)+'</button></div>'+
    '<div class="v43-share-preview"><canvas width="'+W+'" height="'+H+'"></canvas><div class="v43-share-busy hidden">'+escapeHtml(t.creating)+'</div></div>'+
    '<div class="v43-share-styles"><span>'+escapeHtml(t.style)+'</span>'+templateNames.map((n,i)=>'<button data-style="'+i+'" title="'+n+'">'+(i+1)+'</button>').join('')+'</div>'+
    '<div class="v43-share-credit">'+escapeHtml(MUSIC_CREDIT)+'</div><div class="v43-share-status"></div>'+
    '<footer><button data-share-copy>'+escapeHtml(t.copyLink)+'</button><button data-share-download>'+escapeHtml(t.download)+'</button><button class="primary" data-share-now>'+escapeHtml(t.shareNow)+'</button></footer></section>';
}
function openShare(m){
  shareWish={...m};shareStyle=(hash(m.semanticId+'|'+Date.now())%5);shareMode='image';shareStartedAt=performance.now();shareStatus='';
  let host=document.getElementById('v43ShareOverlay');
  if(!host){host=document.createElement('div');host.id='v43ShareOverlay';document.body.appendChild(host)}
  host.innerHTML=modalHtml();host.classList.add('open');
  const canvas=host.querySelector('canvas');
  host.querySelector('.v43-share-x').onclick=closeShare;host.querySelector('.v43-share-scrim').onclick=closeShare;
  host.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{shareMode=b.dataset.mode;if(shareMode==='animation'&&!supportsAnimation())shareStatus=copy().fallback;else shareStatus='';syncShareUi()});
  host.querySelectorAll('[data-style]').forEach(b=>b.onclick=()=>{shareStyle=Number(b.dataset.style)||0;shareStartedAt=performance.now();syncShareUi()});
  host.querySelector('[data-share-copy]').onclick=()=>copyUrl(shareUrl(shareWish));
  host.querySelector('[data-share-download]').onclick=()=>createShareMedia(false);
  host.querySelector('[data-share-now]').onclick=()=>createShareMedia(true);
  syncShareUi();animatePreview();
}
function closeShare(){
  const host=document.getElementById('v43ShareOverlay');host?.classList.remove('open');shareWish=null;cancelAnimationFrame(shareAnimationFrame)
}
function syncShareUi(){
  const host=document.getElementById('v43ShareOverlay');if(!host||!shareWish)return;
  host.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===shareMode));
  host.querySelectorAll('[data-style]').forEach(b=>b.classList.toggle('active',Number(b.dataset.style)===shareStyle));
  host.querySelector('.v43-share-credit').classList.toggle('visible',shareMode==='animation');
  host.querySelector('.v43-share-status').textContent=shareStatus;
  renderFrame(host.querySelector('canvas'),shareWish,shareStyle,shareMode==='image'?DURATION*.58:(performance.now()-shareStartedAt),'animation');
}
function animatePreview(){
  cancelAnimationFrame(shareAnimationFrame);
  const step=now=>{
    const host=document.getElementById('v43ShareOverlay');
    if(!host?.classList.contains('open')||!shareWish)return;
    if(shareMode==='animation')renderFrame(host.querySelector('canvas'),shareWish,shareStyle,now-shareStartedAt,'animation');
    else renderFrame(host.querySelector('canvas'),shareWish,shareStyle,DURATION*.58,'image');
    shareAnimationFrame=requestAnimationFrame(step)
  };
  shareAnimationFrame=requestAnimationFrame(step)
}
async function createShareMedia(doShare){
  if(recorderBusy||!shareWish)return;
  const host=document.getElementById('v43ShareOverlay'),canvas=host.querySelector('canvas'),busy=host.querySelector('.v43-share-busy');
  recorderBusy=true;busy.classList.remove('hidden');shareStatus='';syncShareUi();
  try{
    if(shareMode==='image'){
      renderFrame(canvas,shareWish,shareStyle,DURATION*.58,'image');
      const blob=await canvasBlob(canvas,'image/png'),file=new File([blob],fileName(shareWish,'png'),{type:'image/png'});
      if(doShare)await shareFile(file,shareWish);else{downloadFile(file);window.dispatchEvent(new CustomEvent('raluvaaa-share'))}
    }else{
      if(!supportsAnimation())throw new Error('animation-unsupported');
      const rec=await recordAnimation(canvas,shareWish,shareStyle,DURATION),ext=rec.mime.includes('mp4')?'mp4':'webm',file=new File([rec.blob],fileName(shareWish,ext),{type:rec.mime});
      if(!rec.audioEmbedded)shareStatus=copy().audioFail;
      if(doShare)await shareFile(file,shareWish);else{downloadFile(file);window.dispatchEvent(new CustomEvent('raluvaaa-share'))}
    }
  }catch(e){
    console.error(e);shareStatus=e?.message==='animation-unsupported'?copy().fallback:String(e?.message||e)
  }finally{busy.classList.add('hidden');recorderBusy=false;syncShareUi()}
}
function interceptShare(e){
  const button=e.target.closest?.('[data-act="share"],.v33-action-unit[data-v39-icon="share"] .v33-action-circle');
  if(!button)return;
  const m=current();if(!m)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openShare(m)
}
function decorate(){
  document.title='RALUVAAA · Experience V43';
  const sub=document.querySelector('#brand .sub');if(sub)sub.textContent='EXPERIENCE V43';
  ensureBookmark();decorateEntrusted();
}
let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate()})}
new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-panel','data-open','data-v39-icon']});
document.addEventListener('click',interceptShare,true);
window.addEventListener('raluvaaa-saved-changed',()=>{decorateEntrustedFresh();ensureBookmark()});
decorate();setTimeout(decorate,120);setTimeout(decorate,400);

window.__RALUVAAA_V43__={
  version:43,
  templates:templateNames.slice(),
  palettes:palettes.map(x=>({...x})),
  supportsAnimation,
  saved:()=>loadSaved().map(x=>({...x})),
  resolveSaved:id=>{const r=loadSaved().find(x=>x.semanticId===id);return r?resolveSaved(r):null},
  toggleSaved:id=>{const m=semantic().find(x=>x.semanticId===id);if(m)toggleSaved(m)},
  shareUrl:id=>{const m=semantic().find(x=>x.semanticId===id);return m?shareUrl(m):null},
  renderFrame:(canvas,id,style=0,t=3500,mode='image')=>{const m=semantic().find(x=>x.semanticId===id);if(m)renderFrame(canvas,m,style,t,mode)},
  openShare:id=>{const m=semantic().find(x=>x.semanticId===id);if(m)openShare(m)},
  createStill:async(id,style=0)=>{const m=semantic().find(x=>x.semanticId===id);if(!m)return null;const c=document.createElement('canvas');c.width=W;c.height=H;renderFrame(c,m,style,DURATION*.58,'image');return canvasBlob(c)},
  record:async(id,style=0,durationMs=900)=>{const m=semantic().find(x=>x.semanticId===id);if(!m)return null;const c=document.createElement('canvas');c.width=W;c.height=H;return recordAnimation(c,m,style,durationMs)}
};
})();