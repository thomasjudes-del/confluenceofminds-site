/* Retarget CMU 09_01 joints to the same world-space body in every scene. */
(function(root){'use strict';const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
const point=(x,y)=>({x,y});
function elbow(a,b){const dx=b.x-a.x,dy=b.y-a.y,d=clamp(Math.hypot(dx,dy),.01,45.9),q=Math.atan2(dy,dx)+Math.acos(clamp((22*22+d*d-24*24)/(44*d),-1,1));return point(a.x+Math.cos(q)*22,a.y+Math.sin(q)*22);}
class Rig{constructor(){this.distance=0;this.lastX=null;this.weight=0;this.pose=null;}
update(s,dt,p){const data=root.NacreRunCapture,dx=this.lastX===null?0:s.x-this.lastX;this.lastX=s.x;if(Math.abs(dx)<60)this.distance+=Math.abs(dx);const moving=s.onGround&&!s.climb&&!s.swimming&&!s.grabbing&&!s.guiding&&!(s.crouch>.05),target=moving?clamp((Math.abs(s.vx)-95)/100,0,1):0;this.weight=mix(this.weight,target,1-Math.exp(-dt*18));if(!data)this.weight=0;
const body=(x,y)=>{const yy=y+60,c=Math.cos(p.lean),sn=Math.sin(p.lean);return point(x*c-yy*sn,x*sn+yy*c-60+p.bob+p.breath);};
let q={root:body(0,-60),thorax:body(0,-79),lowerneck:body(0,-85),upperneck:body(0,-92),head:body(0,-103)};
for(const [i,side] of ['l','r'].entries()){const f=p.feet[i];q[side+'hipjoint']={...f.hip};q[side+'femur']={...f.knee};q[side+'tibia']={...f.ankle};q[side+'foot']=point(f.x+3,f.y-1);q[side+'toes']=point(f.x+8,f.y);q[side+'clavicle']=body(i?-4:-6,-80);const h=i?p.frontHand:p.backHand;q[side+'radius']=body(h.x,h.y);q[side+'humerus']=elbow(q[side+'clavicle'],q[side+'radius']);q[side+'hand']=point(q[side+'radius'].x+1,q[side+'radius'].y+3);}
if(data&&this.weight>.001){const at=(this.distance/192%1)*data.period,i=Math.floor(at),u=at-i,a=data.frames[i],b=data.frames[(i+1)%data.period];for(const [k,name] of data.keys.entries()){if(!q[name])continue;const x=mix(a[k][0],b[k][0],u)*(192/data.stride),y=mix(a[k][1],b[k][1],u);q[name]=point(mix(q[name].x,x,this.weight),mix(q[name].y,y,this.weight));}}
// The same physical contact wins over locomotion when pulling onto a ledge.
if(p.contacts?.weight){const flip=Math.abs(p.turn)<.18?Math.sign(p.turn||s.face)*.18:p.turn,c=p.contacts;for(const side of ['l','r']){const h=q[side+'radius'];h.x=mix(h.x,(c.x-s.x)/flip,c.weight);h.y=mix(h.y,c.y-s.y,c.weight);q[side+'humerus']=elbow(q[side+'clavicle'],h);q[side+'hand']={...h};}}
this.pose=q;return q;}}
root.NacreCaptureRig=Rig;if(typeof module!=='undefined')module.exports=Rig;
})(typeof window!=='undefined'?window:globalThis);
