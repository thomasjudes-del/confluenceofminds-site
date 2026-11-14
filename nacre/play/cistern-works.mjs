import * as T from './vendor/three/three.module.js';
// Original hydraulic fittings. All motion follows the simulation, including pause.
export class CisternWorks{
 constructor(parent,M,{slab,tube,mesh,merge}){
  this.root=new T.Group();parent.add(this.root);const fixed=new T.Group();this.root.add(fixed);
  const v=(x,y,z=0)=>new T.Vector3(x,y,z),gateX=1870/60;
  // Open inspection well: the bronze float stays behind the walking surface.
  for(const x of [29.15,30.15])slab(.12,4.2,.18,M.bronze,x,4.65,-1.65,fixed);
  slab(1.3,.25,1.1,M.dark,29.65,2.6,-1.65,fixed);
  slab(1.3,.25,1.1,M.dark,29.65,6.8,-1.65,fixed);
  slab(.85,3.8,.12,M.dark,29.65,4.7,-2.08,fixed);
  for(let j=0;j<8;j++)slab(.23,.035,.04,M.salt,30.18,2.9+j*.48,-1.52,fixed);
  tube([[9.9,.1,-1.8],[9.9,-.6,-2.1],[29.65,-.6,-2.1],[29.65,2.8,-1.65]],.12,M.bronze,fixed);
  this.float=new T.Group();this.root.add(this.float);this.float.position.set(29.65,3,-1.65);
  mesh(new T.CylinderGeometry(.39,.39,.52,32),M.bronze,v(0,0,0),this.float);
  for(const y of [-.23,.23]){const rim=mesh(new T.TorusGeometry(.39,.035,8,32),M.salt,v(0,y,0),this.float);rim.rotation.x=Math.PI/2;}
  // Piston and rack transmit the float's lift to the portcullis.
  this.rod=slab(.09,1,.09,M.bronze,29.65,0,-1.65,this.root);
  slab(1.6,.48,.7,M.dark,30.4,7,-1.65,fixed);
  tube([[29.65,6.8,-1.65],[29.65,7.3,-1.65],[gateX,7.3,-1.65],[gateX,9.75,-1.65]],.12,M.bronze,fixed);
  slab(.85,.35,4.5,M.dark,gateX,10.05,0,fixed);
  this.gateRod=slab(.12,1,.12,M.bronze,gateX,0,-1.25,this.root);
  this.pawl=new T.Group();this.pawl.position.set(gateX-.25,6.1,1.65);this.root.add(this.pawl);
  slab(.48,.12,.15,M.salt,-.2,0,0,this.pawl);
  // A low outlet carries the drained basin water into the lower cistern.
  tube([[2180/60,3.3,-.3],[2180/60,.15,-2.1],[40.9,.15,-2.1],[40.9,.25,1.95]],.19,M.bronze,fixed);
  const mouth=mesh(new T.TorusGeometry(.22,.055,8,32),M.bronze,v(40.9,.25,1.95),fixed);mouth.rotation.x=Math.PI/2;
  for(const x of [41.25,54.5]){
   slab(.16,3.5,.2,M.bronze,x,1.4,-1.9,fixed);
   for(let j=0;j<7;j++)slab(.35,.035,.04,M.salt,x, j*.48,-1.77,fixed);
  }
  // Old mineral waterlines on the far retaining wall make the fall measurable.
  slab(13.5,3.8,.3,M.dark,47.7,1.3,-2.15,fixed);
  for(const y of [.15,1.4,2.55])slab(13.5,.045,.035,M.salt,47.7,y,-1.98,fixed);
  const water=new T.MeshStandardMaterial({color:'#a9826e',roughness:.27,metalness:.25,transparent:true,opacity:.55});water.name='cistern-flow';
  this.level=mesh(new T.BoxGeometry(.72,1,.45),water,v(29.65,3,-1.8),this.root);
  this.jet=mesh(new T.CylinderGeometry(.11,.18,1.4,12,1,true),water,v(40.9,-.45,1.95),this.root);
  this.rings=[];
  for(let i=0;i<3;i++){const ring=mesh(new T.TorusGeometry(.28+i*.17,.012,6,36),water,v(40.9,-1.14,1.95),this.root);ring.rotation.x=Math.PI/2;this.rings.push(ring);}
  merge(fixed);merge(this.float);
 }
 update(s){const water=Math.max(0,Math.min(1,s.water)),flow=s.drainOpen?Math.min(1,water/.25):0;
  this.float.position.y=2.95+water*3.5;
  this.level.scale.y=Math.max(.01,water*3.5);this.level.position.y=2.8+water*1.75;
  const length=7-this.float.position.y;this.rod.scale.y=length;this.rod.position.y=this.float.position.y+length/2;
  const gateTop=170/60+s.gate*3.5+3;this.gateRod.scale.y=9.9-gateTop;this.gateRod.position.y=(9.9+gateTop)/2;
  this.pawl.rotation.z=s.gateLatched?-.65:.2;
  const surface=-1.15+water*.25,fall=.25-surface;this.jet.position.y=.25-fall/2;
  this.jet.visible=flow>.01;this.jet.scale.set(flow*(.96+.04*Math.sin(s.time*17)),fall/1.4,flow);
  this.rings.forEach((r,i)=>{r.visible=flow>.01;r.position.y=surface+.012;const k=.7+((s.time*.8+i/3)%1)*.65;r.scale.set(k,k,1);});
 }
}
