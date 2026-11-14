// Small authored gestures, applied after the animation mixer and before contact IK.
export function restoreLivingPose(actor){for(const [name,q]of Object.entries(actor.lifeBase||{}))actor.bones[name].quaternion.copy(q);}
export function livingPose(actor,s,dt,pose){
 actor.lifeTime=(actor.lifeTime||0)+dt;
 const idle=pose==='idle'&&!s.finished&&!s.entrance;
 actor.idlePresence=(actor.idlePresence||0)+(Number(idle)-(actor.idlePresence||0))*(1-Math.exp(-dt*5));
 const t=actor.lifeTime,w=actor.idlePresence,b=actor.bones;
 actor.lifeBase={};for(const name of ['spine','chest','neck','head','Lupperarm','Rupperarm'])if(b[name])actor.lifeBase[name]=b[name].quaternion.clone();
 const rotate=(name,axis,amount)=>{if(b[name])b[name].rotation[axis]+=amount;};
 // Curvature is in the spine, not a tilted whole body with floating feet.
 rotate('spine','z',w*(-.15+.012*Math.sin(t*1.75)));
 rotate('chest','z',w*(-.13+.012*Math.sin(t*1.75-.5)));
 rotate('neck','z',w*.09);
 const glance=Math.pow(Math.max(0,Math.sin(t*.47-.8)),6);
 rotate('head','y',w*(-.32*glance+.025*Math.sin(t*.8)));
 rotate('Lupperarm','z',w*.035*Math.sin(t*1.75-.7));
 rotate('Rupperarm','z',w*.025*Math.sin(t*1.75+.4));
 if(s.entrance&&s.entranceLand>=0){
  const u=Math.min(1,s.entranceLand/.7),settle=1-u*u*(3-2*u);
  rotate('spine','z',-.14*settle);rotate('neck','z',.12*settle);
  rotate('head','y',-.48*Math.sin(Math.PI*u));
 }
}
