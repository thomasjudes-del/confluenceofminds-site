import './ferry-motion.js';
const Ferry=globalThis.NacreFerryMotion||globalThis.window?.NacreFerryMotion;
import * as T from './vendor/three/three.module.js';
export class CisternFerry{
 constructor(parent,M,{slab,tube,mesh,merge}){
  this.root=new T.Group();parent.add(this.root);const fixed=new T.Group();this.root.add(fixed);const v=(x,y,z=0)=>new T.Vector3(x,y,z);
  this.deck=new T.Group();this.root.add(this.deck);
  slab(4,.28,3.1,M.bronze,0,-.18,0,this.deck);
  for(let j=0;j<8;j++)slab(.46,.10,2.95,M.stone,-1.72+j*.49,-.05,0,this.deck);
  for(const z of [-1.4]){
   slab(3.9,.35,.16,M.dark,0,-.35,z,this.deck);
   tube([[58.7,4.8,z],[70.5,4.8,z]],.035,M.bronze,fixed);
   for(const x of [-1.7,1.7]){tube([[x,0,z],[x,2.95,z]],.025,M.bronze,this.deck);mesh(new T.TorusGeometry(.12,.035,8,20),M.bronze,v(x,2.95,z),this.deck);}
   for(const x of [58.7,70.5])slab(.16,3.1,.18,M.bronze,x,3.3,z,fixed);
  }
  // Rear suspension is triangulated; the camera side stays open.
  for(const x of [-1.7,1.7]){tube([[x,0,-1.4],[x*.5,2.95,-1.4]],.045,M.bronze,this.deck);slab(.18,.25,3.1,M.bronze,x,-.35,0,this.deck);}
  // Rear handrail leaves the traveller and both boarding edges unobscured.
  for(const x of [-1.7,0,1.7])slab(.07,.85,.07,M.bronze,x,.42,-1.4,this.deck);
  tube([[-1.7,.85,-1.4],[0,.85,-1.4],[1.7,.85,-1.4]],.045,M.bronze,this.deck);
  for(const x of [58.7,70.5]){slab(.42,1.6,.5,M.dark,x,2.3,-1.9,fixed);const ring=mesh(new T.TorusGeometry(.3,.055,8,32),M.bronze,v(x,2.8,-1.9),fixed);}
  for(const y of [2.55,2.9])tube([[58.7,y,-1.9],[70.5,y,-1.9]],.025,M.bronze,fixed);
  tube([[46,-.3,-2.4],[54,-.3,-2.4],[56.8,1,-2.4],[58,2,-2.4]],.16,M.bronze,fixed);
  this.drive=new T.Group();this.drive.position.set(58,2,-2.4);this.root.add(this.drive);
  mesh(new T.TorusGeometry(.7,.1,10,48),M.bronze,v(0,0,0),this.drive);
  for(let j=0;j<8;j++){const a=j*Math.PI/4,o=slab(.5,.2,.65,M.dark,Math.cos(a)*.6,Math.sin(a)*.6,0,this.drive);o.rotation.z=a;}
  // Cam-operated brake: the weighted arm lifts before departure, then seats at docking.
  this.brakeArm=new T.Group();this.brakeArm.position.set(.9,.55,-1.62);this.deck.add(this.brakeArm);
  slab(.17,.8,.16,M.bronze,0,.28,0,this.brakeArm);
  mesh(new T.SphereGeometry(.18,12,8),M.dark,v(0,.68,0),this.brakeArm);
  slab(.5,.18,.28,M.dark,0,-.17,0,this.brakeArm);
  mesh(new T.TorusGeometry(.14,.04,8,24),M.salt,v(.9,.55,-1.59),this.deck);
  this.manualLever=new T.Group();this.manualLever.position.set(.6,.70,-.35);this.deck.add(this.manualLever);
  slab(.08,.5,.08,M.bronze,0,.20,0,this.manualLever);
  tube([[-.23,.48,0],[.23,.48,0]],.055,M.salt,this.manualLever);
  slab(.38,.14,.45,M.dark,.6,.07,-.35,this.deck);
  tube([[.6,.1,-.35],[.6,.12,-1.4],[.9,.55,-1.62]],.025,M.bronze,this.deck);
  // Two wooden buffers behind the walk line visibly take up the docking stroke.
  this.buffers=[];
  for(const [x,dir] of [[59.1,1],[70.0,-1]]){
   const buffer=new T.Group();buffer.position.set(x,2.1,-1.68);this.root.add(buffer);
   slab(.22,.55,.34,M.bronze,0,0,0,buffer);
   const head=new T.Group();buffer.add(head);slab(.23,.38,.38,M.dark,dir*.2,0,0,head);
   tube([[0,0,0],[dir*.32,0,0]],.06,M.bronze,head);this.buffers.push({head,dir});merge(buffer);merge(head);
  }
  // A deep receiver and mineral bands make the crossing's depth legible.
  slab(10.9,3.7,.4,M.dark,64.6,-.1,-3.4,fixed);
  for(const y of [-1,0,1])slab(10.9,.055,.05,M.salt,64.6,y,-3.16,fixed);
  merge(fixed);merge(this.deck);merge(this.drive);
 }
 handTarget(side){this.root.updateMatrixWorld(true);return this.manualLever.localToWorld(new T.Vector3(side==='L'?-.18:.18,.48,0));}
 update(s){const f=Ferry.sample(s.ferryClock||0);this.deck.position.set(f.x/60,110/60,0);
  // Drive reverses with the haul cable and rests while the deck is berthed.
  this.drive.rotation.z=-(f.x-3660)/42;
  this.brakeArm.rotation.z=-f.direction*f.prepare*.65*(1-(s.ferryBrake||0));
  this.manualLever.rotation.z=(s.ferryBrake||0)*.55;
  this.buffers[0].head.position.x=-.12*(1-T.MathUtils.smoothstep(f.x,3660,3672));
  this.buffers[1].head.position.x=.12*T.MathUtils.smoothstep(f.x,4068,4080);
 }
}
