import * as T from './vendor/three/three.module.js';
export function saltShelteredPoint(x,y,z,shelterX=4900){return y<2.05&&z>-2.4&&z<1.2&&[shelterX,5500,6100,6700].some(c=>Math.abs(x-c/60)<100/60);}
export function saltStrength(clock){const p=((clock||0)%10+10)%10;return p<4?0:p<6?(p-4)/2:p<9?1:1-(p-9);}
// Eroded fossil vaults mark safe ground; airborne salt reveals the exposed gaps.
export class SaltPassage {
 constructor(parent,M){this.root=new T.Group();parent.add(this.root);this.flags=[];this.vaults=[];this.wheels=[];
 for(const x of [4900,5500,6100,6700]){
 const g=new T.Group();g.position.x=x/60;this.root.add(g);if(x===4900)this.carriage=g;
 // Fossil canopy axis follows X. Back support is outside the lane; the eroded
 // camera-facing side stays open so the traveller remains visible.
 const shell=new T.Group();shell.rotation.y=Math.PI/2;g.add(shell);
 const shape=new T.Shape();shape.absarc(0,0,3.75,0,1.7,false);shape.absarc(0,0,3.4,1.7,0,true);
 const geo=new T.ExtrudeGeometry(shape,{depth:3.5,steps:1,bevelEnabled:true,bevelSize:.09,bevelThickness:.08,bevelSegments:2,curveSegments:24});geo.translate(0,0,-1.75);
 const vault=new T.Mesh(geo,M.shell);vault.castShadow=vault.receiveShadow=true;shell.add(vault);this.vaults.push(vault);
 for(let j=0;j<11;j++){const a=j*1.7/10,pts=[];for(let k=0;k<9;k++)pts.push(new T.Vector3(Math.cos(a)*3.77,Math.sin(a)*3.77,-1.75+k*.4375));const seam=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),8,.025,5,false),M.salt);shell.add(seam);}
 const cloth=new T.PlaneGeometry(.7,1.6,4,8);const cp=cloth.attributes.position;for(let i=0;i<cp.count;i++){const y=cp.getY(i);cp.setX(i,cp.getX(i)*(.65+.35*(y+.8)/1.6));cp.setZ(i,.06*Math.sin(y*8));}cloth.computeVertexNormals();
 const stem=new T.Mesh(new T.CylinderGeometry(.035,.075,3.6,8),M.bronze);stem.position.set(1.5,1.8,-3.95);g.add(stem);
 const f=new T.Mesh(cloth,new T.MeshStandardMaterial({color:'#b9956e',side:T.DoubleSide,roughness:1}));f.position.set(1.5,2.7,-3.8);g.add(f);this.flags.push(f);
 }
 const box=(w,h,d,x,y,z,parent=this.carriage)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),M.bronze);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;};
 // Rear bogie stays outside the open walking lane, under the fossil canopy.
 box(3.6,.18,.7,0,.35,-3.5);
 for(const x of [-1.3,1.3]){const wheel=new T.Mesh(new T.CylinderGeometry(.32,.32,.18,20).rotateX(Math.PI/2),M.dark);wheel.position.set(x,.36,-3.2);this.carriage.add(wheel);this.wheels.push(wheel);}
 box(.12,1,.12,0,.7,-.4);box(1.8,.09,.12,0,1.2,-.4);box(.12,.12,3.1,0,.22,-1.95);
 for(const z of [-3.2,-3.8])box(9.6,.08,.08,84.8,.05,z,this.root);
 for(const x of [80,89.6])box(.18,.22,1,x,.14,-3.5,this.root);
 const geo=new T.BufferGeometry(),positions=[];for(let i=0;i<700;i++)positions.push(80+(i*.731)%36,.2+(i*.153)%5,-2+(i*.317)%4);geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));this.base=positions;
 const streakGeo=new T.BufferGeometry();streakGeo.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(240*9),3));this.streaks=new T.Mesh(streakGeo,new T.MeshBasicMaterial({color:'#f5dfb1',side:T.DoubleSide,transparent:true,opacity:0,depthWrite:false}));this.streaks.frustumCulled=false;this.root.add(this.streaks);this.dust=new T.Points(geo,new T.PointsMaterial({color:'#f5ddad',size:.045,transparent:true,opacity:0,depthWrite:false}));this.root.add(this.dust);
 for(let k=0;k<3;k++){const dune=new T.PlaneGeometry(75,18,65,16);dune.rotateX(-Math.PI/2);const p=dune.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,Math.sin(p.getX(i)*.11+k)*1.8+Math.cos(p.getZ(i)*.15+p.getX(i)*.19)*.5);dune.computeVertexNormals();const o=new T.Mesh(dune,M.stone);o.position.set(108,-.8,-13-k*13);o.receiveShadow=true;this.root.add(o);}
 // A quiet salt pool beyond the final vault catches the low light.
 const pool=new T.Mesh(new T.CircleGeometry(6,64),new T.MeshStandardMaterial({color:'#789497',metalness:.7,roughness:.2}));pool.rotation.x=-Math.PI/2;pool.scale.set(2.3,1,1);pool.position.set(122,-.18,-6);this.root.add(pool);
 }
 update(s){this.carriage.position.x=(s.shelterX??4900)/60;for(const wheel of this.wheels)wheel.rotation.z=-((s.shelterX??4900)-4900)/19.2;const safe=(x,y,z)=>saltShelteredPoint(x,y,z,s.shelterX??4900);const phase=(s.stormClock||0)%10,warning=phase>=4&&phase<6,blast=phase>=6&&phase<9,strength=saltStrength(s.stormClock);
 this.dust.material.opacity=strength*.65;const a=this.dust.geometry.attributes.position;for(let i=0;i<a.count;i++){const x=80+((this.base[i*3]-80+s.time*19)%36),y=this.base[i*3+1],z=this.base[i*3+2];a.setXYZ(i,x,safe(x,y,z)?-10:y,z);}a.needsUpdate=true;
 const strokes=this.streaks.geometry.attributes.position;this.streaks.material.opacity=strength*.34;
 for(let i=0;i<240;i++){const x=80+((i*.731+s.time*19)%36),y=.15+(i*.173)%4.8,z=-2+(i*.317)%4,hidden=safe(x,y,z)||safe(x+.42,y-.07,z),h=hidden?-10:y;strokes.setXYZ(i*3,x,h,z);strokes.setXYZ(i*3+1,x+.42,h-.07,z);strokes.setXYZ(i*3+2,x+.31,h-.025,z);}strokes.needsUpdate=true;
 for(const flag of this.flags){flag.rotation.x=-strength*.75;flag.rotation.z=Math.sin(s.time*(blast?18:4))*.12*strength;}
 }
}
