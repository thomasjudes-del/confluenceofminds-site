(function(){'use strict';class FrontierArt{
constructor(canvas){this.canvas=canvas;this.g=canvas.getContext('2d');this.actor=new NacreCharacter();this.images={};for(const k of ['desert','red']){this.images[k]=new Image();this.images[k].src='assets/'+(k==='red'?'cistern':'desert')+'-v3.webp';}this.cam=0;this.cameraReady=false;this.resize();}
resize(){this.vw=1280;this.vh=720;this.canvas.width=1280;this.canvas.height=720;}
render(s,dt){const g=this.g,red=s.chapter==='red',im=this.images[s.chapter],target=Math.max(0,Math.min(red?1240:2020,s.x-410+s.vx*.16));if(!this.cameraReady){this.cam=target;this.cameraReady=true;}this.cam+=(target-this.cam)*(1-Math.exp(-dt*3.2));g.fillStyle=red?'#210b0b':'#b78c4d';g.fillRect(0,0,1280,720);
if(im.complete&&im.naturalWidth){const w=1520,h=w*im.height/im.width;g.drawImage(im,-this.cam*.095,510-h*.79,w,h);}
// Dust and spores inhabit three depth planes; simulation objects remain in the foreground.
for(let i=0;i<48;i++){const x=((i*277+s.time*(red?7:30)-this.cam*.22)%1400+1400)%1400-60,y=80+(i*71)%450+Math.sin(s.time+i)*9;g.globalAlpha=.10+(i%4)*.035;g.fillStyle=red?'#ffc481':'#fff5cf';g.fillRect(x,y,i%3+1,1);}g.globalAlpha=1;
g.save();g.translate(-this.cam,0);
const floor=(a,b,y)=>{const grad=g.createLinearGradient(0,y,0,y+210);grad.addColorStop(0,red?'#57281e':'#947343');grad.addColorStop(.07,red?'#26100e':'#54432f');grad.addColorStop(1,red?'#0e0709':'#292720');g.fillStyle=grad;g.beginPath();g.moveTo(a,y);for(let x=a;x<b;x+=19)g.lineTo(x,y+Math.sin(x*1.72)*2);g.lineTo(b,y);g.lineTo(b,780);g.lineTo(a,780);g.fill();g.save();g.clip();if(im.complete&&im.naturalWidth){g.globalAlpha=.72;g.drawImage(im,0,im.height*.81,im.width,im.height*.19,a,y,b-a,220);g.globalAlpha=1;const shade=g.createLinearGradient(0,y,0,y+210);shade.addColorStop(0,'#00000000');shade.addColorStop(1,red?'#10070bf5':'#292720ed');g.fillStyle=shade;g.fillRect(a,y,b-a,230);}g.restore();g.strokeStyle=red?'#b264434b':'#f9dea073';g.lineWidth=2;g.beginPath();g.moveTo(a,y);g.lineTo(b,y);g.stroke();for(let x=a+11;x<b;x+=37){g.strokeStyle=red?'#9d513423':'#eacb7a26';g.beginPath();g.moveTo(x,y+12);g.lineTo(x+7,y+29);g.lineTo(x+4,y+43);g.stroke();}};
if(!red){floor(0,1320,510);floor(1660,3300,510);
 // Counterweighted nacre ribs unfold into a load-bearing bridge.
 for(let i=0;i<12;i++){g.save();g.translate(1320+i*29,512+(1-s.bridge)*135);g.rotate(-(1-s.bridge)*1.25);g.fillStyle='#b9a07b';g.strokeStyle='#efddb394';g.lineWidth=2;g.beginPath();g.moveTo(-3,0);g.quadraticCurveTo(15,-12,32,-2);g.lineTo(31,12);g.lineTo(0,13);g.closePath();g.fill();g.stroke();g.restore();}
 g.strokeStyle=s.bridge>.8?'#fff0b5':'#88754f';g.lineWidth=3;g.beginPath();g.moveTo(1080,510);g.lineTo(1160,510);g.lineTo(1270,541);g.lineTo(1480,560);g.stroke();
 NacreProps.draw(g,'fossil',s.stoneX-43,429,86,81,'sand');
 for(const x of [1900,2450,2910]){g.strokeStyle='#79613e';g.lineWidth=14;g.beginPath();g.moveTo(x,520);g.bezierCurveTo(x-30,450,x-26,375,x+35,330);g.stroke();g.strokeStyle='#eed79b77';g.lineWidth=2;g.stroke();}
}else{floor(0,700,510);floor(1300,2500,340);const y=560-s.water*220;
 for(const x of [890,1180])NacreProps.cable(g,x,100,y+15,'red');
 NacreProps.draw(g,'lift',850,y-8,370,104,'red');
 NacreProps.draw(g,'valve',500,425,63,85,'red');
 if(s.grabbing){g.fillStyle='#f5b56966';g.beginPath();g.arc(532,449,8,0,Math.PI*2);g.fill();}
 g.strokeStyle='#b25336';g.lineWidth=7;for(let i=0;i<7;i++){g.beginPath();g.moveTo(1880+i*9,40);g.bezierCurveTo(1850+i*11,130,1930+i*7,200,1880+i*9,s.gate?220:341);g.stroke();}
}
this.actor.update(s,dt);this.actor.draw(g,s,s.time,()=>{});
if(red){const y=600-s.water*130;const water=g.createLinearGradient(0,y,0,720);water.addColorStop(0,'#b0442b55');water.addColorStop(1,'#18090cf5');g.fillStyle=water;g.fillRect(700,y,600,720-y);g.strokeStyle='#ff9c605a';g.lineWidth=1;for(let i=0;i<19;i++){g.beginPath();const x=710+(i*97)%560;g.moveTo(x,y+i*6);g.lineTo(x+35+Math.sin(s.time*2+i)*20,y+i*6);g.stroke();}}
g.restore();const vignette=g.createRadialGradient(640,360,250,640,360,750);vignette.addColorStop(0,'#00000000');vignette.addColorStop(1,red?'#080309ad':'#34210860');g.fillStyle=vignette;g.fillRect(0,0,1280,720);
}
}window.NacreFrontierArt=FrontierArt;})();
