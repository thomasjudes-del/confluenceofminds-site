import * as T from './vendor/three/three.module.js';
// A rooted, breathing coastal organism. Decorative: never a false interaction marker.
export class ConservatoryBloom {
 constructor(scene){
  this.root=new T.Group();this.root.name='Tidal bloom in the final bay';this.root.position.set(125.6,0,-3.6);scene.add(this.root);
  const shell=new T.MeshStandardMaterial({color:'#688f88',roughness:.59,metalness:.22,side:T.DoubleSide,vertexColors:true});
  const pearl=new T.MeshStandardMaterial({color:'#b8c8a6',roughness:.36,metalness:.15,emissive:'#5d8777',emissiveIntensity:.28});
  this.petals=[];
  for(let k=0;k<7;k++){
   const positions=[],colors=[],indices=[],rows=24,cols=12;
   for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){
    const t=i/rows,w=j/cols*2-1,a=k*Math.PI*2/7;
    const width=Math.pow(Math.sin(Math.PI*t),.72)*.80;
    const r=.17+1.75*Math.sin(t*Math.PI*.65)+.17*w*w*Math.sin(t*Math.PI);
    const tangent=w*width,y=t*(3.8-.95*Math.max(0,Math.sin(a))+.13*Math.cos(k*2))+.18*Math.cos(w*Math.PI/2)*Math.sin(t*Math.PI);
    positions.push(Math.cos(a)*r-Math.sin(a)*tangent,y,Math.sin(a)*r+Math.cos(a)*tangent);
    const c=new T.Color('#8cae9b').lerp(new T.Color('#345b55'),Math.abs(w)*.4+(1-t)*.4);
    c.lerp(new T.Color('#c9c7a9'),Math.pow(Math.abs(w),8)*.6+t*t*.15);
    c.multiplyScalar(1-.13*Math.pow(Math.cos(w*23+t*6),8));colors.push(c.r,c.g,c.b);
    if(i<rows&&j<cols){const n=i*(cols+1)+j;indices.push(n,n+1,n+cols+1,n+1,n+cols+2,n+cols+1);}
   }
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
   const m=new T.Mesh(g,shell);m.castShadow=m.receiveShadow=true;this.root.add(m);this.petals.push(m);
  }
  this.heart=new T.Mesh(new T.SphereGeometry(1,32,20),pearl);this.heart.position.y=2.05;this.heart.scale.set(.51,1.23,.51);this.root.add(this.heart);
  const rootMat=new T.MeshStandardMaterial({color:'#253f3a',roughness:.96});
  const bed=new T.Mesh(new T.DodecahedronGeometry(1,2),rootMat);bed.position.y=-.62;bed.scale.set(1.35,.72,1.12);bed.castShadow=bed.receiveShadow=true;this.root.add(bed);
  for(let k=0;k<5;k++){
   const a=k*Math.PI*2/5;const points=[new T.Vector3(0,.55,0),new T.Vector3(Math.cos(a)*.55,.10,Math.sin(a)*.55),new T.Vector3(Math.cos(a)*1.5,.025,Math.sin(a)*1.5)];
   const m=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),14,.055,7,false),rootMat);m.castShadow=true;this.root.add(m);
  }
 }
 update(s){
  const t=s.time||0;
  for(let k=0;k<this.petals.length;k++){const p=this.petals[k],breath=Math.sin(t*.53+k*.17);p.scale.set(1+.018*breath,1+.006*breath,1+.018*breath);}
  this.heart.material.emissiveIntensity=.25+.035*Math.sin(t*.53-.5);
 }
}
