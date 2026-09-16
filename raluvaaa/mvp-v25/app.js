(function(){
'use strict';
const frame=document.getElementById('engine'),detail=document.getElementById('detail'),overlay=document.getElementById('overlay'),stats=document.getElementById('stats'),toastEl=document.getElementById('toast'),focusExit=document.getElementById('focusExit');
const STORE='raluvaaaManualMvpV25',defaultLang=(navigator.language||'en').toLowerCase().startsWith('fr')?'fr':'en';
const baseState={version:25,lang:defaultLang,events:[],entrusted:null};
let state=load(),semantic=[],byId=new Map(),current=null,connectSource=null,engineReady=false,focusLineageId=null;
const texts=window.RALUVAAA_SEED_WISHES||[],locs=window.RALUVAAA_SEED_LOCS||[],HOUR=3600000,DAY=86400000;
const i18n={
 en:{entrusted:'Entrusted to you',myWorld:'My world',release:'+ Release a wish',create:'Release a wish',wishLabel:'Wish',location:'Location',cancel:'Cancel',save:'Create',evolve:'Evolve',split:'Split',addBranch:'+ Branch',bloom:'Bloom',abandon:'Abandon',reattach:'Reattach',remove:'Remove mistake',share:'Share',encourage:'Encourage',help:'Help',suggest:'Suggest a branch',connect:'Connect',focus:'Focus lineage',exitFocus:'Exit lineage view',more:'More',simulated:'Simulated',mine:'My wish',alive:'Alive',abandoned:'Abandoned',bloomed:'Bloomed',from:'From',origin:'Origin',evolveTitle:'How has this wish evolved?',evolveHint:'Write the new meaningful state of the same intention.',evolveSave:'Add evolution',splitTitle:'Split this wish',splitHint:'Create at least two smaller wishes from this point.',splitSave:'Create branches',addBranchTitle:'Add another branch',addBranchHint:'This point already has branches. Add one or more new sub-wishes without replacing the existing ones.',addBranchSave:'Add branch',helpTitle:'Offer concrete help',helpHint:'Keep it short and practical.',helpSave:'Offer help',suggestTitle:'Suggest a branch',suggestHint:'Suggest one or more useful smaller steps. This does not change the wish until the wisher accepts it.',suggestSave:'Send suggestion',createHint:'Write one thing you genuinely want to do, become, change, learn, create or accomplish.',reattachTitle:'Reattach this branch',reattachHint:'Choose another living point in the same lineage. You can also drag one of your nodes onto another node in the graph.',reattachSave:'Reattach',chooseConnection:'Choose another wish in the world',connectConfirm:'Connect these two wish lineages?',connectSave:'Create connection',reset:'Reset local test',emptyWorld:'No local wishes yet.',rootWishes:'Root wishes',wishStates:'Wish states',blooms:'Blooms',abandons:'Abandoned',helps:'Help traces',warps:'Connections',local:'Local wishes',encouraged:'Encouraged',helped:'Help offered',suggested:'Suggestion sent',connected:'Connected',copied:'Link copied',sameText:'The new state must actually differ from the current one.',needSplit:'Add at least two sub-wishes for the first split.',needBranch:'Add at least one new branch.',cannotReattach:'No valid living parent is available.',sameLineage:'Choose a wish from another lineage.',confirmBloom:'Confirm this wish or sub-wish has been accomplished?',confirmAbandon:'Abandon this branch while keeping its trace?',confirmRemove:'Remove this mistaken node and its descendants from your local test? This is correction, not abandonment.',removed:'Mistake removed',testReset:'Reset only your local V25 test events?',alreadyContinued:'This state already has a continuation. Continue from the newer state, or add a branch here instead.',existingBranches:'Existing branches'} ,
 fr:{entrusted:'Confiés à vous',myWorld:'Mon monde',release:'+ Déposer un wish',create:'Déposer un wish',wishLabel:'Wish',location:'Lieu',cancel:'Annuler',save:'Créer',evolve:'Faire évoluer',split:'Décomposer',addBranch:'+ Branche',bloom:'Faire fleurir',abandon:'Abandonner',reattach:'Rattacher',remove:'Corriger une erreur',share:'Partager',encourage:'Encourager',help:'Aider',suggest:'Suggérer une branche',connect:'Connecter',focus:'Voir la lignée',exitFocus:'Quitter la vue lignée',more:'Plus',simulated:'Simulé',mine:'Mon wish',alive:'Vivant',abandoned:'Abandonné',bloomed:'Fleuri',from:'Depuis',origin:'Origine',evolveTitle:'Comment ce wish a-t-il évolué ?',evolveHint:'Écrivez le nouvel état significatif de la même intention.',evolveSave:'Ajouter cette évolution',splitTitle:'Décomposer ce wish',splitHint:'Créez au moins deux sous-wishes plus petits depuis ce point.',splitSave:'Créer les branches',addBranchTitle:'Ajouter une branche',addBranchHint:'Ce point a déjà des branches. Ajoutez un ou plusieurs nouveaux sous-wishes sans remplacer les précédents.',addBranchSave:'Ajouter',helpTitle:'Proposer une aide concrète',helpHint:'Courte, pratique et directement utile.',helpSave:'Proposer cette aide',suggestTitle:'Suggérer une branche',suggestHint:'Suggérez une ou plusieurs petites étapes utiles. Cela ne modifie pas le wish tant que le wisher ne l’accepte pas.',suggestSave:'Envoyer la suggestion',createHint:'Écrivez une chose que vous voulez réellement faire, devenir, changer, apprendre, créer ou accomplir.',reattachTitle:'Rattacher cette branche',reattachHint:'Choisissez un autre point vivant de la même lignée. Vous pouvez aussi faire glisser un de vos nœuds sur un autre dans le graphe.',reattachSave:'Rattacher',chooseConnection:'Choisissez un autre wish dans le monde',connectConfirm:'Connecter ces deux lignées de wishes ?',connectSave:'Créer la connexion',reset:'Réinitialiser le test local',emptyWorld:'Aucun wish local pour le moment.',rootWishes:'Wishes racines',wishStates:'États de wish',blooms:'Floraisons',abandons:'Abandons',helps:'Traces d’aide',warps:'Connexions',local:'Wishes locaux',encouraged:'Encouragé',helped:'Aide proposée',suggested:'Suggestion envoyée',connected:'Connecté',copied:'Lien copié',sameText:'Le nouvel état doit réellement différer de l’état actuel.',needSplit:'Ajoutez au moins deux sous-wishes pour la première décomposition.',needBranch:'Ajoutez au moins une nouvelle branche.',cannotReattach:'Aucun parent vivant valide disponible.',sameLineage:'Choisissez un wish appartenant à une autre lignée.',confirmBloom:'Confirmer que ce wish ou sous-wish est accompli ?',confirmAbandon:'Abandonner cette branche tout en gardant sa trace ?',confirmRemove:'Retirer ce nœud créé par erreur et ses descendants de votre test local ? Ceci est une correction, pas un abandon.',removed:'Erreur corrigée',testReset:'Réinitialiser uniquement vos événements locaux V25 ?',alreadyContinued:'Cet état a déjà une continuation. Continuez depuis l’état plus récent, ou ajoutez une branche ici.',existingBranches:'Branches existantes'}
};
function T(k){return i18n[state.lang]?.[k]||i18n.en[k]||k}
function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
function load(){try{return Object.assign({},baseState,JSON.parse(localStorage.getItem(STORE)||'{}'))}catch{return{...baseState,events:[]}}}
function save(){localStorage.setItem(STORE,JSON.stringify(state))}
function uid(prefix){return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)}
function seed(s){let h=2166136261>>>0;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function send(data){if(engineReady)frame.contentWindow.postMessage(data,location.origin)}
function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show-toast');clearTimeout(toast._t);toast._t=setTimeout(()=>toastEl.classList.remove('show-toast'),1900)}
function closeOverlay(){overlay.innerHTML=''}
function closeDetail(){detail.classList.add('hidden');current=null;send({type:'rv25-clear'})}
function modal(title,body,actions){overlay.innerHTML=`<div class="scrim"></div><section class="sheet glass"><h3>${esc(title)}</h3>${body}<div class="sheet-actions">${actions}</div></section>`;overlay.querySelector('.scrim').onclick=closeOverlay}
function renderLanguage(){document.querySelectorAll('[data-lang]').forEach(b=>b.classList.toggle('active',b.dataset.lang===state.lang));document.getElementById('entrustedLabel').textContent=T('entrusted');document.getElementById('myWorldBtn').textContent=T('myWorld');document.getElementById('createBtn').textContent=T('release');focusExit.textContent=T('exitFocus');if(current)renderDetail(current);renderEntrusted()}
function formatState(m){if(m.state==='bloom')return T('bloomed');if(m.state==='abandoned')return T('abandoned');return T('alive')}
function lineage(m){return semantic.filter(x=>x.lineageId===m.lineageId)}
function rootFor(m){return lineage(m).find(x=>x.kind==='create')||m}
function parentFor(m){return m.parentSemanticId?byId.get(m.parentSemanticId):null}
function directChildren(m,kind){return lineage(m).filter(x=>x.parentSemanticId===m.semanticId&&(!kind||x.kind===kind))}
function descendants(m){const out=new Set([m.semanticId]);let changed=true;while(changed){changed=false;for(const x of lineage(m)){if(x.parentSemanticId&&out.has(x.parentSemanticId)&&!out.has(x.semanticId)){out.add(x.semanticId);changed=true}}}return out}
function renderStats(s){stats.innerHTML=[[T('rootWishes'),s.roots||0],[T('wishStates'),s.states||0],[T('blooms'),s.blooms||0],[T('abandons'),s.abandoned||0],[T('helps'),s.helps||0],[T('warps'),s.warps||0],[T('local'),s.localRoots||0]].map(([k,v])=>`<span>${esc(k)}</span><b>${v}</b>`).join('')}
function renderDetail(m){
 current=m;const root=rootFor(m),parent=parentFor(m),branches=directChildren(m,'split').length,continued=directChildren(m,'evolve').length>0;
 const chips=[m.kind,m.state,branches?`${branches} branch${branches>1?'es':''}`:null,m.helpCount?`${m.helpCount} help`:null,m.suggestionCount?`${m.suggestionCount} suggestion`:null,m.encouragements?`${m.encouragements} encourage`:null,m.warpCount?`${m.warpCount} connect`:null].filter(Boolean);
 let main='',more='';
 if(m.owner){
   if(m.state==='alive'){
     if(!continued)main+=`<button data-act="evolve">${T('evolve')}</button>`;
     main+=`<button data-act="${branches?'addBranch':'split'}">${branches?T('addBranch'):T('split')}</button><button data-act="bloom">${T('bloom')}</button>`;
   }else main+=`<button data-act="focus">${T('focus')}</button><button data-act="share">${T('share')}</button>`;
   more=`<button data-act="focus">${T('focus')}</button>${m.kind!=='create'?`<button data-act="reattach">${T('reattach')}</button>`:''}${m.state==='alive'?`<button data-act="abandon" class="danger">${T('abandon')}</button>`:''}<button data-act="remove" class="danger">${T('remove')}</button><button data-act="share">${T('share')}</button>`;
 }else{
   main=`<button data-act="encourage">${T('encourage')}</button>${m.state==='alive'?`<button data-act="help">${T('help')}</button><button data-act="suggest">${T('suggest')}</button>`:''}`;
   more=`<button data-act="connect">${T('connect')}</button><button data-act="focus">${T('focus')}</button><button data-act="share">${T('share')}</button>`;
 }
 const actions=`<div class="node-actions">${main}</div><details class="more-actions"><summary>${T('more')}</summary><div class="more-grid">${more}</div></details>`;
 detail.innerHTML=`<div class="head"><div><div class="eyebrow">${m.owner?T('mine'):T('simulated')} · ${esc(formatState(m))}</div><div class="wish">${esc(m.text)}</div><div class="meta">${esc(m.loc||'')}<br>${T('origin')}: ${esc(root.text)}${parent?`<br>${T('from')}: ${esc(parent.text)}`:''}</div></div><button class="close" id="detailClose">×</button></div><div class="chips">${chips.map(x=>`<span class="chip">${esc(x)}</span>`).join('')}</div>${actions}`;
 detail.classList.remove('hidden');document.getElementById('detailClose').onclick=closeDetail;detail.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>action(b.dataset.act,m));
}
function commit(ev,focusSemanticId){state.events.push(ev);save();send({type:'rv25-event',event:ev,focusSemanticId})}
function action(kind,m){
 if(kind==='evolve'){if(directChildren(m,'evolve').length){toast(T('alreadyContinued'));return}return evolveModal(m)}
 if(kind==='split')return branchModal(m,false);
 if(kind==='addBranch')return branchModal(m,true);
 if(kind==='bloom'){if(confirm(T('confirmBloom')))commit({type:'bloom',semanticId:m.semanticId,seed:seed('bloom|'+m.semanticId+'|'+state.events.length)},m.semanticId);return}
 if(kind==='abandon'){if(confirm(T('confirmAbandon')))commit({type:'abandon',semanticId:m.semanticId},m.semanticId);return}
 if(kind==='reattach')return reattachModal(m);
 if(kind==='remove')return removeMistake(m);
 if(kind==='encourage'){commit({type:'encourage',semanticId:m.semanticId},m.semanticId);toast(T('encouraged'));return}
 if(kind==='help')return helpModal(m);
 if(kind==='suggest')return suggestModal(m);
 if(kind==='connect'){connectSource=m;closeDetail();toast(T('chooseConnection'));return}
 if(kind==='focus')return setFocus(m.lineageId);
 if(kind==='share')return share(m);
}
function createModal(){
 modal(T('create'),`<p>${esc(T('createHint'))}</p><div class="field"><label>${T('wishLabel')}</label><textarea id="wishInput" maxlength="240" autofocus></textarea></div><div class="field"><label>${T('location')}</label><input id="locInput" maxlength="80" placeholder="Nantes, France"></div>`,`<button id="cancel">${T('cancel')}</button><button id="confirm" class="primary">${T('save')}</button>`);
 document.getElementById('cancel').onclick=closeOverlay;document.getElementById('confirm').onclick=()=>{const text=document.getElementById('wishInput').value.trim(),loc=document.getElementById('locInput').value.trim()||'Local test';if(!text)return;const lineageId=uid('lineage'),semanticId=uid('wish');closeOverlay();commit({type:'create',lineageId,semanticId,text,loc,seed:seed(lineageId)},semanticId)};
}
function evolveModal(m){
 modal(T('evolveTitle'),`<p>${esc(T('evolveHint'))}</p><div class="field"><textarea id="evolveInput" maxlength="240">${esc(m.text)}</textarea></div>`,`<button id="cancel">${T('cancel')}</button><button id="confirm" class="primary">${T('evolveSave')}</button>`);
 document.getElementById('cancel').onclick=closeOverlay;document.getElementById('confirm').onclick=()=>{const text=document.getElementById('evolveInput').value.trim();if(!text)return;if(text===m.text.trim()){toast(T('sameText'));return}const semanticId=uid('state');closeOverlay();commit({type:'evolve',semanticId,lineageId:m.lineageId,parentSemanticId:m.semanticId,text,loc:m.loc,seed:seed(semanticId)},semanticId)};
}
function branchModal(m,append){
 const existing=directChildren(m,'split').length,title=append?T('addBranchTitle'):T('splitTitle'),hint=append?`${T('addBranchHint')} ${T('existingBranches')}: ${existing}.`:T('splitHint');
 modal(title,`<p>${esc(hint)}</p><div class="field"><textarea id="splitInput" placeholder="${append?'Another useful branch':'First smaller wish\nSecond smaller wish\nThird smaller wish'}"></textarea></div>`,`<button id="cancel">${T('cancel')}</button><button id="confirm" class="primary">${append?T('addBranchSave'):T('splitSave')}</button>`);
 document.getElementById('cancel').onclick=closeOverlay;document.getElementById('confirm').onclick=()=>{const lines=document.getElementById('splitInput').value.split('\n').map(x=>x.trim()).filter(Boolean);if(!append&&lines.length<2){toast(T('needSplit'));return}if(append&&lines.length<1){toast(T('needBranch'));return}const children=lines.slice(0,5).map(text=>{const semanticId=uid('subwish');return{semanticId,text,loc:m.loc,seed:seed(semanticId)}});closeOverlay();commit({type:append?'branch_add':'split',lineageId:m.lineageId,parentSemanticId:m.semanticId,children},children[0].semanticId)};
}
function helpModal(m){
 modal(T('helpTitle'),`<p>${esc(T('helpHint'))}</p><div class="field"><textarea id="helpInput" maxlength="240"></textarea></div>`,`<button id="cancel">${T('cancel')}</button><button id="confirm" class="primary">${T('helpSave')}</button>`);
 document.getElementById('cancel').onclick=closeOverlay;document.getElementById('confirm').onclick=()=>{const note=document.getElementById('helpInput').value.trim();if(!note)return;closeOverlay();commit({type:'help',semanticId:m.semanticId,note,seed:seed('help|'+m.semanticId+'|'+state.events.length)},m.semanticId);toast(T('helped'))};
}
function suggestModal(m){
 modal(T('suggestTitle'),`<p>${esc(T('suggestHint'))}</p><div class="field"><textarea id="suggestInput" placeholder="One smaller useful step"></textarea></div>`,`<button id="cancel">${T('cancel')}</button><button id="confirm" class="primary">${T('suggestSave')}</button>`);
 document.getElementById('cancel').onclick=closeOverlay;document.getElementById('confirm').onclick=()=>{const suggestions=document.getElementById('suggestInput').value.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,4);if(!suggestions.length)return;closeOverlay();commit({type:'suggest_split',semanticId:m.semanticId,suggestions,seed:seed('suggest|'+m.semanticId+'|'+state.events.length)},m.semanticId);toast(T('suggested'))};
}
function validReattachOptions(m){const desc=descendants(m);return lineage(m).filter(x=>x.semanticId!==m.semanticId&&!desc.has(x.semanticId)&&x.state==='alive')}
function reattachModal(m){
 const options=validReattachOptions(m);if(!options.length){toast(T('cannotReattach'));return}
 modal(T('reattachTitle'),`<p>${esc(T('reattachHint'))}</p><div class="field"><select id="parentSelect">${options.map(x=>`<option value="${esc(x.semanticId)}">${esc(x.text)}</option>`).join('')}</select></div>`,`<button id="cancel">${T('cancel')}</button><button id="confirm" class="primary">${T('reattachSave')}</button>`);
 document.getElementById('cancel').onclick=closeOverlay;document.getElementById('confirm').onclick=()=>{const newParentSemanticId=document.getElementById('parentSelect').value;closeOverlay();commit({type:'reparent',semanticId:m.semanticId,newParentSemanticId,seed:seed('reparent|'+m.semanticId+'|'+newParentSemanticId)},m.semanticId)};
}
function confirmDragReattach(sourceId,targetId){const source=byId.get(sourceId),target=byId.get(targetId);if(!source||!target||!source.owner||source.lineageId!==target.lineageId)return;modal(T('reattachTitle'),`<p><b>${esc(source.text)}</b><br>↓<br><b>${esc(target.text)}</b></p>`,`<button id="cancel">${T('cancel')}</button><button id="confirm" class="primary">${T('reattachSave')}</button>`);document.getElementById('cancel').onclick=closeOverlay;document.getElementById('confirm').onclick=()=>{closeOverlay();commit({type:'reparent',semanticId:source.semanticId,newParentSemanticId:target.semanticId,seed:seed('drag-reparent|'+source.semanticId+'|'+target.semanticId)},source.semanticId)}}
function removeMistake(m){
 if(!m.owner||!confirm(T('confirmRemove')))return;const ids=descendants(m),next=[];
 for(const ev of state.events){
   if(['create','evolve'].includes(ev.type)&&ids.has(ev.semanticId))continue;
   if(['split','branch_add'].includes(ev.type)){
     if(ids.has(ev.parentSemanticId))continue;
     const children=(ev.children||[]).filter(c=>!ids.has(c.semanticId));if(children.length!==(ev.children||[]).length){if(children.length)next.push({...ev,children});continue}
   }
   if(['bloom','abandon','encourage','help','suggest_split'].includes(ev.type)&&ids.has(ev.semanticId))continue;
   if(ev.type==='connect'&&(ids.has(ev.aSemanticId)||ids.has(ev.bSemanticId)))continue;
   if(ev.type==='reparent'&&(ids.has(ev.semanticId)||ids.has(ev.newParentSemanticId)))continue;
   next.push(ev);
 }
 state.events=next;save();closeDetail();send({type:'rv25-rebuild',events:state.events});toast(T('removed'));
}
function share(m){const u=new URL(location.href);u.hash='wish='+encodeURIComponent(m.semanticId);navigator.clipboard?.writeText(u.href).then(()=>toast(T('copied'))).catch(()=>{prompt('Copy link',u.href)})}
function connectConfirm(target){if(!connectSource)return;const source=connectSource;connectSource=null;if(source.lineageId===target.lineageId){toast(T('sameLineage'));return}modal(T('connectConfirm'),`<p><b>${esc(source.text)}</b><br>↔<br><b>${esc(target.text)}</b></p>`,`<button id="cancel">${T('cancel')}</button><button id="confirm" class="primary">${T('connectSave')}</button>`);document.getElementById('cancel').onclick=closeOverlay;document.getElementById('confirm').onclick=()=>{closeOverlay();commit({type:'connect',aSemanticId:source.semanticId,bSemanticId:target.semanticId,seed:seed('connect|'+source.semanticId+'|'+target.semanticId)},source.semanticId);toast(T('connected'))}}
function setFocus(lineageId){focusLineageId=lineageId||null;focusExit.classList.toggle('hidden',!focusLineageId);send({type:'rv25-lineage-focus',lineageId:focusLineageId});if(current&&current.lineageId===focusLineageId)closeDetail()}
function myWorld(){const roots=semantic.filter(m=>m.owner&&m.kind==='create');modal(T('myWorld'),`<div id="myworld">${roots.length?roots.map(m=>`<button class="mywish" data-id="${esc(m.semanticId)}"><span>${esc(m.text)}</span><span>${lineage(m).length} nodes</span></button>`).join(''):`<p>${T('emptyWorld')}</p>`}</div><div class="field"><button id="resetLocal" class="mywish"><span>${T('reset')}</span><span>V25</span></button></div>`,`<button id="cancel">${T('cancel')}</button>`);document.getElementById('cancel').onclick=closeOverlay;overlay.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{closeOverlay();send({type:'rv25-focus',semanticId:b.dataset.id})});document.getElementById('resetLocal').onclick=()=>{if(confirm(T('testReset'))){state.events=[];state.entrusted=null;save();location.reload()}}}
function ensureEntrusted(){const roots=semantic.filter(m=>m.simulated&&m.kind==='create');if(!roots.length)return;const now=Date.now();if(!Array.isArray(state.entrusted)||state.entrusted.length!==3||state.entrusted.some(x=>x.expires<=now||!byId.has(x.semanticId))){const bands=[8*HOUR,4*DAY,14*DAY],used=new Set();state.entrusted=bands.map((dur,i)=>{let idx=(seed('entrusted|'+now.toString().slice(0,8)+'|'+i)%roots.length);while(used.has(roots[idx].semanticId))idx=(idx+1)%roots.length;used.add(roots[idx].semanticId);return{semanticId:roots[idx].semanticId,expires:now+dur}});save()}renderEntrusted()}
function remain(ms){const h=Math.max(0,Math.floor(ms/HOUR));if(h<24)return h+'h';return Math.floor(h/24)+'d '+(h%24)+'h'}
function renderEntrusted(){const grid=document.getElementById('entrustedGrid');if(!grid)return;grid.innerHTML=(state.entrusted||[]).map(x=>{const m=byId.get(x.semanticId);if(!m)return'';return`<button class="entrusted-item" data-id="${esc(m.semanticId)}"><div class="t">${esc(m.text)}</div><div class="m">${remain(x.expires-Date.now())}</div></button>`}).join('');grid.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>send({type:'rv25-focus',semanticId:b.dataset.id}))}
function injectRuntime(){const doc=frame.contentDocument;if(!doc)return;const style=doc.createElement('style');style.textContent='.top-left,.top-center,.bottom-left,.bottom-right,.node-card,.scale,.lod{display:none!important}.minimap{display:block!important}.side{display:grid!important}';doc.head.appendChild(style);const s=doc.createElement('script');s.src='/raluvaaa/mvp-v25/engine-runtime.js?build=v25-20260916';doc.body.appendChild(s)}
frame.addEventListener('load',()=>{try{injectRuntime()}catch(err){console.error(err)}});
window.addEventListener('message',e=>{
 if(e.origin!==location.origin)return;
 if(e.data?.type==='rv25-runtime-ready'){engineReady=true;send({type:'rv25-init',texts,locs,events:state.events})}
 if(e.data?.type==='rv25-snapshot'){semantic=e.data.semantic||[];byId=new Map(semantic.map(m=>[m.semanticId,m]));renderStats(e.data.stats||{});ensureEntrusted();if(location.hash.startsWith('#wish=')){const id=decodeURIComponent(location.hash.slice(6));if(byId.has(id))send({type:'rv25-focus',semanticId:id})}}
 if(e.data?.type==='rv25-select'){const m=e.data.meta;if(connectSource&&m.semanticId!==connectSource.semanticId){connectConfirm(m);return}renderDetail(m)}
 if(e.data?.type==='rv25-blank'&&!connectSource)closeDetail();
 if(e.data?.type==='rv25-reparent-request')confirmDragReattach(e.data.sourceSemanticId,e.data.targetSemanticId);
});
document.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>{state.lang=b.dataset.lang;save();renderLanguage()});
document.getElementById('createBtn').onclick=createModal;document.getElementById('myWorldBtn').onclick=myWorld;focusExit.onclick=()=>setFocus(null);renderLanguage();setInterval(renderEntrusted,60000);
})();
