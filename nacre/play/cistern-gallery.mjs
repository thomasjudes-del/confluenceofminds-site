import './cistern-pulse.js';
import * as T from './vendor/three/three.module.js';
const P=globalThis.NacreCisternPulse||globalThis.window?.NacreCisternPulse;
export class CisternGallery{
 constructor(parent,M,{slab,tube,mesh,merge}){
  const v=(x,y,z=0)=>new T.Vector3(x,y,z),fixed=new T.Group();parent.add(fixed);this.valves=[];this.clouds=[];this.jets=[];
  const water=new T.MeshStandardMaterial({color:'#adceca',roughness:.28,metalness:.15,transparent:true,opacity:.62});
  tube([[79,5,-3],[99,5,-3]],.27,M.bronze,fixed);
  for(const vent of P.vents){const x=vent.x/60;
   // A pressure vessel behind the route feeds a broad overhead discharge manifold.
   mesh(new T.CylinderGeometry(.85,.85,3.2,28),M.bronze,v(x,3.4,-3.5),fixed);
   for(const y of [2,3.4,4.8]){const ring=mesh(new T.TorusGeometry(.88,.07,8,28),M.dark,v(x,y,-3.5),fixed);ring.rotation.x=Math.PI/2;}
   tube([[x,5,-3.5],[x,6,-3.5],[x,6,-.1]],.18,M.bronze,fixed);
   slab(2.7,.22,2.8,M.bronze,x,5.9,0,fixed);
   for(let k=0;k<6;k++)for(const z of [-.8,.8])mesh(new T.CylinderGeometry(.08,.14,.18,10),M.dark,v(x-1.1+k*.44,5.72,z),fixed);
   for(let k=0;k<12;k++)slab(.1,.025,3.3,M.dark,x-1.3+k*.235,1.84,0,fixed);
   const gauge=new T.Group();gauge.position.set(x-1.15,3.7,-1.7);parent.add(gauge);mesh(new T.CylinderGeometry(.4,.4,.1,28).rotateX(Math.PI/2),M.salt,v(),gauge);
   const needle=slab(.04,.32,.045,M.dark,0,.12,.08,new T.Group());const pivot=needle.parent;gauge.add(pivot);this.valves.push(pivot);
   const cloud=new T.Group();parent.add(cloud);for(let k=0;k<48;k++){const drop=mesh(new T.SphereGeometry(.035,6,4),water,v(),cloud);drop.scale.set(1,3,1);drop.userData.k=k;}this.clouds.push(cloud);
   const jets=new T.Group();parent.add(jets);for(let k=0;k<6;k++)for(const z of [-.8,.8])mesh(new T.CylinderGeometry(.055,.13,3.85,8),water,v(x-1.1+k*.44,3.75,z),jets);this.jets.push(jets);
  }
  // Safe resting bay: a cool flooded recess, independent of the walkable foreground quay.
  slab(9.4,.3,8.4,M.dark,105,1.25,-5,fixed);
  const pool=mesh(new T.PlaneGeometry(9,8).rotateX(-Math.PI/2),water,v(105,1.42,-5),fixed);
  const glow=new T.PointLight('#8ed7cf',45,17,2);glow.position.set(104,4,-4);parent.add(glow);
  merge(fixed);
 }
 update(s){for(let i=0;i<this.clouds.length;i++){const p=P.sample(s,i),cloud=this.clouds[i];this.valves[i].rotation.z=1.1-p.pressure*2.2;cloud.visible=p.warning||p.blast;this.jets[i].visible=p.blast;
  for(const drop of cloud.children){const k=drop.userData.k,t=((s.pulseClock||0)*(p.blast?1.7:.65)+k*.173)%1;drop.position.set(p.x/60+Math.sin(k*3.7)*1.3,5.6-t*(p.blast?3.8:.8),Math.cos(k*2.3)*1.25);drop.scale.setScalar(p.blast?1:.35);drop.scale.y*=2;}
 }}
}
