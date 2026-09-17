(function(){
'use strict';

const STORE='raluvaaaManualMvpV26';
const POLICY='raluvaaaEntrustedV26PolicyV2';
const params=new URLSearchParams(location.search);
const HOUR=3600000,MIN=60000;
const bands=[
  {name:'short',min:35*MIN,max:175*MIN,color:'#ff7b7b',soft:'rgba(255,123,123,.22)'},
  {name:'medium',min:10*HOUR,max:23.5*HOUR,color:'#f6c56f',soft:'rgba(246,197,111,.20)'},
  {name:'long',min:36*HOUR,max:71.5*HOUR,color:'#78e2b3',soft:'rgba(120,226,179,.20)'}
];
let roots=[];
let timer=null;
let engineGuardInstalled=false;

if(params.get('reset')==='1') localStorage.removeItem(POLICY);

function read(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
function write(key,value){localStorage.setItem(key,JSON.stringify(value))}
function hash(s){let h=2166136261>>>0;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function randMs(band,slot,salt){const span=band.max-band.min;return band.min+(hash(`${salt}|${slot}`)%Math.max(1,span))}
function validRoots(){return roots.filter(x=>x&&x.simulated&&x.kind==='create').map(x=>x.semanticId)}
function chooseReplacement(ids,slot,salt){const all=validRoots();if(!all.length)return ids[slot];const blocked=new Set(ids.filter((_,i)=>i!==slot));let idx=hash(`${salt}|replacement|${slot}`)%all.length;for(let i=0;i<all.length;i++){const id=all[(idx+i)%all.length];if(!blocked.has(id))return id}return all[idx]}
function sameIds(a,b){return Array.isArray(a)&&Array.isArray(b)&&a.length===3&&b.length===3&&a.every((x,i)=>x.semanticId===b[i].semanticId)}
function sameEntrusted(a,b){return sameIds(a,b)&&a.every((x,i)=>Math.abs(x.expires-b[i].expires)<1000)}
function reloadPreservingActor(){const u=new URL(location.href);u.searchParams.delete('reset');u.searchParams.set('ep','1');u.hash='';location.replace(u.href)}

function initialisePolicy(state){const now=Date.now();const current=(state.entrusted||[]).slice(0,3);if(current.length!==3)return null;const salt=`${Math.floor(now/(3*HOUR))}|${params.get('actor')||'A'}`;return{version:2,entries:current.map((x,i)=>({semanticId:x.semanticId,band:bands[i].name,assignedAt:now,expires:now+randMs(bands[i],i,salt)}))}}
function syncPolicy(){
  const state=read(STORE);if(!state||state.version!==26||!Array.isArray(state.entrusted)||state.entrusted.length!==3||!validRoots().length)return;
  let policy=read(POLICY);const now=Date.now();
  if(!policy||policy.version!==2||!Array.isArray(policy.entries)||policy.entries.length!==3){
    policy=initialisePolicy(state);if(!policy)return;write(POLICY,policy);state.entrusted=policy.entries.map(x=>({semanticId:x.semanticId,expires:x.expires}));write(STORE,state);scheduleNext(policy);decorateEntrusted();return;
  }
  let changed=false;const ids=policy.entries.map(x=>x.semanticId);
  for(let i=0;i<3;i++){
    const e=policy.entries[i];
    if(!validRoots().includes(e.semanticId)||e.expires<=now){
      e.semanticId=chooseReplacement(ids,i,`${now}|${e.semanticId}`);ids[i]=e.semanticId;e.assignedAt=now;e.expires=now+randMs(bands[i],i,`${now}|replace`);e.band=bands[i].name;changed=true;
    }
  }
  const desired=policy.entries.map(x=>({semanticId:x.semanticId,expires:x.expires}));
  const idsChanged=!sameIds(state.entrusted,desired);
  if(changed||!sameEntrusted(state.entrusted,desired)){write(POLICY,policy);state.entrusted=desired;write(STORE,state);if(changed||idsChanged){reloadPreservingActor();return}}
  scheduleNext(policy);decorateEntrusted();
}
function scheduleNext(policy){clearTimeout(timer);const next=Math.min(...policy.entries.map(x=>x.expires));const delay=Math.max(1000,Math.min(2147480000,next-Date.now()+350));timer=setTimeout(syncPolicy,delay)}
function pad(n){return String(Math.max(0,n|0)).padStart(2,'0')}
function remaining(ms){const total=Math.max(0,Math.floor(ms/1000)),s=total%60,m=Math.floor(total/60)%60,h=Math.floor(total/3600)%24,d=Math.floor(total/86400);return d?`${d}j ${pad(h)}:${pad(m)}:${pad(s)}`:`${pad(Math.floor(total/3600))}:${pad(m)}:${pad(s)}`}
function bandFor(name){return bands.find(x=>x.name===name)||bands[1]}
function decorateEntrusted(){
  const policy=read(POLICY);if(!policy?.entries)return;
  const title=document.getElementById('drawerTitle');if(!title||!/^Wishes confiés$|^Entrusted wishes$/i.test(title.textContent.trim()))return;
  const map=new Map(policy.entries.map(x=>[x.semanticId,x]));
  document.querySelectorAll('#drawerBody [data-open]').forEach(item=>{
    const e=map.get(item.dataset.open);if(!e)return;const b=bandFor(e.band);item.style.borderColor=b.soft;item.style.boxShadow=`inset 3px 0 0 ${b.color}`;if(item.dataset.entrustedBand!==e.band)item.dataset.entrustedBand=e.band;
    const meta=item.querySelector('.m'),label=remaining(e.expires-Date.now());if(meta){if(meta.textContent!==label)meta.textContent=label;meta.style.fontFamily='ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';meta.style.fontSize='12px';meta.style.fontWeight='720';meta.style.letterSpacing='.04em';meta.style.color=b.color;meta.style.fontVariantNumeric='tabular-nums'}
    const st=item.querySelector('.state');if(st){if(st.textContent!=='●')st.textContent='●';st.style.color=b.color;if(st.title!==e.band)st.title=e.band}
  });
}
function isFrench(){return document.querySelector('[data-lang="fr"]')?.classList.contains('active')??true}
function renameMyWishes(){
  const b=document.getElementById('myWorldBtn');if(b){const label=isFrench()?'Mes wishes':'My wishes';if(b.title!==label)b.title=label;if(b.getAttribute('aria-label')!==label)b.setAttribute('aria-label',label)}
  const title=document.getElementById('drawerTitle');if(title&&['Mon monde','My world'].includes(title.textContent.trim()))title.textContent=title.textContent.trim()==='Mon monde'?'Mes wishes':'My wishes';
}
function decorate(){renameMyWishes();decorateEntrusted()}

function installEngineGuard(){
  if(engineGuardInstalled)return;const frame=document.getElementById('engine'),doc=frame?.contentDocument;if(!doc)return;
  engineGuardInstalled=true;
  const s=doc.createElement('script');
  s.textContent=`(()=>{if(window.__rv26AlphaGuard)return;window.__rv26AlphaGuard=true;const finite=n=>Number.isFinite(n);function sane(){if(!finite(camera.x))camera.x=0;if(!finite(camera.y))camera.y=0;if(!finite(camera.zoom)||camera.zoom<=0)camera.zoom=.16;}const bg=drawBackground;drawBackground=function(){sane();if(!finite(W)||!finite(H)||W<=0||H<=0)return;return bg()};const rh=rootHalo;rootHalo=function(r){sane();if(!r||!finite(r.x)||!finite(r.y)||!finite(camera.zoom))return;const p=camera.worldToScreen(r.x,r.y);if(!finite(p.x)||!finite(p.y))return;return rh(r)};const dn=drawNode;drawNode=function(n){sane();if(!n||!finite(n.x)||!finite(n.y))return;return dn(n)};const de=drawEdge;drawEdge=function(e,p){sane();if(!e||![e.x0,e.y0,e.cx,e.cy,e.x1,e.y1].every(finite))return;return de(e,p)};const oldFit=camera.fit.bind(camera);camera.fit=function(){try{oldFit()}finally{sane()}};window.addEventListener('error',ev=>{if(String(ev.message||'').includes('createRadialGradient')){sane();ev.preventDefault()}});})();`;
  doc.body.appendChild(s);
}

const observer=new MutationObserver(()=>queueMicrotask(decorate));
observer.observe(document.documentElement,{subtree:true,childList:true});
document.addEventListener('click',e=>{if(e.target.closest?.('[data-lang],[data-panel],#drawerClose,#myWorldBtn,#entrustedBtn'))setTimeout(decorate,0)},true);
setInterval(decorateEntrusted,1000);

window.addEventListener('message',e=>{
  if(e.origin!==location.origin)return;
  if(e.data?.type==='rv25-snapshot'){roots=e.data.semantic||[];setTimeout(syncPolicy,0)}
  if(e.data?.type==='rv25-runtime-ready')setTimeout(installEngineGuard,0);
});

setTimeout(decorate,0);
})();
