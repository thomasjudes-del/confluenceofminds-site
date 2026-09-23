(function(){
'use strict';

const frame=document.getElementById('engine');
const STORE=window.RALUVAAA_STORE_KEY||'raluvaaaManualMvpV26';
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;

function svg(body,view='0 0 24 24'){
  return '<svg viewBox="'+view+'" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round">'+body+'</svg>';
}
const ICONS={
  seed:svg('<path d="M12 20c0-6 0-10 0-15"/><path d="M12 11C8 10 6 7 6 4c4 0 6 2 6 6"/><path d="M12 14c4-1 6-4 6-7-4 0-6 2-6 6"/>'),
  sprout:svg('<path d="M5 18c3-6 6-9 14-12"/><path d="M10 13c-3 0-5-2-6-5 4 0 6 1 7 4"/><path d="M14 10c0-4 2-6 6-7 0 4-2 6-6 7"/>'),
  branch:svg('<path d="M5 20c4-5 6-9 6-16"/><path d="M10 11c3-1 6-3 8-6"/><path d="M9 15c-3-1-5-3-6-6"/><circle cx="18" cy="5" r="1.3"/><circle cx="3" cy="9" r="1.3"/>'),
  bloom:svg('<circle cx="12" cy="12" r="2"/><path d="M12 10c-2-5 1-7 1-7s3 3 0 7M14 12c5-2 7 1 7 1s-3 3-7 0M12 14c2 5-1 7-1 7s-3-3 0-7M10 12c-5 2-7-1-7-1s3-3 7 0"/>'),
  trace:svg('<path d="M5 18c4-2 7-6 9-12"/><path d="M8 16c3 1 6 0 8-2"/><path d="M11 11c-2 0-4-1-5-3"/><path d="M14 8c2 0 4-1 5-3"/>'),
  pulse:svg('<path d="M3 13h4l2-5 3 9 2-5h7"/>'),
  help:svg('<path d="M4 13c2-2 4-2 6 0l2 2 2-2c2-2 4-2 6 0"/><path d="M5 13c1 4 4 7 7 8 3-1 6-4 7-8"/><path d="M12 4v5M9.5 6.5h5"/>'),
  link:svg('<path d="M9 15l6-6"/><path d="M7 17l-1 1a3 3 0 0 1-4-4l4-4a3 3 0 0 1 4 0"/><path d="M17 7l1-1a3 3 0 0 1 4 4l-4 4a3 3 0 0 1-4 0"/>'),
  focus:svg('<circle cx="12" cy="12" r="3"/><path d="M4 12c2-4 5-6 8-6s6 2 8 6c-2 4-5 6-8 6s-6-2-8-6"/>'),
  encourage:svg('<path d="M4 15c5 0 7-4 8-10 1 6 3 10 8 10-5 0-7 2-8 6-1-4-3-6-8-6z"/>'),
  suggest:svg('<path d="M6 17c3-5 6-8 12-11"/><path d="M14 7h5v5"/><path d="M5 19h6"/>'),
  share:svg('<circle cx="6" cy="12" r="2"/><circle cx="17" cy="6" r="2"/><circle cx="17" cy="18" r="2"/><path d="M8 11l7-4M8 13l7 4"/>'),
  graft:svg('<path d="M6 20c4-5 6-9 6-16"/><path d="M12 11c4 0 6-2 8-5"/><path d="M16 6h4v4"/>'),
  letgo:svg('<path d="M5 19c4-4 7-8 10-14"/><path d="M10 13c-3-1-5-3-6-6"/><path d="M14 8c3 0 5-1 7-3"/>'),
  correct:svg('<path d="M5 18l4-1 9-9-3-3-9 9-1 4z"/><path d="M13 7l3 3"/>'),
  entrusted:svg('<path d="M12 3l1.6 5.2L19 10l-5.4 1.8L12 17l-1.6-5.2L5 10l5.4-1.8L12 3z"/><path d="M4 17l.8 2.2L7 20l-2.2.8L4 23l-.8-2.2L1 20l2.2-.8L4 17z"/>'),
  inbox:svg('<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.2"/><path d="M12 3v2M21 12h-2M12 21v-2M3 12h2"/>'),
  world:svg('<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4-2-6-5-7 0 4 2 6 5 7M14 12c4 0 6-2 7-5-4 0-6 2-7 5M12 14c0 4 2 6 5 7 0-4-2-6-5-7M10 12c-4 0-6 2-7 5 4 0 6-2 7-5"/>'),
  plus:svg('<path d="M12 5v14M5 12h14"/>'),
  place:svg('<path d="M12 21s6-6 6-11a6 6 0 1 0-12 0c0 5 6 11 6 11z"/><circle cx="12" cy="10" r="1.7"/>'),
  root:svg('<path d="M12 3v9M12 12c-4 1-6 4-7 8M12 12c4 1 6 4 7 8M12 14c0 3-1 5-3 7M12 14c0 3 1 5 3 7"/>')
};

function language(){
  return document.querySelector('.lang button.active')?.dataset.lang || document.documentElement.lang || 'fr';
}
function labels(){
  const en=String(language()).toLowerCase().startsWith('en');
  return en?{
    evolve:'continue',split:'branch',branch:'branch',bloom:'bloom',focus:'lineage',encourage:'warm',help:'help',suggest:'offer',connect:'connect',share:'share',reattach:'graft',abandon:'let go',remove:'correct'
  }:{
    evolve:'prolonger',split:'ramifier',branch:'ramifier',bloom:'fleurir',focus:'lign\u00e9e',encourage:'souffle',help:'aider',suggest:'proposer',connect:'relier',share:'partager',reattach:'greffer',abandon:'laisser',remove:'corriger'
  };
}
const ACTION_ICON={evolve:'sprout',split:'branch',branch:'branch',bloom:'bloom',focus:'focus',encourage:'encourage',help:'help',suggest:'suggest',connect:'link',share:'share',reattach:'graft',abandon:'letgo',remove:'correct'};

function decorateRail(){
  const defs=[['entrustedBtn','entrusted'],['inboxBtn','inbox'],['myWorldBtn','world'],['createBtn','plus']];
  for(const [id,name] of defs){
    const b=document.getElementById(id);if(!b||b.dataset.v27Icon)return;
    const badge=b.querySelector('.badge');b.dataset.v27Icon='1';b.innerHTML=ICONS[name]+(badge?badge.outerHTML:'');
  }
}
function decorateActions(){
  const L=labels();
  document.querySelectorAll('[data-act]').forEach(b=>{
    if(b.dataset.v27Action)return;
    const act=b.dataset.act,old=b.textContent.trim();
    if(!ACTION_ICON[act])return;
    b.dataset.v27Action='1';b.setAttribute('aria-label',old);b.title=old;
    b.innerHTML=ICONS[ACTION_ICON[act]]+'<span class="v27-action-label">'+(L[act]||old)+'</span>';
  });
}
function plain(s){
  return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
}
function chipDescriptor(raw){
  const p=plain(raw),en=String(language()).toLowerCase().startsWith('en');
  if(p==='create')return['seed',en?'origin':'origine','alive'];
  if(p==='evolve')return['sprout',en?'continued':'prolong\u00e9','alive'];
  if(p==='split'||p==='branch_add')return['branch',en?'branched':'ramifi\u00e9','alive'];
  if(/alive|vivant/.test(p))return['pulse',en?'living':'vivant','alive'];
  if(/bloomed|fleuri/.test(p))return['bloom',en?'bloomed':'fleuri','bloom'];
  if(/abandoned|abandonne/.test(p))return['trace',en?'trace':'trace','trace'];
  const br=p.match(/^(\d+)\s+branches?/);if(br)return['branch',br[1]+' '+(en?'offshoots':'pousses'),'alive'];
  const hp=p.match(/^(\d+)\s+help/);if(hp)return['help',hp[1]+' '+(en?'help':'aide'),'alive'];
  const cp=p.match(/^(\d+)\s+connect/);if(cp)return['link',cp[1]+' '+(en?'link':'lien'),'alive'];
  return null;
}
function decorateChips(){
  document.querySelectorAll('.chip').forEach(c=>{
    if(c.dataset.v27Chip)return;
    const d=chipDescriptor(c.textContent);if(!d)return;
    c.dataset.v27Chip='1';c.dataset.state=d[2];c.innerHTML=ICONS[d[0]]+'<span>'+d[1]+'</span>';
  });
}
function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
function textFrom(html){const d=document.createElement('div');d.innerHTML=html;return d.textContent.trim()}
function shorten(s,n=84){return s.length>n?s.slice(0,n-1).trim()+'\u2026':s}
function decorateWishMeta(){
  document.querySelectorAll('.meta').forEach(meta=>{
    if(meta.dataset.v27Meta)return;
    const parts=meta.innerHTML.split(/<br\s*\/?\s*>/i).map(textFrom).filter(Boolean);
    if(!parts.length)return;
    meta.dataset.v27Meta='1';
    const loc=parts.shift();
    let h='<div class="v27-loc">'+ICONS.place+'<span>'+esc(loc)+'</span></div>';
    if(parts.length){
      h+='<div class="v27-lineage">';
      for(const part of parts){
        const clean=part.replace(/^(Origine|Origin|Depuis|From)\s*:\s*/i,'');
        const isRoot=/^(Origine|Origin)/i.test(part);
        h+='<div class="v27-lineage-fragment">'+ICONS[isRoot?'root':'sprout']+'<span>'+esc(shorten(clean))+'</span></div>';
      }
      h+='</div>';
    }
    meta.innerHTML=h;
  });
  const body=document.getElementById('drawerBody'),title=document.getElementById('drawerTitle');
  if(body?.querySelector('.wish')&&title&&plain(title.textContent)==='wish'){
    title.innerHTML=ICONS.seed;title.setAttribute('aria-label','Wish');
  }
}
function decorate(){decorateRail();decorateActions();decorateChips();decorateWishMeta()}

let decorateQueued=false;
const observer=new MutationObserver(()=>{
  if(decorateQueued)return;decorateQueued=true;
  requestAnimationFrame(()=>{decorateQueued=false;decorate()});
});
observer.observe(document.body,{subtree:true,childList:true});
document.addEventListener('click',e=>{if(e.target.closest('.lang button'))setTimeout(decorate,30)},true);
decorate();

/* P1: soft procedural micro-sounds, generated locally after user interaction. */
let audioCtx=null,armed=false;
function ensureAudio(){
  if(!audioCtx){const C=window.AudioContext||window.webkitAudioContext;if(C)audioCtx=new C()}
  if(audioCtx?.state==='suspended')audioCtx.resume().catch(()=>{});
  return audioCtx;
}
function arm(){armed=true;ensureAudio()}
document.addEventListener('pointerdown',arm,{once:true,capture:true});
document.addEventListener('keydown',arm,{once:true,capture:true});
function soundEnabled(){return window.__RALUVAAA_AUDIO__?.enabled!==false&&localStorage.getItem('raluvaaaAmbientAudioV1')!=='off'}
function tone(freq,offset,dur,gain=.012,type='sine',endFreq=null){
  if(!armed||!soundEnabled())return;const c=ensureAudio();if(!c)return;
  const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+offset;
  o.type=type;o.frequency.setValueAtTime(freq,t);if(endFreq)o.frequency.exponentialRampToValueAtTime(endFreq,t+dur);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.025);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+dur+.03);
}
function cue(type){
  if(!armed||!soundEnabled())return;
  if(type==='create'){tone(196,0,.42,.010,'sine',294);tone(392,.11,.5,.006)}
  else if(type==='evolve'){tone(233,0,.30,.008,'sine',349);tone(466,.16,.35,.005)}
  else if(type==='split'||type==='branch_add'){tone(220,0,.30,.007);tone(277,.09,.34,.006);tone(330,.18,.38,.005)}
  else if(type==='bloom'){tone(294,0,.75,.008);tone(440,.13,.85,.007);tone(587,.28,.9,.005)}
  else if(type==='encourage'){tone(523,0,.26,.004,'sine',659)}
  else if(type==='help'){tone(247,0,.48,.006);tone(370,.16,.52,.005)}
  else if(type==='connect'){tone(220,0,.65,.006,'sine',330);tone(330,.08,.65,.006,'sine',440)}
  else if(type==='abandon'){tone(247,0,.62,.005,'sine',174)}
  else if(type==='reparent'){tone(196,0,.40,.006,'sine',262)}
}
const previousSet=Storage.prototype.setItem;
Storage.prototype.setItem=function(key,value){
  let before=null;if(key===STORE){try{before=JSON.parse(this.getItem(key)||'null')}catch{}}
  previousSet.call(this,key,value);
  if(key!==STORE)return;
  let after=null;try{after=JSON.parse(value||'null')}catch{}
  const n=Array.isArray(before?.events)?before.events.length:0;
  const fresh=Array.isArray(after?.events)?after.events.slice(n):[];
  if(fresh.length){let delay=0;for(const ev of fresh){setTimeout(()=>cue(ev.type),delay);delay+=90}}
};

