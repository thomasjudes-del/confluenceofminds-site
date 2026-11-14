import * as T from './vendor/three/three.module.js';
import {mergeGeometries} from './vendor/three/utils/BufferGeometryUtils.js';
const material=(color,roughness=.8,metalness=.1)=>new T.MeshStandardMaterial({color,roughness,metalness});
const add=(parent,g,m,x=0,y=0,z=0)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
function batch(group){group.updateMatrixWorld(true);const sets=new Map();for(const o of [...group.children]){if(!o.isMesh)continue;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.deleteAttribute("uv");g.applyMatrix4(o.matrix);const list=sets.get(o.material)||[];list.push(g);sets.set(o.material,list);group.remove(o);o.geometry.dispose();}for(const [m,gs]of sets){add(group,mergeGeometries(gs,false),m);gs.forEach(g=>g.dispose());}}
// Original survey-keeper costume. The mantle follows the real skeleton, not a billboard.
export class GuardianWardrobe{
 constructor(actor){
  this.actor=actor;const bronze=material('#75664a',.6,.6),dark=material('#222c29'),glass=material('#d0b77b',.3,.2);
  glass.emissive=new T.Color('#dca956');glass.emissiveIntensity=.8;
  this.mask=new T.Group();actor.bones.head.add(this.mask);
  const p=[],idx=[],rows=10,cols=20;
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const a=-Math.PI/2+i/cols*Math.PI,y=-.045+j/rows*.21;const taper=Math.sin(Math.PI*(.12+.76*j/rows));p.push(.022+.09*Math.cos(a)*taper,y,.087*Math.sin(a)*taper);}
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+cols+1;idx.push(a,b,a+1,a+1,b,b+1);}
  const maskG=new T.BufferGeometry();maskG.setAttribute('position',new T.Float32BufferAttribute(p,3));maskG.setIndex(idx);maskG.computeVertexNormals();bronze.side=T.DoubleSide;add(this.mask,maskG,bronze);
  // Dark horizontal visor, smaller than the face shell; respirator below it.
  const visor=add(this.mask,new T.SphereGeometry(1,20,12),dark,.102,.105,0);visor.scale.set(.017,.018,.07);
  for(const z of [-.046,.046]){const ring=add(this.mask,new T.TorusGeometry(.026,.007,8,20),bronze,.10,.015,z);ring.rotation.y=Math.PI/2;const filter=add(this.mask,new T.CylinderGeometry(.022,.022,.014,16),dark,.104,.015,z);filter.rotation.z=Math.PI/2;}
  batch(this.mask);
  this.rows=9;this.cols=32;const positions=new Float32Array((this.rows+1)*(this.cols+1)*3),indices=[];
  for(let j=0;j<this.rows;j++)for(let i=0;i<this.cols;i++){const a=j*(this.cols+1)+i,b=a+this.cols+1;indices.push(a,a+1,b,a+1,b+1,b);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));g.setIndex(indices);
  const cloth=material('#383e31',.94,0);cloth.side=T.DoubleSide;this.mantle=add(actor.root,g,cloth);this.mantle.frustumCulled=false;
  this.lantern=new T.Group();actor.root.add(this.lantern);
  const points=[new T.Vector2(0,-.25),new T.Vector2(.065,-.24),new T.Vector2(.078,-.21),new T.Vector2(.075,-.09),new T.Vector2(.055,-.065),new T.Vector2(0,-.06)];
  add(this.lantern,new T.LatheGeometry(points,20),glass);
  for(const y of [-.24,-.07])add(this.lantern,new T.CylinderGeometry(.083,.083,.022,20),bronze,0,y,0);
  const handle=add(this.lantern,new T.TorusGeometry(.045,.007,6,20),bronze,0,-.025,0);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;add(this.lantern,new T.CylinderGeometry(.006,.006,.17,6),bronze,.078*Math.cos(a),-.155,.078*Math.sin(a));}
  batch(this.lantern);
  this.light=new T.PointLight('#e4bc77',1.3,2.4,2);this.light.position.y=-.15;this.lantern.add(this.light);
 }
 update(s){const a=this.actor;a.root.updateMatrixWorld(true);const local=name=>a.root.worldToLocal(a.bones[name].getWorldPosition(new T.Vector3()));
  const chest=local('chest'),hip=local('pelvis'),phase=a.actions.run.time/.75*Math.PI*2,speed=Math.min(1,Math.abs(s.vx)/378),p=this.mantle.geometry.attributes.position;
  for(let j=0;j<=this.rows;j++){const t=j/this.rows,y=T.MathUtils.lerp(chest.y+.07,hip.y-.34,t),radius=t<.22?T.MathUtils.lerp(.10,.28,t/.22):T.MathUtils.lerp(.28,.33,(t-.22)/.78);
   for(let i=0;i<=this.cols;i++){const angle=.63+i/this.cols*(Math.PI*2-1.26),fold=1+.035*Math.sin(angle*9),trail=t*t*speed;
    p.setXYZ(j*(this.cols+1)+i,T.MathUtils.lerp(chest.x,hip.x,t)+radius*.65*Math.cos(angle)*fold-.07*trail,y+.018*trail*Math.sin(phase+angle*2),T.MathUtils.lerp(chest.z,hip.z,t)+radius*Math.sin(angle)*fold+.018*trail*Math.sin(phase));
   }
  }p.needsUpdate=true;this.mantle.geometry.computeVertexNormals();
  this.lantern.position.copy(local('Rhandbone'));this.lantern.rotation.z=.08*speed*Math.sin(phase-.5);
 }
}
