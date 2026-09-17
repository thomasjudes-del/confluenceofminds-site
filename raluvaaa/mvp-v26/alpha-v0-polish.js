(function(){
'use strict';
const STORE='raluvaaaManualMvpV26';
const params=new URLSearchParams(location.search);
const frame=document.getElementById('engine');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

function injectChrome(){
  document.title='RALUVAAA · Alpha V0';
  const sub=document.querySelector('#brand .sub');if(sub)sub.textContent=params.has('qa')?'ALPHA V0 · QA':'ALPHA V0';
  if(!params.has('qa')){const q=document.getElementById('qaStrip');if(q)q.classList.add('hidden')}
  const style=document.createElement('style');style.textContent=`
  #ritualLayer{position:fixed;inset:0;z-index:62;pointer-events:none;overflow:hidden}
  .rv-ring{position:absolute;width:18px;height:18px;margin:-9px;border:1px solid rgba(185,238,255,.78);border-radius:50%;box-shadow:0 0 20px rgba(99,217,255,.48);animation:rv-ring 1.55s ease-out forwards}
  .rv-ring.r2{animation-delay:.16s}.rv-ring.r3{animation-delay:.32s}
  .rv-seed{position:absolute;width:8px;height:8px;margin:-4px;border-radius:50%;background:rgba(239,250,255,.92);box-shadow:0 0 9px rgba(164,235,255,.95),0 0 30px rgba(83,198,255,.55);animation:rv-seed 1.7s ease-out forwards}
  .rv-petal{position:absolute;width:5px;height:13px;margin:-7px -2px;border-radius:70% 70% 55% 55%;transform-origin:2px 28px;background:rgba(238,245,255,.92);box-shadow:0 0 9px rgba(173,226,255,.64);animation:rv-petal 1.9s cubic-bezier(.18,.72,.17,1) forwards}
  .rv-bud{position:absolute;width:6px;height:10px;margin:-5px -3px;border-radius:70% 30% 70% 30%;background:rgba(151,241,202,.88);box-shadow:0 0 9px rgba(103,224,170,.58);animation:rv-bud 1.55s ease-out forwards}
  .rv-path{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.rv-path path{fill:none;stroke:rgba(172,232,255,.76);stroke-width:1.3;stroke-linecap:round;filter:drop-shadow(0 0 4px rgba(110,210,255,.45));stroke-dasharray:8 8;animation:rv-dash 1.35s ease-out forwards}.rv-path.connect path{stroke-dasharray:3 8}.rv-path.bloom path{stroke:rgba(235,245,255,.45)}
  @keyframes rv-ring{0%{transform:scale(.25);opacity:1}100%{transform:scale(7.2);opacity:0}}
  @keyframes rv-seed{0%{transform:scale(.2);opacity:0}22%{transform:scale(2);opacity:1}100%{transform:scale(.9);opacity:0}}
  @keyframes rv-petal{0%{transform:rotate(var(--a)) translateY(0) scale(.15);opacity:0}24%{opacity:1}100%{transform:rotate(var(--a)) translateY(-22px) scale(1);opacity:0}}
  @keyframes rv-bud{0%{transform:translate(0,0) scale(.2);opacity:0}30%{opacity:1}100%{transform:translate(var(--dx),var(--dy)) rotate(var(--r)) scale(1);opacity:0}}
  @keyframes rv-dash{0%{stroke-dashoffset:70;opacity:0}20%{opacity:1}100%{stroke-dashoffset:0;opacity:0}}
  @media(max-width:820px){#qaStrip:not(.hidden){max-width:160px;overflow:hidden}.drawer-item .m{font-variant-numeric:tabular-nums}}
  `;document.head.appendChild(style);
  const layer=document.createElement('div');layer.id='ritualLayer';document.body.appendChild(layer);
}
injectChrome();
const layer=document.getElementById('ritualLayer');

function point(id){
  try{const w=frame.contentWindow,n=w?.world?.nodes?.find(x=>x.semanticId===id);if(!n||!w?.camera?.worldToScreen)return null;const p=w.camera.worldToScreen(n.x,n.y);if(!Number.isFinite(p?.x)||!Number.isFinite(p?.y))return null;return{x:p.x,y:p.y}}catch{return null}
}
function waitPoint(id,tries=14){return new Promise(resolve=>{let n=0;const tick=()=>{const p=point(id);if(p||n++>=tries)return resolve(p);setTimeout(tick,90)};tick()})}
function ring(p,delayClass=''){if(!p)return;const e=document.createElement('i');e.className='rv-ring '+delayClass;e.style.left=p.x+'px';e.style.top=p.y+'px';layer.appendChild(e);setTimeout(()=>e.remove(),2100)}
function seedPulse(p){if(!p)return;const e=document.createElement('i');e.className='rv-seed';e.style.left=p.x+'px';e.style.top=p.y+'px';layer.appendChild(e);setTimeout(()=>e.remove(),2100)}
function petals(p,count=11){if(!p)return;for(let i=0;i<count;i++){const e=document.createElement('i');e.className='rv-petal';e.style.left=p.x+'px';e.style.top=p.y+'px';e.style.setProperty('--a',(i*360/count)+'deg');layer.appendChild(e);setTimeout(()=>e.remove(),2200)}}
function buds(p,count=5){if(!p)return;for(let i=0;i<count;i++){const a=(i/count)*Math.PI*2,rad=18+((i*7)%13),e=document.createElement('i');e.className='rv-bud';e.style.left=p.x+'px';e.style.top=p.y+'px';e.style.setProperty('--dx',(Math.cos(a)*rad)+'px');e.style.setProperty('--dy',(Math.sin(a)*rad)+'px');e.style.setProperty('--r',(i*39)+'deg');layer.appendChild(e);setTimeout(()=>e.remove(),1900)}}
function path(a,b,kind=''){if(!a||!b)return;const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','rv-path '+kind);const p=document.createElementNS('http://www.w3.org/2000/svg','path');const dx=b.x-a.x,dy=b.y-a.y,curve=Math.max(20,Math.min(90,Math.hypot(dx,dy)*.22));p.setAttribute('d',`M ${a.x} ${a.y} Q ${a.x-dy/Math.max(1,Math.hypot(dx,dy))*curve} ${a.y+dx/Math.max(1,Math.hypot(dx,dy))*curve} ${b.x} ${b.y}`);svg.appendChild(p);layer.appendChild(svg);setTimeout(()=>svg.remove(),1800)}
function revealMap(){const d=document.getElementById('drawer');if(d&&!d.classList.contains('hidden'))document.getElementById('drawerClose')?.click()}

async function ritual(ev){
  if(reduce||!ev)return;
  const structural=['create','evolve','split','branch_add','bloom','abandon'];if(structural.includes(ev.type))revealMap();
  if(ev.type==='create'){const p=await waitPoint(ev.semanticId);ring(p);ring(p,'r2');ring(p,'r3');seedPulse(p);return}
  if(ev.type==='evolve'){const [a,b]=await Promise.all([waitPoint(ev.parentSemanticId),waitPoint(ev.semanticId)]);path(a,b);ring(b);seedPulse(b);return}
  if(ev.type==='split'||ev.type==='branch_add'){const a=await waitPoint(ev.parentSemanticId);for(const child of ev.children||[]){const b=await waitPoint(child.semanticId);path(a,b);ring(b);seedPulse(b)}return}
  if(ev.type==='bloom'){const p=await waitPoint(ev.semanticId);ring(p);ring(p,'r2');petals(p,13);seedPulse(p);return}
  if(ev.type==='abandon'){const p=await waitPoint(ev.semanticId);ring(p);return}
  if(ev.type==='encourage'){const p=await waitPoint(ev.semanticId);ring(p);ring(p,'r2');return}
  if(ev.type==='help'){const p=await waitPoint(ev.semanticId);buds(p,6);ring(p);return}
  if(ev.type==='connect'){const [a,b]=await Promise.all([waitPoint(ev.aSemanticId),waitPoint(ev.bSemanticId)]);path(a,b,'connect');ring(a);ring(b);return}
  if(ev.type==='reparent'){const p=await waitPoint(ev.semanticId);ring(p);seedPulse(p)}
}

const nativeSet=Storage.prototype.setItem;
Storage.prototype.setItem=function(key,value){
  let before=null;if(key===STORE){try{before=JSON.parse(this.getItem(key)||'null')}catch{}}
  nativeSet.call(this,key,value);
  if(key!==STORE)return;
  let after=null;try{after=JSON.parse(value||'null')}catch{}
  const oldLen=Array.isArray(before?.events)?before.events.length:0,newEvents=Array.isArray(after?.events)?after.events.slice(oldLen):[];
  if(newEvents.length){let delay=220;for(const ev of newEvents){setTimeout(()=>ritual(ev),delay);delay+=120}}
};
})();
