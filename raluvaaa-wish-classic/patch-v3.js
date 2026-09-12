/* Immediate completed-state refresh for one-shot contributions. */
(function(){
  proposal=function(type,w){
    const copy=type==='HELP'?['Offer something concrete.','I may be able to help by…']:type==='PIVOT'?['Suggest another direction.','What if the path became…']:['Suggest smaller steps.','A first smaller step could be…'];
    modal(`<div class="eyebrow">${type} · SUGGESTION</div><h2>${copy[0]}</h2><p>You cannot change someone else’s wish. You can only offer a possibility.</p><label>Your note</label><textarea class="field" id="proposal" maxlength="240" placeholder="${copy[1]}"></textarea><div class="row"><button class="soft" id="cancelP">Cancel</button><button class="soft primary" id="sendP">Send suggestion</button></div><div class="tiny">Local prototype: this is stored only on your device. Shared delivery and private chat require the shared backend.</div>`);
    document.getElementById('cancelP').onclick=closeModal;
    document.getElementById('sendP').onclick=()=>{
      const text=document.getElementById('proposal').value.trim();
      if(text.length<4)return toast('Write a short, concrete suggestion.');
      state.suggestions.push({type,wishId:w.id,text,t:Date.now(),from:state.identity.email});
      save();closeModal();openWish(w.id);toast('Suggestion stored in this test.');
    };
  };

  chooseConnection=function(from){
    detail.classList.add('hidden');
    modal(`<div class="eyebrow">CONNECT / CARRY</div><h2>Create a human bridge.</h2><p>Choose another wish currently entrusted to you. The bridge is made because a human saw a connection, not because an algorithm did.</p>${state.entrusted.map(s=>{const w=wishById(s.wishId);return w&&w.id!==from.id?`<button class="entrusted-item" style="width:100%;margin-top:7px" data-target="${w.id}"><div class="t">${esc(w.text)}</div><div class="m">${remain(s.expires-Date.now())} left</div></button>`:''}).join('')}<div class="row"><button class="soft" id="cancelCon">Cancel</button></div>`);
    document.getElementById('cancelCon').onclick=closeModal;
    document.querySelectorAll('[data-target]').forEach(b=>b.onclick=()=>{
      const to=wishById(b.dataset.target);
      const ev={type:'connect',a:from.id,b:to.id,seed:seedFor('connect'+from.id+to.id+Date.now())};
      state.events.push(ev);bridge.connect(from.nodeId,to.nodeId,ev.seed);save();closeModal();renderStats();openWish(from.id);toast('A human bridge now exists between these intentions.');
    });
  };
})();