document.addEventListener('click',e=>{
  const b=e.target.closest('.rail-btn,[data-act],.drawer-close,.sheet-actions button');
  if(!b||b.disabled||!armed||!soundEnabled())return;
  tone(420,0,.09,.0018,'sine',470);
},true);

/* P2: a very light living layer over the locked V03 engine. */
if(!reduced&&frame){
  const canvas=document.createElement('canvas');canvas.id='rvAtmosphere';document.body.insertBefore(canvas,document.body.firstChild);
  const ctx=canvas.getContext('2d',{alpha:true});let W=0,H=0,DPR=1,last=0,bridgeReady=false;
  function resize(){W=innerWidth;H=innerHeight;DPR=Math.min(devicePixelRatio||1,innerWidth<821?1.35:1.65);canvas.width=Math.max(1,Math.round(W*DPR));canvas.height=Math.max(1,Math.round(H*DPR));canvas.style.width=W+'px';canvas.style.height=H+'px'}
  addEventListener('resize',resize,{passive:true});resize();
  function installBridge(){
    try{
      const w=frame.contentWindow,doc=frame.contentDocument;if(!w||!doc?.body)return false;
      if(typeof w.__rv27Snapshot==='function'){bridgeReady=true;return true}
      const s=doc.createElement('script');
      s.textContent=`window.__rv27Snapshot=function(){try{var es=[],ns=[],stepE=Math.max(1,Math.floor(world.edges.length/92)),stepN=Math.max(1,Math.floor(world.nodes.length/72));for(var i=0;i<world.edges.length;i+=stepE){var e=world.edges[i],st=stateOfEdge(e);if(st==='fossil')continue;var a=camera.worldToScreen(e.x0,e.y0),b=camera.worldToScreen(e.x1,e.y1),c=camera.worldToScreen(e.cx,e.cy);if((a.x<-100&&b.x<-100)||(a.x>W+100&&b.x>W+100)||(a.y<-100&&b.y<-100)||(a.y>H+100&&b.y>H+100))continue;es.push({a:a,b:b,c:c,h:e.hue||e.root.hue,s:e.seed||i,d:st==='dormant'});if(es.length>92)break}for(var j=0;j<world.nodes.length;j+=stepN){var n=world.nodes[j],sn=stateOf(n);if(sn==='fossil')continue;var p=camera.worldToScreen(n.x,n.y);if(p.x<-70||p.x>W+70||p.y<-70||p.y>H+70)continue;ns.push({p:p,h:n.root.hue,s:j+(n.generation||0)*97,d:sn==='dormant',r:!!n.rootNode});if(ns.length>72)break}return{z:camera.zoom,es:es,ns:ns}}catch(e){return null}};`;
      doc.body.appendChild(s);s.remove();bridgeReady=typeof w.__rv27Snapshot==='function';
      if(bridgeReady){const c=doc.querySelector('canvas');if(c)c.style.filter='saturate(1.035) contrast(1.018)'}
      return bridgeReady;
    }catch{return false}
  }
  frame.addEventListener('load',()=>setTimeout(installBridge,160));setTimeout(installBridge,260);
  function q(a,c,b,t){const u=1-t;return u*u*a+2*u*t*c+t*t*b}
  function draw(ts){
    requestAnimationFrame(draw);if(ts-last<34)return;last=ts;
    if(!bridgeReady&&!installBridge())return;
    let snap=null;try{snap=frame.contentWindow.__rv27Snapshot()}catch{}if(!snap)return;
    ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,W,H);ctx.globalCompositeOperation='lighter';
    const zoom=snap.z||1,edgeAlpha=zoom<.12?.08:.13;
    for(let i=0;i<snap.es.length;i++){
      const e=snap.es[i],phase=((ts*.000045)+(e.s%997)/997)%1,x=q(e.a.x,e.c.x,e.b.x,phase),y=q(e.a.y,e.c.y,e.b.y,phase);
      const r=e.d?.55:.78,alpha=(e.d?.035:edgeAlpha)*(0.58+0.42*Math.sin(phase*Math.PI));
      ctx.fillStyle='hsla('+e.h+',95%,82%,'+alpha+')';ctx.shadowColor='hsla('+e.h+',95%,75%,'+(alpha*1.8)+')';ctx.shadowBlur=e.d?2:5;
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    }
    ctx.shadowBlur=0;
    for(let i=0;i<snap.ns.length;i++){
      const n=snap.ns[i];if((i+n.s)%3)continue;
      const ph=ts*.00018+n.s*.41,rad=n.r?8:4.5,dx=Math.sin(ph)*rad,dy=Math.cos(ph*.83)*rad*.62;
      const alpha=n.d?.025:(n.r?.075:.045),r=n.r?1.05:.62;
      ctx.fillStyle='hsla('+n.h+',92%,84%,'+alpha+')';ctx.beginPath();ctx.arc(n.p.x+dx,n.p.y+dy,r,0,Math.PI*2);ctx.fill();
    }
    ctx.globalCompositeOperation='source-over';
  }
  requestAnimationFrame(draw);
}

window.__RALUVAAA_V27__={version:27,decorate,cue,icons:ICONS};
})();
