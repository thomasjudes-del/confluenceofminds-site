(function(){
'use strict';
const params=new URLSearchParams(location.search),qa=params.has('qa')||params.has('sharedqa');
let ctx=null,master=null,armed=false;
const seen=new Set();
function enabled(){try{return window.__RALUVAAA_AUDIO__?.enabled!==false}catch{return true}}
function ensure(){if(qa)return null;if(ctx)return ctx;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;ctx=new AC();master=ctx.createGain();master.gain.value=.05;master.connect(ctx.destination);return ctx}
function arm(){if(armed||qa)return;armed=true;const start=()=>{const c=ensure();if(c?.state==='suspended')c.resume().catch(()=>{});document.removeEventListener('pointerdown',start,true);document.removeEventListener('keydown',start,true)};document.addEventListener('pointerdown',start,true);document.addEventListener('keydown',start,true)}
function envGain(t,attack=.012,hold=.08,release=.34,peak=.28){const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.001,peak),t+attack);g.gain.setValueAtTime(Math.max(.001,peak*.68),t+attack+hold);g.gain.exponentialRampToValueAtTime(.0001,t+attack+hold+release);g.connect(master);return g}
function tone(freq,t,dur=.42,peak=.22,type='sine',detune=0){if(!ctx||!enabled())return;const o=ctx.createOscillator(),g=envGain(t,.014,Math.min(.11,dur*.22),Math.max(.15,dur*.63),peak);o.type=type;o.frequency.setValueAtTime(freq,t);o.detune.value=detune;o.connect(g);o.start(t);o.stop(t+dur+.08)}
function chime(notes,spacing=.055,peak=.18,type='sine'){const c=ensure();if(!c||!enabled())return;const t=c.currentTime+.015;notes.forEach((n,i)=>tone(n,t+i*spacing,.4,peak,type,i%2?3:-2))}
function low(freq=110,dur=.52,peak=.12){const c=ensure();if(!c||!enabled())return;const t=c.currentTime+.01;tone(freq,t,dur,peak,'sine');tone(freq*2.01,t+.025,dur*.7,peak*.28,'triangle')}
function sparkle(base=520,count=4){const c=ensure();if(!c||!enabled())return;const t=c.currentTime+.01;for(let i=0;i<count;i++)tone(base*(1+i*.155),t+i*.045,.25,.08,'sine',i*4)}
function key(ev){return [ev.type,ev.proposalId||'',ev.semanticId||'',ev.aSemanticId||'',ev.bSemanticId||'',ev.at||''].join('|')}
function play(ev){if(!ev||qa||!enabled())return;const k=key(ev);if(seen.has(k))return;seen.add(k);if(seen.size>300)seen.delete(seen.values().next().value);
  switch(ev.type){
    case 'create':chime([293.66,440,587.33],.075,.13);break;
    case 'evolve':chime([329.63,415.3,554.37],.06,.11);break;
    case 'split':case 'branch_add':chime([392,523.25,659.25],.045,.10);sparkle(610,3);break;
    case 'bloom':chime([392,523.25,659.25,783.99],.075,.15);setTimeout(()=>sparkle(760,6),130);break;
    case 'abandon':low(123.47,.62,.09);break;
    case 'close_lineage':low(98,.78,.10);break;
    case 'resume':case 'resume_lineage':chime([261.63,392,523.25],.07,.10);break;
    case 'correct':chime([349.23,440],.05,.07);break;
    case 'encourage':chime([523.25,659.25],.045,.075);break;
    case 'help_proposed':case 'suggest_proposed':chime([392,493.88],.055,.065);break;
    case 'connect_proposed':chime([329.63,493.88],.07,.065);break;
    case 'proposal_response':ev.decision==='accept'?chime([440,554.37,659.25],.05,.08):low(146.83,.38,.065);break;
    case 'proposal_cancelled':low(130.81,.34,.06);break;
    case 'help':chime([349.23,523.25,698.46],.06,.09);break;
    case 'connect':chime([293.66,440,587.33,739.99],.055,.10);break;
    case 'reparent':chime([261.63,392,493.88],.055,.07);break;
  }
}
window.addEventListener('raluvaaa-ritual',e=>play(e.detail));
window.__RALUVAAA_SOUND__={play,ensure,get enabled(){return enabled()},palette:['create','evolve','split','branch_add','bloom','abandon','close_lineage','resume','resume_lineage','correct','encourage','help_proposed','suggest_proposed','connect_proposed','proposal_response','proposal_cancelled','help','connect','reparent']};
arm();
})();