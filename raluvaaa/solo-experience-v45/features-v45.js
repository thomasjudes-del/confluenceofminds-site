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
    shareNow:'Share',download:'Download',copyLink:'Copy link',copiedButton:'✓ Link copied',close:'Close',
    copied:'Link copied',downloaded:'Downloaded',shared:'Share opened',preparingClip:'Preparing clip…',copyFailed:'Copy failed. Select the link below.',fallback:'Sharing is unavailable here. The link has been copied.',
    shareText:'Discover this wish on RALUVAAA',simulated:'SIMULATED WISH',local:'LOCAL POC WISH',human:'HUMAN WISH',
    saveFailed:'Could not save this wish.'
  }:{
    save:'Sauvegarder',saved:'Sauvegardé',saveWish:'Sauvegarder ce wish',savedWish:'Sauvegardé',savedTitle:'Wishes sauvegardés',savedEmpty:'Sauvegarde les wishes que tu veux retrouver, aider ou connecter plus tard.',
    entrusted:'Confiés pour un temps',remove:'Retirer',unavailable:'Indisponible dans cette session locale',
    shareTitle:'Partager ce wish',image:'Image fixe',animation:'Clip animé',style:'Style',preview:'Aperçu',
    shareNow:'Partager',download:'Télécharger',copyLink:'Copier le lien',copiedButton:'✓ Lien copié',close:'Fermer',
    copied:'Lien copié',downloaded:'Téléchargé',shared:'Partage ouvert',preparingClip:'Préparation du clip…',copyFailed:'Copie impossible. Sélectionne le lien ci-dessous.',fallback:'Le partage natif est indisponible ici. Le lien a été copié.',
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

const W=720,H=900,DURATION=9000;
const SHARE_CLIP_DURATION=4200;
const SHARE_CLIP_FPS=24;
const SHARE_MUSIC_URL='https://raw.githubusercontent.com/carolcarriazo/incarnation-game/main/public/music/Immersed.mp3';
const SHARE_MUSIC_OFFSET=18;
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
function background(ctx,p,seed){
  ctx.clearRect(0,0,W,H);
  const base=ctx.createLinearGradient(0,0,W,H);
  base.addColorStop(0,p.bg);base.addColorStop(.58,p.bg2);base.addColorStop(1,'#030812');
  ctx.fillStyle=base;ctx.fillRect(0,0,W,H);

  const glowA=ctx.createRadialGradient(W*.22,H*.18,0,W*.22,H*.18,W*.52);
  glowA.addColorStop(0,p.a+'52');glowA.addColorStop(.45,p.d+'20');glowA.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=glowA;ctx.fillRect(0,0,W,H);
  const glowB=ctx.createRadialGradient(W*.82,H*.46,0,W*.82,H*.46,W*.46);
  glowB.addColorStop(0,p.c+'42');glowB.addColorStop(.55,p.b+'18');glowB.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=glowB;ctx.fillRect(0,0,W,H);

  const rnd=seeded(seed+'stars');
  for(let i=0;i<58;i++){
    const x=rnd()*W,y=85+rnd()*520,r=.45+rnd()*1.55;
    dot(ctx,x,y,r,i%7===0?p.b:(i%3===0?p.a:p.ink),.14+rnd()*.32);
  }

  ctx.save();
  ctx.strokeStyle='rgba(210,235,236,.055)';ctx.lineWidth=1.1;
  for(let k=0;k<5;k++){
    const yy=118+k*92+(rnd()-.5)*40;
    ctx.beginPath();ctx.moveTo(-40,yy);
    ctx.bezierCurveTo(W*.18,yy-80,W*.48,yy+110,W+60,yy-25);
    ctx.stroke();
  }
  ctx.restore();

  const vignette=ctx.createRadialGradient(W*.5,H*.4,W*.18,W*.5,H*.4,W*.76);
  vignette.addColorStop(.58,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(0,0,0,.54)');
  ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
}
function dot(ctx,x,y,r,color,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore()}
function line(ctx,a,b,color,width=1,alpha=.5){ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore()}
function ellipsePetal44(ctx,x,y,rx,ry,rot,fill,alpha=.9){
  ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.fillStyle=fill;ctx.globalAlpha=alpha;ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.restore()
}
function drawFlower44(ctx,cx,cy,r,p,rot=0,alpha=1){
  const petals=7;ctx.save();ctx.translate(cx,cy);ctx.rotate(rot);
  for(let i=0;i<petals;i++){
    const a=-Math.PI/2+i*Math.PI*2/petals,d=r*.54;
    ctx.save();ctx.rotate(a);ctx.translate(d,0);ctx.fillStyle=[p.a,p.c,p.d,p.b][i%4];ctx.globalAlpha=.70*alpha;
    ctx.beginPath();ctx.ellipse(0,0,r*.46,r*.20,0,0,Math.PI*2);ctx.fill();ctx.restore()
  }
  const g=ctx.createRadialGradient(0,0,1,0,0,r*.42);g.addColorStop(0,p.b+'dd');g.addColorStop(.35,p.b+'48');g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r*.42,0,Math.PI*2);ctx.fill();dot(ctx,0,0,r*.14,p.b,.94*alpha);ctx.restore()
}
function drawPulse(ctx,t,p,seed){
  const rnd=seeded(seed+'pulse44'),cx=W*.48,cy=H*.36,beat=.5+.5*Math.sin(t*Math.PI*4);
  for(let ring=0;ring<3;ring++){
    ctx.save();ctx.translate(cx,cy);ctx.rotate(t*Math.PI*(ring%2?-.4:.28)+ring);
    ctx.strokeStyle=[p.a,p.d,p.b][ring];ctx.globalAlpha=.18+ring*.05;ctx.lineWidth=1.4;
    ctx.beginPath();ctx.ellipse(0,0,78+ring*44,38+ring*24,.25,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  for(let i=0;i<34;i++){
    const a=rnd()*Math.PI*2+t*.45,d=62+rnd()*210;
    const x=cx+Math.cos(a)*d,y=cy+Math.sin(a)*d*.62;
    if(i<18)line(ctx,{x:cx,y:cy},{x,y},i%3?p.a:p.c,.7,.06);
    dot(ctx,x,y,1.2+rnd()*2.4,[p.a,p.b,p.c,p.d][i%4],.22+rnd()*.46);
  }
  const halo=ctx.createRadialGradient(cx,cy,4,cx,cy,86);
  halo.addColorStop(0,p.a+'cc');halo.addColorStop(.23,p.a+'48');halo.addColorStop(.7,p.d+'16');halo.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=halo;ctx.beginPath();ctx.arc(cx,cy,86,0,Math.PI*2);ctx.fill();
  dot(ctx,cx,cy,18+beat*8,p.a,.96);dot(ctx,cx,cy,6,p.b,1);
  const tip={x:cx+168,y:cy-86};
  ctx.save();ctx.strokeStyle=p.b;ctx.globalAlpha=.56;ctx.lineWidth=3.2;ctx.lineCap='round';ctx.beginPath();
  ctx.moveTo(cx+12,cy-4);ctx.bezierCurveTo(cx+62,cy-72,cx+126,cy-52,tip.x,tip.y);ctx.stroke();ctx.restore();
  dot(ctx,tip.x,tip.y,8,p.c,.9);
}
function bezierPoint(p0,p1,p2,p3,t){const u=1-t;return{x:u*u*u*p0.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*p3.x,y:u*u*u*p0.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*p3.y}}
function strokeCurve(ctx,pts,progress,color,width,alpha){
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.globalAlpha=alpha;ctx.lineCap='round';ctx.beginPath();
  const steps=80,n=Math.max(2,Math.floor(steps*Math.max(.02,progress)));
  for(let i=0;i<=n;i++){const q=bezierPoint(...pts,i/steps);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)}
  ctx.stroke();ctx.restore()
}
function drawBranch(ctx,t,p){
  const prog=ease(Math.min(1,t*1.08)),root={x:W*.18,y:H*.55},end={x:W*.78,y:H*.24};
  const main=[root,{x:W*.32,y:H*.49},{x:W*.54,y:H*.48},end];
  strokeCurve(ctx,main,prog,p.a,7,.84);
  strokeCurve(ctx,main,Math.max(0,prog-.03),p.b,2.1,.48);
  const qs=[.34,.52,.68];
  const ends=[{x:W*.38,y:H*.25},{x:W*.60,y:H*.30},{x:W*.78,y:H*.49}];
  qs.forEach((qq,i)=>{
    const q=bezierPoint(...main,qq),side=i===2?1:-1;
    const branch=[q,{x:q.x+38,y:q.y+side*6},{x:ends[i].x-42,y:ends[i].y+side*22},ends[i]];
    const bp=Math.max(0,Math.min(1,(prog-(.22+i*.13))/.56));
    strokeCurve(ctx,branch,bp,[p.d,p.c,p.b][i],4,.72);
    if(bp>.72){
      const a=.5+.5*Math.sin((t+i*.18)*Math.PI*2);
      ellipsePetal44(ctx,ends[i].x-10,ends[i].y-3,20+a*3,10,.3,[p.a,p.c,p.d][i],.78);
      ellipsePetal44(ctx,ends[i].x+9,ends[i].y+4,18+a*2,9,-.38,[p.b,p.a,p.c][i],.72);
    }
  });
  dot(ctx,root.x,root.y,9,p.b,.88);
  if(prog>.91){dot(ctx,end.x,end.y,10,p.a,.92);dot(ctx,end.x,end.y,3,p.ink,.88)}
}
function drawBridge(ctx,t,p,seed){
  const rnd=seeded(seed+'bridge44'),l={x:W*.20,y:H*.43},r={x:W*.80,y:H*.40};
  for(const [idx,c] of [l,r].entries()){
    for(let i=0;i<16;i++){
      const a=rnd()*Math.PI*2,d=24+rnd()*116,q={x:c.x+Math.cos(a)*d,y:c.y+Math.sin(a)*d*.62};
      line(ctx,c,q,idx?p.c:p.a,.85,.10);dot(ctx,q.x,q.y,1.2+rnd()*2.5,[p.a,p.b,p.c,p.d][i%4],.24+rnd()*.38)
    }
    const hg=ctx.createRadialGradient(c.x,c.y,2,c.x,c.y,52);hg.addColorStop(0,(idx?p.c:p.a)+'74');hg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=hg;ctx.beginPath();ctx.arc(c.x,c.y,52,0,Math.PI*2);ctx.fill();
    dot(ctx,c.x,c.y,10,idx?p.c:p.a,.96);
  }
  const prog=ease(Math.min(1,t*1.18));
  ctx.save();ctx.strokeStyle=p.b;ctx.globalAlpha=.82;ctx.lineWidth=4.2;ctx.lineCap='round';ctx.beginPath();
  const steps=100,n=Math.max(2,Math.floor(steps*prog));
  for(let i=0;i<=n;i++){const tt=i/steps,x=lerp(l.x,r.x,tt),y=lerp(l.y,r.y,tt)-Math.sin(tt*Math.PI)*132;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();ctx.restore();
  for(let k=0;k<4;k++){
    const tt=(t*.75+k*.22)%1,x=lerp(l.x,r.x,tt),y=lerp(l.y,r.y,tt)-Math.sin(tt*Math.PI)*132;
    dot(ctx,x,y,4.5,k%2?p.d:p.b,.82);
  }
}
function drawFlower(ctx,t,p){
  const open=ease(Math.min(1,t*1.15));
  drawFlower44(ctx,W*.49,H*.36,68*open,p,0,.98);
  const delayed=Math.max(0,Math.min(1,(open-.28)/.72));
  drawFlower44(ctx,W*.31,H*.45,38*delayed,{...p,a:p.c,c:p.a,b:p.b},.35,.78);
  drawFlower44(ctx,W*.69,H*.46,42*delayed,{...p,a:p.d,c:p.c,b:p.b},-.25,.82);
  if(open>.8){
    for(let i=0;i<11;i++){
      const a=i*Math.PI*2/11+t*.8,d=96+(i%3)*15;
      dot(ctx,W*.49+Math.cos(a)*d,H*.36+Math.sin(a)*d*.64,1.5+(i%2),[p.a,p.b,p.c,p.d][i%4],.25);
    }
  }
}
function drawAwaken(ctx,t,p,seed){
  const rnd=seeded(seed+'awake44'),awake=ease(Math.max(0,(t-.08)/.84));
  const root={x:W*.20,y:H*.50},end={x:W*.78,y:H*.28};
  const main=[root,{x:W*.34,y:H*.48},{x:W*.58,y:H*.43},end];
  strokeCurve(ctx,main,1,'#74685f',6,.38);
  strokeCurve(ctx,main,awake,p.a,6,.82);
  const q1=bezierPoint(...main,.48),q2=bezierPoint(...main,.70);
  const e1={x:W*.45,y:H*.24},e2={x:W*.77,y:H*.51};
  strokeCurve(ctx,[q1,{x:q1.x+8,y:q1.y-42},{x:e1.x-28,y:e1.y+32},e1],Math.max(0,(awake-.22)/.78),p.c,4,.72);
  strokeCurve(ctx,[q2,{x:q2.x+30,y:q2.y+18},{x:e2.x-48,y:e2.y-12},e2],Math.max(0,(awake-.42)/.58),p.d,4,.70);
  if(awake>.52){
    const k=(awake-.52)/.48;
    ellipsePetal44(ctx,e1.x-9,e1.y,22*k,10*k,.28,p.a,.8);
    ellipsePetal44(ctx,e1.x+9,e1.y+3,20*k,9*k,-.36,p.b,.76);
  }
  if(awake>.68){
    const k=(awake-.68)/.32;
    drawFlower44(ctx,end.x,end.y,27*k,p,.2,.85);
  }
  const pulse=.5+.5*Math.sin(t*Math.PI*3);
  dot(ctx,root.x,root.y,8+pulse*3,p.b,.72+awake*.18);
  for(let i=0;i<14;i++){const tt=Math.min(awake,Math.max(0,awake-rnd()*.18));if(tt<=0)continue;const q=bezierPoint(...main,tt);dot(ctx,q.x+(rnd()-.5)*12,q.y+(rnd()-.5)*9,1.5+rnd()*2,p.b,.18+rnd()*.32)}
}
function prettyOverlay(ctx,m,p,mode){
  const t=copy(),pad=48;
  const lower=ctx.createLinearGradient(0,H*.54,0,H);
  lower.addColorStop(0,'rgba(2,7,13,0)');lower.addColorStop(.35,'rgba(2,7,13,.58)');lower.addColorStop(1,'rgba(2,6,12,.90)');
  ctx.fillStyle=lower;ctx.fillRect(0,H*.48,W,H*.52);

  ctx.fillStyle='rgba(255,255,255,.055)';roundRect(ctx,30,30,W-60,H-60,34);ctx.fill();
  ctx.strokeStyle='rgba(230,245,245,.11)';ctx.lineWidth=1.2;roundRect(ctx,30,30,W-60,H-60,34);ctx.stroke();

  ctx.fillStyle=p.ink;ctx.font='700 17px system-ui,sans-serif';ctx.letterSpacing='4px';ctx.fillText('RALUVAAA',pad,72);
  const badge=m.simulated?t.simulated:(m.owner?t.local:t.human);
  ctx.font='700 10px system-ui,sans-serif';ctx.letterSpacing='2px';ctx.fillStyle=p.b;ctx.fillText(badge,pad,99);

  ctx.font='39px Georgia,serif';ctx.fillStyle=p.ink;
  const lines=wrapText(ctx,m.text||'',W-pad*2,4);let y=621;
  for(const s of lines){ctx.fillText(s,pad,y);y+=47}

  if(m.loc){
    ctx.font='600 13px system-ui,sans-serif';ctx.letterSpacing='.4px';
    const tw=ctx.measureText(m.loc).width+28;
    ctx.fillStyle='rgba(255,255,255,.065)';roundRect(ctx,pad,Math.min(804,y+12),tw,32,16);ctx.fill();
    ctx.fillStyle=p.muted;ctx.fillText(m.loc,pad+14,Math.min(825,y+33));
  }

  ctx.font='750 12px system-ui,sans-serif';ctx.letterSpacing='1.7px';ctx.fillStyle=p.b;
  ctx.fillText(t.shareText.toUpperCase(),pad,850);
}
function renderPrettyFrame(canvas,m,style,timeMs,mode='animation'){
  const ctx=canvas.getContext('2d'),p=palettes[style%palettes.length],t=((timeMs%DURATION)/DURATION),seed=m.semanticId||m.text||'wish';
  background(ctx,p,seed);
  const localT=mode==='image'?.64:t;
  if(style===0)drawPulse(ctx,localT,p,seed);
  if(style===1)drawBranch(ctx,localT,p);
  if(style===2)drawBridge(ctx,localT,p,seed);
  if(style===3)drawFlower(ctx,localT,p);
  if(style===4)drawAwaken(ctx,localT,p,seed);
  prettyOverlay(ctx,m,p,mode);
}

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
let shareAnimationFrame=0;
let shareStartedAt=performance.now();
let sharePreviewFrames=0;
let preparedMedia=null;
let preparedKey='';
let preparingPromise=null;
let preparationEpoch=0;
let recorderBusy=false;
let prewarmTimer=0;

function hash(s){let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function assetUrl(kind,style){return V45_ASSET_BASE+(kind==='video'?'template-':'poster-')+(style+1)+(kind==='video'?'.mp4':'.png')+'?build=v45-final-20260925-2'}
function sanitize(s){return String(s||'wish').normalize('NFKD').replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,42)||'wish'}
function shareUrl(m){
  const base=window.RALUVAAA_PUBLIC_BASE_URL||(location.origin+location.pathname);
  const u=new URL(base,location.origin);
  u.search='';
  u.hash='wish='+encodeURIComponent(m.semanticId);
  return u.href
}
function shareCaption(m,includeUrl=true){
  const t=copy(),parts=[m.text||'Wish',m.loc||'',t.shareText];
  if(includeUrl)parts.push(shareUrl(m));
  return parts.filter(Boolean).join('\n');
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
function setCopyButtonCopied(on){
  const btn=document.querySelector('#v45ShareOverlay [data-share-copy]');
  if(!btn)return;
  btn.classList.toggle('copied',!!on);
  btn.disabled=!!on;
  btn.textContent=on?copy().copiedButton:copy().copyLink
}
async function copyUrl(url){
  let ok=false;
  try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);ok=true}}catch{}
  if(!ok)ok=legacyCopy(url);
  if(ok){shareStatus='';setStatus('');setCopyButtonCopied(true);return true}
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
    const c=document.createElement('canvas');c.width=W;c.height=H;
    renderPrettyFrame(c,m,style,DURATION*.64,'image');
    const blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('PNG export failed')),'image/png',.94));
    const file=new File([blob],'raluvaaa-'+sanitize(m.text)+'.png',{type:'image/png'});
    readyStillFiles.set(key,file);
    return file
  })();
  stillFiles.set(key,job);return job
}
function bestShareMime(){
  if(!window.MediaRecorder)return null;
  const types=[
    'video/mp4;codecs=h264,aac',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];
  return types.find(x=>MediaRecorder.isTypeSupported?.(x))||null
}
function supportsPersonalizedClip(){
  return !!(HTMLCanvasElement.prototype.captureStream&&window.MediaRecorder&&bestShareMime())
}
function mediaKey(){
  return shareWish
    ?shareMode+'|'+shareStyle+'|'+shareWish.semanticId+'|'+(shareWish.text||'')+'|'+(shareWish.loc||'')
    :''
}
function invalidatePrepared(){
  preparationEpoch++;
  clearTimeout(prewarmTimer);prewarmTimer=0;
  preparedMedia=null;
  preparedKey='';
  preparingPromise=null
}
async function shareMusicTrack(durationMs){
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return null;
  const ac=new AC();
  try{
    const res=await fetch(SHARE_MUSIC_URL,{mode:'cors',cache:'force-cache'});
    if(!res.ok)throw new Error('music '+res.status);
    const buffer=await ac.decodeAudioData(await res.arrayBuffer());
    const dest=ac.createMediaStreamDestination(),src=ac.createBufferSource(),gain=ac.createGain();
    gain.gain.value=.22;src.buffer=buffer;src.connect(gain);gain.connect(dest);
    const maxOffset=Math.max(0,buffer.duration-durationMs/1000-.25);
    const offset=Math.min(SHARE_MUSIC_OFFSET,maxOffset);
    src.start(0,offset,durationMs/1000+.15);
    return{
      track:dest.stream.getAudioTracks()[0],
      stop(){try{src.stop()}catch{}setTimeout(()=>ac.close().catch(()=>{}),50)}
    }
  }catch(e){
    console.warn('V45 share music unavailable',e);
    try{await ac.close()}catch{}
    return null
  }
}
async function recordPersonalizedClip(m,style){
  if(!supportsPersonalizedClip())throw new Error('animation-unsupported');
  const mime=bestShareMime();
  let canvas=document.querySelector('#v45ShareOverlay canvas.v45-pretty-animation');
  const isLive=!!canvas;
  if(!canvas){
    canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
    renderPrettyFrame(canvas,m,style,0,'animation')
  }
  const video=canvas.captureStream(SHARE_CLIP_FPS);
  const music=await shareMusicTrack(SHARE_CLIP_DURATION);
  const tracks=[...video.getVideoTracks()];
  if(music?.track)tracks.push(music.track);
  const stream=new MediaStream(tracks),chunks=[];
  const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:3000000});
  const result=new Promise((resolve,reject)=>{
    rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
    rec.onerror=e=>reject(e.error||new Error('recording failed'));
    rec.onstop=()=>resolve({blob:new Blob(chunks,{type:mime}),mime,audioEmbedded:!!music?.track})
  });
  const began=performance.now();rec.start(200);
  if(isLive){
    await new Promise(resolve=>setTimeout(resolve,SHARE_CLIP_DURATION+60))
  }else{
    await new Promise(resolve=>{
      const frame=now=>{
        const elapsed=now-began;
        const virtualTime=elapsed*(DURATION/SHARE_CLIP_DURATION);
        renderPrettyFrame(canvas,m,style,virtualTime,'animation');
        if(elapsed<SHARE_CLIP_DURATION)requestAnimationFrame(frame);else resolve()
      };
      requestAnimationFrame(frame)
    })
  }
  rec.stop();music?.stop();video.getTracks().forEach(t=>t.stop());
  const out=await result,ext=out.mime.includes('mp4')?'mp4':'webm';
  return{
    file:new File([out.blob],'raluvaaa-'+sanitize(m.text)+'.'+ext,{type:out.mime}),
    audioEmbedded:out.audioEmbedded,
    mode:'animation'
  }
}
async function prepareCurrentMedia(){
  if(!shareWish)return null;
  const key=mediaKey();
  if(preparedMedia&&preparedKey===key)return preparedMedia;
  if(preparingPromise&&preparedKey===key)return preparingPromise;
  const epoch=++preparationEpoch,m={...shareWish},style=shareStyle,mode=shareMode;
  preparedKey=key;preparedMedia=null;
  preparingPromise=(async()=>{
    if(mode==='image')return{file:await buildStillFile(style,m),audioEmbedded:false,mode:'image'};
    return recordPersonalizedClip(m,style)
  })();
  try{
    const result=await preparingPromise;
    if(epoch===preparationEpoch&&key===mediaKey()){preparedMedia=result;preparedKey=key}
    return result
  }finally{
    if(epoch===preparationEpoch)preparingPromise=null
  }
}
function prewarmCurrentMedia(){
  const key=mediaKey();
  if(!key)return;
  clearTimeout(prewarmTimer);
  prewarmTimer=setTimeout(()=>{
    prewarmTimer=0;
    if(key!==mediaKey())return;
    prepareCurrentMedia().catch(e=>{
      if(key===mediaKey())console.warn('V45 media prewarm failed',e)
    })
  },450)
}
function setShareActionBusy(on){
  const btn=document.querySelector('#v45ShareOverlay [data-share-now]');
  if(!btn)return;
  btn.disabled=!!on;
  btn.classList.toggle('busy',!!on);
  btn.textContent=on?copy().preparingClip:copy().shareNow
}
async function nativeShareNow(){
  if(!shareWish||recorderBusy)return;
  const t=copy(),url=shareUrl(shareWish);
  recorderBusy=true;setShareActionBusy(true);
  try{
    let media=(preparedMedia&&preparedKey===mediaKey())?preparedMedia:null;
    if(!media)media=await prepareCurrentMedia();
    const file=media?.file||null;
    if(navigator.share){
      if(file&&navigator.canShare?.({files:[file]})){
        // URL appears once in the caption. Supplying both text-with-URL and url duplicated it in WhatsApp.
        await navigator.share({
          title:'RALUVAAA · '+(shareWish.text||'Wish'),
          text:shareCaption(shareWish,true),
          files:[file]
        });
      }else{
        await navigator.share({
          title:'RALUVAAA · '+(shareWish.text||'Wish'),
          text:shareCaption(shareWish,false),
          url
        });
      }
      setStatus(t.shared);window.dispatchEvent(new CustomEvent('raluvaaa-share'));return
    }
    await copyUrl(url);setStatus(t.fallback)
  }catch(e){
    if(e?.name==='AbortError')return;
    console.warn('V45 native share failed',e);
    await copyUrl(url);setStatus(t.fallback)
  }finally{
    recorderBusy=false;setShareActionBusy(false)
  }
}
async function downloadCurrent(){
  if(!shareWish||recorderBusy)return;
  recorderBusy=true;
  const btn=document.querySelector('#v45ShareOverlay [data-share-download]');
  const old=btn?.textContent;
  if(btn){btn.disabled=true;btn.textContent=shareMode==='animation'?copy().preparingClip:copy().download}
  try{
    let media=(preparedMedia&&preparedKey===mediaKey())?preparedMedia:null;
    if(!media)media=await prepareCurrentMedia();
    if(media?.file)downloadFile(media.file);
    setStatus(copy().downloaded);window.dispatchEvent(new CustomEvent('raluvaaa-share'))
  }catch(e){
    console.warn('V45 download failed',e);
    setStatus(String(e?.message||e))
  }finally{
    recorderBusy=false;
    if(btn){btn.disabled=false;btn.textContent=old||copy().download}
  }
}
function mediaHtml(){
  const cls=shareMode==='animation'?'v45-pretty-animation':'v45-pretty-still';
  return '<canvas class="v45-media '+cls+'" width="'+W+'" height="'+H+'"></canvas>'
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
    '<div class="v45-share-meta"><span class="v45-audio-note">Immersed · Kevin MacLeod · CC BY 4.0</span><span class="v45-share-status"></span></div>'+
    '<footer><button type="button" data-share-copy>'+escapeHtml(t.copyLink)+'</button><button type="button" data-share-download>'+escapeHtml(t.download)+'</button><button type="button" class="primary" data-share-now>'+escapeHtml(t.shareNow)+'</button></footer></section>'
}
function syncPreview(){
  const host=document.getElementById('v45ShareOverlay');if(!host||!shareWish)return;
  host.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===shareMode));
  host.querySelectorAll('[data-style]').forEach(b=>b.classList.toggle('active',Number(b.dataset.style)===shareStyle));
  const note=host.querySelector('.v45-audio-note');if(note)note.classList.toggle('visible',shareMode==='animation');
  const status=host.querySelector('.v45-share-status');if(status)status.textContent=shareStatus
}
function startPrettyAnimation(){
  cancelAnimationFrame(shareAnimationFrame);
  const host=document.getElementById('v45ShareOverlay');
  const canvas=host?.querySelector('canvas.v45-media');
  if(!canvas||!shareWish)return;
  if(shareMode==='image'){
    renderPrettyFrame(canvas,shareWish,shareStyle,DURATION*.64,'image');
    sharePreviewFrames=1;return
  }
  shareStartedAt=performance.now();sharePreviewFrames=0;
  const step=now=>{
    const live=document.getElementById('v45ShareOverlay');
    const c=live?.querySelector('canvas.v45-pretty-animation');
    if(!live?.classList.contains('open')||!c||shareMode!=='animation'||!shareWish)return;
    const virtualTime=(now-shareStartedAt)*(DURATION/SHARE_CLIP_DURATION);
    renderPrettyFrame(c,shareWish,shareStyle,virtualTime,'animation');sharePreviewFrames++;
    shareAnimationFrame=requestAnimationFrame(step)
  };
  shareAnimationFrame=requestAnimationFrame(step)
}
function rebuildMedia(){
  const host=document.getElementById('v45ShareOverlay');if(!host)return;
  const preview=host.querySelector('.v45-share-preview'),old=preview.querySelector('.v45-media'),overlay=preview.querySelector('.v45-card-overlay');
  old?.remove();overlay?.remove();
  preview.insertAdjacentHTML('afterbegin',mediaHtml());
  syncPreview();
  startPrettyAnimation()
}
function setShareStyle(next){
  shareStyle=(Number(next)+templateNames.length)%templateNames.length;
  shareStatus='';invalidatePrepared();setCopyButtonCopied(false);rebuildMedia();prewarmCurrentMedia()
}
function setShareMode(mode){
  shareMode=mode==='animation'?'animation':'image';shareStatus='';invalidatePrepared();setCopyButtonCopied(false);rebuildMedia();prewarmCurrentMedia()
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
  bindShareSwipe(host);invalidatePrepared();setCopyButtonCopied(false);syncPreview();startPrettyAnimation();prewarmCurrentMedia()
}
function closeShare(){
  const host=document.getElementById('v45ShareOverlay');
  cancelAnimationFrame(shareAnimationFrame);
  invalidatePrepared();host?.classList.remove('open');shareWish=null
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
decorate();setTimeout(decorate,120);setTimeout(decorate,400);

window.__RALUVAAA_V45__={
  version:45,
  templates:templateNames.slice(),
  assetUrl,
  style:()=>shareStyle,
  mode:()=>shareMode,
  previewFrames:()=>sharePreviewFrames,
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