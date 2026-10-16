const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'features.js'),'utf8');
function part(start,end){const a=source.indexOf(start),b=source.indexOf(end,a+1);assert(a>=0&&b>a);return source.slice(a,b)}
test('FR and EN account and share copy explicitly say free',()=>{
 const bootstrap=fs.readFileSync(path.resolve(__dirname,'bootstrap.js'),'utf8');const a=bootstrap.indexOf('function authText()'),b=bootstrap.indexOf('function authHost()',a);
 for(const language of ['fr','en']){
  const c={window:{__RV26_SHARED__:{state:()=>({lang:language})}},preferredLang:language,lang:()=>language};vm.createContext(c);vm.runInContext(bootstrap.slice(a,b)+part('function copy(){','function toast('),c);
  assert.match(c.authText().body,language==='fr'?/gratuit/:/free/);assert.match(c.copy().free,language==='fr'?/gratuit/:/Free/);
  if(language==='fr')assert.equal(c.authText().title,'Garde la main sur tes wishes');
 }
});
test('export identity and date are truthful for real versus simulated wishes',()=>{
 const texts=[],ctx={createLinearGradient:()=>({addColorStop(){}}),fillRect(){},fill(){},stroke(){},fillText:t=>texts.push(t),measureText:s=>({width:s.length})};
 const c={copy:()=>({simulated:'SIMULATED',local:'LOCAL',human:'HUMAN',shareText:'SHARE'}),lang:()=> 'en',window:{RALUVAAA_SHARED:true},W:720,H:900,roundRect(){},wrapText:()=>['Exact title'],stateLabel:()=> 'Alive',Intl,Date};vm.createContext(c);vm.runInContext(part('function prettyOverlay(','function renderPrettyFrame('),c);
 c.prettyOverlay(ctx,{owner:true,simulated:false,createdAt:Date.UTC(2026,9,16),text:'Exact title',loc:'Test place'},{ink:'white',muted:'grey',b:'yellow'},'image');
 assert(texts.includes('HUMAN'));assert(!texts.includes('LOCAL'));assert(texts.some(t=>/Alive.*16 Oct 2026/.test(t)));
 texts.length=0;c.prettyOverlay(ctx,{simulated:true,created:999,text:'Exact title'},{ink:'white',muted:'grey',b:'yellow'},'image');
 assert(texts.includes('SIMULATED'));assert(!texts.some(t=>/1970|2026/.test(t)),'simulation clock is never a real date');
});
test('failed clipboard fallback cannot claim link copied',async()=>{
 const statuses=[],c={shareWish:{text:'TEST'},copy:()=>({fallback:'Copied'}),shareUrl:()=> 'https://example.invalid/#wish=a',preparedMedia:null,preparedKey:'',mediaKey:()=>'',mediaPrepareError:new Error('media unavailable'),navigator:{},copyUrl:async()=>{statuses.push('Copy failed');return false},setStatus:t=>statuses.push(t),console};
 vm.createContext(c);vm.runInContext(part('function nativeShareNow(){','async function downloadCurrent(){'),c);c.nativeShareNow();await Promise.resolve();await Promise.resolve();assert.deepEqual(statuses,['Copy failed']);
});
test('closing export while preparation is pending cancels the later download',async()=>{
 let finish;const downloaded=[],c={shareWish:{text:'TEST'},recorderBusy:false,shareMode:'animation',copy:()=>({preparingClip:'Preparing',download:'Download',downloaded:'Downloaded'}),mediaKey:()=>c.shareWish?'a':'',preparedMedia:null,preparedKey:'',prepareCurrentMedia:()=>new Promise(r=>finish=r),downloadFile:f=>downloaded.push(f),setStatus(){},document:{querySelector:()=>null},window:{dispatchEvent(){}},CustomEvent:class{},console};
 vm.createContext(c);vm.runInContext(part('async function downloadCurrent(){','function mediaHtml(){'),c);const job=c.downloadCurrent();c.shareWish=null;finish({file:{name:'TEST.png'}});await job;assert.deepEqual(downloaded,[]);assert.equal(c.recorderBusy,false);
});
test('Saved stays pending until server confirmation and ignores repeated clicks',async()=>{
 let finish,saved=false,calls=0;const notices=[],c={window:{__RALUVAAA_SAVE_WISH__:()=>{calls++;return new Promise(r=>finish=()=>{saved=true;r(true)})}},savedRecordFor:()=>saved?{semanticId:'wish-a'}:null,decorate(){},decorateEntrustedFresh(){},toast:t=>notices.push(t),copy:()=>({saved:'Saved',remove:'Removed',saveFailed:'Failed'})};vm.createContext(c);vm.runInContext(part('const pendingSaved=new Set();','function stateLabel('),c);
 const first=c.toggleSaved({semanticId:'wish-a'});await c.toggleSaved({semanticId:'wish-a'});assert.equal(calls,1);assert.equal(saved,false);assert.deepEqual(notices,[],'no premature Saved success');finish();await first;assert.equal(saved,true);assert.deepEqual(notices,['Saved']);
});
test('a failed save never changes confirmed state or reports Saved',async()=>{
 const notices=[],c={window:{__RALUVAAA_SAVE_WISH__:async()=>{throw new Error('offline')}},savedRecordFor:()=>null,decorate(){},decorateEntrustedFresh(){},toast:t=>notices.push(t),copy:()=>({saved:'Saved',remove:'Removed',saveFailed:'Failed'})};vm.createContext(c);vm.runInContext(part('const pendingSaved=new Set();','function stateLabel('),c);await c.toggleSaved({semanticId:'wish-a'});assert.deepEqual(notices,['Failed']);
});
function savedHookContext(){
 const bootstrap=fs.readFileSync(path.resolve(__dirname,'bootstrap.js'),'utf8');
 const a=bootstrap.indexOf('function savedSession()'),b=bootstrap.indexOf('function installPrivateGuards()',a),h=bootstrap.indexOf('  window.__RALUVAAA_SAVE_WISH__='),j=bootstrap.indexOf('  window.__RALUVAAA_SHARED_STATS__=',h);
 assert(a>=0&&b>a&&h>=0&&j>h);
 const writes=[],requests=[],c={window:{},client:{actorId:'actor-A',token:'SYNTHETIC-A',saveWish:async id=>requests.push(['save',id,c.client.actorId]),unsaveWish:async id=>requests.push(['unsave',id,c.client.actorId]),saved:async()=>({saved:[{id:'wish-a'}]})},authMe:{claimed:true},queue:Promise.resolve(),savedQueue:Promise.resolve(),idOf:x=>x,writeSavedLocal:rows=>writes.push(rows),lastSavedServer:[],savedSyncing:false};
 vm.createContext(c);vm.runInContext(bootstrap.slice(a,b)+bootstrap.slice(h,j),c);return{c,writes,requests};
}
for(const stage of ['saved queue','mutation queue','request','refresh'])test('Saved cancels stale identity during '+stage,async()=>{
 const {c,writes,requests}=savedHookContext();let release;
 const held=new Promise(r=>release=r);
 if(stage==='saved queue')c.savedQueue=held;
 if(stage==='mutation queue')c.queue=held;
 if(stage==='request')c.client.saveWish=async id=>{requests.push(['save',id,c.client.actorId]);await held};
 if(stage==='refresh')c.client.saved=async()=>{await held;return{saved:[{id:'wish-a'}]}};
 const job=c.window.__RALUVAAA_SAVE_WISH__('wish-a',true);for(let i=0;i<8;i++)await Promise.resolve();
 c.client.actorId='actor-B';c.client.token='SYNTHETIC-B';release();
 await assert.rejects(job,/account_changed/);
 assert.equal(requests.some(r=>r[2]==='actor-B'),false,'never mutate the newly signed-in account');assert.deepEqual(writes,[],'never hydrate an old response into the new account');
});
test('Saved cancels if the same actor logs out and receives a different session',async()=>{
 const {c,requests}=savedHookContext();let release;c.queue=new Promise(r=>release=r);
 const job=c.window.__RALUVAAA_SAVE_WISH__('wish-a',false);await Promise.resolve();c.client.token='SYNTHETIC-REPLACED';release();await assert.rejects(job,/account_changed/);assert.deepEqual(requests,[]);
});
test('Saved confirms and hydrates only under its unchanged initiating identity',async()=>{
 const {c,writes,requests}=savedHookContext();assert.equal(await c.window.__RALUVAAA_SAVE_WISH__('wish-a',true),true);assert.deepEqual(requests,[['save','wish-a','actor-A']]);assert.equal(writes.length,1);assert.equal(writes[0][0].id,'wish-a');
});
