const test=require('node:test'),assert=require('node:assert/strict');
const context=require('./wish-context.js');
const root={semanticId:'root',lineageId:'lineage',kind:'create',text:'Initial wish',parentSemanticId:null};
const parent={semanticId:'parent',lineageId:'lineage',kind:'split',text:'Direct branch',parentSemanticId:'root'};
const current={semanticId:'current',lineageId:'lineage',kind:'evolve',text:'Viewed evolution',parentSemanticId:'parent'};
const publicRecord=m=>({id:m.semanticId,lineageId:m.lineageId,rootWishId:'root',parentWishId:m.parentSemanticId,kind:m.kind,text:m.text,encouragementCount:3,locationText:'Montréal, Canada',createdAt:Date.UTC(2026,9,16)});
const world=events=>({wishes:[root,parent,current].map(publicRecord),events});
const render=(m=current,rows=[root,parent,current],data=world([]),lang='fr')=>context.render({current:m,semantic:rows,world:data,lang,status:'Vivant'});
test('full root > branch > evolution path is ordered, typed, unique, and marks the viewed wish',()=>{
 const html=render();assert(html.indexOf('Initial wish')<html.indexOf('Direct branch'));assert(html.indexOf('Direct branch')<html.indexOf('Viewed evolution'));
 for(const text of ['Initial wish','Direct branch','Viewed evolution'])assert.equal(html.split(text).length-1,1);
 assert.match(html,/\(vœu initial\)/);assert.match(html,/\(branche\)/);assert.match(html,/\(évolution\)/);assert.equal(html.split('aria-current="page"').length-1,1);
 assert.match(html,/data-nav-wish="current"[^>]*aria-current="page"/);assert.match(html,/Vœu actuellement ouvert/);
});
test('root=direct parent is shown once; root opened is current and evolution appears once as evolution',()=>{
 const evolution={...current,parentSemanticId:'root'};
 const html=render(evolution,[root,evolution],{wishes:[root,evolution].map(publicRecord),events:[]});assert.equal(html.split('Initial wish').length-1,1);
 const rootHtml=render(root,[root,evolution],{wishes:[root,evolution].map(publicRecord),events:[]});assert.equal(rootHtml.split('Viewed evolution').length-1,1);assert.match(rootHtml,/pa-context-child[^>]*[\s\S]*\(évolution\)/);assert(!rootHtml.includes('v41-current-state'));
});
test('missing snapshot parent never becomes a fabricated root',()=>{
 const m={...current,parentSemanticId:'omitted'};const data={wishes:[publicRecord(m)],events:[]};
 const c=context.context(m,[m],data);assert.equal(c.initial,null);assert(c.missing);
 const html=render(m,[m],data);assert.match(html,/Vœu initial indisponible/);assert.match(html,/chemin parent est indisponible/);assert(!html.includes('(vœu initial)'));
});
test('public parent/root references override stale renderer references without losing the missing path',()=>{
 const stale={...current,parentSemanticId:'root'};const data=world([]);data.wishes.find(w=>w.id==='current').parentWishId='omitted';
 const c=context.context(stale,[root,stale],data);assert.equal(c.initial.semanticId,'root');assert(c.missing);assert.equal(c.parents.length,0);
});
test('raw public records absent from semantic map are readable but not dead clickable links',()=>{
 const html=render(current,[current],world([]));assert(html.includes('Initial wish'));assert(!html.includes('data-nav-wish="root"'));assert(!html.includes('data-nav-wish="parent"'));assert(html.includes('data-nav-wish="current"'));assert.equal((html.match(/<div /g)||[]).length,(html.match(/<\/div>/g)||[]).length);
});
test('cycles and cross-lineage parent links stop safely; lateral graft events never enter path',()=>{
 const bad={...parent,parentSemanticId:'current'};assert(context.context(current,[root,bad,current],null).invalid);
 assert(context.context(current,[root,{...parent,lineageId:'other'},current],null).invalid);
 const c=context.context(current,[root,parent,current],world([{type:'connect',wishId:'current',payload:{otherWishId:'foreign'}}]));assert.deepEqual(c.parents.map(m=>m.semanticId),['parent']);assert.equal(c.initial.semanticId,'root');
});
test('support is exact public selected-wish count, never semantic or lineage count',()=>{
 const m={...current,helpCount:999,encouragements:999};assert.equal(context.counts(m,world([])).support.value,3);
 const data=world([]);data.wishes.find(w=>w.id==='current').encouragementCount=0;assert.equal(context.counts(m,data).support.value,0);
});
test('accepted help uses exact wish and dedupes public materializations, not pending/private data',()=>{
 const data=world([{id:'h1',type:'help',wishId:'current',payload:{proposalId:'p1'}},{id:'duplicate',type:'help',wishId:'current',payload:{proposalId:'p1'}},{id:'h2',type:'help',wishId:'current'},{id:'sibling',type:'help',wishId:'parent'},{id:'pending',type:'help_proposed',wishId:'current'}]);
 data.inbox={privatePayload:{note:'PRIVATE'}};assert.equal(context.counts(current,data).help.value,2);
});
test('one accepted suggestion with several child branches counts once on its historical direct source',()=>{
 const data=world([{id:'s1',type:'split',wishId:'child1',parentWishId:'current',payload:{proposalId:'p1'}},{id:'s2',type:'split',wishId:'child2',parentWishId:'current',payload:{proposalId:'p1'}},{id:'owner',type:'split',wishId:'own',parentWishId:'current',payload:{mode:'add_branch'}},{id:'other',type:'split',wishId:'current',parentWishId:'parent',payload:{proposalId:'p2'}},{id:'move',type:'reparent',wishId:'child1',parentWishId:'parent',payload:{oldParentWishId:'current'}}]);
 assert.equal(context.counts(current,data).suggest.value,1);assert.equal(context.counts(parent,data).suggest.value,1);
});
test('missing record/events and simulations never invent zeros or seed engagement',()=>{
 const unknown=context.counts({...current,simulated:true,helpCount:999},world([]));assert.deepEqual(Object.values(unknown).map(x=>x.value),[null,null,null]);
 assert.deepEqual(Object.values(context.counts(current,{wishes:[],events:[]})).map(x=>x.value),[null,null,null]);
 assert.equal(context.counts(current,world(undefined)).support.value,3);assert.equal(context.counts(current,world(undefined)).help.value,null);
});
test('full history yields exact zero, capped positive is a minimum and capped zero is unknown',()=>{
 assert.equal(context.counts(current,world([])).help.value,0);assert.equal(context.counts(current,world([])).suggest.value,0);
 const events=Array.from({length:3000},(_,i)=>({id:'e'+i,type:'create',wishId:'unrelated'}));
 const capped=context.counts(current,world(events));assert.equal(capped.help.value,null);assert.equal(capped.suggest.value,null);assert(capped.help.limited);
 events[0]={id:'h',type:'help',wishId:'current'};events[1]={id:'s',type:'split',parentWishId:'current',payload:{proposalId:'p'}};
 const positive=context.counts(current,world(events));assert.equal(positive.help.value,1);assert.equal(positive.suggest.value,1);assert(positive.help.limited);assert.match(context.countLabel(positive.help,'help','en'),/^At least 1/);assert.match(context.countLabel(positive.suggest,'suggest','fr'),/^Au moins 1/);
});
test('current short date and place are authoritative, no arbitrary simulated timestamp',()=>{
 const html=render();assert.match(html,/Montréal, Canada/);assert.match(html,/>16 oct\.</);assert.match(html,/datetime="2026-10-16/);
 const simulated=render({...current,simulated:true,created:100},[root,parent,current],world([]));assert(!simulated.includes('<time'));assert.match(simulated,/Date indisponible/);assert(!simulated.includes('Wish simulé'));
});
test('all title/metadata strings are escaped and unknown kind is not mislabeled as branch',()=>{
 const m={...current,text:'<img src=x onerror=alert(1)>',kind:'unknown'};const html=render(m,[m],null);assert(!html.includes('<img'));assert.match(html,/&lt;img/);assert.match(html,/\(vœu\)/);
});
test('both languages name root/evolution/current and count semantics explicitly',()=>{
 const html=render(current,[root,parent,current],world([]),'en');assert.match(html,/initial wish/);assert.match(html,/evolution/);assert.match(html,/Currently viewed wish/);
 assert.match(context.countLabel({value:2},'suggest','en'),/accepted branch suggestions/);assert.match(context.countLabel({value:2},'help','fr'),/aides acceptées/);
});

test('curated bilingual examples never call automatic translation',async()=>{
 const fs=require('node:fs'),vm=require('node:vm'),source=fs.readFileSync(require.resolve('./features.js'),'utf8');
 const start=source.indexOf('function requestWishTranslation('),end=source.indexOf('function decorateWishTextNode(',start);
 let calls=0;const sandbox={window:{__RALUVAAA_TRANSLATION__:{translate(){calls++;throw new Error('Unexpected external translation')}}}};
 vm.createContext(sandbox);vm.runInContext(source.slice(start,end),sandbox);
 assert.equal(await sandbox.requestWishTranslation({semanticId:'example',exampleVersion:1,text:'Texte rédigé'},'fr'),null);assert.equal(calls,0);
});

function translationHarness(){
 const fs=require('node:fs'),vm=require('node:vm'),source=fs.readFileSync(require.resolve('./features.js'),'utf8');
 let language='fr',viewed={semanticId:'viewed'},models=[],calls=[],warnings=[];
 const note=()=>({className:'',button:{textContent:''},querySelector(){return this.button},remove(){this.removed=true}});
 const sandbox={console:{warn:(...args)=>warnings.push(args)},window:{__RALUVAAA_SHARED_DEBUG__:{world:()=>({wishes:[]})},__RALUVAAA_TRANSLATION__:{translate(text,target){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});calls.push({text,target,resolve,reject});return promise}}},document:{createElement:note},lang:()=>language,current:()=>viewed,semantic:()=>models,escapeHtml:s=>s};
 vm.createContext(sandbox);vm.runInContext(source.slice(source.indexOf('const wishTranslationCache='),source.indexOf('function decorateWishTranslation()')),sandbox);
 const row=m=>({dataset:{contextWish:m.semanticId},isConnected:true,text:{dataset:{},textContent:m.text},nextElementSibling:null,querySelector(){return this.text},insertAdjacentElement(position,n){assert.equal(position,'afterend');this.note=n;this.nextElementSibling=n;n.classList={contains:c=>n.className===c}}});
 const body=(head,children=[])=>{const heading=head.map(row),childRows=children.map(row);return{heading,children:childRows,querySelectorAll(selector){if(selector==='.pa-context-heading [data-context-wish]')return heading;if(selector==='.pa-context-children [data-context-wish]')return childRows;throw Error('Unexpected selector '+selector)}}};
 const api=sandbox.window.__RALUVAAA_TRANSLATION__;
 return{calls,warnings,body,api:enabled=>sandbox.window.__RALUVAAA_TRANSLATION__=enabled?api:undefined,pending:()=>vm.runInContext('wishTranslationInflight.size',sandbox),decorate:b=>sandbox.decorateContextTranslations(b,viewed),models:v=>models=v,language:v=>language=v,viewed:v=>viewed={semanticId:v}};
}
const flushTranslations=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};
test('context translation caps 600 child previews at 24 while translating the whole active ancestry',async()=>{
 const h=translationHarness(),head=[root,parent,current],children=Array.from({length:600},(_,i)=>({semanticId:'child'+i,text:'Child '+i}));h.models([...head,...children]);const body=h.body(head,children);h.decorate(body);
 assert.equal(h.calls.length,27);assert.deepEqual(h.calls.map(x=>x.text),[...head,...children.slice(0,24)].map(x=>x.text));assert.equal(body.children[24].text.textContent,'Child 24','untranslated previews retain their original title');
 h.calls.forEach(c=>c.resolve({translation:'FR '+c.text,sourceLang:'en'}));await flushTranslations();assert(body.heading.every(r=>r.note));assert(body.children.slice(0,24).every(r=>r.note));assert.equal(body.children[24].note,undefined);
});
test('context translation dedupes in flight, caches per title/language, and does not request on redraw or reset original mode',async()=>{
 const h=translationHarness(),models=[root,parent,current];h.models(models);const first=h.body(models);h.decorate(first);h.decorate(first);assert.equal(h.calls.length,3);
 const inflightRedraw=h.body(models);first.heading.forEach(r=>r.isConnected=false);h.decorate(inflightRedraw);assert.equal(h.calls.length,3,'a snapshot shares pending requests');
 h.calls.forEach(c=>c.resolve({translation:'FR '+c.text,sourceLang:'en'}));await flushTranslations();assert(inflightRedraw.heading.every(r=>r.text.textContent.startsWith('FR ')));assert(first.heading.every(r=>!r.note),'detached nodes ignore late replies');
 inflightRedraw.heading[0].note.button.onclick();assert.equal(inflightRedraw.heading[0].text.textContent,root.text);h.decorate(inflightRedraw);assert.equal(inflightRedraw.heading[0].text.textContent,root.text,'simple decoration preserves explicit original');assert.equal(h.calls.length,3);
 const cachedRedraw=h.body(models);h.decorate(cachedRedraw);await flushTranslations();assert.equal(h.calls.length,3,'new nodes from a snapshot use cached title/language');assert(cachedRedraw.heading.every(r=>r.note));
 h.language('en');h.decorate(cachedRedraw);assert.equal(h.calls.length,6,'each title is requested once for a different language');h.decorate(cachedRedraw);assert.equal(h.calls.length,6);
 h.calls.slice(3).forEach(c=>c.resolve({translation:'EN '+c.text,sourceLang:'fr'}));await flushTranslations();assert(cachedRedraw.heading.every(r=>r.text.textContent.startsWith('EN ')));
 h.models([{...root,text:'Changed original'},parent,current]);h.decorate(cachedRedraw);assert.equal(h.calls.length,7,'changed original text gets its own cache key');
 assert.deepEqual(h.calls.map(c=>c.target+':'+c.text),['fr:'+root.text,'fr:'+parent.text,'fr:'+current.text,'en:'+root.text,'en:'+parent.text,'en:'+current.text,'en:Changed original']);
});
test('late context translations cannot apply to another viewed wish, language, or newer text',async()=>{
 const h=translationHarness();h.models([root]);const body=h.body([root]);h.decorate(body);h.viewed('another');h.calls[0].resolve({translation:'Obsolete',sourceLang:'en'});await flushTranslations();assert.equal(body.heading[0].text.textContent,root.text);assert.equal(body.heading[0].note,undefined);
 h.language('en');const languageBody=h.body([root]);h.decorate(languageBody);h.language('fr');h.calls[1].resolve({translation:'Wrong language',sourceLang:'fr'});await flushTranslations();assert.equal(languageBody.heading[0].text.textContent,root.text);assert.equal(languageBody.heading[0].note,undefined);
 const changed={...root,text:'New text'};h.models([changed]);h.decorate(body);h.models([{...changed,text:'Newest text'}]);h.decorate(body);h.calls[2].resolve({translation:'Old text translation',sourceLang:'en'});await flushTranslations();assert.equal(body.heading[0].text.textContent,'Newest text');assert.equal(body.heading[0].note,undefined);
 h.calls[3].resolve({translation:'Newest translation',sourceLang:'en'});await flushTranslations();assert.equal(body.heading[0].text.textContent,'Newest translation');assert(body.heading[0].note);body.heading[0].note.button.onclick();assert.equal(body.heading[0].text.textContent,'Newest text');
});
test('owner dormant/fading vitality note stays below current facts, with legacy metadata fallback',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),source=fs.readFileSync(require.resolve('../solo-experience-v42/ui-v42.js'),'utf8');
 for(const compact of [true,false])for(const status of ['dormant','fading']){
  let inserted,created;const anchor={insertAdjacentElement(position,n){inserted={position,n}}};
  const body={querySelector:s=>s===(compact?'.pa-context-facts':'.meta')?anchor:null,prepend(){assert.fail('A known facts/metadata anchor must never prepend above the root')}};
  const sandbox={window:{__RALUVAAA_UI__:{current:()=>({semanticId:'owner',owner:true,state:'alive',vitality:{status,days:24}})}},document:{getElementById:()=>body,createElement:()=>created={dataset:{}}},lang:()=> 'fr'};
  vm.createContext(sandbox);vm.runInContext(source.slice(source.indexOf('function currentVitality('),source.indexOf('function ensureWakeUnit(')),sandbox);sandbox.ensureVitalityNote();assert.equal(inserted.position,'afterend');assert.equal(inserted.n,created);assert.equal(created.dataset.state,status);assert.match(created.textContent,/24/);
 }
});

