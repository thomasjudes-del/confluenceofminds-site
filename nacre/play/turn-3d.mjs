// Presentation-only angular acceleration. Substeps keep 30/60/120 Hz consistent.
export function turnStep(angle,velocity,face,dt){
 const target=face<0?Math.PI:0,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 let left=Math.max(0,Math.min(dt,.1));
 while(left>1e-8){const h=Math.min(left,1/120);left-=h;
  let d=target-angle;d=Math.atan2(Math.sin(d),Math.cos(d));
  const desired=clamp(d*14,-12,12);
  velocity+=clamp(desired-velocity,-80*h,80*h);
  const step=velocity*h;
  if(Math.sign(step)===Math.sign(d)&&Math.abs(step)>=Math.abs(d)){angle+=d;velocity=0;}
  else angle+=step;
 }
 return{angle,velocity};
}
