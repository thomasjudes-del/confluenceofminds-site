const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const vm=require('node:vm');
const test=require('node:test');

// Execute the production functions, with a deterministic clock and no browser,
// API, account, or persistent writes. The override also runs against a baseline.
const source=readFileSync(process.env.RALUVAAA_WORKFLOW_SOURCE||resolve(__dirname,'../solo-experience-v42/app-v42.js'),'utf8');
function between(start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert(a>=0&&b>a,'production function boundaries must exist: '+start);
  return source.slice(a,b);
}
const HOUR=3600000;
function wish(id,extra={}){
  return{semanticId:id,lineageId:'lineage-'+id,kind:'create',state:'alive',text:'Original wish '+id,loc:'Nantes, France',simulated:true,owner:false,...extra};
}
function harness(rows){
  let now=1700000000000,saves=0,renders=0;
  const timer={dataset:{expires:String(now+1000)},textContent:''};
  const context={
    state:{entrusted:null,events:[],lang:'en'},semantic:rows,byId:new Map(rows.map(x=>[x.semanticId,x])),
    SHARED:true,HOUR,Date:{now:()=>now},owned:m=>m.owner,save:()=>saves++,updateBadges:()=>{},
    drawerKind:'entrusted',document:{querySelectorAll:()=>[timer]},renderDrawer:()=>renders++,
    T:key=>({origin:'Origin',entrusted:'Entrusted wishes',simulated:'Simulated'}[key]||key),
    drawerTitle:{textContent:''},drawerBody:{innerHTML:'',querySelectorAll:()=>[]}
  };
  vm.createContext(context);
  vm.runInContext([
    between('function esc(', 'function uid('),
    between('function seed(', 'function fresh('),
    between('function lineage(', 'function descendants('),
    between('function evolveChild(', 'function directActiveBranches('),
    between('function currentEvolutionRepresentative(', 'function purgeSemanticIdFromEvents('),
    between('function entrustedDuration(', 'function updateAll(')
  ].join('\n'),context);
  return{context,timer,now:()=>now,advance:ms=>{now+=ms},saves:()=>saves,renders:()=>renders,
    render(){vm.runInContext(between('function renderDrawer(', 'function action('),context);context.renderDrawer();return context.drawerBody.innerHTML}};
}

test('each native Entrusted duration retains its short, medium, and long window',()=>{
  const h=harness([]),ranges=[[3,8],[18,30],[60,84]];
  for(let slot=0;slot<3;slot++)for(let nonce=1;nonce<50;nonce++){
    const duration=h.context.entrustedDuration(slot,h.now(),nonce);
    assert(duration>=ranges[slot][0]*HOUR&&duration<ranges[slot][1]*HOUR);
  }
});

test('idle timer expiry replaces only the elapsed slot without an engine snapshot',()=>{
  const h=harness(['a','b','c','d','e'].map(id=>wish(id))),c=h.context;
  c.ensureEntrusted();
  const before=JSON.parse(JSON.stringify(c.state.entrusted));
  c.state.entrusted[0].expires=h.now()+1000;
  h.advance(1001);c.tickEntrustedClocks();
  assert.notEqual(c.state.entrusted[0].semanticId,before[0].semanticId,'expired wish should rotate while the world is otherwise idle');
  assert(c.state.entrusted[0].expires>h.now());
  assert.equal(c.state.entrusted[1].expires,before[1].expires,'medium deadline must not restart');
  assert.equal(c.state.entrusted[2].expires,before[2].expires,'long deadline must not restart');
  assert.equal(new Set(c.state.entrusted.map(x=>x.semanticId)).size,3);
  assert.equal(h.renders(),1,'only the open Entrusted panel needs rendering');
  const saves=h.saves();c.tickEntrustedClocks();
  assert.equal(h.saves(),saves,'unchanged ticks must not write storage');
});

test('expiry refresh never steals another open drawer or the selected wish',()=>{
  const h=harness(['a','b','c','d'].map(id=>wish(id))),c=h.context;
  c.ensureEntrusted();c.drawerKind='inbox';c.current={semanticId:'a'};
  c.state.entrusted[0].expires=h.now()-1;c.tickEntrustedClocks();
  assert(c.state.entrusted[0].expires>h.now());
  assert.equal(c.drawerKind,'inbox');assert.equal(c.current.semanticId,'a');
  assert.equal(h.renders(),0);
});

