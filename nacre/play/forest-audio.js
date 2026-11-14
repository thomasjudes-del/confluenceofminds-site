(function(r){'use strict';
function barkCue(s){if(s.paused||s.finished||s.respawn||s.x<5000||s.x>7300)return null;const chasing=s.hunterTime>=0;return {name:'dog',gain:s.swimming?.18:chasing?.40:.16,rate:.92,sourceX:chasing?s.hunterX:5070,range:900,distant:!chasing};}
const api={barkCue};if(typeof module!=='undefined')module.exports=api;r.NacreForestSound=api;if(!r.WorldAudio)return;
r.ForestAudio=class extends r.WorldAudio{
 constructor(){super();this.barkIn=0;}
 async start(restart=false){if(restart){this.foley.stop();this.barkIn=0;}const pending=super.start(restart);if(this.ctx&&!this.barkLoading)this.barkLoading=fetch('assets/foley/dog.mp3').then(q=>{if(!q.ok)throw Error('dog recording unavailable');return q.arrayBuffer();}).then(b=>this.ctx.decodeAudioData(b)).then(b=>this.foley.buffers.dog=b).catch(()=>this.foley.status='partial');await pending;}
 tick(s,dt){const q={...s,chapter:'forest'};super.tick(q,dt);if(s.paused||s.finished||s.respawn)return;this.barkIn-=dt;const cue=barkCue(s);if(cue&&this.barkIn<=0){this.foley.play(cue,q);this.barkIn=s.hunterTime>=0?3.2:6;}}
};
})(typeof window!=='undefined'?window:globalThis);
