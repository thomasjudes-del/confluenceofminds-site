(function(){
'use strict';

const VERSION=45;
const params=new URLSearchParams(location.search);
const actor=params.get('actor')||'local';
const SAVE_KEY='raluvaaaSavedWishesV1:'+actor;

const bookmarkSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z"/></svg>';

const palettes=[
  {bg:'#06111f',bg2:'#102b35',ink:'#f5f4ef',muted:'#b5c8ca',a:'#65d6cf',b:'#f2c979',c:'#ef91ad',d:'#9b8df2'},
  {bg:'#090d22',bg2:'#2a1635',ink:'#f7f0f5',muted:'#c7b7cc',a:'#b494ff',b:'#ffb276',c:'#ff7f9e',d:'#6fd4de'},
  {bg:'#071917',bg2:'#24351f',ink:'#f4f5e9',muted:'#bacbb5',a:'#9cdda1',b:'#f0c767',c:'#79d9c9',d:'#d897d6'},
  {bg:'#071124',bg2:'#1f3151',ink:'#f3f6ff',muted:'#b8c7df',a:'#7fb8ff',b:'#c7a0ff',c:'#ff9e81',d:'#f0d579'},
  {bg:'#130d18',bg2:'#40221f',ink:'#fff1e8',muted:'#d3b7aa',a:'#ff9d7c',b:'#f1cc77',c:'#cf8bd4',d:'#6fc7c7'}
];

const templateNames=['Pulse','Branch','Bridge','Bloom','Awaken'];

function lang(){
  return document.querySelector('.lang button.active')?.dataset.lang==='en'?'en':'fr';
}
function copy(){
  return lang()==='en'?{
    save:'Save',saved:'Saved',saveWish:'Save this wish',savedWish:'Saved',savedTitle:'Saved wishes',savedEmpty:'Save wishes you want to revisit, help or connect later.',
    entrusted:'Entrusted for now',remove:'Remove',unavailable:'Unavailable in this local session',
    shareTitle:'Share this wish',image:'Still image',animation:'Animated clip',style:'Style',preview:'Preview',
    shareNow:'Share',download:'Download',copyLink:'Copy link',close:'Close',
    copied:'Link copied',downloaded:'Downloaded',shared:'Share opened',copyFailed:'Copy failed. Select the link below.',fallback:'Sharing is unavailable here. The link has been copied.',
    shareText:'Discover this wish on RALUVAAA',simulated:'SIMULATED WISH',local:'LOCAL POC WISH',human:'HUMAN WISH',
    saveFailed:'Could not save this wish.'
  }:{
    save:'Sauvegarder',saved:'Sauvegardé',saveWish:'Sauvegarder ce wish',savedWish:'Sauvegardé',savedTitle:'Wishes sauvegardés',savedEmpty:'Sauvegarde les wishes que tu veux retrouver, aider ou connecter plus tard.',
    entrusted:'Confiés pour un temps',remove:'Retirer',unavailable:'Indisponible dans cette session locale',
    shareTitle:'Partager ce wish',image:'Image fixe',animation:'Clip animé',style:'Style',preview:'Aperçu',
    shareNow:'Partager',download:'Télécharger',copyLink:'Copier le lien',close:'Fermer',
    copied:'Lien copié',downloaded:'Téléchargé',shared:'Partage ouvert',copyFailed:'Copie impossible. Sélectionne le lien ci-dessous.',fallback:'Le partage natif est indisponible ici. Le lien a été copié.',
    shareText:'Découvrir ce wish sur RALUVAAA',simulated:'WISH SIMULÉ',local:'WISH LOCAL POC',human:'WISH HUMAIN',
    saveFailed:"Impossible de sauvegarder ce wish."
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
function ensureMobileBookmark(){
  const body=document.getElementById('drawerBody'),m=current();
  let btn=document.getElementById('v43MobileBookmarkBtn');
  if(!body||!m){
    btn?.remove();
    return;
  }
  if(!btn){
    btn=document.createElement('button');
    btn.id='v43MobileBookmarkBtn';
    btn.type='button';
    btn.className='v43-mobile-bookmark';
    btn.innerHTML=bookmarkSvg+'<span></span>';
    const meta=body.querySelector('.meta');
    if(meta)meta.insertAdjacentElement('afterend',btn);
    else body.prepend(btn);
    btn.onclick=e=>{e.stopPropagation();toggleSaved(current())};
  }else if(!body.contains(btn)){
    const meta=body.querySelector('.meta');
    if(meta)meta.insertAdjacentElement('afterend',btn);
    else body.prepend(btn);
  }
  const is=!!savedRecordFor(m),t=copy();
  btn.classList.toggle('active',is);
  btn.querySelector('span').textContent=is?t.savedWish:t.saveWish;
  btn.title=is?t.savedWish:t.saveWish;
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

const V45_ASSET_BASE='./share-assets/';
const videoBlobs=new Map();
const posterImages=new Map();
const stillFiles=new Map();
const readyVideoFiles=new Map();
const readyStillFiles=new Map();
let shareStyle=Math.floor(Date.now()/1000)%5;
let shareMode='animation';
let shareWish=null;
let shareStatus='';
let preloadStarted=false;

function hash(s){let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function assetUrl(kind,style){return V45_ASSET_BASE+(kind==='video'?'template-':'poster-')+(style+1)+(kind==='video'?'.mp4':'.png')}
function sanitize(s){return String(s||'wish').normalize('NFKD').replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,42)||'wish'}
function shareUrl(m){
  const base=window.RALUVAAA_PUBLIC_BASE_URL||location.href;
  const u=new URL(base,location.href);
  ['actor','qa','soloqa','sharedqa','reset'].forEach(k=>u.searchParams.delete(k));
  u.hash='wish='+encodeURIComponent(m.semanticId);
  return u.href
}
function shareCaption(m){
  const t=copy();
  return [m.text||'Wish',m.loc||'',t.shareText,shareUrl(m)].filter(Boolean).join('\n');
}
function setStatus(msg){
  shareStatus=msg||'';
  const el=document.querySelector('#v45ShareOverlay .v45-share-status');
  if(el)el.textContent=shareStatus
}
function legacyCopy(text){
  const ta=document.createElement('textarea');
  ta.value=text;ta.setAttribute('readonly','');
  ta.style.position='fixed';ta.style.left='-9999px';ta.style.top='0';
  document.body.appendChild(ta);ta.focus();ta.select();ta.setSelectionRange(0,text.length);
  let ok=false;try{ok=document.execCommand('copy')}catch{}
  ta.remove();return ok
}
async function copyUrl(url){
  let ok=false;
  try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);ok=true}}catch{}
  if(!ok)ok=legacyCopy(url);
  if(ok){setStatus(copy().copied);toast(copy().copied);return true}
  setStatus(copy().copyFailed);
  try{window.prompt(copy().copyLink,url)}catch{}
  return false
}
function downloadFile(file){
  const u=URL.createObjectURL(file),a=document.createElement('a');
  a.href=u;a.download=file.name;a.rel='noopener';a.style.position='fixed';a.style.left='-9999px';
  document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(u);a.remove()},5000)
}
function directDownload(url,name){
  const a=document.createElement('a');
  a.href=url;a.download=name;a.rel='noopener';a.style.position='fixed';a.style.left='-9999px';
  document.body.appendChild(a);a.click();setTimeout(()=>a.remove(),1000)
}
async function loadVideoBlob(style){
  if(videoBlobs.has(style))return videoBlobs.get(style);
  const p=fetch(assetUrl('video',style),{cache:'force-cache'})
    .then(r=>{if(!r.ok)throw new Error('video '+r.status);return r.blob()})
    .then(b=>{
      const file=new File([b],'raluvaaa-'+templateNames[style].toLowerCase()+'.mp4',{type:'video/mp4'});
      readyVideoFiles.set(style,file);
      return file
    })
    .catch(e=>{console.warn('V45 video preload failed',style,e);return null});
  videoBlobs.set(style,p);
  return p
}
function loadPoster(style){
  if(posterImages.has(style))return posterImages.get(style);
  const p=new Promise((resolve,reject)=>{
    const img=new Image();img.decoding='async';
    img.onload=()=>resolve(img);img.onerror=reject;img.src=assetUrl('poster',style)
  }).catch(e=>{console.warn('V45 poster preload failed',style,e);return null});
  posterImages.set(style,p);
  return p
}
function warmAllAssets(){
  if(preloadStarted)return;preloadStarted=true;
  for(let i=0;i<5;i++){loadVideoBlob(i);loadPoster(i)}
}
function wrapCanvasText(ctx,text,maxWidth,maxLines){
  const words=String(text||'').split(/\s+/).filter(Boolean),lines=[];let line='';
  for(const word of words){
    const test=line?line+' '+word:word;
    if(ctx.measureText(test).width>maxWidth&&line){
      lines.push(line);line=word;
      if(lines.length===maxLines-1)break
    }else line=test
  }
  if(line&&lines.length<maxLines)lines.push(line);
  if(words.join(' ')!==lines.join(' ')&&lines.length){
    let i=lines.length-1;
    while(ctx.measureText(lines[i]+'…').width>maxWidth&&lines[i].length>2)lines[i]=lines[i].slice(0,-1);
    lines[i]+='…'
  }
  return lines
}
async function buildStillFile(style=shareStyle,m=shareWish){
  if(!m)return null;
  const key=style+'|'+m.semanticId+'|'+(m.text||'')+'|'+(m.loc||'');
  if(stillFiles.has(key))return stillFiles.get(key);
  const job=(async()=>{
    const img=await loadPoster(style);if(!img)return null;
    const c=document.createElement('canvas');c.width=720;c.height=900;
    const ctx=c.getContext('2d');ctx.drawImage(img,0,0,720,900);
    const grad=ctx.createLinearGradient(0,500,0,900);grad.addColorStop(0,'rgba(2,7,13,0)');grad.addColorStop(.34,'rgba(2,7,13,.66)');grad.addColorStop(1,'rgba(2,7,13,.90)');
    ctx.fillStyle=grad;ctx.fillRect(0,470,720,430);
    ctx.fillStyle='#f4f6f2';ctx.font='40px Georgia,serif';
    const lines=wrapCanvasText(ctx,m.text||'',624,4);let y=635;
    for(const line of lines){ctx.fillText(line,48,y);y+=48}
    if(m.loc){
      ctx.font='600 18px system-ui,sans-serif';ctx.fillStyle='rgba(224,233,236,.78)';
      ctx.fillText(m.loc,48,Math.min(804,y+16))
    }
    ctx.fillStyle='rgba(242,205,121,.95)';ctx.font='700 14px system-ui,sans-serif';
    ctx.fillText(copy().shareText.toUpperCase(),48,842);
    ctx.fillStyle='rgba(236,245,244,.72)';ctx.font='500 13px system-ui,sans-serif';
    const cardUrl=shareUrl(m).replace(/^https?:\/\//,'');
    ctx.fillText(cardUrl,48,870);
    const blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('PNG export failed')),'image/png',.94));
    const file=new File([blob],'raluvaaa-'+sanitize(m.text)+'.png',{type:'image/png'});
    readyStillFiles.set(key,file);
    return file
  })();
  stillFiles.set(key,job);return job
}
function primeCurrent(){
  loadVideoBlob(shareStyle);
  loadPoster(shareStyle);
  if(shareWish)buildStillFile(shareStyle,shareWish)
}
function nativeShareNow(){
  if(!shareWish)return;
  const t=copy(),url=shareUrl(shareWish),text=shareCaption(shareWish);
  let file=null;
  if(shareMode==='animation'){
    file=readyVideoFiles.get(shareStyle)||null
  }else{
    const key=shareStyle+'|'+shareWish.semanticId+'|'+(shareWish.text||'')+'|'+(shareWish.loc||'');
    file=readyStillFiles.get(key)||null
  }
  try{
    if(navigator.share){
      const canFiles=!!(file&&navigator.canShare?.({files:[file]}));
      const payload=canFiles
        ?{title:'RALUVAAA · '+(shareWish.text||'Wish'),text,files:[file]}
        :{title:'RALUVAAA · '+(shareWish.text||'Wish'),text,url};
      const sharing=navigator.share(payload);
      Promise.resolve(sharing).then(()=>{
        setStatus(t.shared);window.dispatchEvent(new CustomEvent('raluvaaa-share'))
      }).catch(e=>{
        if(e?.name==='AbortError')return;
        console.warn('V45 native share failed',e);
        copyUrl(url).then(()=>setStatus(t.fallback))
      });
      return
    }
  }catch(e){
    console.warn('V45 native share failed',e)
  }
  copyUrl(url).then(()=>setStatus(t.fallback))
}
function downloadCurrent(){
  if(!shareWish)return;
  if(shareMode==='animation'){
    const file=readyVideoFiles.get(shareStyle)||null;
    if(file)downloadFile(file);
    else directDownload(assetUrl('video',shareStyle),'raluvaaa-'+templateNames[shareStyle].toLowerCase()+'.mp4')
  }else{
    const key=shareStyle+'|'+shareWish.semanticId+'|'+(shareWish.text||'')+'|'+(shareWish.loc||'');
    const file=readyStillFiles.get(key)||null;
    if(file)downloadFile(file);
    else directDownload(assetUrl('poster',shareStyle),'raluvaaa-'+templateNames[shareStyle].toLowerCase()+'.png')
  }
  setStatus(copy().downloaded);window.dispatchEvent(new CustomEvent('raluvaaa-share'))
}
function mediaHtml(){
  const overlay='<div class="v45-card-overlay"><div class="v45-card-type"></div><div class="v45-card-copy"><div class="v45-card-title"></div><div class="v45-card-loc"></div><div class="v45-card-url"></div></div></div>';
  if(shareMode==='animation')return '<video class="v45-media" playsinline muted preload="auto" src="'+assetUrl('video',shareStyle)+'"></video>'+overlay;
  return '<img class="v45-media" alt="" src="'+assetUrl('poster',shareStyle)+'">'+overlay
}
function modalHtml(){
  const t=copy();
  return '<div class="v45-share-scrim"></div><section class="v45-share-sheet" role="dialog" aria-modal="true">'+
    '<header><div><span class="v45-eyebrow">RALUVAAA SHARE</span><h3>'+escapeHtml(t.shareTitle)+'</h3></div><button type="button" class="v45-share-x">×</button></header>'+
    '<div class="v45-share-modes"><button type="button" data-mode="image">'+escapeHtml(t.image)+'</button><button type="button" data-mode="animation">'+escapeHtml(t.animation)+'</button></div>'+
    '<div class="v45-share-preview">'+mediaHtml()+
      '<button type="button" class="v45-style-nav prev" data-style-prev>‹</button><button type="button" class="v45-style-nav next" data-style-next>›</button>'+
      '<div class="v45-style-dots">'+templateNames.map((n,i)=>'<button type="button" data-style="'+i+'" aria-label="'+n+'"></button>').join('')+'</div>'+
      '<div class="v45-swipe-hint">‹ '+(lang()==='en'?'swipe':'glisser')+' ›</div></div>'+
    '<div class="v45-share-meta"><span class="v45-template-name"></span><span class="v45-audio-note">'+(lang()==='en'?'Music included in clip':'Musique incluse dans le clip')+'</span><span class="v45-share-status"></span></div>'+
    '<footer><button type="button" data-share-copy>'+escapeHtml(t.copyLink)+'</button><button type="button" data-share-download>'+escapeHtml(t.download)+'</button><button type="button" class="primary" data-share-now>'+escapeHtml(t.shareNow)+'</button></footer></section>'
}
function syncPreview(){
  const host=document.getElementById('v45ShareOverlay');if(!host||!shareWish)return;
  host.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===shareMode));
  host.querySelectorAll('[data-style]').forEach(b=>b.classList.toggle('active',Number(b.dataset.style)===shareStyle));
  const name=host.querySelector('.v45-template-name');if(name)name.textContent=templateNames[shareStyle];
  const note=host.querySelector('.v45-audio-note');if(note)note.classList.toggle('visible',shareMode==='animation');
  const status=host.querySelector('.v45-share-status');if(status)status.textContent=shareStatus;
  const type=host.querySelector('.v45-card-type');if(type)type.textContent=shareWish.simulated?(lang()==='en'?'SIMULATED WISH':'WISH SIMULÉ'):(shareWish.owner?(lang()==='en'?'LOCAL POC WISH':'WISH LOCAL POC'):(lang()==='en'?'HUMAN WISH':'WISH HUMAIN'));
  const title=host.querySelector('.v45-card-title');if(title)title.textContent=shareWish.text||'';
  const loc=host.querySelector('.v45-card-loc');if(loc)loc.textContent=shareWish.loc||'';
  const cardUrl=host.querySelector('.v45-card-url');if(cardUrl)cardUrl.textContent=shareUrl(shareWish).replace(/^https?:\/\//,'');
}
function rebuildMedia(){
  const host=document.getElementById('v45ShareOverlay');if(!host)return;
  const preview=host.querySelector('.v45-share-preview'),old=preview.querySelector('.v45-media'),overlay=preview.querySelector('.v45-card-overlay');
  old?.remove();overlay?.remove();
  preview.insertAdjacentHTML('afterbegin',mediaHtml());
  syncPreview();
  const video=preview.querySelector('video');
  if(video&&shareMode==='animation'){
    video.muted=true;video.volume=0;video.currentTime=0;
    const p=video.play();if(p?.catch)p.catch(()=>{})
  }
}
function setShareStyle(next){
  shareStyle=(Number(next)+templateNames.length)%templateNames.length;
  shareStatus='';rebuildMedia();primeCurrent()
}
function setShareMode(mode){
  shareMode=mode==='animation'?'animation':'image';shareStatus='';rebuildMedia();primeCurrent()
}
function bindShareSwipe(host){
  const area=host.querySelector('.v45-share-preview');let sx=null,sy=null;
  const start=e=>{const p=e.touches?.[0]||e;sx=p.clientX;sy=p.clientY};
  const end=e=>{if(sx===null)return;const p=e.changedTouches?.[0]||e,dx=p.clientX-sx,dy=p.clientY-sy;sx=sy=null;if(Math.abs(dx)>44&&Math.abs(dx)>Math.abs(dy)*1.2)setShareStyle(shareStyle+(dx<0?1:-1))};
  area.addEventListener('touchstart',start,{passive:true});area.addEventListener('touchend',end,{passive:true});
  area.addEventListener('pointerdown',start);area.addEventListener('pointerup',end)
}
function openShare(m){
  shareWish={...m};shareStyle=hash(m.semanticId+'|'+Date.now())%5;shareMode='animation';shareStatus='';
  let host=document.getElementById('v45ShareOverlay');
  if(!host){host=document.createElement('div');host.id='v45ShareOverlay';document.body.appendChild(host)}
  host.innerHTML=modalHtml();host.classList.add('open');
  host.querySelector('.v45-share-x').onclick=closeShare;host.querySelector('.v45-share-scrim').onclick=closeShare;
  host.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setShareMode(b.dataset.mode));
  host.querySelectorAll('[data-style]').forEach(b=>b.onclick=()=>setShareStyle(Number(b.dataset.style)||0));
  host.querySelector('[data-style-prev]').onclick=()=>setShareStyle(shareStyle-1);
  host.querySelector('[data-style-next]').onclick=()=>setShareStyle(shareStyle+1);
  host.querySelector('[data-share-copy]').onclick=()=>copyUrl(shareUrl(shareWish));
  host.querySelector('[data-share-download]').onclick=()=>downloadCurrent();
  host.querySelector('[data-share-now]').onclick=()=>nativeShareNow();
  bindShareSwipe(host);syncPreview();warmAllAssets();primeCurrent()
}
function closeShare(){
  const host=document.getElementById('v45ShareOverlay');
  const video=host?.querySelector('video');if(video){try{video.pause()}catch{}}
  host?.classList.remove('open');shareWish=null
}
function interceptShare(e){
  const button=e.target.closest?.('[data-act="share"],.v33-action-unit[data-v39-icon="share"] .v33-action-circle');
  if(!button)return;
  const m=current();if(!m)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openShare(m)
}
function decorate(){
  document.title='RALUVAAA · Experience V45';
  const sub=document.querySelector('#brand .sub');if(sub)sub.textContent='EXPERIENCE V45';
  ensureBookmark();ensureMobileBookmark();decorateEntrusted()
}
let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate()})}
new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-panel','data-open','data-v39-icon']});
document.addEventListener('click',interceptShare,true);
window.addEventListener('raluvaaa-saved-changed',()=>{decorateEntrustedFresh();ensureBookmark();ensureMobileBookmark()});
decorate();setTimeout(decorate,120);setTimeout(decorate,400);warmAllAssets();

window.__RALUVAAA_V45__={
  version:45,
  templates:templateNames.slice(),
  assetUrl,
  style:()=>shareStyle,
  mode:()=>shareMode,
  setStyle:setShareStyle,
  setMode:setShareMode,
  saved:()=>loadSaved().map(x=>({...x})),
  resolveSaved:id=>{const r=loadSaved().find(x=>x.semanticId===id);return r?resolveSaved(r):null},
  toggleSaved:id=>{const m=semantic().find(x=>x.semanticId===id);if(m)toggleSaved(m)},
  shareUrl:id=>{const m=semantic().find(x=>x.semanticId===id);return m?shareUrl(m):null},
  openShare:id=>{const m=semantic().find(x=>x.semanticId===id);if(m)openShare(m)},
  buildStillFile,
  loadVideoBlob,
  copyUrl,
  warmAllAssets
};
})();