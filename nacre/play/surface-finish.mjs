import * as T from './vendor/three/three.module.js';
// Original seamless material masks, generated once, shared by all treated meshes.
function field(size,seed){let n=seed;const grid=Array.from({length:size*size},()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;});return(x,y)=>{x*=size;y*=size;const ix=Math.floor(x),iy=Math.floor(y);let u=x-ix,v=y-iy;u=u*u*(3-2*u);v=v*v*(3-2*v);const at=(a,b)=>grid[((b%size+size)%size)*size+(a%size+size)%size];return (at(ix,iy)*(1-u)+at(ix+1,iy)*u)*(1-v)+(at(ix,iy+1)*(1-u)+at(ix+1,iy+1)*u)*v;};}
export function finishMaps(kind){const size=128,color=new Uint8Array(size*size*4),rough=new Uint8Array(color.length),broad=field(5,17),fine=field(31,93),grain=field(63,197);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=x/size,v=y/size,n=broad(u,v),f=fine(u,v),g=grain(u,v),i=(y*size+x)*4,patch=Math.max(0,(n-.42)*1.7);const base=.96-.12*f-.055*g;
 const rgb=kind==='bronze'?[base-.24*patch,base-.08*patch,base-.03*patch]:[base-.12*patch,base-.08*patch,base-.10*patch];for(let k=0;k<3;k++){color[i+k]=Math.round(T.MathUtils.clamp(rgb[k],0,1)*255);rough[i+k]=Math.round((kind==='bronze'?.62+.33*patch:.82+.16*f)*255);}color[i+3]=rough[i+3]=255;}
 const texture=(data)=>{const t=new T.DataTexture(data,size,size,T.RGBAFormat);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;};return{map:texture(color),roughnessMap:texture(rough)};}
export class SurfaceFinish{
 constructor(){this.maps={stone:finishMaps('stone'),bronze:finishMaps('bronze')};this.materials=new Map();}
 apply(root,select){root.traverse(o=>{if(!o.isMesh||o.isSkinnedMesh||Array.isArray(o.material))return;const kind=select(o.material);if(!kind)return;const original=o.material;let m=this.materials.get(original);if(!m){m=original.clone();if(m.vertexColors)m.color.setRGB(1,1,1);Object.assign(m,this.maps[kind]);m.needsUpdate=true;this.materials.set(original,m);}o.material=m;
 // Local projection keeps the finish attached to movable props. No new triangles.
 const geom=o.geometry.clone(),p=geom.attributes.position,n=geom.attributes.normal,uv=new Float32Array(p.count*2),scale=kind==='stone'?.45:.8;
 for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));let a,b;if(ny>=nx&&ny>=nz){a=p.getX(i);b=p.getZ(i);}else if(nx>nz){a=p.getZ(i);b=p.getY(i);}else{a=p.getX(i);b=p.getY(i);}uv[i*2]=a*scale;uv[i*2+1]=b*scale;}geom.setAttribute('uv',new T.BufferAttribute(uv,2));o.geometry=geom;});}
}
