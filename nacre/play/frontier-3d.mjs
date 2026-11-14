import {SaltCrust} from './salt-crust.mjs';
import {CisternGallery} from './cistern-gallery.mjs';
import {CisternTransfer} from './cistern-transfer.mjs';
import {CisternFerry} from './cistern-ferry.mjs';
import {CisternWorks} from './cistern-works.mjs';
import {SaltPassage} from './salt-passage.mjs';
import {SaltEngine} from './salt-engine.mjs';
import * as T from './vendor/three/three.module.js';
import {GLTFLoader} from './vendor/three/loaders/GLTFLoader.js';
import {mergeGeometries} from './vendor/three/utils/BufferGeometryUtils.js';
import {Actor} from './conservatory-art.mjs';
import {SurfaceFinish} from './surface-finish.mjs';
const U=1/60,v=(x,y,z=0)=>new T.Vector3(x,y,z);
const material=(name,color,roughness=.85,metalness=0)=>{const m=new T.MeshStandardMaterial({color,roughness,metalness});m.name=name;return m;};
function mesh(g,m,p,parent){const a=new T.Mesh(g,m);a.position.copy(p);a.castShadow=a.receiveShadow=true;parent.add(a);return a;}
function slab(w,h,d,m,x,y,z,parent){const s=new T.Shape();const b=.06;s.moveTo(-w/2+b,-h/2);s.lineTo(w/2-b,-h/2);s.lineTo(w/2,-h/2+b);s.lineTo(w/2,h/2-b);s.lineTo(w/2-b,h/2);s.lineTo(-w/2+b,h/2);s.lineTo(-w/2,h/2-b);s.lineTo(-w/2,-h/2+b);s.closePath();const g=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,steps:1});g.translate(0,0,-d/2);return mesh(g,m,v(x,y,z),parent);}
function tube(points,r,m,parent){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>v(...p))),Math.max(20,points.length*6),r,8,false),m,v(0,0,0),parent);}
function merge(group){group.updateMatrixWorld(true);const buckets=new Map();for(const o of [...group.children]){if(!o.isMesh)continue;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);const a=buckets.get(o.material)||[];a.push(g);buckets.set(o.material,a);group.remove(o);o.geometry.dispose();}for(const [m,gs]of buckets){mesh(mergeGeometries(gs,false),m,v(0,0,0),group);gs.forEach(g=>g.dispose());}}
function shell(m,parent,scale=1){const pos=[],idx=[],n=140,rings=14;
 for(let i=0;i<=n;i++){const t=i/n,a=t*Math.PI*4.7,rad=.06+.78*t*t,thick=(.025+.23*t)*(1+.055*Math.cos(t*270));for(let j=0;j<=rings;j++){const b=j/rings*Math.PI*2,r=rad+thick*Math.cos(b);pos.push(Math.cos(a)*r*scale,Math.sin(a)*r*scale,Math.sin(b)*thick*scale);if(i<n&&j<rings){const k=i*(rings+1)+j;idx.push(k,k+1,k+rings+1,k+1,k+rings+2,k+rings+1);}}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return mesh(g,m,v(0,0,0),parent);}
export function frontierCamera(s,aspect=16/9){const dune=s.chapter==='desert',crust=dune?T.MathUtils.smoothstep(s.x,7470,7800)*(1-T.MathUtils.smoothstep(s.x,8450,8750)):0,x=s.x*U,y=(510-s.y)*U,pan=dune?T.MathUtils.smoothstep(s.x,1700,2200)*(1-T.MathUtils.smoothstep(s.x,2800,3050)):0;const weighing=dune?T.MathUtils.smoothstep(s.x,760,980)*(1-T.MathUtils.smoothstep(s.x,1480,1770)):0;const draining=dune?0:T.MathUtils.smoothstep(s.x,1950,2140)*(1-T.MathUtils.smoothstep(s.x,2420,2700));const transfer=dune?0:T.MathUtils.smoothstep(s.x,3460,3700)*(1-T.MathUtils.smoothstep(s.x,4220,4450));return{x:x+1.15+crust*1.6+weighing*1.3+draining*2+transfer*1.3,y:y+1.1+pan*1.4-draining*.6,eyeY:y+3.7+pan*.7,z:(10.5+crust*4+pan*3.2+weighing*3.2+draining*3.3+transfer*3.2)*Math.max(1,1.48/aspect),eyeOffset:-.8,fov:36};}
export class Frontier3D{
 constructor(canvas,options={}){this.canvas=canvas;this.options=options;this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(36,16/9,.1,220);this.renderer=options.renderer||new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.camFocus=v(0,0,0);this.cameraAnchor=v(0,0,0);this.ready=false;this.resize();this.loading=this.load();}
 async load(){const gltf=this.options.actor||await new GLTFLoader().loadAsync('assets3d/traveller.glb');this.actor=new Actor(gltf);this.scene.add(this.actor.root);this.ready=true;}
 build(chapter){if(this.world){const geometries=new Set(),materials=new Set();this.world.traverse(o=>{if(o.isMesh||o.isPoints){geometries.add(o.geometry);materials.add(o.material);}});this.scene.remove(this.world);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}if(this.finish){Object.values(this.finish.maps).forEach(pair=>Object.values(pair).forEach(t=>t.dispose()));}this.chapter=chapter;const red=chapter==='red';this.world=new T.Group();this.scene.add(this.world);const fixed=new T.Group();this.world.add(fixed);
 this.scene.background=new T.Color(red?'#210e13':'#c4a267');this.scene.fog=new T.FogExp2(red?'#3d1719':'#c5ab7a',red?.033:.018);
 const M=this.M={stone:material('stone',red?'#5e352d':'#ac9163'),dark:material('basalt',red?'#302423':'#675b41'),bronze:material('bronze',red?'#7f5b3b':'#8c7446',.56,.55),salt:material('salt',red?'#994934':'#e0ce9d'),shell:material('shell',red?'#97574b':'#b8b19a',.5,.2)};
 const hemi=new T.HemisphereLight(red?'#c08074':'#eee1bd',red?'#182430':'#40392e',red?1.1:1.4);this.world.add(hemi);this.sun=new T.DirectionalLight(red?'#ffb179':'#ffe2a7',red?2.4:2.8);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1536,1536);Object.assign(this.sun.shadow.camera,{left:-20,right:20,top:16,bottom:-16,near:1,far:60});this.sun.shadow.normalBias=.025;this.world.add(this.sun,this.sun.target);
 const platforms=red?[[0,700,0],[1300,2450,170],[2490,2670,0],[2760,2920,30],[3010,3190,60],[3270,3550,110],[4200,6800,110]]:[[0,1320,0],[1660,7800,0],[8420,9200,-90]];
 for(const [a,b,h]of platforms){slab((b-a)*U,4.5,3.4,M.dark,(a+b)*U/2,h*U-2.55,0,fixed);slab((b-a)*U,.55,3.6,M.stone,(a+b)*U/2,h*U-.30,0,fixed);slab((b-a)*U,.14,3.78,M.salt,(a+b)*U/2,h*U-.07,0,fixed);for(let x=a+70;x<b;x+=170){slab(2.6,.7,3.3,M.dark,x*U,h*U-.85,0,fixed);tube([[x*U-.6,h*U+.012,.7],[x*U-.2,h*U+.016,.3],[x*U+.35,h*U+.014,.45]],.009,M.dark,fixed);}}
 for(const [a,b,h]of platforms)for(let x=a+70;x<b;x+=105){tube([[x*U-.35,h*U+.012,-1.65],[x*U,h*U+.016,-.2],[x*U-.18,h*U+.014,1.65]],.012,M.dark,fixed);}
 this.fossil=new T.Group();this.world.add(this.fossil);shell(M.shell,this.fossil,.87);this.fossil.position.y=.79;
 this.bridge=new T.Group();this.world.add(this.bridge);
 if(!red){
  slab(5.65,.30,3.25,M.dark,0,0,0,this.bridge);for(let i=0;i<11;i++)slab(.49,.12,3.28,M.stone,-2.53+i*.505,.18,0,this.bridge);merge(this.bridge);
  this.saltEngine=new SaltEngine(this.world,M);this.saltPassage=new SaltPassage(this.world,M);this.crust=new SaltCrust(this.world,M,{slab,tube,mesh});
  mesh(new T.PlaneGeometry(180,140).rotateX(-Math.PI/2),M.stone,v(38,-2.6,-40),fixed);
  // Salt dunes at different depths, sculpted as continuous surfaces.
  for(let k=0;k<4;k++){const g=new T.PlaneGeometry(100,20,100,22);g.rotateX(-Math.PI/2);const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,1.0+Math.sin(x*.12+k)*1.5+Math.cos(x*.21+z*.16)*.7);}g.computeVertexNormals();mesh(g,M.stone,v(28,-1.5+k*.28,-14-k*11),fixed);}
  const monument=new T.Group();monument.position.set(39,3.1,-9);monument.rotation.y=-.18;this.world.add(monument);shell(M.shell,monument,5.1);this.monument=monument;
  for(let i=0;i<7;i++){const x=3+i*8.1,h=2.6+Math.sin(i*2)*.8;tube([[x-1,-1.7,-4],[x-1.5,h*.4,-5],[x,h,-6],[x+2,h+.3,-8]],.20,M.salt,fixed);for(let k=0;k<3;k++){const r=mesh(new T.IcosahedronGeometry(1,1),M.dark,v(x+k*.4-1,-1.45,-4-k*.4),fixed);r.scale.set(.8,.5,.7);}}
  this.saltWheel=new T.Group();this.saltWheel.position.set(2600*U,1.1,.25);this.world.add(this.saltWheel);mesh(new T.TorusGeometry(.48,.065,10,36),M.bronze,v(0,0,0),this.saltWheel);for(let j=0;j<5;j++){const a=j*Math.PI*2/5;tube([[0,0,0],[Math.cos(a)*.45,Math.sin(a)*.45,0]],.025,M.bronze,this.saltWheel);}tube([[43.33,0,0],[43.33,1.1,0]],.12,M.dark,fixed);
  // Transmission stays behind the walking strip; its travel matches the shutter.
  this.saltWeight=new T.Group();this.world.add(this.saltWeight);
  slab(.7,1.1,.65,M.dark,0,0,0,this.saltWeight);for(const y of [-.35,0,.35])slab(.76,.07,.71,M.bronze,0,y,0,this.saltWeight);merge(this.saltWeight);
  for(const x of [43.33,47]){tube([[x,1.1,-2.5],[x,6.4,-2.5]],.035,M.dark,fixed);mesh(new T.TorusGeometry(.24,.055,8,24),M.bronze,v(x,6.4,-2.5),fixed);}
  tube([[43.33,6.64,-2.5],[47,6.64,-2.5]],.035,M.dark,fixed);
  tube([[43.33,1.1,.25],[43.33,1.1,-2.5]],.065,M.bronze,fixed);
  tube([[47,6.64,-2.5],[48.3,6.64,-2.6]],.035,M.dark,fixed);mesh(new T.TorusGeometry(.24,.055,8,24),M.bronze,v(48.3,6.4,-2.6),fixed);
  this.saltWeightCable=mesh(new T.CylinderGeometry(.025,.025,1,8),M.dark,v(48.3,5,-2.6),this.world);
  this.saltCable=mesh(new T.CylinderGeometry(.025,.025,1,8),M.dark,v(47,3,-2.5),this.world);
  for(const x of [47.8,48.8])tube([[x,.1,-2.6],[x,5.2,-2.6]],.06,M.bronze,fixed);
  this.shutter=new T.Group();this.world.add(this.shutter);for(let j=0;j<7;j++)slab(.25,.38,3.15,j%2?M.dark:M.bronze,0,.21+j*.40,0,this.shutter);merge(this.shutter);
  for(const z of [-1.9,1.9]){slab(z>0?.14:.7,5,z>0?.18:1,z>0?M.bronze:M.stone,2820*U,2.5,z,fixed);if(z<0)slab(.28,4.8,.12,M.bronze,2820*U-.35,2.5,z,fixed);}slab(1.0,.45,4.8,M.stone,2820*U,5,0,fixed);
  tube([[43.33,1.1,-.2],[43.33,4.8,-1],[47,4.8,-1],[47,3,-1]],.035,M.bronze,fixed);
  this.wheel=null;this.gate=null;this.lift=null;
 }else{
  this.fossil.visible=false;this.bridge.visible=false;
  for(let x=-2;x<114;x+=6){for(const z of [-5,-11]){mesh(new T.CylinderGeometry(.32,.5,9,18),M.stone,v(x,3.4,z),fixed);slab(1.25,.3,1.25,M.dark,x,-.9,z,fixed);tube([[x,6.4,z],[x+1.5,8,z],[x+3,8.35,z],[x+4.5,8,z],[x+6,6.4,z]],.2,M.bronze,fixed);}}
  for(let k=0;k<13;k++){const x=2+k*9;tube([[x,-1,-7],[x+.4,3,-7.4],[x-1,6,-8],[x+2,9,-8]],.22,M.dark,fixed);for(let j=0;j<3;j++)tube([[x+.1,3+j,-7],[x+1.4,4+j,-6.8],[x+2.4,4.8+j,-6]],.075,M.dark,fixed);}
  const tank=mesh(new T.CylinderGeometry(1.15,1.15,4.5,40,1,true,Math.PI/3,Math.PI*4/3),M.bronze,v(8.84,2,-2.3),fixed);for(const y of [.1,1,2,3,4.1]){const r=mesh(new T.TorusGeometry(1.17,.055,8,40),M.dark,v(8.84,y,-2.3),fixed);r.rotation.x=Math.PI/2;}
  for(let x=-3;x<114;x+=6){slab(5.8,3.8,.6,M.dark,x,1,-12,fixed);slab(5.8,2.0,.65,M.stone,x,4,-12,fixed);for(const y of [-.5,2.8,5.3])slab(6,.12,.85,M.bronze,x,y,-12,fixed);}
  const reservoirGlass=new T.MeshStandardMaterial({color:'#a1c4bc',transparent:true,opacity:.12,roughness:.18,side:T.DoubleSide,depthWrite:false});mesh(new T.CylinderGeometry(1.15,1.15,4.5,20,1,true,-Math.PI/3,Math.PI*2/3),reservoirGlass,v(8.84,2,-2.3),this.world);
  this.reservoirWater=mesh(new T.CylinderGeometry(1.10,1.10,1,32),new T.MeshStandardMaterial({color:'#548a8c',transparent:true,opacity:.66,roughness:.2,metalness:.35}),v(8.84,0,-2.3),this.world);
  this.gauge=slab(.16,3.5,.12,M.salt,9.9,2,-1.5,this.world);
  this.wheel=new T.Group();this.wheel.position.set(530*U,1.05,-.32);this.world.add(this.wheel);mesh(new T.TorusGeometry(.50,.06,10,40),M.bronze,v(0,0,0),this.wheel);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;tube([[0,0,0],[Math.cos(a)*.49,Math.sin(a)*.49,0]],.028,M.bronze,this.wheel);}tube([[8.8,0,-.55],[8.8,1.05,-.55],[8.8,1.05,-.32]],.09,M.dark,fixed);
  this.lift=new T.Group();this.world.add(this.lift);slab(5.82,.40,3.0,M.dark,0,-.25,0,this.lift);slab(5.82,.12,3.15,M.bronze,0,-.02,0,this.lift);for(let i=-5;i<=5;i++)slab(.49,.07,2.85,M.stone,i*.51,.02,0,this.lift);for(const x of [-2.7,2.7]){slab(.2,.7,3.1,M.bronze,x,-.35,0,this.lift);tube([[x,-.2,-1.2],[x,.5,-1.2],[x,1.0,-1.2]],.045,M.bronze,this.lift);}merge(this.lift);
  this.drainWheel=new T.Group();this.drainWheel.position.set(2180*U,170*U+1.05,-.32);this.world.add(this.drainWheel);mesh(new T.TorusGeometry(.50,.06,10,40),M.bronze,v(0,0,0),this.drainWheel);for(let j=0;j<5;j++){const a=j*Math.PI*2/5;tube([[0,0,0],[Math.cos(a)*.48,Math.sin(a)*.48,0]],.03,M.bronze,this.drainWheel);}tube([[2180*U,170*U,-.55],[2180*U,170*U+1.05,-.55],[2180*U,170*U+1.05,-.32]],.13,M.dark,fixed);
  this.cables=[];for(const x of [14.5,19.8]){this.cables.push(mesh(new T.CylinderGeometry(.024,.024,8,8),M.bronze,v(x,4,-1.2),this.world));tube([[x,0,-1.7],[x,8,-1.7],[x+.6,8.5,-1.7]],.12,M.dark,fixed);}
  this.gate=new T.Group();this.world.add(this.gate);for(let z=-1.5;z<=1.5;z+=.3)slab(.16,3.0,.11,M.bronze,0,1.5,z,this.gate);slab(.32,.2,3.4,M.dark,0,2.8,0,this.gate);merge(this.gate);
  slab(.65,8.4,.50,M.stone,1870*U,6.03,-1.8,fixed);
  slab(.14,8.4,.16,M.bronze,1870*U,6.03,1.8,fixed);
  this.cisternWorks=new CisternWorks(this.world,M,{slab,tube,mesh,merge});this.ferry=new CisternFerry(this.world,M,{slab,tube,mesh,merge});this.transfer=new CisternTransfer(this.world,this.ferry.deck,M,{slab,tube,mesh,merge});this.gallery=new CisternGallery(this.world,M,{slab,tube,mesh,merge});
  const waterMat=new T.MeshStandardMaterial({color:'#5d2224',roughness:.22,metalness:.65,transparent:true,opacity:.78});this.water=mesh(new T.PlaneGeometry(65,40),waterMat,v(20,-1.15,-7),this.world);this.water.rotation.x=-Math.PI/2;
  this.basin=mesh(new T.PlaneGeometry(14,3.65),waterMat,v(47,2,0),this.world);this.basin.rotation.x=-Math.PI/2;
  for(const x of [39,55,66]){const opening=new T.PointLight('#a6c1b7',14,10,2);opening.position.set(x,5,-7);this.world.add(opening);}
  const glow=new T.PointLight('#f17a38',40,16,2);glow.position.set(29,5,-6);this.world.add(glow);
 }
 merge(fixed);this.finish=new SurfaceFinish();this.finish.apply(this.world,m=>['stone','shell','salt','basalt'].includes(m.name)?'stone':m.name==='bronze'?'bronze':null);this.cameraReady=false;
 }
 resize(){const r=this.canvas.getBoundingClientRect();this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.35));this.renderer.setSize(r.width,r.height,false);this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix();}
 render(s,dt=1/60){if(!this.ready)return;if(this.chapter!==s.chapter)this.build(s.chapter);const c=frontierCamera(s,this.camera.aspect),k=this.cameraReady?1-Math.exp(-dt*3.5):1;this.camFocus.lerp(v(c.x,c.y,0),k);this.cameraAnchor.lerp(v(c.x+c.eyeOffset,c.eyeY,c.z),k);this.camera.position.copy(this.cameraAnchor);this.camera.lookAt(this.camFocus);this.cameraReady=true;
 const q={...s,crouch:Math.max(s.exposure||0,s.pulseHit||0)*.8,walk:(s.bodyTravelX??(s.x-120))/96,boxX:s.stoneX,grabbing:s.grabbing&&s.chapter==='desert'&&Math.abs(s.x-s.stoneX)<70,respawn:s.respawn||0,climb:null,swimming:false};this.actor.update(q,dt);if(s.movingShelter){this.actor.model.rotation.z=-.12;this.actor.root.rotation.y+=s.face*.55;for(const side of ['L','R'])this.actor.ik(side,v(T.MathUtils.clamp(s.x/60+s.face*(side==='L'?.25:.4),s.shelterX/60-.85,s.shelterX/60+.85),1.2,-.4));}else if(s.braking){this.ferry.update(s);for(const side of ['L','R'])this.actor.ik(side,this.ferry.handTarget(side));}else if(s.grabbing&&(s.chapter==='red'||Math.abs(s.x-2600)<65)){for(const side of ['L','R'])this.actor.ik(side,v((s.chapter==='red'?(s.x>2000?2180:530):2600)*U+(side==='L'?-.28:.28),(510-s.y)*U+1.05,s.chapter==='red'?-.29:.35));}if(s.chapter==='desert'&&(s.exposure||0)>0){this.actor.root.updateMatrixWorld(true);const free=this.actor.bones.Rhandbone.getWorldPosition(v()),head=this.actor.bones.head.getWorldPosition(v());head.x+=s.face*.12;head.y-=.06;head.z+=.18;this.actor.ik('R',free.lerp(head,T.MathUtils.smoothstep(s.exposure,0,.35)));}
 this.actor.root.visible=!s.respawn||(s.chapter==='desert'&&s.exposure>=1)||(s.chapter==='red'&&s.pulseHit>=1);this.sun.position.set(s.x*U-6,13,4);this.sun.target.position.set(s.x*U+3,0,-4);
 if(s.chapter==='desert'){this.crust.update(s);this.saltEngine.update(s);this.saltPassage.update(s);this.shutter.position.set(2820*U,(s.shutter||0)*3.5,0);this.saltWeight.position.set(48.3,4.2-s.shutter*3.5,-2.6);const weightTop=4.75-s.shutter*3.5;this.saltWeightCable.scale.y=6.4-weightTop;this.saltWeightCable.position.y=(6.4+weightTop)/2;const cableBottom=2.8+s.shutter*3.5;this.saltCable.scale.y=Math.max(.02,6.4-cableBottom);this.saltCable.position.y=(6.4+cableBottom)/2;this.saltWheel.rotation.z=-(s.shutter||0)*Math.PI*4;this.fossil.position.x=s.stoneX*U;this.fossil.position.y=.79-(s.saltLoad||0)*.11;this.fossil.rotation.z=-(s.stoneX-850)/50;this.bridge.position.set(1490*U,-2.7*(1-s.bridge),0);}
 else{this.ferry.update(s);this.transfer.update(s);this.gallery.update(s);this.cisternWorks.update(s);const y=(510-(560-s.water*220))*U;this.lift.position.set(1035*U,y,0);this.wheel.rotation.z=-s.pressure*Math.PI*5;this.gauge.scale.y=Math.max(.015,s.water);this.gauge.position.y=.3+1.75*s.water;this.reservoirWater.visible=s.water>.005;this.reservoirWater.scale.y=Math.max(.01,s.water*4);this.reservoirWater.position.y=-.15+s.water*2;this.gate.position.set(1870*U,170*U+s.gate*3.5,0);for(const cable of this.cables){const length=8-y-.6;cable.scale.y=length/8;cable.position.y=y+.6+length/2;}this.water.position.y=-1.15+s.water*.25;this.basin.position.y=s.water*3.4-.3;this.drainWheel.rotation.z=-(s.drainOpen?1:s.drain)*Math.PI*3;}
 this.renderer.render(this.scene,this.camera);
 }
}
