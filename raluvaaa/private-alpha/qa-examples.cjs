const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {createHash}=require('node:crypto');
const vm=require('node:vm');
const test=require('node:test');
const root=resolve(__dirname,'..');
const source=readFileSync(process.env.RALUVAAA_EXAMPLE_ENGINE||resolve(root,'solo-experience-v42/engine-runtime-v42.js'),'utf8');
const app=readFileSync(resolve(root,'solo-experience-v42/app-v42.js'),'utf8');
const base=readFileSync(resolve(root,'v22/engine-v03-locked.html'),'utf8');
function between(text,start,end){const a=text.indexOf(start),b=text.indexOf(end,a+start.length);assert(a>=0&&b>a,start+' production boundary');return text.slice(a,b)}
function plain(value){return JSON.parse(JSON.stringify(value))}
function harness(){
  const messages=[];
  const c={window:{},parent:{postMessage:m=>messages.push(plain(m))},location:{origin:'http://127.0.0.1'},
    TAU:Math.PI*2,hues:[207,267,313,40,181,286,221,12,160],W:1280,anim:null,
    camera:{x:0,y:0,zoom:1,min:.1,fit(){this.zoom=1},focus(){}},updateStats(){},drawLabels(){}};
  vm.createContext(c);
  vm.runInContext([
    between(base,'function clamp(', 'function setStatus('),
    between(base,'function edgeGeom(', 'function pickTip('),
    between(source,'const metaByNode=', 'const baseRootHalo=')
  ].join('\n'),c);
  vm.runInContext(readFileSync(resolve(root,'v22/seed.js'),'utf8'),c);
  vm.runInContext(readFileSync(resolve(__dirname,'examples.js'),'utf8'),c);
  const legacy={texts:c.window.RALUVAAA_SEED_WISHES,locs:c.window.RALUVAAA_SEED_LOCS,events:[]};
  const curated={...legacy,privateAlphaExamples:true,curatedExamples:c.window.RALUVAAA_CURATED_EXAMPLES,exampleLanguage:'en'};
  return{c,messages,legacy,curated,init(input=curated){c.init(input);return this.snapshot()},snapshot(){return messages.filter(x=>x.type==='rv25-snapshot').at(-1)},world(){return plain(vm.runInContext('world',c))},qc(){return plain(c.window.__RV42_SIMULATION_QC__.summary())}};
}
const ID=id=>'alpha-example-v1-'+id;
const realEvents=[
  {type:'create',semanticId:'api-root',lineageId:'api-lineage',text:'The untouched API wish',loc:'The provided location'},
  {type:'branch_add',lineageId:'api-lineage',parentSemanticId:'api-root',children:[{semanticId:'api-branch',text:'The actual API branch'}]},
  {type:'evolve',semanticId:'api-current',lineageId:'api-lineage',parentSemanticId:'api-root',text:'The newer API intention'},
  {type:'create',semanticId:'api-other',lineageId:'api-other-lineage',text:'Another API wish',loc:''},
  {type:'encourage',semanticId:'api-current'},
  {type:'help',semanticId:'api-current'},
  {type:'connect',aSemanticId:'api-current',bSemanticId:'api-other'},
  {type:'bloom',semanticId:'api-branch'}
];

test('private alpha builds exactly ten authored cards: five roots, four branches and one evolution',()=>{
  const h=harness(),snapshot=h.init(),rows=snapshot.semantic;
  assert.equal(rows.length,10);assert.equal(rows.filter(x=>x.kind==='create').length,5);
  assert.equal(rows.filter(x=>x.kind==='split').length,4);assert.equal(rows.filter(x=>x.kind==='evolve').length,1);
  assert(rows.every(x=>x.simulated===true&&x.owner===false&&x.exampleVersion===1));
  assert.deepEqual(rows.map(x=>x.semanticId),plain(h.curated.curatedExamples.nodes.map(x=>x.semanticId)));
  for(const m of rows){
    assert.equal(m.loc,'');assert.equal(m.created,0);
    for(const field of ['helpCount','suggestionCount','encouragements','localEncouragements','warpCount'])assert.equal(m[field],0,m.semanticId+' '+field);
    assert(!Object.hasOwn(m,'actorId'));assert(!Object.hasOwn(m,'createdAt'));
  }
  assert.equal(h.world().humans,0);assert.equal(h.world().nodes.length,10);
  assert.equal(snapshot.stats.helps,0);assert.equal(snapshot.stats.warps,0);
});

