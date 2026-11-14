/* Original authored lighting cues. Pure world-position envelopes, no gameplay state changes. */
import * as T from './vendor/three/three.module.js';
const smooth=T.MathUtils.smoothstep,blend=T.MathUtils.lerp;
export function lightingAt(x){
 const hall=smooth(x,48,62)*(1-smooth(x,82,100));
 const shelter=smooth(x,71.5,75)*(1-smooth(x,81.5,85));
 const basin=smooth(x,98,105)*(1-smooth(x,119,125));
 const dawn=smooth(x,117,125);
 return {hall,shelter,basin,dawn,
  ambient:.64-.22*shelter+.06*dawn,
  key:(2.6-.75*hall-.8*basin)*(1-.55*shelter)+1.25*dawn,
  fill:.78-.2*shelter+.14*basin,
  rim:1.9+.45*basin+.3*shelter,
  fogDensity:.026+.007*basin-.005*dawn,
  keyHeight:16-5*basin-3*dawn};
}
export class ConservatoryLight {
 constructor(art){
  this.art=art;
  this.colors={key:new T.Color('#ffe5b9'),hall:new T.Color('#edaa69'),water:new T.Color('#9dbdcf'),dawn:new T.Color('#ffd09a'),
   fog:new T.Color('#193637'),hallFog:new T.Color('#352e28'),waterFog:new T.Color('#142d40'),dawnFog:new T.Color('#554639'),
   sky:new T.Color('#a9c9c7'),blueSky:new T.Color('#769bb6'),pearl:new T.Color('#e7d6bb'),rim:new T.Color('#72c6cc')};
  // Fixed shore light belongs to the existing amber bay, never follows the actor.
  this.shore=new T.PointLight('#ffd29a',65,18,2);
  this.shore.position.set(124,3.8,-3.6);
  this.shore.castShadow=false;art.scene.add(this.shore);
 }
 update(s){
  const a=this.art,x=s.x/60,c=this.colors,p=lightingAt(x);
  a.ambient.intensity=p.ambient;
  a.ambient.color.copy(c.sky).lerp(c.blueSky,p.basin*.6).lerp(c.pearl,p.dawn*.5);
  a.sun.intensity=p.key;a.sun.position.y=p.keyHeight;
  a.sun.color.copy(c.key).lerp(c.hall,p.hall*.65).lerp(c.water,p.basin*.85).lerp(c.dawn,p.dawn);
  a.fill.intensity=p.fill;a.fill.color.copy(c.sky).lerp(c.water,p.basin*.65).lerp(c.pearl,p.dawn);
  a.rim.intensity=p.rim;a.rim.color.copy(c.rim).lerp(c.water,p.basin*.55).lerp(c.pearl,p.dawn*.7);
  a.scene.fog.color.copy(c.fog).lerp(c.hallFog,p.hall*.65).lerp(c.waterFog,p.basin).lerp(c.dawnFog,p.dawn);
  a.scene.fog.density=p.fogDensity;a.scene.background.copy(a.scene.fog.color);
  this.state=p;
 }
}
