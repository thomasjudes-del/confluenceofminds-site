/* Painted articulated traveller, retargeted capture shared by every scene. */
(function(){'use strict';const T=Math.PI*2;
function path(g,fill,stroke,w,fn){g.beginPath();fn(g);if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.lineWidth=w;g.stroke();}}
class Character{
 constructor(){this.motion=new NacreMotion.Motion();this.atlas=new Image();this.atlas.src='assets/traveller-v07.webp';this.pose=null;this.rig=typeof NacreCaptureRig!=="undefined"?new NacreCaptureRig():null;}
 update(s,dt){this.pose=this.motion.update(s,dt);if(this.rig)this.rig.update(s,dt,this.pose);}
 limb(g,points,width,front,arm=false){const [a,b,c]=points;const segment=(from,to,w0,w1)=>{const dx=to.x-from.x,dy=to.y-from.y,len=Math.hypot(dx,dy);g.save();g.translate(from.x,from.y);g.rotate(Math.atan2(dy,dx)-Math.PI/2);const cloth=g.createLinearGradient(-w0/2,0,w0/2,0);cloth.addColorStop(0,front?'#202f2e':'#152522');cloth.addColorStop(.38,front?'#485348':'#2d3b33');cloth.addColorStop(.72,front?'#39453b':'#23332d');cloth.addColorStop(1,'#202e29');path(g,cloth,null,0,p=>{p.moveTo(-w0*.42,-2);p.quadraticCurveTo(0,-w0*.48,w0*.42,-2);p.bezierCurveTo(w0*.55,len*.3,w1*.5,len*.75,w1*.48,len+1);p.quadraticCurveTo(0,len+w1*.32,-w1*.48,len+1);p.bezierCurveTo(-w1*.5,len*.75,-w0*.55,len*.3,-w0*.42,-2);});g.save();g.clip();if(this.atlas.complete&&this.atlas.naturalWidth){g.globalAlpha=front?.28:.18;g.drawImage(this.atlas,420,850,120,200,-w0*.6,-2,w0*1.2,len+5);}g.restore();path(g,null,front?'#89947a26':'#627a6d18',.55,p=>{p.moveTo(-w0*.3,1);p.bezierCurveTo(-w0*.4,len*.3,-w1*.3,len*.7,-w1*.25,len-1);});g.restore();};segment(a,b,width,width*.78);segment(b,c,width*.8,arm?3.5:4.3);if(arm){g.fillStyle=front?'#aa8a66':'#746e52';path(g,g.fillStyle,null,0,p=>{p.moveTo(c.x-1.6,c.y-1);p.quadraticCurveTo(c.x+.5,c.y-1.5,c.x+1.8,c.y+.3);p.lineTo(c.x+2.3,c.y+2.7);p.quadraticCurveTo(c.x+1.7,c.y+4.3,c.x+.2,c.y+4);p.lineTo(c.x-1.3,c.y+2.8);p.lineTo(c.x-1.6,c.y-1);});path(g,null,'#ceae8050',.55,p=>{p.moveTo(c.x+1.7,c.y+.7);p.lineTo(c.x+.7,c.y+2.3);});}}

 arm(g,hand,front,contact=0){const shoulder={x:front?-4:-6,y:front?-72:-71},dx=hand.x-shoulder.x,dy=hand.y-shoulder.y;const reach=Math.min(45.8,Math.hypot(dx,dy)),angle=Math.atan2(dy,dx)+Math.acos(Math.max(-1,Math.min(1,(22*22+reach*reach-24*24)/(44*Math.max(.01,reach)))));const elbow={x:shoulder.x+Math.cos(angle)*22,y:shoulder.y+Math.sin(angle)*22};if(contact){const k=NacreMotion.ik(shoulder.x,shoulder.y,hand.x,hand.y,29,29);elbow.x+=(k.x-elbow.x)*contact;elbow.y+=(k.y-elbow.y)*contact;}this.limb(g,[shoulder,elbow,hand],front?9:7,front,true);}
 draw(g,s,t,seed){
 const p=this.pose,q=this.rig?.pose;if(!p||!q)return;
 g.save();g.translate(s.x,s.y);const flip=Math.abs(p.turn)<.18?Math.sign(p.turn||s.face)*.18:p.turn;g.scale(flip,1);
 const arm=(side,front)=>this.limb(g,[q[side+'clavicle'],q[side+'humerus'],q[side+'radius']],front?8:7,front,true);
 const boot=(side,front)=>{const ankle=q[side+'tibia'],toe=q[side+'toes'],a=Math.atan2(toe.y-ankle.y,toe.x-ankle.x);g.save();g.translate(ankle.x,ankle.y);g.rotate(Math.max(-1.3,Math.min(1.3,a-.18)));const z=g.createLinearGradient(0,-5,0,5);z.addColorStop(0,front?'#586052':'#34443d');z.addColorStop(1,'#142627');path(g,z,'#9a9c7338',.5,c=>{c.moveTo(-3,-5);c.lineTo(3,-5);c.quadraticCurveTo(4,-2,9,0);c.quadraticCurveTo(12,2,9,3);c.lineTo(-3,3);c.quadraticCurveTo(-5,0,-3,-5);});g.restore();};
 arm('l',false);
 for(const [side,front] of [['l',false],['r',true]]){this.limb(g,[q[side+'hipjoint'],q[side+'femur'],q[side+'tibia']],front?7:6.4,front);boot(side,front);}
 const pelvis=q.root,neck=q.lowerneck,angle=Math.atan2(neck.x-pelvis.x,pelvis.y-neck.y),length=Math.hypot(neck.x-pelvis.x,neck.y-pelvis.y);
 g.save();g.translate(pelvis.x,pelvis.y);g.rotate(angle);
 if(this.atlas.complete&&this.atlas.naturalWidth){
 // Separate overlapping painted regions let the pelvis, chest, neck and head move.
 g.drawImage(this.atlas,248,430,498,570,-13,-length-3,26,length+12);
 const rows=10;for(let i=0;i<rows;i++){const u=i/rows,flutter=p.cloth*.65*u*u;g.drawImage(this.atlas,248,1000+u*500,498,51,-13+flutter,5+u*27,26,2.8);}
 }
 g.restore();
 // Counter-rotation stabilizes the gaze without freezing the head in world space.
 const hangle=Math.atan2(q.upperneck.x-neck.x,neck.y-q.upperneck.y)*.38;
 g.save();g.translate(neck.x,neck.y);g.rotate(hangle);if(this.atlas.complete&&this.atlas.naturalWidth)g.drawImage(this.atlas,248,54,498,416,-13,-23,26,25);g.restore();
 const hand=q.rradius,carry=s.seed==='held',veil=s.veil||0;
 if(carry&&veil<.95)seed(g,s.grabbing||s.guiding?pelvis.x-9:hand.x,s.grabbing||s.guiding?pelvis.y+15:hand.y+11,t,(1-veil)*.34);
 arm('r',true);
 if(carry&&!s.grabbing&&!s.guiding&&veil<.9)path(g,null,'#aa9c73',.65,c=>{c.moveTo(hand.x,hand.y+2);c.lineTo(hand.x,hand.y+9);});
 g.restore();
 }
}
window.NacreCharacter=Character;})();