test('curated ancestry is acyclic and specific; evolution is a genuine new current intention',()=>{
  const h=harness(),rows=h.init().semantic,byId=new Map(rows.map(x=>[x.semanticId,x]));
  for(const m of rows){const seen=new Set([m.semanticId]);let cursor=m;
    while(cursor.parentSemanticId){const p=byId.get(cursor.parentSemanticId);assert(p);assert.equal(p.lineageId,m.lineageId);assert(!seen.has(p.semanticId));seen.add(p.semanticId);cursor=p}
    assert.equal(cursor.kind,'create');
  }
  assert.equal(byId.get(ID('first-bee-photo')).parentSemanticId,ID('garden-bees'));
  assert.equal(byId.get(ID('garden-bees')).parentSemanticId,ID('bees'));
  assert.equal(byId.get(ID('guitar-song')).kind,'evolve');
  assert.equal(byId.get(ID('guitar-song')).parentSemanticId,ID('guitar'));
  assert.notEqual(byId.get(ID('guitar-song')).text,byId.get(ID('guitar')).text);
  assert.match(byId.get(ID('guitar-song')).text,/sing and accompany/);
  assert(!rows.some(x=>/first small real-world step|Decide what should happen next/.test(x.text)));
  assert.equal(h.world().edges.filter(x=>x.semanticWarp).length,0,'no fabricated graft or engagement');
});

test('reload, rebuild and FR/EN switching preserve IDs, geometry, provenance and real API events',()=>{
  const h=harness(),input={...h.curated,events:realEvents},first=h.init(input),before=plain(realEvents);
  const fresh=harness();assert.deepEqual(fresh.init({...fresh.curated,events:realEvents}),first,'stable full reload');
  h.c.camera.x=123;h.c.camera.y=-87;h.c.camera.zoom=.73;
  const geometry=h.world().nodes.map(n=>[n.id,n.x,n.y]);
  h.c.setExampleLanguage('fr');const french=h.snapshot();
  assert.deepEqual(french.semantic.map(x=>x.semanticId),first.semantic.map(x=>x.semanticId));
  assert.equal(french.semantic.find(x=>x.semanticId===ID('bees')).text,'Je veux mieux connaître les abeilles qui visitent mon jardin.');
  assert.deepEqual(french.semantic.filter(x=>!x.simulated),first.semantic.filter(x=>!x.simulated));
  assert.deepEqual(h.world().nodes.map(n=>[n.id,n.x,n.y]),geometry);
  assert.deepEqual([h.c.camera.x,h.c.camera.y,h.c.camera.zoom],[123,-87,.73]);
  h.c.rebuild(realEvents,true);assert.deepEqual(h.snapshot(),french,'API refresh preserves example language');
  h.c.setExampleLanguage('en');assert.deepEqual(h.snapshot(),first);
  assert.deepEqual(realEvents,before,'never rewrite input API events');
  const actual=first.semantic.filter(x=>!x.simulated);
  assert.equal(actual.length,4);assert.equal(actual.find(x=>x.semanticId==='api-current').encouragements,1);
  assert.equal(actual.find(x=>x.semanticId==='api-current').helpCount,1);assert.equal(actual.find(x=>x.semanticId==='api-branch').state,'bloom');
  const grafts=h.world().edges.filter(x=>x.semanticWarp);assert.equal(grafts.length,1);
  assert.deepEqual([grafts[0].aSemanticId,grafts[0].bSemanticId],['api-current','api-other']);
  assert(!actual.some(x=>x.exampleVersion),'real wishes never acquire example provenance');
});

test('legacy 100-root demos remain identical unless the explicit private-alpha flag is true',()=>{
  const h=harness(),snapshot=h.init(h.legacy);
  assert.equal(snapshot.stats.roots,100);assert(snapshot.stats.states>100);
  const digest=createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
  if(process.env.PRINT_LEGACY_DIGEST)console.log('LEGACY_DIGEST',digest,JSON.stringify(h.qc()));
  assert.equal(digest,'76714ab17115a005d47aab4ce0e82e19d8f2adb249cb2fba6f3de66b6d566951');
  for(const flag of [undefined,false,'true',1])assert.deepEqual(h.init({...h.curated,privateAlphaExamples:flag}),snapshot);
  h.c.setExampleLanguage('fr');assert.deepEqual(h.snapshot(),snapshot);
});

