import * as T from './vendor/three/three.module.js';
import './salt-crust.js';
const C=globalThis.NacreSaltCrust;
export class SaltCrust{
 constructor(parent,M,{slab,tube,mesh}){this.deck=new T.Group();parent.add(this.deck);this.deck.position.x=8010/60;
 slab(7,.45,3.5,M.dark,0,-.32,0,this.deck);for(let i=0;i<7;i++)slab(.96,.17,3.6,M.salt,-3+i,.0-.085,0,this.deck);
 this.cracks=[];for(let i=0;i<6;i++){const g=new T.Group();this.deck.add(g);const x=-2.5+i;g.position.x=x;tube([[-.08,.008,-1.8],[.12,.012,-.4],[-.14,.012,.6],[.05,.008,1.8]],.024,M.dark,g);this.cracks.push(g);}
 // The old submerged causeway is a real alternate route below the crust.
 slab(3.34,.35,2.8,M.dark,8320/60,-1.675,0,parent);for(let i=0;i<5;i++)slab(.64,.12,2.9,M.stone,137.34+i*.66,-1.56,0,parent);
 for(const x of [130.3,133.5,136.7]){slab(.4,2.6,3.1,M.dark,x,-2.8,0,parent);}
 const pool=mesh(new T.CircleGeometry(8,64).rotateX(-Math.PI/2),new T.MeshStandardMaterial({color:'#6f999a',metalness:.6,roughness:.25}),new T.Vector3(148,-1.62,-8),parent);pool.scale.set(1.5,1,1);
 // Outcrops remain in the rear plane; they frame the quiet lower shore.
 for(let i=0;i<5;i++){const g=new T.SphereGeometry(1,24,16),o=mesh(g,M.shell,new T.Vector3(143+i*2.2,-.1,-7-i*.8),parent);o.scale.set(1.3,1.1+i*.35,1.8);}
 }
 update(s){const p=C.sample(s);this.deck.position.y=(510-p.y)/60;for(const g of this.cracks)g.scale.x=1+Math.min(1,(s.crustTime||0)/1.6)*.8;}
}
