const assert=require('node:assert/strict');
const {chromium,firefox}=require('playwright');

const API='http://127.0.0.1:8787';
const ORIGIN='http://127.0.0.1:4173';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const url=room=>ORIGIN+'/raluvaaa/shared-alpha/?api='+encodeURIComponent(API)+'&sharedqa=1&room='+encodeURIComponent(room);

async function ready(page,room){
  await page.goto(url(room),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__RALUVAAA_SHARED_READY__===true,{timeout:20000});
  await page.waitForFunction(()=>window.__RV26_SHARED__&&window.__RALUVAAA_SHARED_DEBUG__,{timeout:10000});
  await page.waitForFunction(()=>window.__RV26_SHARED__.semantic().length>0,{timeout:10000});
  assert.equal(await page.evaluate(()=>window.RALUVAAA_ROOM),room);
  assert.equal(await page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.room),room);
  assert((await page.locator('#sharedRoomBadge').innerText()).includes(room),'room code must be visible');
  assert.equal(await page.evaluate(()=>window.__RALUVAAA_AUDIO__?.audio?.loop),true,'ambient soundtrack must loop');
  assert.equal(await page.evaluate(()=>Object.keys(window.__RALUVAAA_ACTION_AUDIO__?.motifs||{}).length>=12),true,'action sound grammar must load');
}
async function refresh(page){
  await page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.refresh());
  await wait(250);
}
async function world(page){return page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.world())}
async function me(page){return page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.me())}
async function inbox(page){return page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.inbox())}
async function openWish(page,id){
  await page.waitForFunction(id=>window.__RV26_SHARED__.semantic().some(x=>x.semanticId===id),id,{timeout:12000});
  await page.evaluate(id=>window.__RV26_SHARED__.open(id),id);
  await page.waitForSelector('#drawer:not(.hidden) .wish',{timeout:5000});
}
async function openMore(page){
  const d=page.locator('details.more');
  if(!await d.count())return false;
  if(!await d.evaluate(el=>el.open))await d.locator('summary').click();
  return true;
}
async function createWish(page,text){
  await page.click('#createBtn');
  await page.fill('#wishInput',text);
  await page.fill('#locInput','Nantes, France');
  await page.click('#confirm');
  await page.waitForFunction(text=>window.__RALUVAAA_SHARED_DEBUG__.world()?.wishes?.some(w=>w.text===text),text,{timeout:12000});
  const w=await world(page);
  return w.wishes.find(x=>x.text===text).id;
}
async function openInbox(page){
  const visible=await page.locator('#drawer:not(.hidden)').count();
  const title=visible?((await page.locator('#drawerTitle').innerText()).trim().toLowerCase()):'';
  if(!visible||!/(notifications|inbox|demandes|requests|activité|activity)/i.test(title))await page.click('#inboxBtn');
  await page.waitForSelector('#drawer:not(.hidden)',{timeout:5000});
}
async function acceptPending(page,type){
  await refresh(page);
  await page.waitForFunction(type=>window.__RALUVAAA_SHARED_DEBUG__.inbox()?.pending?.some(p=>p.type===type),type,{timeout:10000});
  await openInbox(page);
  const p=await inbox(page);
  const wanted=p.pending.find(x=>x.type===type);
  assert(wanted,'pending '+type+' required');
  const selector='[data-accept="'+wanted.id+'"]';
  await page.waitForSelector(selector,{timeout:5000});
  await page.click(selector);
  return wanted.id;
}
async function assertNoOverflow(page,label){
  const metrics=await page.evaluate(()=>({
    iw:innerWidth,
    sw:document.documentElement.scrollWidth,
    bw:document.body.scrollWidth,
    rail:document.getElementById('rail')?.getBoundingClientRect(),
    create:document.getElementById('createBtn')?.getBoundingClientRect()
  }));
  assert(metrics.sw<=metrics.iw+1,label+' document horizontal overflow');
  assert(metrics.bw<=metrics.iw+1,label+' body horizontal overflow');
  assert(metrics.rail&&metrics.rail.right<=metrics.iw+1&&metrics.rail.left>=-1,label+' rail outside viewport');
  assert(metrics.create&&metrics.create.width>=36&&metrics.create.height>=36,label+' create target too small');
}

