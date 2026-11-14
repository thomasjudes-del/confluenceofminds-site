import * as T from './vendor/three/three.module.js';
import {mergeGeometries} from './vendor/three/utils/BufferGeometryUtils.js';
// Original architecture and an original pearl moth, never a HUD marker.
export class ConservatoryLife{
 constructor(scene,M){
  this.entry=new T.Group();this.entry.name='Broken tidal service opening';scene.add(this.entry);
  const add=(geometry,material,x,y,z,parent=this.entry)=>{const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  const inner=new T.MeshStandardMaterial({color:'#071719',roughness:1});
  const throat=add(new T.CylinderGeometry(.94,.78,1.9,40,1,true),M.dark,1.55,2.7,-1.65);throat.rotation.x=Math.PI/2;
  add(new T.CircleGeometry(.79,40),inner,1.55,2.7,-2.61);
  for(const [r,z] of [[1.03,-.68],[.89,-.56],[.82,-1.65]])add(new T.TorusGeometry(r,.055,8,48,Math.PI*1.82),M.brass,1.55,2.7,z).rotation.z=.28;
  const wall=new T.Shape();wall.moveTo(.10,0);wall.lineTo(2.98,0);wall.lineTo(2.98,3.93);wall.lineTo(2.73,4.13);wall.lineTo(.36,4.13);wall.lineTo(.10,3.93);wall.closePath();
  const hole=new T.Path();hole.absarc(1.55,2.7,.99,0,Math.PI*2,true);wall.holes.push(hole);
  const wallGeo=new T.ExtrudeGeometry(wall,{depth:.38,bevelEnabled:true,bevelSize:.045,bevelThickness:.045,bevelSegments:2,steps:1});wallGeo.translate(0,0,-1.1);add(wallGeo,M.stone,0,0,0);
  for(const y of [.5,1.05,1.6,3.83])add(new T.BoxGeometry(2.84,.014,.018),M.dark,1.54,y,-.67);
  const lip=new T.Shape();lip.moveTo(.64,1.83);lip.lineTo(1.94,1.68);lip.lineTo(2.16,1.40);lip.lineTo(1.05,1.51);lip.closePath();
  const g=new T.ExtrudeGeometry(lip,{depth:.64,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:2,steps:1});g.translate(0,0,-1.05);add(g,M.stone,0,0,0);
  for(let i=0;i<5;i++){const stone=add(new T.DodecahedronGeometry(.11+i*.018),M.stone,.45+i*.37,.07,-.75+(i%2)*.3);stone.scale.set(1,.55,.8);stone.rotation.set(i*.7,i*.8,.2);}
  this.entry.updateMatrixWorld(true);const parts=new Map();this.entry.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);const list=parts.get(o.material)||[];list.push(g);parts.set(o.material,list);});this.entry.clear();for(const [material,geos]of parts){add(mergeGeometries(geos,false),material,0,0,0);geos.forEach(g=>g.dispose());}
  this.moth=new T.Group();this.moth.name='Pearl moth';scene.add(this.moth);
  const wingMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.72,metalness:.18,side:T.DoubleSide});
  const bodyMat=new T.MeshStandardMaterial({color:'#9b9b7b',roughness:.94});
  const body=add(new T.SphereGeometry(1,12,8),bodyMat,0,0,0,this.moth);body.scale.set(.11,.035,.035);
  this.wings=[];
  for(const side of [-1,1]){
   const shape=new T.Shape();shape.moveTo(.09,0);shape.bezierCurveTo(.25,.06,.27,.24,.15,.35);shape.bezierCurveTo(.09,.34,-.02,.26,-.01,.17);shape.bezierCurveTo(-.14,.29,-.23,.23,-.19,.15);shape.bezierCurveTo(-.17,.07,-.05,.015,.09,0);
   const outline=new T.ShapeGeometry(shape,14).toNonIndexed(),points=outline.attributes.position,vertices=[];
   // Subdivide the wing surface so pigment bands and veins live inside it, not only on its silhouette.
   for(let i=0;i<points.count;i+=3){const a=new T.Vector3().fromBufferAttribute(points,i),b=new T.Vector3().fromBufferAttribute(points,i+1),c=new T.Vector3().fromBufferAttribute(points,i+2);const sample=(u,v)=>a.clone().addScaledVector(b.clone().sub(a),u/6).addScaledVector(c.clone().sub(a),v/6);for(let u=0;u<6;u++)for(let v=0;v<6-u;v++){vertices.push(...sample(u,v),...sample(u+1,v),...sample(u,v+1));if(u+v<5)vertices.push(...sample(u+1,v),...sample(u+1,v+1),...sample(u,v+1));}}
   outline.dispose();const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();geo.rotateX(side*Math.PI/2);
   const p=geo.attributes.position,colors=[];
   for(let i=0;i<p.count;i++){const x=p.getX(i),z=Math.abs(p.getZ(i));const band=Math.exp(-Math.pow((z-.22)/.025,2));const veins=.08*Math.pow(Math.max(0,Math.cos(Math.atan2(z,x)*18)),12),eye=Math.exp(-((x-.09)**2+(z-.23)**2)/.0007);const color=new T.Color('#b5bca6');color.multiplyScalar(.95-.32*band-veins-.42*eye);colors.push(color.r,color.g,color.b);}
   geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));const wing=add(geo,wingMat,0,0,0,this.moth);this.wings.push({wing,side});
  }
 }
 update(s){
  const t=s.time||0,age=(s.mothStart??-1)<0?-1:t-s.mothStart;
  this.moth.visible=s.gate!==undefined&&age<7;
  if(age<0){this.moth.position.set(s.boxX/60-.22,1.26,.3);this.moth.rotation.y=.45;}
  else if(age<3){const u=age/3,e=u*u*(3-2*u);this.moth.position.set(((s.mothOrigin??s.boxX)/60-.22)*(1-e)+41.1*e,1.26+(2.66-1.26)*e+Math.sin(u*Math.PI)*.8,.3+.65*e+.10*Math.sin(age*8));this.moth.rotation.y=.45*Math.sin(age*2);}
  else{const leave=Math.max(0,age-5);this.moth.position.set(41.1+leave*1.3,2.66+leave*leave*1.6,.95-leave);this.moth.rotation.y=leave*.3;}
  const flying=age>=0&&(age<3||age>5),fold=flying?.35+.8*Math.sin(age*30):.95+.065*Math.sin(t*2.2);
  for(const {wing,side}of this.wings)wing.rotation.x=side*fold;
 }
}
