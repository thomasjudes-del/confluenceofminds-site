/* Immersive web entry. Never promises control of Safari or an embedded browser. */
(function(r){'use strict';
function standalone(w){return !!(w.navigator?.standalone||w.matchMedia?.('(display-mode: standalone)').matches||w.matchMedia?.('(display-mode: fullscreen)').matches);}
async function enter(w,d){if(standalone(w)||d.fullscreenElement||d.webkitFullscreenElement)return true;const el=d.documentElement,request=el.requestFullscreen||el.webkitRequestFullscreen;if(!request)return false;try{await request.call(el);return true;}catch{return false;}}
const api={standalone,enter};if(typeof module!=='undefined')module.exports=api;if(!r.document)return;
const d=r.document;let help;
function showHelp(){d.dispatchEvent(new Event('nacre-mode-help'));if(!help){help=d.createElement('dialog');help.className='install-dialog';help.innerHTML='<form method="dialog"><button class="install-close" aria-label="Fermer">×</button><h2>Ouvrir l’horizon.</h2><p>Sur iPhone, ouvrez ce lien dans <strong>Safari</strong>, puis :</p><ol><li>Partager → Sur l’écran d’accueil.</li><li>Activez <strong>Ouvrir comme app web</strong>, puis Ajouter.</li><li>Lancez NACRE depuis son icône et tournez le téléphone.</li></ol><p>La fenêtre intégrée à ChatGPT garde ses propres barres. Le jeu ne peut pas les masquer.</p><button class="primary">COMPRIS</button></form>';d.body.append(help);}help.showModal();}
api.start=()=>enter(r,d);api.showHelp=showHelp;r.NacreGameMode=api;
for(const target of d.querySelectorAll('#intro .intro-inner,#pauseMenu .menu-inner')){const button=d.createElement('button');button.className='text-button immersive-entry';button.textContent=standalone(r)?'MODE APP ACTIF':'JOUER EN PLEIN ÉCRAN';button.onclick=async()=>{if(!await enter(r,d))showHelp();};target.append(button);}
const bar=d.querySelector('#hud .tools');if(bar){const b=d.createElement('button');b.textContent='⛶';b.title='Plein écran';b.setAttribute('aria-label','Ouvrir le jeu en plein écran');b.onclick=async()=>{if(!await enter(r,d))showHelp();};bar.prepend(b);}
})(typeof window!=='undefined'?window:globalThis);
