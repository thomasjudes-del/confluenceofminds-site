import * as T from './vendor/three/three.module.js';
const ease=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
export function witnessPose(age){
 const returning=age>3.7,t=T.MathUtils.clamp(returning?(age-3.7)/2.1:age/1.7,0,1),distance=216;
 return {visible:age>=0&&age<5.8,x:648+distance*(returning?1-ease(t):ease(t)),vx:(returning?-1:1)*distance*6*t*(1-t)/(returning?2.1:1.7),face:age<2.9?1:-1,watching:age>=1.7&&age<=3.7?1:0};
}
// Service shelter behind the playable lane. Its opaque front hides both endpoints;
// the open right side makes the walk out and return actual spatial events.
export function witnessShelter(parent,M){
 const g=new T.Group();g.name='Witness service shelter';g.position.z=-3;parent.add(g);
 const part=(w,h,d,x,y,z,m)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;};
 part(8,.22,2.9,12,1.14,-5.3,M.stone);
 for(const x of [8.5,15.5])part(.3,2,.3,x,.08,-5.3,M.dark);
 const face=part(4.2,3.25,.28,11.1,2.875,-4.15,M.stone);face.name='Witness opaque facade';
 part(.25,3.25,2.6,9.05,2.875,-5.3,M.dark);
 part(4.5,.22,2.9,11.15,4.58,-5.3,M.stone);
 part(4.5,.25,2.9,11.15,1.15,-5.3,M.stone);
 for(const x of [9.15,13.05]){part(.16,3.35,.2,x,2.88,-3.96,M.brass);part(.34,.18,.32,x,1.3,-3.94,M.dark);}
 for(const y of [1.5,4.25])part(3.85,.09,.1,11.1,y,-3.96,M.brass);
 // Recessed panels and narrow vents repeat the conservatory's maintenance fittings.
 for(let i=0;i<3;i++){part(1.12,2.35,.04,9.82+i*1.28,2.85,-3.99,M.dark);for(let j=0;j<5;j++)part(.82,.035,.035,9.82+i*1.28,3.35+j*.12,-3.95,M.brass);}
 return g;
}
