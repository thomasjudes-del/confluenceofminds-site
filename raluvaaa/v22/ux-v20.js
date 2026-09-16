(function(){
  'use strict';
  const frame=document.getElementById('engine');
  const detail=document.getElementById('detail');
  const overlay=document.getElementById('overlay');
  const entrusted=document.getElementById('entrusted');
  const brand=document.getElementById('brand');
  const LANG_KEY='raluvaaaLanguage';
  let lang=localStorage.getItem(LANG_KEY)||((navigator.language||'en').toLowerCase().startsWith('fr')?'fr':'en');

  const exactFR=new Map([
    ['Entrusted to you','Confiés à toi'],
    ['Living wish','Intention vivante'],
    ['Your living wish','Ton intention vivante'],
    ['Bloomed','Accompli'],
    ['Trace · let go','Trace · laissée partir'],
    ['Encourage','Encourager'],['Encouraged','Encouragé'],
    ['Help','Aider'],['Helped','Aidée'],
    ['Connect','Relier'],['Connected','Relié'],
    ['Pivot','Réorienter'],['Pivoted','Réorienté'],
    ['Split','Décomposer'],
    ['Share','Partager'],['Bloom','Accomplir'],['Let go','Laisser partir'],['Report','Signaler'],
    ['Cancel','Annuler'],['Continue','Continuer'],['Enter the world','Entrer dans le monde'],
    ['Apply help','Proposer cette aide'],['Apply pivot','Appliquer'],['Create branches','Créer les branches'],
    ['Release','Déposer'],['Flag','Signaler'],
    ['WORLD PULSE · TEST','WORLD PULSE · TEST'],
    ['MY WORLD · LOCAL TEST','MON MONDE · TEST LOCAL'],
    ['Your wishes and traces.','Tes intentions et leurs traces.'],
    ['Your wishes','Tes intentions'],['Your test actions','Tes actions de test'],
    ['WORLD PULSE · TEST','WORLD PULSE · TEST'],['The world moved.','Le monde a bougé.'],
    ['This is not a feed. Nothing here is ranked for you.','Ce n’est pas un feed. Rien ici n’est classé pour toi.'],
    ['Seeded simulated wishes','Intentions simulées au départ'],['Local test wishes','Intentions locales de test'],
    ['Routes','Chemins'],['Roots','Racines'],['Nodes','Nœuds'],['Zoom','Zoom'],
    ['Local connections','Connexions locales'],['Local blooms','Accomplissements locaux'],
    ['A living map of human intentions.','Une carte vivante des intentions humaines.'],
    ['Move through the world and meet what humans hoped for.','Explore le monde et rencontre ce que d’autres humains espèrent faire advenir.'],
    ['Every wish can change.','Chaque intention peut évoluer.'],
    ['Encourage it, help it, pivot it, split it or connect it. In this prototype those outcomes apply immediately so you can test them.','Encourage-la, aide-la, réoriente-la, décompose-la ou relie-la. Dans ce prototype, les effets sont immédiats pour pouvoir les tester.'],
    ['Wishes are entrusted to you.','Des intentions te sont confiées.'],
    ['One is short, one intermediate and one long. When their time with you ends, they return to the world.','L’une reste peu de temps, une autre quelques jours, une autre davantage. Quand leur temps avec toi se termine, elles retournent dans le monde.'],
    ['What help reaches this wish?','Quelle aide peux-tu apporter ?'],
    ['For this prototype, the help is treated as accepted immediately so you can inspect the visual result.','Pour ce prototype, l’aide est considérée comme acceptée immédiatement afin de tester son effet visuel.'],
    ['Connect this wish to another.','Relier cette intention à une autre.'],
    ['The bridge is applied immediately in this prototype.','Dans ce prototype, le pont est créé immédiatement.'],
    ['Try another direction.','Essayer une autre direction.'],
    ['For this prototype, imagine the wisher accepted the pivot.','Pour ce prototype, on considère que l’auteur accepte la réorientation.'],
    ['Turn this wish into smaller actions.','Décomposer cette intention en étapes plus petites.'],
    ['Write two to four sub-wishes, one per line. They are created immediately for testing.','Écris deux à quatre sous-intentions, une par ligne. Elles sont créées immédiatement pour le test.'],
    ['Help keep the world safe.','Aide à garder ce monde sûr.'],
    ['Hate or harassment','Haine ou harcèlement'],['Personal information','Données personnelles'],['Money or solicitation','Argent ou sollicitation'],['Sexual or violent content','Contenu sexuel ou violent'],['Spam','Spam'],['Other','Autre'],
    ['What would you like to bring into the world?','Qu’aimerais-tu faire entrer dans le monde ?'],
    ['Start with','Commencer par'],['Your intention','Ton intention'],['Place','Lieu'],
    ['No account needed in this prototype. The wish remains on this device.','Aucun compte requis dans ce prototype. Cette intention reste sur cet appareil.'],
    ['No account barrier in this prototype. Everything below is stored only on this device.','Aucun compte requis dans ce prototype. Tout ce qui suit est stocké uniquement sur cet appareil.'],
    ['No wish released from this device yet.','Aucune intention déposée depuis cet appareil.'],
    ['SIMULATED','SIMULÉ']
  ]);

  const placeholdersFR={
    'I can help by…':'Je peux aider en…',
    'First smaller action\nSecond smaller action':'Première étape\nDeuxième étape',
    'cross the Atlantic one day':'traverser l’Atlantique un jour',
    'Nantes, France':'Nantes, France'
  };

  function setText(el,value){if(el&&el.textContent!==value)el.textContent=value;}
  function walkTranslate(root){
    if(!root||lang!=='fr')return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    for(const n of nodes){
      const raw=n.nodeValue,trim=raw.trim();if(!trim)continue;
      const translated=exactFR.get(trim);
      if(translated){n.nodeValue=raw.replace(trim,translated);continue;}
      if(/ left$/.test(trim))n.nodeValue=raw.replace(trim,trim.replace(/ left$/,' restantes'));
    }
    root.querySelectorAll?.('input[placeholder],textarea[placeholder]').forEach(el=>{
      const p=el.getAttribute('placeholder');if(placeholdersFR[p])el.setAttribute('placeholder',placeholdersFR[p]);
    });
    root.querySelectorAll?.('.meta').forEach(el=>{
      el.textContent=el.textContent.replace(/\bSep\b/g,'sept.').replace(/\bAug\b/g,'août').replace(/\bOct\b/g,'oct.').replace(/\bNov\b/g,'nov.').replace(/\bDec\b/g,'déc.').replace(/\bJan\b/g,'janv.').replace(/\bFeb\b/g,'févr.').replace(/\bMar\b/g,'mars').replace(/\bApr\b/g,'avr.').replace(/\bMay\b/g,'mai').replace(/\bJun\b/g,'juin').replace(/\bJul\b/g,'juil.');
    });
  }

  function applyStatic(){
    document.documentElement.lang=lang;
    const tag=brand?.querySelector('.tag');
    if(tag)tag.innerHTML=lang==='fr'?'une carte vivante des <b>intentions humaines</b>':'a living map of <b>human intentions</b>';
    const head=entrusted?.querySelector('.entrusted-head strong');if(head)setText(head,lang==='fr'?'CONFIÉS À TOI':'ENTRUSTED TO YOU');
    document.getElementById('quickPulse')?.setAttribute('data-tooltip','World Pulse');
    document.getElementById('quickMyWorld')?.setAttribute('data-tooltip',lang==='fr'?'Mon monde':'My world');
    document.getElementById('quickRelease')?.setAttribute('data-tooltip',lang==='fr'?'Déposer une intention':'Release a wish');
    document.getElementById('quickMyWorld')?.setAttribute('aria-label',lang==='fr'?'Mon monde':'My world');
    document.getElementById('quickRelease')?.setAttribute('aria-label',lang==='fr'?'Déposer une intention':'Release a wish');
    refreshSwitch();
    if(lang==='fr'){walkTranslate(detail);walkTranslate(overlay);walkTranslate(entrusted);}
  }

  function refreshSwitch(){
    document.querySelectorAll('#langSwitch button').forEach(b=>b.classList.toggle('on',b.dataset.lang===lang));
  }

  function installSwitch(){
    if(!brand||document.getElementById('langSwitch'))return;
    const sw=document.createElement('div');sw.id='langSwitch';sw.setAttribute('aria-label','Language');
    sw.innerHTML='<button type="button" data-lang="fr">FR</button><button type="button" data-lang="en">EN</button>';
    sw.addEventListener('click',ev=>{
      const b=ev.target.closest('[data-lang]');if(!b||b.dataset.lang===lang)return;
      lang=b.dataset.lang;localStorage.setItem(LANG_KEY,lang);location.reload();
    });
    brand.appendChild(sw);refreshSwitch();
  }

  function selectedNodeId(){return frame?.contentWindow?.RV_BRIDGE?.selectedId?.()||null;}
  function effect(type,id){const bridge=frame?.contentWindow?.RV_BRIDGE;if(id&&bridge?.actionEffect)bridge.actionEffect(id,type);}

  if(detail){
    detail.addEventListener('click',ev=>{
      const btn=ev.target.closest('[data-act]');if(!btn)return;
      const id=selectedNodeId();
      if(btn.dataset.act==='encourage')setTimeout(()=>effect('encourage',id),15);
      if(btn.dataset.act==='help')detail.dataset.pendingHelp=id||'';
    },true);
  }
  if(overlay){
    overlay.addEventListener('click',ev=>{
      if(ev.target.closest('#applyH')){const id=detail?.dataset.pendingHelp||selectedNodeId();setTimeout(()=>effect('help',id),60);}
    },true);
  }

  function stateSync(){
    if(detail&&entrusted){entrusted.classList.toggle('detail-open',!detail.classList.contains('hidden'));}
    if(lang==='fr'){walkTranslate(detail);walkTranslate(overlay);walkTranslate(entrusted);}
  }

  installSwitch();applyStatic();stateSync();
  if(detail)new MutationObserver(()=>setTimeout(stateSync,0)).observe(detail,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  if(overlay)new MutationObserver(()=>setTimeout(stateSync,0)).observe(overlay,{childList:true,subtree:true});
  if(entrusted)new MutationObserver(()=>setTimeout(stateSync,0)).observe(entrusted,{childList:true,subtree:true});
})();
