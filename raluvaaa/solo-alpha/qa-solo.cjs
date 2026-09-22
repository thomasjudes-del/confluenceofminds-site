const assert=require('node:assert/strict');
const {chromium}=require('playwright');

const BASE='http://127.0.0.1:4173/raluvaaa/solo-alpha/?soloqa=1';
const STORE='raluvaaaSoloAlphaV1';
const POLICY='raluvaaaEntrustedSoloV1';

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
async function idByText(page,text){
  return page.evaluate(text=>window.__RV26_SOLO__.semantic().find(x=>x.text===text)?.semanticId||null,text);
}
async function waitSound(page,name,after){
  await page.waitForFunction(({name,after})=>(window.__RALUVAAA_ACTION_AUDIO__?.history||[]).some(x=>x.name===name&&x.at>=after),{name,after},{timeout:5000});
}
async function assertNoOverflow(page,label){
  const m=await page.evaluate(()=>({iw:innerWidth,sw:document.documentElement.scrollWidth,bw:document.body.scrollWidth,drawer:document.getElementById('drawer')?.getBoundingClientRect()}));
  assert(m.sw<=m.iw+1,label+' document overflow');
  assert(m.bw<=m.iw+1,label+' body overflow');
  if(m.drawer&&!document.getElementById('drawer').classList.contains('hidden'))assert(m.drawer.left>=-1&&m.drawer.right<=m.iw+1,label+' drawer outside viewport');
}
async function createWish(page,text,loc){
  await page.click('#createBtn');
  await page.fill('#wishInput',text);
  await page.fill('#locInput',loc||'');
  const t=Date.now();
  await page.click('#confirm');
  await page.waitForFunction(text=>window.__RV26_SOLO__.semantic().some(x=>x.text===text),text,{timeout:10000});
  await waitSound(page,'create',t);
  await page.waitForSelector('#ritualLayer .rv-seed',{timeout:5000});
  return await idByText(page,text);
}
async function clickConfirmDialog(page,selector,accept){
  page.once('dialog',d=>accept?d.accept():d.dismiss());
  await page.click(selector);
}
(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1365,height:820},locale:'fr-FR',permissions:['clipboard-read','clipboard-write']});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await waitReady(page);

  assert.equal(await page.title(),'RALUVAAA · Solo RC');
  assert.equal(await page.locator('#inboxBtn').isHidden(),true,'solo must hide inbox');
  assert.equal(await page.locator('#qaStrip').isHidden(),true,'solo must hide A/B QA controls');
  assert.equal((await state(page)).events.length,0,'solo candidate must start with no fake personal wish');
  assert.equal(await page.evaluate(()=>window.__RALUVAAA_AUDIO__.audio.loop),true,'ambient music must loop');
  const motifs=await page.evaluate(()=>Object.keys(window.__RALUVAAA_ACTION_AUDIO__.motifs));
  for(const name of ['create','correct','evolve','split','branch_add','reparent','bloom','abandon','resume','close_lineage','resume_lineage','remove','share'])assert(motifs.includes(name),'missing sound motif '+name);

  // Entrusted wishes remain part of solo discovery but are read-only.
  await page.click('#entrustedBtn');
  await page.waitForFunction(()=>document.querySelectorAll('#drawerBody [data-entrusted-band]').length===3,{timeout:10000});
  assert.equal(await page.locator('#drawerBody [data-entrusted-band]').count(),3);
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

  // Cancel CREATE must leave no trace.
  await page.click('#createBtn');
  await page.fill('#wishInput','This must never be created');
  await page.click('#cancel');
  assert.equal((await state(page)).events.length,0,'cancelled create must leave no event');

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

  // CORRECT cancel then confirm. This is not an evolution.
  await page.locator('details.more summary').click();
  await page.click('[data-act="correct"]');
  await page.fill('#correctText','Texte temporaire');
  await page.click('#cancel');
  assert.equal((await semantic(page)).find(x=>x.semanticId===root).text,rootText,'cancelled correction must not change wish');
  await openWish(page,root);
  await page.locator('details.more summary').click();
  await page.click('[data-act="correct"]');
  rootText='Je veux apprendre à bien naviguer pour traverser une baie.';
  await page.fill('#correctText',rootText);
  await page.fill('#correctLoc','Pornichet, France');
  let t=Date.now();await page.click('#confirm');
  await page.waitForFunction(([id,text])=>window.__RV26_SOLO__.semantic().find(x=>x.semanticId===id)?.text===text,[root,rootText],{timeout:8000});
  await waitSound(page,'correct',t);
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
  const b1=await idByText(page,'Trouver un club de voile');
  const b2=await idByText(page,'Apprendre les noeuds essentiels');

  // ADD BRANCH later.
  await openWish(page,evolved);
  await page.click('[data-act="branch"]');
  await page.fill('#branchInput','Faire une première sortie en mer');
  t=Date.now();await page.click('#confirm');
  await page.waitForFunction(()=>window.__RV26_SOLO__.semantic().some(x=>x.text==='Faire une première sortie en mer'),{timeout:8000});
  await waitSound(page,'branch_add',t);
  const b3=await idByText(page,'Faire une première sortie en mer');

  // REATTACH cancel then confirm.
  await openWish(page,b1);
  await page.locator('details.more summary').click();
  await page.click('[data-act="reattach"]');
  const opts=await page.locator('#parentSelect option').evaluateAll(os=>os.map(o=>o.value));
  assert(!opts.includes(b1),'reattach cannot target itself');
  await page.selectOption('#parentSelect',b2);
  await page.click('#cancel');
  assert.equal((await semantic(page)).find(x=>x.semanticId===b1).parentSemanticId,evolved,'cancelled reattach must preserve parent');
  await openWish(page,b1);
  await page.locator('details.more summary').click();
  await page.click('[data-act="reattach"]');
  await page.selectOption('#parentSelect',b2);
  t=Date.now();await page.click('#confirm');
  await page.waitForFunction(([id,p])=>window.__RV26_SOLO__.semantic().find(x=>x.semanticId===id)?.parentSemanticId===p,[b1,b2],{timeout:8000});
  await waitSound(page,'reparent',t);

  // A parent with active descendants cannot be bloomed or abandoned into a contradictory state.
  await openWish(page,root);
  await page.click('[data-act="bloom"]');
  assert((await page.locator('#toast').innerText()).includes('branches actives'),'root bloom must be blocked while descendants are active');
  assert.equal((await semantic(page)).find(x=>x.semanticId===root).state,'alive');
  await openWish(page,b2);await page.locator('details.more summary').click();
  await page.click('[data-act="abandon"]');
  assert((await page.locator('#toast').innerText()).includes('branches actives'),'branch abandon must be blocked while its descendant is active');
  assert.equal((await semantic(page)).find(x=>x.semanticId===b2).state,'alive');

  // ABANDON cancel then confirm, then RESUME.
  await openWish(page,b3);
  await page.locator('details.more summary').click();
  await clickConfirmDialog(page,'[data-act="abandon"]',false);
  assert.equal((await semantic(page)).find(x=>x.semanticId===b3).state,'alive','dismissed abandon must preserve state');
  await openWish(page,b3);await page.locator('details.more summary').click();
  t=Date.now();await clickConfirmDialog(page,'[data-act="abandon"]',true);
  await page.waitForFunction(id=>window.__RV26_SOLO__.semantic().find(x=>x.semanticId===id)?.state==='abandoned',b3,{timeout:8000});
  await waitSound(page,'abandon',t);
  await openWish(page,b3);
  assert.equal(await page.locator('[data-act="resume"]').count(),1,'abandoned branch must offer Resume');
  assert.equal(await page.locator('[data-act="evolve"],[data-act="split"],[data-act="branch"],[data-act="bloom"]').count(),0,'abandoned branch must not expose active actions');
  t=Date.now();await clickConfirmDialog(page,'[data-act="resume"]',true);
  await page.waitForFunction(id=>window.__RV26_SOLO__.semantic().find(x=>x.semanticId===id)?.state==='alive',b3,{timeout:8000});
  await waitSound(page,'resume',t);

  // BLOOM cancel then confirm. Terminal action set must be coherent.
  await openWish(page,b1);
  await clickConfirmDialog(page,'[data-act="bloom"]',false);
  assert.equal((await semantic(page)).find(x=>x.semanticId===b1).state,'alive');
  await openWish(page,b1);
  t=Date.now();await clickConfirmDialog(page,'[data-act="bloom"]',true);
  await page.waitForFunction(id=>window.__RV26_SOLO__.semantic().find(x=>x.semanticId===id)?.state==='bloom',b1,{timeout:8000});
  await waitSound(page,'bloom',t);
  await page.waitForSelector('#ritualLayer .rv-petal',{timeout:5000});
  await openWish(page,b1);
  assert.equal(await page.locator('[data-act="evolve"],[data-act="split"],[data-act="branch"],[data-act="bloom"],[data-act="abandon"],[data-act="resume"],[data-act="connect"]').count(),0,'bloomed branch must be terminal');

  // Remove mistake with descendants must be blocked.
  await openWish(page,root);await page.locator('details.more summary').click();
  await page.click('[data-act="remove"]');
  assert((await page.locator('#toast').innerText()).includes('déjà une suite'),'root with descendants must not be removable');
  assert((await semantic(page)).some(x=>x.semanticId===root),'blocked removal must preserve root');

  // CLOSE WHOLE WISH cancel then confirm, then RESUME WHOLE WISH.
  await openWish(page,root);await page.locator('details.more summary').click();
  await clickConfirmDialog(page,'[data-act="close_lineage"]',false);
  assert.equal((await semantic(page)).find(x=>x.semanticId===root).state,'alive');
  await openWish(page,root);await page.locator('details.more summary').click();
  t=Date.now();await clickConfirmDialog(page,'[data-act="close_lineage"]',true);
  await page.waitForFunction(id=>window.__RV26_SOLO__.semantic().filter(x=>x.lineageId===window.__RV26_SOLO__.semantic().find(y=>y.semanticId===id).lineageId&&x.owner&&x.state==='alive').length===0,root,{timeout:8000});
  await waitSound(page,'close_lineage',t);
  await openWish(page,root);
  assert.equal(await page.locator('[data-act="resume_lineage"]').count(),1,'closed root must offer Resume wish');
  t=Date.now();await clickConfirmDialog(page,'[data-act="resume_lineage"]',true);
  await page.waitForFunction(id=>window.__RV26_SOLO__.semantic().find(x=>x.semanticId===id)?.state==='alive',root,{timeout:8000});
  await waitSound(page,'resume_lineage',t);
  assert.equal((await semantic(page)).find(x=>x.semanticId===b1).state,'bloom','whole-wish resume must not reopen a bloomed branch');

  // SHARE produces a deep link and sound; deep link reopens exact wish after reload.
  await openWish(page,root);await page.locator('details.more summary').click();
  t=Date.now();await page.click('[data-act="share"]');await waitSound(page,'share',t);
  const copied=await page.evaluate(()=>navigator.clipboard.readText());
  assert(copied.includes('#wish='+encodeURIComponent(root)),'share must copy deep link');
  await page.goto(copied,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__RV26_SOLO__&&window.__RV26_SOLO__.semantic().length>100,{timeout:20000});
  await page.waitForSelector('#drawer:not(.hidden) .wish',{timeout:8000});
  assert((await page.locator('#drawerBody .wish').innerText()).includes('bien naviguer'),'deep link must open exact wish');

  // FOCUS LINEAGE must have visible mode and exit.
  await openWish(page,root);await page.click('[data-act="focus"]');
  assert(await page.locator('#modeBar').isVisible(),'lineage focus mode must be visible');
  assert((await page.locator('#modeText').innerText()).includes('Lignée'));
  await page.click('#modeClose');assert(await page.locator('#modeBar').isHidden());

  // Untouched accidental wish can be removed, with sound and visual erasure.
  const accidental=await createWish(page,'Wish créé par erreur','');
  await openWish(page,accidental);await page.locator('details.more summary').click();
  t=Date.now();await clickConfirmDialog(page,'[data-act="remove"]',true);
  await waitSound(page,'remove',t);
  await page.waitForFunction(id=>!window.__RV26_SOLO__.semantic().some(x=>x.semanticId===id),accidental,{timeout:8000});

  // FR/EN switch updates product copy and returns cleanly.
  await page.click('[data-lang="en"]');
  await page.click('#createBtn');assert.equal((await page.locator('.sheet h3').innerText()).trim(),'Release a wish');await page.click('#cancel');
  await page.click('[data-lang="fr"]');

  // Long valid content and mobile layout.
  const longText=('Construire quelque chose de beau, durable et réellement utile avec plusieurs personnes, en avançant par petites étapes concrètes. '.repeat(3)).slice(0,279);
  const longId=await createWish(page,longText,'Saint-Etienne-de-Montluc, Loire-Atlantique, France');
  await page.setViewportSize({width:390,height:844});await openWish(page,longId);await assertNoOverflow(page,'mobile long wish');
  const target=await page.locator('#drawerBody [data-act="evolve"]').boundingBox();assert(target&&target.height>=36,'mobile action target must remain tappable');
  await page.click('#createBtn');await page.locator('#wishInput').focus();const inputBox=await page.locator('#wishInput').boundingBox();assert(inputBox&&inputBox.left>=0&&inputBox.right<=390,'mobile create input must stay in viewport');await page.click('#cancel');

  // Final persistence and no runtime errors.
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(id=>window.__RV26_SOLO__&&window.__RV26_SOLO__.semantic().some(x=>x.semanticId===id),root,{timeout:20000});
  assert.deepEqual(errors,[],errors.join('\n'));
  console.log('RALUVAAA Solo RC full wisher QA passed');
  await browser.close();
})().catch(err=>{console.error(err);process.exit(1)});