test('failed/empty translations remain original across redraws and retry only for new text/language/session',async()=>{
 for(const failure of ['reject','empty','whitespace']){
  const h=translationHarness();h.models([root]);const first=h.body([root]);h.decorate(first);const pending=h.body([root]);h.decorate(pending);assert.equal(h.calls.length,1);assert.equal(h.pending(),1,'one in-flight request serves concurrent rows');
  if(failure==='reject')h.calls[0].reject(Error('Temporary service error'));else h.calls[0].resolve({translation:failure==='empty'?'':'  \n '});await flushTranslations();assert.equal(h.pending(),0,'settled failure clears the in-flight entry');
  for(const b of [first,pending,h.body([root]),h.body([root])]){h.decorate(b);await flushTranslations();assert.equal(h.calls.length,1,'redraw cannot repeat a settled failing request');assert.equal(b.heading[0].text.textContent,root.text);assert.equal(b.heading[0].note,undefined,'original text needs no misleading translation note')}
  assert.equal(h.warnings.length,failure==='reject'?1:0);
  h.language('en');const english=h.body([root]);h.decorate(english);assert.equal(h.calls.length,2,'new language permits one attempt');h.decorate(english);assert.equal(h.calls.length,2);h.calls[1].resolve({translation:'Successful translation',sourceLang:'fr'});await flushTranslations();assert.equal(english.heading[0].text.textContent,'Successful translation');english.heading[0].note.button.onclick();assert.equal(english.heading[0].text.textContent,root.text);h.decorate(english);assert.equal(h.calls.length,2);
  const changed={...root,text:'A different original'};h.models([changed]);h.decorate(english);assert.equal(h.calls.length,3,'changed text permits one attempt');h.calls[2].resolve({translation:'Different translation',sourceLang:'fr'});await flushTranslations();assert.equal(english.heading[0].text.textContent,'Different translation');
  const fresh=translationHarness();fresh.models([root]);fresh.decorate(fresh.body([root]));assert.equal(fresh.calls.length,1,'a fresh page session retries the previous failure');
 }
});
test('an uninitialized translation API does not poison the per-session cache',async()=>{
 const h=translationHarness();h.models([root]);h.api(false);const first=h.body([root]);h.decorate(first);await flushTranslations();assert.equal(h.calls.length,0);assert.equal(h.pending(),0);assert.equal(first.heading[0].text.textContent,root.text);
 h.api(true);const ready=h.body([root]);h.decorate(ready);assert.equal(h.calls.length,1,'a subsequent snapshot can translate after API initialization');h.calls[0].resolve({translation:'Available now',sourceLang:'en'});await flushTranslations();assert.equal(ready.heading[0].text.textContent,'Available now');assert(ready.heading[0].note);
});
