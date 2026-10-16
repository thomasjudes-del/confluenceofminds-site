const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const vm=require('node:vm');
const test=require('node:test');
const bootstrap=readFileSync(resolve(__dirname,'bootstrap.js'),'utf8');
const app=readFileSync(resolve(__dirname,'../solo-experience-v42/app-v42.js'),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
function between(text,start,end){const a=text.indexOf(start),b=text.indexOf(end,a+start.length);assert(a>=0&&b>a,start);return text.slice(a,b)}
const savedSlots=[{semanticId:'a',expires:1800000000000+5*3600000,slot:0,band:'short',nonce:2},{semanticId:'b',expires:1800000000000+24*3600000,slot:1,band:'medium',nonce:3},{semanticId:'c',expires:1800000000000+72*3600000,slot:2,band:'long',nonce:4}];
function restoreHarness(saved,enabled=true){
  const c={window:{RALUVAAA_PRIVATE_ALPHA_EXAMPLES:enabled},STORE:'private-alpha',localStorage:{getItem:()=>typeof saved==='string'?saved:JSON.stringify(saved)}};
  vm.createContext(c);vm.runInContext(between(bootstrap,'function restoreEntrustedAssignments(', 'function fp('),c);return c;
}
function appHarness(){
  const rows=['a','b','c','d','e'].map(id=>({semanticId:id,lineageId:'lineage-'+id,kind:'create',state:'alive',simulated:true,owner:false}));
  const c={window:{RALUVAAA_PRIVATE_ALPHA_EXAMPLES:true},PERSONA:'actor-a',SHARED:true,HOUR:3600000,Date:{now:()=>1800000000000},
    state:{version:26,lang:'en',events:[],entrusted:plain(savedSlots),entrustedActorId:'actor-a'},semantic:rows,byId:new Map(rows.map(m=>[m.semanticId,m])),
    current:null,owned:m=>m.owner,normalizeMeta:m=>({...m}),save(){},updateBadges(){},updateAll(){},send(){}};
  vm.createContext(c);vm.runInContext([
    between(app,'function seed(', 'function fresh('),between(app,'function lineage(', 'function descendants('),
    between(app,'function evolveChild(', 'function directActiveBranches('),between(app,'function currentEvolutionRepresentative(', 'function purgeSemanticIdFromEvents('),
    between(app,'function entrustedDuration(', 'function remain(')
  ].join('\n'),c);
  c.ui=vm.runInContext('({'+between(app,'  setActor(id){','  recenter()')+'})',c);
  const shared=app.slice(app.indexOf('if(SHARED)window.__RV26_SHARED__='));
  c.shared=vm.runInContext('({'+between(shared,'  replace(next){','  state:()=>')+'})',c);
  return c;
}
test('same verified actor restores only exact assignment windows, never stale wishes or events',()=>{
  const saved={version:26,entrustedActorId:'actor-a',entrusted:savedSlots,events:[{type:'create',semanticId:'stale-private-data'}]};
  const c=restoreHarness(saved),next={version:26,entrusted:null,events:[{type:'create',semanticId:'fresh-api-data'}]};
  c.restoreEntrustedAssignments(next,'actor-a');
  assert.deepEqual(plain(next.entrusted),savedSlots);assert.equal(next.entrustedActorId,'actor-a');assert.equal(next.events[0].semanticId,'fresh-api-data');
});
test('different actors, anonymous actors, unscoped legacy storage and disabled opt-in never restore assignments',()=>{
  for(const [saved,actor,enabled] of [
    [{version:26,entrustedActorId:'actor-a',entrusted:savedSlots},'actor-b',true],
    [{version:26,entrustedActorId:'actor-a',entrusted:savedSlots},'anonymous-new',true],
    [{version:26,entrusted:savedSlots},'actor-a',true],
    [{version:26,entrustedActorId:'actor-a',entrusted:savedSlots},'',true],
    [{version:26,entrustedActorId:'actor-a',entrusted:savedSlots},'actor-a',false],
    ['{bad json','actor-a',true]]){
    const c=restoreHarness(saved,enabled),next={version:26,entrusted:null,events:[]};c.restoreEntrustedAssignments(next,actor);
    assert.equal(next.entrusted,null);assert(!Object.hasOwn(next,'entrustedActorId'));
  }
});
test('restoration limits stored data to three shaped slots and eligibility is rechecked',()=>{
  const c=restoreHarness({version:26,entrustedActorId:'actor-a',entrusted:[{...savedSlots[0],unrelated:'discard'},null,{semanticId:'bad',expires:'never'},savedSlots[1]]});
  const next={version:26,entrusted:null,events:[]};c.restoreEntrustedAssignments(next,'actor-a');
  assert.deepEqual(plain(next.entrusted),[savedSlots[0]]);
  const h=appHarness();h.state.entrusted[0].semanticId='removed-sim-100';h.ensureEntrusted();
  assert.notEqual(h.state.entrusted[0].semanticId,'removed-sim-100');assert.deepEqual(plain(h.state.entrusted.slice(1)),savedSlots.slice(1));
});
test('unchanged same-actor snapshots retain windows and actor scope',()=>{
  const c=appHarness();c.shared.replace({version:26,lang:'fr',entrusted:null,events:[]});c.ensureEntrusted();
  assert.equal(c.state.entrustedActorId,'actor-a');assert.deepEqual(plain(c.state.entrusted),savedSlots);assert.equal(c.state.lang,'en');
});
test('actual setActor transition resets assignments immediately and stamps the new scope',()=>{
  const c=appHarness();c.state.entrusted[0].nonce=234;c.ui.setActor('actor-b');
  assert.equal(c.state.entrustedActorId,'actor-b');assert.equal(c.PERSONA,'actor-b');
  assert(c.state.entrusted.every(x=>x.nonce===1),'new actor receives fresh assignments, not the previous account history');
  const own=plain(c.state.entrusted);c.ui.setActor('actor-b');assert.deepEqual(plain(c.state.entrusted),own);
  c.ui.setActor('anonymous-new');assert.equal(c.state.entrustedActorId,'anonymous-new');assert(c.state.entrusted.every(x=>x.nonce===1));
});