(async()=>{
  const chrome=await chromium.launch({headless:true});
  const ff=await firefox.launch({headless:true});
  const ctxA=await chrome.newContext({viewport:{width:1365,height:820},locale:'fr-FR'});
  const ctxB=await ff.newContext({viewport:{width:1280,height:800},locale:'fr-FR'});
  const ctxM=await chrome.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'fr-FR'});
  const ctxIso=await chrome.newContext({viewport:{width:1024,height:720},locale:'fr-FR'});
  const A=await ctxA.newPage(),B=await ctxB.newPage(),M=await ctxM.newPage(),ISO=await ctxIso.newPage();
  const pages=[['chrome',A],['firefox',B],['mobile',M],['isolated',ISO]],errors=[];
  for(const [label,page] of pages){
    page.on('pageerror',e=>errors.push(label+' pageerror: '+String(e)));
    page.on('console',m=>{if(m.type()==='error')errors.push(label+' console: '+m.text())});
    page.on('response',r=>{if(r.status()>=500)errors.push(label+' HTTP '+r.status()+': '+r.url())});
  }

  const room='QC'+Date.now().toString(36).toUpperCase().slice(-4);
  const otherRoom='ZZ'+Date.now().toString(36).toUpperCase().slice(-4);
  await Promise.all([ready(A,room),ready(B,room),ready(M,room),ready(ISO,otherRoom)]);
  await Promise.all([assertNoOverflow(A,'chrome'),assertNoOverflow(B,'firefox'),assertNoOverflow(M,'mobile')]);

  const actorA=await A.evaluate(()=>window.RALUVAAA_ACTOR_ID);
  const actorB=await B.evaluate(()=>window.RALUVAAA_ACTOR_ID);
  const actorM=await M.evaluate(()=>window.RALUVAAA_ACTOR_ID);
  assert(actorA&&actorB&&actorM,'all test browsers need identities');
  assert.equal(new Set([actorA,actorB,actorM]).size,3,'independent browsers must have independent anonymous identities');
  assert.equal(await A.evaluate(()=>!!window.__RALUVAAA_ACTION_AUDIO__),true,'Shared Alpha action sound grammar must initialize');
  assert.equal(await A.evaluate(()=>!!window.__RALUVAAA_ACTION_AUDIO__?.motifs?.bloom),true,'BLOOM sound motif required');
  assert.equal(await A.evaluate(()=>!!window.__RALUVAAA_ACTION_AUDIO__?.motifs?.proposal_decline),true,'decline sound motif required');
  assert.equal(await A.evaluate(()=>!!window.__RALUVAAA_ACTION_AUDIO__?.motifs?.remove),true,'remove sound motif required');

  const stamp=Date.now().toString(36);
  const textA='QA shared wish '+stamp+' alpha';
  const wishA=await createWish(A,textA);

  // Automatic cross-browser propagation, no manual refresh.
  await B.waitForFunction(id=>window.__RV26_SHARED__.semantic().some(x=>x.semanticId===id),wishA,{timeout:9000});
  await M.waitForFunction(id=>window.__RV26_SHARED__.semantic().some(x=>x.semanticId===id),wishA,{timeout:9000});
  await M.goto(url(room)+'#wish='+encodeURIComponent(wishA),{waitUntil:'domcontentloaded'});
  await M.waitForFunction(()=>window.__RALUVAAA_SHARED_READY__===true,{timeout:20000});
  await M.waitForSelector('#drawer:not(.hidden) .wish',{timeout:12000});
  assert((await M.locator('#drawerBody .wish').innerText()).includes(textA),'direct shared link must open the exact wish, not only move the camera');
  await wait(3200);
  assert(!(await world(ISO)).wishes.some(w=>w.id===wishA),'another room code must not see the wish');
  assert.equal((await B.evaluate(id=>window.__RV26_SHARED__.semantic().find(x=>x.semanticId===id)?.owner,wishA)),false,'foreign wish must not become owned in Firefox');

  // Reload persistence: same identity, same ownership.
  await A.reload({waitUntil:'domcontentloaded'});
  await A.waitForFunction(()=>window.__RALUVAAA_SHARED_READY__===true,{timeout:20000});
  await A.waitForFunction(id=>window.__RV26_SHARED__?.semantic().some(x=>x.semanticId===id),wishA,{timeout:12000});
  assert.equal(await A.evaluate(()=>window.RALUVAAA_ACTOR_ID),actorA,'Chrome reload must preserve anonymous identity');
  assert.equal(await A.evaluate(id=>window.__RV26_SHARED__.semantic().find(x=>x.semanticId===id)?.owner,wishA),true,'Chrome reload must preserve wish ownership');
  await A.click('#myWorldBtn');
  await A.waitForSelector('#drawerBody [data-open="'+wishA+'"]',{timeout:6000});
  await A.click('#drawerBody [data-open="'+wishA+'"]');
  await A.waitForSelector('#drawer:not(.hidden) .wish',{timeout:5000});
  assert((await A.locator('#drawerBody .wish').innerText()).includes(textA),'My wishes entry must open wish details');

  // Correction is not semantic evolution: text/location change in place and propagate.
  const typoText='QA wish with a typoo '+stamp;
  const correctionId=await createWish(A,typoText);
  await openWish(A,correctionId);
  await openMore(A);
  await A.click('[data-act="correct"]');
  const correctedText='QA wish with a corrected title '+stamp;
  await A.fill('#correctText',correctedText);
  await A.fill('#correctLoc','Rome, Italy');
  await A.click('#confirm');
  await A.waitForFunction(([id,t])=>{const w=window.__RALUVAAA_SHARED_DEBUG__.world()?.wishes?.find(x=>x.id===id);return w?.text===t&&w?.locationText==='Rome, Italy'},[correctionId,correctedText],{timeout:10000});
  await B.waitForFunction(([id,t])=>window.__RV26_SHARED__.semantic().find(x=>x.semanticId===id)?.text===t,[correctionId,correctedText],{timeout:10000});

  // One encouragement per human, and persistence after Firefox reload.
  await openWish(B,wishA);
  const foreignDrawer=(await B.locator('#drawerBody').innerText());
  const foreignMeta=await B.evaluate(id=>window.__RV26_SHARED__.semantic().find(x=>x.semanticId===id),wishA);
  assert(/autre humain/i.test(foreignDrawer),'real foreign wish must be labelled as another human; drawer='+JSON.stringify(foreignDrawer)+' meta='+JSON.stringify(foreignMeta));
  assert(!/simulé/i.test(foreignDrawer),'real foreign wish must never be labelled simulated; drawer='+JSON.stringify(foreignDrawer)+' meta='+JSON.stringify(foreignMeta));
  assert.equal(await B.locator('[data-act="report"]').count(),1,'real foreign wish must expose Report');
  const simId=await B.evaluate(()=>window.__RV26_SHARED__.semantic().find(x=>x.simulated&&x.kind==='create')?.semanticId||null);
  assert(simId,'shared world should contain at least one simulated visual root during private alpha');
  await openWish(B,simId);
  const simText=await B.locator('#drawerBody').innerText();
  assert(/simulé/i.test(simText),'simulated fallback must be explicitly labelled');
  assert.equal(await B.locator('[data-act="encourage"],[data-act="help"],[data-act="suggest"],[data-act="connect"],[data-act="report"]').count(),0,'simulated wishes must be read-only in Shared Alpha');
  await openWish(B,wishA);
  await openMore(B);
  await B.click('[data-act="report"]');
  await B.fill('#reportDetails','QA report flow');
  await B.click('#confirm');
  await B.waitForFunction(()=>document.getElementById('toast')?.textContent.includes('Signalement'),{timeout:5000});
  await openWish(B,wishA);
  await B.click('[data-act="encourage"]');
  await B.waitForFunction(id=>window.__RALUVAAA_SHARED_DEBUG__.me()?.encouragedWishIds?.includes(id),wishA,{timeout:10000});
  await B.reload({waitUntil:'domcontentloaded'});
  await B.waitForFunction(()=>window.__RALUVAAA_SHARED_READY__===true,{timeout:20000});
  assert.equal(await B.evaluate(()=>window.RALUVAAA_ACTOR_ID),actorB,'Firefox reload must preserve anonymous identity');
  await openWish(B,wishA);
  assert(await B.locator('[data-act="encourage"]').isDisabled(),'encourage must remain disabled after reload');

  // HELP proposal and consent.
  await B.click('[data-act="help"]');
  await B.fill('#helpInput','I can help with one concrete first step.');
  await B.click('#confirm');
  await acceptPending(A,'help');
  await A.waitForFunction(id=>window.__RALUVAAA_SHARED_DEBUG__.world()?.events?.some(e=>e.type==='help'&&e.wishId===id),wishA,{timeout:10000});

  // Decline path must persist in both people's activity after refresh/reload.
  await refresh(B);await openWish(B,wishA);
  await B.click('[data-act="help"]');
  await B.fill('#helpInput','This second offer should be declined.');
  await B.click('#confirm');
  await refresh(A);
  const declinedHelp=(await inbox(A)).pending.find(p=>p.type==='help');
  assert(declinedHelp,'decline-path help proposal must arrive');
  await openInbox(A);
  await A.click('[data-decline="'+declinedHelp.id+'"]');
  await B.waitForFunction(id=>window.__RALUVAAA_SHARED_DEBUG__.inbox()?.sent?.some(p=>p.id===id&&p.status==='declined'),declinedHelp.id,{timeout:10000});
  await B.reload({waitUntil:'domcontentloaded'});
  await B.waitForFunction(()=>window.__RALUVAAA_SHARED_READY__===true,{timeout:20000});
  await openInbox(B);
  assert((await B.locator('#drawerBody').innerText()).includes('Refusé'),'declined proposal history must survive Firefox reload');
  const resultNote=B.locator('[data-note]').first();
  if(await resultNote.count()){
    await resultNote.click();
    await B.waitForSelector('#drawer:not(.hidden) .wish',{timeout:6000});
    assert((await B.locator('#drawerBody .wish').innerText()).includes(textA),'proposal-result notification should navigate back to the related wish');
  }

  // Helper can cancel a still-pending offer from the UI; recipient must lose the request.
  await openWish(B,wishA);
  await B.click('[data-act="help"]');
  await B.fill('#helpInput','This offer will be cancelled by the helper.');
  await B.click('#confirm');
  await B.waitForFunction(()=>window.__RALUVAAA_SHARED_DEBUG__.inbox()?.sent?.some(p=>p.type==='help'&&p.status==='pending'),{timeout:10000});
  await openInbox(B);
  await B.waitForSelector('[data-cancel-proposal]',{timeout:6000});
  const cancelId=await B.locator('[data-cancel-proposal]').first().getAttribute('data-cancel-proposal');
  await B.locator('[data-cancel-proposal="'+cancelId+'"]').click();
  await B.waitForFunction(id=>window.__RALUVAAA_SHARED_DEBUG__.inbox()?.sent?.some(p=>p.id===id&&p.status==='cancelled'),cancelId,{timeout:10000});
  await refresh(A);
  assert(!(await inbox(A)).pending.some(p=>p.id===cancelId),'cancelled proposal must disappear from recipient requests');

  // Branch suggestion and consent.
  await refresh(B);await openWish(B,wishA);
  await B.click('[data-act="suggest"]');
  await B.fill('#suggestInput','Choose one tiny first action\nDo that action this week');
  await B.click('#confirm');
  await acceptPending(A,'suggest_branch');
  await A.waitForFunction(()=>window.__RALUVAAA_SHARED_DEBUG__.world()?.wishes?.some(w=>w.text==='Choose one tiny first action'),{timeout:10000});

  // A second human creates a wish, then proposes a connection.
  const textB='QA shared wish '+stamp+' beta';
  const wishB=await createWish(B,textB);

  // A just-created local semantic id must resolve to the server id before a share link is produced.
  await A.click('#createBtn');
  const instantText='QA immediate share '+stamp;
  await A.fill('#wishInput',instantText);await A.fill('#locInput','Nantes, France');await A.click('#confirm');
  const localInstant=await A.evaluate(t=>{const es=window.__RV26_SHARED__.state().events.filter(e=>e.type==='create'&&e.text===t);return es.at(-1)?.semanticId||null},instantText);
  assert(localInstant,'immediate create must have a local semantic id');
  const resolvedInstant=await A.evaluate(id=>window.__RALUVAAA_SHARED_SHARE__(id),localInstant);
  assert(resolvedInstant&&resolvedInstant!==localInstant,'share resolver must wait for the server id');
  assert((await A.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.client.world())).wishes.some(w=>w.id===resolvedInstant),'resolved share id must exist in shared world');
  await A.waitForFunction(id=>window.__RV26_SHARED__.semantic().some(x=>x.semanticId===id),wishB,{timeout:9000});
  await openWish(B,wishB);
  const connectDebug=await B.evaluate(id=>({meta:window.__RV26_SHARED__.semantic().find(x=>x.semanticId===id),drawer:document.getElementById('drawerBody')?.innerText||'',html:document.getElementById('drawerBody')?.innerHTML||''}),wishB);
  const moreSummary=B.locator('details.more summary');
  assert(await moreSummary.count(),`own live wish must expose More before CONNECT: ${JSON.stringify(connectDebug)}`);
  await openMore(B);
  const connectButton=B.locator('[data-act="connect"]');
  assert(await connectButton.count(),`own live wish must expose CONNECT: ${JSON.stringify(connectDebug)}`);
  const stableConnect=await connectButton.elementHandle();
  await refresh(B);
  assert(await stableConnect.evaluate(el=>el.isConnected),'unchanged shared refresh must not detach the open wish action DOM');
  await connectButton.click();
  await B.waitForFunction(()=>!document.getElementById('modeBar').classList.contains('hidden'),null,{timeout:3000});
  assert(await B.locator('#modeBar').isVisible(),'CONNECT selection mode should be visible');
  await B.evaluate(()=>document.getElementById('modeClose')?.click());
  assert(await B.locator('#modeBar').isHidden(),'CONNECT mode close must fully cancel selection');
  await B.evaluate(id=>window.__RV26_SHARED__.select(id),wishA);
  await B.waitForSelector('#drawer:not(.hidden) .wish',{timeout:5000});
  assert.equal(await B.locator('#overlay #confirm').count(),0,'cancelled CONNECT mode must not remain armed');

  await openWish(B,wishB);
  await openMore(B);
  assert(await B.locator('[data-act="connect"]').count(),'CONNECT must remain available on the live owned wish');
  await B.locator('[data-act="connect"]').click();
  await B.waitForFunction(()=>!document.getElementById('modeBar').classList.contains('hidden'),null,{timeout:3000});
  await B.evaluate(id=>window.__RV26_SHARED__.select(id),wishA);
  await B.waitForSelector('#overlay #cancel',{timeout:5000});
  await B.click('#overlay #cancel');
  assert(await B.locator('#modeBar').isHidden(),'CONNECT confirmation cancel must exit mode');
  assert.equal((await B.locator('#overlay').innerText()).trim(),'','CONNECT cancel must clear modal');

  await openWish(B,wishB);
  await openMore(B);
  assert(await B.locator('[data-act="connect"]').count(),'CONNECT must remain available on the live owned wish');
  await B.locator('[data-act="connect"]').click();
  await B.waitForFunction(()=>!document.getElementById('modeBar').classList.contains('hidden'),null,{timeout:3000});
  await B.evaluate(id=>window.__RV26_SHARED__.select(id),wishA);
  await B.waitForSelector('#overlay #confirm',{timeout:5000});
  await B.click('#overlay #confirm');
  await acceptPending(A,'connect');
  await A.waitForFunction((ids)=>window.__RALUVAAA_SHARED_DEBUG__.world()?.events?.some(e=>e.type==='connect'&&((e.wishId===ids[0]&&e.payload?.otherWishId===ids[1])||(e.wishId===ids[1]&&e.payload?.otherWishId===ids[0]))),[wishA,wishB],{timeout:10000});

  // Wisher lifecycle.
  await refresh(A);await openWish(A,wishA);
  await A.click('[data-act="evolve"]');
  const evolvedText='QA shared evolved '+stamp;
  await A.fill('#evolveInput',evolvedText);
  await A.click('#confirm');
  await A.waitForFunction(t=>window.__RALUVAAA_SHARED_DEBUG__.world()?.wishes?.some(w=>w.text===t),evolvedText,{timeout:10000});
  const evolved=(await world(A)).wishes.find(w=>w.text===evolvedText).id;

  await refresh(A);await openWish(A,evolved);
  await A.click('[data-act="split"]');
  await A.fill('#branchInput','QA branch one '+stamp+'\nQA branch two '+stamp);
  await A.click('#confirm');
  await A.waitForFunction(stamp=>window.__RALUVAAA_SHARED_DEBUG__.world()?.wishes?.filter(w=>w.text.includes('QA branch')&&w.text.includes(String(stamp))).length>=2,stamp,{timeout:10000});
  const branches=(await world(A)).wishes.filter(w=>w.text.includes('QA branch')&&w.text.includes(String(stamp)));
  assert.equal(branches.length,2);

  await refresh(A);await openWish(A,branches[0].id);
  A.once('dialog',d=>d.accept());
  await A.click('[data-act="bloom"]');
  await A.waitForFunction(id=>window.__RALUVAAA_SHARED_DEBUG__.world()?.wishes?.find(w=>w.id===id)?.state==='bloomed',branches[0].id,{timeout:10000});

  await refresh(A);await openWish(A,branches[1].id);
  await openMore(A);
  A.once('dialog',d=>d.accept());
  await A.click('[data-act="abandon"]');
  await A.waitForFunction(id=>window.__RALUVAAA_SHARED_DEBUG__.world()?.wishes?.find(w=>w.id===id)?.state==='abandoned',branches[1].id,{timeout:10000});
  await refresh(A);await openWish(A,branches[1].id);
  assert.equal(await A.locator('[data-act="resume"]').count(),1,'abandoned wish must expose Resume to its wisher');
  A.once('dialog',d=>d.accept());
  await A.click('[data-act="resume"]');
  await A.waitForFunction(id=>window.__RALUVAAA_SHARED_DEBUG__.world()?.wishes?.find(w=>w.id===id)?.state==='alive',branches[1].id,{timeout:10000});

  // Terminal-state UI must not offer impossible social actions.
  await refresh(A);await openWish(A,branches[0].id);
  await openMore(A);
  assert.equal(await A.locator('[data-act="connect"]').count(),0,'bloomed wish must not expose CONNECT');
  await refresh(B);await openWish(B,branches[0].id);
  await openMore(B);
  assert.equal(await B.locator('[data-act="encourage"],[data-act="help"],[data-act="suggest"],[data-act="connect"]').count(),0,'helper must not receive active actions on a bloomed wish');

  // Whole-wish close/resume semantics through the real UI.
  const wholeText='QA whole wish '+stamp;
  const wholeRoot=await createWish(A,wholeText);
  await refresh(A);await openWish(A,wholeRoot);
  await openMore(A);
  A.once('dialog',d=>d.accept());
  await A.click('[data-act="close_lineage"]');
  await A.waitForFunction(id=>window.__RALUVAAA_SHARED_DEBUG__.world()?.wishes?.find(w=>w.id===id)?.state==='abandoned',wholeRoot,{timeout:10000});
  await refresh(A);await openWish(A,wholeRoot);
  assert.equal(await A.locator('[data-act="resume_lineage"]').count(),1,'closed root must expose Resume wish');
  A.once('dialog',d=>d.accept());
  await A.click('[data-act="resume_lineage"]');
  await A.waitForFunction(id=>window.__RALUVAAA_SHARED_DEBUG__.world()?.wishes?.find(w=>w.id===id)?.state==='alive',wholeRoot,{timeout:10000});

  // Mistake removal through the UI must really remove an untouched wish.
  const mistake=await createWish(A,'QA accidental untouched wish '+stamp);
  await refresh(A);await openWish(A,mistake);
  await openMore(A);
  A.once('dialog',d=>d.accept());
  await A.click('[data-act="remove"]');
  await A.waitForFunction(id=>!window.__RALUVAAA_SHARED_DEBUG__.world()?.wishes?.some(w=>w.id===id),mistake,{timeout:10000});

  // Concurrent independent writes must survive and converge.
  const concurrentA='QA concurrent '+stamp+' gamma';
  const concurrentB='QA concurrent '+stamp+' delta';
  await Promise.all([
    A.evaluate(t=>window.__RALUVAAA_SHARED_DEBUG__.client.createWish({text:t,locationText:'Nantes, France'}),concurrentA),
    B.evaluate(t=>window.__RALUVAAA_SHARED_DEBUG__.client.createWish({text:t,locationText:'Nantes, France'}),concurrentB)
  ]);
  await M.waitForFunction(([a,b])=>{const w=window.__RALUVAAA_SHARED_DEBUG__.world()?.wishes||[];return w.some(x=>x.text===a)&&w.some(x=>x.text===b)},[concurrentA,concurrentB],{timeout:10000});

  await assertNoOverflow(M,'mobile after shared activity');
  assert.equal((await me(A)).room,room,'server must echo the expected room');
  assert.equal(errors.length,0,'browser/runtime errors: '+errors.join(' | '));

  console.log('RALUVAAA Shared Alpha Chrome + Firefox + mobile + room isolation QA passed');
  await Promise.all([ctxA.close(),ctxB.close(),ctxM.close(),ctxIso.close()]);
  await Promise.all([chrome.close(),ff.close()]);
})().catch(err=>{console.error(err);process.exit(1)});