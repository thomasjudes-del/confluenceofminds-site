import * as T from './vendor/three/three.module.js';
import {mergeGeometries} from './vendor/three/utils/BufferGeometryUtils.js';

// Original NACRE hound. Metres, facing +X, feet on Y=0. No external mesh or clip.
// The silhouette is lofted from anatomical sections; paws drive two-joint legs.
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function loft(rows,segments=16){
 const sections=[];
 for(let i=0;i<rows.length-1;i++)for(let k=0;k<3;k++){
  const t=k/3,a=rows[Math.max(0,i-1)],b=rows[i],c=rows[i+1],d=rows[Math.min(rows.length-1,i+2)];
  sections.push(b.map((n,j)=>{const v=.5*((2*n)+(-a[j]+c[j])*t+(2*a[j]-5*n+4*c[j]-d[j])*t*t+(-a[j]+3*n-3*c[j]+d[j])*t*t*t);return j>1?Math.max(.002,v):v;}));
 }
 sections.push(rows.at(-1));rows=sections;
 const p=[],c=[],ix=[],coat=new T.Color('#655b4b'),shade=new T.Color('#282927');
 for(let i=0;i<rows.length;i++){
  const [x,y,ry,rz]=rows[i];
  for(let k=0;k<=segments;k++){
   const a=k/segments*TAU,vertical=Math.cos(a),z=Math.sin(a);
   p.push(x,y+vertical*ry,z*rz);
   const pigment=shade.clone().lerp(coat,.25+.45*Math.max(0,vertical)+.12*Math.sin(i*1.3+k*.24));
   c.push(pigment.r,pigment.g,pigment.b);
   if(i<rows.length-1&&k<segments){const n=i*(segments+1)+k;ix.push(n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1);}
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(c,3));g.setIndex(ix);g.computeVertexNormals();return g;
}
function mesh(parent,geometry,material){const m=new T.Mesh(geometry,material);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function oval(parent,m,x,y,z,sx,sy,sz){const o=mesh(parent,new T.SphereGeometry(1,16,12),m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);return o;}
function taperedLimb(radiusTop,radiusBottom){
 // Mesh extends down local Y, with rounded transitions rather than cylinder caps.
 const rows=[[0,0,.002,.002],[.035,0,radiusTop*.7,radiusTop*.7],[.14,0,radiusTop,radiusTop],
  [.38,0,radiusTop*.9,radiusTop*.82],[.72,0,radiusBottom*1.2,radiusBottom],[.96,0,radiusBottom,radiusBottom],[1,0,.003,.003]];
 const g=loft(rows,12);g.rotateZ(-Math.PI/2);return g;
}
function earGeometry(side){
 const s=new T.Shape();s.moveTo(-.06,.02);s.bezierCurveTo(.03,.10,.13,.07,.16,-.04);s.bezierCurveTo(.17,-.18,.06,-.26,.015,-.15);s.bezierCurveTo(-.04,-.10,-.08,-.04,-.06,.02);
 const g=new T.ExtrudeGeometry(s,{depth:.025,bevelEnabled:true,bevelSize:.009,bevelThickness:.009,bevelSegments:2,steps:1,curveSegments:8});g.translate(0,0,side<0?-.025:0);return g;
}
export class ForestDog {
 constructor(parent){
  this.root=new T.Group();this.root.name='Original articulated forest hound';parent.add(this.root);
  this.body=new T.Group();this.root.add(this.body);
  this.coat=new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.92});
  const dark=new T.MeshStandardMaterial({color:'#292b29',roughness:.89});
  const pads=new T.MeshStandardMaterial({color:'#4d4940',roughness:.94});
  const wet=new T.MeshStandardMaterial({color:'#171b1a',roughness:.38});
  mesh(this.body,loft([[-.77,.64,.005,.005],[-.69,.65,.12,.13],[-.55,.67,.20,.19],[-.38,.68,.19,.18],
   [-.20,.69,.16,.145],[.02,.70,.19,.17],[.20,.72,.25,.205],[.36,.74,.27,.21],[.49,.76,.22,.175],[.58,.78,.10,.10],[.60,.80,.005,.005]],20),this.coat);
  mesh(this.body,loft([[.28,.77,.03,.03],[.38,.84,.22,.18],[.48,.94,.20,.16],[.60,1.04,.17,.135],[.73,1.08,.11,.10],[.79,1.08,.004,.004]],18),this.coat);
  this.head=new T.Group();this.head.position.set(.57,1.03,0);this.body.add(this.head);
  mesh(this.head,loft([[-.06,.02,.005,.005],[0,.025,.13,.125],[.15,.02,.16,.13],[.25,-.015,.115,.115],
   [.34,-.045,.08,.085],[.48,-.06,.065,.073],[.51,-.06,.01,.01]],18),this.coat);
  oval(this.head,wet,.5,-.045,0,.047,.041,.067);
  for(const side of [-1,1]){
   oval(this.head,wet,.22,.045,side*.112,.021,.022,.013);
   const ear=mesh(this.head,earGeometry(side),dark);ear.position.set(.02,.10,side*.095);ear.rotation.x=side*.18;
  }
  this.jaw=new T.Group();this.jaw.position.set(.19,-.075,0);this.head.add(this.jaw);
  mesh(this.jaw,loft([[-.07,0,.003,.003],[0,-.015,.052,.08],[.17,-.032,.037,.065],[.30,-.025,.015,.045],[.32,-.02,.002,.002]],14),this.coat);
  this.tail=new T.Group();this.tail.position.set(-.66,.73,0);this.body.add(this.tail);
  const curve=new T.CatmullRomCurve3([V(0,0,0),V(-.2,-.04,0),V(-.39,-.18,.01),V(-.51,-.39,.015),V(-.56,-.50,0)]);
  const tg=new T.TubeGeometry(curve,24,.053,10,false),pos=tg.attributes.position;
  for(let i=0;i<=24;i++){const center=curve.getPointAt(i/24),r=1-.92*(i/24)**.7;for(let j=0;j<=10;j++){const n=i*11+j,p=V().fromBufferAttribute(pos,n).sub(center).multiplyScalar(r).add(center);pos.setXYZ(n,p.x,p.y,p.z);}}
  tg.computeVertexNormals();mesh(this.tail,tg,dark);
  this.legs=[];this.down=V(0,-1,0);this.tmp=V();
  for(const front of [true,false])for(const side of [-1,1]){
   const upper=mesh(this.root,taperedLimb(front?.085:.12,front?.055:.065),this.coat);
   const lower=mesh(this.root,taperedLimb(front?.051:.063,.035),this.coat);
   const paw=new T.Group();this.root.add(paw);oval(paw,pads,.025,.046,0,.112,.055,.064);
   for(let k=-1;k<=1;k++)oval(paw,pads,.094,.031,k*.032,.048,.029,.021);
   const pawParts=paw.children.map(o=>{o.updateMatrix();return o.geometry.clone().applyMatrix4(o.matrix);});
   paw.children.forEach(o=>o.geometry.dispose());paw.clear();mesh(paw,mergeGeometries(pawParts,false),pads);pawParts.forEach(g=>g.dispose());
   const joint=oval(this.root,pads,0,0,0,front?.054:.066,front?.057:.068,front?.052:.064);
   this.legs.push({front,side,upper,lower,paw,joint,a:V(),b:V(),c:V(),length1:front?.36:.40,length2:front?.37:.44});
  }
  this.phase=0;this.lastTime=null;this.lastX=null;this.lastZ=null;
  this.update({x:0,time:0});
 }
 segment(m,a,b){m.position.copy(a);this.tmp.copy(b).sub(a);m.scale.set(1,this.tmp.length(),1);m.quaternion.setFromUnitVectors(this.down,this.tmp.normalize());}
 update({x,y=0,z=0,speed=0,time=0,face=1,alert=0}){
  const dt=this.lastTime===null||time<this.lastTime?0:clamp(time-this.lastTime,0,.1);
  const distance=this.lastX===null?0:Math.hypot(x-this.lastX,z-this.lastZ);
  // A teleport/checkpoint does not spin the gait through a huge distance.
  if(time<this.lastTime||distance>2)this.phase=0;
  else this.phase+=(distance>.00001?distance:Math.abs(speed)*dt)/1.75*TAU;
  this.lastTime=time;this.lastX=x;this.lastZ=z;
  const activity=clamp(Math.abs(speed)/3,0,1),phase=this.phase;
  const bounce=activity*(.018+.018*Math.sin(phase*2-.6)),breath=(1-activity)*Math.sin(time*2.1)*.009;
  this.root.position.set(x,y,z);this.root.rotation.y=face<0?Math.PI:0;
  this.body.position.y=bounce+breath;this.body.rotation.z=activity*.045*Math.sin(phase);
  this.head.rotation.z=-.06*activity+.035*Math.sin(time*1.4)*(1-activity)+clamp(alert,0,1)*.045;
  this.head.rotation.y=.06*Math.sin(time*.8)*(1-activity);
  this.jaw.rotation.z=-activity*(.045+.025*Math.sin(time*5))-clamp(alert,0,1)*.09*Math.max(0,Math.sin(time*10));
  this.tail.rotation.x=Math.sin(time*3.3)*(.06+.07*(1-activity));this.tail.rotation.z=.22*activity+.04*Math.sin(phase);
  for(const leg of this.legs){
   const {front,side,length1:l1,length2:l2}=leg;
   // Fore/hind pairs gather and extend out of phase; left/right contacts are staggered.
   const p=(phase+(front?0:Math.PI)+side*.28)%TAU,u=(p+TAU)%TAU/TAU,stance=.57;
   const stride=activity*(front?.42:.47);
   let reach,lift=0;
   if(u<stance)reach=stride*(1-2*u/stance);
   else{const q=(u-stance)/(1-stance);reach=stride*(-1+2*(q*q*(3-2*q)));lift=activity*.21*Math.sin(Math.PI*q);}
   const hipX=front?.35:-.48,hipY=(front?.73:.72)+bounce+breath;
   // Keep stance paws on the floor even when the torso rises during suspension.
   const vertical=hipY-(.065+lift),maxReach=Math.sqrt(Math.max(.001,(l1+l2-.002)**2-vertical*vertical));
   reach=clamp(reach,-maxReach,maxReach);
   leg.a.set(hipX,hipY,side*(front?.16:.15));
   leg.c.set(hipX+reach,.065+lift,side*(front?.165:.16));
   // Analytic 2-link solve. Fore elbows sweep back, hind stifles fold forward.
   const dx=leg.c.x-leg.a.x,dy=leg.c.y-leg.a.y,d=clamp(Math.hypot(dx,dy),.01,l1+l2-.002),nx=dx/Math.hypot(dx,dy),ny=dy/Math.hypot(dx,dy);
   const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along)),bend=front?1:-1;
   leg.b.set(leg.a.x+nx*along+ny*height*bend,leg.a.y+ny*along-nx*height*bend,leg.a.z);
   // Clamp the target to the physically reachable circle instead of stretching limbs.
   leg.c.set(leg.a.x+nx*d,leg.a.y+ny*d,leg.c.z);
   this.segment(leg.upper,leg.a,leg.b);this.segment(leg.lower,leg.b,leg.c);leg.joint.position.copy(leg.b);
   leg.paw.position.copy(leg.c);leg.paw.position.y-=.065;leg.paw.rotation.z=u>stance?-.35*Math.sin((u-stance)/(1-stance)*Math.PI)*activity:0;
  }
  return this;
 }
}
