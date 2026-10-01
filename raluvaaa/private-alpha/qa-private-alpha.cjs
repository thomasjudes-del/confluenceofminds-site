const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');

const BASE=process.env.RALUVAAA_QA_BASE||'http://127.0.0.1:4173';
const API=process.env.RALUVAAA_ALPHA_BASE||'http://127.0.0.1:8787';
const URL=BASE+'/raluvaaa/private-alpha/?api='+encodeURIComponent(API);

async function pageFor(browser,mobile=false){
  const context=await browser.newContext({
    viewport:mobile?{width:390,height:844}:{width:1280,height:800},
    isMobile:mobile,hasTouch:mobile
  });
  const page=await context.newPage();
  page.on('console',msg=>console.log('[browser console]',msg.type(),msg.text()));
  page.on('pageerror',err=>console.log('[browser pageerror]',err?.stack||err?.message||String(err)));
  await page.route('https://ipwho.is/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,city:'Nantes',country:'France'})}));
  await page.route('https://ipapi.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({city:'Nantes',country_name:'France'})}));
  await page.goto(URL,{waitUntil:'domcontentloaded'});
  try{
    await page.waitForFunction(()=>window.__RALUVAAA_SHARED_READY__===true,null,{polling:100,timeout:30000});
    await page.waitForFunction(()=>!!window.__RALUVAAA_PRIVATE_AUTH__,null,{polling:100,timeout:5000});
    await page.waitForFunction(()=>window.__RALUVAAA_V46__?.version===46,null,{polling:100,timeout:5000});
  }catch(err){
    const diag=await page.evaluate(()=>({
      sharedReady:window.__RALUVAAA_SHARED_READY__,
      privateAuth:!!window.__RALUVAAA_PRIVATE_AUTH__,
      v46:window.__RALUVAAA_V46__?.version||null,
      status:document.getElementById('sharedStatus')?.textContent||'',
      account:!!document.getElementById('privateAccountBtn')
    })).catch(()=>({evaluationFailed:true}));
    console.error('[private-alpha readiness]',diag);
    throw err
  }
  return{context,page}
}
async function claimViaUi(page,email){
  await page.evaluate(()=>window.__RALUVAAA_PRIVATE_AUTH__.showAccount());
  await page.waitForSelector('#raluvaaaAuthOverlay.open');
  await page.fill('[data-pa-email]',email);
  await page.click('[data-pa-send]');
  await page.waitForSelector('[data-pa-code]',{polling:100,timeout:5000});
  const code=await page.inputValue('[data-pa-code]');
  assert.match(code,/^\d{6}$/,'CI auth code should autofill in test mode');
  await page.click('[data-pa-verify]');
  await page.waitForFunction(()=>window.__RALUVAAA_PRIVATE_AUTH__?.me?.()?.claimed===true,null,{polling:100,timeout:7000});
  await page.waitForSelector('#raluvaaaAuthOverlay.open',{state:'hidden',timeout:3000}).catch(()=>{});
}
async function createWish(page,text,emailIfNeeded){
  await page.click('#createBtn');
  await page.fill('#wishInput',text);
  await page.fill('#locInput','Nantes, France');
  await page.click('#confirm');
  if(emailIfNeeded){
    await page.waitForSelector('#raluvaaaAuthOverlay.open',{polling:100,timeout:3000});
    await page.fill('[data-pa-email]',emailIfNeeded);
    await page.click('[data-pa-send]');
    await page.waitForSelector('[data-pa-code]',{polling:100,timeout:5000});
    assert.match(await page.inputValue('[data-pa-code]'),/^\d{6}$/);
    await page.click('[data-pa-verify]');
  }
  await page.waitForFunction(t=>window.__RALUVAAA_SHARED_DEBUG__?.world()?.wishes?.some(w=>w.text===t),text,{polling:100,timeout:12000});
  return page.evaluate(t=>window.__RALUVAAA_SHARED_DEBUG__.world().wishes.find(w=>w.text===t).id,text)
}
async function refresh(page){await page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.refresh())}
async function openWish(page,id){
  await refresh(page);
  await page.evaluate(id=>window.__RV26_SHARED__.open(id),id);
  await page.waitForFunction(id=>window.__RALUVAAA_UI__?.current?.()?.semanticId===id,id,{polling:100,timeout:5000})
}
async function acceptFirst(page,type){
  await refresh(page);
  await page.click('#inboxBtn');
  await page.waitForFunction(type=>window.__RALUVAAA_SHARED_DEBUG__.inbox()?.pending?.some(p=>p.type===type),type,{polling:100,timeout:8000});
  const p=await page.evaluate(type=>window.__RALUVAAA_SHARED_DEBUG__.inbox().pending.find(p=>p.type===type),type);
  const btn=page.locator('[data-accept="'+p.id+'"]');
  await btn.click();
  return p
}

(async()=>{
  const chrome=await chromium.launch({headless:true});
  const safari=await webkit.launch({headless:true});
  const stamp=Date.now().toString(36);
  const emailA='a+'+stamp+'@raluvaaa.test',emailB='b+'+stamp+'@raluvaaa.test';
  const A=await pageFor(safari,true),B=await pageFor(chrome,false);
  try{
    assert.equal(await A.page.locator('#qaStrip').count(),0,'Private Alpha must not expose fake A/B controls');
    assert.equal(await B.page.locator('#qaStrip').count(),0,'Desktop must not expose fake A/B controls');
    assert.equal(await A.page.locator('#rail #v46AboutBtn').count(),0,'About must not consume a main rail slot');
    assert.equal(await A.page.locator('#brand #v46AboutBtn').count(),1,'About must live in the RALUVAAA brand block');
    assert.equal(await A.page.locator('#rail #privateAccountBtn').count(),0,'Account must not have a separate main rail button');
    assert(await A.page.locator('[data-lang="en"]').evaluate(el=>el.classList.contains('active')),'Private Alpha should default to English on a fresh session');
    assert.equal(await A.page.locator('#rail .rail-btn').count(),4,'Private Alpha main rail must contain exactly four actions');

    const anonA=await A.page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.client.actorId);
    const anonB=await B.page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.client.actorId);
    assert.notEqual(anonA,anonB,'mobile Safari and desktop Chrome need independent anonymous sessions');

    // A writes first, and the publish action itself asks for identity.
    const wishA=await createWish(A.page,'A wants to learn coastal sailing '+stamp,emailA);
    const actorA=await A.page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.client.actorId);
    assert.equal(await A.page.evaluate(()=>window.__RALUVAAA_PRIVATE_AUTH__.me().claimed),true);
    await A.page.click('#myWorldBtn');
    await A.page.waitForSelector('#privateAccountSection',{timeout:3000});
    assert.match(await A.page.locator('#privateAccountSection').innerText(),/Ton espace|Your space/i,'My Wishes must contain account identity');
    assert.equal(await A.page.locator('#rail #privateAccountBtn').count(),0,'Claimed account must not add a rail button');
    const mine=A.page.locator('#drawerBody [data-open="'+wishA+'"]');
    assert.equal(await mine.count(),1,'My Wishes must list the owned wish');
    await mine.click();
    await A.page.waitForFunction(id=>window.__RALUVAAA_UI__?.current?.()?.semanticId===id,wishA,{polling:100,timeout:5000});
    assert((await A.page.locator('#drawerBody .wish').innerText()).includes('A wants to learn coastal sailing'),'My Wishes click must open the exact wish');
    await A.page.evaluate(()=>window.dispatchEvent(new MessageEvent('message',{origin:location.origin,data:{type:'rv25-blank'}})));
    await A.page.waitForSelector('#drawer',{state:'hidden',timeout:3000});
    assert.equal(await A.page.locator('#rail .rail-btn:visible').count(),4,'blank-space close must leave the four-action rail visible');

    // Fast branch -> bloom must resolve the server wish id and show a visible state.
    await openWish(A.page,wishA);
    await A.page.evaluate(()=>window.__RALUVAAA_UI__.action('split'));
    await A.page.fill('#branchInput','First bloom test branch\nSecond live test branch');
    await A.page.click('#confirm');
    await A.page.waitForFunction(()=>window.__RALUVAAA_SHARED_DEBUG__.world()?.wishes?.some(w=>w.text==='First bloom test branch'),null,{polling:100,timeout:10000});
    const bloomChild=await A.page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.world().wishes.find(w=>w.text==='First bloom test branch').id);
    await openWish(A.page,bloomChild);
    A.page.once('dialog',d=>d.accept());
    await A.page.evaluate(()=>window.__RALUVAAA_UI__.action('bloom'));
    await A.page.waitForFunction(id=>window.__RALUVAAA_SHARED_DEBUG__.world()?.wishes?.find(w=>w.id===id)?.state==='bloomed',bloomChild,{polling:100,timeout:10000});
    await openWish(A.page,bloomChild);
    assert.match(await A.page.locator('.pa-wish-status').innerText(),/Bloomed|Fleuri/i,'node card must show its state');

    // B is still anonymous: exploration/encouragement works, but relationship actions do not.
    await B.page.evaluate(id=>window.__RALUVAAA_SHARED_DEBUG__.client.encourage(id),wishA);
    await refresh(A.page);
    await openWish(A.page,wishA);
    assert.match(await A.page.locator('.pa-encouragement-count').innerText(),/1/,'owner must see a private encouragement count');
    await assert.rejects(
      ()=>B.page.evaluate(id=>window.__RALUVAAA_SHARED_DEBUG__.client.proposeHelp(id,'Anonymous help must be gated.'),wishA),
      /claim_required|Verify your email|HTTP 403/
    );

    // B claims explicitly. The encouragement made anonymously must follow the newly claimed identity.
    await claimViaUi(B.page,emailB);
    assert(await B.page.evaluate(id=>window.__RALUVAAA_SHARED_DEBUG__.client.me().then(m=>m.encouragedWishIds.includes(id)),wishA),'anonymous encouragement must survive account claim');
    const actorB=await B.page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.client.actorId);
    assert.notEqual(actorA,actorB,'A and B must remain different real accounts');
    const wishB=await createWish(B.page,'B wants to create a neighbourhood garden '+stamp);

    // A saves B. Saved state must be server-backed.
    await openWish(A.page,wishB);
    const saveA=A.page.locator('#v43MobileBookmarkBtn:visible,#v43BookmarkBtn:visible').first();
    await saveA.click();
    await A.page.waitForFunction(id=>window.__RALUVAAA_SHARED_DEBUG__.client.saved().then(x=>x.saved.some(w=>w.id===id)),wishB,{polling:100,timeout:8000});

    // B offers help to A; A receives a real notification and accepts.
    await openWish(B.page,wishA);
    await B.page.evaluate(()=>window.__RALUVAAA_UI__.action('help'));
    await B.page.waitForSelector('#helpTitleInput');
    await B.page.fill('#helpTitleInput','First sailing checklist');
    await B.page.fill('#helpInput','I can share a practical first sailing checklist.');
    await B.page.click('#confirm');
    await A.page.waitForFunction(async()=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();return window.__RALUVAAA_SHARED_DEBUG__.inbox()?.pending?.some(p=>p.type==='help')},null,{polling:100,timeout:10000});
    await A.page.click('#inboxBtn');
    await A.page.waitForSelector('.pa-request-card',{timeout:3000});
    const requestText=await A.page.locator('.pa-request-card').first().innerText();
    assert.match(requestText,/First sailing checklist/);
    assert.match(requestText,/practical first sailing checklist/i);
    assert(!/ACTOR_/i.test(requestText),'raw actor IDs must never appear in human inbox UI');
    assert.equal(await A.page.getByText('Someone offered help',{exact:true}).count(),0,'server proposal notification must not duplicate the help card');
    await A.page.click('[data-accept]');
    await B.page.waitForFunction(async()=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();return window.__RALUVAAA_SHARED_DEBUG__.world()?.events?.some(e=>e.type==='help')},null,{polling:100,timeout:10000});

    // Owner can close a wish to new help offers; helper can no longer send one.
    await openWish(A.page,wishA);
    await A.page.evaluate(()=>window.__RALUVAAA_UI__.action('toggle_help'));
    await A.page.waitForFunction(async id=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();return window.__RALUVAAA_SHARED_DEBUG__.world().events.some(e=>e.type==='help_setting'&&e.wishId===id&&e.payload?.open===false)},wishA,{polling:100,timeout:8000});
    await assert.rejects(
      ()=>B.page.evaluate(id=>window.__RALUVAAA_SHARED_DEBUG__.client.proposeHelp(id,'Blocked title','Blocked help'),wishA),
      /help_closed|not accepting/i
    );
    await A.page.evaluate(()=>window.__RALUVAAA_UI__.action('toggle_help'));
    await A.page.waitForFunction(async id=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();const ev=window.__RALUVAAA_SHARED_DEBUG__.world().events.filter(e=>e.type==='help_setting'&&e.wishId===id).pop();return ev?.payload?.open===true},wishA,{polling:100,timeout:8000});

    // A proposes a graft from its own wish to B's saved wish via the exact Saved UX.
    await openWish(A.page,wishA);
    await A.page.evaluate(()=>window.__RALUVAAA_UI__.action('connect'));
    await A.page.waitForSelector('#v46SavedGraftBtn',{polling:100,timeout:3000});
    await A.page.click('#v46SavedGraftBtn');
    await A.page.waitForSelector('[data-v46-graft-target="'+wishB+'"]',{polling:100,timeout:3000});
    await A.page.click('[data-v46-graft-target="'+wishB+'"]');
    await A.page.waitForSelector('#overlay #confirm',{polling:100,timeout:3000});
    await A.page.click('#overlay #confirm');
    await B.page.waitForFunction(async()=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();return window.__RALUVAAA_SHARED_DEBUG__.inbox()?.pending?.some(p=>p.type==='connect')},null,{polling:100,timeout:10000});
    await acceptFirst(B.page,'connect');
    await A.page.waitForFunction(async()=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();return window.__RALUVAAA_SHARED_DEBUG__.world()?.events?.some(e=>e.type==='connect')},null,{polling:100,timeout:10000});
    await A.page.waitForFunction(()=>document.getElementById('engine')?.contentWindow?.__RV42_RUNTIME__?.warpCount?.()>0,null,{polling:100,timeout:5000});
    const graftVisual=await A.page.locator('#engine').evaluate(f=>({count:f.contentWindow.__RV42_RUNTIME__.warpCount(),dash:f.contentWindow.__RV42_RUNTIME__.warpDash}));
    assert(graftVisual.count>0,'accepted graft must materialise as a warp');
    assert.deepEqual(graftVisual.dash,[4.5,7],'graft warp must use the dotted rendering contract');
    const graftSound=await A.page.evaluate(()=>({sample:window.__RALUVAAA_SOUND_V38__?.sampleForEvent?.({type:'connect_proposed'}),url:window.__RALUVAAA_SOUND_V38__?.samples?.graft||''}));
    assert.equal(graftSound.sample,'graft','graft proposal must map to the graft sound');
    assert.match(graftSound.url,/graft\.wav$/,'graft sound asset must remain wired');
    if(await B.page.locator('#inboxBtn').evaluate(el=>el.classList.contains('active')))await B.page.click('#inboxBtn');

    // Reverse roles: A helps B.
    await openWish(A.page,wishB);
    await A.page.evaluate(()=>window.__RALUVAAA_UI__.action('help'));
    await A.page.fill('#helpTitleInput','First planting day');
    await A.page.fill('#helpInput','I can help organise a first neighbourhood planting day.');
    await A.page.click('#confirm');
    await B.page.waitForFunction(async()=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();return window.__RALUVAAA_SHARED_DEBUG__.inbox()?.pending?.some(p=>p.type==='help')},null,{polling:100,timeout:10000});
    assert.notEqual((await B.page.locator('#inboxBadge').innerText()).trim(),'0','B must see an unread notification badge');
    const unreadBefore=Number((await B.page.locator('#inboxBadge').innerText()).trim()||0);
    await B.page.click('#inboxBtn');
    await B.page.waitForFunction(()=>Number(document.getElementById('inboxBadge')?.textContent||0)===0,null,{polling:100,timeout:5000});
    const unreadAfter=Number((await B.page.locator('#inboxBadge').innerText()).trim()||0);
    assert(unreadAfter<unreadBefore,'reading the inbox must decrement the unread badge');
    await B.page.click('#inboxBtn');
    await acceptFirst(B.page,'help');
    await A.page.waitForFunction(async id=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();return window.__RALUVAAA_SHARED_DEBUG__.world()?.events?.some(e=>e.type==='help'&&e.wishId===id)},wishB,{polling:100,timeout:10000});

    // A logs in from a fresh desktop browser profile: same actor, wishes and Saved come back.
    const A2=await pageFor(chrome,false);
    try{
      await claimViaUi(A2.page,emailA);
      const actorA2=await A2.page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.client.actorId);
      assert.equal(actorA2,actorA,'same email on another browser must restore the same account');
      await refresh(A2.page);
      assert(await A2.page.evaluate(id=>window.__RALUVAAA_SHARED_DEBUG__.me().wishes.some(w=>w.id===id),wishA),'owned wish must return on second browser');
      assert(await A2.page.evaluate(id=>window.__RALUVAAA_SHARED_DEBUG__.client.saved().then(x=>x.saved.some(w=>w.id===id)),wishB),'Saved wish must return on second browser');
    }finally{await A2.context.close()}

    // V46 product surfaces remain present.
    assert.equal(await A.page.locator('#v46AboutBtn').count(),1,'About guide from V46 must remain');
    await openWish(A.page,wishA);
    const cameraBefore=await A.page.locator('#engine').evaluate(f=>({x:f.contentWindow.camera?.x,y:f.contentWindow.camera?.y,zoom:f.contentWindow.camera?.zoom}));
    await A.page.evaluate(()=>window.__RALUVAAA_UI__.action('toggle_help'));
    await A.page.waitForTimeout(180);
    const cameraAfterLocalAction=await A.page.locator('#engine').evaluate(f=>({x:f.contentWindow.camera?.x,y:f.contentWindow.camera?.y,zoom:f.contentWindow.camera?.zoom}));
    assert(Math.abs(cameraAfterLocalAction.zoom-cameraBefore.zoom)<0.0001,'local action must not change camera zoom');
    assert(Math.abs(cameraAfterLocalAction.x-cameraBefore.x)<0.01&&Math.abs(cameraAfterLocalAction.y-cameraBefore.y)<0.01,'local action must not move camera');
    await A.page.evaluate(()=>window.__RALUVAAA_UI__.action('toggle_help'));
    await A.page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.refresh());
    await A.page.waitForTimeout(250);
    const cameraAfter=await A.page.locator('#engine').evaluate(f=>({x:f.contentWindow.camera?.x,y:f.contentWindow.camera?.y,zoom:f.contentWindow.camera?.zoom}));
    assert(Math.abs(cameraAfter.zoom-cameraBefore.zoom)<0.0001,'server refresh must not change camera zoom');
    assert(Math.abs(cameraAfter.x-cameraBefore.x)<0.01&&Math.abs(cameraAfter.y-cameraBefore.y)<0.01,'server refresh must not move camera');
    assert(await A.page.locator('#drawerBody details.more').count(),'V46 More actions must remain');
    assert(await A.page.locator('#drawerBody [data-act="share"]').count(),'V46 Share action must remain');
    const entrustedOk=await A.page.evaluate(()=>{
      const sem=new Map(window.__RV26_SHARED__.semantic().map(x=>[x.semanticId,x]));
      return window.__RALUVAAA_VITALITY_V42__.entrusted().every(x=>sem.get(x.semanticId)?.state==='alive')
    });
    assert.equal(entrustedOk,true,'entrusted wishes must never contain bloomed/abandoned nodes');
    await A.page.click('#entrustedBtn');
    await A.page.waitForSelector('#drawerBody [data-open]',{timeout:3000});
    const firstEntrusted=A.page.locator('#drawerBody [data-open]').first();
    assert(await firstEntrusted.getAttribute('data-entrusted-band'),'entrusted wish must retain its visual duration band');
    assert.equal(await firstEntrusted.locator('.pa-entrusted-timer').count(),1,'entrusted timer must be rendered natively');
    assert.match((await firstEntrusted.locator('.m').innerText()).trim(),/\d{2}:\d{2}:\d{2}|\d+[jd] \d{2}:\d{2}:\d{2}/,'entrusted wish must show a live timer');
    assert.notEqual(await firstEntrusted.evaluate(el=>getComputedStyle(el).borderColor),'rgba(0, 0, 0, 0)','entrusted wish must retain its color cue');

    // Wish content, not only chrome, follows the reader language while the original stays accessible.
    await A.page.evaluate(()=>{
      window.__RALUVAAA_TRANSLATION__.translate=async text=>({translation:'TRADUIT: '+text,sourceLang:'en'});
      document.querySelector('[data-lang="fr"]')?.click()
    });
    await openWish(A.page,wishA);
    await A.page.waitForSelector('.v47-translation-note',{polling:100,timeout:5000});
    assert.match((await A.page.locator('#drawerBody .wish').innerText()).trim(),/^TRADUIT: /,'wish body must be translated for the reader');
    await A.page.click('.v47-translation-note button');
    assert.equal((await A.page.locator('#drawerBody .wish').innerText()).trim(),'A wants to learn coastal sailing '+stamp,'reader must be able to reveal the canonical original wish');

    console.log('RALUVAAA Private Alpha real A/B identity gate passed: mobile WebKit + desktop Chromium');
  }finally{
    await Promise.all([A.context.close(),B.context.close()]);
    await Promise.all([safari.close(),chrome.close()]);
  }
})().catch(err=>{console.error(err);process.exit(1)});
