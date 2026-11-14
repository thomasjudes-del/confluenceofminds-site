import * as T from './vendor/three/three.module.js';
// Two guided counterweights, one continuous rope per end, all driven by bridge travel.
export class SaltEngine{
 constructor(parent,M){this.root=new T.Group();parent.add(this.root);this.weights=[];this.ropes=[];this.wheels=[];
 const block=(w,h,d,m,x,y,z,g=this.root)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;};
 this.plate=block(1.8,.12,1.9,M.bronze,1120/60,.045,0);
 for(const x of [22.25,27.42]){
  block(.8,.35,1.1,M.stone,x,-.22,-2.15);for(const dx of [-.26,.26])block(.12,4.6,.15,M.bronze,x+dx,2,-2.15);
  block(.85,.25,.65,M.stone,x,4.35,-2.15);
  const weight=new T.Group();weight.position.set(x,2.8,-2.15);this.root.add(weight);
  const body=new T.Mesh(new T.CylinderGeometry(.31,.4,1.3,24),M.dark);body.castShadow=true;weight.add(body);
  for(const y of [-.48,0,.48]){const ring=new T.Mesh(new T.TorusGeometry(.36,.04,8,32),M.bronze);ring.rotation.x=Math.PI/2;ring.position.y=y;weight.add(ring);}
  this.weights.push(weight);
  const wheel=new T.Group();wheel.position.set(x,4.2,-2.15);this.root.add(wheel);
  const rim=new T.Mesh(new T.TorusGeometry(.31,.05,8,32),M.bronze);wheel.add(rim);for(let i=0;i<6;i++){const a=i*Math.PI/3;const spoke=block(.025,.54,.035,M.bronze,0,0,0,wheel);spoke.rotation.z=a;}this.wheels.push(wheel);
  this.ropes.push([block(.025,1,.025,M.bronze,x-.32,0,-2.15),block(.025,1,.025,M.bronze,x+.32,0,-2.15)]);
 }
 // A protected drive shaft links the weighing plate to the lifting gear.
 block(9,.18,.25,M.dark,23.05,-.24,.95);block(8.9,.07,.08,M.bronze,23.05,-.11,.95);
 for(const x of [18.67,22.25,27.42])block(.23,.42,.40,M.stone,x,-.23,.95);
 this.needle=new T.Group();this.needle.position.set(19.7,.9,.6);this.root.add(this.needle);block(.55,.045,.06,M.salt,.23,0,0,this.needle);
 const dial=new T.Mesh(new T.TorusGeometry(.47,.055,8,40),M.bronze);dial.position.copy(this.needle.position);this.root.add(dial);block(.12,.9,.17,M.dark,19.7,.43,.45);
 }
 update(s){const load=s.saltLoad||0,b=s.bridge;this.plate.position.y=.045-load*.11;this.needle.rotation.z=2.4-load*2.4;
 this.weights.forEach((w,i)=>{w.position.y=2.8-b*2.7;this.wheels[i].rotation.z=b*2.7/.31;const bottom=[-2.7*(1-b),w.position.y+.65];this.ropes[i].forEach((r,j)=>{const h=4.2-bottom[j];r.scale.y=h;r.position.y=bottom[j]+h/2;});});}
}
