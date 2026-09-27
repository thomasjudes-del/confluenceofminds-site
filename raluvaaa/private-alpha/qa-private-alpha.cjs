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
    await page.waitForFunction(()=>window.__RALUVAAA_SHARED_READY__===true,null,{timeout:30000});
    await page.waitForFunction(()=>!!window.__RALUVAAA_PRIVATE_AUTH__,null,{timeout:5000});
    await page.waitForFunction(()=>window.__RALUVAAA_V46__?.version===46,null,{timeout:5000});
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
  await page.click('#privateAccountBtn');
  await page.waitForSelector('#raluvaaaAuthOverlay.open');
  await page.fill('[data-pa-email]',email);
  await page.click('[data-pa-send]');
  await page.waitForSelector('[data-pa-code]',{timeout:5000});
  const code=await page.inputValue('[data-pa-code]');
  assert.match(code,/^\d{6}$/,'CI auth code should autofill in test mode');
  await page.click('[data-pa-verify]');
  await page.waitForFunction(()=>window.__RALUVAAA_PRIVATE_AUTH__?.me?.()?.claimed===true,null,{timeout:7000});
  await page.waitForSelector('#raluvaaaAuthOverlay.open',{state:'hidden',timeout:3000}).catch(()=>{});
}
async function createWish(page,text,emailIfNeeded){
  await page.click('#createBtn');
  await page.fill('#wishInput',text);
  await page.fill('#locInput','Nantes, France');
  await page.click('#confirm');
  if(emailIfNeeded){
    await page.waitForSelector('#raluvaaaAuthOverlay.open',{timeout:3000});
    await page.fill('[data-pa-email]',emailIfNeeded);
    await page.click('[data-pa-send]');
    await page.waitForSelector('[data-pa-code]',{timeout:5000});
    assert.match(await page.inputValue('[data-pa-code]'),/^\d{6}$/);
    await page.click('[data-pa-verify]');
  }
  await page.waitForFunction(t=>window.__RALUVAAA_SHARED_DEBUG__?.world()?.wishes?.some(w=>w.text===t),text,{timeout:12000});
  return page.evaluate(t=>window.__RALUVAAA_SHARED_DEBUG__.world().wishes.find(w=>w.text===t).id,text)
}
async function refresh(page){await page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.refresh())}
async function openWish(page,id){
  await refresh(page);
  await page.evaluate(id=>window.__RV26_SHARED__.open(id),id);
  await page.waitForFunction(id=>window.__RALUVAAA_UI__?.current?.()?.semanticId===id,id,{timeout:5000})
}
async function acceptFirst(page,type){
  await refresh(page);
  await page.click('#inboxBtn');
  await page.waitForFunction(type=>window.__RALUVAAA_SHARED_DEBUG__.inbox()?.pending?.some(p=>p.type===type),type,{timeout:8000});
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

    const anonA=await A.page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.client.actorId);
    const anonB=await B.page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.client.actorId);
    assert.notEqual(anonA,anonB,'mobile Safari and desktop Chrome need independent anonymous sessions');

    // A writes first, and the publish action itself asks for identity.
    const wishA=await createWish(A.page,'A wants to learn coastal sailing '+stamp,emailA);
    const actorA=await A.page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.client.actorId);
    assert.equal(await A.page.evaluate(()=>window.__RALUVAAA_PRIVATE_AUTH__.me().claimed),true);

    // B is still anonymous: exploration/encouragement works, but relationship actions do not.
    await B.page.evaluate(id=>window.__RALUVAAA_SHARED_DEBUG__.client.encourage(id),wishA);
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
    await A.page.waitForFunction(id=>window.__RALUVAAA_SHARED_DEBUG__.client.saved().then(x=>x.saved.some(w=>w.id===id)),wishB,{timeout:8000});

    // B offers help to A; A receives a real notification and accepts.
    await openWish(B.page,wishA);
    await B.page.evaluate(()=>window.__RALUVAAA_UI__.action('help'));
    await B.page.waitForSelector('#helpInput');
    await B.page.fill('#helpInput','I can share a practical first sailing checklist.');
    await B.page.click('#confirm');
    await A.page.waitForFunction(async()=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();return window.__RALUVAAA_SHARED_DEBUG__.inbox()?.pending?.some(p=>p.type==='help')},null,{timeout:10000});
    await acceptFirst(A.page,'help');
    await B.page.waitForFunction(async()=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();return window.__RALUVAAA_SHARED_DEBUG__.world()?.events?.some(e=>e.type==='help')},null,{timeout:10000});

    // A proposes a graft from its own wish to B's saved wish via the exact Saved UX.
    await openWish(A.page,wishA);
    await A.page.evaluate(()=>window.__RALUVAAA_UI__.action('connect'));
    await A.page.waitForSelector('#v46SavedGraftBtn',{timeout:3000});
    await A.page.click('#v46SavedGraftBtn');
    await A.page.waitForSelector('[data-v46-graft-target="'+wishB+'"]',{timeout:3000});
    await A.page.click('[data-v46-graft-target="'+wishB+'"]');
    await A.page.waitForSelector('#overlay #confirm',{timeout:3000});
    await A.page.click('#overlay #confirm');
    await B.page.waitForFunction(async()=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();return window.__RALUVAAA_SHARED_DEBUG__.inbox()?.pending?.some(p=>p.type==='connect')},null,{timeout:10000});
    await acceptFirst(B.page,'connect');
    await A.page.waitForFunction(async()=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();return window.__RALUVAAA_SHARED_DEBUG__.world()?.events?.some(e=>e.type==='connect')},null,{timeout:10000});

    // Reverse roles: A helps B.
    await openWish(A.page,wishB);
    await A.page.evaluate(()=>window.__RALUVAAA_UI__.action('help'));
    await A.page.fill('#helpInput','I can help organise a first neighbourhood planting day.');
    await A.page.click('#confirm');
    await B.page.waitForFunction(async()=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();return window.__RALUVAAA_SHARED_DEBUG__.inbox()?.pending?.some(p=>p.type==='help')},null,{timeout:10000});
    assert.notEqual((await B.page.locator('#inboxBadge').innerText()).trim(),'0','B must see an unread notification badge');
    await acceptFirst(B.page,'help');
    await A.page.waitForFunction(async id=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();return window.__RALUVAAA_SHARED_DEBUG__.world()?.events?.some(e=>e.type==='help'&&e.wishId===id)},wishB,{timeout:10000});

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
    const more=A.page.locator('#drawerBody details.more summary');
    if(await more.count())await more.click();
    assert(await A.page.locator('#drawerBody [data-act="share"]').count(),'V46 Share action must remain');

    console.log('RALUVAAA Private Alpha real A/B identity gate passed: mobile WebKit + desktop Chromium');
  }finally{
    await Promise.all([A.context.close(),B.context.close()]);
    await Promise.all([safari.close(),chrome.close()]);
  }
})().catch(err=>{console.error(err);process.exit(1)});
