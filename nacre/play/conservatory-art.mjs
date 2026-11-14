import {witnessPose,witnessShelter} from './witness-scene.mjs';
import {captureView,restoreCapture,captureBody} from './capture-pose.mjs';
import * as T from './vendor/three/three.module.js';
import {ConservatoryLight} from './conservatory-light.mjs';
import {livingPose,restoreLivingPose} from './living-pose.mjs';
import {ConservatoryBloom} from './conservatory-bloom.mjs';
import {ConservatoryLife} from './conservatory-life.mjs';
import {turnStep} from './turn-3d.mjs';
import {SurfaceFinish} from './surface-finish.mjs';
import {GuardianWardrobe} from './guardian-3d.mjs';
import {GLTFLoader} from './vendor/three/loaders/GLTFLoader.js';
import {clone} from './vendor/three/utils/SkeletonUtils.js';
import {Reflector} from './vendor/three/objects/Reflector.js';
import {mergeGeometries} from './vendor/three/utils/BufferGeometryUtils.js';
const V=window.NacreConservatoryView,L=window.NacreConvoy,U=V.SCALE;
const v=(x,y,z=0)=>new T.Vector3(x,y,z),mix=(a,b,t)=>a+(b-a)*t;
function mat(color,roughness=.65,metalness=.15){return new T.MeshStandardMaterial({color,roughness,metalness});}
function mesh(g,m,p,parent){const a=new T.Mesh(g,m);if(p)a.position.copy(p);a.castShadow=true;a.receiveShadow=true;if(parent)parent.add(a);return a;}
function box(w,h,d,m,x=0,y=0,z=0,parent){return mesh(new T.BoxGeometry(w,h,d),m,v(x,y,z),parent);}
function tube(points,r,m,parent){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>v(...p))),Math.max(10,points.length*5),r,6,false),m,null,parent);}
function oval(rx,ry,rz,m,x,y,z,parent){const o=mesh(new T.SphereGeometry(1,20,14),m,v(x,y,z),parent);o.scale.set(rx,ry,rz);return o;}
function rib(points,width,depth,m,parent){const s=new T.Shape();s.moveTo(...points[0]);for(const p of points.slice(1))s.lineTo(...p);s.closePath();const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:width,bevelThickness:width});g.translate(0,0,-depth/2);return mesh(g,m,null,parent);}
function condense(group){group.updateMatrixWorld(true);const buckets=new Map(),inv=group.matrixWorld.clone().invert();group.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(inv.clone().multiply(o.matrixWorld));const list=buckets.get(o.material)||[];list.push(g);buckets.set(o.material,list);});group.clear();for(const[m,gs]of buckets){mesh(mergeGeometries(gs,false),m,null,group);gs.forEach(g=>g.dispose());}return group;}
function makeCrate(materials){const g=new T.Group(),{dark,brass,stone}=materials;
 box(1.73,1.16,1.22,dark,0,.6,0,g);
 for(const z of [-.63,.63]){box(1.58,.96,.05,stone,0,.6,z,g);for(const x of [-.77,.77])box(.065,1.18,.075,brass,x,.6,z,g);for(const y of [.08,1.12])box(1.62,.075,.08,brass,0,y,z,g);
 for(let i=-2;i<=2;i++)tube([[i*.24-.15,.21,z*1.04],[i*.24,.43,z*1.06],[i*.24+.1,.8,z*1.06],[i*.24-.02,1.03,z*1.04]],.018,brass,g);
 const ring=mesh(new T.TorusGeometry(.13,.022,6,20),brass,v(0,.6,z*1.06),g);ring.scale.y=.68;
 }
 for(const x of [-.69,.69])for(const z of [-.49,.49])oval(.1,.08,.1,brass,x,.04,z,g);
 box(1.8,.09,1.3,brass,0,1.16,0,g);return condense(g);
}
function makeBalance(M){
 const g=new T.Group(),leaf=new T.Group(),weight=new T.Group(),plate=new T.Group(),gx=2770/60,px=2538/60;
 // Stone jambs, bronze guides, chamfered solid leaf and sculpted counterweight.
 for(const z of [-1.42,1.42]){box(.5,3.5,.36,M.stone,gx,4.75,z,g);box(.16,6.1,.13,M.brass,gx-.28,6.05,z,g);box(.7,.22,.6,M.brass,gx,3.12,z,g);}
 box(.6,.3,3.4,M.stone,gx,6.45,0,g);box(.66,.09,3.48,M.brass,gx,6.65,0,g);
 rib([[-.22,0],[-.26,.2],[-.26,2.6],[-.15,2.82],[.15,2.82],[.26,2.6],[.26,.2],[.22,0]],.035,2.55,M.dark,leaf);
 for(const z of [-1.3,1.3]){box(.57,.12,.12,M.brass,0,.12,z,leaf);box(.57,.12,.12,M.brass,0,2.65,z,leaf);}
 for(const y of [.45,1.05,1.65,2.25]){const boss=mesh(new T.TorusGeometry(.19,.025,8,24),M.brass,v(-.3,y,.0),leaf);boss.rotation.y=Math.PI/2;}
 leaf.position.set(gx,3,0);g.add(condense(leaf));
 oval(.38,.75,.4,M.stone,0,0,0,weight);for(const y of [-.45,.45]){const ring=mesh(new T.TorusGeometry(.34,.045,8,24),M.brass,v(0,y,0),weight);ring.rotation.x=Math.PI/2;}weight.position.set(gx+1,5.5,-1.2);g.add(condense(weight));
 box(1.95,.12,1.55,M.brass,0,0,0,plate);box(1.7,.13,1.3,M.dark,0,.015,0,plate);plate.position.set(px,.03,0);g.add(condense(plate));
 tube([[px,0,-.9],[px,6.3,-.9],[gx,6.3,-.9],[gx+1,6.3,-1.2]],.026,M.brass,g);
 for(const x of [px,gx,gx+1]){const wheel=mesh(new T.TorusGeometry(.22,.045,8,28),M.brass,v(x,6.3,-.9),g);wheel.rotation.y=Math.PI/2;}
 const cable=box(.035,2,.035,M.brass,gx+1,5.5,-1.2,g);
 // Mechanical load dial: no text, two physical stops and a moving ivory needle.
 const dial=new T.Group(),needle=new T.Group(),ivory=mat('#c7bea0',.55,.18);
 const backing=mesh(new T.CylinderGeometry(.48,.48,.12,48),M.dark,v(),dial);backing.rotation.x=Math.PI/2;
 mesh(new T.TorusGeometry(.45,.045,8,48),M.brass,v(0,0,.08),dial);
 for(let i=0;i<9;i++){const a=Math.PI*.8-i*Math.PI*.2;const tick=box(.035,.09,.025,i===8?ivory:M.brass,Math.cos(a)*.35,Math.sin(a)*.35,.08,dial);tick.rotation.z=a-Math.PI/2;}
 box(.34,.045,.035,ivory,.15,0,.13,needle);oval(.07,.07,.04,M.brass,0,0,.13,needle);dial.add(needle);
 dial.position.set(px-1.2,2.15,.95);g.add(dial);
 tube([[px-1.2,.04,.9],[px-1.2,1.65,.9],[px-1.2,2.15,.9]],.045,M.brass,g);
 const lamp=new T.PointLight('#e8c78f',5,3.5,2);lamp.position.set(px-.8,2.65,1.5);g.add(lamp);
 return{root:g,leaf,weight,plate,cable,needle,lamp};
}
function makeVehicle(M){const g=new T.Group();
 rib([[-3.7,.55],[-3.2,.12],[2.8,.12],[3.7,.7],[3.05,1.05],[-3.2,1.05]],.06,1.75,M.dark,g);
 oval(2.95,1.1,.83,M.dark,0,1.45,0,g);
 for(const x of [-2.4,-1.45,-.5,.5,1.45,2.4]){const r=mesh(new T.TorusGeometry(1,.055,6,24),M.brass,v(x,1.3,0),g);r.rotation.y=Math.PI/2;r.scale.set(1,.84,1);}
 const glass=mat('#28413d',.18,.45);oval(2.85,.94,.73,glass,0,1.52,0,g);
 for(const x of [-2.4,2.4])for(const z of [-.92,.92]){let w=mesh(new T.TorusGeometry(.43,.13,8,20),M.dark,v(x,.32,z),g);const rim=mesh(new T.TorusGeometry(.28,.035,6,20),M.brass,v(x,.32,z*1.02),g);}
 for(const z of [-.67,.67]){box(.18,.28,.19,M.glow,3.15,1,z,g);tube([[3.2,1.05,z],[3.45,.86,z],[3.6,.6,z]],.07,M.brass,g);}
 for(let i=0;i<9;i++)tube([[-2.7+i*.65,1.98,-.7],[-2.6+i*.65,2.44,0],[-2.7+i*.65,1.98,.7]],.035,M.brass,g);
 return condense(g);
}
function cover(a,b,top,M){const g=new T.Group(),w=(b-a)*U,h=(510-top)*U;
 rib([[-w/2,0],[-w/2,h-.2],[-w/2+.18,h],[w/2-.18,h],[w/2,h-.2],[w/2,0]],.05,.4,M.stone,g);
 for(const y of [.12,h-.1])box(w+.12,.12,.51,M.brass,0,y,0,g);
 for(let x=-w/2+.28;x<w/2;x+=.42)tube([[x,.22,.23],[x+.13,h*.48,.3],[x,h-.16,.23]],.022,M.brass,g);
 for(const x of [-w/2+.18,w/2-.18])oval(.2,.11,.31,M.stone,x,h,.0,g);
 g.position.set((a+b)*U/2,0,.75);return condense(g);
}
export class Actor{
 constructor(gltf,guardian=false){this.root=new T.Group();this.model=clone(gltf.scene);this.root.add(this.model);this.mixer=new T.AnimationMixer(this.model);this.actions={};this.bones={};this.turn=0;this.pose='idle';
 this.model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;if(guardian){o.material=o.material.clone();if(/coat|tunic|cloth|wool|piping|linen/i.test(o.material.name))o.material.color.set('#40392c');if(/skin/i.test(o.material.name))o.material.color.set('#8b7a57');}}if(o.isBone)this.bones[o.name]=o;});
 for(const clip of gltf.animations){const a=this.mixer.clipAction(clip);a.enabled=true;a.setEffectiveWeight(clip.name==='idle'?1:0);if(clip.name==='jump'){a.setLoop(T.LoopOnce,1);a.clampWhenFinished=true;}a.play();this.actions[clip.name]=a;}
 if(guardian){this.root.scale.setScalar(1.13);this.wardrobe=new GuardianWardrobe(this);}
 }
 ik(side,target,leg=false){const upper=this.bones[side+(leg?'thigh':'upperarm')],lower=this.bones[side+(leg?'shin':'forearm')],hand=this.bones[side+(leg?'foot':'handbone')];if(!upper||!lower||!hand)return;
 this.root.updateMatrixWorld(true);const a=upper.getWorldPosition(v()),b=lower.getWorldPosition(v()),c=hand.getWorldPosition(v());const l1=a.distanceTo(b),l2=b.distanceTo(c);const d=target.clone().sub(a),len=T.MathUtils.clamp(d.length(),.05,l1+l2-.005);d.normalize();
 const pole=(leg?v(1,.1,side==='L'?-.12:.12):v(-.25,-1,side==='L'?-.5:.5)).applyAxisAngle(v(0,1,0),this.turn),perp=pole.addScaledVector(d,-pole.dot(d)).normalize();const t=(l1*l1-l2*l2+len*len)/(2*len),elbow=a.clone().addScaledVector(d,t).addScaledVector(perp,Math.sqrt(Math.max(0,l1*l1-t*t)));
 const aim=(bone,child,goal)=>{this.root.updateMatrixWorld(true);const p=bone.getWorldPosition(v()),dir=child.getWorldPosition(v()).sub(p).normalize(),to=goal.clone().sub(p).normalize(),q=new T.Quaternion().setFromUnitVectors(dir,to).multiply(bone.getWorldQuaternion(new T.Quaternion()));bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));};
 aim(upper,lower,elbow);aim(lower,hand,target);
 }
 update(s,dt){restoreCapture(this);const p=V.point(s.x,s.y);this.root.position.set(p.x,p.y,0);const turning=turnStep(this.turn,this.turnVelocity||0,s.face,dt);this.turn=turning.angle;this.turnVelocity=turning.velocity;this.root.rotation.y=this.turn;
 const bankReach=s.swimming?T.MathUtils.smoothstep(s.x,L.C.bank-110,L.C.bank-25)*Math.max(0,Math.cos(this.turn)):0;
 let pose=V.pose(s);let name=pose==='climb'?(s.climb.t<.36?'crouch':'idle'):pose==='push'?(Math.abs(s.vx)>15?'run':'idle'):pose==='swim'?(this.actions.swim?'swim':'run'):pose; if(pose==='crouch'&&Math.abs(s.vx)>8&&this.actions.crouchwalk)name='crouchwalk'; if(!this.actions[name])name='idle';
 const entry=s.entrance&&s.entranceLand>=0&&!s.entranceControlled?1-T.MathUtils.smoothstep(s.entranceLand,.12,.7):0;
 if(name==='jump'&&this.lastAction!=='jump')this.actions.jump.reset().play();this.lastAction=name;
 for(const [n,a]of Object.entries(this.actions)){a.setEffectiveWeight(mix(a.getEffectiveWeight(),bankReach>0?(n==='swim'?1-bankReach:n==='crouch'?bankReach:0):(entry>0?(n==='crouch'?entry:n===name?1-entry:0):(n===name?1:0)),1-Math.exp(-dt*16)));a.setEffectiveTimeScale(n==='run'?Math.max(.25,Math.abs(s.vx)*U/3.56754):n==='crouchwalk'?Math.abs(s.vx)*U/1.55:1);}
 restoreLivingPose(this);this.mixer.update(dt);
 if(!this.wardrobe)livingPose(this,s,dt,pose);
 if(s.swimming){this.model.rotation.z=this.actions.swim?0:-L.swimAngle(s)*.8;this.model.position.y=this.actions.swim?-.35*(1-bankReach):.38;}else{this.model.rotation.z=0;this.model.position.y=0;}
 // Prepare the shore grip while still in the water; the existing climb then keeps it planted.
 if(bankReach>0){for(const side of ['L','R']){this.root.updateMatrixWorld(true);const free=this.bones[side+'handbone'].getWorldPosition(v()),contact=v(L.C.bank*U,.035,side==='L'?-.19:.19);this.ik(side,free.lerp(contact,bankReach));}}
 if(pose==='push'){this.model.rotation.z=-.12;for(const side of ['L','R'])this.ik(side,v((s.boxX-s.face*(L.C.boxHalf+2))*U,1.05,side==='L'?-.19:.19));}
 if(s.climb){const top=(510-s.climb.top)*U,release=T.MathUtils.smoothstep(s.climb.t,.34,.54);this.root.updateMatrixWorld(true);const shoulder=this.bones.Lupperarm.getWorldPosition(v());const supportHeight=.29+(s.climb.edge===L.C.bank?.24*T.MathUtils.smoothstep(s.climb.t,.04,.30):0);this.model.position.y=-Math.max(0,shoulder.y-top-supportHeight)*(1-release);if(release<1)for(const side of ['L','R']){this.root.updateMatrixWorld(true);const free=this.bones[side+'handbone'].getWorldPosition(v()),contact=v(s.climb.edge*U,top+.035,side==='L'?-.19:.19);this.ik(side,free.lerp(contact,1-release));}}
 // Lead foot gathers above the shore, then bears weight before the hands release.
 if(s.climb&&s.climb.edge===L.C.bank){
  const t=s.climb.t,w=T.MathUtils.smoothstep(t,.07,.23)*(1-T.MathUtils.smoothstep(t,.39,.54));
  this.root.updateMatrixWorld(true);
  const foot=this.bones.Lfoot,free=foot.getWorldPosition(v()),footRotation=foot.getWorldQuaternion(new T.Quaternion());
  const lift=.19*(1-T.MathUtils.smoothstep(t,.19,.30));
  const target=free.lerp(v(s.climb.edge*U+.25,.105+lift,-.12),w);
  target.x=Math.min(target.x,s.climb.edge*U-.08+.33*T.MathUtils.smoothstep(t,.18,.27)+(t>.39?T.MathUtils.smoothstep(t,.39,.54):0));
  if(t>=.30)target.y=Math.max(.085,target.y);
  this.ik('L',target,true);
  this.root.updateMatrixWorld(true);
  foot.quaternion.copy(foot.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(footRotation));
 }
 if(this.wardrobe){
  const watch=s.watching||0;if(watch>0){this.root.updateMatrixWorld(true);const hand=this.bones.Rhandbone.getWorldPosition(v()),target=this.root.localToWorld(v(.32,1.21,.24));this.ik('R',hand.lerp(target,watch));}
  this.wardrobe.update(s);
 }
 this.pose=pose;
 }
}
export class ConservatoryArt{
 constructor(canvas,options={}){this.canvas=canvas;this.options=options;this.scene=new T.Scene();this.scene.background=new T.Color('#142d30');this.scene.fog=new T.FogExp2('#193637',.026);this.camera=new T.PerspectiveCamera(36,16/9,.1,180);this.cameraReady=false;this.camFocus=v();this.cameraAnchor=v();this.dpr=1;this.ready=false;this.fail=null;
 this.renderer=options.renderer||new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.12;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
 this.M={dark:mat('#263e39',.72,.25),brass:mat('#756745',.65,.55),stone:mat('#607568',.83,.08),glow:new T.MeshStandardMaterial({color:'#ffe5ad',emissive:'#f6bc68',emissiveIntensity:2})};
 this.ambient=new T.HemisphereLight('#a9c9c7','#121e25',.64);this.scene.add(this.ambient);this.sun=new T.DirectionalLight('#ffe5b9',2.6);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-18,right:18,top:16,bottom:-16,near:1,far:65});this.sun.shadow.bias=-.00015;this.sun.shadow.normalBias=.025;this.sun.shadow.radius=3;this.scene.add(this.sun,this.sun.target);
 this.rim=new T.DirectionalLight('#72c6cc',1.7);this.rim.position.set(-15,7,-13);this.scene.add(this.rim);
 this.fill=new T.DirectionalLight('#b1cbc6',.65);this.scene.add(this.fill,this.fill.target);
 this.lanterns=[new T.PointLight('#efb36c',24,12,2),new T.PointLight('#efb36c',24,12,2)];this.lanterns.forEach(l=>this.scene.add(l));
 // A submerged service viaduct grounds the distant convoy in the architecture.
 const rails=new T.Group();for(const z of [-6.23,-4.37]){box(134,.14,.14,this.M.brass,64,1.26,z,rails);box(134,.24,.22,this.M.dark,64,1.05,z,rails);}
 for(let x=-2;x<132;x+=4){box(.16,.18,2.2,this.M.dark,x,1.13,-5.3,rails);for(const z of [-6.23,-4.37])box(.19,3.1,.19,this.M.dark,x,-.42,z,rails);}this.scene.add(condense(rails));
 this.witnessShelter=witnessShelter(this.scene,this.M);
 this.box=makeCrate(this.M);this.scene.add(this.box);this.balance=makeBalance(this.M);this.scene.add(this.balance.root);
 for(const c of L.covers)this.scene.add(cover(c.a,c.b,c.top,this.M));
 this.refuge=new T.Group();const rw=(L.C.refugeExit-L.C.refuge)*U;
 rib([[-rw/2,1.38],[-rw/2+.14,1.35],[rw/2-.14,1.35],[rw/2,1.38],[rw/2,1.64],[rw/2-.16,1.71],[-rw/2+.16,1.71],[-rw/2,1.64]],.025,2.8,this.M.dark,this.refuge);for(let x=-rw/2;x<=rw/2;x+=.6){box(.055,.11,2.9,this.M.brass,x,1.76,-.1,this.refuge);}for(const x of [-rw/2,rw/2]){for(const z of [-1.2,1.1])box(.2,1.55,.2,this.M.stone,x,.7,z,this.refuge);}this.refuge.position.set((L.C.refuge+L.C.refugeExit)*U/2,0,0);this.scene.add(condense(this.refuge));
 // Fixed maintenance lights belong to the shelter, not to the player.
 // Low lamps reveal the crouched silhouette beneath the roof without lifting the whole scene.
 this.shelterLights=[];const shelterX=(L.C.refuge+L.C.refugeExit)*U/2;
 const fixtures=new T.Group(),pearl=new T.MeshStandardMaterial({color:'#a8c6bb',emissive:'#9cbeae',emissiveIntensity:.65,roughness:.4,metalness:.15});
 for(const offset of [-2.2,2.2]){
  const x=shelterX+offset;
  box(.62,.20,.18,this.M.dark,x,1.29,1.05,fixtures);
  box(.52,.10,.035,pearl,x,1.24,.94,fixtures);
  for(const dx of [-.3,.3])box(.04,.22,.23,this.M.brass,x+dx,1.28,1.04,fixtures);
  tube([[x,1.36,1.05],[x,1.59,1.05],[x+.5,1.61,1.05]],.018,this.M.brass,fixtures);
  const light=new T.PointLight('#b0d2c1',9,5.5,2);light.position.set(x,1.16,.85);light.castShadow=false;this.shelterLights.push(light);this.scene.add(light);
 }
 this.shelterFixtures=condense(fixtures);this.scene.add(this.shelterFixtures);
 this.vehicles=[makeVehicle(this.M),makeVehicle(this.M),makeVehicle(this.M)];this.vehicles.forEach(g=>this.scene.add(g));
 this.scan=this.makeBeam();this.patrolBeam=this.makeBeam();this.chaseBeam=this.makeBeam();
 this.water=new Reflector(new T.PlaneGeometry(160,90),{color:0x496b66,textureWidth:512,textureHeight:512,clipBias:.003});this.water.rotation.x=-Math.PI/2;this.water.position.set(64,-.72,-7);this.scene.add(this.water);this.water.material.uniforms.time={value:0};
 this.water.material.fragmentShader=this.water.material.fragmentShader.replace('uniform vec3 color;','uniform vec3 color; uniform float time;').replace('vec4 base = texture2DProj( tDiffuse, vUv );',`vec4 uv=vUv;uv.x+=sin(vUv.y*19.0+time*.8)*.0009*vUv.w;uv.y+=sin(vUv.x*41.0-time*.5)*.0006*vUv.w;vec4 base=texture2DProj(tDiffuse,uv);base.rgb=mix(base.rgb,vec3(.06,.16,.16),.32);`);
 const dustG=new T.BufferGeometry(),dust=new Float32Array(750*3);let rng=17;const rand=()=>{rng=(rng*16807)%2147483647;return rng/2147483647;};for(let i=0;i<dust.length;i+=3){dust[i]=rand()*130;dust[i+1]=rand()*10;dust[i+2]=rand()*25-20;}dustG.setAttribute('position',new T.BufferAttribute(dust,3));this.dust=new T.Points(dustG,new T.PointsMaterial({color:'#e1d0a8',size:.025,transparent:true,opacity:.3,depthWrite:false}));this.scene.add(this.dust);
 this.ripples=[];for(let i=0;i<4;i++){const r=mesh(new T.RingGeometry(.3,.32,48),new T.MeshBasicMaterial({color:'#9bbbb1',side:T.DoubleSide,transparent:true,opacity:0,depthWrite:false}),v(),this.scene);r.rotation.x=-Math.PI/2;this.ripples.push(r);}
 this.bloom=new ConservatoryBloom(this.scene);this.life=new ConservatoryLife(this.scene,this.M);this.lighting=new ConservatoryLight(this);this.resize();this.loading=this.load();
 }
 async load(){const loader=new GLTFLoader();try{const [world,actor]=this.options.assets||await Promise.all([loader.loadAsync('assets3d/conservatory.glb'),loader.loadAsync('assets3d/traveller.glb')]);world.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material.transparent)o.castShadow=false;}});this.world=world.scene;this.scene.add(world.scene);this.finish=new SurfaceFinish();this.finish.apply(world.scene,m=>/limestone|basalt|stone/i.test(m.name)?'stone':/bronze/i.test(m.name)?'bronze':null);for(const part of [this.box,this.balance.root,this.refuge,this.shelterFixtures,...this.vehicles])this.finish.apply(part,m=>m===this.M.stone?'stone':m===this.M.brass?'bronze':null);this.actor=new Actor(actor);this.guard=new Actor(actor,true);this.scene.add(this.actor.root,this.guard.root);this.ready=true;}catch(e){this.fail=e;throw e;}}
 makeBeam(){const shader=new T.ShaderMaterial({uniforms:{color:{value:new T.Color('#e7c987')},opacity:{value:.14}},vertexShader:'varying vec2 uv0; void main(){uv0=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 color;uniform float opacity;varying vec2 uv0;void main(){float edge=pow(sin(uv0.x*3.14159),1.3);gl_FragColor=vec4(color,opacity*edge*(.45+.55*uv0.y));}',transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(9),3));g.setAttribute('uv',new T.Float32BufferAttribute([.5,1,0,0,1,0],2));const m=new T.Mesh(g,shader);m.frustumCulled=false;this.scene.add(m);const spot=new T.SpotLight('#ffdfa1',60,20,.5,.8,1.5);this.scene.add(spot,spot.target);return{mesh:m,spot};}
 beam(b,source,left,right,active){b.mesh.visible=b.spot.visible=active;if(!active)return;const a=b.mesh.geometry.attributes.position;a.setXYZ(0,source.x,source.y,.25);a.setXYZ(1,left,.025,.25);a.setXYZ(2,right,.025,.25);a.needsUpdate=true;b.spot.position.set(source.x,source.y,1);b.spot.target.position.set((left+right)/2,0,0);}
 resize(){const r=this.canvas.getBoundingClientRect();const w=Math.max(1,r.width),h=Math.max(1,r.height);this.dpr=Math.min(devicePixelRatio||1,1.65);if(w<1000)this.dpr=Math.min(this.dpr,1.35);this.renderer.setPixelRatio(this.dpr);this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 render(s,dt=1/60,mode='play'){if(!this.ready)return;if(mode==='intro')s={...s,entrance:false,y:510,onGround:true,vx:0};const t=s.time??0,cp=V.camera(s,this.camera.aspect),q=V.point(s.x,s.y);if(s.capture){cp.x=q.x+.3;cp.y=q.y+1;cp.z=11.8;cp.eyeY=q.y+3;}const force=!this.cameraReady||Math.abs(this.camFocus.x-cp.x)>15;const k=force?1:1-Math.exp(-dt*3.2);this.camFocus.lerp(v(cp.x,cp.y,0),k);this.cameraAnchor.lerp(v(cp.x+cp.eyeOffset,cp.eyeY,cp.z),k);this.camera.position.copy(this.cameraAnchor);this.camera.lookAt(this.camFocus);this.cameraReady=true;
 this.sun.position.set(q.x-8,16,-7);this.sun.target.position.set(q.x+3,0,-2);this.fill.position.set(q.x+4,5,7);this.fill.target.position.set(q.x,1,0);this.rim.position.set(q.x-6,7,-10);this.rim.target.position.set(q.x,1,0);this.rim.target.updateMatrixWorld();const lamps=[12,36,59,86,111].sort((a,b)=>Math.abs(q.x-a)-Math.abs(q.x-b));this.lanterns.forEach((l,i)=>l.position.set(lamps[i],5.7,-8.4));
 this.lighting.update(s);this.life.update(s);this.bloom.update(s);
 this.balance.root.visible=s.gate!==undefined;if(this.balance.root.visible){this.balance.leaf.position.y=3+s.gate*2.9;this.balance.weight.position.y=5.5-s.gate*2;this.balance.plate.position.y=.03-(s.platePressure||0)*.045;this.balance.needle.rotation.z=Math.PI*.8-(s.platePressure||0)*Math.PI*1.6;const length=.8+s.gate*2;this.balance.cable.scale.y=length/2;this.balance.cable.position.y=6.3-length/2;}this.actor.update(captureView(s)?.body||s,dt);captureBody(this.actor,captureView(s));this.box.position.set(s.boxX*U,0,0);this.actor.root.visible=true;
 const [arrival,chaser,patrol]=this.vehicles;arrival.visible=s.vehicleTime>=0&&s.chaseTime<0;arrival.position.set((s.vehicleTime<3?730+s.vehicleTime*480:2170+Math.max(0,s.vehicleTime-12)*120)*U,1.25,-5.3);
 chaser.visible=s.chaseTime>=0&&s.x<5250;chaser.position.set((Math.min(s.chaser,L.C.refuge-120)-245)*U,0,-.35);
 const p=L.patrol(s);patrol.visible=s.escaped&&s.inspection<14;patrol.position.set(p.vehicleX*U,1.25,-5.3);patrol.rotation.y=Math.PI;
 const b=L.beam(s);this.beam(this.scan,{x:b.source.x*U,y:(510-b.source.y)*U},(b.target-b.width)*U,(b.target+b.width)*U,b.active);this.beam(this.patrolBeam,{x:p.source.x*U,y:(510-p.source.y)*U},p.left*U,p.right*U,p.active);this.beam(this.chaseBeam,{x:s.chaser*U,y:1.2},(s.chaser+100)*U,(s.chaser+620)*U,s.chaseTime>=0&&!s.escaped);
 const cap=captureView(s),w=s.witnessStart>=0?s.time-s.witnessStart:-1,wp=witnessPose(w);
 this.guard.root.visible=!!cap?.guardVisible||s.hunterTime>=0||wp.visible;
 if(cap?.guardVisible){this.guard.update({...cap.body,x:cap.guardX,face:cap.guardFace,crouch:0,capture:null,vx:cap.contact?0:-cap.guardFace*140,watching:0},dt);if(cap.contact>0){this.actor.root.updateMatrixWorld(true);this.guard.root.updateMatrixWorld(true);const target=this.actor.bones.Rupperarm.getWorldPosition(v()),free=this.guard.bones.Lhandbone.getWorldPosition(v());this.guard.ik('L',free.lerp(target,cap.contact));}}
 else if(s.hunterTime>=0)this.guard.update(L.pursuerPose(s),dt);
 else if(wp.visible){this.guard.update({...s,...wp,y:510,vy:0,onGround:true,crouch:0,climb:null,swimming:false,grabbing:false,entrance:false,capture:null},dt);this.guard.root.position.z=-8.3;this.guard.root.position.y=1.25;}

 this.water.material.uniforms.time.value=t;this.dust.rotation.x=Math.sin(t*.025)*.002;
 for(let i=0;i<4;i++){const r=this.ripples[i],age=s.splashAge-i*.17,swim=s.swimming&&i===0;r.visible=(age>0&&age<2)||swim;if(r.visible){const n=swim?(.6+Math.sin(t*4)*.08):.2+age*2;r.position.set((swim?s.x:s.splashX)*U,-.705,0);r.scale.set(n,n*.7,1);r.material.opacity=swim?.14:Math.max(0,.28*(1-age/2));}}
 this.renderer.render(this.scene,this.camera);this.stats={calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,pose:this.actor.pose,ready:true};
 }
}
