(function installV40Bloom(){
'use strict';

if(window.__RV40_BLOOM__?.version===40)return;

if(
  typeof drawNode!=='function' ||
  typeof metaByNode==='undefined' ||
  typeof nodeBySemantic!=='function' ||
  typeof camera==='undefined' ||
  typeof ctx==='undefined' ||
  typeof H!=='function'
){
  setTimeout(installV40Bloom,60);
  return;
}

const previousDrawNode=drawNode;

const palettes=[
  {petal:'#efb29b',petal2:'#f2d09c',center:'#e7bd72',accent:'#b97870'},
  {petal:'#a9d3b1',petal2:'#d7e7ba',center:'#d9b779',accent:'#739b83'},
  {petal:'#a9bfdd',petal2:'#c8b7db',center:'#e2c694',accent:'#7185a4'},
  {petal:'#d8a8bd',petal2:'#e5bd9d',center:'#dbc27f',accent:'#9f758c'},
  {petal:'#b8d4cf',petal2:'#e4d4a5',center:'#d6b77e',accent:'#7e9d98'},
  {petal:'#c0add8',petal2:'#d7c8a8',center:'#e0bd79',accent:'#87769d'}
];

function hashId(id){
  return H('v40-bloom|'+String(id||''));
}

function variantFor(id){
  return hashId(id)%5;
}

function paletteFor(id){
  return palettes[H('v40-palette|'+String(id||''))%palettes.length];
}

function screenRadiusFor(m){
  return m?.kind==='create'?23:17;
}

function ellipsePetal(x,y,rx,ry,rot,fill,alpha=1){
  ctx.save();
  ctx.globalAlpha*=alpha;
  ctx.fillStyle=fill;
  ctx.beginPath();
  ctx.ellipse(x,y,rx,ry,rot,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function centerDisc(r,palette){
  ctx.fillStyle=palette.center;
  ctx.beginPath();
  ctx.arc(0,0,r,0,Math.PI*2);
  ctx.fill();
  ctx.strokeStyle='rgba(58,48,38,.32)';
  ctx.lineWidth=Math.max(.55,r*.18);
  ctx.stroke();
}

function drawRosette(r,p){
  const count=5;
  for(let k=0;k<count;k++){
    const a=-Math.PI/2+k*Math.PI*2/count;
    const d=r*.47;
    ellipsePetal(Math.cos(a)*d,Math.sin(a)*d,r*.34,r*.19,a,p.petals?.[k]|| (k%2?p.petal2:p.petal),.96);
  }
  centerDisc(r*.16,p);
}

function drawDaisy(r,p){
  const count=9;
  for(let k=0;k<count;k++){
    const a=-Math.PI/2+k*Math.PI*2/count;
    const d=r*.50;
    ellipsePetal(Math.cos(a)*d,Math.sin(a)*d,r*.35,r*.12,a,p.petal,.93);
  }
  centerDisc(r*.18,p);
}

function drawLotus(r,p){
  const upper=[
    [-.46,-.18,-.54],[0,-.38,-Math.PI/2],[.46,-.18,-2.60]
  ];
  for(let i=0;i<upper.length;i++){
    const [x,y,a]=upper[i];
    ellipsePetal(x*r,y*r,r*.34,r*.18,a,i===1?p.petal2:p.petal,.97);
  }
  ellipsePetal(-.27*r,.22*r,r*.31,r*.15,.42,p.petal2,.94);
  ellipsePetal(.27*r,.22*r,r*.31,r*.15,-.42,p.petal2,.94);
  centerDisc(r*.145,p);
}

function drawOrchid(r,p){
  ellipsePetal(0,-.38*r,r*.35,r*.20,-Math.PI/2,p.petal2,.96);
  ellipsePetal(-.38*r,-.08*r,r*.34,r*.19,-.28,p.petal,.96);
  ellipsePetal(.38*r,-.08*r,r*.34,r*.19,.28,p.petal,.96);
  ellipsePetal(-.22*r,.30*r,r*.29,r*.14,.64,p.petal2,.92);
  ellipsePetal(.22*r,.30*r,r*.29,r*.14,-.64,p.petal2,.92);
  ellipsePetal(0,.30*r,r*.22,r*.13,-Math.PI/2,p.accent,.90);
  centerDisc(r*.13,p);
}

function miniRosette(x,y,r,p,phase){
  const count=5;
  for(let k=0;k<count;k++){
    const a=phase+k*Math.PI*2/count;
    ellipsePetal(x+Math.cos(a)*r*.43,y+Math.sin(a)*r*.43,r*.28,r*.13,a,k%2?p.petal2:p.petal,.94);
  }
  ctx.fillStyle=p.center;
  ctx.beginPath();
  ctx.arc(x,y,r*.13,0,Math.PI*2);
  ctx.fill();
}

function drawCluster(r,p,id){
  const phase=(hashId(id)%360)*Math.PI/180;
  miniRosette(-.31*r,.08*r,r*.58,p,phase);
  miniRosette(.30*r,.10*r,r*.55,p,phase+.45);
  miniRosette(.02*r,-.30*r,r*.62,p,phase-.30);
}

function drawBloomV40(n,m){
  const z=Math.max(.5,camera.zoom);
  const r=screenRadiusFor(m)/z;
  const p=paletteFor(m.semanticId);
  const variant=variantFor(m.semanticId);

  ctx.save();
  ctx.translate(n.x,n.y);

  // A quiet backing halo keeps the bloom readable without turning it neon.
  const halo=ctx.createRadialGradient(0,0,r*.18,0,0,r*1.08);
  halo.addColorStop(0,'rgba(241,226,194,.13)');
  halo.addColorStop(.62,'rgba(193,214,208,.045)');
  halo.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=halo;
  ctx.beginPath();
  ctx.arc(0,0,r*1.08,0,Math.PI*2);
  ctx.fill();

  if(variant===0)drawRosette(r,p);
  else if(variant===1)drawDaisy(r,p);
  else if(variant===2)drawLotus(r,p);
  else if(variant===3)drawOrchid(r,p);
  else drawCluster(r,p,m.semanticId);

  // The central point is always exactly the semantic node.
  ctx.fillStyle='rgba(255,244,215,.78)';
  ctx.beginPath();
  ctx.arc(0,0,Math.max(1.2/z,r*.055),0,Math.PI*2);
  ctx.fill();

  ctx.restore();
}

drawNode=function(n){
  const m=metaByNode.get(n.id);
  if(m?.state==='bloom'){
    // Suppress the previous tiny six-petal star while preserving all other node rendering.
    const originalState=m.state;
    m.state='alive';
    try{
      previousDrawNode(n);
    }finally{
      m.state=originalState;
    }
    drawBloomV40(n,m);
    return;
  }
  previousDrawNode(n);
};

window.__RV40_BLOOM__={
  version:40,
  variants:5,
  variantFor,
  paletteFor,
  screenRadiusFor,
  debugSemantic(semanticId){
    const n=nodeBySemantic(semanticId);
    const m=metaByNode.get(n?.id);
    if(!n||!m)return null;
    return {
      semanticId,
      state:m.state,
      kind:m.kind,
      nodeX:n.x,
      nodeY:n.y,
      centerX:n.x,
      centerY:n.y,
      variant:variantFor(semanticId),
      screenRadius:screenRadiusFor(m),
      palette:paletteFor(semanticId)
    };
  }
};
})();