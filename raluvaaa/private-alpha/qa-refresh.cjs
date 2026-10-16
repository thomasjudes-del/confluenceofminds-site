const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {pathToFileURL}=require('node:url');
const moduleUrl=pathToFileURL(path.join(__dirname,'refresh-loop.mjs')).href;
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve()};
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}}
class Target{constructor(){this.events=new Map()}addEventListener(type,fn){if(!this.events.has(type))this.events.set(type,new Set());this.events.get(type).add(fn)}removeEventListener(type,fn){this.events.get(type)?.delete(fn)}emit(type){for(const fn of this.events.get(type)||[])fn()}}
async function clockHarness(refresh=async()=>{}){
 const {createRefreshLoop}=await import(moduleUrl);let time=0,id=0;const timers=new Map(),window=new Target(),frameWindow=new Target(),frame=new Target(),document=new Target(),errors=[];
 frame.contentWindow=frameWindow;document.hidden=false;document.querySelectorAll=()=>[frame];
 const clock={now:()=>time,setTimer:(fn,ms)=>{const key=++id;timers.set(key,{at:time+ms,fn});return key},clearTimer:key=>timers.delete(key)};
 const loop=createRefreshLoop({refresh,onError:e=>errors.push(e),window,document,...clock});loop.start();
 return{loop,window,document,frameWindow,errors,timers,now:()=>time,async advance(ms){const end=time+ms;for(let n=0;n<10000;n++){const entry=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!entry)break;time=entry[1].at;timers.delete(entry[0]);entry[1].fn();await flush();if(n===9999)throw Error('timer loop')}time=end;await flush()}};
}
test('one active hour makes 240 snapshots instead of 1440 (6x reduction)',async()=>{
 let calls=0;const h=await clockHarness(async()=>{calls++});for(let i=0;i<720;i++){h.window.emit('pointerdown');await h.advance(5000)}assert.equal(calls,240);h.loop.stop();
});
test('visible inactivity slows down to one snapshot per minute; iframe human input restores active cadence',async()=>{
 let calls=0;const h=await clockHarness(async()=>{calls++});await h.advance(3600000);assert.equal(calls,63);h.frameWindow.emit('pointerdown');await h.advance(15000);assert.equal(calls,64);h.loop.stop();
});
test('hidden tabs make zero automatic reads and coalesce focus/visibility into one catch-up',async()=>{
 let calls=0;const h=await clockHarness(async()=>{calls++});h.document.hidden=true;h.document.emit('visibilitychange');await h.advance(3600000);assert.equal(calls,0);h.document.hidden=false;h.document.emit('visibilitychange');h.window.emit('focus');h.window.emit('focus');await h.advance(0);assert.equal(calls,1);assert.equal(h.timers.size,1);h.loop.stop();
});
test('errors back off 30s, 60s, 120s, 240s, then cap at 5min; only success resets',async()=>{
 const times=[];let fail=true;let h;h=await clockHarness(async()=>{times.push(h.now());if(fail)throw Object.assign(Error('unavailable'),{status:429})});
 await h.advance(765000);assert.deepEqual(times,[15000,45000,105000,225000,465000,765000]);assert.equal(h.errors.length,6);
 h.window.emit('pointerdown');await h.advance(299999);assert.equal(times.length,6);fail=false;await h.advance(1);assert.equal(times.length,7);h.window.emit('keydown');await h.advance(15000);assert.equal(times.length,8);h.loop.stop();
});
test('slow requests never overlap or accumulate missed ticks; action refresh coalesces after them',async()=>{
 const hold=deferred(),calls=[];let h;h=await clockHarness(async force=>{calls.push({force,at:h.now()});if(calls.length===1)await hold.promise});
 await h.advance(15000);await h.advance(120000);assert.equal(calls.length,1);h.loop.request();h.loop.request();hold.resolve();await flush();await h.advance(250);assert.deepEqual(calls.map(c=>c.force),[false,true]);h.loop.stop();
});
test('action refresh while hidden is retained until visible, not repeatedly attempted',async()=>{
 const calls=[];const h=await clockHarness(async force=>calls.push(force));h.document.hidden=true;h.document.emit('visibilitychange');h.loop.request(0);await h.advance(600000);assert.deepEqual(calls,[]);h.document.hidden=false;h.document.emit('visibilitychange');await h.advance(0);assert.deepEqual(calls,[true]);h.loop.stop();
});
function bootstrapHarness(){
 const source=fs.readFileSync(path.join(__dirname,'bootstrap.js'),'utf8'),a=source.indexOf('async function fetchState('),b=source.indexOf('function friendlyError(',a),sa=source.indexOf('function savedSession()'),sb=source.indexOf('async function refreshSavedFromServer',sa);
 assert(a>0&&b>a&&sa>0&&sb>sa);const replacements=[],audio=[],writes=[];
 const client={actorId:'actor-a',token:'synthetic-a',world:async()=>({events:[]}),me:async()=>({claimed:true}),inbox:async()=>({notifications:[]})};
 const context={client,document:{hidden:false},window:{__RV26_SHARED__:{replace:next=>replacements.push(next)},__RALUVAAA_ACTION_AUDIO__:{playNamed:name=>audio.push(name)}},localStorage:{setItem:(k,v)=>writes.push([k,v])},STORE:'synthetic',setTimeout,clearTimeout,refreshTimer:null,refreshLoop:null,refreshFlight:null,refreshForced:false,mutationVersion:0,mutating:0,lastWorld:null,lastMe:null,lastInbox:null,authMe:null,lastFingerprint:'',knownConnectIds:new Set(),updateAccountButton:()=>{},showError:()=>{},fp:state=>JSON.stringify(state),buildState:(world,me,inbox,actorId)=>({events:world.events||[],me,inbox,actorId})};
 vm.createContext(context);vm.runInContext(source.slice(sa,sb)+'\n'+source.slice(a,b),context);return{context,client,replacements,audio,writes};
}
for(const change of ['actor','token'])test('obsolete '+change+' response never reaches inbox or private state',async()=>{
 const h=bootstrapHarness(),hold=deferred();let inbox=0;h.client.world=()=>hold.promise;h.client.inbox=async()=>{inbox++;return{}};
 const pending=h.context.refresh();await flush();if(change==='actor')h.client.actorId='actor-b';else h.client.token='synthetic-new';hold.resolve({events:[]});await assert.rejects(pending,e=>e.code==='account_changed');assert.equal(inbox,0);assert.equal(h.context.lastWorld,null);assert.equal(h.context.authMe,null);assert.deepEqual(h.replacements,[]);
});
test('identity change during inbox rejects its late private response before applying',async()=>{
 const h=bootstrapHarness(),hold=deferred();h.client.inbox=()=>hold.promise;const pending=h.context.refresh();await flush();h.client.actorId='actor-b';h.client.token='synthetic-b';hold.resolve({notifications:[{id:'private-a'}]});await assert.rejects(pending,e=>e.code==='account_changed');assert.equal(h.context.lastInbox,null);assert.deepEqual(h.replacements,[]);
});
test('hiding mid-poll stops the subsequent inbox request',async()=>{
 const h=bootstrapHarness(),hold=deferred();let inbox=0;h.client.world=()=>hold.promise;h.client.inbox=async()=>{inbox++;return{}};const pending=h.context.refresh(false,true);h.context.document.hidden=true;hold.resolve({events:[]});await assert.rejects(pending,e=>e.code==='refresh_paused');assert.equal(inbox,0);assert.equal(h.context.lastWorld,null);
});
test('forced refresh during a poll is coalesced into one later authoritative pass',async()=>{
 const h=bootstrapHarness(),hold=deferred();let calls=0,active=0,max=0;
 h.client.world=async()=>{calls++;active++;max=Math.max(max,active);if(calls===1)await hold.promise;active--;return{events:[]}};
 const first=h.context.refresh();h.context.refresh(true);h.context.refresh(true);hold.resolve();await first;assert.equal(calls,2);assert.equal(max,1);assert.equal(h.replacements.length,2,'forced unchanged snapshot still replaces optimistic state');
});
test('completed mutation invalidates an older poll and forces a fresh snapshot',async()=>{
 const h=bootstrapHarness(),hold=deferred();let calls=0;h.client.world=async()=>{calls++;if(calls===1)return hold.promise;return{events:[{type:'create',semanticId:'canonical'}]}};
 const first=h.context.refresh();h.context.mutationVersion++;h.context.refresh(true);hold.resolve({events:[{type:'create',semanticId:'old'}]});await first;assert.equal(calls,2);assert.equal(h.replacements.length,1);assert.equal(h.replacements[0].events[0].semanticId,'canonical');
});
test('new identity forced refresh waits for the old flight then builds only the new actor snapshot',async()=>{
 const h=bootstrapHarness(),hold=deferred();let calls=0;h.client.world=async()=>++calls===1?hold.promise:{events:[]};
 const first=h.context.refresh();h.client.actorId='actor-b';h.client.token='synthetic-b';const second=h.context.refresh(true);hold.resolve({events:[]});await Promise.all([first,second]);assert.equal(calls,2);assert.equal(h.replacements.length,1);assert.equal(h.replacements[0].actorId,'actor-b');
});
test('new accepted GRAFT sound plays once, unchanged forced refresh remains silent',async()=>{
 const h=bootstrapHarness();h.client.world=async()=>({events:[{type:'connect',proposalId:'synthetic-graft',aSemanticId:'a',bSemanticId:'b'}]});await h.context.refresh();await h.context.refresh(true);assert.deepEqual(h.audio,['graft']);
});
test('private bootstrap uses the adaptive loop and keeps action refresh, without interval polling',()=>{
 const source=fs.readFileSync(path.join(__dirname,'bootstrap.js'),'utf8');assert(!source.includes('refresh(false).catch(showError)},2500)'));assert(source.includes('createRefreshLoop({refresh,onError:showError,document,window})'));assert(source.includes('mutationVersion++;mutating++;'));assert(source.includes('scheduleRefresh(50)'),'rejected mutation rollback remains forced');
});

test('one failed parallel request cannot release the flight while its sibling is pending',async()=>{
 const h=bootstrapHarness(),hold=deferred();let calls=0;h.client.world=()=>{calls++;return hold.promise};h.client.me=async()=>{throw Object.assign(Error('unavailable'),{status:503})};
 const first=h.context.refresh();first.catch(()=>{});await flush();const second=h.context.refresh();assert.equal(first,second);assert.equal(calls,1);hold.resolve({events:[]});await assert.rejects(first,e=>e.status===503);assert.equal(h.context.lastWorld,null);
});

test('skipping a busy or superseded snapshot does not clear an existing error backoff',async()=>{
 const times=[];let h;h=await clockHarness(async()=>{times.push(h.now());if(times.length===1)throw Error('unavailable');return {skipped:true}});await h.advance(105000);assert.deepEqual(times,[15000,45000,75000,105000]);h.loop.stop();
});