test('invalid or oversized curated inputs fail closed without falling back or losing API wishes',()=>{
  const h=harness(),data=plain(h.curated.curatedExamples);
  const invalid=[null,{version:1,nodes:[]},{...data,nodes:[...data.nodes,data.nodes[0]]},
    {...data,nodes:data.nodes.map((x,i)=>i===2?{...x,parentSemanticId:x.semanticId}:x)},
    {...data,nodes:data.nodes.map((x,i)=>i===2?{...x,parentSemanticId:ID('bicycle')}:x)},
    {...data,nodes:data.nodes.map((x,i)=>i===1?{...x,semanticId:'api-root'}:x)}];
  for(const curatedExamples of invalid){const out=h.init({...h.curated,curatedExamples,events:realEvents});assert.equal(out.semantic.filter(x=>x.simulated).length,0);assert.equal(out.semantic.filter(x=>!x.simulated).length,4)}
});

function entrustedHarness(rows){
  let now=1800000000000;
  const c={state:{events:[],entrusted:null},semantic:rows,byId:new Map(rows.map(x=>[x.semanticId,x])),SHARED:true,HOUR:3600000,
    Date:{now:()=>now},owned:m=>m.owner,save(){},updateBadges(){}};
  vm.createContext(c);vm.runInContext([
    between(app,'function seed(', 'function fresh('),
    between(app,'function lineage(', 'function descendants('),
    between(app,'function evolveChild(', 'function directActiveBranches('),
    between(app,'function currentEvolutionRepresentative(', 'function purgeSemanticIdFromEvents('),
    between(app,'function entrustedDuration(', 'function remain(')
  ].join('\n'),c);
  return{c,advance:ms=>now+=ms,now:()=>now};
}
test('removed legacy Entrusted IDs recover into three distinct urgency slots in the small example pool',()=>{
  const rows=harness().init().semantic,h=entrustedHarness(rows),c=h.c;
  c.state.entrusted=['sim-4-e1','sim-78','sim-100'].map((semanticId,slot)=>({semanticId,slot,band:['short','medium','long'][slot],expires:h.now()+123456,nonce:4}));
  c.ensureEntrusted();assert.equal(c.state.entrusted.length,3);assert.equal(new Set(c.state.entrusted.map(x=>x.semanticId)).size,3);
  const ranges=[[3,8],[18,30],[60,84]];
  for(const x of c.state.entrusted){assert(x.semanticId.startsWith('alpha-example-v1-'));assert.equal(x.band,['short','medium','long'][x.slot]);assert(x.expires>=h.now()+ranges[x.slot][0]*c.HOUR&&x.expires<h.now()+ranges[x.slot][1]*c.HOUR)}
  const stable=plain(c.state.entrusted);h.advance(60000);c.ensureEntrusted();assert.deepEqual(plain(c.state.entrusted),stable,'unchanged world does not restart the duration bands');
  for(let slot=0;slot<3;slot++){
    const before=plain(c.state.entrusted),old=before.find(x=>x.slot===slot).semanticId;c.state.entrusted.find(x=>x.slot===slot).expires=h.now()-1;c.ensureEntrusted();
    assert.notEqual(c.state.entrusted.find(x=>x.slot===slot).semanticId,old);assert.equal(new Set(c.state.entrusted.map(x=>x.semanticId)).size,3);
    for(const other of before.filter(x=>x.slot!==slot))assert.deepEqual(plain(c.state.entrusted.find(x=>x.slot===other.slot)),other);
  }
});
test('private-alpha manifest is opt-in at both page and app boundary',()=>{
  const c={window:{RALUVAAA_CURATED_EXAMPLES:{version:1}},document:{body:{dataset:{alpha:'private-alpha'}}},state:{lang:'fr'}};
  vm.createContext(c);vm.runInContext(between(app,'function exampleInitPayload(', 'function injectRuntime('),c);
  assert.deepEqual(plain(c.exampleInitPayload()),{});c.window.RALUVAAA_PRIVATE_ALPHA_EXAMPLES=true;
  assert.deepEqual(plain(c.exampleInitPayload()),{privateAlphaExamples:true,curatedExamples:{version:1},exampleLanguage:'fr'});
  c.document.body.dataset.alpha='legacy';assert.deepEqual(plain(c.exampleInitPayload()),{});
});