test('a small candidate pool preserves existing deadlines and explicit duration bands',()=>{
  const h=harness([wish('a'),wish('b')]),c=h.context;
  const longDeadline=h.now()+72*HOUR;
  c.state.entrusted=[{semanticId:'a',expires:longDeadline,nonce:5,slot:2,band:'long'}];
  c.ensureEntrusted();
  const a=c.state.entrusted.find(x=>x.semanticId==='a');
  assert.equal(a.expires,longDeadline,'a still-valid long assignment must survive a partial pool');
  assert.equal(a.slot,2);assert.equal(a.band,'long');
  assert.equal(c.state.entrusted.length,2,'do not invent a third wish');
  const stable=JSON.stringify(c.state.entrusted);h.advance(1000);c.ensureEntrusted();
  assert.equal(JSON.stringify(c.state.entrusted),stable,'snapshot refresh must not reset partial assignments');
  const html=h.render();
  assert.match(html,/pa-band-long[^>]*data-entrusted-band="long"[^>]*data-open="a"/);
});

test('legacy three-slot storage migrates without changing identities or expiry',()=>{
  const h=harness(['a','b','c'].map(id=>wish(id))),c=h.context;
  c.state.entrusted=['a','b','c'].map((semanticId,i)=>({semanticId,expires:h.now()+(i+1)*HOUR,nonce:1}));
  const before=c.state.entrusted.map(x=>[x.semanticId,x.expires]);
  c.ensureEntrusted();
  assert.equal(JSON.stringify(c.state.entrusted.map(x=>[x.semanticId,x.expires])),JSON.stringify(before));
  assert.equal(c.state.entrusted.map(x=>x.band).join(','),'short,medium,long');
});

test('selection excludes owned, completed, abandoned and superseded states',()=>{
  const root=wish('root'),evolved=wish('current',{kind:'evolve',lineageId:root.lineageId,parentSemanticId:root.semanticId});
  const h=harness([root,evolved,wish('own',{owner:true}),wish('bloom',{state:'bloom'}),wish('abandoned',{state:'abandoned'})]),c=h.context;
  c.ensureEntrusted();
  assert.equal(c.state.entrusted.map(x=>x.semanticId).join(','),'current');
});

test('generic evolved Entrusted previews show the actual escaped root and retain current-state navigation',()=>{
  const root=wish('root',{text:'I want to build a <boat> & sail.'}),evolved=wish('current',{
    kind:'evolve',lineageId:root.lineageId,parentSemanticId:root.semanticId,text:'I have chosen one smaller version to try.'
  });
  const h=harness([root,evolved]),c=h.context;c.ensureEntrusted();
  const html=h.render();
  assert.match(html,/data-open="current"/,'primary click should still open the current state');
  assert(html.includes(evolved.text));
  assert(html.includes('I want to build a &lt;boat&gt; &amp; sail.'),'origin must use canonical root text with HTML escaping');
  assert.match(html,/data-origin-wish="root"/);
  assert(!html.includes('<boat>'));
});

test('root previews do not repeat the same wish as an invented origin',()=>{
  const h=harness([wish('root')]);h.context.ensureEntrusted();
  assert(!h.render().includes('pa-entrusted-origin'));
});

test('Entrusted explicitly identifies simulated wishes without guessing from IDs',()=>{
  const h=harness([wish('real-looking-id')]);h.context.ensureEntrusted();
  assert.match(h.render(),/class="pa-entrusted-kind">Simulated<\/div>/);
  const real=harness([wish('sim-prefixed-real-wish',{simulated:false})]);real.context.ensureEntrusted();
  assert(!real.render().includes('pa-entrusted-kind'),'real people must not receive a simulated label');
});

function proposalHarness(shared){
  const events=[],commits=[],target=wish('target',{owner:true});
  const c={SHARED:shared,state:{events},byId:new Map([[target.semanticId,target]]),
    proposalStatus:p=>p.serverStatus,proposalTargetAlive:()=>true,uid:prefix=>prefix+'-'+(commits.length+1),seed:()=>1,
    commit:event=>{events.push(event);commits.push(event);return event}};
  vm.createContext(c);
  vm.runInContext(between('function visualExists(', 'function responseFor(')+'\n'+between('function materialize(', 'function reconcile('),c);
  return{c,commits,events};
}

