import * as T from './vendor/three/three.module.js';
// Bounded, local wake history. Never changes the physical simulation or save.
export class ConservatoryWake {
 constructor(scene){
  this.previous=null;this.distance=0;this.cursor=0;this.lastEmission=-Infinity;
  const shape=new T.RingGeometry(.3,.312,40);
  this.rings=Array.from({length:12},()=>{const mesh=new T.Mesh(shape,new T.MeshBasicMaterial({color:'#9bbbb1',side:T.DoubleSide,transparent:true,opacity:0,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.visible=false;scene.add(mesh);return {mesh,born:-Infinity};});
 }
 clear(){for(const r of this.rings){r.born=-Infinity;r.mesh.visible=false;}this.distance=0;this.lastEmission=-Infinity;}
 update(s){
  const t=s.time||0,p=this.previous;
  if(s.respawn||!p||t<p.time||Math.abs(s.x-p.x)>240){this.clear();this.previous={x:s.x,time:t,swimming:s.swimming};return;}
  if(t===p.time)return;
  if(s.swimming&&p.swimming&&!s.paused){
   this.distance+=Math.abs(s.x-p.x)/60;
   if(this.distance>=.38&&t-this.lastEmission>=.12){
    const r=this.rings[this.cursor++%this.rings.length];r.born=t;r.mesh.position.set(s.x/60,-.703,0);this.distance=0;this.lastEmission=t;
   }
  }else this.distance=0;
  for(const r of this.rings){const age=t-r.born;r.mesh.visible=age>=0&&age<2.2;if(r.mesh.visible){const size=.6+age*1.5;r.mesh.scale.set(size,size*.72,1);r.mesh.material.opacity=.17*Math.min(1,age/.12)*Math.pow(1-age/2.2,2);}}
  this.previous={x:s.x,time:t,swimming:s.swimming};
 }
}
