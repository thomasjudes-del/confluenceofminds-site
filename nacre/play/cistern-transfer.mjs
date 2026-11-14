/* Catch the diverted water on the moving receiver; the float opens a hydraulic gate. */
import './ferry-motion.js';
import * as T from './vendor/three/three.module.js';
const F=globalThis.NacreFerryMotion||globalThis.window?.NacreFerryMotion;
export class CisternTransfer{
 constructor(parent,deck,M,{slab,tube,mesh,merge}){
  const v=(x,y,z=0)=>new T.Vector3(x,y,z),fixed=new T.Group();parent.add(fixed);
  const r=F.receiver,g=F.exitGate,x=r.streamX/60,gateX=g.x/60,base=110/60;
  // Open receiver behind the path: a visible water column, float, rim and discharge.
  this.tank=new T.Group();this.tank.position.set(0,.18,-1.5);deck.add(this.tank);
  slab(2.4,.15,.86,M.bronze,0,0,0,this.tank);
  for(const side of [-1,1])slab(.12,1.35,.86,M.bronze,side*1.14,.63,0,this.tank);
  slab(2.3,1.35,.10,M.dark,0,.63,-.38,this.tank);
  tube([[-1.18,1.35,.38],[-1.18,1.35,-.38],[1.18,1.35,-.38],[1.18,1.35,.38]],.065,M.bronze,this.tank);
  for(const y of [.3,.6,.9,1.2])slab(.23,.035,.06,M.salt,-.97,y,.42,this.tank);
  const waterMat=new T.MeshStandardMaterial({color:'#76a6a6',roughness:.24,metalness:.25});
  const glass=new T.MeshStandardMaterial({color:'#abc5c1',transparent:true,opacity:.12,roughness:.18,depthWrite:false});
  mesh(new T.BoxGeometry(2.13,1.3,.035),glass,v(0,.66,.355),this.tank);
  for(const y of [.1,1.25])for(const x of [-1.04,1.04])mesh(new T.SphereGeometry(.055,8,6),M.bronze,v(x,y,.4),this.tank);
  this.water=mesh(new T.BoxGeometry(2.12,1,.64),waterMat,v(0,.1,0),this.tank);
  this.bleed=mesh(new T.CylinderGeometry(.024,.035,.55,7),waterMat,v(1.12,-.3,.1),this.tank);
  tube([[1.06,.14,.1],[1.12,-.1,.1]],.055,M.bronze,this.tank);
  this.float=slab(.5,.12,.66,M.salt,.38,.2,0,this.tank);
  tube([[.38,.1,-.43],[.38,1.5,-.43]],.035,M.bronze,this.tank);
  // Pipe from the previously opened drain, overhead spout, mineral deposits underneath.
  tube([[46,4,-2.7],[56,4,-2.7],[56,6.1,-2.7],[x,6.1,-2.7],[x,5.5,-1.5]],.18,M.bronze,fixed);
  for(const px of [56,60,x]){slab(.6,.18,.7,M.dark,px,6.1,-2.7,fixed);}
  this.stream=mesh(new T.CylinderGeometry(.11,.15,1,9),waterMat,v(x,4,-1.5),parent);
  this.ripple=mesh(new T.TorusGeometry(.35,.025,6,28),waterMat,v(x,-1.12,-1.5),parent);this.ripple.rotation.x=Math.PI/2;
  // Flexible control hose, held behind/below the walking plane. Reused segments, no per-frame meshes.
  this.hose=[];for(let i=0;i<20;i++)this.hose.push(mesh(new T.CylinderGeometry(.065,.065,1,8),M.bronze,v(),parent));
  tube([[gateX-.75,base-.6,-2.2],[gateX-.75,base+4.8,-2.2],[gateX,base+4.8,-2.2]],.095,M.bronze,fixed);
  for(const z of [-1.85]){slab( .46,7.4,.28,M.bronze,gateX,base+3.7,z,fixed);slab(.65,.2,.6,M.dark,gateX,base+.1,z,fixed);}
  slab(.55,.3,4.05,M.dark,gateX,base+7.3,0,fixed);
  this.gate=new T.Group();parent.add(this.gate);
  // This slab and bars stay entirely within the shared collision envelope.
  for(const z of [-1.4,-1.05,-.7,-.35,0,.35,.7,1.05,1.4])slab(.32,3.5,.14,M.bronze,0,1.75,z,this.gate);
  for(const y of [.1,1.8,3.4])slab(.34,.14,3.1,M.dark,0,y,0,this.gate);
  this.piston=mesh(new T.CylinderGeometry(.085,.085,1,12),M.salt,v(gateX,base+5,-2.2),parent);
  mesh(new T.CylinderGeometry(.19,.19,2,14),M.bronze,v(gateX,base+6.1,-2.2),fixed);
  this.link=tube([[0,0,-2.2],[0,0,-1.5]],.075,M.bronze,parent);
  // A cool shaft singles out the water and offers a visual destination beyond the red chamber.
  const lamp=new T.PointLight('#b9d8cc',18,9,2);lamp.position.set(x,5.4,-.9);parent.add(lamp);
  merge(fixed);merge(this.gate);
 }
 update(s){const r=F.receiver,g=F.exitGate,base=110/60,fill=s.ferryFill||0,opening=s.exitGate||0,x=F.sample(s.ferryClock||0).x/60;
  this.bleed.visible=fill>.03;
  this.water.scale.y=Math.max(.01,fill*1.15);this.water.position.y=.12+fill*.575;this.float.position.y=.22+fill*1.15;
  const catching=F.catchment(s.ferryClock||0)>0,low=catching?base+1.53:-1.1;
  this.stream.visible=!!s.drainOpen;this.stream.scale.y=5.5-low;this.stream.position.y=(5.5+low)/2;
  this.stream.scale.x=this.stream.scale.z=.92+Math.sin(s.time*13)*.08;
  this.ripple.visible=!!s.drainOpen&&!catching;this.ripple.scale.setScalar(.8+((s.time*1.3)%1)*.8);
  this.gate.position.set(g.x/60,base+opening*g.travel/60,0);
  const rodBottom=base+3.5+opening*g.travel/60,rodTop=base+7.3;
  this.link.position.set(g.x/60,rodBottom,0);
  this.piston.scale.y=Math.max(.06,rodTop-rodBottom);this.piston.position.y=(rodTop+rodBottom)/2;
  const start=new T.Vector3(x+.75,base+.25,-1.7),end=new T.Vector3(g.x/60-.75,base-.6,-2.2),up=new T.Vector3(0,1,0);
  const point=t=>start.clone().lerp(end,t).add(new T.Vector3(0,-Math.sin(t*Math.PI)*1.2,0));
  for(let i=0;i<this.hose.length;i++){const a=point(i/20),b=point((i+1)/20),delta=b.clone().sub(a),part=this.hose[i];part.position.copy(a.add(b).multiplyScalar(.5));part.scale.y=delta.length();part.quaternion.setFromUnitVectors(up,delta.normalize());}
 }
}