test('shared accepted suggestions never create duplicate speculative server-owned branches',()=>{
  const h=proposalHarness(true);
  // buildState has already hydrated a real accepted branch from the server.
  h.events.push({type:'branch_add',parentSemanticId:'target',children:[{semanticId:'server-branch',text:'One step'}]});
  const proposal={type:'suggest_proposed',proposalId:'accepted-suggestion',serverStatus:'accepted',semanticId:'target',targetActorId:'owner',suggestions:['One step']};
  h.c.materialize(proposal);h.c.materialize(proposal);
  assert.equal(h.commits.length,0,'shared proposal outcomes must come from the server snapshot');
});

test('shared help and graft acceptance likewise wait for authoritative server events',()=>{
  const h=proposalHarness(true);
  for(const type of ['help_proposed','connect_proposed'])h.c.materialize({type,proposalId:type,serverStatus:'accepted',semanticId:'target',aSemanticId:'target',bSemanticId:'other'});
  assert.equal(h.commits.length,0);
});

test('local sandbox proposals still materialize once after acceptance',()=>{
  for(const type of ['help_proposed','connect_proposed','suggest_proposed']){
    const h=proposalHarness(false),p={type,proposalId:type,serverStatus:'accepted',semanticId:'target',aSemanticId:'target',bSemanticId:'other',targetActorId:'owner',suggestions:['One step']};
    h.c.materialize(p);h.c.materialize(p);
    assert.equal(h.commits.length,1,type+' should materialize once locally');
  }
});

function inboxHarness(actor,proposals){
  const c={PERSONA:actor,state:{notifications:[]},byId:new Map([['target',wish('target')]]),
    proposalStatus:p=>p.serverStatus,proposalTargetAlive:()=>false,proposalEvents:()=>proposals,
    pendingForMe:()=>[],T:key=>key};
  vm.createContext(c);
  vm.runInContext([
    between('function esc(', 'function uid('),
    between('function excerpt(', 'function pendingForMe('),
    between('function proposalLabel(', 'function renderDrawer(')
  ].join('\n'),c);
  return c;
}

test('terminal proposal history keeps its outcome after a target closes or evolves',()=>{
  const c=inboxHarness('owner',[]);
  for(const serverStatus of ['accepted','declined','cancelled','expired']){
    assert.equal(c.proposalLabel({serverStatus}),serverStatus,'do not replace an established '+serverStatus+' outcome');
  }
  assert.equal(c.proposalLabel({serverStatus:'pending'}),'expired','unavailable pending proposals still expire');
});

test('an accepted help note remains readable in full and escaped by sender and recipient',()=>{
  const note='I can help with <equipment> & preparation. '+('Practical detail. '.repeat(15));
  const p={type:'help_proposed',proposalId:'help',semanticId:'target',actorId:'helper',requiredActors:['owner'],serverStatus:'accepted',helpTitle:'Sailing checklist',note};
  for(const actor of ['helper','owner']){
    const c=inboxHarness(actor,[p]),html=c.renderInbox();
    assert(html.includes('I can help with &lt;equipment&gt; &amp; preparation.'),actor+' must retain access to the offered help');
    assert(html.includes('Practical detail. '.repeat(15)),'accepted help cannot be truncated with no way to read the rest');
    assert(!html.includes('<equipment>'),'private note markup must be escaped');
  }
});

test('an unrelated person cannot see accepted help details in inbox or Entrusted',()=>{
  const note='Private practical instructions for this offer';
  const p={type:'help_proposed',proposalId:'help',semanticId:'target',actorId:'helper',requiredActors:['owner'],serverStatus:'accepted',helpTitle:'Private help',note};
  assert(!inboxHarness('stranger',[p]).renderInbox().includes(note));
  const h=harness([wish('target')]);h.context.state.events=[p];h.context.ensureEntrusted();
  assert(!h.render().includes(note),'public wish previews must not include private help notes');
});
