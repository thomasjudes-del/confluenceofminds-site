const assert=require('node:assert/strict');
const {chromium}=require('playwright');

const BASE='http://127.0.0.1:4173/raluvaaa/solo-mobile-v28/?soloqa=1&fresh=1';
const STORE='raluvaaaSoloMobileV28R1';
const POLICY='raluvaaaEntrustedSoloMobileV28R1';

async function waitReady(page){
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__RV26_SOLO__&&window.__RV26_SOLO__.semantic().length>100,{timeout:30000});
  await page.waitForFunction(()=>window.__RALUVAAA_ACTION_AUDIO__&&window.__RALUVAAA_AUDIO__,{timeout:10000});
}
async function semantic(page){return page.evaluate(()=>window.__RV26_SOLO__.semantic())}
async function state(page){return page.evaluate(()=>window.__RV26_SOLO__.state())}
async function openWish(page,id){
  await page.evaluate(id=>window.__RV26_SOLO__.open(id),id);
  await page.waitForSelector('#drawer:not(.hidden) .wish',{timeout:5000});
}
async function openMore(page){
  const d=page.locator('details.more');if(!await d.count())return false;
  if(!await d.evaluate(el=>el.open))await d.locator('summary').click();
  return true;
}
async function idByText(page,text){
  return page.evaluate(text=>window.__RV26_SOLO__.semantic().find(x=>x.text===text)?.semanticId||null,text);
}
async function waitSound(page,name,after){
  await page.waitForFunction(({name,after})=>(window.__RALUVAAA_ACTION_AUDIO__?.history||[]).some(x=>x.name===name&&x.at>=after),{name,after},{timeout:5000});
}
async function assertNoOverflow(page,label){
  const m=await page.evaluate(()=>({iw:innerWidth,sw:document.documentElement.scrollWidth,bw:document.body.scrollWidth,drawer:document.getElementById('drawer')?.getBoundingClientRect(),drawerHidden:document.getElementById('drawer')?.classList.contains('hidden')}));
  assert(m.sw<=m.iw+1,label+' document overflow');
  assert(m.bw<=m.iw+1,label+' body overflow');
  if(m.drawer&&!m.drawerHidden)assert(m.drawer.left>=-1&&m.drawer.right<=m.iw+1,label+' drawer outside viewport');
}
async function createWish(page,text,loc){
  const expected=String(text).trim();
  await page.click('#createBtn');
  await page.fill('#wishInput',text);
  if(loc!==undefined)await page.fill('#locInput',loc);
  const t=Date.now();
  await page.click('#confirm');
  await page.waitForFunction(text=>window.__RV26_SOLO__.semantic().some(x=>x.text===text),expected,{timeout:10000});
  await waitSound(page,'create',t);
  await page.waitForFunction(after=>(window.__RALUVAAA_ACTION_AUDIO__?.mediaHistory||[]).some(x=>x.name==='create'&&x.at>=after),t,{timeout:5000});
  assert.equal(await page.evaluate(()=>window.__RALUVAAA_ACTION_AUDIO__.semanticChannel instanceof HTMLAudioElement),true,'create sound must use the iOS-safe HTMLAudio semantic channel');
  await page.waitForFunction(after=>(window.__RALUVAAA_ACTION_AUDIO__?.playbackHistory||[]).some(x=>x.name==='create'&&x.at>=after),t,{timeout:5000});
  assert((await page.evaluate(()=>window.__RALUVAAA_ACTION_AUDIO__.semanticChannel.src)).includes('/raluvaaa/solo-mobile-v28/audio/create.mp3'),'CREATE must use the poetic recorded sample, not a synthesized notification tone');
  await page.waitForSelector('#ritualLayer .rv-seed',{timeout:5000});
  return await idByText(page,expected);
}
async function clickConfirmDialog(page,selector,accept){
  page.once('dialog',d=>accept?d.accept():d.dismiss());
  await page.click(selector);
}
(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1365,height:820},locale:'fr-FR',geolocation:{latitude:41.9028,longitude:12.4964},permissions:['clipboard-read','clipboard-write','geolocation']});
  const page=await context.newPage();
  await page.route('https://nominatim.openstreetmap.org/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({address:{city:'Rome',country:'Italie'}})}));
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await waitReady(page);

  assert.equal(await page.title(),'RALUVAAA · Solo Mobile V28');
  assert.equal(await page.locator('#inboxBtn').isHidden(),true,'solo must hide inbox');
  assert.equal(await page.locator('#qaStrip').isHidden(),true,'solo must hide A/B QA controls');
  assert.equal((await state(page)).events.length,0,'solo candidate must start with no fake personal wish');
  assert.equal(await page.evaluate(()=>window.RALUVAAA_STORE_KEY),STORE,'V28 must use an isolated local wish store');
  assert.equal(await page.evaluate(()=>window.RALUVAAA_ENTRUSTED_POLICY_KEY),POLICY,'V28 must use an isolated entrusted policy cache');
  assert.equal(await page.evaluate(()=>window.__RALUVAAA_AUDIO__.audio.loop),true,'Immersed must loop until the soundtrack shortlist is validated');
  assert.deepEqual(await page.evaluate(()=>window.__RALUVAAA_PLAYLIST__?.tracks),['Immersed'],'only validated soundtrack Immersed may play');
  assert.equal(await page.evaluate(()=>window.__RALUVAAA_V27__?.version),27,'organic visual layer must remain active');
  assert.equal(await page.evaluate(()=>window.__RALUVAAA_V28__?.version),28,'V28 mobile-first layer must be active');
  assert.equal(await page.evaluate(()=>window.__RALUVAAA_AUDIO__.audio.autoplay),true,'V28 must attempt ambient autoplay');
  assert.equal(await page.evaluate(()=>window.__RALUVAAA_AUDIO__.audio.preload),'auto','V28 must preload ambient audio');
  assert.equal(await page.locator('#rvAtmosphere').count(),1,'V27 living atmosphere canvas must exist');
  const motifs=await page.evaluate(()=>Object.keys(window.__RALUVAAA_ACTION_AUDIO__.motifs));
  const samples=await page.evaluate(()=>window.__RALUVAAA_ACTION_AUDIO__.poeticSamples);
  assert.equal(samples.create,'audio/create.mp3');
  for(const name of ['create','encourage','evolve','split','branch_add','connect','help','bloom','abandon','resume','close_lineage'])assert(samples[name],'missing poetic sample mapping '+name);
  for(const name of ['create','correct','evolve','split','branch_add','reparent','bloom','abandon','resume','close_lineage','resume_lineage','remove','share'])assert(motifs.includes(name),'missing sound motif '+name);

  assert.equal(await page.locator('#musicBtn .sound-note').count(),1,'music control must use a music-note glyph');
  assert.equal((await page.locator('#musicBtn').innerText()).trim(),'♪','enabled sound icon must be a note');
  const mini=await page.evaluate(()=>{const f=document.getElementById('engine').contentWindow,c=f.document.getElementById('mini'),r=c.getBoundingClientRect();if(r.width<2||r.height<2)return{visible:false};const x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height).data,w=c.width,h=c.height;let bright=0,opaque=0,rowMax=0;for(let y=0;y<h;y++){let row=0;for(let xx=0;xx<w;xx++){const i=(y*w+xx)*4,a=d[i+3];if(a>20)opaque++;if(a>90&&d[i]>220&&d[i+1]>220&&d[i+2]>220){bright++;row++}}rowMax=Math.max(rowMax,row)}return{visible:true,w,h,brightRatio:bright/(w*h),rowBrightRatio:rowMax/w,opaqueRatio:opaque/(w*h)}});assert.equal(mini.visible,true,'desktop minimap should render');assert(mini.brightRatio<.08,'minimap must not contain a large white block: '+JSON.stringify(mini));assert(mini.rowBrightRatio<.35,'minimap must not contain white stripe artifacts: '+JSON.stringify(mini));

  // Entrusted wishes remain part of solo discovery but are read-only.
  await page.click('#entrustedBtn');
  await page.waitForFunction(()=>document.querySelectorAll('#drawerBody [data-entrusted-band]').length===3,{timeout:10000});
  assert.equal(await page.locator('#drawerBody [data-entrusted-band]').count(),3);
  const timerColors=await page.locator('#drawerBody [data-entrusted-band] .m').evaluateAll(els=>els.map(el=>getComputedStyle(el).color));
  assert.equal(new Set(timerColors).size,3,'entrusted countdowns must keep three distinct rarity colors');
  assert(timerColors.every(c=>!c.includes('219, 230, 246')),'entrusted countdowns must not regress to generic grey');
  const entrustedIds=await page.locator('#drawerBody [data-open]').evaluateAll(els=>els.slice(0,3).map(x=>x.dataset.open));
  assert.equal(new Set(entrustedIds).size,3,'entrusted slots must be distinct');
  await page.click('#drawerBody [data-open="'+entrustedIds[0]+'"]');
  await page.waitForSelector('#drawer:not(.hidden) .wish');
  assert.equal(await page.locator('#drawerBody [data-act="encourage"],#drawerBody [data-act="help"],#drawerBody [data-act="suggest"],#drawerBody [data-act="connect"]').count(),0,'simulated entrusted wish must be read-only in solo');
  await page.click('#drawerClose');

  // Empty My wishes.
  await page.click('#myWorldBtn');
  assert((await page.locator('#drawerBody').innerText()).includes('Aucun wish'),'solo My wishes should start empty');
  await page.click('#drawerClose');

  // Location is mandatory and is prefilled from the place where the wish is formulated.
  await page.click('#createBtn');
  await page.waitForFunction(()=>document.getElementById('locInput')?.value==='Rome, Italie',{timeout:5000});
  assert((await page.locator('#locStatus').innerText()).includes('OpenStreetMap'),'geolocated place should show its source');
  await page.fill('#wishInput','Wish sans lieu interdit');
  await page.fill('#locInput','');
  await page.click('#confirm');
  assert((await page.locator('#toast').innerText()).toLowerCase().includes('lieu'),'creation without location must be rejected');
  assert(!(await semantic(page)).some(x=>x.text==='Wish sans lieu interdit'),'wish without location must not be created');
  await page.click('#cancel');

  // Cancel CREATE must leave no trace.
  const createSoundBefore=await page.evaluate(()=>window.__RALUVAAA_ACTION_AUDIO__.history.filter(x=>x.name==='create').length);
  await page.click('#createBtn');
  await page.fill('#wishInput','This must never be created');
  await page.click('#cancel');
  assert.equal((await state(page)).events.length,0,'cancelled create must leave no event');
  assert.equal(await page.evaluate(()=>window.__RALUVAAA_ACTION_AUDIO__.history.filter(x=>x.name==='create').length),createSoundBefore,'cancelled create must be silent');

  // CREATE + persistence.
  let rootText='Je veux apprendre à naviguer assez bien pour traverser une baie.';
  const root=await createWish(page,rootText,'Nantes, France');
  assert(root,'root id required');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__RV26_SOLO__&&window.__RV26_SOLO__.semantic().some(x=>x.text==='Je veux apprendre à naviguer assez bien pour traverser une baie.'),{timeout:20000});
  assert.equal(await idByText(page,rootText),root,'reload must preserve own wish identity');

  // My wishes opens the exact root.
  await page.click('#myWorldBtn');
  await page.click('#drawerBody [data-open="'+root+'"]');
  assert((await page.locator('#drawerBody .wish').innerText()).includes('apprendre à naviguer'));
  await openMore(page);
  assert.equal(await page.locator('[data-act="connect"]').count(),0,'solo candidate must not expose CONNECT on own wishes');

  // CORRECT cancel then confirm. This is not an evolution.
  await openMore(page);
  await page.click('[data-act="correct"]');
  await page.fill('#correctText','Texte temporaire');
  await page.click('#cancel');
  assert.equal((await semantic(page)).find(x=>x.semanticId===root).text,rootText,'cancelled correction must not change wish');
  await openWish(page,root);
  await openMore(page);
  await page.click('[data-act="correct"]');
  rootText='Je veux apprendre à bien naviguer pour traverser une baie.';
  await page.fill('#correctText',rootText);
  await page.fill('#correctLoc','Pornichet, France');
  let t=Date.now();await page.click('#confirm');
  await page.waitForFunction(([id,text])=>window.__RV26_SOLO__.semantic().find(x=>x.semanticId===id)?.text===text,[root,rootText],{timeout:8000});
  await waitSound(page,'correct',t);
  await page.waitForSelector('#ritualLayer .rv-ring.soft',{timeout:5000});
  assert.equal((await semantic(page)).find(x=>x.semanticId===root).loc,'Pornichet, France');

  // EVOLVE cancel then confirm.
  await openWish(page,root);
  await page.click('[data-act="evolve"]');
  await page.fill('#evolveInput','Temporary evolution');
  await page.click('#cancel');
  assert(!(await semantic(page)).some(x=>x.text==='Temporary evolution'));
  await openWish(page,root);
  await page.click('[data-act="evolve"]');
  const evolveText='Je commence par une première sortie encadrée.';
  await page.fill('#evolveInput',evolveText);
  t=Date.now();await page.click('#confirm');
  await page.waitForFunction(text=>window.__RV26_SOLO__.semantic().some(x=>x.text===text),evolveText,{timeout:8000});
  await waitSound(page,'evolve',t);
  await page.waitForSelector('#ritualLayer .rv-path',{timeout:5000});
  const evolved=await idByText(page,evolveText);
  await openWish(page,root);
  assert.equal(await page.locator('[data-act="evolve"]').count(),0,'old state must not evolve twice');

  // SPLIT requires two branches.
  await openWish(page,evolved);
  await page.click('[data-act="split"]');
  await page.fill('#branchInput','Une seule branche');
  await page.click('#confirm');
  assert((await page.locator('#toast').innerText()).includes('au moins deux'),'split with one branch must be rejected');
  await page.fill('#branchInput','Trouver un club de voile\nApprendre les noeuds essentiels');
  t=Date.now();await page.click('#confirm');
  await page.waitForFunction(()=>window.__RV26_SOLO__.semantic().filter(x=>x.text==='Trouver un club de voile'||x.text==='Apprendre les noeuds essentiels').length===2,{timeout:8000});
  await waitSound(page,'split',t);
  await page.waitForSelector('#ritualLayer .rv-path',{timeout:5000});
  await page.waitForFunction(()=>document.getElementById('drawer').classList.contains('hidden'),null,{timeout:3000});
  const b1=await idByText(page,'Trouver un club de voile');
  const b2=await idByText(page,'Apprendre les noeuds essentiels');

  // Wish sheet must navigate into branches, back to parent, and directly to root.
  await openWish(page,evolved);
  assert.equal(await page.locator('[data-nav-wish="'+b1+'"]').count(),1,'parent sheet must expose its branches');
  await page.click('[data-nav-wish="'+b1+'"]');
  assert.equal((await page.locator('#drawerBody .wish').innerText()).trim(),'Trouver un club de voile');
  await page.waitForSelector('.v28-back',{state:'visible',timeout:2000});
  await page.waitForSelector('.v28-root',{state:'visible',timeout:2000});
  assert.equal(await page.locator('.v28-back').count(),1,'child sheet must expose a visible parent back control');
  assert.equal(await page.locator('.v28-root').count(),1,'child sheet must expose a direct root control');
  await page.click('.v28-back');
  assert.equal((await page.locator('#drawerBody .wish').innerText()).trim(),evolveText);
  await page.click('[data-nav-wish="'+b1+'"]');
  await page.click('.v28-root');
  assert.equal((await page.locator('#drawerBody .wish').innerText()).trim(),rootText);

  // ADD BRANCH later.
  await openWish(page,evolved);
  await page.click('[data-act="branch"]');
  await page.fill('#branchInput','Faire une première sortie en mer');
  t=Date.now();await page.click('#confirm');
  await page.waitForFunction(()=>window.__RV26_SOLO__.semantic().some(x=>x.text==='Faire une première sortie en mer'),{timeout:8000});
  await waitSound(page,'branch_add',t);
  await page.waitForSelector('#ritualLayer .rv-path',{timeout:5000});
  const b3=await idByText(page,'Faire une première sortie en mer');

  // REATTACH cancel then confirm.
  await openWish(page,b1);
  await openMore(page);
  await page.click('[data-act="reattach"]');
  const opts=await page.locator('#parentSelect option').evaluateAll(os=>os.map(o=>o.value));
  assert(!opts.includes(b1),'reattach cannot target itself');
  await page.selectOption('#parentSelect',b2);
  await page.click('#cancel');
  assert.equal((await semantic(page)).find(x=>x.semanticId===b1).parentSemanticId,evolved,'cancelled reattach must preserve parent');
  await openWish(page,b1);
  await openMore(page);
  await page.click('[data-act="reattach"]');
  await page.selectOption('#parentSelect',b2);
  t=Date.now();await page.click('#confirm');
  await page.waitForFunction(([id,p])=>window.__RV26_SOLO__.semantic().find(x=>x.semanticId===id)?.parentSemanticId===p,[b1,b2],{timeout:8000});
  await waitSound(page,'reparent',t);
  await page.waitForSelector('#ritualLayer .rv-seed',{timeout:5000});

  // A non-root branch with active descendants cannot terminate into a contradictory state.
  await openWish(page,b2);await openMore(page);
  await page.click('[data-act="abandon"]');
  assert((await page.locator('#toast').innerText()).includes('branches actives'),'branch abandon must be blocked while its descendant is active');
  assert.equal((await semantic(page)).find(x=>x.semanticId===b2).state,'alive');

  // The root wish is different: it may bloom even if some paths are unfinished.
  const altRoot=await createWish(page,'Trouver un amour réciproque','Rome, Italie');
  await openWish(page,altRoot);
  assert.equal(await page.locator('[data-act="bloom"]').getAttribute('data-v27-bloom'),'root','root bloom must remain semantically distinct');
  await page.click('[data-act="split"]');
  await page.fill('#branchInput','Oser aborder\nAccepter une invitation');
  await page.click('#confirm');
  await page.waitForFunction(()=>window.__RV26_SOLO__.semantic().some(x=>x.text==='Oser aborder')&&window.__RV26_SOLO__.semantic().some(x=>x.text==='Accepter une invitation'),{timeout:8000});
  const alt1=await idByText(page,'Oser aborder'),alt2=await idByText(page,'Accepter une invitation');
  await openWish(page,alt1);
  assert.equal(await page.locator('[data-act="bloom"]').getAttribute('data-v27-bloom'),'branch','branch bloom must remain semantically distinct');
  await openWish(page,altRoot);
  const abandonSoundsBeforeRootBloom=await page.evaluate(()=>window.__RALUVAAA_ACTION_AUDIO__.history.filter(x=>x.name==='abandon').length);
  let rootBloomMessage='';
  page.once('dialog',d=>{rootBloomMessage=d.message();d.accept()});
  t=Date.now();await page.click('[data-act="bloom"]');
  await page.waitForFunction(id=>window.__RV26_SOLO__.semantic().find(x=>x.semanticId===id)?.state==='bloom',altRoot,{timeout:8000});
  await waitSound(page,'bloom',t);
  assert(rootBloomMessage.includes('branches actives'),'root bloom must warn about unfinished paths');
  const altStates=await semantic(page);
  assert.equal(altStates.find(x=>x.semanticId===alt1).state,'abandoned','unfinished path should fade when root wish blooms');
  assert.equal(altStates.find(x=>x.semanticId===alt2).state,'abandoned','unfinished path should fade when root wish blooms');
  assert.equal(await page.evaluate(()=>window.__RALUVAAA_ACTION_AUDIO__.history.filter(x=>x.name==='abandon').length),abandonSoundsBeforeRootBloom,'automatic fading after root bloom must stay acoustically quiet');

  // ABANDON cancel then confirm, then RESUME.
  await openWish(page,b3);
  await openMore(page);
  const abandonSoundBefore=await page.evaluate(()=>window.__RALUVAAA_ACTION_AUDIO__.history.filter(x=>x.name==='abandon').length);
  await clickConfirmDialog(page,'[data-act="abandon"]',false);
  assert.equal((await semantic(page)).find(x=>x.semanticId===b3).state,'alive','dismissed abandon must preserve state');
  assert.equal(await page.evaluate(()=>window.__RALUVAAA_ACTION_AUDIO__.history.filter(x=>x.name==='abandon').length),abandonSoundBefore,'dismissed abandon must be silent');
  await openWish(page,b3);await openMore(page);
  t=Date.now();await clickConfirmDialog(page,'[data-act="abandon"]',true);
  await page.waitForFunction(id=>window.__RV26_SOLO__.semantic().find(x=>x.semanticId===id)?.state==='abandoned',b3,{timeout:8000});
  await waitSound(page,'abandon',t);
  await page.waitForSelector('#ritualLayer .rv-ring',{timeout:5000});
  await openWish(page,b3);
  assert.equal(await page.locator('[data-act="resume"]').count(),1,'abandoned branch must offer Resume');
  assert.equal(await page.locator('[data-act="evolve"],[data-act="split"],[data-act="branch"],[data-act="bloom"]').count(),0,'abandoned branch must not expose active actions');
  await openMore(page);
  assert.equal(await page.locator('[data-act="remove"]').count(),0,'abandoned trace must not expose mistake deletion');
  t=Date.now();await clickConfirmDialog(page,'[data-act="resume"]',true);
  await page.waitForFunction(id=>window.__RV26_SOLO__.semantic().find(x=>x.semanticId===id)?.state==='alive',b3,{timeout:8000});
  await waitSound(page,'resume',t);
  await page.waitForSelector('#ritualLayer .rv-bud',{timeout:5000});

  // BLOOM cancel then confirm. Terminal action set must be coherent.
  await openWish(page,b1);
  const bloomSoundBefore=await page.evaluate(()=>window.__RALUVAAA_ACTION_AUDIO__.history.filter(x=>x.name==='bloom').length);
  await clickConfirmDialog(page,'[data-act="bloom"]',false);
  assert.equal((await semantic(page)).find(x=>x.semanticId===b1).state,'alive');
  assert.equal(await page.evaluate(()=>window.__RALUVAAA_ACTION_AUDIO__.history.filter(x=>x.name==='bloom').length),bloomSoundBefore,'dismissed bloom must be silent');
  await openWish(page,b1);
  t=Date.now();await clickConfirmDialog(page,'[data-act="bloom"]',true);
  await page.waitForFunction(id=>window.__RV26_SOLO__.semantic().find(x=>x.semanticId===id)?.state==='bloom',b1,{timeout:8000});
  await waitSound(page,'bloom',t);
  await page.waitForSelector('#ritualLayer .rv-petal',{timeout:5000});
  await openWish(page,b1);
  assert.equal(await page.locator('[data-act="evolve"],[data-act="split"],[data-act="branch"],[data-act="bloom"],[data-act="abandon"],[data-act="resume"],[data-act="connect"]').count(),0,'bloomed branch must be terminal');
  await openMore(page);
  assert.equal(await page.locator('[data-act="remove"]').count(),0,'bloomed trace must not expose mistake deletion');

  // Remove mistake with descendants must be blocked.
  await openWish(page,root);await openMore(page);
  await page.click('[data-act="remove"]');
  assert((await page.locator('#toast').innerText()).includes('déjà une suite'),'root with descendants must not be removable');
  assert((await semantic(page)).some(x=>x.semanticId===root),'blocked removal must preserve root');

  // CLOSE WHOLE WISH cancel then confirm, then RESUME WHOLE WISH.
  await openWish(page,root);await openMore(page);
  await clickConfirmDialog(page,'[data-act="close_lineage"]',false);
  assert.equal((await semantic(page)).find(x=>x.semanticId===root).state,'alive');
  await openWish(page,root);await openMore(page);
  t=Date.now();await clickConfirmDialog(page,'[data-act="close_lineage"]',true);
  await page.waitForFunction(id=>window.__RV26_SOLO__.semantic().filter(x=>x.lineageId===window.__RV26_SOLO__.semantic().find(y=>y.semanticId===id).lineageId&&x.owner&&x.state==='alive').length===0,root,{timeout:8000});
  await waitSound(page,'close_lineage',t);
  await page.waitForSelector('#ritualLayer .rv-ring.decline',{timeout:5000});
  await openWish(page,root);
  assert.equal(await page.locator('[data-act="resume_lineage"]').count(),1,'closed root must offer Resume wish');
  t=Date.now();await clickConfirmDialog(page,'[data-act="resume_lineage"]',true);
  await page.waitForFunction(id=>window.__RV26_SOLO__.semantic().find(x=>x.semanticId===id)?.state==='alive',root,{timeout:8000});
  await waitSound(page,'resume_lineage',t);
  await page.waitForSelector('#ritualLayer .rv-bud',{timeout:5000});
  assert.equal((await semantic(page)).find(x=>x.semanticId===b1).state,'bloom','whole-wish resume must not reopen a bloomed branch');

  // SHARE produces a deep link and sound; deep link reopens exact wish after reload.
  await openWish(page,root);await openMore(page);
  t=Date.now();await page.click('[data-act="share"]');await waitSound(page,'share',t);
  const copied=await page.evaluate(()=>navigator.clipboard.readText());
  assert(copied.includes('#wish='+encodeURIComponent(root)),'share must copy deep link');
  await page.goto(copied,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__RV26_SOLO__&&window.__RV26_SOLO__.semantic().length>100,{timeout:20000});
  await page.waitForSelector('#drawer:not(.hidden) .wish',{timeout:8000});
  assert((await page.locator('#drawerBody .wish').innerText()).includes('bien naviguer'),'deep link must open exact wish');

  // FOCUS LINEAGE remains available without crowding primary actions.
  await openWish(page,root);await openMore(page);await page.click('[data-act="focus"]');
  assert(await page.locator('#modeBar').isVisible(),'lineage focus mode must be visible');
  assert((await page.locator('#modeText').innerText()).includes('Lignée'));
  await page.click('#modeClose');assert(await page.locator('#modeBar').isHidden());

  // Untouched accidental wish can be removed, with sound and visual erasure.
  const accidental=await createWish(page,'Wish créé par erreur','Nantes, France');
  await openWish(page,accidental);await openMore(page);
  t=Date.now();await clickConfirmDialog(page,'[data-act="remove"]',true);
  await waitSound(page,'remove',t);
  await page.waitForSelector('#ritualLayer .rv-collapse',{timeout:5000});
  await page.waitForFunction(id=>!window.__RV26_SOLO__.semantic().some(x=>x.semanticId===id),accidental,{timeout:8000});

  // FR/EN switch updates product copy and returns cleanly.
  await page.click('[data-lang="en"]');
  await page.click('#createBtn');assert.equal((await page.locator('.sheet h3').innerText()).trim(),'Release a wish');await page.click('#cancel');
  await page.click('[data-lang="fr"]');

  // Long valid content and mobile layout.
  const longText=('Construire quelque chose de beau, durable et réellement utile avec plusieurs personnes, en avançant par petites étapes concrètes. '.repeat(3)).slice(0,279);
  const longId=await createWish(page,longText,'Saint-Etienne-de-Montluc, Loire-Atlantique, France');
  await page.setViewportSize({width:390,height:844});await openWish(page,longId);await assertNoOverflow(page,'mobile long wish');
  const target=await page.locator('#drawerBody [data-act="evolve"]').boundingBox();assert(target&&target.height>=48,'mobile action target must remain comfortably tappable');
  const railBox=await page.locator('#rail').boundingBox();assert(railBox&&railBox.y>760,'primary mobile rail must float at the bottom: '+JSON.stringify(railBox));
  const drawerBox=await page.locator('#drawer').boundingBox();assert(drawerBox&&drawerBox.width>350&&drawerBox.y>180,'wish UI must be a mobile bottom sheet leaving the world visible: '+JSON.stringify(drawerBox));
  assert.equal(await page.locator('#drawerBody .drawer-kicker:visible').count(),0,'technical wish kicker must not clutter the mobile sheet');
  await page.click('#createBtn');await page.locator('#wishInput').focus();const inputBox=await page.locator('#wishInput').boundingBox();assert(inputBox&&inputBox.x>=0&&inputBox.x+inputBox.width<=390,'mobile create input must stay in viewport: '+JSON.stringify(inputBox));await page.click('#cancel');

  // Music and sound design are distinct: muting the soundtrack must not kill interaction sounds.
  await page.click('#musicBtn');
  assert.equal(await page.evaluate(()=>window.__RALUVAAA_AUDIO__.enabled),false,'music button must mute ambience');
  assert.equal((await page.locator('#musicBtn').innerText()).trim(),'♪','muted music icon must remain a music note, not an X');
  await page.waitForTimeout(180);
  assert.equal(await page.locator('#musicBtn .sound-strike').count(),1,'muted note must include a strike');
  assert(parseFloat(await page.locator('#musicBtn .sound-strike').evaluate(el=>getComputedStyle(el).opacity))>.8,'muted note strike must be visible');
  const fxBefore=await page.evaluate(()=>window.__RALUVAAA_ACTION_AUDIO__.mediaHistory.length);
  assert.equal(await page.evaluate(()=>window.__RALUVAAA_ACTION_AUDIO__.playSemantic('correct')),true,'semantic sound design must remain active when soundtrack is muted');
  await page.waitForFunction(n=>window.__RALUVAAA_ACTION_AUDIO__.mediaHistory.length>n,fxBefore,{timeout:5000});
  await page.click('#musicBtn');
  assert.equal(await page.evaluate(()=>window.__RALUVAAA_AUDIO__.enabled),true,'music button must restore ambience');

  // Final persistence and no runtime errors.
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(id=>window.__RV26_SOLO__&&window.__RV26_SOLO__.semantic().some(x=>x.semanticId===id),root,{timeout:20000});
  assert.deepEqual(errors,[],errors.join('\n'));
  console.log('RALUVAAA Solo Mobile V28 regression QA passed');
  await browser.close();
})().catch(err=>{console.error(err);process.exit(1)});