const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {pathToFileURL}=require('node:url');
const vm=require('node:vm');
const test=require('node:test');

test('a consumed wish deep link cannot override later drawer navigation',()=>{
  const app=readFileSync(resolve(__dirname,'../solo-experience-v42/app-v42.js'),'utf8');
  const start=app.indexOf('function openHashWish()');
  const end=app.indexOf('function renderWish()',start);
  assert(start>=0&&end>start,'actual deep-link handler must exist');
  const visits=[],messages=[];
  const context={location:{hash:'#wish=wish-a'},byId:new Map(),hashOpenedId:null,navigateWish:id=>visits.push(id),send:message=>messages.push(message)};
  vm.createContext(context);vm.runInContext(app.slice(start,end),context);
  assert.equal(context.openHashWish(),false,'wait until the shared wish is hydrated');
  context.byId.set('wish-a',{});
  assert.equal(context.openHashWish(),true);
  // Engine snapshots arrive after the user has opened Notifications or B.
  assert.equal(context.openHashWish(),false);
  assert.equal(context.openHashWish(),false);
  assert.deepEqual(visits,['wish-a']);
  assert.deepEqual(messages,[],'consumed link must not send another focus/select');
  context.location.hash='#wish=wish-b';context.hashOpenedId=null;context.byId.set('wish-b',{});
  assert.equal(context.openHashWish(),true,'a deliberate later hash navigation still works');
  assert.deepEqual(visits,['wish-a','wish-b']);
});

// Execute the actual bootstrap configuration, then the real API client with a
// synthetic stored session and a network-free fetch recorder. No real tokens.
const marker='function status(';
const trusted='https://trusted-api.example';
const untrusted='https://untrusted.invalid';
async function requestsFor(bootstrap,hostname,query='',saved=untrusted){
  const source=readFileSync(process.env.RALUVAAA_BOOTSTRAP_MODULE||resolve(__dirname,bootstrap),'utf8');
  assert.ok(source.includes(marker),'bootstrap configuration boundary must exist');
  const selection=source.slice(0,source.indexOf(marker))+'globalThis.selectedApi=apiBase;})();';
  const values=new Map([
    ['raluvaaaAlphaApiBaseV1',saved],
    ['raluvaaaAlphaSessionTokenV1:WORLD','SYNTHETIC_VICTIM_TOKEN'],
    ['raluvaaaAlphaActorIdV1:WORLD','synthetic-actor']
  ]);
  const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
  const context={URLSearchParams,Map,location:{hostname,search:query},localStorage:storage,navigator:{language:'en'},window:{RALUVAAA_ALPHA_API_BASE:trusted,RALUVAAA_ROOM:'WORLD'}};
  vm.runInNewContext(selection,context);
  const {RaluvaaaAlphaClient}=await import(pathToFileURL(resolve(__dirname,'../alpha-api/client.mjs')));
  const calls=[];
  const client=new RaluvaaaAlphaClient({baseUrl:context.selectedApi,room:'WORLD',storage,fetchImpl:async(url,options)=>{
    calls.push({url,authorization:options.headers.authorization});
    return {ok:true,json:async()=>({claimed:true})};
  }});
  await client.ensureSession();
  return {calls,values};
}

for(const bootstrap of ['bootstrap.js','../shared-alpha/shared-bootstrap.js']){
 for(const hostname of ['confluenceofminds.com','www.confluenceofminds.com','localhost.attacker.example']){
  test(bootstrap+': published host '+hostname+' ignores query and persisted API overrides',async()=>{
    for(const query of ['?api='+encodeURIComponent(untrusted),'']){
      const {calls,values}=await requestsFor(bootstrap,hostname,query);
      assert.deepEqual(calls,[{url:trusted+'/v1/me',authorization:'Bearer SYNTHETIC_VICTIM_TOKEN'}]);
      assert.equal(values.has('raluvaaaAlphaApiBaseV1'),false,'legacy override must be removed');
    }
  });
 }
 for(const hostname of ['localhost','127.0.0.1','[::1]']){
  test(bootstrap+': loopback host '+hostname+' keeps local Worker QA available',async()=>{
    const local='http://127.0.0.1:8787';
    const {calls}=await requestsFor(bootstrap,hostname,'?api='+encodeURIComponent(local));
    assert.equal(calls[0].url,local+'/v1/me');
  });
 }
}
