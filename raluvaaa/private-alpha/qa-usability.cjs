const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'features.js'),'utf8');
function part(start,end){const a=source.indexOf(start),b=source.indexOf(end,a+1);assert(a>=0&&b>a);return source.slice(a,b)}
function wishFactsHarness(language,events,options={}){
 const nodes=new Map(),writes=[];
 const m={semanticId:'wish-a',lineageId:'wish-a',kind:'create',helpCount:999,...options};
 const record={id:'wish-a',isMine:true,createdAt:Date.UTC(2026,9,16),locationText:'Nantes, France',encouragementCount:0};
 const world={wishes:options.noRecord?[]:[record],events};
 function element(){let text='';return{className:'',get textContent(){return text},set textContent(value){text=value;writes.push(value)},insertAdjacentElement(position,node){nodes.set('.'+node.className,node)},remove(){nodes.delete('.'+this.className)}}}
 nodes.set('.wish',element());nodes.set('.meta',element());
 const c={current:()=>m,semantic:()=>[m],lang:()=>language,window:{__RALUVAAA_SHARED_DEBUG__:{world:()=>world,
  inbox:()=>({pending:[{type:'help',status:'pending',targetWishId:m.semanticId,privatePayload:{note:'PRIVATE PENDING'}}],receivedHistory:[{type:'help',status:'declined',targetWishId:m.semanticId,privatePayload:{note:'PRIVATE DECLINED'}},{type:'help',status:'accepted',targetWishId:m.semanticId,privatePayload:{note:'PRIVATE ACCEPTED'}}]})}},
  document:{getElementById:()=>({querySelector:selector=>nodes.get(selector)||null}),createElement:element},Intl,Date};
 vm.createContext(c);vm.runInContext(part('function decorateWishFacts(){','let queued=false;'),c);
 return{world,writes,render(){c.decorateWishFacts();return nodes.get('.pa-wish-facts')?.textContent||''},nodes};
}
for(const language of ['en','fr'])test(language+' wish facts count only accepted public help for this real wish',()=>{
 for(const count of [0,1,3]){
  const events=[{type:'help',wishId:'another-wish'},{type:'encourage',wishId:'wish-a'},{type:'help_setting',wishId:'wish-a'},
   ...Array.from({length:count},(_,i)=>({id:'help-'+i,type:'help',wishId:'wish-a',payload:{proposalId:'proposal-'+i}}))];
  const h=wishFactsHarness(language,events),text=h.render();
  const expected=language==='en'?count+' accepted offer'+(count===1?'':'s')+' of help':count+' aide'+(count===1?'':'s')+' acceptée'+(count===1?'':'s');
  assert(text.includes(expected),text);assert(text.includes('Nantes, France'));assert(text.includes('2026'));
  assert(text.includes(language==='en'?'0 support received':'0 soutiens reçus'),'existing support facts remain intact');
  assert(!/999|PRIVATE|proposal-|another-wish/.test(text),'never use simulated counts, proposals, notes or participant identifiers');
  const writes=h.writes.length;assert.equal(h.render(),text);assert.equal(h.writes.length,writes,'unchanged decoration must not churn the mutation observer');
 }
});
for(const language of ['en','fr'])test(language+' capped world history gives only a defensible accepted-help lower bound',()=>{
 const events=Array.from({length:3000},(_,i)=>({id:'event-'+i,type:i<2?'help':'create',wishId:'wish-a'}));
 const h=wishFactsHarness(language,events),text=h.render();
 assert(text.includes(language==='en'?'At least 2 accepted offers of help':'Au moins 2 aides acceptées'),text);
 events[0].wishId=events[1].wishId='another-wish';assert(!/accepted|acceptée/.test(h.render()),'a capped snapshot cannot establish zero accepted help');
});
test('wish facts refresh on actual help events and omit unknown or simulated counts',()=>{
 const h=wishFactsHarness('en',[]);h.render();const writes=h.writes.length;
 h.world.events.push({type:'help',wishId:'wish-a',payload:{proposalId:'accepted'}});
 assert(h.render().includes('1 accepted offer of help'));assert.equal(h.writes.length,writes+1);assert.equal(h.nodes.size,3,'refresh reuses the existing facts element');
 assert(!/accepted/.test(wishFactsHarness('en',undefined).render()),'missing event data is not zero');
 assert(!/accepted|999/.test(wishFactsHarness('en',[],{simulated:true,noRecord:true}).render()),'simulation history is not real help');
 assert.equal(wishFactsHarness('en',[],{noRecord:true}).render(),'','a real wish requires its authoritative record');
});
test('FR and EN account and share copy explicitly say free',()=>{
 const bootstrap=fs.readFileSync(path.resolve(__dirname,'bootstrap.js'),'utf8');const a=bootstrap.indexOf('function authText()'),b=bootstrap.indexOf('function authHost()',a);
 for(const language of ['fr','en']){
  const c={window:{__RV26_SHARED__:{state:()=>({lang:language})}},preferredLang:language,lang:()=>language};vm.createContext(c);vm.runInContext(bootstrap.slice(a,b)+part('function copy(){','function toast('),c);
  assert.match(c.authText().body,language==='fr'?/gratuit/:/free/);assert.match(c.copy().free,language==='fr'?/gratuit/:/Free/);
  if(language==='fr')assert.equal(c.authText().title,'Garde la main sur tes wishes');
 }
});
test('About close button follows the active FR or EN interface language',()=>{
 const c={lang:()=>language,escapeHtml:value=>String(value)};
 let language='fr';vm.createContext(c);
 vm.runInContext(part('function copy(){','function toast(')+part('function aboutCopy(){','function closeAbout(){'),c);
 for(const [lang,label] of [['fr','Fermer'],['en','Close'],['fr','Fermer']]){
  language=lang;
  assert.match(c.aboutHtml(),new RegExp('class="v46-about-x"[^>]*aria-label="'+label+'"'));
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
for(const language of ['en','fr'])test(language+' animated canvas embeds readable music credit without changing wish metadata or PNG',()=>{
 const draws=[],panels=[],stack=[],ctx={createLinearGradient:()=>({addColorStop(){}}),fillRect(){},fill(){},stroke(){},measureText:s=>({width:s.length}),
  fillText(text,x,y){draws.push({text,x,y,font:this.font,letterSpacing:this.letterSpacing,fillStyle:this.fillStyle})},
  save(){stack.push({font:this.font,letterSpacing:this.letterSpacing,fillStyle:this.fillStyle})},restore(){Object.assign(this,stack.pop())}};
 const c={copy:()=>({simulated:'SIMULATED',local:'LOCAL',human:'HUMAN',shareText:'SHARE'}),lang:()=>language,window:{RALUVAAA_SHARED:true},W:720,H:900,
  roundRect:(ctx,...args)=>panels.push(args),wrapText:()=>['A long wish','continues here','and here','and ends here'],stateLabel:()=> 'Alive',Intl,Date};
 vm.createContext(c);vm.runInContext(part('function prettyOverlay(','function renderPrettyFrame('),c);
 const wish={owner:true,createdAt:Date.UTC(2026,9,16),text:'A long wish',loc:'Nantes, France'},palette={ink:'#f5f4ef',muted:'#b5c8ca',b:'#f2c979'};
 c.prettyOverlay(ctx,wish,palette,'image');const png=draws.splice(0),pngPanels=panels.splice(0);
 assert(!png.some(d=>/Immersed|creativecommons|extrait|excerpt/i.test(d.text)),'silent PNG has no soundtrack credit');
 c.prettyOverlay(ctx,wish,palette,'animation');
 assert.deepEqual(draws.slice(0,png.length),png,'all existing wish text, metadata and footer keep their exact draw calls');
 assert.deepEqual(panels.slice(0,pngPanels.length),pngPanels,'existing card and location panels are unchanged');
 const credit=draws.slice(png.length);
 assert.deepEqual(credit.map(d=>d.text),['Immersed · Kevin MacLeod · incompetech.com','CC BY 4.0 · https://creativecommons.org/licenses/by/4.0/',language==='en'?'Edited excerpt':'Extrait adapté']);
 for(const d of credit){assert.equal(d.font,'16px system-ui,sans-serif');assert.equal(d.letterSpacing,'0px');assert.equal(d.x,48);assert(d.y>=526&&d.y<=568,'credit remains above the first wish baseline at 621');assert.equal(d.fillStyle,palette.ink)}
 assert.deepEqual(panels.at(-1),[40,506,640,76,12],'dedicated contrast panel fits between art and wish');
 assert.equal(stack.length,0);assert.equal(ctx.font,'750 12px system-ui,sans-serif','credit restores the canvas text state');
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
